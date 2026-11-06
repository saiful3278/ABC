I will fix the Web UI start command to match the APK's connection requirements.

### The Problem
The APK is hardcoded to connect to a specific socket (`scrcpy_00000000`), but the Web UI is instructing the device to start `scrcpy-server` without the `scid=00000000` argument. This causes the server to open a socket with a random name, making it impossible for the APK to connect.

### The Fix
I will update `backend/server.js` to send the exact same command arguments as the APK uses locally.

### File to Change
*   `backend/server.js`

### Changes
Update the command string in `/device/:id/start` and `/start` to include:
*   `--scid=00000000`
*   `--raw_stream=true`
*   `--send-device-meta=false` (and other meta flags)
*   Ensure bitrate/resolution match the 4Mbps/480p/40fps standard.

This guarantees that `scrcpy-server` always opens the `scrcpy_00000000` socket, allowing the APK to connect successfully regardless of which button (Web or App) started the stream.