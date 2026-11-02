# Looks

> **TL;DR:** A look is a whole visual system: background, surface, type, accent and motion personality. Pick one per clip and put its tokens in `:root`, then point every scene and every installed registry item at them. The brand's colours and fonts override the look's; the motion personality stays.

<a id="toc"></a>
**Looks:** [Glass Light](#glass-light) · [Studio Dark](#studio-dark) · [Chrome](#chrome) · [Cinema Black](#cinema) · [Neon HUD](#hud) · [Editorial Paper](#paper) · [Bold Pop](#pop) · [Token template](#tokens)

| Look | Reads as | Best genres |
| --- | --- | --- |
| Glass Light | clean, trustworthy, modern AI | AI/tech showcase, SaaS, lead magnet |
| Studio Dark | serious, focused, developer | tool reveal, "credits", myth beats |
| Chrome | premium tech, motion-heavy | app ad, gadget, fintech |
| Cinema Black | luxury product film | physical product, wearable, beauty |
| Neon HUD | data, performance, sport | health metrics, gaming, crypto |
| Editorial Paper | journalism, education | news, explainer, history |
| Bold Pop | loud, fun, mass market | listicle, food, entertainment |

---

<a id="glass-light"></a>
## Glass Light
- **Background:** a sky-and-cloud plate or a pale mesh (`#E9EEF6` → `#D9E2F0`, with green and blue blooms at 20% opacity).
- **Surface:** white frosted glass, `rgba(255,255,255,.6)` + `blur(24px)`, radius 28 px, soft long shadow.
- **Type:** dark navy text `#0F1B3D`; accent `#2F5BEA`; good state `#19B37A`; bad state `#E03A4E`.
- **Motion:** floaty. `power3.out` and `expo.out`; entrances 0.6–0.9 s; constant slow drift; tilts ±6°.

<a id="studio-dark"></a>
## Studio Dark
- **Background:** `#0E0E10`, flat, with one faint vignette.
- **Surface:** off-white cards `#F2F2F4` or none at all.
- **Type:** white display; mono labels with wide tracking (0.3–0.4em) at 40% opacity; one accent (`#E5484D` for a warning word or `#7C8CFF`).
- **Motion:** precise. `power4.out` and hard cuts; entrances 0.3–0.45 s; no drift on type.

<a id="chrome"></a>
## Chrome
- **Background:** a liquid-metal loop in greys (`liquid-metal`), dark.
- **Surface:** white or pale glass cards with a crisp edge highlight; a 3D stack.
- **Type:** white on the background, near-black on the cards; one brand accent.
- **Motion:** confident. Cards arrive with 3D rotation (rotateX 20° → 8°), stagger 0.06 s; glass-bubble cursor.

<a id="cinema"></a>
## Cinema Black
- **Background:** pure black, the product rim-lit, one coloured glow (warm gold `#F2C98A` or the product's own colour).
- **Type:** thin wide sans in caps for the logo; small tracked tagline; few words.
- **Motion:** slow. `sine.inOut`; 1.2–2 s moves; long holds with micro-drift; fade from black.

<a id="hud"></a>
## Neon HUD
- **Background:** `#07090B` with a faint grid.
- **Surface:** dark tiles `#12161B`, 1 px borders at 8% white.
- **Type:** big rounded numerals; tiny tracked caps labels; neon accents per metric (green `#3BE36B`, blue `#3E7BFF`, orange `#FF8A3D`) with a glow.
- **Motion:** counters and rings fill fast (0.8 s, `power2.out`); tiles slide in; camera glides across a tilted bento.

<a id="paper"></a>
## Editorial Paper
- **Background:** warm paper `#F4EFE6` with grain.
- **Type:** a serif display (for Thai, Noto Serif Thai); a black body; one red accent `#C8102E`; marker highlights.
- **Motion:** measured. Wipes and underlines draw; `power2.inOut`; no glow.

<a id="pop"></a>
## Bold Pop
- **Background:** a saturated flat colour that changes every 2–3 beats.
- **Type:** an extra-bold display at 180 px+, yellow `#FFD400` on black boxes, stickers.
- **Motion:** snappy. `back.out(2)`, scale pops, shakes on hits, beat-synced.

<a id="tokens"></a>
## Token template

Every scene reads only these variables. A registry item gets its own variables re-pointed to them on install.

```css
:root {
  --bg: #E9EEF6;        --bg-2: #D9E2F0;
  --surface: rgba(255,255,255,.6);  --surface-blur: 24px;  --radius: 28px;
  --ink: #0F1B3D;       --ink-dim: rgba(15,27,61,.55);
  --accent: #2F5BEA;    --good: #19B37A;   --bad: #E03A4E;
  --font-display: "Prompt", sans-serif;   --font-label: "JetBrains Mono", monospace;
  --ease-in: "power3.out";  --dur-in: 0.7;   /* read by the scene scripts */
}
```

In VVE, the `hfs_kit` palettes and styles (`tools/hfs_kit/palettes/`, `styles/`, `kit.json` → `motion.styles`) are ready-made token sets. Map the closest one instead of starting from blank. Fonts with Thai in the kit: Prompt, Noto Serif Thai, Chakra Petch.

[⬆ Looks](#toc)
