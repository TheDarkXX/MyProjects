---
name: fbspyshopee
description: >-
  Facebook Reels Shopee Affiliate Competitor Spy and Deconstructor Engine (/fbspyshopee, alias /fbspy, /reelspy) — ดูดคลิป Facebook Reels คู่แข่งพร้อมแยกไฟล์เสียง .mp3, สับเฟรม /vdogrid HD (0.5s สำหรับคลิป <=15s และ 1.0s สำหรับคลิป >15s เพื่อโคลนซีนแม่นยำ), ดึงสถิติแยกครบ 4 ฟิลด์ระดับหลักหน่วย (Views, Reactions, Comments, Shares), ล้วงป้ายตะกร้า Product Tag คลายลิงก์ s.shopee.co.th เป็น shop_id/item_id, เช็กค่าคอมมิชชั่นชนกับ Master Pool 605 รายการ + เชื่อม DrBank AFF Scout Extension ดึงค่าคอมสดจาก offer/product_offer/<item_id>, ถอดสคริปต์บทพูดคำต่อคำด้วย FB Auto-Captions (0.1s) + Flash Audio (ไร้ Whisper) และบันทึกลง Custom Spy Pool (spy_competitor_pool.json รหัส aidrb1611s001..s999)
---

# 🕵️‍♂️ `/fbspyshopee` — Facebook Reels Shopee Affiliate Competitor Spy & Clone Engine

สกิลสายลับดูด-ผ่า-ลอกการบ้านคลิป Facebook Reels ที่แปะตะกร้า Shopee (`Commission eligible`) แบบครบวงจรในคำสั่งเดียว ไม่ต้องเสียเวลาไปงมหาสินค้าเอง และไม่ต้องรัน CPU Whisper ให้ช้า

---

## ⚡ 1. คำสั่งเรียกใช้งาน
- `/fbspyshopee <URL คลิป Facebook Reel 1..N ลิงก์>`
- `/fbspy <URL>` หรือ `/reelspy <URL>`
- รันผ่าน CLI โดยตรง:
  ```powershell
  python tools/fb_reel_spy.py "<URL_1>" "<URL_2>"
  ```

---

## 🛠️ 2. มาตรฐาน 5 สเตปเหล็กของ `/fbspyshopee`

### สเตปที่ 1: ดูด MP4 + แยก `.mp3` + สับเฟรม `/vdogrid` ตามสูตรโคลนซีน AI
- ดาวน์โหลดวิดีโอความละเอียดสูงสุด (`.mp4`) พร้อม `.info.json` ลงใน `10M_Project/Shopee_Aff/assets/viral_reels_audit/`
- **กฎเหล็กการตั้งค่า `/vdogrid` เพื่อให้ AI แกะโคลนซีนได้แม่นที่สุด (ไม่ถี่เกินจนภาพเล็กเบลอ และไม่ห่างเกินจนตกหล่นคัต):**
  1. **คลิปสั้น `≤ 15 วินาที` (เช่น Omni 10s / Veo 8–10s):** ใช้ **`--interval 0.5 --res hd`** (ได้ 20–30 เฟรม ขนาดช่องละ `450×800px` จับรอยตัดซีนทุก 1.5–2 วินาทีและจังหวะมือขยับได้ครบ 100%)
  2. **คลิปยาว `16 – 30 วินาที` (เช่น คลิปต่อ 2 ท่อน 20s–27s):** ใช้ **`--interval 1.0 --res hd`** (ได้ 20–27 เฟรม ภาพต่อช่องยังใหญ่คมชัด ไม่โดน AI ย่อส่วน)

### สเตปที่ 2: ดึงสถิติ Engagement แยกครบ 4 ฟิลด์ระดับหลักหน่วย (`Zero Approximation`)
เจาะ Relay JSON ของหน้าเว็บ Facebook Reel ผ่าน `curl.exe` (`0.8 วินาที/คลิป` ไม่ต้องเปิด Browser):
1. **`fb_views` (`view_count`):** ยอดวิวจริงระดับหลักหน่วย (จาก `.info.json`)
2. **`fb_reactions` (`unified_reactors.count`):** ยอดกดไลก์/หัวใจจริงระดับหลักหน่วย
3. **`fb_comments` (`total_comment_count`):** ยอดคอมเมนต์จริงระดับหลักหน่วย
4. **`fb_shares` (`share_count_reduced`):** ยอดแชร์จริง

### สเตปที่ 3: เจาะป้ายตะกร้า `Product Tag` (`Commission eligible`) & คลายลิงก์ Shopee
- ดึงคีย์ `"link_uri"`, `"title"`, และ `"image_uri"` จากบล็อกป้ายตะกร้าในหน้าเว็บ Reels:
  - ได้ **ชื่อป้ายตะกร้าที่คู่แข่งตั้งล่อคลิก (`product_tag_title`)**
  - ได้ **ลิงก์สั้นของคู่แข่ง (`https://s.shopee.co.th/XXXXX`)** และ **`competitor_affiliate_id`**
  - ยิง `curl.exe -sI` คลายลิงก์สั้นออกเป็น **`shop_id`** และ **`item_id`** (`https://shopee.co.th/product/<shop_id>/<item_id>`) ทันที
- *(กรณีพิเศษ: หากคลิปไหน `product_tags` ว่างเปล่า แปลว่าคู่แข่งไม่ได้ติดป้ายตะกร้าบนคลิปแต่แอบวางลิงก์ไว้ในคอมเมนต์แรก ให้ใช้ Subagent `browser` เปิดกดดูคอมเมนต์เฉพาะคลิปนั้น)*

### สเตปที่ 4: เช็กค่าคอมมิชชั่นอัตโนมัติ 2 ชั้น (`Pool 605 Match` + `Offer Portal Live Check`)
1. **ชั้นที่ 1 — เช็กชนกับ `Master Pool 605 รายการ` (`0.01 วินาที`):**
   - นำ `item_id` ไปเทียบกับ [`apps/aff/data/campaign-16nov26-pool.json`](file:///c:/My%20Claw/Openclaw-VPS/apps/aff/data/campaign-16nov26-pool.json)
   - หากตรงกับสินค้าใน Pool (เช่น `SP550410` เตาถังแอร์): ดึง **`ราคา` + `Extra Comm %` + `คอมสุทธิ (บาท/ชิ้น)` + `ลิงก์ s.shopee.co.th ของเราเอง`** ขึ้นมาแสดงทันทีพร้อมยิงแอด!
2. **ชั้นที่ 2 — เช็กค่าคอมสินค้าใหม่จาก `offer/product_offer/<item_id>`:**
   - สร้างลิงก์ตรง `https://affiliate.shopee.co.th/offer/product_offer/<item_id>`
   - หากต้องการดึงเรตค่าคอมสด (`Base %`, `Extra %`, `บาท/ชิ้น`, `ยอดขาย/เดือน`) และเจนลิงก์ `s.shopee.co.th` อัตโนมัติ ให้สั่งรันผ่านสะพาน **`DrBank AFF Scout Chrome Extension` (`C:\My Claw\MyProjects\DrBank-AFF-Toolkit`)** หรือเปิดผ่าน `browser` ที่ล็อกอิน `affiliate.shopee.co.th` ไว้ ซึ่งจะยิง API ภายใน `GET /api/v3/offer/product/list?item_id=<item_id>` และ `POST /api/v3/gql?q=batchCustomLink` ดึงค่าคอมและเจนลิงก์สั้นเข้าพอร์ตเราทันที!

### สเตปที่ 5: ถอดสคริปต์บทพูดคำต่อคำ 2 ชั้น (`ไร้ CPU Whisper`) + บันทึกลง `Custom Spy Pool`
1. **การถอดบทพูด (`0.1s – 2.0s`):**
   - **ชั้นที่ 1 (`0.1 วินาที`):** ดึงซับไตเติลภาษาไทยแท้จากเซิร์ฟเวอร์ Facebook (`automatic_captions['th_TH']` ใน `.info.json` ซึ่งมีอยู่ใน ~80% ของคลิป Reels)
   - **ชั้นที่ 2 (`2.0 วินาที`):** สำหรับคลิปที่ไม่มีซับ FB หรือต้องการวิเคราะห์โทนเสียง/ดนตรีคลอ ให้ใช้ **`read_file` อ่านไฟล์ `.mp3` ใน Antigravity แบบ Built-in ฟรี 100%** (หรือใช้ Gemini Flash Audio) ห้ามรัน CPU Whisper เด็ดขาด
2. **การจัดเก็บเข้าคลังแยก (`SET6_SPY_COMPETITOR_POOL`):**
   - บันทึกพารามิเตอร์ทั้งหมดลงใน **[`10M_Project/Shopee_Aff/spy_competitor_pool.json`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/spy_competitor_pool.json)** และตาราง **[`rules/10_Spy_Competitor_Pool_Ledger.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/rules/10_Spy_Competitor_Pool_Ledger.md)**
   - กำหนดรหัส `Sub_id2` เฉพาะสำหรับสาย Spy คือ **`aidrb1611s001` .. `aidrb1611s999`** (ตัว `s` = `Spy Set`) แยกจาก `aidrb1611a001..a605` ชัดเจน ไม่ปะปนกัน แต่สามารถกดส่งเข้าตาราง `aff_skus` / `aff_subids` บนเว็บ `aff.doctorbankonline.com` และปั้นโฟลเดอร์ `Products/SPxxxxxx_...` ด้วย `node tools/shopee_product_vault.cjs` ได้ทันที!
