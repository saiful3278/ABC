I will standardize the start configuration to **480p resolution** and **40 FPS** for both the Web UI and the APK Start button.

### Plan

1.  **Backend (`backend/server.js`)**
    *   Update the default values in both `/device/:id/start` and `/start` (Start All) endpoints.
    *   Change `maxSize` default from `360` to **`480`**.
    *   Change `maxFps` default from `30` to **`40`**.

2.  **Android APK (`Deamon_apk/.../WebSocketService.kt`)**
    *   Update the `ACTION_START` handler (which powers the "Start scrcpy" button).
    *   Replace the default start call `bridge?.start(null, null, null)` with explicit values: **`bridge?.start(8000000, 480, 40)`**.
    *   *Note: I will use 8 Mbps (8000000) for the bitrate to match what the Web UI currently sends.*

This ensures that whether you start the stream from the browser or the device, the quality and performance will be identical.