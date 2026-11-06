I will switch back to **Client Mode** (APK connects to Server) because it is likely that `scrcpy-server` (running as shell/root) cannot connect to the APK's socket due to Android permission/SELinux restrictions. Conversely, the APK connecting to the Server is more likely to succeed or give us a clear permission error.

### The Fix
1.  **Command:** Remove `tunnel_forward=true` so `scrcpy-server` defaults to **Listening** mode.
2.  **APK:** Update `ScrcpyBridge.kt` to actively **connect** to `scrcpy_00000000`.
3.  **Debug:** I will explicitly log the connection error (e.g., "Connection refused" or "Permission denied") to the UI so we know *why* the connection is failing if it persists.

### Files to Change
*   `Deamon_apk/app/src/main/java/com/sam/deamon_apk/ScrcpyBridge.kt`
*   `backend/server.js` (Sync command)

This approach avoids the likely permission issues of a root process trying to connect to an unprivileged app socket.