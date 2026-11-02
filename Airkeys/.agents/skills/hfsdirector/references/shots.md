# Shot vocabulary

> **TL;DR:** Each named move below gives what the viewer sees, when to use it, the registry items to try first (`node tools/motion-pick.js "<query>" --job <job-id>`), and how to hand-build it when nothing fits. Names are the director's vocabulary: write them in the `BEATS.md` shot column.

<a id="toc"></a>
**Groups:** [Type (Jobs: hook-type, claim-type)](#type) · [Cards & UI (Jobs: ui-card, ui-overload)](#ui) · [Devices & 3D (Job: device-3d)](#devices) · [Data (Jobs: number, chart)](#data) · [Talking head (Job: caption)](#th) · [Transitions (Job: transition)](#transitions) · [Backgrounds (Jobs: background, texture)](#bg) · [Close (Job: cta-social)](#close)

---

<a id="type"></a>
## Type `[Jobs: hook-type | claim-type]`

**kinetic-build** `[Job: hook-type]`: A headline builds word by word on the beat. Each new word pushes the line, and the last word lands in the accent ("ไฟล์" → "ไฟล์เดียว"). Use it for the hook and any claim beat.
- Registry: `per-word-rise`, `staggered-fade-up`, `headline-slam`, `type-match-cut`.
- Hand-build: split by word (Thai: `Intl.Segmenter` word), y 40 → 0, blur 8 → 0 px, 0.18 s per word, `power3.out`.

**small-big-small**: A tiny lead-in word, one huge word, then a small tail line ("ทำ / คลิป / แบบที่คุณดูอยู่"). The huge word carries the beat. Use it to open a reveal.
- Hand-build: the big word at 220–300 px weight 800; the small lines at 36–44 px, 40% opacity. Drift the big word's scale 1.0 → 1.04 over the hold.

**negation-hit**: "ไม่ใช่" alone, then "ไม่ใช่ คลิป AI" with the key term in the warning colour on black. Use it for a myth beat or a pattern interrupt.
- Registry: `strikethrough-replace`, `caret-swap`.

**blur-resolve**: A word or line resolves out of heavy blur, the way a lens focuses. Use it for a calm reveal or a question.
- Registry: `focus-blur-resolve`, `blur-in`.

**credits-roll**: A film-credits card ("FINAL CUT · CREDITS / ผู้กำกับ SKILL.md / คนเขียนบท SKILL.md …") with wide-tracked caps and roles filling in one by one. Use it for "one tool did every job" punchlines. Not in the registry, so hand-build: a mono label with letter-spacing 0.4em; a role column at 40% opacity and a name column in white, each row 0.35 s apart.

**dot-number**: A big number built out of glass balls or dots that fly into place ("200"). Use it for a scarcity or count beat.
- Registry: `particle-text-dissolve` (assemble mode), `code-particle-assemble`.
- Hand-build: render the number to an offscreen canvas, sample points on a grid, tween each dot from a seeded random start.

<a id="ui"></a>
## Cards & UI

**glass-float-card**: A frosted card floating in perspective (rotateX 8–14°, rotateY −10°) over a soft background, drifting and tilting slowly. It carries a file, a product or a claim. This is the core of the "premium" look.
- Registry: `glass-hero`, `liquid-glass-widgets`, `split-tilt-cards`.
- Hand-build: `backdrop-filter: blur(24px)`; background `rgba(255,255,255,.55)` (light) or `rgba(20,20,26,.6)` (dark); a 1 px inner border; a big soft shadow (0 40px 80px −20px). Tween rotateY ±4° and y ±10 px over the hold.

**typed-prompt**: A chat or input box where a request types itself character by character (grapheme by grapheme for Thai). An attachment chip sits above it, and the camera tilts and pushes in as it types. Use it to show the instruction before a demo.
- Registry: `typed-prompt`, `ai-chat-reveal`, `claude-exchange` (retoken it and remove the brand).
- Hand-build: 45–70 ms per grapheme with a jittered rhythm from a seeded random; a blinking caret on a `steps` tween; then a send-button press.

**notification-pile**: Message cards land and stack in 3D, each tilted a little differently, with "urgent" and "3 days late" badges. It shows overload. Pair it with a one-word caption ("เสียเวลา").
- Registry: `notification-cascade`, `notification-stack`, `notification-pileup`, `overwhelm-surround`.

**command-bar**: One search or command bar types an instruction, and the pile resolves into order (a schedule list or a summary card). This is the problem → fix pivot.
- Hand-build: on send, the cards fly out (stagger 0.04 s) and the result list staggers in.

**social-proof-card**: A profile card with a follow button that gets pressed, a comment typing the CTA keyword, or a DM toast arriving. Use it for the CTA and for social proof.
- Registry: `tiktok-follow`, `instagram-follow`, `x-follow-card`, `yt-comment-card`, `message-thread-reveal` (make them generic).

**comment-sheet**: A bottom-sheet comment list slides up over the speaker, the viewer's own comment ("director") appears, then a reply or DM arrives. Use it for a lead-magnet CTA in talking-head clips. Hand-build it over the footage, and keep the speaker's face above the sheet.

**live-hud**: A persistent top panel shows the agent's task list. Items tick off with a check, and a step counter ("ขั้นที่ 7/15") rolls up. Use it for any "AI did this" or "watch the process" clip; it can stay up for the whole clip.
- Registry: `telemetry-hud`, `marker-checklist-card` (restyle).
- Hand-build: a 3-row window that scrolls up as items complete; the counter is a `slot-machine-roll` or `number-wheel`; a status dot shows "listening / working".

**cursor-press**: A glass-bubble cursor travels to a button and presses it (ripple). It gives any UI beat a "someone is using this" feel.
- Registry: `agent-cursor`, `press-ripple`, `touch-indicator`, `cursor-zoom-follow`.

<a id="devices"></a>
## Devices & 3D

**device-insert**: A phone or laptop shows the real screen (app, ad, dashboard) at an angle, with the camera orbiting slightly. Use it for app demos and "here is the result" beats.
- Registry: `vfx-iphone-device` (real GLTF iPhone and MacBook with live HTML screens), `device-frame-stage`, `multi-device-splay`, `browser-device-stage`, `parallax-device-dive`, `app-showcase`.

**device-in-scene**: The phone sits on a real table in footage, or floats in a real room. Use a stock or own plate as the background, the device on top, matching blur and light. With a speaker, the device goes behind the head (see talking head).

**product-hero**: A real product (ring, bottle, box) turns slowly under a rim light against black, then a glowing outline or logo lockup follows. Use the product's own images or a 3D model; never draw a fake product.
- Registry: `extruded-logo` (for the lockup), `rack-focus`.

**exploded-stack**: The layers of a product or an app UI separate in Z and then collapse back. Use it for "what's inside" beats.
- Registry: `exploded-stack`.

<a id="data"></a>
## Data

**ring-gauge**: A circular gauge fills to a value; the number counts up and the label changes state ("43%" → "94% พร้อมเต็มที่"). Use it for health, finance or progress.
- Registry: `conic-progress-ring`, `mk-progress-stat`.

**digital-readout**: A seven-segment or big mono time or number on dark (7:00, 6:44 ชม.) with a small bar chart under it. Use it for time, sleep or speed.
- Registry: `number-wheel`, `slot-machine-roll`, `count-up`.

**bento-tilt**: A dashboard of 4–6 metric tiles in 3D tilt, with the camera gliding across it. Use it for "everything at once" beats.
- Registry: `split-tilt-cards`. In VVE, `hfs_kit` `bento-grid`/`clinical-stat-bento` restyled with a CSS 3D wrapper.

**chart-story**: A line or bar chart draws on, with one annotated point. Use it for finance, news and evidence.
- Registry: `chart-story`, `data-chart`, `animated-bar-chart`, `decline-chart`, `bar-chart-race`.

<a id="th"></a>
## Talking head

All of these need the speaker cutout (`npx hyperframes remove-background`). Stack: footage → behind-layer → cutout → captions.

**word-behind-head**: A giant word (180–300 px) sits behind the speaker, 30–55% covered. Use it on the strongest word of a line ("ทะลุ").
- Registry: `caption-parallax-layers`, `mk-emphasis-type`.

**object-behind-head**: A laptop, phone or 3D object floats behind the speaker in the room, opening or turning as they talk about it. Fake depth by matching blur and light to the room.

**countdown-behind**: Huge 3 → 2 → 1 numbers behind the speaker, each with an impact.

**split-compare**: Two frames side by side ("ยังไม่ตัด" left and smaller, "ตัดแล้ว" right, larger and glowing) on a dark stage. Use it to show a before and after of the same footage.
- Registry: `comparison-split`, `before-after-wipe`.

**punch-in**: 1.0 → 1.12 on an emphasis word, released on the next sentence. Pair it with a caption keyword colour.
- Registry: `push-in`, `camera-shake` (sparingly).

**pip-shrink**: The speaker shrinks to a rounded PiP so a full-frame graphic can take over, then grows back.

<a id="transitions"></a>
## Transitions

Use only the ones that carry energy. A hard cut on the action is the default.

| Move | Use | Registry |
| --- | --- | --- |
| whip | energy between beats; SFX whoosh | `whip-pan`, `whip-pan-cut`, `motion-blur` |
| halftone / dither | texture switch, "something's off" | `halftone-dissolve`, `ordered-dither-pass` |
| zoom-through | dive into a screen or a word | `cinematic-zoom`, `parallax-zoom` |
| match-cut | same shape across two scenes | `match-cut`, `text-match-cut`, `type-match-cut` |
| flash | impact moment, beat drop | `flash-through-white`, `beat-accent`, `editorial-flash-overlay` |
| glitch | error, myth busted | `glitch`, `rgb-glitch-text` |
| blur-through | calm section change | `transitions-blur` |

<a id="bg"></a>
## Backgrounds

| Background | Feel | Registry |
| --- | --- | --- |
| sky & clouds plate | optimistic, "Apple keynote" | stock or generated plate + `drift-hold` |
| soft mesh gradient | clean SaaS, light | `mesh-gradient`, `aurora-drift` |
| liquid chrome | premium dark tech | `liquid-metal`, `vfx-liquid-background` |
| pure black + one glow | cinematic product | hand-build radial gradient |
| grain over anything | film texture | `grain-overlay` |

<a id="close"></a>
## Close

**cta-keyword**: "อยากได้? คอมเมนต์ 'X'". The keyword sits in the accent inside quotes, a comment box types the keyword, and the send button is pressed by `cursor-press`. Use it with a scarcity beat (`dot-number`) and a "free → paid" flip.

**endcard**: An avatar with a ring, the handle, a pill CTA and one small line of terms. It holds for ≥ 1.5 s.
- Registry: `logo-brand-close`, `titlecard-lockup`.

**loop-back**: The last frame matches the first, so the replay seamlessly re-hooks. This is a choice, not a default.

[⬆ Groups](#toc)
