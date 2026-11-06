I have identified the issue. The Web UI is currently sending control commands (clicks, key presses) as **JSON strings**, which the Android daemon handles by executing slow shell commands (`input tap x y`). This explains why you see the input in logs but the control feels unresponsive or broken (shell commands are very slow and resource-intensive).

To fix this, I will update the Web UI to send **binary Scrcpy control packets**. This allows the `scrcpy-server` running on the device to handle input directly, which is extremely fast and accurate.

### Plan:
1.  **Update `backend/views/webcodecs_viewer.ejs`**:
    *   Replace the JSON `click` handler with `mousedown`, `mousemove`, and `mouseup` handlers.
    *   Implement a `sendTouch` function that constructs the Scrcpy v2 binary packet (32 bytes) containing coordinates, pressure, and button state.
    *   Update the `keydown` handler to send Scrcpy binary key packets.

2.  **Update `backend/views/viewer.ejs`**:
    *   Apply the same changes to the standard viewer for consistency.

This change requires no modifications to the backend or the Android app, as they are already set up to forward binary data correctly.
