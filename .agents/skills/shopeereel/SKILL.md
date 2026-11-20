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
> **Master Prompts Reference:** [`10M_Project/Shopee_Aff/rules/06_UGC_Omni_And_PD_Vids_Master_Prompts.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/rules/06_UGC_Omni_And_PD_Vids_Master_Prompts.md)
> **Vault Registry:** [`10M_Project/Shopee_Aff/Products/INDEX_ALL_PRODUCTS.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/Products/INDEX_ALL_PRODUCTS.md)

---

## ⚡ 1. Quick Start & Default Routing Rule

> 🚨 **กฎเลือกโหมดอัตโนมัติ (Default Mode Priority — ป้องกันสับสนโหมดเก่า vs โหมดใหม่):**
> 1. **เมื่อผู้ใช้สั่งด้วยรหัสคลิป (`nov-xxx`), สั่ง `"ทำครบสูตร"`, หรือสั่ง `"กางตาราง"` / `table`:** ให้ใช้ **โหมดที่ 7 (`SB6–8` Dynamic 6–8 Panels + 2-Scene 10s+10s + ตารางสถานะ 6 คอลัมน์)** เป็น **ค่าเริ่มต้นหลัก (Primary Default)** เสมอ!
> 2. **เมื่อผู้ใช้สั่ง `--gem 11` เพื่อออกตาราง TSV ชุดใหญ่เข้า Sheet:** ให้ใช้โหมดที่ 6 (`shopee_product_vault.cjs --gem 11`)
> 3. **โหมดดั้งเดิม (Legacy 3 First Frames เห็นหน้าคนลิปซิงก์ในหัวข้อ 3–4):** ใช้เฉพาะเมื่อผู้ใช้สั่ง `--mode same` / `--mode diverse` หรือระบุชัดเจนว่าเอาคลิปคนพูดหน้ากล้องเท่านั้น

```bash
# 🔥 [PRIMARY DEFAULT] โหมด SB6–8 (6–8 ช่องตามบริบท) + 2 ซีน (10s+10s) + ตารางสถานะ 6 คอลัมน์ (ดูหัวข้อ 7)
python "C:\My Claw\Openclaw-VPS\tools\shopee_meta_pipeline.py" --table
python "C:\My Claw\Openclaw-VPS\tools\shopee_meta_pipeline.py" --gen-sb6 nov-013-v3
python "C:\My Claw\Openclaw-VPS\tools\shopee_meta_pipeline.py" --merge nov-013 "Y:\Download\scene1.mp4" "Y:\Download\scene2.mp4"

# 1. รัน Full Content Vault Pipeline จาก Pool Sub2 / SKU / URL (ดึงรูป Shopee HD + Vision QC/Crop ลง 02_clean_refs/)
node tools/shopee_product_vault.cjs --sub2 aidrb1611a013 --skip-gen
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

อ้างอิงจาก [`10M_Project/Shopee_Aff/rules/03_FB_Reels_50K_Mission_Rules.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/rules/03_FB_Reels_50K_Mission_Rules.md) และ [`README_Campaign_Brief.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/Campaigns/2026-11-16_30_16NOV26FBRAD/README_Campaign_Brief.md):

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

> **สไตล์ (แหล่งเดียว):** [`rules/11_Gem11_Thai_Raw_Action_Reels_Master.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/rules/11_Gem11_Thai_Raw_Action_Reels_Master.md) (System Instruction = `raw_instruction` ของ `gem11_thai_raw_action_reels` ใน [`gems_399_registry.json`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/gems_399_registry.json) ต้องตรงกันทุกตัวอักษร)
> **กฎบท VO:** [`rules/12_Viral_10_Reels_Script_Deconstruction.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/rules/12_Viral_10_Reels_Script_Deconstruction.md) (SF-1..6 · H1–H9 · E1–E6 · งบตัวอักษร)
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

### 🔇 Chat Silence Rule (กฎเหล็กห้ามพ่นตารางหรือกล่อง Prompt ลงแชทโดยไม่สั่ง!)
- **ค่าเริ่มต้น (Default = เขียนลงไฟล์ `.md` เท่านั้น):** ทุกครั้งที่รันสร้าง Vault, เจนภาพ `SB6–8`, หรือรัน `--gem 11` ให้บันทึกตารางและกล่อง Prompt ทั้งหมดลงไฟล์ `.md` (`Meta_AI_2Scene_10s_Ready_Prompts.md`, `00_Product_Master_Card.md`, หรือ `production_tables/G11_*.md`) เงียบๆ เท่านั้น **ห้ามพ่นก้อน TSV, ห้ามพ่นตารางสถานะ 6 คอลัมน์, และห้ามกางกล่อง Prompt ยาวๆ ลงในแชทเองเด็ดขาด!** (ในแชทให้ตอบสรุปสั้นๆ พร้อมลิงก์คลิกเปิดไฟล์ `.md` และลิงก์รูป `SB6` เท่านั้น)
- **พ่นเฉพาะเมื่อผู้ใช้สั่งเจาะจงเท่านั้น (On-Demand Only):**
  1. **สั่ง `table` / `กางตาราง` (`/shopeereel table`):** จึงค่อยพ่น **ตารางสถานะ 6 คอลัมน์ (ตามหัวข้อ 7.5)** ลงในแชท
  2. **สั่ง `prompt` / `ขอดูพรอมต์` / `กางพรอมต์`:** จึงค่อยกาง **บล็อก Prompt ของ Scene 1 และ Scene 2 พร้อมลิงก์รูป (`top`/`bot` และ `p1..p6`)** ลงในแชท!

---

## 🏆 7. โหมด `SB6–8` (Dynamic 6–8 Panel Grid ตามบริบทสินค้า) + 2-Scene (10s+10s) & ตารางสถานะ 6 คอลัมน์

เมื่อผู้ใช้สั่งทำคลิปแบบ **ครบสูตร 2 ซีน (`SB6` / `SB7` / `SB8`)** หรือสั่ง **`/shopeereel table`** / **`กางตาราง`** ให้เลือกจำนวนช่อง (`6–8 ช่อง`) ตามบริบทจริงของสินค้าโดยไม่ฟิกตายตัว:

### 7.0 เกณฑ์ตัดสินใจเลือกจำนวนช่อง (`6`, `7`, หรือ `8` Panels ตามบริบทสินค้า)
- **`SB6` (`3×2 Grid` = 6 ช่อง · ซีนละ `3 + 3 คัต` · ช็อตละ `~3.3s`):**
  - **ใช้เมื่อ:** สินค้ามีขั้นตอนชัดเจนและต้องการให้คนดูเห็นจังหวะเครื่องทำงานต่อเนื่อง (เช่น ปั่นหมู/น้ำจิ้ม, ต้มสุกี้/พะโล้เดือดปุดๆ, ตีหมูเด้ง) ไม่ตัดถี่เกินไปจนไม่เห็นความเปลี่ยนแปลงของวัตถุดิบ
- **`SB7` (บน 4 + ล่าง 3 · Free-Layout Collage):**
  - **ใช้เมื่อ:** ซีนแรกต้องสับไว 4 จังหวะ (ใส่ของ/ประกอบหลายขั้น) แต่ซีนสองต้องการแช่ผลลัพธ์ + ฟีเจอร์ + Money Shot 3 จังหวะ
  - ✅ **ทดสอบจริงแล้ว (`nov-013-v3_SB7_test.png`):** เจนบน `--ar 9:16` ด้วยสูตร Gem 3 (ปล่อยให้โมเดลจัดเลย์เอาต์เอง) ได้ 4 ช่องบน + 3 ช่องล่างกว้างกว่า **ไม่มีช่องว่าง** สินค้า/มือ/ฉากตรงกันทุกช่อง ตัวหั่นนับได้ 4+3 ถูกต้อง
- **`SB8` (บน 4 + ล่าง 4 · Free-Layout Collage):**
  - **ใช้เมื่อ:** สินค้ามีลูกเล่น/อะไหล่หลายชิ้น หรือต้องการจังหวะ Fast-Cut รัวทั้งคลิป
  - เจนบน `--ar 9:16` ด้วยสูตรเดียวกับ SB7 ได้เลย (ไม่ต้องใช้ 1:1)

> 📐 **สองสูตรเจนแผ่น (เลือกตามปลายทาง):**
> - **สูตร Grid เท่ากัน (`SB6` เดิม):** สั่ง "3 columns x 2 rows equal grid" → ไฟล์จริง `1024×1536` · หั่นเป็น 9:16 `720×1280` ได้ (ครอปบน-ล่างทิ้ง ~20%) → ใช้ได้ทั้ง **Meta AI** (ต้องการ Frame 0 แบบ 9:16) และ Flow
> - **สูตร Free-Layout Collage (Gem 3 · `SB7`/`SB8` และใช้กับ 6 ได้):** สั่ง "vertical 9:16 collage with N panels · upper half = Scene 1 · lower half = Scene 2 · white gutter at exact middle" → ช่องจะผอม (สัดส่วน ~0.26–0.38) **ห้ามครอปเป็น 9:16** (หายครึ่งภาพ) → ตัวหั่นเก็บสัดส่วนเดิม (`fit_9x16=False`) · **ปลายทางหลัก = Google Flow Omni แนบ `top.png` / `bot.png`** (สูตร A ที่พิสูจน์แล้ว)
> - **วาง Action สำคัญไว้กลางช่องเสมอ** อย่าให้มือ/สินค้าชิดขอบ
> 🔧 **ขอบเขตโค้ดตอนนี้:** `--gen-sb6` เจนอัตโนมัติได้เฉพาะ `SB6` · `SB7`/`SB8` ให้เจนผ่าน `gpt-image.cjs --ar 9:16` ด้วยพรอมต์ด้านล่าง ตั้งชื่อ `<ID>_SB7.png` / `<ID>_SB8.png` แล้ว `slice_auto_storyboard` (ตรวจร่องขาวกลางแผ่น + นับช่องแต่ละครึ่งอัตโนมัติ) / `--table` / `--merge` รับต่อให้เอง · คลิปใหม่ต้องเพิ่มพรอมต์วิดีโอใน `CURATED_2SCENE_PROMPTS` ก่อนรัน Meta CDP

### 7.1 คำสั่งรันอัตโนมัติครบวงจร (`tools/shopee_meta_pipeline.py`)
```powershell
# 1. เจนภาพตาราง 6–8 ช่อง (<ID>_SB6.png / SB7 / SB8) + หั่น top/bot & ภาพเดี่ยว 9:16 (720x1280) + อัปเดต Prompt + พ่นตาราง 6 คอลัมน์
python "C:\My Claw\Openclaw-VPS\tools\shopee_meta_pipeline.py" --gen-sb6 nov-013-v3
python "C:\My Claw\Openclaw-VPS\tools\shopee_meta_pipeline.py" --gen-sb6 all

# 2. ตัดหางเงียบท้ายซีน + เฟดเสียง 0.08s รวม 2 ซีนจาก Flow Omni + พ่นตาราง 6 คอลัมน์อัปเดตสถานะทันที
python "C:\My Claw\Openclaw-VPS\tools\shopee_meta_pipeline.py" --merge nov-013 "Y:\Download\scene1.mp4" "Y:\Download\scene2.mp4"

# 3. กางตารางสถานะ 6 คอลัมน์ลงในแชท (แผ่น SB คอลัมน์ 5 + ไฟล์ .mp4 ในคอลัมน์สถานะท้ายสุด)
python "C:\My Claw\Openclaw-VPS\tools\shopee_meta_pipeline.py" --table
```

### 7.2 สูตรเจนภาพตาราง `6–8 ช่อง` (`<ID>_SB6.png` / `_SB7.png` / `_SB8.png`) & Auto-Slicer
1. **พรอมต์ SB6 (Grid เท่ากัน · `--ar 9:16` ได้ไฟล์จริง 1024×1536):**
   - ยิง `node "C:\My Claw\DoctorBank-Brand\tools\gpt-image.cjs" --ar 9:16` พร้อมแนบรูปสินค้าจริงจาก `02_clean_refs/clean_*.jpg` ทุกรูป เพื่อล็อกทรงสินค้า โลโก้ ปุ่ม มือคน แสงไฟ และฉากหลังให้ตรงกันทุกช่อง 100%
   ```text
   One image composed of exactly SIX equal vertical 9:16 photographs arranged in a 3 columns x 2 rows grid, separated only by thin solid white gutters about 1.5% wide. Zero text, zero numbers, zero labels anywhere except the real printed brand logo on the product.
   All panels are consecutive moments filmed on a smartphone in the same real lived-in Thai kitchen under natural daylight 5400K, same adult Thai hands, same sleeve, showing the EXACT SAME product from the reference images.
   ROW 1 (Top Row — Scene 1: 0–10s · 3 Cuts):
   - Panel 1..3: เตรียม/ใส่วัตถุดิบ ➔ ปิดฝา/ประกอบเครื่อง ➔ กดปุ่ม/หมุนสวิตช์ทำงานจริง
   ROW 2 (Bottom Row — Scene 2: 10–20s · 3 Cuts):
   - Panel 4..6: เปิดฝาโชว์ผลลัพธ์ ➔ โชว์จุดขายวัสดุ/ถอดล้างง่าย/ไม่ติดหม้อ ➔ ECU Money Shot ตัก/ราด/คีบโชว์หน้ากล้อง
   ```
   **พรอมต์ SB7 / SB8 (Free-Layout Collage สูตร Gem 3 · `--ar 9:16` · ทดสอบผ่านแล้ว):**
   ```text
   Create a realistic vertical 9:16 storyboard collage with <SEVEN|EIGHT> panels (1..N) for a Thai home-cooking product video. Read order: left to right, top to bottom.
   LAYOUT: The UPPER HALF holds panels 1-4 (Scene 1). The LOWER HALF holds panels 5-<7|8> (Scene 2). A clear thin white horizontal gutter separates the two halves exactly at the vertical middle of the image. Inside each half arrange the panels freely as tall vertical frames separated by thin white gutters; every panel must be fully visible, no empty cells, no blank space.
   STRICT PRODUCT LOCK: Use ONLY the <PRODUCT + INVARIANTS> from the reference images. Do not change shape, color, proportions, logo or any detail. Identical in every panel.
   SAME SCENE IN ALL PANELS: real lived-in Thai kitchen, natural daylight 5400K, same adult Thai hands with <sleeve>, no face.
   Panel 1: ... Panel N: ...
   STYLE: raw Thai smartphone photos, real shadows, no color grading, mild sensor noise.
   NEGATIVE: no text, no letters, no numbers, no numbered circles, no doodles, no stickers, no watermark (except the real logo printed on the product), no product redesign, no extra fingers, no empty panel.
   ```
   > ⚠️ ตัดของ Gem 3 ต้นฉบับออก 3 อย่าง (ขัดกับสไตล์ Raw Thai ของเรา): วงกลมเลข 1–N, ฟอนต์ลายมือ/Doodle, ฉาก Korean Minimal พาสเทล
2. **หั่นภาพอัตโนมัติไร้ขอบขาวใน `03_first_frames/` (`slice_3x2_storyboard_grid` สำหรับ SB6 · `slice_auto_storyboard` สำหรับ SB7/SB8):**
   - แผ่นรวม: `<ID>_SB6.png` (หรือ `_SB7.png` / `_SB8.png`)
   - แบ่งครึ่งบน-ล่าง: `<ID>_SB6_top.png` (Scene 1) และ `<ID>_SB6_bot.png` (Scene 2)
   - ภาพเดี่ยว `9:16` (`720×1280` ไร้ขอบขาว 100%): `<ID>_s6_p1.png..p6.png` (หรือ `s7_p1..p7` / `s8_p1..p8`)

### 7.3 โครงสร้าง VIDEO PROMPT 2 ซีน (`10s + 10s = 20s` · ซีนละ `3` หรือ `4` คัต ตามจำนวนภาพ) & ฟอร์แมตตาราง Excel-Like TSV
บันทึกอัตโนมัติลงใน [`Meta_AI_2Scene_10s_Ready_Prompts.md`](file:///C:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/Campaigns/2026-11-16_30_16NOV26FBRAD/production_tables/Meta_AI_2Scene_10s_Ready_Prompts.md) เสมอ โดยในไฟล์ `.md` ต้องจัดเป็น **ตาราง ````tsv` แบบ Excel-Like Table** แยก Section ตามสินค้า (`SKU 1..N`) และแยกย่อยตามเพจ (`porbaan/v1..v3` และ `homebody/v4..v6`) คอลัมน์ครบ (`ID · Folder · Wave · Menu_Hook · Status · Ref_S1 · Ref_S2 · VO_Scene1 · VO_Scene2 · SB6_PROMPT · SCENE1_PROMPT · SCENE2_PROMPT`) เพื่อให้คลิกคัดลอกเซลล์ใน DrView / Google Sheets ได้ในคลิกเดียว **(ห้ามกางกล่อง Prompt ลงในแชทเองเด็ดขาด ยกเว้นเมื่อผู้ใช้สั่ง `prompt` / `ขอดูพรอมต์` / `กางพรอมต์` เท่านั้น):**
- **ทางเลือกโยนรูปเข้า Flow Omni (Ingredient Mode — ใช้ได้ทั้ง 2 สูตร):**
  - **สูตร A (แบ่งครึ่งแผ่น):** Scene 1 แนบ `<ID>_SB6_top.png` (1 รูป) · Scene 2 แนบ `<ID>_SB6_bot.png` (1 รูป)
  - **สูตร B (ภาพเดี่ยว `9:16` `720×1280`):** Scene 1 แนบ `s6_p1.png` + `p2.png` + `p3.png` · Scene 2 แนบ `s6_p4.png` + `p5.png` + `p6.png`
- **จังหวะแบ่งช็อตใน Prompt:**
  - **ซีนละ 3 คัต (`3 Panels`):** `0.0–3.3s SHOT 1` · `3.3–6.6s HARD CUT — SHOT 2` · `6.6–10.0s HARD CUT — SHOT 3`
  - **ซีนละ 4 คัต (`4 Panels`):** `0.0–2.5s SHOT 1` · `2.5–5.0s HARD CUT — SHOT 2` · `5.0–7.5s HARD CUT — SHOT 3` · `7.5–10.0s HARD CUT — SHOT 4`
```text
[VIDEO — image to video, 10 seconds, 3 shots, hands-only, vertical 9:16]
Use the 3 attached images as the exact keyframes for Shot 1, Shot 2, and Shot 3. Never show any collage, grid, or still image. Keep the <PRODUCT_EN + INVARIANTS> identical in all 3 shots. Hands only, no face, raw handheld Thai smartphone footage.
0.0–3.3s SHOT 1 [45° POV close, matching Image 1]: <Action 1>.
3.3–6.6s HARD CUT — SHOT 2 [medium close, matching Image 2]: <Action 2>.
6.6–10.0s HARD CUT — SHOT 3 [ECU, matching Image 3]: <Action 3>.
[AUDIO] Off-screen Thai voiceover (<VOICE>), natural fast conversational pace, starts at 0.0s and runs continuously to the end, never cut off. <Diegetic SFX> underneath. No music.
[SPOKEN — Thai, off-screen narrator, no lip-sync] "<บทพากย์ไทยธรรมชาติ 85–110 ตัวอักษรต่อซีน ตัวเลขเขียนคำไทย>"
[NEGATIVE] no on-screen text, no captions, no watermark, no grid lines, no product morphing, no extra fingers, no slow motion, no music, nobody talking on camera, no face. All dialogues must be in Thai language only.
```

### 7.4 กฎเหล็กตรวจคลิป Flow Omni & ตัดหางเงียบท้ายซีน (`trim_and_concat_two_scenes`)
เมื่อผู้ใช้ส่ง Path ไฟล์ `.mp4` จาก `Y:\Download\...` มาให้ในแชท ต้องทำตามลำดับนี้ 100%:
1. **สับเฟรม `1 fps Contact Sheet` ส่องภาพจริงก่อนเสมอ (`fps=1,scale=270:480,tile=5x2`):**
   - เพื่อระบุให้แม่นยำว่าไฟล์ไหนคือ **Scene 1** และไฟล์ไหนคือ **Scene 2** (ห้ามเดาจากลำดับที่วางในแชท หรือกรณีมีไฟล์คลิปอื่นปนมาจะได้คัดแยกถูก) และตรวจ QC ว่าไม่มีขอบตารางขาวหลุดเข้ามา
2. **ห้ามตัดเสียงกลางคลิปเด็ดขาด (Boundary-Only Silence Trim):**
   - ห้ามใช้ `silenceremove` หั่นกลางประโยคเพราะจะทำให้คำพูดขาดและภาพกระตุก ต้องใช้ `trim_and_concat_two_scenes(s1_path, s2_path, raw20s_out, trimmed_out)` ซึ่งวัด `detect_speech_end()` เพื่อตัดเฉพาะ **เดดแอร์ท้ายซีน (Tail Silence)** เท่านั้น แล้วเชื่อมรอยต่อด้วย `acrossfade=d=0.08:c1=tri:c2=tri` ออกเป็น `04_videos/combined_<ID>_omni_trimmed.mp4`
3. **กฎ `9:16 Aspect Ratio Lock (720×1280)` สำหรับภาพหั่นย่อย (`_fit_panel_to_9x16`):**
   - ภาพเดี่ยวทุกใบที่หั่นจากตาราง (`p1..p8`) ต้องบังคับ Center-Crop + Resize เป็น `720×1280` (`9:16` เป๊ะ) เสมอ เพราะถ้าสัดส่วนเพี้ยนเป็น `3:4` AI (โดยเฉพาะ Meta AI) จะไม่ยอมล็อกเป็น Frame 0
4. **กรณีรันผ่าน Meta AI Playwright CDP (`:9222`):**
   - ดึงพอร์ตตามลำดับ `:9225` (Bot Chrome) → `:9222` → `User Data/DevToolsActivePort`, ใช้ `:visible` selector เท่านั้นเพื่อข้าม hidden `<textarea>`, เช็ก `len(text) >= 20` ก่อนกดส่ง และหากเจอ `"video generation quota is exhausted"` หรือ `"You reached your limit"` ให้หยุดและแจ้งสลับมาใช้ Google Flow Omni ทันที

### 7.5 ท่อ Meta Auto Extension v1.4.1, 3-Tier Video QA & มาตรฐาน 3 บัญชี (`DRB` · `Namcha` · `Ashira`)
> **คัมภีร์ฉบับเต็ม (Single Source of Truth):** [`rules/16_Master_Batch_Production_Posting_And_3Account_Bible.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/rules/16_Master_Batch_Production_Posting_And_3Account_Bible.md)

1. **ไม่ต้องพ่นตารางรอเจน 2 โหมดลงแชทแล้ว:** ให้บันทึกตาราง Excel-Like ````tsv` ลง `Meta_AI_2Scene_10s_Ready_Prompts.md` แล้วส่งคิวผ่าน **`Meta Auto Extension v1.4.1`** (`python tools/meta_ext_bridge.py` ที่ `http://127.0.0.1:8765`) โดยแนบไฟล์เดี่ยวไร้ขอบขาว (`p1..p3` ซีน 1 · `p4..p6` ซีน 2) ห้ามแนบ `2x2 Clean Ref Grid` เด็ดขาด!
2. **ผัง 3 บัญชี × 6 เพจ (`<page>/v<N>/` + บังคับ `-v1` เสมอ):**
   - `DRB` (`aidrb...`): `porbaan/v1..v3` + `homebody/v4..v6` (มือชาย + เสียงชายวัย 45–50)
   - `Namcha` (`ainam...`): `namcha2kids/v7..v9` + `luxury100/v10..v12` (มือหญิงสะอาด + เสียงป้าข้างบ้าน 45–55 ซื่อๆ บ้านๆ)
   - `Ashira` (`aiash...`): `ashira_p1/v13..v15` + `ashira_p2/v16..v18` (กฎดองสิทธิ์ พ.ย. ห้ามยิงเกิน 20 vis/วัน หรือ 30 ออเดอร์)
3. **กฎ `TTS-Safe Thai Karaoke`:** บทพากย์ `110–120 ตัวอักษร/ซีน` (ไม่นับวรรค), **ห้ามใช้ไม้ยมก `ๆ` 100%**, แปลงคำทับศัพท์เป็นคำอ่านไทยอ่านคล่อง แต่ **ห้ามลดเกรดสเปกจริง** (เช่น ห้ามแก้ `สเตนเลส` เป็น `เหล็ก`)
4. **รวมคลิป + ตรวจจับผิดวิดีโอตาทิพย์ 3 เกรด + ซ่อมเฉพาะซีน (`Single-Scene Repair-Merge`):**
   ```powershell
   python "C:\My Claw\Openclaw-VPS\tools\shopee_meta_pipeline.py" --merge-queue
   python "C:\My Claw\Openclaw-VPS\tools\shopee_video_qa.py" --queue-failed
   ```
   - แบ่งเกรด `🟢 PASS` / `🟡 MINOR (ปล่อยผ่านลงแอดได้)` / `🔴 CRITICAL (ส่งเฉพาะซีนที่พังเข้าคิวซ่อม Meta Auto)`
5. **สูตรคัดสินค้าทำเงิน (`v2.14.0`):** ใช้ `2-Stage Signal Gate` (`extra > 0`, `คอม ≥ ฿20`, `ยอดขาย > 0`, `Grade A: ขาย ≥ 100` / `Grade B: คอม ≥ ฿100 & ราคา ≤ ฿3,000 & ขาย ≥ 30`) + กด `🔎 หาร้านขายดีแทน` (`Best-Shop Swap`) สำหรับคลิปไวรัลที่ร้านต้นฉบับยอดขาย 0!
