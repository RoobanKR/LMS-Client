"use client";

// ─── You Do · Mock programming test ─────────────────────────────────────────
// A Mock (or Practice) programming assessment runs in the multi-file editor —
// file explorer, tabs, terminal, Run Testcase, visualizer — wrapped in the
// same exam layer every proctored You Do test has:
//
//   • the attempt session (server-held timer, resume permission gate,
//     offline queue) — useAttemptSession
//   • every Security setting — fullscreen, tab-switch budget, copy / paste,
//     right-click, print, refresh, devtools, back / close protection
//     (useAssessmentSecurity), camera + screen recording (useScreenRecording),
//     face verification and face proctoring (FaceVerificationGate,
//     useFaceProctor), live screen monitoring (ScreenShareGuard)
//   • the Live Dashboard feed and the trainer-message bell
//
// Violations and time-up auto-submit with the reason recorded, as the MCQ
// test does. Unlike a Final test, a Mock test never locks: the student takes
// it again from Retest on the assessment list (POST /courses/attempt/restart-mock).
// The multi-file editor itself is unchanged for I Do / We Do — only this page
// passes it the `exam` hooks.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Clock, Loader2, Lock, Monitor, ShieldCheck } from "lucide-react";
import { getToken } from "@/lib/session";
import { API_ORIGIN } from "@/lib/apiBase";
import MultiFileCodeEditor, { type MultiFileExamHooks } from "../multi-file-code-editor";
import { useAttemptSession } from "./useAttemptSession";
import { useAssessmentSecurity, normalizeSecurityConfig, ASSESSMENT_LOCK_DISABLED } from "./useAssessmentSecurity";
import { useScreenRecording } from "./useScreenRecording";
import { useFaceProctor } from "./useFaceProctor";
import { useExamLiveEmitter } from "../useExamLiveEmitter";
import { captureSharedScreen, getSharedScreenStream } from "./screenStreamStore";
import { stopAllAssessmentMedia } from "./mediaRegistry";
import FaceVerificationGate from "./FaceVerificationGate";
import LiveCameraPreview from "./LiveCameraPreview";
import ScreenShareGuard from "./ScreenShareGuard";
import ResumeGate from "./ResumeGate";
import TestMessageBell from "./TestMessageBell";
import ConnectionStatusBanner from "./ConnectionStatusBanner";
import type { MockExercise } from "./mockTest";

const FONT = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

type Phase = "checking" | "blocked" | "gate" | "face" | "running" | "ended";

export interface MockMultiFileTestProps {
  exercise: MockExercise;
  courseId: string;
  courseName?: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  subcategory: string;
  hierarchy?: string[];
  /** The instructions page showed the rules and took the Start click
   *  (fullscreen + screen share already granted). */
  securityAck: boolean;
  /** Back to the assessment list. `submitted` — the attempt was handed in. */
  onExit: (opts: { submitted: boolean }) => void;
}

const fmtClock = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h > 0 ? `${String(h).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
};

export default function MockMultiFileTest({
  exercise, courseId, courseName, nodeId, nodeName, nodeType, subcategory, hierarchy = [],
  securityAck, onExit,
}: MockMultiFileTestProps) {
  const exerciseId = String(exercise?._id || "");
  const questions: unknown[] = Array.isArray(exercise?.questions) ? exercise.questions : [];
  const sec = useMemo(() => normalizeSecurityConfig(exercise?.securitySettings || {}), [exercise]);
  const cameraOn = !!(sec.enableFaceVerification || sec.cameraMicEnabled);
  const screenOn = !!sec.screenRecordingEnabled;

  const [phase, setPhase] = useState<Phase>("checking");
  const [blockedText, setBlockedText] = useState("");
  const [gateError, setGateError] = useState("");
  const [tabSwitches, setTabSwitches] = useState(0);
  const autoReasonRef = useRef<string | null>(null);
  const endingRef = useRef(false);
  const finishedRef = useRef(false);
  const finalSubmitRef = useRef<((reason: string) => Promise<boolean | null>) | null>(null);

  // ── Attempt session (server-held clock, resume gate, offline queue) ──────
  const attempt = useAttemptSession({
    exerciseId,
    courseId,
    nodeId,
    nodeType: nodeType || "topics",
    subcategory,
    category: "You_Do",
    totalQuestions: questions.length || undefined,
    durationMinutesHint: exercise?.exerciseInformation?.totalDuration || undefined,
    enabled: !!exerciseId && !!courseId,
  });

  const live = useExamLiveEmitter(exerciseId, questions.length);
  const { startRecording, stopRecording } = useScreenRecording();

  // ── Entry check — already handed in or terminated → back to the list ─────
  useEffect(() => {
    if (!exerciseId || !courseId) { setBlockedText("This test could not be opened."); setPhase("blocked"); return; }
    let cancelled = false;
    (async () => {
      try {
        const token = getToken() || localStorage.getItem("token") || "";
        const res = await fetch(
          `${API_ORIGIN}/exercise/status?courseId=${courseId}&exerciseId=${exerciseId}&category=You_Do&subcategory=${encodeURIComponent(subcategory)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const body = res.ok ? await res.json() : null;
        const st = body?.success ? body.data || {} : {};
        if (cancelled) return;
        if (st.status === "completed") {
          setBlockedText("You have already submitted this mock test. Take it again with Retest on the assessment list.");
          setPhase("blocked");
          return;
        }
        if ((st.isLocked || st.status === "terminated") && !ASSESSMENT_LOCK_DISABLED) {
          setBlockedText("This attempt has ended. Take the mock test again with Retest on the assessment list.");
          setPhase("blocked");
          return;
        }
      } catch { /* the server enforces the attempt anyway — let the student in */ }
      if (cancelled) return;
      // Fullscreen and screen sharing need a click. The instructions page's
      // Start click grants both; after a reload they are gone, so ask again.
      const needsFullscreen = !!sec.requireFullscreen && typeof document !== "undefined" && !document.fullscreenElement;
      const needsScreen = screenOn && !getSharedScreenStream();
      if (!securityAck || needsFullscreen || needsScreen) setPhase("gate");
      else setPhase(sec.enableFaceVerification ? "face" : "running");
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per test
  }, [exerciseId, courseId]);

  // ── Recording starts when the test does ──────────────────────────────────
  const recordingStartedRef = useRef(false);
  useEffect(() => {
    if (phase !== "running" || recordingStartedRef.current) return;
    recordingStartedRef.current = true;
    const studentId = localStorage.getItem("smartcliff_userId") || localStorage.getItem("userId") || "student";
    const base = { courseId, exerciseId, studentId, category: "You_Do", subcategory };
    if (screenOn) {
      startRecording({ ...base, withCamera: cameraOn, screenStream: getSharedScreenStream() })
        .catch((e) => console.warn("Screen recording start failed:", e));
    } else if (cameraOn) {
      startRecording({ ...base, cameraOnly: true })
        .catch((e) => console.warn("Camera recording start failed:", e));
    }
  }, [phase, screenOn, cameraOn, courseId, exerciseId, subcategory, startRecording]);

  // ── Leaving the test ─────────────────────────────────────────────────────
  const teardown = useCallback(() => {
    try { stopRecording(); } catch { /* ignore */ }
    if (typeof document !== "undefined" && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    // Give the recorder a moment to flush its last chunk, then release every
    // camera / screen stream so no capture light stays on.
    setTimeout(() => { try { stopAllAssessmentMedia(); } catch { /* ignore */ } }, 1500);
  }, [stopRecording]);

  // Handed in — by Finish, or by an auto-submit. Closes the attempt, stops
  // recording and returns to the list.
  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase("ended");
    const reason = autoReasonRef.current;
    try {
      await attempt.submit(reason ? { submitType: "AUTO", autoSubmitReason: reason } : { submitType: "USER" });
    } catch (e) { console.warn("attempt.submit failed:", e); }
    try { live.submitted(); } catch { /* ignore */ }
    teardown();
    onExit({ submitted: true });
  }, [attempt, live, teardown, onExit]);

  // Left without handing in — the attempt stays open and resumes from Start.
  const leave = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase("ended");
    teardown();
    onExit({ submitted: false });
  }, [teardown, onExit]);

  // Time-up or a proctoring limit: submit what the student has, with the reason.
  const autoSubmit = useCallback(async (reason: string) => {
    if (endingRef.current || finishedRef.current) return;
    if (ASSESSMENT_LOCK_DISABLED && reason !== "Time limit reached") {
      toast(`${reason} — ignored (test mode).`, { icon: "⚠️" });
      return;
    }
    endingRef.current = true;
    autoReasonRef.current = reason;
    toast.error(`${reason} — submitting your test.`, { id: "mock-auto-submit" });
    const ok = finalSubmitRef.current ? await finalSubmitRef.current(reason) : false;
    // true  — stored; finish() already ran through onCloseExercise.
    // null  — the student's own Finish is in flight and ends the test; closing
    //         the attempt first would make the server refuse that answer.
    //         Wait for it, and if it failed submit once more with the reason.
    // false — not stored (offline, server closed the attempt): end it here.
    if (ok === null) {
      for (let i = 0; i < 20 && !finishedRef.current; i++) await new Promise((r) => setTimeout(r, 500));
      if (!finishedRef.current && finalSubmitRef.current) await finalSubmitRef.current(reason);
    }
    if (!finishedRef.current) await finish();
  }, [finish]);

  // ── Security settings ────────────────────────────────────────────────────
  const running = phase === "running";
  useAssessmentSecurity({
    config: sec,
    isActive: running,
    // The attempt session owns the clock; the hook only fires the warning.
    externalSecondsLeft: attempt.timeLeftSeconds,
    onTabSwitchViolation: (count, max) => {
      setTabSwitches(count);
      toast(`Tab switch ${count}/${max}. Continued switching will submit your test.`, { icon: "⚠️", id: "mock-tab" });
      if (count >= max) void autoSubmit("Tab switch limit reached");
    },
    onTimeWarning: (secs) => {
      toast(`Only ${secs} seconds left — your test will be submitted automatically.`, { icon: "⏰", id: "mock-time-warn", duration: 8000 });
    },
  });

  useFaceProctor({
    isActive: running && cameraOn,
    multiFaceEnabled: !!sec.multipleFaceDetection,
    multiFaceLimit: sec.faceWarningLimit ?? 3,
    noFaceEnabled: !!sec.faceMonitoringDetection,
    noFaceLimit: sec.faceMonitoringWarningLimit ?? 3,
    intervalSeconds: 10,
    onWarning: ({ reason, count, limit }) => {
      toast(`${reason} (${count}/${limit}). Continued warnings will submit your test.`, { icon: "⚠️", id: `mock-face-${count}` });
    },
    onLimitReached: (reason) => { void autoSubmit(reason); },
  });

  // Copy / paste / right-click inside Monaco. The shared hook listens on the
  // document's bubble phase, which runs after Monaco has already handled the
  // event — so block in the CAPTURE phase too, before the editor sees it.
  useEffect(() => {
    if (!running) return;
    const blockClipboard = !!sec.preventCopyPaste;
    const blockMenu = !!sec.preventRightClick || blockClipboard;
    if (!blockClipboard && !blockMenu) return;
    const notify = () => toast.error("Copy and paste are disabled in this test.", { id: "mock-clipboard" });
    const onClip = (e: Event) => { e.preventDefault(); e.stopPropagation(); notify(); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x"].includes(e.key.toLowerCase())) {
        e.preventDefault(); e.stopPropagation(); notify();
      }
    };
    const onMenu = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    if (blockClipboard) {
      ["copy", "cut", "paste", "drop"].forEach((t) => window.addEventListener(t, onClip, true));
      window.addEventListener("keydown", onKey, true);
    }
    if (blockMenu) window.addEventListener("contextmenu", onMenu, true);
    return () => {
      ["copy", "cut", "paste", "drop"].forEach((t) => window.removeEventListener(t, onClip, true));
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("contextmenu", onMenu, true);
    };
  }, [running, sec.preventCopyPaste, sec.preventRightClick]);

  // ── Time-up (server-held clock) ──────────────────────────────────────────
  useEffect(() => {
    if (!running || !attempt.hasTimer || attempt.timeLeftSeconds == null) return;
    if (attempt.timeLeftSeconds <= 0 && sec.autoSubmitOnTimeout !== false) void autoSubmit("Time limit reached");
  }, [running, attempt.hasTimer, attempt.timeLeftSeconds, sec.autoSubmitOnTimeout, autoSubmit]);

  // The server closed the attempt (its own expiry sweep) → end here too.
  useEffect(() => {
    const st = attempt.attempt?.status;
    if (!running || !st || st === "active") return;
    void autoSubmit("Time limit reached");
  }, [running, attempt.attempt?.status, autoSubmit]);

  // ── The gate's Start: a real click, so fullscreen + screen share can be asked ──
  const startFromGate = async () => {
    setGateError("");
    if (sec.requireFullscreen && !document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen(); } catch { /* reported below */ }
      if (!document.fullscreenElement) { setGateError("This test runs in fullscreen. Allow fullscreen and click Start again."); return; }
    }
    if (screenOn && !getSharedScreenStream()) {
      // Audio only with the mic setting — same as the instructions page.
      const stream = await captureSharedScreen(!!sec.cameraMicEnabled);
      if (!stream) {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        setGateError("Screen sharing is required for this test. Click Start again and choose “Entire Screen”.");
        return;
      }
    }
    setPhase(sec.enableFaceVerification ? "face" : "running");
  };

  // ── Exam hooks for the editor ────────────────────────────────────────────
  const timeLeft = attempt.hasTimer ? attempt.timeLeftSeconds : null;
  const maxTabs = sec.maxTabSwitches ?? 3;
  const headerSlot = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", marginRight: 8, flexShrink: 0, fontFamily: FONT }}>
      <span title="A mock test can be taken again with Retest" style={{
        fontSize: 11, fontWeight: 600, color: "#9A3412", background: "#FFF7ED",
        border: "1px solid #FED7AA", borderRadius: 6, padding: "3px 9px",
      }}>Mock test</span>
      {sec.preventTabSwitch && (
        <span title="Tab switches used" style={{
          display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
          color: tabSwitches > 0 ? "#B45309" : "#475467", background: tabSwitches > 0 ? "#FFFBEB" : "#F2F4F7",
          border: `1px solid ${tabSwitches > 0 ? "#FDE68A" : "#E4E7EC"}`, borderRadius: 6, padding: "4px 8px",
        }}>
          <AlertTriangle size={13} /> {tabSwitches}/{maxTabs}
        </span>
      )}
      {timeLeft != null && (() => {
        const danger = timeLeft < 60, warn = !danger && timeLeft < 300;
        const fg = danger ? "#B42318" : warn ? "#B54708" : "#175CD3";
        const bg = danger ? "#FEF3F2" : warn ? "#FFFAEB" : "#EFF8FF";
        const bd = danger ? "#FECDCA" : warn ? "#FEDF89" : "#B2DDFF";
        return (
          <span title="Time left" style={{
            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700,
            fontVariantNumeric: "tabular-nums", color: fg, background: bg, border: `1px solid ${bd}`,
            borderRadius: 6, padding: "4px 10px",
          }}>
            <Clock size={14} /> {fmtClock(timeLeft)}
          </span>
        );
      })()}
      <TestMessageBell assessmentId={exerciseId} />
    </div>
  );

  // Stable callbacks: the header re-renders every second with the clock, the
  // hooks the editor subscribes to must not.
  const liveRef = useRef(live);
  liveRef.current = live;
  const registerFinalSubmit = useCallback((submit: (reason: string) => Promise<boolean | null>) => {
    finalSubmitRef.current = submit;
  }, []);
  const onQuestionChange = useCallback((from: string | null, to: string | null) => {
    try { liveRef.current.questionChanged(from, to); } catch { /* ignore */ }
  }, []);
  const onAnswerSaved = useCallback((qid: string) => {
    try { liveRef.current.answerSaved(qid); } catch { /* ignore */ }
  }, []);
  const examHooks: MultiFileExamHooks = { headerSlot, registerFinalSubmit, onQuestionChange, onAnswerSaved };

  // ── Render ───────────────────────────────────────────────────────────────
  const screen = (children: ReactNode) => (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: FONT, padding: 16 }}>
      <div style={{ background: "#fff", border: "1px solid #E4E7EC", borderRadius: 14, padding: "26px 28px", maxWidth: 460, width: "100%", textAlign: "center", boxShadow: "0 10px 30px rgba(16,24,40,0.08)" }}>
        {children}
      </div>
    </div>
  );

  if (phase === "checking" || (attempt.loading && phase !== "blocked")) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <Loader2 className="animate-spin" size={34} style={{ color: "#F97316" }} />
      </div>
    );
  }

  if (phase === "blocked") {
    return screen(
      <>
        <Lock size={30} style={{ color: "#F97316", margin: "0 auto 12px" }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#101828", margin: 0 }}>{exercise?.exerciseInformation?.exerciseName || "Mock test"}</h3>
        <p style={{ fontSize: 13, color: "#475467", marginTop: 8, lineHeight: 1.6 }}>{blockedText}</p>
        <button type="button" onClick={() => onExit({ submitted: false })} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 6, border: "none", background: "#F97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Back to assessments
        </button>
      </>,
    );
  }

  // Leaving mid-attempt arms the server's resume gate; re-entry waits for the
  // trainer's approval, exactly as on every other You Do test.
  if (attempt.requiresApproval && phase !== "ended") {
    return (
      <ResumeGate
        attempt={attempt.attempt}
        assessmentName={exercise?.exerciseInformation?.exerciseName}
        onRequest={attempt.requestResume}
        onEnter={async () => { await attempt.refresh(); }}
        onExit={() => onExit({ submitted: false })}
      />
    );
  }

  if (phase === "gate") {
    const rules = [
      sec.requireFullscreen && "The test runs in fullscreen.",
      screenOn && "Your screen is shared and recorded.",
      cameraOn && "Your camera is on for proctoring.",
      sec.preventTabSwitch && `Leaving the tab ${maxTabs} time${maxTabs === 1 ? "" : "s"} submits the test.`,
      sec.preventCopyPaste && "Copy and paste are disabled.",
      timeLeft != null && `Time left: ${fmtClock(timeLeft)}.`,
    ].filter(Boolean) as string[];
    return screen(
      <>
        {screenOn ? <Monitor size={30} style={{ color: "#F97316", margin: "0 auto 12px" }} /> : <ShieldCheck size={30} style={{ color: "#F97316", margin: "0 auto 12px" }} />}
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#101828", margin: 0 }}>{exercise?.exerciseInformation?.exerciseName || "Mock test"}</h3>
        {rules.length > 0 && (
          <ul style={{ textAlign: "left", fontSize: 13, color: "#475467", margin: "14px 0 0", paddingLeft: 18, lineHeight: 1.7 }}>
            {rules.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
        {gateError && <p style={{ fontSize: 12.5, color: "#B42318", marginTop: 12, lineHeight: 1.5 }}>{gateError}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={() => onExit({ submitted: false })} style={{ flex: 1, padding: "10px 14px", borderRadius: 6, border: "1px solid #E0E5EF", background: "#F1F5F9", color: "#334155", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Back
          </button>
          <button type="button" onClick={() => void startFromGate()} style={{ flex: 1, padding: "10px 14px", borderRadius: 6, border: "none", background: "#F97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {screenOn ? "Share screen & start" : "Start"}
          </button>
        </div>
      </>,
    );
  }

  if (phase === "face") {
    return (
      <FaceVerificationGate
        isOpen
        onVerified={() => setPhase("running")}
        onCancel={() => onExit({ submitted: false })}
      />
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden" style={{ position: "relative" }}>
      <ConnectionStatusBanner netStatus={attempt.netStatus} queueCount={attempt.queueCount} offlineOnly />
      <LiveCameraPreview isActive={running && cameraOn} />
      <ScreenShareGuard
        assessmentId={exerciseId}
        active={running && screenOn}
        courseId={courseId}
        waitForSharedStream={screenOn}
      />
      <MultiFileCodeEditor
        exercise={exercise}
        courseId={courseId}
        courseName={courseName}
        nodeId={nodeId}
        nodeName={nodeName}
        nodeType={nodeType}
        subcategory={subcategory}
        category="You_Do"
        hierarchy={hierarchy}
        exam={examHooks}
        onBack={leave}
        onNavigateToBreadcrumb={() => leave()}
        onCloseExercise={() => { void finish(); }}
      />
    </div>
  );
}
