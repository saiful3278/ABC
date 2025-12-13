I will implement a new WebCodecs-based video player page.

### 1. Backend Updates (`backend/server.js`)
*   **Add Route**: Create `GET /view-webcodecs/:id` to serve the new viewer page.
*   **Add Mode Switching**: Update the WebSocket message handler to support switching the pipeline to `'annexb'` (raw H.264) when requested by the client. This ensures the backend forwards raw NAL units instead of muxing to fMP4.

### 2. Frontend Implementation (`backend/views/webcodecs_viewer.ejs`)
Create a new EJS view that implements the **WebCodecs API** pipeline:
*   **WebSocket Handling**: Connect to the backend and request `annexb` mode.
*   **Stream Parsing**:
    *   Receive raw byte chunks.
    *   Implement a buffer/parser to detect NAL unit boundaries (`0x00000001`) across chunk boundaries.
    *   Extract SPS/PPS configuration data.
*   **VideoDecoder**:
    *   Initialize `VideoDecoder` with error and output callbacks.
    *   Configure the decoder using extracted SPS/PPS (converted to AVCC format).
    *   Feed `EncodedVideoChunk`s (key and delta frames) into the decoder.
    *   Generate synthetic timestamps if missing.
*   **Rendering**:
    *   Use a `<canvas>` element.
    *   Draw decoded `VideoFrame`s using `ctx.drawImage()`.
    *   Manage frame closure to prevent memory leaks.
*   **Robustness**:
    *   Queue frames to ensure smooth playback.
    *   Handle errors (corrupted chunks, decoder resets).

This implementation will exist alongside the current fMP4 viewer, allowing you to test the new WebCodecs approach independently.