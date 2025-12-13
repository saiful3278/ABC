I will fix the "Connection refused" error by reverting to **Server Mode** (APK Listening), but with **audio disabled**.

### Why Client Mode Failed
The logs show `Connect Error: Connection refused`. This confirms that `scrcpy-server` (running as `shell`) is NOT listening on the socket `scrcpy_00000000`.
This is likely because:
1.  `scrcpy-server` crashed immediately (due to audio error, which we just fixed, but maybe something else remains).
2.  OR `scrcpy-server` defaults to "Connecting" mode even without `tunnel_forward=true`.

### The Solution
We know from previous errors (`connectLocal`) that `scrcpy-server` **wants to connect** to us.
Now that we have fixed the Audio crash (`audio=false`), we should go back to the architecture that matches the server's behavior:
1.  **APK Listens** (`LocalServerSocket`).
2.  **Server Connects** (`tunnel_forward=true`).

Previously, this failed because of the Audio Crash (`errno 108`). Now that Audio is disabled, this architecture should finally work.

### Plan
1.  **Revert `ScrcpyBridge.kt` to Server Mode:** Use `listenVideo` / `listenSocket` on `scrcpy_00000000`.
2.  **Update Command:** Add `tunnel_forward=true` back to the command (in both APK and Server).

This aligns with the server's desire to `connectLocal` (as seen in earlier logs) and avoids the "Connection refused" error of the client mode.