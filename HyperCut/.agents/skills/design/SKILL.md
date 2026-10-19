---
name: design
description: >-
  BillPay & XBrain Master Design System Engine — บังคับใช้ Neumorphic Dark Dashboard,
  3-Stop Gradients, Luminous Text Contrast, Bento Grid Hierarchy, และ Data Visualization Guide
  (สีกราฟ, Chart Decision Matrix, Hover Physics, และ Skeleton Shimmers)
---

# 🎨 Skill: `/design` (Master UI/UX & Data Visualization Engine)

## Objective
To strictly enforce and elevate the **BillPay & XBrain Dark Dashboard Design System** on any given frontend file, component, or full layout. Eliminates generic, flat, or amateur AI aesthetics, and delivers state-of-the-art Neumorphic depth, luminous data series, responsive Bento layouts, and smooth micro-interactions.

---

## 💎 Core Architecture & Design Tokens

### 1. Primary Neon Palette
Never use generic browser colors (flat red, green, blue). All interactive accents and focal points must use this calibrated scale:
- **Primary Hero (Electric Violet):** `#823AFD`
- **Secondary Accent (Hot Pink):** `#FC2D79`
- **Tertiary / Warning (Burnt Orange):** `#FD5514`
- **Cyan Highlight (Neon Cyan):** `#00F0FF`
- **Positive / Growth (Neon Emerald):** `#00E599`
- **Negative / Alert (Coral Red):** `#FF4D4D`

### 2. Neumorphic Depth & Layering
- **App Canvas Background:** Deep Obsidian `#0B0B1E` or `#080816`
- **Card Surface Background:** `#12122B` or `#161636`
- **Neumorphic Shadows:** Never use dead black `rgba(0,0,0,X)`. Pair with violet/pink edge blooms:
  ```css
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(130, 58, 253, 0.12);
  border: 1px solid rgba(130, 58, 253, 0.18);
  ```
- **3-Stop Gradient Rule:** All charts, active tabs, progress bars, and primary CTAs must use a 3-stop gradient:
  ```css
  background: linear-gradient(135deg, #823AFD 0%, #B83AFD 50%, #FC2D79 100%);
  ```

### 3. Typography & Legibility (Iron Rule)
- **Numbers & Metrics:** Strictly use `'JetBrains Mono', monospace` with `font-variant-numeric: tabular-nums` for all currencies, percentages, and metrics.
- **Headers & Body:** Use modern sans-serif (`'Plus Jakarta Sans'`, `'Outfit'`, or `'Inter'`).
- **Luminous Text Contrast:** Sub-text, labels, timestamps, and metadata MUST be luminous (`#9898C8` or `#B8B8D8`).
- **BAN Dim Grey:** Any dark grey text (`#5A5A90` or darker) is **strictly banned** because it is illegible against dark backgrounds. Brighten by at least 4 levels to `#8A8AC0` or `#9898C8`.

---

## 📊 Data Visualization Guide (ชาร์ตและกราฟระดับเทพ)

### 1. Chart Type Decision Matrix
Select charts strictly according to data topology:
- **Time-Series / Trends:** Use **Line Chart** or **Area Chart**.
  - Area Fill: Always translucent gradient (`opacity: 0.12 - 0.18`) fading to zero at the bottom. Never use solid fill that hides background grid lines.
- **Categorical Comparison:**
  - Items ≤ 7: **Vertical Bar Chart**.
  - Items > 7 or Long Labels: **Horizontal Bar Chart** (prevents diagonal label squishing).
- **Part-to-Whole / Composition:** Use **Donut Chart** with a luminous center callout.
  - ⛔ **BAN Solid Pie Charts:** Solid pie charts make angle comparison inaccurate.
  - Slice Limit: Maximum 5 slices. If >5 categories exist, merge the smallest into `"Others"`.
- **Single KPI / Health Trend:** Use **Sparkline** (minimalist line without axes) paired with a Delta pill badge (`↑ +14.2% vs last week`).

### 2. Luminous Data Series Palette (High Contrast on Dark Mode)
When rendering multi-series charts (Chart.js, Recharts, SVG, ApexCharts), assign series colors strictly in this sequence:
1. **Series 1 (Hero Metric):** `#823AFD` (Electric Violet Glow)
2. **Series 2 (Secondary / Benchmark):** `#FC2D79` (Hot Pink)
3. **Series 3 (Tertiary / Target Line):** `#00F0FF` (Cyan Glow)
4. **Series 4 (Complementary):** `#FD5514` (Burnt Orange)
5. **Series 5 (Neutral / Baseline):** `#6C7293` (Cool Slate)

### 3. Chart Grid, Axes & Tooltip Standards
- **Grid Lines:** Ultra-subtle `rgba(255, 255, 255, 0.04)`. Dashed (`stroke-dasharray: 3 3`).
- **Axis Tick Labels:** `'JetBrains Mono'`, 11px, color `#8A8AC0`.
- **Floating Tooltips (Glassmorphic Neumorphism):**
  ```css
  background: rgba(18, 18, 42, 0.94);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(130, 58, 253, 0.35);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(130, 58, 253, 0.2);
  border-radius: 10px;
  color: #FFFFFF;
  padding: 8px 12px;
  ```

---

## 🍱 Bento Grid & Component Architecture

### 1. Dashboard Layout Hierarchy (Formula 1-2-3)
1. **Row 1 — Top Hero KPI Cards (Bento 3 or 4 columns):**
   - 1 Main Metric Card (2-column span): Huge font (32-36px `tabular-nums`) + embedded Sparkline.
   - 2 Supporting Metric Cards (1-column span each): Secondary counts + Mini status pills.
2. **Row 2 — Main Visual Canvas (2:1 Column Split):**
   - Main Chart Card (2-column span): Trendline / Area Chart with 7D/30D/All time toggles.
   - Distribution / Donut Card (1-column span): Composition with categorized legend list.
3. **Row 3 — Deep Data Table / Live Event Feed:**
   - Full-width table with alternating rows, hover highlights, and pagination.

### 2. Spacing Rhythm & Geometry
- **Gap & Padding:** Consistent 16px (`1rem`) or 20px (`1.25rem`). Never arbitrary odd values (e.g. 13px, 17px).
- **Corner Radii:** Cards = `16px` to `20px`. Buttons & Pills = `9999px` (Full rounded) or `10px`. Input fields = `10px`.

---

## ⚡ Micro-Interactions & Hover Physics

A premium dashboard feels alive and tactile under the cursor:
- **Card Hover Elevation:**
  ```css
  .dashboard-card {
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.22s ease;
  }
  .dashboard-card:hover {
    transform: translateY(-2px);
    border-color: rgba(130, 58, 253, 0.45);
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.55), 0 4px 12px rgba(130, 58, 253, 0.25);
  }
  ```
- **Button Click Scale:** Buttons must provide immediate tactile feedback:
  ```css
  button:active {
    transform: scale(0.97);
  }
  ```

---

## 💀 Empty States & Loading Skeletons

Never leave empty white rectangles or raw "No data" text:
1. **Empty State Component:**
   - Soft glowing SVG illustration or icon (translucent violet ring).
   - Clear headline in white (`#FFFFFF`, 16px semi-bold).
   - Explanatory description in `#9898C8` (13px).
   - Direct Action CTA Button (`+ Create New` or `Refresh Data`).
2. **Skeleton Shimmer Loading:**
   ```css
   @keyframes shimmer {
     0% { transform: translateX(-100%); }
     100% { transform: translateX(100%); }
   }
   .skeleton-box {
     position: relative;
     background: rgba(255, 255, 255, 0.04);
     overflow: hidden;
     border-radius: 8px;
   }
   .skeleton-box::after {
     content: '';
     position: absolute;
     inset: 0;
     background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.06), transparent);
     animation: shimmer 1.6s infinite;
   }
   ```

---

## 🛡️ Pre-Delivery Quality Checklist (Mandatory Gate)

Before completing any `/design` audit or generating UI code, verify all 8 points:
- [ ] No raw emojis used as UI icons (Use clean SVGs: Lucide, Heroicons, or Feather).
- [ ] Explicit `cursor: pointer` on all clickable/interactive controls.
- [ ] Minimum contrast ratio 4.5:1 for normal text (WCAG AA) in dark mode.
- [ ] Interaction feedback duration never exceeds 200ms.
- [ ] Clear `:focus-visible` state on keyboard navigation.
- [ ] Media query `@media (prefers-reduced-motion)` respected for decorative animations.
- [ ] Text, chips, and badges reflow gracefully without clipping or overlapping.
- [ ] Responsive sanity checked across breakpoints: 375px, 768px, 1024px, 1440px.

---

## 🚀 Execution Workflow

When invoked with `/design <file_path>` or a creative prompt:
1. **Audit & Token Map:** Ingest the code, identify non-compliant colors, flat shadows, illegible dim text, or poor chart choices.
2. **Transform & Apply:** Upgrade CSS/HTML with the exact tokens, Bento structure, and data viz standards above.
3. **Report:** Deliver a concise summary of modernized tokens and verified checklist items.
