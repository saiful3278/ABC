I will fix the `write failed: errno 108 (Cannot send after transport endpoint shutdown)` error by **disabling audio** completely, as the error log indicates audio encoding failure ("Audio disabled: it is not supported before Android 11" followed by a crash).

### The Error
The screenshot shows `java.io.IOException: ... write failed: errno 108` caused by `AudioEncoder.encode`. The server is crashing because it's trying to initialize audio on a device where it's not supported or failing, and this crash kills the entire server process (stopping video too).

### The Fix
1.  **Disable Audio in Command:** I will explicitly set `audio=false` in the command arguments in both `ScrcpyBridge.kt` and `server.js`.
2.  **Verify:** This will prevent `scrcpy-server` from attempting to initialize the audio encoder, avoiding the crash and allowing the video stream to proceed.

### Files to Change
*   `Deamon_apk/app/src/main/java/com/sam/deamon_apk/ScrcpyBridge.kt`
*   `backend/server.js`