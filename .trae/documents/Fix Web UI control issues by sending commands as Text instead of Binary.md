**Fix WebSocket Disconnection Crashing the Stream**

* **Issue**: When the WebSocket disconnects (e.g., network fluctuation), `ws.send()` throws an `IOException` (errno 108). This exception propagates to `handleVideo` in `ScrcpyBridge`, causing the video reading loop to crash and exit. Once `handleVideo` exits, the APK stops reading from `scrcpy`, causing `scrcpy`'s buffer to fill up and eventually crash with "transport endpoint shutdown".

* **Fix**:

  1. **Safeguard** **`handleVideo`**: Wrap the `sendToBackend` call inside a `try-catch` block. If sending fails (due to WebSocket issues), catch the exception, log it (debug level), and **continue reading** from `scrcpy`. This ensures we keep draining the video socket so `scrcpy` stays alive.
  2. **Safeguard** **`handleControl`**: Apply the same protection to the control socket loop.
  3. **Safeguard** **`WebSocketService`**: Update the `sendToBackend` lambda to also catch and ignore exceptions, as a double layer of defense.

* **Outcome**: If the WebSocket drops, the APK will keep reading video data (and discarding it or failing to send). When the WebSocket reconnects (handled by `WebSocketService`), the `ws` reference updates, and `sendToBackend` will successfully send data again, resuming the stream without requiring a restart.

**Implementation Steps**

1. Edit `WebSocketService.kt`: Wrap `ws.send` in `try-catch`.
2. Edit `ScrcpyBridge.kt`: Wrap `sendToBackend` calls in `handleVideo` and `handleControl` in `try-catch`.

