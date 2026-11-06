I will fix the `scrcpy-server` command syntax to use the correct `key=value` format (e.g., `video_bit_rate=4000000`) instead of incorrect flags (`--bit-rate`). I will also add logging to make the command and its output visible in the UI for debugging.

### The Problem
The current command uses `--flag value` syntax, which causes `scrcpy-server` (v2.0+) to fail immediately because it expects `key=value` pairs. Additionally, the failure is silent because the UI shows "Running" before verifying the process actually stayed alive.

### The Fix
1.  **Correct Command Syntax:** I will rewrite the command generation in both `ScrcpyBridge.kt` and `server.js` to use the correct format:
    *   `video_bit_rate=4000000`
    *   `max_size=480`
    *   `max_fps=40`
    *   `scid=00000000`
    *   `raw_stream=true`
    *   `tunnel_forward=false` (implied by omission/default, or set explicitly if needed).
    *   `control=true` (if needed, but sticking to user's list).

2.  **Visible Debugging:**
    *   I will add a line in `ScrcpyBridge.kt` to send the full command string to the Web UI via WebSocket before execution.
    *   This ensures you can see exactly what command is being run.

### Files to Change
*   `Deamon_apk/app/src/main/java/com/sam/deamon_apk/ScrcpyBridge.kt`
*   `backend/server.js`