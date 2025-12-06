**Symptoms**
- Repeated "decoder not configured yet" indicates the viewer never detects a key frame (IDR) alongside SPS/PPS, so the decoder remains unconfigured.
- "Cannot call decode on a closed codec" suggests the `VideoDecoder` was closed but we keep decoding, or it was never properly re-initialized after reset.

**Root Causes**
- NAL splitting bug: the current `splitAnnexB()` misses the final NAL in a chunk when there is no subsequent start code, so IDR at the end of a packet can be dropped.
- Decoder lifecycle: on reset or error, the decoder can be closed; we do not recreate it or guard decode calls.
- Configuration gating: we only configure when a key frame appears, which is fine, but we attempt to decode immediately without ensuring we start on an IDR. We need a small backlog until the first key.

**Planned Fixes (viewer.ejs)**
1) Correct NAL splitting
- Rewrite `splitAnnexB(buf)` to:
  - Iterate all start codes and push the slice up to the next start code; if there is no next start code, push until `buf.length`.
  - This guarantees the last NAL (often the IDR) is included.

2) Robust decoder lifecycle
- Introduce `ensureDecoder()` that:
  - Creates `window._decoder` if null or state is closed, with `output` and `error` handlers.
  - On error or closed codec, recreate the decoder and reconfigure if SPS/PPS are known.
- In `resetPlayer()`, explicitly close and null out `window._decoder` to prevent stale closed instances.

3) Configure and decode sequencing
- Maintain `window._pendingNals` (small FIFO) to hold incoming NALs until configured.
- Configure decoder as soon as SPS+PPS are available (do not require they be in the same chunk), but only begin decoding when the first IDR arrives.
- When IDR is seen, flush a startup set that includes SPS, PPS, and that IDR packaged as AVCC; after this, continue decoding normally.

4) Keep correct aspect ratio
- Continue using SPS-derived dimensions to set `canvas.style.aspectRatio` and `resizeCanvas()` once SPS is parsed.

**Validation**
- Start stream in AnnexB mode; verify the viewer logs show "decoder configured" once SPS/PPS are received, and the first decode occurs right after the next IDR.
- Confirm the canvas renders continuously without "closed codec" errors and matches phone aspect.
- If AnnexB is unsupported, fallback to MJPEG still works.

**Files to Update**
- `backend/views/viewer.ejs`: replace `splitAnnexB()` implementation; add `ensureDecoder()`, decoder closure in `resetPlayer()`, pending NAL sequencing, and guarded decode calls; keep current aspect ratio updates from SPS and video metadata.