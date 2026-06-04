// ─── Shared WebRTC ICE server configuration ─────────────────────────────────
// Used by BOTH the student broadcaster (useLiveScreenShare) and the proctor
// viewer (useProctorScreens) so their ICE configs can never drift apart.
//
// PRIMARY relay = your self-hosted coturn. Fill in the 3 constants below after
// you deploy it (full steps in COTURN_SETUP.md at the repo root). coturn is what
// makes 10–50 concurrent screens reliable. The public OpenRelay is kept ONLY as
// a fallback for when coturn is unset/down — remove it once coturn is confirmed.

// ── Self-hosted coturn — FILL THESE IN after deploying (see COTURN_SETUP.md) ──
const COTURN_HOST: string = "";            // e.g. "turn.yourdomain.com" or "203.0.113.10"
const COTURN_USERNAME: string = "lmsturn"; // must match `user=` in turnserver.conf
const COTURN_CREDENTIAL: string = "";      // the password you set in turnserver.conf

function coturnServers(): RTCIceServer[] {
  // Skipped until the host + credential are filled in, so the app keeps working
  // on the OpenRelay fallback until your coturn is ready.
  if (!COTURN_HOST || !COTURN_CREDENTIAL) return [];
  return [
    {
      urls: [
        `turn:${COTURN_HOST}:3478`,                // UDP — best path when allowed
        `turn:${COTURN_HOST}:3478?transport=tcp`,  // TCP fallback
        `turns:${COTURN_HOST}:5349?transport=tcp`, // TLS — beats strict firewalls
      ],
      username: COTURN_USERNAME,
      credential: COTURN_CREDENTIAL,
    },
  ];
}

const ICE_SERVERS: RTCIceServer[] = [
  // STUN — direct / NAT-reflexive paths, tried first when reachable.
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },

  // PRIMARY: your coturn relay (added only once the constants above are filled).
  ...coturnServers(),

  // FALLBACK ONLY: public Metered OpenRelay — rate-limited, NOT for exam-scale
  // load. Remove this block once your coturn is confirmed working.
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turns:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

/** ICE servers for every live-screens RTCPeerConnection (STUN + coturn TURN). */
export function getIceServers(): RTCIceServer[] {
  return ICE_SERVERS;
}
