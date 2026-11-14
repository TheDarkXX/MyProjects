---
name: shopeereel
description: >-
  Shopee Affiliate FB Reels & Google Flow Omni 10s UGC Video Engine (/shopeereel, alias: /spreel, /reel) — แปลงลิงก์ Shopee (รวม Shortlink s.shopee.co.th) หรือชื่อสินค้า เป็นชุดพรอมต์ IMAGE + VIDEO สำหรับ Google Flow Omni 10 วินาที (3 ช็อต: Hook 0-3s, Detail 3-6s, Payoff 6-10s) พร้อม 4 Guard Locks จาก PD App, ตัวเลือก 18 โครงเรื่อง / 86 สไตล์ / 7 ฉากมาตรฐาน, ชุดแคปชั่น 3 บรรทัด + รหัสแคมเปญ 16NOV26FBRAD ล่าโบนัส FB Reels 50K และ AdBoost 90-100% ใช้เมื่อ: /shopeereel [URL หรือชื่อสินค้า]
---

# 🎬 Skill: `/shopeereel` — Shopee Affiliate FB Reels & Omni 10s UGC Video Engine

> **Canonical Engine for Shopee Affiliate Short-Form Video (`FACEBOOK · REELS` + `FB Reels 50K Mission`)**
> เปลี่ยนลิงก์สินค้า Shopee ให้เป็นชุดพรอมต์สร้างคลิป **Google Flow Omni 10 วินาที (3 ช็อตต่อเนื่อง)** + ภาพนิ่ง Reference 9:16 + แคปชั่น 3 บรรทัดและรหัสแคมเปญ `Sub_id1` สำหรับล่าโบนัส 3 กระเป๋า
> **Aliases:** `/spreel`, `/reel`
> **Master Prompts Reference:** [`10M_Project/Shopee_Aff/06_UGC_Omni_And_PD_Vids_Master_Prompts.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/06_UGC_Omni_And_PD_Vids_Master_Prompts.md)

---

## ⚡ 1. Quick Start & Commands

```bash
# 1. สร้างพรอมต์ Omni 10s + ชุดโพสต์ FB Reels จากลิงก์ Shopee (โหมดมาตรฐาน: คายพรอมต์ Copy-Ready)
/shopeereel https://s.shopee.co.th/2BGM5rcFij

# 2. ระบุเพจเป้าหมาย + ฉาก + โครงเรื่อง
/shopeereel https://s.shopee.co.th/XXXXX --channel mom --scene 1 --struct problem_solution
/shopeereel "กระทะไฟฟ้า 4 หลุม" --channel dad --scene 6 --struct demo_howto

# 3. ต่อซีนที่ 2+ (Extend Sequence 10s ถัดไป โดยห้ามเปิด Hook ใหม่ / ห้าม Unbox ซ้ำ)
/shopeereel --extend 2

# 4. สั่งเรนเดอร์เข้า FlowKit อัตโนมัติ (ต้องเปิด Chrome + flow.google.com + FlowKit Backend ก่อน)
/shopeereel https://s.shopee.co.th/XXXXX --render
```

---

## 🎯 2. กฎแคมเปญ `FACEBOOK · REELS` & `FB Reels 50K Mission` (ห้ามพลาด)

อ้างอิงจาก [`10M_Project/Shopee_Aff/03_FB_Reels_50K_Mission_Rules.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/03_FB_Reels_50K_Mission_Rules.md) และ [`README_Campaign_Brief.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/Campaigns/2026-11-16_30_16NOV26FBRAD/README_Campaign_Brief.md):

1. **รหัส `Sub_id1` บังคับ:** ใช้รหัสของรอบแคมเปญ Reels เท่านั้น (เช่น `16NOV26FBRAD`) ห้ามใช้ปนกับโพสต์รูป (`16NOV26FBSPCAD`)
2. **รูปแบบชื่อแคมเปญใน FB Ads Manager:** `16NOV26FBRAD_<Sub_id2>_<ชื่อสินค้าสั้น>` (เช่น `16NOV26FBRAD_P01R01_กระทะ4หลุม`)
3. **กฎโพสต์ FB Reels:** ตั้งโพสต์ **Public** + **ติด Product Tag Shopee** + ลิงก์ตรงในแคปชั่น 3 บรรทัด
4. **เกณฑ์ยิงแอด & Pause Gate:**
   - งบเทสคลิปละ `฿50 – ฿60/วัน`
   - เมื่อแตะ **`≥ 55 Shopee Visitors / คลิป`** (`~72 FB Link Clicks`) ให้กด **`Pause` (ห้าม `Delete`)** เพื่อเก็บโควตา 150 คลิป (฿50,000)
   - คุมโซนปลอดภัยทั้งพอร์ต: **`CPC ≤ ฿0.70`**, **`CTR ≤ 4.89%`**, **`CR ≥ 0.78%`**

---

## 🛠️ 3. ขั้นตอนการทำงาน (Execution Pipeline)

### Step 1: สกัดข้อมูลสินค้า & Clean Ref
- ถ้าผู้ใช้ส่งลิงก์ Shopee ให้รัน `python tools/shopee_extractor.py "<URL>"` เพื่อดึงชื่อสินค้า, ราคา, คะแนน, จุดขายจริง และภาพสินค้าความละเอียดสูง
- ถ้าผู้ใช้ส่งแค่ชื่อสินค้าหรือข้อความ ให้สกัด/สรุปคุณสมบัติเด่น 2–3 ข้อที่แก้ Pain Point ได้ตรงจุด
- **ตั้งชื่อย่อ (`ShortName`):** ย่อชื่อสินค้าให้เหลือ **3–4 คำธรรมชาติ** (ห้ามอ่านชื่อเต็ม SKU/รหัสสินค้า/คำโฆษณาในวงเล็บ)

### Step 2: เลือก Persona, ฉาก และโครงเรื่อง
- **4 Master Channels** (**Default หลัก: `mom` แม่น้ำชา มีลูกชาย 2 คน** — ใช้ช่องนี้เป็นหลักก่อนเสมอ เว้นแต่ผู้ใช้ระบุ `--channel` อื่น):
  - `mom` *(Primary Default)*: แม่น้ำชา มีลูกชาย 2 คน (ของใช้แม่บ้าน/ครัว/ประหยัดเวลาเช้า/สินค้าครอบครัว)
  - `dad`: พ่อบ้านปากแซ่บ (แกดเจ็ตแก้ขี้เกียจ/เครื่องมือ/ของมันส์ๆ)
  - `homebody`: มนุษย์ติดบ้าน (มินิมอล/เด็กหอ/คอนโด/จัดห้อง)
  - `luxury100`: ชีวิตติดหรู ตังค์ติดตัวหลักร้อย (ดูแพงเกินราคา/คุ้มค่า)
- **7 ฉากมาตรฐาน (`--scene 1..7`):**
  1. `Live สด` — ห้องไลฟ์ ringlight สินค้าโชว์เด่น
  2. `โกดัง` — ยืนข้างชั้นวางคลังสินค้า ฟีลส่งตรงจากโกดัง
  3. `โรงงาน` — ยืนข้างสายพานผลิต
  4. `ห้าง` — ยืนข้างชั้นวางในห้างหรู
  5. `ตลาดสด` — ยืนข้างแผงตลาดไทย คึกคัก
  6. `มือ POV` — เห็นแค่มือถือสินค้ารีวิว ไม่เห็นหน้า
  7. `บ้านหรูหรา` — บ้าน/คอนโดหรู แสงอบอุ่น พรีเมียม
- **คลังตัวเลือกเสริม:** รองรับ 18 โครงเรื่อง (`problem_solution`, `hard_sell`, `before_after`, `asmr_satisfying`, `demo_howto`, `pai_ya`, `warehouse_hands` ฯลฯ) และ 86 สไตล์ฉากจาก `06_UGC_Omni_And_PD_Vids_Master_Prompts.md`

### Step 3: บังคับใช้ 4 Guard Locks + กฎเหล็ก Omni 10s
ทุกพรอมต์ที่สร้างต้องผ่านเงื่อนไขต่อไปนี้ 100%:

1. **NO-RENDER Default:** ห้ามแอบเจนรูป/วิดีโอเอง เว้นแต่ผู้ใช้สั่ง `--render` (ให้เรียก FlowKit `/flow` เฉพาะตอนสั่ง `--render`)
2. **Zero On-Screen Text & Price Tags:** ห้ามมีข้อความ/ซับไตเติล/ราคา/% ปลอมในภาพและวิดีโอ (ซับไทยไปแปะใน CapCut ทีหลัง)
3. **No Banned Claims & No Children:** ห้ามคำการันตี (`100%`, `รับประกัน`), ห้ามคำการแพทย์ (`รักษา`, `cure`), ห้ามมีเด็ก/ทารก
4. **Product-Only Dialogue:** บทพูดไทยต้องพูดถึง **ตัวสินค้าและจุดขายจริงเท่านั้น** ห้ามชวนกดไลก์/กดติดตามเพจ/ช่อง ห้ามใส่ `#` หรือชื่อเพจ ปิดท้ายแค่ชวนกดตะกร้า/เช็กลิงก์
5. **4 PD App Guard Locks (ฝังใน Prompt):**
   - `ShortName Lock`: เรียกชื่อสินค้าแค่ 3–4 คำ
   - `Ref Lock`: ใช้ภาพแนบเป็นอ้างอิงหน้าตาเท่านั้น ห้ามแปะภาพนิ่งต้นฉบับเปิดหัวคลิป ห้ามเปลี่ยนแพ็กเกจ (ขวดเป็นซอง ฯลฯ)
   - `Model vs Product Lock`: ถ้าภาพสินค้ามีนางแบบ/นายแบบติดมา ให้ระบุชัดเจนว่าใช้เฉพาะตัวสินค้า ส่วนคนในคลิปต้องใช้หน้า Model Ref หรือเห็นแค่มือ
   - `Extend Prefix` (เฉพาะ `--extend 2+`): ห้ามเปิด hook ใหม่ ห้าม unbox ซ้ำ ห้ามใส่ CTA ปิดการขายถ้าไม่ใช่ฉากจบ

---

## 📦 4. รูปแบบ Output มาตรฐาน (Copy-Ready Format)

> **กฎการจัดวาง Code Block:** บรรทัด ````text` และ ```` ต้องชิดซ้ายสุด (ห้ามย่อหน้า/ใส่ bullet ครอบ) เพื่อให้ปุ่ม Copy ใน UI ทำงานได้ทุกบล็อก

### ส่วนที่ 1: 🖼️ IMAGE PROMPT (9:16 First Frame Reference)
```text
[Persona] ... (Thai reviewer, age/vibe matching channel, natural skin)
[Action] ... (High-energy LIVE host pose or POV hands holding/pointing to product)
[Product] ... (Exact appearance. The product must appear exactly as shown in the reference image. Do not modify, redesign, or change the product's appearance, packaging, or branding in any way.)
[Realism] ... (Cinematic 4K, authentic smartphone UGC realism, natural skin texture, 5 fingers)
[Scene] ... (Matching chosen scene with natural depth)
[Camera] ... (Rule of Thirds, product clearly visible 20-30% of frame)
[Framing] ... (Vertical 9:16, medium / medium close-up)
[Negative] no text, no watermark, no deformed fingers, no fake price tags, no children
```

### ส่วนที่ 2: 🎬 VIDEO PROMPT (Google Flow Omni 10s — 3 Shots)
```text
[OMNI — image to video, 10 seconds, multi-shot UGC review]
Keep her/his face and the product identical across every shot. Do not paste the reference photo as a static opening frame. No text or letters anywhere in the video.
3 quick shots, continuous Thai voiceover:
0-3s — [HOOK] medium selfie, excited, shows the <ShortName>, opening line.
3-6s — [DETAIL] CUT to a close-up of the <ShortName> detail, hand pointing, key selling point.
6-10s — [PAYOFF] CUT back to using it, happy reaction, points down to the cart.
[SPOKEN — Thai, continuous, lip-synced] "<บทพูดไทยกระชับ 10 วินาที เรียกชื่อสินค้าสั้นๆ 3-4 คำ ห้ามพูดชื่อช่อง/กดติดตาม ปิดชวนกดตะกร้า>"
[STYLE] Authentic UGC TikTok, realistic, vertical 9:16, snappy cuts, handheld selfie feel, clear Thai voice, no music.
[NEGATIVE] no on-screen text, no captions, no watermark, no deformed fingers, no children.
All dialogues must be in Thai language only.
```

*(กรณีสั่ง `--extend 2+` ให้แทรก Prefix บังคับความต่อเนื่องไว้บรรทัดบนสุดของ `VIDEO PROMPT` และเปลี่ยนบทพูดเป็นจุดขายข้อใหม่ที่ไม่ซ้ำซีนแรก)*

### ส่วนที่ 3: 📱 FB Reels Post & Ads Kit (`16NOV26FBRAD`)
- **Ads Campaign Name:** `16NOV26FBRAD_<Sub_id2>_<ShortName>`
- **Caption 3 บรรทัด (Above-the-Fold):**
  1. บรรทัด 1: Hook หยุดนิ้ว (ตาม Persona เพจ)
  2. บรรทัด 2: จุดเด่นแก้ปัญหาใน 1 ประโยค (ไม่บอกราคา)
  3. บรรทัด 3: Price Curiosity CTA + ลิงก์ตรงติด `Sub_id1=16NOV26FBRAD`
- **Hashtags:** 5–8 ตัวที่เกี่ยวข้อง
- **Text Overlay สำหรับแปะใน CapCut (Optional):** ข้อความพาดหัวสั้น 3–5 คำ (ไม่ใส่ใน AI Video)

---

## 🔗 5. การเชื่อมต่อไปยัง FlowKit (`/flow`) เมื่อสั่ง `--render`

หากผู้ใช้สั่ง `--render` ให้ตรวจสอบสถานะ FlowKit ก่อนเสมอ:
```powershell
python "C:\My Claw\The Viral\FlowKit\flow_cli.py" status
```
หาก Offline ให้แจ้งผู้ใช้เปิด Chrome + `flow.google.com` + `start.bat` แล้วส่ง Image/Video Prompt เข้าคิว `9:16` ตามคู่มือ [`/flow`](file:///c:/My%20Claw/Openclaw-VPS/.agents/skills/flow/SKILL.md)
