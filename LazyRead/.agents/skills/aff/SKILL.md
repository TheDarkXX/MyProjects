---
name: aff
description: >-
  Shopee Affiliate Clean 1-Command Orchestrator (/aff) — ควบคุมสายพานผลิตและโพสต์คลิป
  Shopee Affiliate Reels แบบคลีนที่สุดผ่านตารางเดียว (BOARD.md) ครบ 4 ขั้นตอน
  ได้แก่ /aff (เช็กยอดและซิงก์ไฟล์ MP4 ใน ready_to_post อัตโนมัติ), /aff pick
  (คัดสินค้าตัวท็อปจาก Pool 605 เข้าคิวโดยไม่ซ้ำ), /aff make (รัน Gem 11 สร้างภาพ
  First Frame และ VIDEO_PROMPT สำหรับ Google Flow และ Meta AI), และ /aff post
  (ส่งต่อคำสั่ง /postshopeefb สำหรับคอมบ้านและบันทึกสถานะ posted)
---

# 🎯 Skill: `/aff` — Shopee Affiliate Clean Orchestrator (PICK ➔ MAKE ➔ POST)

สกิลควบคุมสายพาน Shopee Affiliate Reels (`16NOV26FBRAD` เป้า 150 คลิป) โดยใช้ **[`BOARD.md`](file:///C:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/BOARD.md)** เป็นความจริงหนึ่งเดียว (Single Source of Truth) และเก็บไฟล์พร้อมโพสต์ไว้ที่ **[`10M_Project/Shopee_Aff/ready_to_post/`](file:///C:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/ready_to_post)** ที่เดียว

---

## ⚡ คำสั่งทั้งหมดของ `/aff`

### 1. `/aff` หรือ `/aff today` หรือ `/aff sync` — เช็กสถานะ & ซิงก์ไฟล์ MP4 อัตโนมัติ
เมื่อผู้ใช้พิมพ์ `/aff` เฉยๆ ให้รัน:
```powershell
node "C:\My Claw\Openclaw-VPS\tools\aff_board.cjs" sync
```
- ระบบจะสแกนหาไฟล์ `.mp4` ที่ผู้ใช้เซฟลงใน `10M_Project/Shopee_Aff/ready_to_post/` (หรือ `04_videos/`), ตรวจสอบด้วย `ffprobe`, เปลี่ยนสถานะจาก `🎨 framed` เป็น `🟢 ready` อัตโนมัติ, และอัปเดตตาราง [`BOARD.md`](file:///C:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/BOARD.md)
- สรุปสถานะสั้นๆ ให้ผู้ใช้เห็นทันที พร้อมแนบลิงก์คลิกเปิด [`BOARD.md`](file:///C:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/BOARD.md)

### 2. `/aff pick [N]` — คัดสินค้าตัวท็อปเข้าคิว (ค่าเริ่มต้น 12 ตัว)
เมื่อผู้ใช้พิมพ์ `/aff pick` หรือ `/aff pick 12`:
```powershell
node "C:\My Claw\Openclaw-VPS\tools\aff_board.cjs" pick 12
```
- คัดสินค้าจาก `campaign-16nov26-pool.json` (605 ตัว) + `spy_competitor_pool.json` ที่ยังไม่เคยอยู่ใน `BOARD.md` มีลิงก์สั้นและมีค่าคอมสุทธิ เรียงตาม `ค่าคอมสุทธิ × log10(ยอดขาย/เดือน)`

### 3. `/aff make [N หรือ ID]` — เจนภาพ First Frame + Prompt Gem #11 (`🟡 picked` ➔ `🎨 framed`)
เมื่อผู้ใช้พิมพ์ `/aff make` (หรือระบุจำนวนเช่น `/aff make 3` หรือระบุรหัส `/aff make nov-343`):
```powershell
# รันตามจำนวนคิวที่เป็น picked:
node "C:\My Claw\Openclaw-VPS\tools\aff_board.cjs" make --limit 3

# หรือรันเฉพาะรหัส:
node "C:\My Claw\Openclaw-VPS\tools\aff_board.cjs" make --ids nov-343,nov-499
```
- สคริปต์จะเรียก `tools/shopee_product_vault.cjs --sub2 <Sub_id2> --gem 11` เพื่อดึงรูปสินค้า, คัด Clean Refs, เจนภาพ `*_FF.png` / `*_SB.png`, เขียนแถวลง [`G11_20261116_batch01.md`](file:///C:/My%20Claw/Openclaw-VPS/10M_Project/Shopee_Aff/Campaigns/2026-11-16_30_16NOV26FBRAD/production_tables/G11_20261116_batch01.md) และสร้างใบงาน `ready_to_post/<id>_<sku>.txt` พร้อมเปลี่ยนสถานะเป็น `🎨 framed`
- **หมายเหตุสำคัญ:** การเจนวิดีโอจาก `🎨 framed` ➔ `🟢 ready` ผู้ใช้จะนำภาพ `FF` และ `VIDEO_PROMPT` จากใบงาน `<id>_<sku>.txt` (หรือตาราง `G11_20261116_batch01.md`) ไปเจนบนหน้าเว็บ **Google Flow** หรือ **Meta AI** โดยตรง (ไม่ใช้ `/flow` CLI) แล้วเซฟไฟล์ `.mp4` ลง `ready_to_post/`

### 4. `/aff post` หรือ `/aff posted <id> [url]` — โพสต์ขึ้นเพจที่คอมบ้าน (`🟢 ready` ➔ `✅ posted`)
- **การโพสต์จริงทำที่คอมบ้านเป็นหลัก** โดยใช้สกิล `/postshopeefb` (ก๊อปคำสั่งสำเร็จรูปจากหัวข้อ `4️⃣` ในไฟล์ `ready_to_post/<id>_<sku>.txt` ได้ทันที)
- เมื่อโพสต์เสร็จแล้ว ให้บันทึกสถานะลงบอร์ด:
```powershell
node "C:\My Claw\Openclaw-VPS\tools\aff_board.cjs" set <id> posted --url "<ลิงก์โพสต์FB>"
```
