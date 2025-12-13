## Findings
- Backend uses plain HTTP with `ws` (`backend/server.js:9–10`), so TLS is handled by a reverse proxy/CDN if you serve `wss://`.
- Viewer pages hand‑serialize scrcpy control messages in JS (`backend/views/viewer.ejs:312–323`, `backend/views/webcodecs_viewer.ejs:321–332`).
- Touch packets omit one 4‑byte field (`actionButton`), producing a 28‑byte packet instead of the expected layout with two trailing 32‑bit integers. This misaligns the server parser and can trigger huge payload reads → OOM.
- The TLS error `TLSV1_ALERT_PROTOCOL_VERSION` is unrelated to scrcpy; it indicates a TLS version mismatch on your `wss` path (proxy/CDN or server), while Android 10 negotiates TLS 1.2.
- Reference encoders show big‑endian, fixed sizes for scrcpy control messages (see Py Scrcpy pack formats and JS serializer):
  - Py Scrcpy control serialization (big‑endian) shows touch format `>BqiiHHHii` [https://leng-yue.github.io/py-scrcpy-client/_modules/scrcpy/control.html].
  - Versioned JS serializer exists in `@yume-chan/scrcpy` [https://tangoadb.dev/scrcpy/control/].

## Root Causes
- Malformed touch control packet from viewer: missing `actionButton` (`Int32`) before `buttons` (`Int32`).
- Risk of other field/endianness mismatches due to hand‑rolled DataView code.
- TLS minimum protocol configured above Android 10’s default (TLS 1.2) on your proxy/CDN or server.

## Changes (Frontend Control Messages)
- Replace hand‑rolled DataView control message building with the official serializer:
  - Add `@yume-chan/scrcpy` and use `ScrcpyControlMessageSerializer` with options matching server `v3.3.3` to generate binary messages for touch/keyboard/scroll.
  - If you prefer minimal changes, fix the touch packet:
    - Keep big‑endian for all numbers.
    - Packet fields: `type (1)`, `action (1)`, `pointerId (8)`, `x (4)`, `y (4)`, `videoWidth (2)`, `videoHeight (2)`, `pressure (2)`, `actionButton (4)`, `buttons (4)`.
    - Update `viewer.ejs` and `webcodecs_viewer.ejs` to add the missing `actionButton` immediately before `buttons`.
- Optional: adopt fixed‑point position encoding where required by scrcpy versions; the versioned serializer abstracts this.

## Changes (Device APK)
- Ensure the APK writes client control messages to the scrcpy control socket exactly as serialized, without extra framing or JSON.
- Verify big‑endian encoding and fixed sizes; do not insert variable‑length fields except where the protocol specifies (e.g., text length).
- If the APK currently re‑serializes, port `control_msg.c/h` functions or switch to a proven serializer to avoid drift.

## Changes (Backend/TLS)
- Keep backend as HTTP; terminate TLS at proxy/CDN and allow TLS 1.2 and 1.3:
  - Nginx: `ssl_protocols TLSv1.2 TLSv1.3;`
  - Caddy: `tls { protocols tls1.2 tls1.3 }`
  - Cloudflare: Security → TLS → Minimum TLS Version = TLS 1.2.
- If you must serve TLS directly from Node, convert `http.createServer` to `https.createServer({ key, cert }, app)` and attach `WebSocketServer` on it, then allow TLS 1.2+.

## Verification
- Scrcpy control:
  - Log and assert control packet sizes at the device ingress; for touch, expect 32 bytes including `actionButton` and `buttons`.
  - Run a simple tap/drag in the viewer; confirm no `OutOfMemoryError` and stable controller thread.
  - Inspect server counters on `/debug` for sane `controlBytes` growth (`backend/server.js:412–418`).
  - Optionally use the versioned JS serializer and unit tests to serialize each message type and validate lengths.
- TLS:
  - From device (Termux), run `curl -Iv https://your-domain` and/or `openssl s_client -connect your-domain:443 -tls1_2` to confirm TLS 1.2 is accepted.
  - Confirm WebSocket connects as `wss://` in viewer (`backend/views/viewer.ejs:56–58`).

## Code References
- Backend HTTP and WS setup: `backend/server.js:8–11`, `backend/server.js:407–410`.
- Device demux (channel + length + payload): `backend/server.js:159–197`.
- Viewer WebSocket and hand‑rolled control messages:
  - `backend/views/viewer.ejs:312–323` (touch), `backend/views/viewer.ejs:348–372` (keycode).
  - `backend/views/webcodecs_viewer.ejs:321–332` (touch), `backend/views/webcodecs_viewer.ejs:357–381` (keycode).

## Rollout
- Implement serializer change or packet fix in both viewers.
- Validate end‑to‑end on one device; monitor for OOM in scrcpy server logs.
- Adjust TLS settings on proxy/CDN; re‑test Android 10 handshake.
- Document the exact scrcpy version dependency and keep serializer/options aligned with `3.3.3`. 
