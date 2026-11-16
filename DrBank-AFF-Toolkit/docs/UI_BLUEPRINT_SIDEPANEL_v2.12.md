# Side Panel UI Blueprint — DrBank AFF Scout v2.12 (redesign จาก v2.11.0)

> เป้า: กวาดตา 0.5 วิ เห็น **฿คอมสุทธิ/ชิ้น + %รวม + Extra/Base แยก (% และ ฿)** + ไฟคุ้มทุน · ปุ่มหลักไม่ตกขอบ · ไม่มีข้อมูลซ้ำ
> Viewport อ้างอิง: 380 × 800px (Chrome Side Panel) · เนื้อหา 352px (padding ข้าง 14px)

---

## 0. Root cause ของ 4 ปัญหา (จากโค้ดจริง)

| # | อาการ | ต้นเหตุในโค้ด |
|---|---|---|
| 1 | Tab ทับชื่อสินค้า | `.drb-sp-tabs { position: sticky; top: 49px }` hard-code — header สูงจริงไม่เท่า 49px (ฟอนต์ไทย/zoom/badge wrap) → 2 sticky ซ้อนกันเหลื่อม |
| 2 | เรท 10% โผล่ 4 ที่ / คุ้มทุนโผล่ 3 ที่ | `#drb-sp-badge-extra`, `#drb-sp-eff-rate`, `#drb-sp-real-status`, `#drb-sp-tbl-breakdown` · คุ้มทุน: `#drb-sp-breakeven-text`, `#drb-sp-tbl-100`, (Tab AFF: `#drb-aff-real-breakeven`) |
| 3 | ฿คอมโดนกลืน | `.drb-aff-kpi-val` 24px ใช้กับทั้ง "ราคา" และ "คอม" → น้ำหนักเท่ากัน, label 16px ใหญ่กว่าที่ควร |
| 4 | ปุ่มหลักตกขอบ | ลำดับ DOM: SKU (แม้ 0 รายการ) → 4 input → ตาราง → Sub_id 5 ช่อง → **ค่อยถึงปุ่ม** |

**Blast radius:** `src/styles/hud.css` ใช้ร่วมกับ Floating HUD บนหน้า Shopee (`shopee-hud.js`) → **ห้ามแก้ class `.drb-aff-*` เดิม** ให้สร้างไฟล์ใหม่ `src/styles/sidepanel.css` และ scope ทุก rule ใต้ prefix `.sp-` / `#drb-sidepanel-root`.

---

## 1. Layout ใหม่ (Shopee tab) — 4 โซน

```
┌──────────────────────────────────────┐ ┐
│ ◉ DrBank AFF v2.12   [Shopee] ↗ 🌙 ↻ │ │ Z0 .sp-topbar  (sticky top:0, ก้อนเดียว)
│ [ 🛒 สินค้า ][ 📊 ข้อเสนอ AFF ]      │ │ 44 + 40 = 84px
├──────────────────────────────────────┤ ┘
│ ชื่อสินค้า 2 บรรทัด ตัด … (13/600)    │ ┐
│ 🔥 ขาย 2.1พัน · ⭐ 4.9 · 🇹🇭 ส่งไทย    │ │
│ ┌──────────────────────────────────┐ │ │
│ │ คอมสุทธิ/ชิ้น          เรทรวม     │ │ │ Z1 .sp-hero  (~236px)
│ │ ฿21.63                  10%      │ │ │  = หัวใจ 0.5 วิ
│ │ ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇░░░░░░ │ │ │
│ │ ● Extra 8% ฿17.30  ● Base 2% ฿4.33│ │ │
│ │ ────────────────────────────────  │ │ │
│ │ ราคา ฿223   AFF ฿249 → −฿26 หลังโค้ด│ │ │
│ ├──────────────────────────────────┤ │ │
│ │ 🟡 คุ้มแอด 107฿ ที่ 4.9 ชิ้น/วัน  ✓จริง│ │ │  verdict strip (แทน banner บนสุด)
│ └──────────────────────────────────┘ │ ┘
│ 🔗 s.shopee  16NOV26FBRAD·aidrb…  ✎  │ ┐ Z2 .sp-link (พับ = 1 แถว 56px)
│ https://s.shopee.co.th/xxxx      ⧉  │ ┘
│ ▸ 🧮 จำลองราคา/เรท                  │ ┐
│ ▸ 📋 สเปกสินค้า                      │ │ Z3 <details> พับทั้งหมด (36px/แถว)
│ ▸ 🛠 เครื่องมือ (ก๊อปลิงก์คลีน, เปิด AFF…) │ ┘
├──────────────────────────────────────┤ ┐
│ [⚡ ส่งเข้า Web UI        ] [⚡ เจน+ก๊อป]│ │ Z4 .sp-actionbar (sticky bottom:0) 60px
└──────────────────────────────────────┘ ┘
```
Above-the-fold: 84 + 236 + 56 + 3×36 + 60 ≈ **544px** < 800 → ทุกอย่างสำคัญอยู่ในจอเดียว เหลือที่หายใจ

### Z0 — Topbar (แก้ปัญหา #1)
- ห่อ `.drb-aff-header` + `.drb-sp-tabs` ไว้ใน `<header class="sp-topbar">` **ตัวเดียว** ที่ `position: sticky; top: 0; z-index: 100` → ลบ `top: 49px` และ sticky ของลูกทั้งสองออก
- Tabs เปลี่ยนเป็น **segmented control**: พื้น `--sp-surface-2`, ปุ่ม active = พื้น `--sp-card` + เงา `0 1px 2px rgb(0 0 0/.08)` + ตัวหนังสือสีแบรนด์ของแท็บ (ส้มสินค้า / ฟ้า AFF) — เลิกเติมพื้นสีทึบ (ตอนนี้แย่งสายตากับตัวเลขคอม)
- ขนาด: ปุ่ม tab สูง 32px, font 13px/600, radius 8px, container padding 4px
- `body { scroll-padding-top: 92px }` กัน anchor/focus ไปซ่อนใต้ topbar
- Header: logo 18px, ชื่อ 14px/700, version 11px muted, icon button 28×28px

### Z1 — Hero Profit Card (แก้ปัญหา #2, #3) — component เดียวใช้ทั้ง 2 แท็บ
| Element | ขนาด | น้ำหนัก | สี |
|---|---|---|---|
| ชื่อสินค้า (นอกการ์ด) | 13px / lh 1.45 | 600 | `--sp-text` · `-webkit-line-clamp: 2` + `title=` ชื่อเต็ม |
| meta line (ขาย/เรตติ้ง/ส่งไทย) | 12px | 500 | `--sp-text-2` · คั่นด้วย `·` **ไม่ใช่ pill** (ลด noise) — ไม่ผ่านเกณฑ์ค่อยเป็นสีแดง |
| label "คอมสุทธิ/ชิ้น" / "เรทรวม" | 11px, letter-spacing .02em | 600 | `--sp-text-3` |
| **฿คอมสุทธิ** | **34px** / lh 1.1, tabular-nums | **800** | สี tier (`--tier-*-text`) |
| **%รวม** (ชิดขวา) | **22px** | 700 | `--sp-text` |
| split bar | สูง 8px radius 4px | — | Extra `--sp-extra` · Base `--sp-base` · ส่วนที่ติด Cap = ลายทแยง |
| legend Extra/Base | 12.5px (%) + ฿ 12.5px/700 | 500/700 | จุดสี 8px นำหน้า |
| แถวราคา | 13px · ราคาเลข 14px/600 | — | `--sp-text-2` · ส่วนลดหลังโค้ด = `--sp-extra` |
| verdict strip | สูง 36px, 13px/600 | — | พื้น `--tier-*-bg`, ขอบบน 1px `--tier-*-border` |
| badge "✓จริง / ≈ประเมิน" | 11px pill ชิดขวาใน strip | 600 | จริง=`--sp-extra`, ประเมิน=`--sp-text-3` + tooltip เวลาที่ดึง |

กฎ: **ราคาขาย ห้ามใหญ่กว่า 14px** — ฿คอมต้องใหญ่ที่สุดในจอ (34 vs 14 = 2.4×, ตาจะไปตกที่คอมก่อนเสมอ)

การ์ด: radius 12px, padding 14px 14px 0, ขอบ 1px `--sp-border`, verdict strip เต็มความกว้างขอบล่าง (radius 0 0 12 12)

Split bar logic: ความกว้าง Extra = `extraComm / grossComm`, Base = `baseComm / grossComm`. ถ้า `isCapped` เติม class `.is-capped` ที่ segment Base + tooltip "ติด Cap 250฿"

### Z2 — Link Builder (Sub_id1–5)
- **สถานะพับ (default):** 1 แถว — ไอคอน 🔗 + Sub_id แสดงเป็นข้อความ mono 11.5px คั่น `·` ตัด `…` + ปุ่ม ✎ (24px)
- กด ✎ → กาง grid **2 คอลัมน์** (sub1–4) + sub5 เต็มแถว, input สูง 30px font 12px mono, label เล็ก 10.5px เหนือ input ("sub1 แคมเปญ", "sub4 SKU (auto)") — 3 คอลัมน์เดิมแคบเกินอ่านค่าไม่ครบ
- ปุ่ม "เจน+ก๊อป" ย้ายไปอยู่ใน Z4 actionbar (ไม่อยู่ใน grid input)
- Output: แถวลิงก์ mono 12px สี `--sp-base` + ปุ่ม ⧉ ก๊อป; หลังก๊อป toast "ก๊อปแล้ว" 1.5s
- จำค่า sub1–5 ใน `chrome.storage.local` (ถ้ายังไม่ได้ทำ) — แชร์ระหว่าง 2 แท็บ → **ลบกล่องซ้ำใน Tab AFF** ใช้ component เดียว

### Z3 — สิ่งที่พับ/ซ่อน
| ส่วน | การจัดการ |
|---|---|
| 4 ช่องจำลอง (ราคา/Cap/Base%/Extra%) | `<details class="sp-fold">` "🧮 จำลองราคา/เรท" พับ default · grid 2×2 · input 32px · มีปุ่ม "รีเซ็ตเป็นค่าจริง" |
| ตาราง Base+Extra / คุ้มทุน (`.drb-aff-mini-table`) | **ลบทิ้ง** — hero แสดงครบแล้ว |
| ตัวเลือก SKU | `hidden` เมื่อ 0 รายการ · มี >0 → แถวชิปเลื่อนแนวนอน (`overflow-x:auto`, ชิป 28px) **ใน hero ใต้แถวราคา** เพราะมันเปลี่ยนราคา=เปลี่ยนคอม ต้องอยู่ใกล้ตัวเลข |
| สเปกสินค้า | `<details>` พับ · ลบปุ่ม "ยืด" แยก ใช้ max-height 240px + scroll ภายใน |
| Disclaimer Social/Cap 250฿ | ย้ายเป็น ⓘ tooltip ข้าง badge "✓จริง" — ไม่ต้องกินที่ทุกครั้ง |
| ป้าย banner ไฟจราจรบนสุด | **ลบ** → รวมเข้า verdict strip ใต้ hero |
| ปุ่มรอง (ก๊อปลิงก์คลีน, เปิด Web UI, เช็คเรท AFF) | `<details>` "🛠 เครื่องมือ" → grid 2 คอลัมน์ ghost button 32px |

### Z4 — Sticky Action Bar (แก้ปัญหา #4)
- `position: sticky; bottom: 0;` พื้น `--sp-card` + `border-top 1px` + `backdrop-filter: blur(8px)`; padding 10px 14px; สูงรวม ~60px
- `grid-template-columns: 1fr auto` → ซ้าย **Primary** "⚡ ส่งเข้า Web UI" (40px สูง, 14px/700, พื้น `--sp-accent`) · ขวา Secondary "🔗 เจน+ก๊อป" (outline `--sp-base`)
- ทั้งจอมี **primary สีทึบได้ปุ่มเดียว** (ตอนนี้ Tab AFF มี 3 ปุ่มทึบ + gradient 2 แบบ แย่งกันเอง)
- `.drb-aff-body { padding-bottom: 76px }` กันเนื้อหาท้ายโดน bar บัง

---

## 2. Tab AFF — ใช้โครงเดียวกัน
- Z1 Hero = ตัวเดียวกัน (ข้อมูลมาจากตาราง EXTRACOMM จริง → badge "✓จริง" ตลอด). ตาราง `drb-aff-real-*` 4 แถว **ลบ** → split bar+legend แสดงแทน; "รวมก่อนหักภาษี" ไปเป็น tooltip ของ ฿คอม ("ก่อนภาษี ฿22.30 · หัก 3%")
- แถวราคา: **"ราคาฐาน AFF ฿249 → หลังโค้ด ฿223 (−฿26)"** และบอกว่าคอมคิดจากราคาไหน (ตัวเลขที่ใช้คำนวณขีดเส้นใต้จุด)
- Z4 Primary = "⚡ ส่งเข้า Web UI" · Secondary = "🔗 เจน+ก๊อป"
- ปุ่ม Pool Bridge / V1 Realtime / ดูด Report / เปิด Web UI → `🛠 เครื่องมือ` grid 2×2 ghost (ลบ gradient ม่วง/น้ำเงินออกทั้งหมด). ถ้า Pool Bridge ใช้บ่อยจริง ให้เป็นปุ่มแรกของ grid มีขอบ `--sp-base`

---

## 3. Duplicate Kill List (ทีมโค้ดทำตามนี้ตรงๆ)

| ข้อมูล | จุดเดิม | ผลลัพธ์ |
|---|---|---|
| เรท 8%+2%=10% | `#drb-sp-badge-extra` | เปลี่ยนเป็น meta line เกณฑ์ "Extra ≥X% ✓" แค่ ✓/✗ ไม่มีตัวเลข หรือ ลบ |
| | `#drb-sp-eff-rate` | ลบ |
| | `#drb-sp-real-status` (ข้อความยาว) | เหลือแค่ badge "✓จริง / ≈ประเมิน / ⚠️ดึงไม่ได้→ลิงก์" |
| | `#drb-sp-tbl-breakdown` | ลบ (ย้ายไป legend) |
| | → **ที่เดียว:** `#sp-hero-rate` + `#sp-hero-legend` | |
| คุ้มทุน 4.9 ชิ้น | `#drb-sp-breakeven-box` (บนสุด) | ลบ |
| | `#drb-sp-tbl-100` | ลบ |
| | `#drb-aff-real-breakeven` | ลบ |
| | → **ที่เดียว:** `#sp-hero-verdict` | |
| Tier label | `#drb-sp-tier-badge` | รวมเข้า verdict strip (สี+emoji ตัวเดียว) |
| Shop/Item ID | `#drb-sp-ids` | ย้ายไปท้ายสเปก หรือ tooltip ชื่อสินค้า |

⚠️ `sidepanel.js` เรียก `document.getElementById(...).textContent = ...` ตรงๆ (บรรทัด ~650–670, ~860–875) → ลบ element แล้ว **ต้องลบ/guard บรรทัดคู่กันด้วย** ไม่งั้น TypeError ทั้ง render พัง

---

## 4. Color Tokens (ใหม่ — `src/styles/sidepanel.css`)

```css
#drb-sidepanel-root {
  /* surfaces */
  --sp-bg:        #f6f7f9;
  --sp-card:      #ffffff;
  --sp-surface-2: #eef0f3;   /* segmented bg, input bg */
  --sp-border:    #e4e6ea;
  /* text */
  --sp-text:   #111827;
  --sp-text-2: #4b5563;
  --sp-text-3: #8a919c;
  /* semantic */
  --sp-accent: #ee4d2d;   /* Shopee / primary CTA */
  --sp-extra:  #16a34a;   /* EXTRACOMM, ส่วนลด, verified */
  --sp-base:   #0284c7;   /* Base comm, AFF, ลิงก์ */
  --sp-radius: 12px;
}
body[data-theme="dark"] #drb-sidepanel-root {
  --sp-bg:        #0e0f12;
  --sp-card:      #17181c;
  --sp-surface-2: #22242a;
  --sp-border:    #2a2d34;
  --sp-text:   #f4f4f5;
  --sp-text-2: #b4b4bd;
  --sp-text-3: #7c7c87;
  --sp-accent: #ff5733;
  --sp-extra:  #4ade80;
  --sp-base:   #38bdf8;
}
```
- Tier สีใช้ `--tier-*` เดิมใน hud.css (มี dark variant แล้ว) — **อย่าสร้างซ้ำ**
- กฎสี: ส้ม = action เท่านั้น · เขียว = เงินเข้า/Extra · ฟ้า = Base/AFF/ลิงก์ · สี tier = ผลตัดสินเท่านั้น (ห้ามใช้ทำปุ่ม)
- ทุกคู่ตัวอักษร/พื้นต้องผ่าน 4.5:1 (เลข 34px ผ่าน 3:1 ก็พอ)

## 5. Type & Spacing Scale
- **Type:** 34 (฿คอม) / 22 (%รวม) / 14 (ปุ่ม, ราคา, header) / 13 (body, ชื่อ) / 12 (meta, input) / 11 (label, badge) — ห้ามต่ำกว่า 11px (ฟอนต์ไทยมีสระบน-ล่าง ต่ำกว่านี้อ่านไม่ออก)
- line-height ไทย: body 1.45 · ตัวเลขใหญ่ 1.1
- ตัวเลขเงินทุกตัว: `font-variant-numeric: tabular-nums`
- **Spacing (4pt):** 4 / 8 / 12 / 16 / 20 · ระยะระหว่างการ์ด 12px · padding การ์ด 14px · ระยะในกลุ่ม 8px
- Radius: การ์ด 12 · ปุ่ม/input 8 · pill 999
- ปุ่ม: primary 40px · secondary/ghost 32px · icon 28px

## 6. States
- **Loading:** hero ใช้ skeleton shimmer (บล็อก 120×34 / 60×22 / bar 8px) แทนข้อความ "กำลังรอ..." ยาวๆ
- **ไม่ใช่หน้าสินค้า:** hero แทนด้วย empty state 1 บรรทัด + ปุ่ม "เปิด V1 Realtime"
- **ดึงเรทไม่ได้:** badge `⚠️` สีแดง + ลิงก์ "ผ่านด่านตรวจ ↗" ใน verdict strip; ตัวเลขยังโชว์ (ค่าประเมิน) แต่ opacity .7 + label "≈"
- **ค่าเปลี่ยน** (กดชิป SKU / แก้ input): ฿คอมกระพริบพื้น 300ms (`@keyframes sp-flash`) ให้รู้ว่าอัปเดต
- `prefers-reduced-motion` → ปิด flash/shimmer

## 7. ลำดับงานสำหรับทีมโค้ด
1. สร้าง `src/styles/sidepanel.css` (tokens + `.sp-*`) และ link ใน `sidepanel.html` ต่อจาก hud.css
2. `sidepanel.html`: ห่อ topbar, ใส่ hero component (ทั้ง 2 pane), ลบ element ตาม Kill List, ห่อ fold `<details>`, เพิ่ม actionbar, รวมกล่อง Sub_id เป็นชุดเดียว
3. `sidepanel.js`: เขียน `renderHero(prefix, comm, product)` ใช้ร่วม 2 แท็บ (ตั้ง ฿คอม, %, width split bar, legend, ราคา/หลังโค้ด, verdict, badge) แล้วลบ/guard setter ของ element ที่ถูกลบ
4. ทดสอบ: Light/Dark · ชื่อสินค้ายาว 3 บรรทัด · SKU 0/12 รายการ · ติด Cap · ดึงเรทไม่ได้ · panel กว้าง 320px และ 500px
5. Bump version → 2.12.0
