I will switch the connection logic back to "APK Listening, Server Connecting" but with the corrected socket name. The error logs confirm the `scrcpy-server` is trying to connect, so we should accommodate that by making the APK listen.

### The Problem
The logs show `scrcpy-server` throwing `No such file or directory` while trying to `connect`. This means it is acting as a client. Since our APK is *also* acting as a client (trying to connect), nobody is listening, and the connection fails.

### The Fix
1.  **APK (Server Mode):** I will revert the APK code to use `LocalServerSocket` (Listening mode) instead of `LocalSocket` (Connecting mode).
    *   **Crucial Change:** It will listen on **`scrcpy_00000000`** (matching the `scid`).
2.  **Command:** I will explicitly add `tunnel_forward=true` to ensure the `scrcpy-server` knows it must connect to the APK.

### Files to Change
*   `Deamon_apk/app/src/main/java/com/sam/deamon_apk/ScrcpyBridge.kt`: Switch back to `listenVideo`/`listenSocket` logic.
*   `backend/server.js`: Add `tunnel_forward=true` to the command.

This setup (APK listening on a known name, Server connecting to that known name) is the standard and most reliable way to establish the bridge.