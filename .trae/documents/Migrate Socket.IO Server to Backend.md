## Goals

* Build a single, polished device page that works for both streaming modes (fMP4/MediaSource and WebCodecs).

* Perfectly fit mobile screens (safe areas, orientation changes, dynamic viewport) and keep desktop layout clean.

* Provide intuitive controls to fully operate the phone.

* Add a one-tap Screenshot button.

## Current State

* Two separate EJS viewers with inline styles: `backend/views/viewer.ejs` and `backend/views/webcodecs_viewer.ejs`.

* WebSocket transport only; no WebRTC. Controls (touch/keyboard) are basic.

* No shared layout/CSS, no screenshot functionality.

## Key Changes

* Shared layout: introduce `views/partials/controls.ejs` and `views/partials/layout.ejs` used by both viewers.

* Styles: move to `public/css/viewer.css` with CSS variables, mobile-first responsive rules, safe-area support via `env(safe-area-inset-*)`, and dynamic viewport units (`dvh`).

* Canvas/view sizing: full-bleed canvas area that respects aspect ratio, uses `contain` scaling, and switches layouts on orientation changes.

* Controls toolbar (top, collapsible on mobile):

  * Navigation: `Back`, `Home`, `Recents`

  * System: `Power`, `Volume +/−`, `Rotate`

  * View: `Fullscreen`, `Fit`, `Mode` (toggle fMP4/WebCodecs), `Quality` (resolution selector)

  * Input: `Keyboard` toggle

  * Capture: `Screenshot` button

* Gestures and input:

  * Unify to Pointer Events with passive listeners

  * Tap/double tap, long press, swipe

  * Multi-touch when protocol supports; fallback to single pointer

* Status overlays: connection state, fps, decode latency, bitrate, dropped frames; compact on mobile.

* Robustness: reconnect with backoff, resume after visibility change, throttle resize.

## Screenshot Implementation

* Client-side capture (no server dependency):

  * WebCodecs viewer: use the existing render canvas; on `Screenshot`, call `canvas.toBlob('image/png')` and trigger a download with timestamped filename.

  * fMP4 viewer: draw the `<video>` frame to the render canvas immediately before capture; then use `canvas.toBlob` as above.

  * Optional: add “Copy to clipboard” using `navigator.clipboard.write` with `new ClipboardItem({ 'image/png': blob })` when available.

* Optional server route (future): `POST /device/:id/screenshot` to store on server; not required for first iteration.

## Technical Implementation (Files)

* `backend/server.js`: serve static `public/`; no protocol changes.

* `backend/views/partials/layout.ejs`: base HTML shell, meta viewport, header/footer.

* `backend/views/partials/controls.ejs`: toolbar markup reused in both viewers.

* `backend/views/viewer.ejs`: refactor to shared layout, wire controls and screenshot; ensure video→canvas capture path.

* `backend/views/webcodecs_viewer.ejs`: refactor to shared layout, wire controls and screenshot; capture from render canvas.

* `public/css/viewer.css`: responsive styles, CSS variables, safe areas, orientation breakpoints.

* `public/js/controls.js`: common handlers (fullscreen, rotate, keyboard toggle, quality/mode switch, screenshot).

## Mobile Fit Details

* Use `meta viewport` with `viewport-fit=cover`.

* Size main area with `height: 100dvh` and padding from `env(safe-area-inset-*)`.

* Prevent zoom-induced layout shifts; large touch targets (44–48px) and sticky toolbar.

* Hide non-essential controls behind a single “⋯” menu on phones.

## Acceptance Criteria

* Canvas fits 100% of the available viewport in both orientations without overflow or scroll.

* All controls reachable and readable on small screens; toolbar collapses appropriately.

* Screenshot saves the current frame as PNG locally within 200ms.

* Latency remains unchanged; fps overlay visible and accurate.

## Rollout

1. Extract shared layout and styles; update both viewers to new structure.
2. Implement toolbar controls and screenshot; test on mobile (Android Chrome) and desktop.
3. Add overlays/performance/reconnect handling.
4. Cross-device QA: small/large phones, tablets, and desktop; adjust breakpoints.

## Notes

* Keeps transport and existing control protocol untouched.

* Avoids heavy frameworks; stays within EJS/static assets already in the repo.

