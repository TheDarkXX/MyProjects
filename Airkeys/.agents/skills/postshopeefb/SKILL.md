---
name: postshopeefb
description: >-
  Facebook Reels Shopee Affiliate Auto Poster and Scheduler Engine —
  โพสต์และตั้งเวลาคลิป Facebook Reels พร้อมปักตะกร้าสินค้า Shopee Affiliate
  (Add product link), เจนแคปชั่น Reels <= 35 ตัวอักษรหน้า See more,
  และแปะลิงก์พิกัดเม้นต์แรกอัตโนมัติ (รองรับทั้งโพสต์สดและคิวตั้งเวลา)
  ผ่านหน้า facebook.com/reels/create ด้วย Google Chrome จริงในเครื่อง
  แชร์โปรไฟล์จาก tools/tiktok-poster/data/profiles/ ใช้เมื่อ /postshopeefb
---

# 🛒 Skill: `/postshopeefb` (Facebook Reels + Shopee Product Tag + Caption + First Comment)

> **Slash Command:** `/postshopeefb [video_path] [--sku SP...] [--schedule "YYYY-MM-DD HH:MM"] [--channel name]`
> ตัวอย่าง:
> - `/postshopeefb "clip.mp4" --sku SP550410 --auto-caption --schedule "2026-11-18 19:00" --channel porbaan --ai-label --public`
> - `/postshopeefb "clip.mp4" "แคปชั่น..." "https://s.shopee.co.th/xxxxx" "2026-11-18 19:00" --channel namcha2kids --ai-label`
> - `/postshopeefb --flush-comments` (ไล่แปะเม้นต์แรกให้โพสต์ตั้งเวลาที่ถึงเวลาแล้ว)

ระบบโพสต์และตั้งเวลาวิดีโอ Facebook Reels ครบวงจรผ่าน `https://www.facebook.com/reels/create` (อ้างอิง Master Bible: [`16_Master_Batch_Production_Posting_And_3Account_Bible.md`](file:///c:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/16_Master_Batch_Production_Posting_And_3Account_Bible.md)):
1. **ปักตะกร้าสินค้า (`Add product`):** ใส่ `URL` + `Link name` อัตโนมัติ (ขึ้นป้าย `Commission eligible` + ป้ายตะกร้าบนคลิป) + เปิด `Add AI label = ON` + ตั้ง `Public` (และกรอกแคปชั่นตั้งแต่ **Step 1 `Edit`** ทันทีสำหรับ UI ใหม่แบบ `homebody`)
2. **สูตร `3-Line Caption` (`shopee_caption_gen.py`):**
   - บรรทัด 1: `{short_name_th} {opener ตามเพจ}`
   - บรรทัด 2: `📌 พิกัด: https://s.shopee.co.th/<unique_per_clip>`
   - บรรทัด 3: `#tag1 #tag2` (เคาะแยกบรรทัดล่างสุดเสมอ)
3. **สูตร `High-CTR First Comment` (1 เม้นต์ = 1 จิตวิทยา + `{คำเรียกสั้น}ตัวนี้`):**
   - หมุนเวียน 4 ฮุค (`ใครถามราคา กดดูตรงนี้เลย ถูกกว่าที่คิด 👇`, `นึกว่าหลักพัน กดดูหลักร้อยเฉย 👇` *(เฉพาะ < ฿1,000)*, `ตอนนี้มีคูปองลดเยอะมาก กดดูราคาตรงนี้ 👇`, `ตอนแรกนึกว่าแพง พอกดดูหลักร้อยเอง 👇` *(เฉพาะ < ฿1,000)*) + บรรทัด 2 วางลิงก์ `s.shopee.co.th` เฉพาะคลิปนั้น
   - **ตั้งเวลา (`--schedule`):** บันทึกคิวลง `tools/fb-poster/data/pending_comments.json` เพื่อรัน `--flush-comments` หรือ `reel_queue_worker.py --headless` แปะเม้นต์แรกเมื่อถึงเวลาโพสต์จริง
4. **กฎแยก 3 บัญชี 6 เพจ (ห้ามปักลิงก์ข้ามบัญชี!) & กฎ Ads Manager:**
   - `DRB` (`aidrb...`) ➔ `porbaan`, `homebody` | `Namcha` (`ainam...`) ➔ `namcha2kids`, `luxury100` | `Ashira` (`aiash...`) ➔ `ashira_p1`, `ashira_p2`
   - ตอนขึ้นแอด `Use Existing Post` (`12211...`) ใน Meta Ads Manager **ต้องติดปุ่ม CTA + ใส่ลิงก์ `s.shopee.co.th` เดียวกันใน Website URL ของแอดด้วยเสมอ!**

---

## 🛠️ โครงสร้างระบบ (Architecture)

* **Engine Script:** [`tools/fb-poster/uploader_shopee_fb.py`](file:///c:/My%20Claw/Openclaw-VPS/tools/fb-poster/uploader_shopee_fb.py)
* **Caption & Comment Generator:** [`tools/fb-poster/shopee_caption_gen.py`](file:///c:/My%20Claw/Openclaw-VPS/tools/fb-poster/shopee_caption_gen.py)
* **Profile Launcher (4 เพจหลัก):** [`tools/fb-poster/open_shopee_fb_profile.bat`](file:///c:/My%20Claw/Openclaw-VPS/tools/fb-poster/open_shopee_fb_profile.bat)
* **Chrome Profiles:** `tools/tiktok-poster/data/profiles/<channel>/` (`namcha2kids`, `porbaan`, `homebody`, `luxury100`)
* **Pending Comments Queue:** `tools/fb-poster/data/pending_comments.json`
* **Log & Screenshots:** `tools/fb-poster/data/logs/fb_shopee_upload_history.log` · `tools/fb-poster/data/screenshots/`

---

## ⚡ คำสั่งมาตรฐานสำหรับ Agent

1. **โหมดง่ายสุด (ดึงข้อมูลจาก SKU + เจนแคปชั่น + ปักตะกร้า + ตั้งเวลา + คิวเม้นต์แรก):**
```powershell
python "tools/fb-poster/uploader_shopee_fb.py" --video "C:\path\to\clip.mp4" --sku SP550410 --auto-caption --schedule "2026-11-18 19:00" --channel "porbaan" --ai-label --public --headless
```

2. **โหมดกำหนดแคปชั่น/ลิงก์เอง:**
```powershell
python "tools/fb-poster/uploader_shopee_fb.py" --video "C:\path\to\clip.mp4" --caption "แคปชั่น..." --product-url "https://s.shopee.co.th/xxxxx" --product-name "ชื่อสินค้า" --schedule "2026-11-18 19:00" --channel "namcha2kids" --ai-label --headless
```

3. **ไล่แปะเม้นต์แรกให้โพสต์ที่ตั้งเวลาไว้ (รันหลังถึงเวลาโพสต์):**
```powershell
python "tools/fb-poster/uploader_shopee_fb.py" --flush-comments --headless
```

4. **ดูตัวอย่างแคปชั่น + เม้นต์แรกอย่างเดียว (ไม่เปิดเบราว์เซอร์):**
```powershell
python "tools/fb-poster/shopee_caption_gen.py" --sku SP550410 --channel porbaan
```
