## Root Causes
- Start command parsing in APK uses fragile regex; it likely throws and is swallowed, so scrcpy never starts.
- APK forwards raw bytes immediately from abstract sockets, but scrcpy protocol prepends metadata and may include per-frame headers; browser decoders then see non-H.264 data, rendering black.
- Socket connection attempts in APK are single-shot; if scrcpy server isn’t ready yet, local socket connect fails and forwarding never starts.
- Web UI decoder expects clean Annex-B frames; it doesn’t strip scrcpy frame metadata or configure WebCodecs with SPS/PPS.

## Fixes (Step-by-step)
### 1) Reliable command parsing in APK
- Replace regex checks with robust JSON parsing using `org.json.JSONObject` for `cmd`, `bitrate`, `audio`.
- Log and update StatusRepository fields on every command to reflect true state.

### 2) Make scrcpy socket connection robust
- Implement retry/backoff loop to connect `LocalSocket` to `scrcpy` and `scrcpy-control` for up to N seconds after starting the server.
- Detect and respect initial handshake:
  - Read the dummy byte on the video socket.
  - Read 64-byte device name, then 4 bytes (2× u16 BE) for width/height.
- Update StatusRepository resolution and device name when received.

### 3) Correct demux and payload
- Parse the scrcpy video stream: when `send_frame_meta` is enabled, frames are preceded by headers; either disable meta on the server (if supported via server flags) or strip headers client-side.
- Extract SPS/PPS NALs and cache them.
- Forward only pure Annex-B NAL units (prepend SPS/PPS to IDR frames) in channel 0 to backend.
- Forward control messages untouched in channel 1.

### 4) Backend stream handling
- Keep binary passthrough for control.
- For video:
  - Option A (recommended): Package Annex-B H.264 into fMP4 segments on the backend using a maintained library (e.g., mp4frag) and broadcast to Web UI via WebSocket.
  - Option B: Forward Annex-B; have Web UI parse and configure WebCodecs (`VideoDecoderConfig.description`) with SPS/PPS, then feed `EncodedVideoChunk`s.

### 5) Web UI decoder hardening
- If using Annex-B:
  - Strip scrcpy metadata if any remains.
  - Detect IDR and ensure SPS/PPS are injected before first IDR.
  - Configure WebCodecs (`codec: 'avc1.42E01E'` or based on actual profile) with SPS/PPS `description`.
- If using fMP4:
  - Append segments to MSE `SourceBuffer` cleanly and manage a small buffer to prevent stalls.
- Add on-screen metrics (frames decoded, last IDR, resolution) to aid diagnosis.

### 6) End-to-end verification
- Instrument counters: APK increments video/control packets; backend counts viewer broadcasts; Web UI shows frames decoded.
- Add REST `/debug` endpoint to dump device registry and last stream activity.
- Manual test: open Web UI, click Start Stream → verify scrcpy starts (APK UI shows running), video appears in viewer, counters increment.

## Deliverables
- APK: `WebSocketService` JSON parsing fixed; `ScrcpyBridge` handshake + robust connect; demux and NAL filtering; status metrics.
- Backend: optional fMP4 packaging path; debug endpoints; stable device registry.
- Web UI: decoder fallback paths (WebCodecs + Broadway), metrics overlay; improved layout.

## Risks & Mitigations
- Some devices produce H.264 profiles not supported by Broadway; prefer WebCodecs or fMP4+MSE.
- Server flags availability may vary; implement client-side stripping regardless.
- Cleartext policy already handled; for production, plan TLS (`wss://`).

## Request
- I will implement the above fixes across APK, backend, and Web UI, then run the backend and validate in preview. Confirm to proceed.