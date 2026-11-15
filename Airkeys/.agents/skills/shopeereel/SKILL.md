---
name: shopeereel
description: >-
  Shopee Affiliate FB Reels & Google Flow Omni UGC Content Factory v2.0 (/shopeereel, alias: /spreel, /reel) — สร้าง Per-Product Asset Vault แยกตาม SKU (01_raw_shopee -> 02_clean_refs QC/Crop -> 03_first_frames ยิง /gptimage เจน 3 ภาพตั้งต้น 9:16 พร้อมบริบทสินค้าเต็ม -> 04_videos + 00_Product_Master_Card.md + INDEX_ALL_PRODUCTS.md) พร้อมชุดพรอมต์ IMAGE + VIDEO Omni 10s/15s, 4 Guard Locks, และแคปชั่น 3 บรรทัด + รหัส 16NOV26FBRAD ใช้เมื่อ: /shopeereel [sub2/SKU/URL หรือชื่อสินค้า]
---

# 🎬 Skill: `/shopeereel` — Shopee Affiliate FB Reels & Per-Product Asset Vault Factory v2.0

> **Canonical Engine for Shopee Affiliate Short-Form Video (`FACEBOOK · REELS` + `FB Reels 50K Mission`)**
> ระบบโรงงานแยกโฟลเดอร์ถาวรต่อ 1 สินค้า (`10M_Project/Shopee_Aff/Products/<SKU>_<Slug>/`): ดึงรูปสินค้า HD หลายมุม Auto (Hybrid Extractor) ➔ รัน Codex Vision Recheck QC & Auto-Crop ➔ ส่งบริบทสินค้า + รูป Clean Refs ทั้งหมดให้ `/gptimage` ปั้นภาพตั้งต้น **3 รูป (`03_first_frames/`)** ➔ ออก `00_Product_Master_Card.md` พร้อมพรอมต์ Omni 10s/15s & แคปชั่น ➔ ผูก 2 ทางกับ Pool JSON และ `INDEX_ALL_PRODUCTS.md`
> **Aliases:** `/spreel`, `/reel`
> **Master Prompts Reference:** [`10M_Project/Shopee_Aff/06_UGC_Omni_And_PD_Vids_Master_Prompts.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/06_UGC_Omni_And_PD_Vids_Master_Prompts.md)
> **Vault Registry:** [`10M_Project/Shopee_Aff/Products/INDEX_ALL_PRODUCTS.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/Products/INDEX_ALL_PRODUCTS.md)

---

## ⚡ 1. Quick Start & Commands

```bash
# 1. รัน Full Content Vault Pipeline จาก Pool Sub2 / SKU / URL (Default: เจน 3 ภาพตั้งต้นมุมเดียวกันใน 03_first_frames/)
node tools/shopee_product_vault.cjs --sub2 aidrb1611a013
node tools/shopee_product_vault.cjs --sku SP078237 --channel mom --duration 10
node tools/shopee_product_vault.cjs --url https://s.shopee.co.th/2BGM5rcFij

# 2. โหมดสร้างภาพตั้งต้น 3 รูป (03_first_frames/)
node tools/shopee_product_vault.cjs --sub2 aidrb1611a013 --mode same     # Default (Option B): มุม UGC เดียวกัน 3 Variations ให้เลือกใบที่สวยที่สุด
node tools/shopee_product_vault.cjs --sub2 aidrb1611a013 --mode diverse  # Option A: 3 มุมต่างจิตวิทยา (UGC Hold / POV Action / Hero Result)

# 3. กรณีสินค้าเดิมมี Asset แล้ว — สร้างแค่ภาพ 03_first_frames ใหม่โดยใช้รูป 02_clean_refs เดิม (ไม่ต้องดึงใหม่)
node tools/shopee_product_vault.cjs --sku SP078237 --regen-frames --channel dad --duration 15

# 4. โหมดดึงข้อมูล + QC/Crop + สร้าง Master Card เฉยๆ ยังไม่ยิง /gptimage / อัปเดต Video Cover หลังโยนไฟล์เข้า 04_videos/
node tools/shopee_product_vault.cjs --sku SP078237 --skip-gen

# 5. ต่อซีนที่ 2+ หรือสั่งเรนเดอร์เข้า FlowKit อัตโนมัติ (เฉพาะตอนสั่ง --render)
/shopeereel --extend 2
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

## 🛠️ 3. ขั้นตอนการทำงาน (Execution Pipeline — Per-Product Asset Vault v2.0)

### Step 1: สกัดข้อมูลสินค้า + ดึงภาพหลายมุม & QC/Auto-Crop ลง Vault ถาวร
- รันคำสั่ง `node tools/shopee_product_vault.cjs --sub2 <id>` (หรือ `--sku <SP...>` / `--url "<Shopee URL>"`) เพื่อสร้างโฟลเดอร์ถาวร `10M_Project/Shopee_Aff/Products/<SKU>_<Slug>/`:
  - **`01_raw_shopee/` + `_raw_contact_sheet.jpg`**: Hybrid Extractor ดึงข้อมูลสินค้าจาก Pool/Extension/API + ดูดภาพสินค้า HD หลายมุมอัตโนมัติ (กรองทิ้งโฮสต์ที่ติด Login)
  - **`02_clean_refs/` + `_clean_contact_sheet.jpg`**: ส่งภาพดิบเข้า **Codex Vision (`gpt-5.6-sol`)** เพื่อ QC แบนเนอร์ 11.11/ป้ายราคา/ตัวหนังสือรก ตรวจความถูกต้องเชิงฟิสิกส์ สกัดสเปกจากภาพไทย พร้อมใช้ **`sharp`** ครอปขอบให้เหลือตัวเครื่องสะอาดบริสุทธิ์
  - **`03_first_frames/`**: ยิง `tools/gpt-image.cjs --ar 9:16` โดยป้อน **Full Product Context + สเปก + Clean Multi-Angle Refs ทั้งชุด + IMAGE PROMPT + 4 Guard Locks** เพื่อเจนภาพตั้งต้น **3 ใบ** (`--mode same` เจนมุม UGC เดียวกัน 3 Variations เป็นค่าเริ่มต้น หรือ `--mode diverse` เจน 3 มุมต่างกัน)
  - **`04_videos/` + `00_Product_Master_Card.md` + `INDEX_ALL_PRODUCTS.md`**: รวมรูป Clean/Gen, พรอมต์ Omni Copy-Ready, แคปชั่น 3 บรรทัด, ไฟล์ MP4 + ปกคลิปอัตโนมัติ พร้อมผูก `vault_dir` กลับเข้า `apps/aff/data/campaign-16nov26-pool.json` ครบวงจร
- **เกณฑ์คัดสินค้าทำเงิน (อ้างอิงจาก `DrBank_V1_Signal_500items.xlsx` เทียบกระดาน Exther):**
  - **ยอดขาย:** `≥ 1,000 ชิ้น/เดือน` และสต๊อก `> 50 ชิ้น`
  - **ค่าคอมสุทธิ (คิดเป็นบาท/ชิ้น):** เกณฑ์หลัก `≥ 50 บาท/ชิ้น` (1–2 ชิ้นคืนทุนค่าแอดทันที) หรือเกณฑ์รอง `≥ 30 บาท/ชิ้น`
  - **เพดานราคาสินค้า:** `฿150 – ฿1,000` (ซื้อง่าย มือลั่นไว รักษา `CR ≥ 0.78%` ไม่ให้โดนตัดสิทธิ์โบนัส Reels 50K)
  - **เรทติ้งสินค้า:** `4.7 – 5.0 ★` (กด Cancel Rate ต่ำกว่า 4%)
- **ตั้งชื่อย่อ (`ShortName`):** ย่อชื่อสินค้าให้เหลือ **3–4 คำธรรมชาติ** (ห้ามอ่านชื่อเต็ม SKU/รหัสสินค้า/คำโฆษณาในวงเล็บ) และเก็บไว้ใน `short_name_th` ของ Pool JSON

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
ทุกพรอมต์และภาพตั้งต้นที่สร้างต้องผ่านเงื่อนไขต่อไปนี้ 100%:

1. **Image-First / Zero Auto-Video-Credit Spend:** `/gptimage` เจนภาพตั้งต้น 3 ตัวเลือกใน `03_first_frames/` (ฟรีผ่าน Codex Proxy Subscription) เพื่อให้คนเลือกใบที่เป๊ะสุดก่อน แต่ **ห้ามแอบสั่งเรนเดอร์วิดีโอ Google Flow กินเครดิตเอง** เว้นแต่ผู้ใช้สั่ง `--render` (ให้เรียก FlowKit `/flow` เฉพาะตอนสั่ง `--render`)
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

### ส่วนที่ 1: 🖼️ IMAGE PROMPT (9:16 First Frame Reference — 8 บรรทัดภาษาอังกฤษล้วน)
```text
[Persona] ...
[Action] ...
[Product] ... The product must appear exactly as shown in the reference image. Do not modify, redesign, or change the product's appearance, packaging, or branding in any way.
[Realism] ...
[Scene] ...
[Camera] ...
[Framing] ...
[Negative] no text, no watermark, no deformed fingers, no fake price tags, no children
```

### ส่วนที่ 2: 🎬 VIDEO PROMPT (Google Flow Omni 10s — โครงสร้างต้นฉบับ Gem เป๊ะ 10 บรรทัด: อังกฤษล้วน + ภาษาไทยเฉพาะใน `[SPOKEN]`)
```text
[OMNI — image to video, 10 seconds, multi-shot UGC review]
Keep her face and the product identical across every shot. No text or letters anywhere in the video.
3 quick shots, continuous Thai voiceover:
0-3s — [HOOK] medium selfie, excited, shows the product, opening line.
3-6s — [DETAIL] CUT to a close-up of the product detail, hand pointing, selling point.
6-10s — [PAYOFF] CUT back to her using/wearing it, happy reaction, points down to the cart.
[SPOKEN — Thai, continuous, lip-synced] "<บทพูดไทยต่อเนื่อง 10 วินาที เรียกชื่อสินค้าย่อ 3-4 คำในบทพูดโดยตรง ห้ามพูดชื่อช่อง/กดติดตาม ปิดชวนกดตะกร้า>"
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
