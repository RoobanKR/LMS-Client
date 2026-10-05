// ─── Shared screen-stream store ─────────────────────────────────────────────
// Ensures the student is prompted for screen access only ONCE per test, no
// matter how many features want the screen (proctoring recording AND the Live
// Screen broadcaster).
//
// Whoever captures the screen first publishes it here; the others REUSE it.
// `captureInProgress` lets a late consumer know a getDisplayMedia prompt is
// already open so it WAITS for that result instead of opening a second prompt.

type Listener = (stream: MediaStream | null) => void;

let current: MediaStream | null = null;
let captureInProgress = false;
const listeners = new Set<Listener>();

/** Publish the captured screen stream (clears the in-progress flag). */
export function setSharedScreenStream(stream: MediaStream | null): void {
  current = stream;
  captureInProgress = false;
  listeners.forEach((l) => {
    try { l(stream); } catch { /* ignore listener errors */ }
  });
}

export function getSharedScreenStream(): MediaStream | null {
  // A stream whose video tracks have all ended is useless — treat as absent.
  if (current && current.getVideoTracks().every((t) => t.readyState === "ended")) {
    return null;
  }
  return current;
}

export function subscribeSharedScreenStream(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Call SYNCHRONOUSLY right before navigator.mediaDevices.getDisplayMedia(). */
export function markScreenCaptureStarting(): void {
  captureInProgress = true;
}

/** True while a getDisplayMedia prompt is open and not yet resolved. */
export function isScreenCaptureInProgress(): boolean {
  return captureInProgress;
}

/** Call if a capture attempt failed/was denied (so waiters stop waiting). */
export function clearScreenCaptureInProgress(): void {
  captureInProgress = false;
}

/**
 * Prompt for the screen and publish it, so the test player that opens next
 * reuses this stream instead of prompting again. Called from the instructions
 * page's Start click, so the student shares BEFORE the compiler renders. The
 * constraints mirror the code editor's proctoring capture. Resolves null when
 * the student cancels the prompt.
 */
export async function captureSharedScreen(withAudio: boolean): Promise<MediaStream | null> {
  const existing = getSharedScreenStream();
  if (existing) return existing;
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) return null;

  markScreenCaptureStarting();
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: "screen",
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 15, max: 30 },
      } as any,
      audio: withAudio
        ? { echoCancellation: true, noiseSuppression: true, sampleRate: 44100, channelCount: 2 }
        : false,
    });
    setSharedScreenStream(stream);
    stream.getVideoTracks().forEach((t) =>
      t.addEventListener("ended", () => { if (current === stream) setSharedScreenStream(null); }),
    );
    return stream;
  } catch {
    clearScreenCaptureInProgress();
    return null;
  }
}
