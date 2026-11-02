---
name: hfs
version: "1.3.0"
updated_at: "2026-10-28"
description: >-
  VVE Spine & Skin Hybrid Engine (cc × HFS × CapCut) & HFS Kit Design System — สายพานประกอบร่างและจบงานวิดีโอระดับท็อปคลาส ล็อก VO เป็นกระดูกสันหลัง (Spine), HFS เรนเดอร์กราฟิก/ซับโปร่งใส ProRes 4444 Alpha ชั้นเดียว พร้อมคลัง 10 God-Tier Visual Hooks (Non-Text Motion Elements), 8 Palettes และ Safezone Guard 952px, และ CapCut รับหน้าที่ Finishing Room ลากตัด B-roll 23 คลิปอิสระพร้อม 2-Way Sync ใช้เมื่อ: /hfs, /spineskin, /finish, หรือสั่งรันสายพาน hybrid / hfs kit
---

# 🧬 VVE Spine & Skin Hybrid Engine & HFS Kit (`/hfs` v1.1.0)

> **หัวใจของระบบ:** ผสานพลังของ **Spine & Skin Pipeline** (VO คงที่ + Alpha Overlay + CapCut Finishing) เข้ากับ **HFS Kit Design System** (คลังกราฟิกเด้ง 10 God-Tier Visual Hooks + 8 Palettes) สวยระดับ Clinical Luxury โดยไม่สูญเสียความยืดหยุ่นในการตัดต่อ
> 
> 📖 **คู่มือแม่บทฉบับเต็ม:** ดูสเปกโค้ดละเอียดครบ 10 ซีนได้ที่ [`docs/HFS_MASTER_GUIDE.md`](file:///c:/My%20Claw/Viral%20VDO%20Editing%20(VVE)/docs/HFS_MASTER_GUIDE.md)

---

## 🏗️ สถาปัตยกรรม Spine & Skin (2 ท่อน)

| ส่วนประกอบ | บทบาท | รับผิดชอบโดย | รายละเอียด |
|---|---|---|---|
| **The Spine (กระดูกสันหลัง)** | แกนเวลาเดี่ยว (SSOT) | **AI / `cc`** | Voiceover (VO) ล็อกไทม์มิ่งนิ่งสนิทที่ Stage 2 ห้ามใครเลื่อน |
| **The Skin (ผิวหนัง & ซับไตเติล)** | กราฟิกโปร่งใสชั้นเดียว | **HyperFrames (HFS)** | เรนเดอร์ ProRes 4444 Alpha (`overlay.mov`) รวมคาราโอเกะ + Bento + การ์ดวิจัย + Endcard |
| **The Finishing (ห้องตัดต่อจริง)** | จัดองค์ประกอบ & Master Export | **Boss ใน CapCut** | B-Roll 23 คลิปแยกชิ้นอิสระ ลากยืด/หด/ใส่ Transition/Effect ได้เต็มที่ และ Export Master MP4 ตรงจาก CapCut 100% |

**ระบบสิทธิ์ถือไม้ (Baton Ownership):** `edl.state.baton = cc | boss_hfs | boss_capcut` ป้องกันการเขียนทับข้ามสายงาน

---

## 🕹️ รูปแบบการใช้งาน (3 โหมดหลัก)

### 1. โหมด One-Shot Pipeline (รันไม้เดียวจบ)
เมื่อมีไฟล์ B-roll และบทพร้อมแล้ว สั่งให้ระบบสร้างทุกอย่างตั้งแต่ต้นจนเข้า CapCut:
```powershell
# 1. สร้าง Storyboard Sheet ดูพรีวิวก่อน
python tools/edl/preview_pack.py

# 2. เรนเดอร์ Overlay Alpha + ฉีดเข้า CapCut
python tools/edl/edl_to_hfs.py --render
python tools/edl/edl_to_capcut.py
```
> **ผลลัพธ์:** โปรเจกต์ CapCut ชื่อ `{PROJECT_ID}_FINISH_r1` จะโผล่บนหน้าแรกของ CapCut ทันที พร้อม 6 เลนมาตรฐาน

---

### 2. โหมด Finishing Room & 2-Way Sync (Boss ตัดใน CapCut แล้วดึงกลับ)
เมื่อมึงเปิด CapCut เข้าไปตกแต่ง:
- ลากยืด/หด B-roll 23 ช็อต
- ใส่ Transition ระหว่างช็อต (เช่น Minnie Zoom, Glitch, Blur)
- ปรับระดับเสียง SFX / BGM

เมื่อแต่งเสร็จ ต้องการดึงข้อมูลกลับมาซิงก์เข้า `edl.json`:
```powershell
python tools/edl/capcut_review_pull.py
```
> **สิ่งที่ระบบทำให้อัตโนมัติ:**
> 1. ตรวจว่า VO ไม่ได้ถูกเลื่อน (Spine Lock 0.00s)
> 2. สกัด Diff ของเสียง SFX (เวลาที่เลื่อน, ระดับเสียงที่เปลี่ยน)
> 3. สกัด Diff ของ B-roll ที่ถูก Trim
> 4. ปรับ EDL Revision ขึ้น (เช่น r1 ➔ r2)
> 5. บันทึกบทเรียนลง `tools/edl/corrections.jsonl`

---

### 3. โหมด Live Hot-Swap (แก้คำ/แก้การ์ด โดยไม่เสียงานตัดต่อที่ทำไปแล้ว) 🔥 *ท่าไม้ตาย*
หากตัดต่อ B-roll และใส่ Transition ใน CapCut ไปเยอะแล้ว แต่ต้องการ **แก้คำในการ์ด หรือแก้คำผิดในซับไตเติล**:
1. แก้ข้อความใน `tools/hyperframes_overlay/index.html` หรือเลื่อนการ์ดใน HFS Studio Desktop App
2. รันคำสั่งเรนเดอร์ทับไฟล์เดิม:
```powershell
python tools/edl/edl_to_hfs.py --render
```
> **ความเทพ:** CapCut จะรีเฟรชเอาข้อความใหม่ขึ้นจอทันที **โดยที่รอยตัดต่อ B-roll, Transition, และ Effect ทั้งหมดที่มึงจัดไว้ใน CapCut ไม่หาย ไม่เลื่อน 100%!**

---

## 🛠️ แผนผังเครื่องมือในระบบ (`tools/edl/`)

| สคริปต์ | หน้าที่ | คำสั่งรัน |
|---|---|---|
| `preview_pack.py` | สร้าง Interactive Storyboard Sheet (HTML) | `python tools/edl/preview_pack.py` |
| `edl_to_hfs.py` | ตรวจสอบโค้ด HFS และเรนเดอร์ Alpha MOV | `python tools/edl/edl_to_hfs.py [--render]` |
| `edl_to_capcut.py` | สร้างดราฟต์ 6 แทร็กเข้า CapCut | `python tools/edl/edl_to_capcut.py` |
| `capcut_review_pull.py` | ดึงการตัดต่อจาก CapCut กลับสู่ EDL SSOT | `python tools/edl/capcut_review_pull.py` |
| `hfs_pull.py` | ดึงไทม์มิ่งการ์ดจาก HFS Studio Desktop กลับสู่ EDL | `python tools/edl/hfs_pull.py` |

---

## 🎨 HFS Kit Design System & Master Showroom (`tools/hfs_kit/`)

HFS Kit มอบ Design Tokens และชุดอาวุธภาพเคลื่อนไหวระดับท็อป (21 Components · 6 Styles · 8 Palettes · Safezone 952px) สำหรับฉีดเข้า Layer Overlay ของ HyperFrames:

### 1. วิธีนำเข้าไฟล์รวม (One-Line CSS Import)
```html
<link rel="stylesheet" href="assets/hfs_kit/hfs_bundle.css">
```

### 2. คลัง 25 Master Components (5 กลุ่มหลัก)
- **Group A (Text & Hooks - Track 4/2):** `#1 Hook Title`, `#2 Subtitle Box` (กล่องดำทึบมน 12px ขอบ 1.5px ไม่ใช้ stroke หนา)
- **Group B (Editorial & News - Track 3/4):** `#3 Necta 2-Tier Keyword Box`, `#4 Quote Card`, `#5 Lower-Third`, `#6 Ticker News`
- **Group C (Data & Charts - Track 3):** `#7 Big Stat Counter 120px`, `#8 Dial Gauge / Lab Meter`, `#9 Bar Compare`, `#10 Line Timeline Graph`, `#11 Dose Table`
- **Group D (Story & Bento - Track 3):** `#12 VS Split (Bad vs Good)`, `#13 Bento Grid 4-cell`, `#14 Mechanism Callout`, `#15 Step List 1-2-3`
- **Group E (Trust & Brand Outro - Track 4):** `#16 PMID Citation Chip`, `#17 Packshot Outro`, `#18 CTA Pill Button`
- **Group F (Motion Utilities):** `#19 Morph Physics`, `#20 Wipe Mask Reveal`, `#21 Glitch Shake (Dopamine hit)`

### 3. Interactive Showroom & Recommender Engine
- **เปิดดู Showroom สดบนเบราว์เซอร์:** [`tools/hfs_kit/gallery/index.html`](file:///c:/My%20Claw/Viral%20VDO%20Editing%20(VVE)/tools/hfs_kit/gallery/index.html) (สลับได้ครบ 6 Styles × 8 Palettes พร้อมเปิด Safezone Guide และก็อป HTML Snippet ไปใช้ทันที)
- **คำสั่งขอคำแนะนำ 3 แพ็กเกจฉากจากไอเดียคลิป:**
  ```powershell
  python tools/hfs_kit/recommender/reco.py "ไอเดียหรือสคริปต์คลิป" [--channel doctorbank|theviral]
  ```

### 4. กฎเหล็ก Viewport Safezone (ป้องกันการตกขอบขวา 100%)
1. **ล็อกความกว้างแนวนอน 952px:** บน Canvas 1080x1920 กล่อง `.hfs-content-slot` ต้องใช้ `position: absolute; left: 64px; right: 64px; top: 400px; height: 980px;` เสมอ **ห้ามใส่ `position: relative` ทับเด็ดขาด**
2. **Global Border-Box:** บังคับใช้ `*, *::before, *::after { box-sizing: border-box; }` เพื่อไม่ให้ Padding ดันกล่องบวมล้นจอ
3. **Safe Vertical Budget:** 0-180px Safe Top, 180-370px Header, 400-1380px Content, 1420-1580px Subtitles, 1580-1920px Safe Bottom

📖 **อ่านคู่มือสเปกโค้ดละเอียดทุกซีน:** [`docs/HFS_MASTER_GUIDE.md`](file:///c:/My%20Claw/Viral%20VDO%20Editing%20(VVE)/docs/HFS_MASTER_GUIDE.md)

---

## ⚙️ Engine v3 — Scene-Spec Composer (kit v3.1.0)

คลิปใหม่ **ไม่ต้องเขียน HTML/GSAP เอง**: เขียนสเปก JSON แล้วให้ตัวประกอบสร้างโปรเจกต์ที่ผ่าน lint (ไม่เรนเดอร์ — เรนเดอร์ยังเป็นขั้นที่บอสสั่ง):
```powershell
python tools/hfs_kit/compose/hfs_compose.py <spec.json> --out <โฟลเดอร์>
```
- สเปก/ตัวอย่าง: [`tools/hfs_kit/compose/README.md`](file:///c:/My%20Claw/Viral%20VDO%20Editing%20(VVE)/tools/hfs_kit/compose/README.md), `example_spec.json` (16 component + ซับ + กล่อง keyword)
- **ท่าเคลื่อนไหวกลาง:** [`tools/hfs_kit/hfs_motion.js`](file:///c:/My%20Claw/Viral%20VDO%20Editing%20(VVE)/tools/hfs_kit/hfs_motion.js) — `enter/stagger/exit/scene/shake/flash/count/draw/morph/wipe/glitch/pulse/fxLayer/finish` บุคลิกต่อสไตล์อยู่ที่ `kit.json → motion.styles` (viral = กระแทก, luxury = ช้านุ่ม ฯลฯ)
- **กฎเหล็กของ kit:** ห้าม CSS animation/transition (HyperFrames seek ทีละเฟรม มองไม่เห็น) · ฟอนต์ทั้งหมดอยู่ใน `fonts/` (`fonts.css` ต้อง `@import` เป็นตัวแรกของ bundle — `@import` หลังกฎอื่นถูกเมินเงียบๆ) · component ไม่ฝัง `top`/`transform` (ตำแหน่งมาจาก layer)
- **เสียง:** ทุกท่าปล่อย cue ตาม `kit.json → motion.cues` → ตัวประกอบวาง SFX CC0 ลงเลน 6/7 อัตโนมัติ (`sfx/LICENSES.md`)
- **Lint v2** (`python tools/hfs_kit/lint/hfs_lint.py <html> [channel]`): 9 กฎ + ตามไปตรวจ CSS ที่ลิงก์/`@import`; ส่วน dev chrome ครอบด้วย `hfs-lint:ignore-start/end`


### Engine v3.2 - Scene dressing + QA (V14.42.0)
- `hfs_compose.py` dresses every scene (camera creep, halo, dust, opaque-bg backdrop/grid) via `HFS.dress()`; opt out with `"dress": false` (spec or scene). Config per style: `kit.json motion.styles.*.dress`.
- One-command QA: `python tools/hfs_kit/qa/hfs_qa.py` (add `--static` to skip the browser, `--styles viral,hud`, `--shots`). Run it after ANY kit change - it composes and loads all 6 styles; one style alone hides bugs.

---

## 🧭 Motion Router Integration (Alpha-Safe Layering)

เมื่อต้องการกราฟิกหรือโอเวอร์เลย์เพิ่มเติมนอกเหนือจาก 25 คลังหลักของ HFS Kit ให้ค้นหาผ่าน Motion Router ด้วย `--skill hfs`:
```powershell
node tools/motion-pick.js "<ชื่อองค์ประกอบหรือหน้าที่>" --skill hfs [--lane 2|3|4] [--look clinical-luxury]
```
- **Shelf Priority:** `kit > reg > opus > cat > tc` (หยิบ HFS Kit ก่อน ตามด้วย HyperFrames Registry ที่ผ่าน Alpha-Safe Filter)
- **Alpha-Safe Enforced:** บังคับกรองเฉพาะคอมโพเนนต์ที่โปร่งใสเจาะรูได้ (`alpha_safe: true`) สำหรับเลเยอร์ Track 3 (Bento/Charts) และ Track 4 (Overlays Top) เพื่อนำไปเรนเดอร์เป็น ProRes 4444 Alpha ชั้นเดียวนำเข้า CapCut ตามสถาปัตยกรรม Spine & Skin

