**1. Fix Socket Race Condition & Zombie Conflicts in** **`Deamon_apk`**

* **Issue**: `scrcpy` process starts *before* the `LocalServerSocket` is created, leading to connection failure. Also, reusing `scrcpy_00000000` causes conflicts with zombie processes.

* **Fix**:

  * Move `LocalServerSocket` creation to be synchronous before the background accept loop.

  * Generate a unique `scid` (Random 8-char hex) for each session to ensure a clean connection path.

  * Pass this unique `scid` to the `scrcpy` server command.

**2. Simplify Video Streaming (Fix "0 pkts")**

* **Issue**: The current NAL parsing logic in `handleVideo` is fragile (fails on 3-byte start codes or fragmented reads) and unnecessary since the backend's `ffmpeg` can handle the raw stream. This causes the "0 pkts" issue because the parser never finds a valid packet to send.

* **Fix**:

  * Remove the complex `findStartCode` / `processNal` logic.

  * Implement a direct "Passthrough" mode: Read bytes from `videoSocket` -> Wrap in envelope -> Send to Backend.

  * This ensures all data sent by `scrcpy` reaches the backend immediately.

**3. Implementation Steps**

* **Edit** **`ScrcpyBridge.kt`**:

  * Generate dynamic `SCID`.

  * Refactor `startListener()` to create the socket first.

  * Rewrite `handleVideo()` to simple read-and-forward loop.

  * Add debug logging for the first bytes received to confirm data flow.

**4. Verification**

* Restart the session.

* Check if "Video: X pkts" starts incrementing immediately.

* Verify video stream in Web/APK UI.

