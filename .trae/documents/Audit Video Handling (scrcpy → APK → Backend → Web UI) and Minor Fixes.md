## Findings
- APK → Backend demux is correct: `channel 0` video handled in `backend/server.js:165–183`, counters logged every 100 packets.
- fMP4 path is robust: backend extracts `ftyp+moov` init and `moof+mdat` segments; viewer requests init and appends segments sequentially.
- Annex B path is correct: raw H.264 forwarded; WebCodecs viewer accumulates and parses NALs across chunk boundaries.
- Mode signaling fixed: viewer now honors backend `mode`; backend falls back to `annexb` if mux is unavailable.

## Potential Issues
- Implicit global `codecText` in `viewer.ejs` (assigned without declaration). Harmless but non‑idiomatic and can be shadowed.
- Duplicate init requests: viewer requests init on WS open and again on `MediaSource.sourceopen`; harmless but redundant.
- Over‑aggressive drift correction may cause small jumps: resets `currentTime` if drift > 0.6s; acceptable but may stutter at high jitter.
- `findBoxDeep` naive recursion could reparse headers; works for `avcC` discovery but is inefficient.
- `isInit` only checks for `moov`; safe since segments have `moof`/`mdat`, but adding `ftyp` check would be slightly stricter.

## Proposed Minimal Fixes (Best Practices, No Env Changes)
1) Declare `codecText` explicitly in `viewer.ejs` to avoid implicit global.
2) Optionally send a single init request (keep sourceopen request; remove WS open request) to reduce redundancy.
3) Tighten `isInit` to require `ftyp` + `moov` presence in `viewer.ejs` for clarity.

## Verification
- Load `/view/:id` and ensure correct mode display and smooth playback.
- Confirm `/debug` counters increase and no console errors in viewer.
- Switch modes and validate init resend and steady segment append.