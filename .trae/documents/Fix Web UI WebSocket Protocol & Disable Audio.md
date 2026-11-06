I will fix the WebSocket connection issue in the Web UI by making the protocol dynamic (`ws://` vs `wss://`) and ensure the start command disables audio across all views.

### The Problem
1.  **Web UI WebSocket:** `views/viewer.ejs` and `views/webcodecs_viewer.ejs` hardcode the WebSocket protocol to `ws://`. Since your production site is on `https://`, browsers block insecure `ws://` connections. This causes the "Disconnected" status.
2.  **Start Command Consistency:** While `server.js` now forces `audio=false`, the frontend code in `index.ejs` and viewer pages still sends explicit start commands that might override or conflict with defaults if not updated.

### The Fix
1.  **Update `views/viewer.ejs`**:
    *   Change `new WebSocket('ws://' + ...)` to use `(location.protocol === 'https:' ? 'wss://' : 'ws://')`.
    *   Update the `fetch` start command to include `audio: false`.
2.  **Update `views/webcodecs_viewer.ejs`**:
    *   Apply the same WebSocket protocol fix.
    *   Update the start command to `audio: false`.
3.  **Update `views/index.ejs`**:
    *   Update the `start(id)` function to send `audio: false`.

### Files to Change
*   `backend/views/viewer.ejs`
*   `backend/views/webcodecs_viewer.ejs`
*   `backend/views/index.ejs`

This ensures the Web UI connects securely (fixing the "Disconnected" state) and consistently disables audio (preventing server crashes).