// ─── Shared WebRTC ICE server configuration ─────────────────────────────────
// Used by BOTH the student broadcaster (useLiveScreenShare) and the proctor
// viewer (useProctorScreens) so their ICE configs can never drift apart.
//
// WHY LIVE SCREENS WORK LOCALLY BUT NOT AFTER DEPLOYMENT:
// On a shared LAN (local dev) the student and proctor reach each other directly,
// so STUN alone is enough. Across the public internet they sit on different
// networks behind NAT/firewalls — the socket signaling (offer/answer) still
// succeeds, so the proctor row appears, but with no TURN *relay* the media path
// never establishes and the proctor just sees a black "waiting for screen".
//
// FIX: provision a TURN server (self-hosted coturn, or a managed provider such
// as Metered/OpenRelay, Twilio, Cloudflare, or Xirsys) and set these build-time
// env vars in the CLIENT deployment (.env.local / hosting dashboard):
//
//   NEXT_PUBLIC_TURN_URLS=turn:turn.example.com:3478,turns:turn.example.com:5349
//   NEXT_PUBLIC_TURN_USERNAME=yourTurnUser
//   NEXT_PUBLIC_TURN_CREDENTIAL=yourTurnPassword
//
// Optional STUN override (defaults to Google's public STUN if unset):
//   NEXT_PUBLIC_STUN_URLS=stun:stun.l.google.com:19302
//
// NOTE: NEXT_PUBLIC_* vars are inlined at BUILD time, so rebuild/redeploy the
// client after changing them. Also serve the app over HTTPS — getDisplayMedia
// and WebRTC require a secure context.

const DEFAULT_STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function splitList(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

let cached: RTCIceServer[] | null = null;

/**
 * Resolve the ICE servers for every live-screens RTCPeerConnection.
 * Always includes STUN; appends a TURN relay only when URL + credentials are
 * all configured. Result is memoized (env vars are fixed at build time).
 */
export function getIceServers(): RTCIceServer[] {
  if (cached) return cached;

  const servers: RTCIceServer[] = [];

  // STUN: env override, else the Google public defaults.
  const stunUrls = splitList(process.env.NEXT_PUBLIC_STUN_URLS);
  if (stunUrls.length > 0) servers.push({ urls: stunUrls });
  else servers.push(...DEFAULT_STUN);

  // TURN relay: only added when fully configured (URL + username + credential).
  const turnUrls = splitList(process.env.NEXT_PUBLIC_TURN_URLS);
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    servers.push({ urls: turnUrls, username: turnUsername, credential: turnCredential });
  } else if (typeof window !== "undefined") {
    // Loud hint in the browser console so a broken deployment is diagnosable.
    console.warn(
      "[live-screens] No TURN server configured " +
        "(NEXT_PUBLIC_TURN_URLS / NEXT_PUBLIC_TURN_USERNAME / NEXT_PUBLIC_TURN_CREDENTIAL). " +
        "Screen sharing works on a shared LAN but will likely fail across NAT/firewalls — " +
        "the proctor will see a black 'waiting for screen'."
    );
  }

  cached = servers;
  return servers;
}
