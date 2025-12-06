## Symptoms
- Viewer logs show `ws open`, `Connected`, `Mode: fmp4`, `media source open`, `video waiting` but no `init/seg appended`.
- Backend `/debug` shows `controlPkts` increasing and `videoPkts` staying at 0.

## Likely Causes
- scrcpy server not launching on device (missing server binary or permissions).
- Local socket connection to `scrcpy` (video) failing; only `scrcpy-control` works.
- Version/argument mismatch for scrcpy server handshake.

## Verification (No Code Changes)
- Backend: watch logs for `device connect` and `first video payload`.
- Viewer: reload `/view/<id>` and confirm logs; if no `init/seg appended`, backend isn’t receiving video.
- Device shell (adb or terminal app):
  - Check server binary: `ls -l /data/local/tmp/scrcpy-server-v3.3.3`.
  - Test su: `su -c id` returns uid 0.
  - Check process: `ps -A | grep app_process` after Start.
  - If possible, `logcat -s scrcpy` to see server errors.

## Implementation Plan
### APK: Robust scrcpy launch and diagnostics
1. Validate server file path; if missing, deploy from APK assets to `/data/local/tmp/scrcpy-server-v3.3.3` and `chmod 755` via `su`.
2. Wrap `ProcessBuilder("su","-c", cmd)` with stdout/stderr readers; publish lines to `StatusRepository` and periodically to backend over WebSocket (e.g., `{type:"status", log:"..."}`).
3. Instrument `forwardVideo()` and `forwardSocket()`:
   - Log each retry and final exception when connecting to `LocalSocketAddress("scrcpy")`.
   - Log handshake reads (device name/resolution) and first NAL detection.
4. Add a lightweight heartbeat with counts from `StatusRepository` so backend can expose them.

### Backend: Status surface (optional)
1. Add `/status` JSON endpoint per device to show APK-reported logs, last error, reconnect count.
2. Keep mux logs for init segment and first video payload for correlation.

### Viewer: Already instrumented
- No further changes required; current logs reveal browser-side state.

### Optional Test Harness
- Implement a dummy device simulator that feeds synthetic AnnexB (testsrc) to mux to validate the fMP4 path independent of APK.

## Acceptance Criteria
- `/debug` shows `videoPkts > 0` and `videoBytes` increasing.
- Viewer logs show `init appended`, `seg appended`, and `video playing`.
- APK status logs report scrcpy start success or actionable errors if launch fails.

## Rollback/Contingencies
- If su unavailable: run scrcpy server without su where possible or adjust deploy path.
- If version mismatch: obtain the correct `scrcpy-server` matching the client (3.3.3) and update the deploy path.