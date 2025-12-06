**Diagnosis**

* Counters show \~669 KB/s in fMP4 mode, so data reaches the viewer, but the canvas stays black because the hidden `<video>` never advances (no `playing`), or it sits behind the live edge due to unbounded MSE buffering in `backend/views/viewer.ejs`.

* Occasional “screenshot-like” frame appears when enough buffered media accumulates and the browser renders a single frame.

**Targeted Fixes**

1. Make MSE play live

* Use `ArrayBuffer` directly to remove Blob/FileReader latency (`backend/views/viewer.ejs:56–58`).

  * Change `ws.binaryType = 'arraybuffer'` and handle `ev.data` as `Uint8Array`.

* After creating the `SourceBuffer`, set low-latency mode and seek live (`backend/views/viewer.ejs:118–135`):

  * `sourceBuffer.mode = 'sequence'`.

  * In `updateend`:

    * Dequeue queued segments immediately.

    * If `sourceBuffer.buffered.length`, compute `end = buffered.end(last)` and:

      * Remove old ranges: `sourceBuffer.remove(0, Math.max(0, end - 5))`.

      * Ensure live edge: set `videoEl.currentTime = end - 0.1` if behind.

  * Call `videoEl.play()` after appends even if already requested.

* Start rendering without waiting for `playing`:

  * Call `renderFromVideo()` right after init append; keep RAF running and draw each frame.

* Auto-fallback if fMP4 doesn’t start quickly:

  * If no `playing` within 3 seconds after init, request `annexb` (\`ws.send({type:'mode',mode:'ann

