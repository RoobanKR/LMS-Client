import { useCallback, useEffect, useRef, useState } from "react";
import { getSocket } from "@/apiServices/socketClient";
import { useAuthStore } from "@/stores/authStore";
import {
  getSharedScreenStream,
  subscribeSharedScreenStream,
  setSharedScreenStream,
  markScreenCaptureStarting,
  isScreenCaptureInProgress,
  clearScreenCaptureInProgress,
} from "./screenStreamStore";
import { stopAllAssessmentMedia } from "./mediaRegistry";
import { getIceServers } from "@/lib/webrtc";

// Wait for whoever is capturing the screen (proctoring recording) to publish
// it, so we REUSE that one stream instead of opening a second prompt. Resolves
// with the stream, or null if no capture is happening (→ caller captures its
// own). Polls so a denied/abandoned capture doesn't hang us forever.
function waitForSharedCapture(): Promise<MediaStream | null> {
  return new Promise((resolve) => {
    const existing = getSharedScreenStream();
    if (existing) return resolve(existing);

    let settled = false;
    let waited = 0;
    const STEP = 500, GRACE = 3000, MAX = 45000;

    const finish = (s: MediaStream | null) => {
      if (settled) return;
      settled = true;
      unsub();
      clearInterval(poll);
      resolve(s);
    };
    const unsub = subscribeSharedScreenStream((s) => { if (s) finish(s); });
    const poll = setInterval(() => {
      waited += STEP;
      const stream = getSharedScreenStream();
      if (stream) return finish(stream);
      // Give up once past the grace window with no capture open, or at the cap.
      if ((waited >= GRACE && !isScreenCaptureInProgress()) || waited >= MAX) finish(null);
    }, STEP);
  });
}

// ─── Student → Live Screen broadcaster ──────────────────────────────────────
// Mesh WebRTC: the student is the broadcaster (one screen track) and every
// coordinator/proctor watching is a viewer. This hook owns one
// RTCPeerConnection per viewer and relays SDP/ICE over the shared socket.
//
// It mirrors how useExamLiveEmitter is wired (joined while the test is active)
// and REUSES the proctoring screen stream when present so the student is asked
// for screen access only once.

export interface UseLiveScreenShareArgs {
  assessmentId?: string;
  /** Only share while the test is actually running (e.g. securityAgreed). */
  active: boolean;
  courseId?: string;
  /** Wait briefly for the proctoring recording stream before prompting again. */
  waitForSharedStream?: boolean;
}

export interface UseLiveScreenShareResult {
  isSharing: boolean;
  /** True after the screen track ended mid-test — student must re-share. */
  needsReshare: boolean;
  /** Latest proctor warning message (for a toast/banner). */
  lastWarning: string | null;
  clearWarning: () => void;
  /** Re-acquire the screen and resume sharing. */
  restart: () => void;
}

export function useLiveScreenShare({
  assessmentId,
  active,
  courseId,
  waitForSharedStream = false,
}: UseLiveScreenShareArgs): UseLiveScreenShareResult {
  const user = useAuthStore((s) => s.user);
  const studentId = (user?.id || user?._id || "") as string;

  const [isSharing, setIsSharing] = useState(false);
  const [needsReshare, setNeedsReshare] = useState(false);
  const [lastWarning, setLastWarning] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ownsStreamRef = useRef(false); // did WE create the stream (→ must stop it)?
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const startedRef = useRef(false);
  const qualityRef = useRef<Map<string, "high" | "low">>(new Map());
  const endedHandlerRef = useRef<(() => void) | null>(null);

  // ── socket emit helper ──────────────────────────────────────────────────────
  const emit = useCallback(
    (event: string, payload: Record<string, any> = {}) => {
      if (!assessmentId || !studentId) return;
      try { getSocket().emit(event, { assessmentId, studentId, ...payload }); }
      catch { /* never break the exam on a socket hiccup */ }
    },
    [assessmentId, studentId]
  );

  // ── apply a quality tier to one peer's video sender ─────────────────────────
  const applyQuality = useCallback(async (pc: RTCPeerConnection, quality: "high" | "low") => {
    const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
    if (!sender) return;
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
    if (quality === "high") {
      params.encodings[0].scaleResolutionDownBy = 1;
      params.encodings[0].maxBitrate = 1_500_000;
    } else {
      params.encodings[0].scaleResolutionDownBy = 2.5; // low-res thumbnail
      params.encodings[0].maxBitrate = 200_000;
    }
    try { await sender.setParameters(params); } catch { /* best-effort */ }
  }, []);

  // ── create (or reuse) a peer connection for one viewer; we send the offer ───
  const createPeerForViewer = useCallback(
    async (viewerId: string) => {
      if (!viewerId || !streamRef.current) return;
      if (peersRef.current.has(viewerId)) return; // already connected/connecting

      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      peersRef.current.set(viewerId, pc);

      streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current!));

      pc.onicecandidate = (e) => {
        if (e.candidate) emit("screen:ice", { toUserId: viewerId, candidate: e.candidate });
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          // Let the viewer drive re-connection; just drop our dead peer.
          if (pc.connectionState !== "disconnected") {
            try { pc.close(); } catch {}
            peersRef.current.delete(viewerId);
          }
        }
      };

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        // Default to low-res for grid thumbnails; proctor bumps to high on zoom.
        await applyQuality(pc, qualityRef.current.get(viewerId) || "low");
        emit("screen:offer", { toUserId: viewerId, sdp: pc.localDescription });
      } catch (err) {
        try { pc.close(); } catch {}
        peersRef.current.delete(viewerId);
      }
    },
    [emit, applyQuality]
  );

  const closePeer = useCallback((viewerId: string) => {
    const pc = peersRef.current.get(viewerId);
    if (pc) { try { pc.close(); } catch {} peersRef.current.delete(viewerId); }
  }, []);

  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach((pc) => { try { pc.close(); } catch {} });
    peersRef.current.clear();
  }, []);

  // ── acquire the screen stream (reuse proctoring stream if available) ────────
  const acquireStream = useCallback(async (): Promise<MediaStream | null> => {
    const existing = getSharedScreenStream();
    if (existing) { ownsStreamRef.current = false; return existing; }

    // If proctoring recording is expected, OR a capture prompt is already open,
    // wait for THAT one stream rather than opening a second prompt.
    if (waitForSharedStream || isScreenCaptureInProgress()) {
      const shared = await waitForSharedCapture();
      if (shared) { ownsStreamRef.current = false; return shared; }
    }

    // Nobody else is capturing → capture our own (entire screen) and publish it
    // so a later recorder reuses it instead of prompting again.
    markScreenCaptureStarting();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 8, max: 15 }, displaySurface: "monitor" } as any,
        audio: false,
      });
      ownsStreamRef.current = true;
      setSharedScreenStream(stream);

      // Verify the student picked the ENTIRE screen, not a tab/window (#2).
      const settings: any = stream.getVideoTracks()[0]?.getSettings?.() || {};
      if (settings.displaySurface && settings.displaySurface !== "monitor") {
        emit("screen:violation", {
          type: "not_full_screen",
          detail: `Shared a ${settings.displaySurface} instead of the entire screen`,
        });
        setLastWarning("Please share your ENTIRE screen, not a single window or tab.");
      }
      return stream;
    } catch {
      clearScreenCaptureInProgress();
      return null; // student denied — treated as needing re-share
    }
  }, [waitForSharedStream, emit]);

  // ── begin (or resume) sharing ───────────────────────────────────────────────
  const begin = useCallback(async () => {
    if (!assessmentId || !studentId) return;
    const stream = await acquireStream();
    if (!stream) { setNeedsReshare(true); setIsSharing(false); return; }

    streamRef.current = stream;
    setNeedsReshare(false);
    setIsSharing(true);
    startedRef.current = true;

    // If the screen track ends mid-test → violation + ask the student to re-share.
    // Use addEventListener (NOT track.onended =) so we never clobber the
    // recorder's / player's own 'ended' cleanup handler on a reused stream.
    const onTrackEnded = () => {
      if (!active) return; // ending because the test finished is fine
      emit("screen:stopped", { reason: "screen_share_ended" });
      closeAllPeers();
      streamRef.current = null;
      setIsSharing(false);
      setNeedsReshare(true);
      setLastWarning("Screen sharing stopped. You must share your entire screen to continue.");
    };
    endedHandlerRef.current = onTrackEnded;
    stream.getVideoTracks().forEach((track) => track.addEventListener("ended", onTrackEnded));

    emit("screen:start", {});
  }, [assessmentId, studentId, acquireStream, active, emit, closeAllPeers]);

  // ── main lifecycle: start on active, tear down on inactive/unmount ──────────
  useEffect(() => {
    if (!active || !assessmentId || !studentId) return;
    let cancelled = false;

    (async () => { if (!cancelled) await begin(); })();

    const socket = getSocket();

    const onViewers = ({ viewerIds }: { viewerIds: string[] }) => {
      (viewerIds || []).forEach((id) => createPeerForViewer(id));
    };
    const onViewerJoined = ({ viewerId }: { viewerId: string }) => createPeerForViewer(viewerId);
    const onViewerLeft = ({ viewerId }: { viewerId: string }) => closePeer(viewerId);
    const onAnswer = async ({ fromUserId, sdp }: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(fromUserId);
      if (pc && sdp) { try { await pc.setRemoteDescription(new RTCSessionDescription(sdp)); } catch {} }
    };
    const onIce = async ({ fromUserId, candidate }: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(fromUserId);
      if (pc && candidate) { try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {} }
    };
    const onSetQuality = ({ viewerId, quality }: { viewerId: string; quality: "high" | "low" }) => {
      qualityRef.current.set(viewerId, quality);
      const pc = peersRef.current.get(viewerId);
      if (pc) applyQuality(pc, quality);
    };
    const onWarning = ({ message }: { message: string }) => setLastWarning(message || "Proctor warning");
    // On reconnect the server dropped us as a sharer and viewers closed their
    // peers — tear down our stale peers and re-announce so they rebuild fresh.
    const onReconnect = () => {
      if (!startedRef.current || !streamRef.current) return;
      closeAllPeers();
      emit("screen:start", {});
    };

    socket.on("screen:viewers", onViewers);
    socket.on("screen:viewer_joined", onViewerJoined);
    socket.on("screen:viewer_left", onViewerLeft);
    socket.on("screen:answer", onAnswer);
    socket.on("screen:ice", onIce);
    socket.on("screen:set_quality", onSetQuality);
    socket.on("screen:warning", onWarning);
    socket.on("connect", onReconnect);

    return () => {
      cancelled = true;
      socket.off("screen:viewers", onViewers);
      socket.off("screen:viewer_joined", onViewerJoined);
      socket.off("screen:viewer_left", onViewerLeft);
      socket.off("screen:answer", onAnswer);
      socket.off("screen:ice", onIce);
      socket.off("screen:set_quality", onSetQuality);
      socket.off("screen:warning", onWarning);
      socket.off("connect", onReconnect);

      closeAllPeers();
      // Normal end (test finished / unmount) → benign removal, NOT a violation.
      if (startedRef.current) emit("screen:end", {});
      startedRef.current = false;

      // Remove ONLY our own 'ended' listener (leave the recorder's intact).
      if (streamRef.current && endedHandlerRef.current) {
        streamRef.current.getVideoTracks().forEach((t) =>
          t.removeEventListener("ended", endedHandlerRef.current!)
        );
      }
      endedHandlerRef.current = null;

      // Always stop the screen capture when the test ends so the browser's
      // "sharing" bar never lingers. Safe: this runs only at teardown (stable
      // `active`), and stopping an already-stopped track is a no-op. The
      // recorder releases its own camera via its submit/unmount cleanup.
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      setSharedScreenStream(null);
      streamRef.current = null;
      setIsSharing(false);

      // Safety net: when the test tears down (submit/unmount/close), force-stop
      // EVERY camera/screen stream captured during the assessment, so the webcam
      // light and screen-share bar never linger even if a component forgot.
      stopAllAssessmentMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, assessmentId, studentId]);

  const restart = useCallback(() => { setNeedsReshare(false); begin(); }, [begin]);
  const clearWarning = useCallback(() => setLastWarning(null), []);

  return { isSharing, needsReshare, lastWarning, clearWarning, restart };
}
