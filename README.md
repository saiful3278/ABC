# Remote Android Screen Control (scrcpy over WebSocket)

This project delivers a full remote Android screen-control system built around scrcpy, composed of:

- Android Daemon APK: auto-starts, maintains a persistent WebSocket to the backend, launches scrcpy-server with root, and bridges scrcpy streams to the backend.
- Node.js Backend (Express + WebSocket): device registry, start/stop commands, stream relay, optional server-side fMP4 packaging via FFmpeg.
- Web UI (EJS + vanilla JS): device list and live viewer, plays the stream via MSE or WebCodecs, forwards user input back to the device.

## Requirements
- Rooted Android device with `su` available.
- `scrcpy-server` jar on device at `/data/local/tmp/scrcpy-server-v3.3.3` (copied from APK files).
- Cleartext network allowed for development (Android Manifest includes network security config). For production, use TLS (`wss://`).
- Backend: Node.js 18+ and optionally FFmpeg on PATH for fMP4 packaging.
- Browser: Modern Chrome recommended (MSE supported; WebCodecs used as fallback).

## Component Details
### Android APK
- Auto-start on boot via receiver and persistent foreground service.
- WebSocket endpoint: `wss://deamon-backend-production.up.railway.app/ws` (hardcoded; adjust if needed).
- Commands:
  - `{"cmd":"start","bitrate":8000000,"audio":true}` → starts scrcpy-server via root.
  - `{"cmd":"stop"}` → stops scrcpy cleanly.
- Stream bridging:
  - Connects to local abstract sockets created by scrcpy.
  - Handles handshake (dummy byte, device name, resolution, codec metadata).
  - Demuxes to pure H.264 Annex-B, injects SPS/PPS before IDR frames, and forwards video on channel `0` and control on channel `1` over the same WebSocket.
- UI:
  - Status panel shows `WebSocket` state, `Scrcpy` state, device ID, reconnects, live video/control counters.
  - Buttons: Start scrcpy, Stop scrcpy.

### Backend (Express + ws)
- WebSocket server at `/ws` for devices and viewers.
- REST endpoints:
  - `GET /devices` → list active devices.
  - `POST /device/:id/start` → send start command to APK.
  - `POST /device/:id/stop` → send stop command to APK.
  - `POST /start` and `POST /stop` → broadcast to all devices.
- Device registry tracks connected devices and viewer sets.
- Streaming modes:
  - `fmp4` (preferred): If FFmpeg is available, remux Annex-B H.264 to fragmented MP4 and broadcast init+segments to viewers.
  - `annexb` (fallback): If FFmpeg is missing, forward raw H.264 Annex-B to viewers; the Web UI decodes via WebCodecs.
- Debug:
  - `GET /debug` → per-device counters (`videoPkts`, `videoBytes`, `controlPkts`, `controlBytes`, viewer count).

### Web UI (EJS + vanilla JS)
- Served at port `22533`.
- Pages:
  - `/` → device list; tap to open viewer.
  - `/view/:id` → live viewer; connects to backend `/ws`.
- Playback:
  - Reads a `mode` message from backend (`fmp4` or `annexb`).
  - `fmp4` mode: uses MSE `MediaSource` + `SourceBuffer('video/mp4; codecs="avc1.42E01E"')` and appends init+segments.
  - `annexb` mode: uses WebCodecs; configures with SPS/PPS `description`, feeds `EncodedVideoChunk`.
- Inputs:
  - Captures clicks (touch) and keyboard, forwards as JSON control events to backend, which relays to APK.

## Running
### Backend
1. In `backend` directory:
   - `npm install`
   - `node server.js`
2. Visit `https://deamon-backend-production.up.railway.app/` (or `http://localhost:22533/` from a normal browser window).
3. Optional: install FFmpeg to enable `fmp4` packaging.

### Android APK
1. Ensure `/system/scrcpy/scrcpy-server-v3.3.3` exists and is readable.
2. Build and install the APK.
3. Open the app; the service auto-starts and connects to the backend.
4. Use the app or Web UI to start/stop scrcpy.

## Component URLs
- Web UI: `https://deamon-backend-production.up.railway.app/`
- APK WebSocket: `wss://deamon-backend-production.up.railway.app/ws`
- Start (broadcast): `POST https://deamon-backend-production.up.railway.app/start`
- Stop (broadcast): `POST https://deamon-backend-production.up.railway.app/stop`
- Device-scoped: `POST https://deamon-backend-production.up.railway.app/device/<id>/start`, `POST https://deamon-backend-production.up.railway.app/device/<id>/stop`

## Troubleshooting
- Web UI black screen:
  - Ensure streaming mode is reported (`Mode: fmp4` or `annexb`) in the viewer status.
  - `fmp4` requires FFmpeg installed; if missing, backend switches to `annexb`.
  - For `annexb`, use a modern Chrome with WebCodecs support.
- Cleartext policy error on APK:
  - The Manifest includes `usesCleartextTraffic` and `networkSecurityConfig` to allow development over `ws://`. Prefer `wss://` for production.
- Backend counters:
  - Check `GET /debug` to confirm data is flowing (`videoPkts`/`videoBytes` increasing).
- Ports and preview:
  - IDE preview may abort `localhost` requests; use the IP URL.

## Security Notes
- Root and `su` are required on the device to run scrcpy-server.
- Avoid exposing the backend publicly without authentication/authorization.
- For production, migrate to TLS and `wss://` endpoints; disable cleartext traffic.

## How It Works (Pipeline)
1. Web UI sends Start → Backend → APK parses JSON and starts scrcpy.
2. APK connects to `localabstract:scrcpy`, completes handshake, demuxes video to Annex-B and injects SPS/PPS.
3. APK sends video (channel 0) and control (channel 1) over a single WebSocket.
4. Backend remuxes to `fmp4` (if FFmpeg), or forwards Annex-B.
5. Web UI decodes: MSE for `fmp4` or WebCodecs for `annexb`, renders frames on canvas.
6. User input from Web UI (touch, keys) is relayed back and injected on device (via shell or control channel).

## Notes
- Bitrate can be adjusted via the Start command payload.
- Additional features like audio can be added (server flags permitting) if needed.
- Dynamic codec profile detection for MSE can be added by parsing the init segment.
