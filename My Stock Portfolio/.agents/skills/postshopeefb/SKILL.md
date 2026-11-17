---
name: postshopeefb
description: >-
  Facebook Reels Shopee Affiliate Auto Poster and Scheduler Engine —
  โพสต์และตั้งเวลาคลิป Facebook Reels พร้อมปักตะกร้าสินค้า Shopee Affiliate
  (Add product link) ผ่านหน้า facebook.com/reels/create ด้วย Google Chrome
  จริงในเครื่อง แชร์โปรไฟล์จาก tools/tiktok-poster/data/profiles/
  ใช้เมื่อ /postshopeefb
---

# 🛒 Skill: `/postshopeefb` (Facebook Reels + Shopee Affiliate Product Tagging)

> **Slash Command:** `/postshopeefb [video_path] [caption] [product_url] [schedule_datetime] [--channel name]`
> ตัวอย่าง:
> - `/postshopeefb "C:\path\to\video.mp4" "แคปชั่น..." "https://s.shopee.co.th/xxxxx" "2026-11-18 19:00" --channel bankxl --public`
> - `/postshopeefb "C:\path\to\video.mp4" "แคปชั่น..." "https://s.shopee.co.th/xxxxx" --dry-run` (ทดสอบไม่กดโพสต์จริง)

ระบบโพสต์และตั้งเวลาวิดีโอ Reels พร้อม **ปักตะกร้าสินค้า Shopee Affiliate (`Add product`)** ผ่าน `https://www.facebook.com/reels/create` (ซึ่งเป็นหน้าเดียวที่เปิดปุ่ม `Add affiliate product` คู่กับ `Scheduling options` ในตัว)

---

## 🛠️ โครงสร้างระบบ (Architecture)

* **Engine Script:** [`tools/fb-poster/uploader_shopee_fb.py`](file:///c:/My%20Claw/Openclaw-VPS/tools/fb-poster/uploader_shopee_fb.py)
* **Chrome Profiles:** แชร์ Profile ร่วมกับ `/postfb` และ `/posttt` ที่ `tools/tiktok-poster/data/profiles/<channel>/` (เช่น `bankxl`, `doctorbank`, `lungmhor`)
* **เพิ่มโปรไฟล์ใหม่ / ล็อกอิน:** รัน `python tools/fb-poster/setup_login_fb.py --channel <channel_name>`
* **Log ประวัติการโพสต์:** [`tools/fb-poster/data/logs/fb_shopee_upload_history.log`](file:///c:/My%20Claw/Openclaw-VPS/tools/fb-poster/data/logs/fb_shopee_upload_history.log)
* **Screenshots ผลลัพธ์:** `tools/fb-poster/data/screenshots/`

---

## ⚡ คำสั่งและการทำงานของ Agent เมื่อเจอ `/postshopeefb`

1. **โพสต์ + ปักตะกร้า + ตั้งเวลา (Production):**
```powershell
python "tools/fb-poster/uploader_shopee_fb.py" --video "C:\path\to\video.mp4" --caption "แคปชั่น..." --product-url "https://s.shopee.co.th/xxxxx" --schedule "2026-11-18 19:00" --channel "bankxl" --public
```

2. **ทดสอบก่อนยิงจริง (`--dry-run`):**
```powershell
python "tools/fb-poster/uploader_shopee_fb.py" --video "C:\path\to\video.mp4" --caption "แคปชั่น..." --product-url "https://s.shopee.co.th/xxxxx" --schedule "2026-11-18 19:00" --channel "bankxl" --dry-run
```

3. **ตัวเลือกเสริม (Flags):**
   - `--public` : บังคับสลับกลุ่มเป้าหมายจาก Friends เป็น Public อัตโนมัติ
   - `--ai-label` : เปิดสวิตช์ Add AI label (สำหรับคลิป AI Gen)
   - `--code-id "DB-XXX"` : อัปเดตสถานะการ์ดใน Teable เป็น `🚀 PUBLISHED`
   - `--headless` : รันแบบซ่อนหน้าต่าง Chrome
