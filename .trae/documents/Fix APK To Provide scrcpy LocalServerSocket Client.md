**Overview**

* Root cause: The APK acts as a LocalSocket client connecting to `localabstract:scrcpy` and `scrcpy-control`, but scrcpy-server (running on the device) expects a client socket to be listening. No `LocalServerSocket` exists, so the server’s `connect()` fails with “No such file or directory”.

* Fix: Implement and start `LocalServerSocket` listeners on the device for `scrcpy` (video) and `scrcpy-control` (control), accept connections, then stream data to the backend. Ensure listeners are started before launching `scrcpy-server`.

**Current Findings**

* LocalSocket usage only (no LocalServerSocket): `Deamon_apk/app/src/main/java/com/sam/deamon_apk/ScrcpyBridge.kt:88-124` and `:121-170` create `LocalSocket` and `connect()` to abstract addresses (`"scrcpy"`, `"scrcpy-control"`).

* Server startup: `ScrcpyBridge.start()` starts scrcpy-server, then launches coroutines to connect to sockets (`ScrcpyBridge.kt:27-61`).

* Manifest permissions present: `INTERNET`, `FOREGROUND_SERVICE`, `WAKE_LOCK`, boot receiver (`app/src/main/AndroidManifest.xml:5-9, 32-44`).

* Service lifecycle OK: `WebSocketService` starts foreground service, owns `ScrcpyBridge` and triggers `start/stop` (`WebSocketService.kt:41-47, 61-69`).

**Changes To Implement**

* Replace client-side `LocalSocket.connect()` with server-side `LocalServerSocket.accept()`:

  * Add two listeners:

    * `listenVideo()`: `LocalServerSocket(LocalSocketAddress("scrcpy", ABSTRACT))`, `accept()`, then read handshake and H.264 stream. Handle optional dummy byte gracefully (forward mode dummy present; reverse mode absent).

    * `listenControl()`: `LocalServerSocket(LocalSocketAddress("scrcpy-control", ABSTRACT))`, `accept()`, then read control packets and forward to backend with channel id 1.

  * Start listeners before scrcpy-server:

    * In `ScrcpyBridge.start(bitrate)`, launch `videoJob = scope.launch { listenVideo() }` and `controlJob = scope.launch { listenControl() }` first; wait until bound (e.g., a small barrier/flag) so names are registered, then start the `process` with `ProcessBuilder("su", "-c", cmd)`.

  * Robust handshake in `listenVideo()`:

    * Peek first byte; if it looks like the dummy byte, consume it; otherwise treat as part of the device name header.

    * Continue reading the 64-byte device name and 12-byte codec/size header (existing logic) and set status.

  * Connection lifecycle:

    * After a socket closes, loop to `accept()` again while `scope.isActive`, so the APK continues serving new scrcpy-server sessions.

    * Ensure `stop()` closes server sockets and cancels jobs cleanly.

* Minimal code additions (Kotlin, Android SDK):

  * Import `android.net.LocalServerSocket` and `android.net.LocalSocketAddress`.

  * Introduce server socket fields: `private var videoServer: LocalServerSocket?`, `private var controlServer: LocalServerSocket?`.

  * Guarded close in `stop()`.

**Implementation Details**

* File: `app/src/main/java/com/sam/deamon_apk/ScrcpyBridge.kt`

  * Rename `forwardVideo()` → `listenVideo()`, refactor to:

    * `videoServer = LocalServerSocket(LocalSocketAddress("scrcpy", LocalSocketAddress.Namespace.ABSTRACT))`

    * `val socket = videoServer!!.accept()` then use `socket.inputStream` and maintain the existing NAL parsing and forwarding.

    * Optional dummy: read 1 byte and check if `!= 0 && isPrintable`; if so, push it back by buffering, else treat as dummy. Alternatively, read into a small buffer and detect dummy presence by expected header size.

  * Rename `forwardSocket(name, channel)` → `listenSocket(name, channel)` using `LocalServerSocket` and `accept()`.

  * In `start(bitrate)`: launch both listeners first, then start scrcpy-server process. Add a tiny delay or a latch to ensure listeners are bound before starting the process.

  * In `stop()`: cancel jobs, close `videoServer` and `controlServer`, destroy `process`.

* No manifest changes required; current permissions are sufficient.

**Verification Plan**

* Build and install APK.

* Ensure `scrcpy-server-v3.3.3` exists at `/data/local/tmp/` (already checked in code `ScrcpyBridge.kt:31-37`).

* Run app; tap “Start scrcpy” (`MainActivity.kt:66`).

* Observe logs:

  * Expect `[server] INFO: Device: …` followed by successful connection (no “No such file or directory”).

  * App status messages over WebSocket will include retries/accepts and video/control byte counters increasing.

* Logcat commands (examples):

  * `adb logcat -s scrcpy` to view server logs.

  * `adb logcat | grep -E "Remote Control|scrcpy|LocalSocket"` for combined app/server context.

* If the server connects but no video yet, counters should still rise for control or at least accept without errors. Video decoding is not required now; we only forward raw H.264.

**Risks & Mitigations**

* Handshake differences (dummy byte): Implement tolerant parsing so either mode works.

* Socket name mismatch: Use exactly `"scrcpy"` and `"scrcpy-control"` in ABSTRACT namespace.

* Timing race: Start listeners before server; add a short barrier to ensure names registered.

**Deliverables**

* Updated `ScrcpyBridge.kt` implementing `LocalServerSocket` listeners and lifecycle.

* Report summarizing fixes and a checklist of corrected issues.

* Instructions to validate on-device and via WebSocket counters.

