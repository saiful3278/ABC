## Actual Problems
- Viewer mode is forced to 'fmp4' instead of honoring backend mode (`backend/views/viewer.ejs:70–77`).
- Backend can set `pipeline='fmp4'` even when the mux is not enabled, causing no video to be sent (`backend/server.js:110–121` with send logic at `backend/server.js:165–175`).
- Optional robustness: demux does not guard against truncated payloads (`backend/server.js:153–158`).
- Note: `/start` routes include a `command` string the APK ignores; it’s confusing but not a runtime bug (`backend/server.js:29–37,47–52`).

## Changes To Implement (No Environment Config)
1. Fix viewer mode handling
- Update `backend/views/viewer.ejs:70–77` to set `mode = msg.mode` and reflect it in UI, removing hardcoded 'fmp4'.

2. Guard fMP4 mode switching
- Change `backend/server.js:110–121` so `pipeline` is set to 'fmp4' only when `d.mux && d.mux.enabled` is true.
- If mux is not enabled, keep `pipeline='annexb'` and broadcast `{type:'mode', mode:'annexb'}` to all viewers.

3. Demux payload-length guard
- Add a safety check in `backend/server.js:153–158`: if `5 + length > buf.length`, discard/return without parsing to avoid partial reads.

4. Leave `/start` command payload unchanged
- No functional change to `backend/server.js:29–37,47–52`; keep bitrate/maxSize/maxFps behavior as-is. Document later if desired.

## Verification Steps
- Start backend without local ffmpeg: ensure device connects, `/debug` shows `pipeline: annexb`, fMP4 viewer shows 'annexb' mode and does not attempt MSE; Annex B viewer (`/view-webcodecs/:id`) plays video.
- With ffmpeg present: connect device, ensure `pipeline: fmp4`, `viewer.ejs` receives `mode:'fmp4'`, requests and receives init, segments append and render.
- Switch modes from the viewer (`{type:'mode', mode:'annexb'}` and `'fmp4'`) and observe correct fallback/enable behavior.
- Confirm `/debug` counters increment and viewers receive data continuously.

## Scope Boundaries
- No environment configuration changes.
- No changes to APK endpoints or `/start` command semantics.
- Focus strictly on mode handling consistency and demux robustness to prevent silent stalls.