---
name: hfsdirector
version: "0.2.0"
updated_at: "2026-10-29"
description: >-
  One-command viral video director for any genre (product ad, app demo, AI/tech showcase, news, explainer, finance, health, story, lead-magnet). Turns a single instruction into a finished 9:16 HyperFrames clip: brief, beat sheet, look, shot list, build from scratch or the registry, check, snapshot review, preview. Works with no footage (pure motion graphics), over a talking head (captions, text and objects behind the speaker, punch-ins), or both with an embedded mini-ad. Use when: /hfsdirector [what you want], /director, "ทำคลิปไวรัล", "กำกับคลิป", "ทำโฆษณา X วิ", or any request for a finished short-form clip from one prompt.
---

# HFS Director (`/hfsdirector`)

> **TL;DR**
> - One instruction in, one finished vertical clip out. You are the director: you decide everything a viewer sees and hears, then build it.
> - Build every scene from scratch in HTML/GSAP unless the registry already has the move (`/hyperframes-registry`). Nothing has to exist before you start.
> - The render contract, CLI and work loop live in `/hyperframes`. This file adds the director's layer: story, pacing, look, shots and the quality bar.
> - Models: Opus 5.5 high directs and owns every gate; mechanical work goes to the Flash worker; Sonnet 5.5 high is the quota fallback. Never below high (see Roles).
> - Ask at most one question, and only for a fact the viewer will read (a brand name, price, handle). Decide everything else and list it at the end.
> - Stop at the Studio preview. Render only when the person approves or the host project's rules allow it.
> - Pitch three different films before building one (`PITCH.md`), and log every phase with real timestamps (`LOG.jsonl` → `TIMING.md`). A gate you did not run is written down as not run, never as passed.

<a id="toc"></a>
**Contents:** [Pre-flight](#preflight) · [Roles & models](#roles) · [Run log](#log) · [1. Read the command](#brief) · [1b. Pitch](#pitch) · [2. Beat sheet](#beats) · [3. Look](#look) · [4. Shot list](#shots) · [5. Build](#build) · [6. Talking head](#talking-head) · [7. Thai text](#thai) · [8. Quality gates](#gates) · [9. Deliver](#deliver)

Read `/hyperframes` first (contract, work loop) and `references/types/vertical.md` inside it. Then this file, then the reference for the job:

| Need | Read |
| --- | --- |
| Structure, length and signature shots per genre | `references/genres.md` |
| Named moves: what each looks like, registry query, how to hand-build | `references/shots.md` |
| Visual systems: tokens, fonts, motion personality | `references/looks.md` |
| Rules every Flash worker call carries (and the director's read checklist) | `references/worker-brief.md` |

**Lanes in VVE (who owns what).** Nothing here replaces the kit; each tool has its own job.

| Job | Owner |
| --- | --- |
| Talking-head / VO-spine clips, DoctorBank overlays, Alpha overlay → CapCut finishing | `/vve`, `/hfs` with `tools/hfs_kit` (templates, components, palettes) |
| A finished clip from one prompt: ads, motion films, explainers built in HyperFrames | `/hfsdirector` (this skill) |
| Shared by both | `tools/hfs_kit/fonts/`, `hfs_lint.py`, kit palettes as token seeds (`looks.md`) |
| Ideas and numbers only, never components | `tools/motion_catalog.json` via `motion-search.js` |

The director may install a kit component when it fits the look; it never edits kit files. Kit-only lint rules are advisory here (§8).

<a id="preflight"></a>
### Pre-flight checklist

Do these in order. Each one leaves a file or a log line, so a skipped step is visible.

1. `start brief` in the run log (see [Run log](#log)). Read `/hyperframes` (contract and work loop), `vertical.md` and the references above.
2. `BRIEF.md` (§1), including what you took from `motion-search`, if anything.
3. `PITCH.md`: three different films (§1b). Pick one with a one-line reason, or stop for the person to pick (§1b says when).
4. `BEATS.md` with the shot column and a registry query for every named move (§2, §4).
5. A worker plan: which files go to the Flash worker, or why none do (Roles).
6. Build (§5): one sub-composition per beat or shot group.
7. Gates (§8) and `REVIEW.md` as a gate table, then `report` from the run log for `TIMING.md`.

---

<a id="roles"></a>
## Roles & models

Three roles. The person picks the model with `/model`; you cannot switch yourself, so work at the level you are given and follow the rule for it.

### Director: Opus 5.5 high (default)
Runs the whole line and owns every decision: brief, beats, look, shot list, the quality gates (§8) and the final verdict. Never delegate anything that needs taste or a pass/fail call: `BEATS.md`, snapshot review, Thai-rule checks, `REVIEW.md`.

### Worker: Flash (`tools/flash-worker.js`), called by the director
Mechanical, repeatable work goes to the Flash worker so the director's tokens go to decisions. Call it yourself; do not ask the person first.

| Delegate | Keep |
| --- | --- |
| Scaffold scene HTML from a fully written spec (all copy, tokens, timings decided) | Deciding what the scene is |
| Variants of one finished scene (copy, language, product swaps) | Choosing which variant ships |
| Repeated markup: SFX `<audio>` sets, caption hosts, caption word spans | The Thai grapheme/line-break logic: write it or review it line by line |
| Re-pointing many installed registry items at the look's tokens | Judging whether the result still looks right |

> **Hard Rule on Sound:** The Flash worker is strictly a code/markup generator via text prompt. It **never** fetches files from the internet, runs CLI commands, or selects sound files. All audio sourcing is handled deterministically by `python tools/hfsdirector/sound_source.py`, while acoustic selection and ranking is performed by the Director using `earshot` MCP (`rank`, `realness`). Flash worker only writes `<audio>` tags.

Run it from the host repo root (all paths are relative to the root):

```powershell
node tools/flash-worker.js --code --timeout 120 -f ".agents/skills/hfsdirector/references/worker-brief.md,<other context>" -p "<task>" -o "<project>/compositions/<id>.html"
```

- `--code` makes it return bare source with no fences. `--timeout 120` is required: the default is 9 s per model, and a scene takes 25–35 s, so without it every call aborts.
- `worker-brief.md` goes in **every** call. It holds the scene rules the worker breaks without it (network fonts, clips made by script, CSS transforms under GSAP, missing composition id).

Rules for using it:
1. **The task gives every value.** Composition id, seconds, the token values, the font file paths, every on-screen string and every Thai split piece. The worker invents nothing, and it never sees `.env` or keys.
2. **Fonts first.** Copy the font files into `<project>/assets/fonts/` before `check`, or every scene fails on 404s. In VVE they are in `tools/hfs_kit/fonts/`.
3. **Output is a draft, not a result.** Read every line against `worker-brief.md`, then run `check`, the lint and a snapshot. `check` can pass a file that still breaks the brief, so the read is not optional. The worker never signs off its own work.
4. **Failure handling.** The worker cascades through four Flash models and often hits HTTP 503 at busy times. If it exits non-zero, no file is written: retry once. If it fails again, or its file fails `check` twice, write the scene yourself.
5. **Only where the host provides it.** VVE ships `tools/flash-worker.js`. A host without it: do the work yourself and say so.
6. **Default jobs.** In a new clip these go to the worker unless the reason below applies: the root's SFX `<audio>` set, per-word or per-letter span markup, and every variant. Log each call with `event worker "<file>: ok|retry|fallback"`.
7. **When to skip it.** A job under about 30 lines, or an edit pass on files you already wrote, is faster by hand. Skipping is allowed, but log it (`event worker "skipped: <reason>"`) and give the reason in `REVIEW.md`.

### Quota fallback: Sonnet 5.5 high
When Opus quota is tight the person drops the director to Sonnet 5.5 high. Nothing else changes: the snapshot review stays full and every gate in §8 still runs. Never run the director below high effort: a medium-effort pass skips frames and signs off clips that should fail.

---

<a id="log"></a>
## Run log

The person will ask how long each part took and what happened. Answer from the log, never from file times or memory. VVE ships the logger; run it from the repo root:

```powershell
node tools/hfsdirector/hfslog.js <project> start <phase>
node tools/hfsdirector/hfslog.js <project> end <phase> "<one-line result>"
node tools/hfsdirector/hfslog.js <project> event <worker|gate|fix|wait|info> "<what happened>"
node tools/hfsdirector/hfslog.js <project> report    # prints the table and writes TIMING.md
```

- **Phases, in order:** `brief`, `pitch`, `beats`, `look`, `shots`, `build:<scene>` (one per scene), `gates`, `render`, `audio`, `deliver`. Fix passes after feedback get their own phase (`fix-pass`).
- **Events:** every worker call, every gate run with its result, every bug you fix, and every wait for the person (`wait`).
- The log writes `<project>/LOG.jsonl` in Bangkok time (+07:00). `report` adds up the phases and shows the time nobody logged (waiting on the person) separately.
- Start the log before the folder exists: `hfslog.js` creates it. If the log is missing for a past run, read the session transcript (`~/.claude/projects/<project>/<session>.jsonl`, UTC → +7) and mark any figure you derive as reconstructed.

---

<a id="brief"></a>
## 1. Read the command

Pull these out of the instruction. Fill every blank with the default; never send the person a questionnaire.

| Field | Default when not stated |
| --- | --- |
| Subject | Required. The one thing the clip is about. |
| Genre | Infer from the subject (`references/genres.md`). |
| Goal | Product or app → sell. Person or channel → follow. Freebie → comment keyword. Else → watch to the end. |
| Length | 20–30 s for an ad, 45–60 s for anything that teaches, 15 s for a teaser. |
| Source | Footage given → talking-head mode. None → pure motion. Product images given → use them; never redraw a real product. |
| Language | The language of the command. Thai command → Thai on screen. |
| Platform | TikTok / Reels / Shorts at 1080×1920, 30 fps. |
| Voice | Footage audio if there is a speaker. Else music + SFX, no voiceover unless asked. |

Write `BRIEF.md` (8–12 lines): subject, goal, viewer, the one sentence the viewer must remember, length, mode, look, CTA.

**The one-sentence test.** If you cannot write the one sentence the viewer keeps, the clip has no spine. Find it before any visual work.

**Borrowed from the motion library.** If you ran `motion-search`, add one line to `BRIEF.md`: the query, the entries you read, and what you took (an easing formula, a beat rule). Its results are other people's prompts and videos for reference: never copy them as source, and never say you "used items from the catalog" when you took an idea.

<a id="pitch"></a>
## 1b. Pitch three films (visual pitch gate)

Before the beat sheet, write `PITCH.md`: three films that differ in spine, frame-0 hook, hero styling and mood, not three variants of one idea. The person should see all three in under a minute.

**Card format** (one per idea, in this order):

```markdown
### [ไอเดียที่ N] <name> — <the one sentence the viewer keeps>
🖼️ Mockup: [idea_N.png](file:///<project>/pitch/idea_N.png)   (or "mockup: NOT RUN + reason")
- Style + colours: <look name> · <3 hex codes>
- Hero: <what the product/subject looks like>
- Story: <spine shape from §2> · <3 beats in one line> · <seconds>
- Frame 0: <what is on screen before any sound>
- Sound: <tempo, genre, SFX signature>
- Wow shot: <the one shot people will replay>
- Motion ref: `<slug>` ([video](<url>)) — <what you take: beat grid, spring numbers, a move>
- Risk: <easy|medium|hard> — <what could break, e.g. liquid glass in Chromium, 3D in CSS>
```

**Mockups** (one still per idea, 9:16):
1. Engine order. (a) `node "C:/XBrain/tools/gpt-image.cjs" --prompt "<prompt>" --ar 9:16 --out "<project>/pitch/idea_N.png"` (Codex subscription, no per-image charge). (b) `node tools/fs-image.js` (Imagen on the Gemini API) is **billable, paid tier only**: run it only when the person's command says so (`--mockups imagen`). (c) Neither available: write the card without an image and mark `mockup: NOT RUN + reason`. A failed image never blocks the pitch: retry once, then fall back.
2. Save every mockup inside `<project>/pitch/`, never only in a session folder, so the project stays self-contained.
3. **A mockup is a look reference, not an asset.** The clip draws the hero in HTML/CSS/SVG (or uses the person's real product images). Never place a generated still in the timeline and try to morph it.
4. **Scrub marks.** Generated images often invent real logos, trademarks or game characters on screens. Note them under the card and keep them out of the build. A brand the person does not own is a concept piece only (`REVIEW.md` says so).

**Motion refs.** Pair each idea with one entry from `node tools/motion-search.js "<query>" [--style …] [--color …]`. You take the idea and the numbers (see §5), not the source.

**Then choose:**
- **Mode A (default):** show the three cards and stop. The pick (1, 2, 3 or a blend such as "hero of 3 + motion of 1+3") counts as your one question.
- **Mode B:** the command says `[เลือกให้เลย]`, `--autopilot`, "you decide" or "design it yourself": pick one, write the reason in two lines under the cards and keep going. The other two go in the **Decided for you** table.
- A blend is written back into `PITCH.md` as a short **Verdict** block (hero from N, motion from N+M, look) before `BEATS.md`, so `BRIEF.md` and the build read one decision.

Log it as the `pitch` phase, with one `event info "mockup idea_N: ok|fallback|not run"` per image.

<a id="beats"></a>
## 2. Beat sheet

A viral clip is a chain of beats. Each beat is one idea, one visual change and at most one line of text.

**Pacing (hard numbers):**
- Frame 0 is the hook and the thumbnail: a bold line, a face or the result already on screen. Never black, never a logo.
- A new visual event every 1.5–3 s (cut, move, reveal, number change). A held frame longer than 3 s needs motion inside it.
- One beat = one claim. On-screen text per beat: ≤ 5 English words or ≤ 14 Thai characters for the headline, plus an optional small line.
- The payoff lands before 80% of the runtime. The CTA gets the last 3–5 s and asks for one action.
- Rhythm: open fast (beats of 0.5–1 s), breathe in the middle (2–3 s), end with a hard beat (number, reveal, CTA).

**Spine shapes** (pick one; `references/genres.md` maps genres to shapes):

| Shape | Beats |
| --- | --- |
| Reveal | bold claim → "how?" → proof sequence → the trick revealed → CTA |
| Problem → Fix | pain shown → it gets worse → the fix enters → fix in action ×3 → result → CTA |
| Myth → Truth | the belief → "wrong" → mechanism → evidence → what to do |
| List | promise N → item 1…N, each one shot → the best one last → CTA |
| Before / After | before state → transformation process → after state → split compare |
| Demo in a clip | "watch this" → the request → the work happening (live HUD) → the result plays → reaction → CTA |
| News | headline → what happened → why it matters → numbers → what's next |

Write `BEATS.md` as a table: `# | start | dur | idea | on-screen text | shot (from shots.md) | sound`. Timings add up to the length exactly.

<a id="look"></a>
## 3. Look

Pick one look from `references/looks.md` and hold it for the whole clip. An embedded mini-ad (a product ad inside the clip) may switch to its own look and switch back.

- One background family, one surface style, one accent colour. A second accent is only for a "bad" or warning state.
- Two type families at most: a display face and a mono or small label face.
- Motion personality comes with the look (eases, durations). Don't mix snappy and floaty in one clip.
- The person's own brand overrides the look's colours and fonts. Keep its motion personality.

<a id="shots"></a>
## 4. Shot list

Turn every beat into a named move from `references/shots.md`. Variety rule: the same move never runs twice in a row, and no move is used more than three times in a clip, except captions and the live HUD.

For each shot, decide:
1. **Move.** Which named move, and what it shows.
2. **Depth.** Every shot has at least two depth layers (background + subject, or subject + foreground blur). Flat single-layer shots read as cheap.
3. **Camera.** Static, push-in, drift, tilt or orbit. Something drifts in every shot, even 2% scale over the hold.
4. **Exit.** How it hands off to the next shot: cut on action, whip, match cut, mask or blur-through. Hard cuts are fine and often best; avoid soft crossfades.
5. **Sound.** Whoosh on whips, tick or click on UI, impact on numbers and reveals, a riser into the payoff.

Add the shot column to `BEATS.md`, plus a `registry` column for every named move: `<query> → <item>` or `<query> → none`. An empty registry cell means the search was not run. Run the Motion Router CLI to resolve and record every move:
```powershell
node tools/motion-pick.js "<the move in English>" --skill hfsdirector --job <job-id> --look <look-name> --project <project>
```

<a id="build"></a>
## 5. Build

Scaffold a new folder named after the clip (VVE: `tools/hfsdirector/projects/<slug>/`):

```powershell
npx hyperframes init <slug> --resolution portrait --non-interactive --skip-skills
```

Without `--resolution portrait` the project is 1920×1080. Copy the fonts into `assets/fonts/` straight away. Use one sub-composition per beat or per shot group, each mounted from the root with `data-composition-src`, a matching `data-composition-id`, `data-start` and `data-duration`. Don't build one 20 s scene that carries the whole clip: `snapshot --review` samples per scene, so it then shows a handful of frames and the seams inside go unchecked. A layer that must persist (a device that stays on screen) is fine, but split the copy and overlays by beat.

**Source order for each shot (Motion Router Protocol):**
1. **Motion Router First (Mandatory)**: Before hand-building any named visual (device, notification, chart, card, slam, counter, particle burst, transition), you MUST query the Motion Router:
   ```powershell
   node tools/motion-pick.js "<query>" --skill hfsdirector --job <job> --look <look> --project <project>
   ```
   If a matching component or block exists (shelf `reg:` [448 items] or `kit:` [25 items]), use its action (e.g. `npx hyperframes add <name>`) and record the decision to `<project>/MOTION_PICKS.jsonl`. Most registry items are 1920×1080: **recompose** them for 9:16 (stack vertically, enlarge type ×1.35); never letterbox them. Hand-building without querying and logging to `MOTION_PICKS.jsonl` is strictly forbidden and will fail the audit gate (§8).
2. **Hand-build** ONLY when Motion Router confirms no existing component/block fits. GSAP on one paused timeline per composition. CSS 3D (`perspective`, `rotateX/Y`, `translateZ`) covers floating cards, tilted dashboards and device angles. Use Three.js only when a real 3D object must turn.
   - 💡 **Motion library & choreography adoption** (`tools/motion_catalog.json`, ~500 entries; search with `node tools/motion-search.js "<query>" [--style luxury|viral|modern|science|creative] [--color …] --prompt`). When the pick names a motion ref, read its full prompt and sort it into two piles:
     - **Adopt:** the `<structure>` (beat map, order of moves, "something on every beat"), the move vocabulary (one continuous take, shape floods into the next scene, accordion wordmark squeeze, iris, liquid-glass toolbar), the numbers (BPM, spring stiffness and damping, durations), and any `<gotchas>` that apply to Chromium.
     - **Never adopt:** its stack and render steps (`seek(t)` pure functions, Playwright subframes, `ffmpeg tmix`, 1440×1440 or 1920×1080 canvases, downloaded SFX lists). The HyperFrames contract in `/hyperframes` wins every conflict: GSAP on a paused timeline, 1080×1920, `npx hyperframes render`.
     - Drop scenes that do not serve the product (a delivery van in a console ad), recompose every layout for 9:16, and map the person's hero into the flow.
     - **Blend of two refs** (e.g. "1+3"): one ref owns the spine and the transitions, the other owns only named accents (frame-0 hook, type hits, the CTA). Write which ref owns what in `BEATS.md` so the clip keeps one motion personality (§3).
     - Record the slugs and what you took in `BRIEF.md` and `REVIEW.md`. This is borrowing an idea, not copying source (§1).
3. **Real media.** A real product, app, logo or place comes from its source (images given, `npx hyperframes capture <url>`). Draw only what has no source.

**Retoken everything you install.** Point a registry item's colour and font variables at the look's tokens. A clip where every block keeps its own palette looks like a template pack.

**Generic UI only.** Mock apps, chats, notifications and social cards use a neutral design (your own icon, no real platform logo) unless the person owns that brand. Platform look-alikes are a trademark risk for anyone who sells or runs the clip as an ad.

**Copy is variables.** Every on-screen string is a `data-var-text` or CSS variable, so a re-cut for another product only changes values.

**The `fromTo` trap.** GSAP renders a `fromTo`'s from-values when the tween is authored, not when it starts. Two ways this breaks a clip, both seen in real runs:
- A `fromTo` that starts later and whose from-values show something (`opacity: 1`, a flash, a ring, a card) shows it from frame 0: a white flash covers the whole clip until its cue.
- A later `fromTo` on an element that an earlier tween also moves overwrites that tween's start: a device meant to assemble straight-on at 4 s starts at the 16 s pose instead.

Rule: every `fromTo` except the first one on an element, and every `fromTo` that starts after 0 with a visible from-state, takes `immediateRender: false`. `check` flags some of these (`gsap_repeated_fromto_without_baseline`); the snapshot catches the rest.

Write the files in this order:
1. Root `index.html`: the scene hosts, the music `<audio>`, the SFX `<audio>` set and the caption host.
2. The scenes, in beat order.
3. The sound pass: Waterfall V2 via `SOUND_CUES.json`
   - Director writes `<project>/SOUND_CUES.json` from the sound column of `BEATS.md` (`t`, `dur`, `class`, `desc_en`, `terms`, `lane`).
   - Run `python tools/hfsdirector/sound_source.py plan <project>` to determine sourcing route:
     * **Synth class** -> T1 Shelf (`tools/hfs_kit/sfx/library/index.json`) or T3 Earshot (`sfx_render` procedural synthesis).
     * **Organic class** -> T2 Openverse (`python tools/hfsdirector/sound_source.py fetch <project> <cue_id>`). Director ranks candidates with earshot MCP `rank` + `realness`, then installs winner via `python tools/hfsdirector/sound_source.py install <project> <cue_id> <candidate>`. If fetch fails/times out, cascades to T3 Earshot approximations.
     * **Music class** -> T1 Brand BGM (`V:\DoctorBank Family\DoctorBank Brand\BGM\`) or Freesound CC0.
   - Markup: Write placed `<audio>` elements into `index.html` with calibrated `data-volume`.

<a id="talking-head"></a>
## 6. Talking-head mode

When footage of a speaker is given:

1. **Transcribe:** `npx hyperframes transcribe <file> --json`. Build the beats on the speaker's words. Their timing is the spine, and nothing moves the voice.
2. **Captions:** word-synced, one caption host, at most two lines. The keyword in each line gets the accent or the box (`caption-pill-karaoke`, `caption-highlight`).
3. **Cutout** for anything behind the speaker: `npx hyperframes remove-background <video> -o cutout.webm`. Stack in this order: footage → behind-layer (giant word, device, countdown number) → cutout → captions. A giant word reads best 30–55% covered by the head. Measure the overlap on snapshots; never guess it. Details in `/hyperframes` `references/captions.md`.
4. **Punch-ins** on emphasis words: 1.0 → 1.12 scale over 0.25 s. Move the footage and the cutout together in one wrapper.
5. **Cards never cover the face.** Put cards in the upper or lower third, or shrink the speaker into a PiP or split frame for a data beat.
6. **Embedded mini-ad:** cut full-screen to a pure-motion sequence (8–25 s, its own look), then return to the speaker. Show the request that made it (a typed prompt) before it plays, so the viewer knows what they are watching.

The matte model is CPU-heavy (about 2 fps at 1080p) and loses thin objects near the body. Cut out only the time ranges that need a behind-layer.

<a id="thai"></a>
## 7. Thai text

Thai breaks most motion code written for English. These rules are mandatory whenever Thai appears on screen.

- **Split by grapheme, never by character.** Per-letter animation uses `Intl.Segmenter('th', {granularity: 'grapheme'})`. Splitting by code point tears vowels and tone marks off their consonants (`ที่` becomes three floating pieces). Per-word animation uses `granularity: 'word'`.
- **Break lines yourself.** Thai has no spaces, so the browser breaks lines mid-word. Write explicit line breaks at word boundaries (use the segmenter's word output) and set `word-break: keep-all` where supported.
- **Leave room for marks.** Thai display type needs `line-height` ≥ 1.3 and top padding in boxes and pills of ≥ 0.18em. Otherwise upper vowels and tone marks clip against the box edge or a `overflow: hidden` mask.
- **Masks and wipes:** extend reveal masks 0.25em above and below the text box for the same reason.
- **Fonts:** a Thai-capable display face (Prompt, Noto Sans/Serif Thai, Chakra Petch, IBM Plex Sans Thai or the brand's own) loaded with `@font-face` from `assets/fonts/`. The bundled HyperFrames fonts are Latin. Mixed Thai-English lines use the Thai face for both. The mono label face (JetBrains Mono) has no Thai: a label slot that holds Thai gets the Thai face, or the browser falls back to a system font.
- **Particle and bitmap effects** (dot-matrix numbers, text dissolve) sample the rendered text, so they work with Thai. Check the marks on the snapshot.
- **Length:** Thai runs about 1.6× wider than the same English idea. Cut words; never shrink below 28 px.

<a id="gates"></a>
## 8. Quality gates

Run all of them, fix and re-run. Never hand over a clip that failed a gate silently.

1. `npx hyperframes check --json`: zero errors. Weigh every warning.
2. **Project lint**, if the host has one. In VVE, run `python tools/hfs_kit/lint/hfs_lint.py <scene.html> theviral` on every scene. Rules R2, R7, R8 and R9 are hard: CSS motion, network URLs, the render contract and clip timing. R1 (36–140 px), R3 (radius scale) and R4–R6 (kit palettes, channels, lanes) were written for the kit's broadcast overlays. They are advisory for a director look: giant type above 140 px and a 28 px radius are intended. Fix them only when the clip uses the kit's own styles.
2b. **Motion Router Audit (Mandatory Gate)**: Run `node tools/motion-pick.js --audit <project>`. This gate strictly verifies that all motion elements were evaluated via Motion Router and logged to `MOTION_PICKS.jsonl`. Hand-built compositions without ledger records will immediately fail with exit code 1.
3. `npx hyperframes snapshot --review` at the start, middle and end of every beat. Look at every frame and check:
   - frame 0 works as a thumbnail with no sound;
   - every beat shows a visible change, and nothing holds still longer than 3 s;
   - no word outside the 168–1330 px band, and nothing under the right action rail;
   - Thai marks are not clipped, and no word is split across lines;
   - no text under 28 px; contrast is readable on the real background (glass on bright footage needs a scrim);
   - registry items are retokened and nothing shows an off-look colour;
   - the face is never covered; behind-layers are 30–55% occluded.
4. **Sound:** every whip, reveal, number and UI tap has a cue. Music sits under speech. Targets for social: integrated −15 to −13 LUFS, true peak ≤ −1 dBTP, and the first 3 s no more than 6 LU quieter than the rest (the hook must not be thin).
   - **Sound Router Audit (Mandatory Gate):** Run `python tools/hfsdirector/sound_source.py --audit <project>`. This gate strictly verifies that all `<audio>` tracks in `index.html` exist on disk, have recorded provenance in `SOUND_PICKS.jsonl`, and carry approved CC0/PDM/MIT licenses. Hand-picked audio without provenance will immediately fail with exit code 1.
   - **Before render, premix.** `node tools/hfsdirector/premix.js <project>` sums every `<audio>` in `index.html` with its start, trim, volume and fade into `scratch/premix.wav`. Run earshot `measure` and `timeline` on it, fix `data-volume` (and the music file, if you made it) in the project, and premix again until it lands.
   - **After render, measure the mp4.** In one run the render came out 1.4 LU and 2 dB of peak below its premix. Treat that as a hint, not a constant: measure every render and note the offset in `REVIEW.md`.
   - **Fix loudness in the project, never only in the file.** A loudnorm on the delivered mp4 is lost on the next render. If you master the file, also write the gain change back into `index.html`.
5. Write `REVIEW.md` as a gate table, one row per gate:

   | # | Gate | Command | Result (numbers) | Status |
   | --- | --- | --- | --- | --- |

   Status is PASS, FAIL or **NOT RUN + reason**. Never summarise "all gates passed" while a row is empty or NOT RUN. Under the table: what you fixed, and what you are unsure of. Log each gate run as an `event gate`.

<a id="deliver"></a>
## 9. Deliver

- Open the Studio preview and give the person the link.
- **Render** only on approval, on an explicit "render it", or when the person asked for no stops, and only if the host project's rules allow it. Some projects (VVE) forbid the agent from running render or pipeline commands. Then stop at the preview and give the exact command.
- **VVE permissions.** Calling `/hfsdirector` is the person's order to run this skill's own non-render tools: `init`, `catalog`/`add`, `check`, `snapshot`, `preview`, `transcribe`, `remove-background`, the lint, the Flash worker, `hfslog.js`, `premix.js`, and `python tools/hfsdirector/sound_source.py`. It also covers asset scripts you write in the project's `scratch/` (synthesised music or SFX, as long as they spend no credits and touch no CapCut draft), `motion-search.js`, and up to three pitch mockups per pitch round with `C:/XBrain/tools/gpt-image.cjs` (subscription, no per-image charge). None of them spend paid credits. `tools/fs-image.js` (Imagen, billed per image) is **not** covered: run it only when the command asks for it. `render` stays the person's command.
- Run `hfslog.js <project> report` and link `TIMING.md`.
- Commit the project folder (only its files) once the person has the preview or the render.
- End with:
  1. the one sentence the clip delivers;
  2. the beat table (short form);
  3. a **Decided for you (changeable)** table listing every default you chose: genre, length, look, CTA, music, and the two pitches you did not pick;
  4. the timing table from `TIMING.md` (work time and waiting time apart);
  5. clickable links to the project, the preview and the render.

**Variants are cheap.** Because copy and colours are variables, a second product, language or hook is a variable swap plus a re-check. Offer it as a statement, not a question.

[⬆ Contents](#toc)
