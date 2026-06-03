
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
