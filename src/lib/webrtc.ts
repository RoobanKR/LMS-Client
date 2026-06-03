
 
const ICE_SERVERS: RTCIceServer[] = [
  // STUN — direct / NAT-reflexive paths, tried first when reachable.
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
 
  // TURN relay — Metered OpenRelay (public, free). The :443 and TCP/TLS variants
  // share the same credentials and punch through firewalls that block UDP / :80,
  // so they are included for reliability across restrictive networks.
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
 
/** ICE servers for every live-screens RTCPeerConnection (STUN + hardcoded TURN). */
export function getIceServers(): RTCIceServer[] {
  return ICE_SERVERS;
}
 
 