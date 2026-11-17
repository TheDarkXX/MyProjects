---
name: shopeereel
description: >-
  Shopee Affiliate FB Reels & Google Flow Omni UGC Content Factory v2.1 (/shopeereel, alias: /spreel, /reel) — สร้าง Per-Product Asset Vault แยกตาม SKU (01_raw_shopee -> 02_clean_refs QC/Crop -> 03_first_frames ยิง /gptimage เจน 3 ภาพตั้งต้น 9:16 พร้อมบริบทสินค้าเต็ม -> 04_videos + 00_Product_Master_Card.md + INDEX_ALL_PRODUCTS.md) พร้อมชุดพรอมต์ IMAGE + VIDEO Omni 10s/15s, 4 Guard Locks, และแคปชั่น 3 บรรทัด + รหัส 16NOV26FBRAD
  และโหมด --gem 11 (Thai Raw Action Reels มือกลางท่า บ้านไทยดิบ พากย์ไทยนอกจอ) ที่เขียนแถว TSV 7 คอลัมน์เฉพาะงาน Gen Image & Video (`ID · Product · Ref · Short Story · IMAGE_PROMPT · SB_PROMPT · VIDEO_PROMPT`) + Section กางบท VO ใต้ตาราง ลง production_tables ของแคมเปญ ด้วยรหัสสั้น `nov-xxx` พร้อม Pure JS Linter และ Chat Silence Rule
  ใช้เมื่อ /shopeereel [sub2/SKU/URL หรือชื่อสินค้า] หรือ /shopeereel [sub2] --gem 11
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

# 6. โหมด Gem #11 (Thai Raw Action Reels) → แถว TSV ลง production_tables ของแคมเปญ (ดูหัวข้อ 6)
node tools/shopee_product_vault.cjs --sub2 aidrb1611a013 --gem 11 --tpl A --batch 01            # 10s 4 ช็อต เสียงแม่บ้าน F30-40
node tools/shopee_product_vault.cjs --sub2 aidrb1611a013 --gem 11 --tpl C --channel dad --ver 02 # 15s 5 ช็อต เสียงพ่อบ้าน M35-45
node tools/shopee_product_vault.cjs --lint-table <ไฟล์ production_tables/G11_*.md>              # ตรวจตารางแบบออฟไลน์ ไม่ยิง API
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
4. **Product-Only Dialogue:** บทพูดไทยต้องพูดถึง **ตัวสินค้าและจุดขายจริงเท่านั้น** ห้ามชวนกดไลก์/กดติดตามเพจ/ช่อง ห้ามใส่ `#` หรือชื่อเพจ ปิดท้ายแค่ชวนกดตะกร้า/เช็กลิงก์ (โหมดเดิมเท่านั้น · **`--gem 11`: คลิป 10s ห้ามมี CTA ในเสียงพากย์** 15s ใช้ได้แค่ "ดูในตะกร้าได้เลย" คำชวนซื้อย้ายไปอยู่ในแคปชั่น)
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

---

## 🧪 6. โหมด Gem #11 (`--gem 11`) — Thai Raw Action Reels → Production Table

> **สไตล์ (แหล่งเดียว):** [`11_Gem11_Thai_Raw_Action_Reels_Master.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/11_Gem11_Thai_Raw_Action_Reels_Master.md) (System Instruction = `raw_instruction` ของ `gem11_thai_raw_action_reels` ใน [`gems_399_registry.json`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/gems_399_registry.json) ต้องตรงกันทุกตัวอักษร)
> **กฎบท VO:** [`12_Viral_10_Reels_Script_Deconstruction.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/12_Viral_10_Reels_Script_Deconstruction.md) (SF-1..6 · H1–H9 · E1–E6 · งบตัวอักษร)
> **ตัวอย่างตาราง:** [`G11_20261116_sample.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/Campaigns/2026-11-16_30_16NOV26FBRAD/production_tables/G11_20261116_sample.md)

### Workflow
1. **Resolve สินค้า** จาก Main Pool (`apps/aff/data/campaign-16nov26-pool.json`) และ Spy Pool (`10M_Project/Shopee_Aff/spy_competitor_pool.json` เช่น `aidrb1611s003`) ด้วย `--sub2` / `--sku` / `--url` → Vault เดิม (`01_raw_shopee` → `02_clean_refs`) ใช้ซ้ำได้จาก cache
2. **โหลด Gem จาก registry** (`loadGemFromRegistry`) → ใช้ `raw_instruction` เป็นคำสั่งระบบให้ Codex แต่บังคับตอบเป็น JSON slot (Archetype/Story/Mode, INVARIANTS, ช็อต, VO, แคปชั่น) ทั้งใน System และ User Prompt แล้ว cache ไว้ใน `product_info.json` → `gem11_briefs[CLIP_ID]`
3. **ประกอบพรอมต์ด้วยโค้ด** (ไม่ปล่อยให้ LLM จัดรูปเอง): First Frame (`FF`) ตาม STEP 2 · Storyboard 2×2 (`SB`) ถ้า `MODE = SB` · Video ตามเทมเพลต `A` (10s 4 ช็อต) / `B` (10s 3 ช็อต) / `C` (15s 5 ช็อต) พากย์ไทยนอกจอ ไม่ลิปซิงก์
4. **เสียงตามเพจ:** `--channel mom` (ค่าเริ่มต้น) = `F30-40` แม่บ้าน 30–40 · `--channel dad` = `M35-45` พ่อบ้าน 35–45
5. **Lint ด้วย Pure JS (`lintGem11Row`)**: 7 คอลัมน์เฉพาะงาน Gen Image & Video (`ID`, `Product`, `Ref`, `Short Story`, `IMAGE_PROMPT`, `SB_PROMPT`, `VIDEO_PROMPT`) · พรอมต์ทุกตัวขึ้นต้นด้วย `[ID]` · `Ref` ในเซลล์ TSV เป็นชื่อไฟล์ภาพสั้นๆ (ห้ามใส่ path ยาวในเซลล์) · งบตัวอักษรที่พูดจริงไม่นับวรรค (ดึงจาก `[SPOKEN]` ใน `VIDEO_PROMPT`: 10s ≤ `130` · 15s ≤ `185`) · คำต้องห้าม/CTA/คำอ้างสุขภาพ · "ทอด"/"ผัด" ต้องมีในชื่อสินค้า · ห้ามเหลือ `<...>` · ห้าม `\t`/`\n` ในเซลล์ · ต้องมี negative ฉลากฉากหลัง + ข้อยกเว้นฉลากบนตัวสินค้า
6. **Upsert แถว & ลิงก์ภาพคลิกเปิดได้ 100% (`upsertGem11Rows`)**: เขียนลง `10M_Project/Shopee_Aff/Campaigns/2026-11-16_30_16NOV26FBRAD/production_tables/G11_<YYYYMMDD>_batch<NN>.md` (`ID` ซ้ำ = แทนแถวเดิม) โดยระบบต้องแปลง `Ref` (`<ID>_FF.png`) และ `SB` (`<ID>_SB.png` เมื่อมี) เป็น **ลิงก์ `file:///` คลิกเปิดดูรูปใน DrView ได้จริง** (`[\`<ID>_FF.png\`](file:///...)`) ไว้ทั้ง 2 จุด: (ก) บรรทัด `> **🖼️ คลิกเปิดดูภาพ Ref จริง:**` เหนือตาราง และ (ข) ทุกหัวข้อ `### 🎬 <ID>` ในหมวด `## 🗣️ บทพากย์ (VO) แยกตาม ID` ใต้ตาราง · พร้อมเพิ่มหัวข้อ `## 🎞️ 8. Gem #11 Production Rows` ใน `00_Product_Master_Card.md` (ให้คลิกไฟล์ `03_first_frames/<ID>_FF.png` / `_SB.png` และลิงก์กลับตารางได้เช่นกัน)
7. **เจนภาพ** `03_first_frames/<ID>_FF.png` (+ `<ID>_SB.png`) ผ่าน `/gptimage` เว้นแต่สั่ง `--skip-gen` · **ไม่เรนเดอร์วิดีโอเอง** วิดีโอที่ได้จาก Flow ให้เซฟเป็น `04_videos/<ID>.mp4`

### ID & ไฟล์
| สิ่งของ | รูปแบบ | ตัวอย่าง |
| :--- | :--- | :--- |
| `ID` (รหัสสั้น) | `<เดือน>-<เลขท้าย sub_id2>` | `nov-013` / `nov-444` / `nov-s003` |
| First Frame / Storyboard | `03_first_frames/<ID>_FF.png` · `_SB.png` | `nov-013_FF.png` |
| วิดีโอ | `04_videos/<ID>.mp4` | `nov-013.mp4` |

`--ver` = เวอร์ชัน A/B ของคลิปเดิม (`-v2`, `-v3`) · `--batch` = เลขไฟล์ตารางของวันนั้น

### 🔇 Chat Silence Rule (กฎเหล็กแบบ `/table`)
- เวลาทำงานกับ Gem #11 ให้ **เขียนลงไฟล์ `production_tables/G11_*.md` เท่านั้น** ห้ามพ่น TSV, พรอมต์ IMAGE/SB/VIDEO หรือบทยาวลงแชท
- ตอบในแชท **ไม่เกิน 4 บรรทัด**: (1) ลิงก์ไฟล์ตาราง (2) จำนวนคลิปแยกตาม A/B/C (3) แถวที่ lint ไม่ผ่าน/คำเตือนสำคัญ (เช่น VO เกินงบ) (4) ขั้นถัดไป
- ข้อยกเว้น: ผู้ใช้ขอดูพรอมต์ของแถวไหนเป็นการเฉพาะ (เทียบเท่าเมนู `[5] full` ของ Gem) ค่อยกางเฉพาะแถวนั้น
- Gem #11 บนเว็บ Gemini ใช้โหมด Compact TSV (1 แถว 7 คอลัมน์เฉพาะงาน Gen Image & Video ไม่มี header + กางบท VO ด้านล่าง) ส่วนข้อมูล Ads/ลิงก์/ค่าคอมแยกเก็บใน Pool/Sheet ไม่เอามาปนในตารางเจนภาพ-วิดีโอ

---

## 🏆 7. โหมด `SB6` (3×2 6-Panel Grid) + 2-Scene (3+3 Cuts) & ตารางสถานะ 7 คอลัมน์ในแชท

เมื่อผู้ใช้สั่งทำคลิปแบบ **ครบสูตร 6 ช็อต (`SB6`)** หรือสั่ง **`/shopeereel table`** / **`กางตาราง`** ให้รันตามมาตรฐานนี้ 100%:

### 7.1 สูตรเจนภาพตาราง 6 ช่อง (`<ID>_SB6.png`) & Auto-Slicer (`tools/shopee_meta_pipeline.py`)
1. **เจนแผ่นตาราง `3 คอลัมน์ × 2 แถว` (รวม 6 ช่องแนวตั้ง 9:16 ในแผ่นเดียว):**
   - ใช้ `node tools/gpt-image.cjs --ar 9:16` แนบรูปสินค้าจริงจาก `02_clean_refs/` ทั้งหมด เพื่อล็อกทรงสินค้า โลโก้ ปุ่ม มือคน แสงไฟ และฉากหลังให้ตรงกันทั้ง 6 ช่อง 100%
   - **แถวบน (`Panel 1–3`):** จังหวะเตรียมของ ➔ ปิดฝา/ใส่เครื่อง ➔ กดปุ่ม/เร่งไฟทำงาน (สำหรับ **Scene 1: 0–10s · 3 คัต**)
   - **แถวล่าง (`Panel 4–6`):** จังหวะเปิดฝาเห็นผลลัพธ์ ➔ โชว์ฟีเจอร์ถอดล้าง/วัสดุ ➔ Money Shot ตัก/ราด/คีบโชว์หน้ากล้อง (สำหรับ **Scene 2: 10–20s · 3 คัต**)
2. **หั่นภาพอัตโนมัติไร้ขอบขาว 3 รูปแบบพร้อมกัน:**
   - แผ่นเต็ม: `<ID>_SB6.png`
   - แบ่งครึ่งบน-ล่าง: `<ID>_SB6_top.png` (Scene 1) และ `<ID>_SB6_bot.png` (Scene 2)
   - ภาพเดี่ยว `9:16` (`720×1280`): `<ID>_s6_p1.png` ถึง `<ID>_s6_p6.png`
3. **ตัดหางเงียบท้ายซีน + เฟดเสียงรอยต่อ (`trim_and_concat_two_scenes`):**
   - เมื่อได้คลิป 10s ของทั้ง 2 ซีน (จาก Google Flow Omni หรือ Meta AI) ให้รัน `shopee_meta_pipeline.py` เพื่อตัดเดดแอร์ท้ายซีนอัตโนมัติ + เชื่อม `acrossfade=d=0.08` ออกเป็น `04_videos/combined_<ID>_omni_trimmed.mp4`

### 7.2 กฎเหล็กการพ่น "ตารางคิว 7 คอลัมน์ (เวอร์ชันแรกสุด)" ลงในแชท
ทุกครั้งที่เจน/หั่นภาพเสร็จ หรือเมื่อผู้ใช้สั่ง **`กางตาราง`** / **`/shopeereel table`** ต้องรัน `python "C:\My Claw\Openclaw-VPS\tools\shopee_meta_pipeline.py" --table` และพ่นตาราง **7 คอลัมน์ (แยก Scene 1 และ Scene 2 คนละคอลัมน์ชัดเจน ห้ามยุบรวม)** ลงในแชทตามโครงสร้างนี้เป๊ะ:

| # | รหัสคลิป | สินค้า (มุมคอนเทนต์) | ภาพต้นฉบับ (`FF` / `SB` / `SB6`) | 🔹 รูปแนบ Scene 1 (`0–10s`) | 🔸 รูปแนบ Scene 2 (`10–20s`) | สถานะ |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: |
| **1** | **`<ID>`** | ชื่อสินค้า + มุมคอนเทนต์ | ลิงก์ `FF.png` · `SB6.png` (`top`/`bot`) | ลิงก์ `s6_p1.png` + `p2.png` + `p3.png` | ลิงก์ `s6_p4.png` + `p5.png` + `p6.png` | 🏆 ลิงก์คลิป `.mp4` หรือ 🟢 พร้อมยิง |

> 📌 **เหตุผลที่ห้ามยุบคอลัมน์:** การแยกคอลัมน์ `ภาพต้นฉบับ`, `🔹 รูปแนบ Scene 1`, `🔸 รูปแนบ Scene 2`, และ `สถานะ` ออกจากกัน ทำให้คลิกตรวจรูปทีละซีนและหยิบไฟล์เข้า Flow / Meta AI ได้ทันทีโดยไม่ตาลาย
