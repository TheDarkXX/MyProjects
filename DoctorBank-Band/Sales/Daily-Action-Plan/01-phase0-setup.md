# 🛒 Phase 0: Setup — ทำให้เสร็จก่อนขาย

> **W0:** 17–20 มิ.ย. 2569 (อ.–ศ.)
> **เป้าหมาย:** ทุก platform พร้อม + AI system พร้อม → เริ่มลงคลิป W1

---

## Day 1 — อ. 17 มิ.ย. (TikTok Shop + AI Setup)

### 🛒 TikTok Shop — ลงสินค้า 3 SKU

- [ ] **08:30** เปิด TikTok Seller Center → เข้า Product Management
- [ ] **09:00** ลง SKU A: 1 กระปุก (890 บาท)
  - ชื่อ: `DR.BANK Magnesium Night Plus แมกนีเซียม สูตรนอนหลับ 30 แคปซูล`
  - คำอธิบาย: [ดูใน road-to-1m-execution.md Deliverable 3](../road-to-1m-execution.md)
  - ภาพ: product-hero.png + ภาพเพิ่มเติม 3-5 ภาพ
  - หมวดหมู่: สุขภาพ > อาหารเสริม > แร่ธาตุ
- [ ] **09:30** ลง SKU B: เซตคู่ (1,590 บาท)
- [ ] **10:00** ลง SKU C: 3 แถม 1 (2,670 บาท) — ติดป้าย 🔥
- [ ] **10:30** ตั้ง Voucher -100 บาท/ออเดอร์ (ตามกลยุทธ์ Decoy Pricing)
- [ ] **11:00** ตั้ง Affiliate Plan 15% commission
  - เลือก "Open Collaboration" → ทุกคนสมัครได้
  - ใส่รายละเอียดจาก Affiliate Kit ([Deliverable 4](../road-to-1m-execution.md))
- [ ] **11:30** ตรวจสอบ: ตะกร้า DR.BANK ลิงก์ข้ามช่อง (พี่แบงค์ + น้องมินนี่) ได้ไหม

### 🤖 AI/Agent Setup (ช่วงบ่าย)

- [ ] **12:30** 🤖 AG: สร้าง Discord channel `#road-to-1m` (หรือเปลี่ยนชื่อ channel ที่มี)
- [ ] **13:00** 🤖 AG: Deploy `cron-drbank-daily.js` บน VPS
- [ ] **13:30** 🤖 AG: ทดสอบ cron ส่ง Discord message (dry-run)
- [ ] **14:00** 🤖 AG: Setup น้องมินนี่ AI clip pipeline (ถ้ามี tool พร้อม)
- [ ] **14:30** Review: เช็คว่าทุกอย่าง Day 1 ครบ

> **✅ Day 1 Goal:** TikTok Shop ลงสินค้าครบ 3 SKU + Affiliate เปิด + Discord cron พร้อม

---

## Day 2 — พ. 18 มิ.ย. (Shopee + Facebook)

### 🛒 Shopee — เปิดร้าน + ลงสินค้า

- [ ] **08:30** สมัคร Shopee Seller Center (ถ้ายังไม่มีร้าน)
  - เอกสาร: บัตรประชาชน + สมุดบัญชีธนาคาร + ใบ อย.
  - ชื่อร้าน: `DR.BANK Official Store`
- [ ] **09:00** ตั้งค่าร้าน:
  - โปรไฟล์ร้าน + โลโก้ + Banner
  - ตั้ง Chat Auto-Reply ([template จาก Deliverable 4](../road-to-1m-execution.md))
  - ตั้งค่าจัดส่ง (Kerry / J&T / Flash)
- [ ] **09:30** ลง SKU A (1 กระปุก) — ใช้ Listing จาก Shopee template
- [ ] **10:00** ลง SKU B (เซตคู่)
- [ ] **10:30** ลง SKU C (3 แถม 1)
- [ ] **11:00** สร้าง Voucher: -100 บาท (ขั้นต่ำ 890 บาท)
- [ ] **11:15** ลง VDO แนะนำร้าน (ถ้ามี)

### 📘 Facebook (ช่วงบ่าย)

- [ ] **12:30** ปรับ Facebook Page: DR.BANK Official
  - อัปเดต About / ภาพ Cover / โลโก้
  - ลิงก์ไปยัง TikTok Shop + Shopee
- [ ] **13:00** ตั้งค่า Business Manager (ถ้ายังไม่มี)
  - สร้าง Ad Account
  - ติดตั้ง Facebook Pixel
- [ ] **13:30** 🤖 AG: เชื่อม Viral Planner กับ Facebook Page
- [ ] **14:00** ทดสอบ Viral Planner: schedule 1 Reel ทดสอบ

> **✅ Day 2 Goal:** Shopee เปิดร้าน + ลงสินค้า 3 SKU + FB Page พร้อม + Viral Planner เชื่อม

---

## Day 3 — พฤ. 19 มิ.ย. (Lazada + YouTube + Content Prep)

### 🛒 Lazada — เปิดร้าน + ลงสินค้า

- [ ] **08:30** สมัคร Lazada Seller Center
  - เอกสาร: เหมือน Shopee + ใบจดทะเบียนบริษัท
- [ ] **09:00** ตั้งค่าร้าน: โปรไฟล์ + โลโก้ + Banner
- [ ] **09:30** ลง 3 SKU (ใช้ Listing จาก Lazada template)
- [ ] **10:30** สร้าง Voucher -100 บาท

### ▶️ YouTube + Content Prep (ช่วงบ่าย)

- [ ] **12:30** สร้าง/ปรับ YouTube Channel: DR.BANK
  - ชื่อ / About / Banner / Profile
  - Shorts = re-upload จาก TikTok
- [ ] **13:00** 🤖 AG: เตรียม Script คลิปแรก 3 ช่อง (จะลงวันจันทร์ W1)
  - พี่แบงค์: "วันนี้เปิดขายวันแรก!"
  - DR.BANK: Unboxing + สารสกัด
  - น้องมินนี่: "คนไทย 70% ขาด Mg"
- [ ] **13:30** 🤖 AG: สร้าง AI clip น้องมินนี่ ตัวแรก (Script 1)
- [ ] **14:00** ซ้อมถ่ายคลิปทดลอง 1 ตัว (test CapCut template)

> **✅ Day 3 Goal:** Lazada เปิดร้าน + YouTube พร้อม + Script คลิปแรกพร้อม

---

## Day 4 — ศ. 20 มิ.ย. (Final Check + Content Batch)

### 🔍 Platform Final Check

- [ ] **08:30** เช็ค TikTok Shop: สินค้า approve แล้วไหม? ตะกร้าข้ามช่องได้ไหม?
- [ ] **09:00** เช็ค Shopee: สินค้า approve แล้วไหม?
- [ ] **09:15** เช็ค Lazada: สินค้า approve แล้วไหม?
- [ ] **09:30** เช็ค Facebook: Pixel ทำงานไหม? Viral Planner OK?
- [ ] **09:45** เช็ค YouTube: Channel พร้อมไหม?

### 🎬 Content Batch Prep (ช่วงเช้า)

- [ ] **10:00** ถ่ายคลิป batch สำหรับ W1:
  - พี่แบงค์: คลิป 1 ("เปิดขายวันแรก")
  - DR.BANK: คลิป 1 (Unboxing)
- [ ] **11:00** ตัดต่อ CapCut (ใช้ Template 1: Quick Talking Head)
- [ ] **11:30** เซฟไว้ รอลง วันจันทร์

### 🤖 AI System Final Setup (ช่วงบ่าย)

- [ ] **12:30** 🤖 AG: Verify cron-drbank-daily ทำงานปกติ
- [ ] **13:00** 🤖 AG: ตั้งเวลาน้องมินนี่ AI clip สำหรับ ส.-อา. (ผ่าน TikTok Studio)
- [ ] **13:30** 🤖 AG: เตรียม Affiliate DM batch 20 ชื่อ (target list)
- [ ] **14:00** Review W0 ทั้งหมด: ทุก platform ✅? AI ✅? Content ✅?
- [ ] **14:30** 🤖 AG: สร้าง Weekly Report template (ส่งทุกจันทร์เช้า)

> **✅ Day 4 Goal:** ทุก platform ✅ + content W1 พร้อม + AI system 100%
> **🎯 W0 COMPLETE:** พร้อมเปิดขายวันจันทร์!

---

## ⚠️ ถ้าติดปัญหา

| ปัญหา | ทำอย่างไร |
|-------|----------|
| สินค้า TikTok/Shopee ยังไม่ approve | รอ 24 ชม. → ถ้ายังไม่ผ่าน ติดต่อ support |
| ตะกร้า TT ข้ามช่องไม่ได้ | เปิดตะกร้าทั้ง 3 ช่อง ลิงก์ไปร้าน DR.BANK |
| Lazada สมัครไม่ผ่าน | ข้ามไปก่อน → โฟกัส TikTok + Shopee → กลับมาลอง W2 |
| CapCut ใช้ไม่คล่อง | ใช้ Template 1 (Talking Head) เท่านั้น → 5-10 นาที/คลิป |
| AI clip น้องมินนี่ ยังไม่ได้ | ข้ามไปก่อน → ลงเฉพาะ 2 ช่อง → ค่อยเพิ่มทีหลัง |
