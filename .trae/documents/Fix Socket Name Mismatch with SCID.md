I will fix the "Connecting" loop by explicitly defining the Socket ID (`scid`) to ensure both the APK and `scrcpy-server` are talking to the exact same socket.

### The Problem
The `scrcpy-server` (in Listening mode) creates a socket with a name derived from its ID (e.g., `scrcpy_12345678`). Since we didn't specify an ID, it's using a default or random one, while our APK is trying to connect to the generic name `scrcpy`. This mismatch causes the connection to fail indefinitely.

### The Fix
1.  **Force the ID:** I will add `scid=00000000` to the `scrcpy-server` startup arguments.
2.  **Match the Name:** I will update the APK's connection logic to connect to `scrcpy_00000000` (the standard naming convention `scrcpy_{scid}`).

### File to Change
*   `Deamon_apk/app/src/main/java/com/sam/deamon_apk/ScrcpyBridge.kt`

### Steps
1.  Update command string: Append `scid=00000000`.
2.  Update `connectVideo()`: Change target to `scrcpy_00000000`.
3.  Update `connectSocket()` (Control): Change target to `scrcpy-control_00000000`?
    *   *Correction:* Scrcpy uses the *same* socket name for the main connection. The "control" socket might be handled differently or multiplexed.
    *   **Wait**, standard `scrcpy` uses **one** socket for everything (Video + Control) in recent versions!
    *   However, the `ScrcpyBridge` code expects **two** sockets (`scrcpy` and `scrcpy-control`).
    *   If `scrcpy` server supports a separate control socket, it's usually via `control=true`.
    *   **Strategy:** I will stick to the single video socket for now (`scrcpy_00000000`) and see if that establishes the video stream. The control socket logic might need to be adjusted if `scrcpy-server` doesn't open a second port by default.
    *   Actually, `scrcpy-server` typically opens *one* server socket. Clients connect to it.
    *   If we need separate control, we might need `control_socket_name` arg? No, scrcpy 2.0 multiplexes.
    *   **For this specific codebase:** It seems designed for separate sockets.
    *   **Decision:** I will set `scid=00000000` and try to connect Video to `scrcpy_00000000`. For Control, I will try `scrcpy_00000000` as well (maybe it accepts multiple connections?) or leave it as is to debug video first.
    *   **Refined Plan:** Set `scid=00000000`. Connect Video to `scrcpy_00000000`.

Let's start with fixing the Video connection, which is the primary issue.