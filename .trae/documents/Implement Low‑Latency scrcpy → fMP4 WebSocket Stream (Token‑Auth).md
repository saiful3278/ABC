## Problem Summary
- Current viewer forces Annex‑B mode on connect, which requires WebCodecs and often fails to play; this bypasses the FFmpeg fMP4 path.
- Evidence: `backend/views/viewer.ejs:64` sends `{ type:'mode', mode:'annexb' }` on WebSocket open, causing the server to switch away from fMP4 even if FFmpeg is available.

## Minimal Changes
1. Remove the forced Annex‑B switch
- Change `backend/views/viewer.ejs:64` to stop sending the Annex‑B request.
- Result: server keeps default `fmp4` mode (if FFmpeg is available) and broadcasts init+segments; browser plays via MSE.

2. Optional (recommended) — disable the 3s auto‑fallback to Annex‑B
- Viewer currently auto‑switches to Annex‑B after ~3s if not playing (`backend/views/viewer.ejs:157–165`).
- Remove or increase the timeout to avoid premature fallback when init/segments arrive slightly later.

## Why This Works
- Server already remuxes H.264 to fMP4 (`backend/server.js:227–302`) and sends init+segments to viewers.
- Viewer MSE path already queues, trims, and appends correctly (`backend/views/viewer.ejs:116–151`).
- Keeping fMP4 mode avoids WebCodecs dependency and is more production‑stable.

## Expected Outcome
- Opening the viewer page shows live phone screen with <1s startup (empty_moov + short fragments).
- No WebCodecs errors; playback uses MSE SourceBuffer.
- Existing APK bridge remains unchanged; no server endpoint changes.

## Verification
- Confirm FFmpeg is detected in logs (“ffmpeg spawn”) and `/debug` shows increasing `videoBytes`.
- Viewer status shows `Mode: fmp4`; video renders to canvas.

## Scope
- Minimal and safe: only two small client‑side edits, no protocol or server changes.
- Can be rolled back quickly if needed.
