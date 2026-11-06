I will implement visible command logging in the Android APK so you can see exactly what is running and if it succeeds or fails.

### The Problem
Currently, the APK UI only shows basic status like "running" or "stopped", but doesn't show the actual command being executed or its output/errors. This makes it impossible to know if `scrcpy-server` failed silently (e.g., due to bad arguments).

### The Fix
1.  **Add `lastCommand` to `StatusRepository`**: I will create a new field in the repository to store the last executed command string.
2.  **Display Command in UI**: I will update `MainActivity.kt` to show this command string on the screen.
3.  **Capture & Display Output**: The `ScrcpyBridge` already captures output and sends it to the backend via `sendText`, but I will also route this to a new `scrcpyOutput` field in `StatusRepository` so it appears on the phone screen.

### Files to Change
1.  `StatusRepository.kt`: Add `_lastCommand` and `_scrcpyOutput` state flows.
2.  `MainActivity.kt`: Add text fields to display `lastCommand` and `scrcpyOutput`.
3.  `ScrcpyBridge.kt`: Update `start()` to save the command to `StatusRepository` and stream the process output to `StatusRepository.appendOutput()`.

This will let you see:
*   **CMD:** `app_process ... video_bit_rate=4000000 ...`
*   **OUT:** `[server] Info: Device: ...` (or error messages) directly on the phone.