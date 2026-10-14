---
name: "link"
description: >-
  Switchy Branded Short Link Generator — สร้างและจัดการลิ้งก์สั้นติดแบรนด์ ดักจับ Facebook Pixel ตั้งรหัสผ่าน และกำหนดวันหมดอายุอัตโนมัติ ใช้เมื่อ: /link [url] [slug]
---

# 🔗 Skill: `/link` (Switchy Branded Short Link Engine)

**Command:** `/link [url] [slug] [flags]`  
**Trigger:** เมื่อผู้ใช้สั่ง `/link`, ต้องการย่อลิ้งก์, ทำลิ้งก์ติดแบรนด์ `go.doctorbankonline.com`, ดัก Pixel ยิงแอด, หรือแชร์เอกสาร X-Doc ไปยัง Mobile

---

## 🎯 วัตถุประสงค์
แปลง URL ยาวๆ (เช่น เอกสาร X-Doc, Google Forms, ลิ้งก์ Shopee/Lazada, หรือหน้าเว็บภายนอก) ให้กลายเป็น **"Branded Short Link ติดสปีด"** ใต้ชื่อโดเมนทางการของ DoctorBank พร้อมดักเก็บ Facebook Pixel อัตโนมัติ เพื่อนำไปยิงแอด Retargeting ได้ทันที

---

## ⚡ รูปแบบการใช้งาน (Quick Usage)

### 1. ย่อลิ้งก์แบบสปีดเทพ (Default: `go.doctorbankonline.com`)
```powershell
node tools/switchy.js "https://brain.doctorbankonline.com/r/cancer-diet" cancer-diet
```
*ได้ลิ้งก์:* `https://go.doctorbankonline.com/cancer-diet`

### 2. ย่อลิ้งก์พร้อมดัก Facebook Pixel (ยิงแอด Retargeting)
```powershell
node tools/switchy.js "https://forms.gle/xyz" diabetes-regis --pixel alpha
```
*ตัวเลือก Pixel:*
- `--pixel alpha` (ผูก Alpha Focus 1)
- `--pixel droprich` (ผูก Droprich)
- `--pixel all` (ผูกทุกพิกเซลในระบบ)

### 3. เลือกแบรนด์อื่นในเครือ (Domain Shortcuts)
```powershell
node tools/switchy.js "https://shopee.co.th/product/..." kids-shoes --alpha
node tools/switchy.js "https://doctorbank.me/course" vip-course --me
```
- `--alpha` ➔ `go.alpha-b.co.th/:slug`
- `--me` ➔ `go.doctorbank.me/:slug`
- `--yanhee` ➔ `go.yanheeonlineshop.com/:slug`
- `--namcha` ➔ `go.namchatv.com/:slug`

### 4. ล็อกรหัสผ่าน (VIP Document Protection)
```powershell
node tools/switchy.js "https://brain.doctorbankonline.com/r/secret-paper" vip-doc --pass 1234
```

### 5. ตั้งเวลาหมดอายุ (Flash Sale / Campaign Expiration)
```powershell
node tools/switchy.js "https://doctorbank.me/promo" flash-deal --expire "2026-10-31T23:59" --expire-url "https://doctorbankonline.com"
```

### 6. ตรวจเช็คข้อมูลในระบบ
```powershell
node tools/switchy.js --list 5   # ดู 5 ลิ้งก์ล่าสุด + จำนวนคลิก
node tools/switchy.js --domains  # ดูรายชื่อโดเมนที่ผูกไว้
node tools/switchy.js --pixels   # ดูรายชื่อพิกเซลในระบบ
```

---

## 🛠️ Flow การทำงานของ Agent เมื่อ User สั่ง `/link`

1. **ดึง URL และ Slug จากคำสั่ง:**
   - เช่น User พิมพ์: `/link https://brain.doctorbankonline.com/r/flatfoot flatfoot-guide`
2. **รันคำสั่ง CLI ผ่าน `run_command`:**
   ```powershell
   node tools/switchy.js "<url>" <slug> [flags]
   ```
3. **ส่งมอบผลลัพธ์ให้ User ทันที:**
   - สรุป Short URL ที่ได้
   - แสดงสถานะ Pixel ที่ผูกไว้
   - แนะนำปุ่มก๊อปปี้ไปแชร์ต่อใน LINE / Facebook / TikTok Bio ได้ทันที
