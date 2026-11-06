## Findings
- The Web UI encodes touch events as 32 bytes and includes an extra 4‑byte `actionButton` field, shifting the remaining fields.
- scrcpy’s INJECT_TOUCH_EVENT packet layout is exactly 28 bytes: 1(type) + 1(action) + 8(pointerId) + 4(x) + 4(y) + 2(w) + 2(h) + 2(pressure) + 4(buttons).
- Because of the extra field and misaligned offsets, scrcpy reads corrupted packets, so touches do nothing.
- Key events are correctly 14 bytes and should work; primary breakage is touch structure.

## Changes (no env config)
1) Update touch packet in both viewers to 28 bytes and correct offsets; remove `actionButton` and set `buttons` at offset 24.
2) Keep the rest of the control path unchanged: backend forwards binary unmodified, APK writes to scrcpy control socket.

## Verification
- Use both viewers to send clicks/drag; expect taps and drags to register on device UI.
- Keys should continue to work. If needed, we can add minimal logging counters on backend `/debug` (already present for control bytes).

If approved, I will update `backend/views/viewer.ejs` and `backend/views/webcodecs_viewer.ejs` accordingly and verify.