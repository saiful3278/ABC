## Problem Summary
- All components show connected/running, but the Web UI still renders a black screen.
- Browser-side H.264 decoding is fragile across environments; WebCodecs may not decode depending on profile/description, and CDN script loads were blocked (ORB), removing the Broadway fallback.
- Fix by moving stream packaging server-side to a standard container (fMP4) and using MSE in the browser.

## Approach Overview
- Keep the APK → Backend transport as raw Annex-B H.264 NALs (already demuxed on device and injecting SPS/PPS before IDR).
- On the backend, spawn an FFmpeg per-device muxer that remuxes Annex-B H.264 to fragmented MP4 (init segment + moof/mdat segments).
- Broadcast init + segments to connected viewers; Web UI appends them via MSE SourceBuffer.
- Derive the proper codec string from SPS (profile/compatibility/level), configure the browser’s SourceBuffer correctly.

## Backend Changes
1) Dependency and process management
- Expect system-wide `ffmpeg` installed and available on PATH.
- For each device (on registration), create a per-device FFmpeg process configured to:
  - Input: raw H.264 from the APK, fed via stdin.
  - Output: fragmented MP4 to stdout with flags `-movflags frag_keyframe+empty_moov+default_base_moof`.
  - Command sketch: `ffmpeg -loglevel error -fflags +nobuffer -i pipe:0 -c copy -movflags frag_keyframe+empty_moov+isml+dash -f mp4 pipe:1`.
2) Segment parsing and broadcasting
- Implement a small MP4 box parser in Node to split stdout into:
  - Init segment: `ftyp` + `moov` (sent once on viewer connect).
  - Media segments: `moof` + `mdat` (sent continuously).
- Maintain per-device state: init segment buffer, segment broadcast set.
- On viewer connect: send init segment immediately, then stream segments.
3) Device lifecycle integration
- Start FFmpeg on device registration; stop on device disconnect.
- Back-pressure: use a small queue writing to FFmpeg stdin; drop if backlog grows to avoid latency.
4) Debugging endpoints
- `/debug`: enrich with `segmentsSent`, `initLen`, `lastSegmentLen`.

## APK Changes (minimal)
- Keep current demux and SPS/PPS injection (already implemented).
- Optionally add resolution reporting to StatusRepository from scrcpy handshake for UI display (width × height).

## Web UI Changes
1) MSE player implementation
- Create `MediaSource` and `SourceBuffer` with `video/mp4; codecs="avc1.<profile><compat><level>"` using backend-provided codec string.
- Append init segment, then append each incoming segment in order; maintain a small buffered window.
2) Viewer protocol
- On `viewer` registration, backend starts sending init + segments; no binary IDR parsing in the browser.
3) Status UI
- Show segment counts and last append time for live feedback.

## Validation Plan
- Start backend, open `/view/<id>`, click Start Stream.
- APK should show scrcpy: running; counters increase.
- Web UI shows video; debug `/debug` shows segments increasing.
- Simulate disconnect/reconnect and ensure FFmpeg processes are cleaned up.

## Risks & Mitigations
- FFmpeg availability: document install requirement; fallback to the existing WebCodecs path if FFmpeg missing.
- Codec string mismatches: parse SPS server-side to compute accurate `avc1` string.
- Latency: use copy remux (`-c copy`), small write buffers, and drop strategy on backlog.

## References
- Scrcpy protocol and sockets (dummy byte, device name, width/height; separate video/control sockets) [1](https://raw.githubusercontent.com/Genymobile/scrcpy/master/doc/develop.md), [4](https://github.com/Genymobile/scrcpy/issues/129).

## Request
- I will implement the above backend packaging, integrate the viewer with MSE, and wire counters and lifecycle. Confirm to proceed, and I’ll deliver the changes and validation in this session.