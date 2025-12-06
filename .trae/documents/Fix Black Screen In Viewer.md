## Pipeline Overview
- Source: `scrcpy` emits H.264 AnnexB NAL units on Android.
- APK: `ScrcpyBridge` envelopes NALs and control into WS frames (`Deamon_apk/app/src/main/java/com/sam/deamon_apk/ScrcpyBridge.kt:147–169`).
- Backend: `server.js` demuxes (channel 0=video, 1=control), and if FFmpeg is available, remuxes to FMP4 and tells viewers the `mode` (`backend/server.js:83–90`, `141–204`).
- Web UI: `viewer.ejs` appends FMP4 to a hidden `<video>` via `MediaSource`, but never paints to the visible `<canvas>` (`backend/views/viewer.ejs:44–63, 66–80, 50`).

## Root Cause
- In FMP4 mode, the UI does not render. The `<video>` is hidden and no draw loop copies frames to `<canvas>`; the canvas stays black.
- In AnnexB mode (FFmpeg missing), rendering depends on WebCodecs. Browsers without WebCodecs will also show black.

## Fix Plan (End-to-End)
1. APK
- Keep: IDR packets include SPS/PPS (`ScrcpyBridge.kt:151–159`), non-IDR carry annexb start codes (`ScrcpyBridge.kt:163–169`). This is correct for both direct AnnexB and FFmpeg remux.
- Optional: Add lightweight counters/logging (already present in `StatusRepository`) for verification.

2. Backend
- Ensure FFmpeg available on the server path; if spawn fails, `mode='annexb'` (`backend/server.js:145–148`). Install FFmpeg or correct PATH to prefer `mode='fmp4'` for widest browser compatibility.
- Keep the muxer emitting init (ftyp+moov) followed by moof+mdat segments (`backend/server.js:149–176`), and sending `init` to viewers on join (`backend/server.js:88–89`).

3. Web UI
- FMP4: Implement a `requestAnimationFrame` render loop that copies frames from the hidden `<video>` to the `<canvas>` once playback starts.
- Start/stop the loop on `playing`/`ws.close` and when pressing Stop, to prevent runaway RAFs.
- AnnexB: Keep existing WebCodecs path. Show a clear status if WebCodecs missing.
- Status: Show `Connected`, `Mode: <mode>`, then `Streaming` once frames render.

## Code Changes (Targets)
- `backend/views/viewer.ejs`
  - Add `renderFromVideo()` and `rafId`.
  - On `videoEl.playing`, start rendering when `mode==='fmp4'`.
  - Cancel RAF on disconnect/stop.

## Verification
- Use `/debug` (`backend/server.js:210–216`) to confirm backend counters increasing when streaming.
- Browser: Chrome/Edge should render both FMP4 and AnnexB (with WebCodecs). Safari/Firefox only FMP4.
- UI: Status flows `Connected → Mode: fmp4 → Streaming` and the canvas shows live frames, no black screen.

## Contingencies
- If AnnexB only (no FFmpeg), instruct users to use a WebCodecs-enabled browser or install FFmpeg to enable FMP4.
- If codec mismatch occurs, adjust SourceBuffer MIME from `avc1.42E01E` to the actual profile exposed in the stream.