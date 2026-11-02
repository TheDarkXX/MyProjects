# Worker brief: HyperFrames scene rules

You are writing one HyperFrames scene file. It is rendered by seeking a paused GSAP timeline frame by frame, so anything not driven by that timeline does not appear. Output only the file's source: no fences, no notes. Break any rule below and the file is rejected.

## File shape
- The whole file is one `<template>` holding `<style>`, the markup and one `<script>`.
- The scene root is `<div id="root" data-composition-id="ID" data-width="1080" data-height="1920" data-duration="SECONDS">`. Style it as `#root`. ID and SECONDS come from the task.
- Register the timeline as `window.__timelines = window.__timelines || {}; window.__timelines["ID"] = tl;` after all tweens. Use exactly one `gsap.timeline({ paused: true })`.

## Timed elements
- Every timed element is written in the HTML with `class="clip"`, a stable `id`, `data-start` and `data-duration` in seconds. **Never create clips from script.**
- Per-letter or per-word animation: write every span in the HTML yourself, each with its own `id`. Spans inside one clip are **not** clips: give them no `class="clip"`; animate them by id from the timeline.
- Never tween `display`, `visibility` or `autoAlpha` on a `.clip`; animate a child instead.
- Frame 0 shows the subject already on screen (the thumbnail). Don't fade the whole scene in from empty.

## Motion
- Use only GSAP on the timeline. No `@keyframes`, no CSS `animation`, no CSS `transition`.
- Never put a CSS `transform` on an element that GSAP transforms. Set the start state with `gsap.set` or a `from`/`fromTo` tween.
- Two tweens must not animate the same property of the same element at the same time.
- No `Math.random()` unless it is seeded, no `Date.now()`, no timers, no `repeat: -1`.
- `fromTo` renders its from-values when it is written, not when it starts. Add `immediateRender: false` to every `fromTo` that is not the first tween on its element, and to every `fromTo` that starts after 0 with a visible from-state (`opacity: 1`, a flash, a ring). Otherwise the element shows from frame 0, or an earlier tween's start is overwritten.

## Assets
- **No network URLs**: no Google Fonts `@import`, no CDN images. Fonts come from `@font-face` pointing at `assets/fonts/<file>`. Every path starts with `assets/`.
- Use only the CSS variables you are given for colour, font, radius and easing. Invent no new colours.

## Thai text
- Line breaks only between words. Put an explicit `<br>` where a line breaks.
- Thai display text needs `line-height` ≥ 1.3. Boxes and pills that hold Thai need top padding ≥ 0.18em.
- Never split Thai into single code points. When a split is asked for, the task gives you the exact pieces: use them as written.
- Any element holding Thai uses the Thai font variable, including small labels. The mono label font has no Thai glyphs.

## Layout
- Canvas is 1080×1920. Every word stays between y = 168 px and y = 1330 px, and clear of the right-hand 120 px.
- No text under 28 px.
