---
name: lightcraft
version: "1.0.0"
description: >-
  LightCraft 4-Dimension Situational Engine and Universal Multi-Face Glow Architecture.
  Automates intelligent portrait photo development in LightCraft via socket API 7980,
  featuring Luminous Bright and Airy skin targeting Zone VIII, WB Kelvin Floor 5800K clamp,
  universal AI radial glow masks for all faces in frame, and skin luminance orange mixer boost.
---

# Skill: `/lightcraft` (หรือ `/lc`) — Intelligent Portrait Development Engine

## 📌 ภาพรวม (Overview)
เครื่องยนต์พัฒนาและเกรดสีภาพถ่ายพอร์ตเทรตอัจฉริยะสำหรับ **LightCraft** (กล้อง Canon EOS R + เลนส์ EF 35mm f/1.4L USM และกล้องโปรอื่นๆ) ควบคุมผ่าน Socket Control API (`127.0.0.1:7980`) โดยถอดรหัส DNA ความใส **"Ultra Luminous Bright & Airy Pop"** (ขาวใสวิ้ง อมชมพู มิติโปร่งตา สไตล์ญี่ปุ่น/เกาหลี) พร้อมแก้จุดบอดของแอปด้วยสถาปัตยกรรม 2-Tier และระบบตรวจจับใบหน้าหลายคนอัตโนมัติ

---

## ⚡ คำสั่งใช้งานด่วน (Quick Triggers)

| คำสั่ง | พฤติกรรมการทำงาน |
|---|---|
| `/lc` หรือ `/lightcraft` | **Live GUI Sync:** สแกนและซิงก์ภาพสดทั้งอัลบั้มที่เปิดอยู่บนหน้าจอ LightCraft ทันที |
| `/lc [folder]` | **Batch Render:** ประมวลผลและเรนเดอร์ภาพความละเอียดสูงทั้งโฟลเดอร์ออกมาเป็น JPEG คุณภาพ 95 |
| `/lc [folder] --live` | ประมวลผลภาพในโฟลเดอร์พร้อมอัปเดตลง LightCraft GUI ทันที |

---

## 🏛️ 5 เสาหลักสถาปัตยกรรม (Core Architectural Pillars)

### 1. Photometric Skin Luminance Target (Zone VIII-)
- คัดกรองและสุ่มค่าความสว่างผิวหน้าจริงด้วยมาตรฐาน **Rec.709 Photometric**
- ดันเป้าหมายผิวไปที่ **`Target Skin = 0.82` (Zone VIII-)** ขาวสว่าง ออร่าจับตา เลิกการชดเชยแสงแบบสตูดิโออนุรักษ์นิยมที่ทำให้ภาพแอบอันเดอร์

### 2. Whites & Highlights Dynamic Tension
- ดัน **`Whites: +20 ถึง +24`** ดีดเสื้อเชิ้ตขาว เค้ก ป้ายวันเกิด และประกายตาให้ขาวโอโม่สะดุดตา
- รั้ง **`Highlights: -48 ถึง -55`** ลึกเป็นพิเศษ เพื่อล็อกรายละเอียดผิวหน้าผาก สันจมูก และเทียนวันเกิดไม่ให้หลุดขาว (Clipped)

### 3. Pop Contrast & Airy Shadows
- อัด **`Contrast: +12 ถึง +13`** เพื่อป้องกันภาพแบนซีด (Washed-out) จากการดึง Exposure สูง
- ปรับ **`Shadows: +36 ถึง +40`** และ **`Blacks: -1 ถึง 0`** เปิดเงาสูทสีกรมท่าและรอยพับผ้าให้โปร่งตา ไร้เงาดำจมทึบ

### 4. WB Kelvin Floor Clamp (5800K Guardrail)
- **แก้ปัญหาภาพติดฟ้า 100%:** ล็อกขอบล่างของอุณหภูมิสีห้ามต่ำกว่า **`5800K`** (ไม่ปล่อยให้ร่วงลงไป 5200K จนหน้าซีดฟ้า)
- ชดเชยความอบอุ่นและเลือดฝาดด้วย **`Tint: +6 ถึง +10`** ควบคู่กับ **`Saturation: -8 ถึง -10`** (ตัดส้มเลี่ยน) และ **`Vibrance: +8`** (ดันฉากหลังสดใส)

### 5. Universal Multi-Face Glow Masking
- ก้าวข้ามขีดจำกัดการเลือกเฉพาะคนเด่น: สแกนพิกัด YuNet / MediaPipe Bounding Boxes ของ **"ทุกคนในภาพ"**
- สร้าง Radial Mask ประจำตัวแต่ละคน (`Face Glow 1`, `Face Glow 2`, ...) สว่างเท่าเทียมกันทั้งครอบครัว (พ่อ, แม่, ลูกทุกคน)
- เสริมด้วย **`mixer.orange.lum: +15`** พุ่งเป้าไปที่เม็ดสีผิวคนเอเชียโดยตรง แก้ปัญหาที่แอปปรับ Shadow แล้วหน้าไม่ขยับ

---

## 💻 เบื้องหลังการรันคำสั่ง (Execution Command)

```powershell
# รัน Live Sync บน LightCraft GUI
& "C:\My Claw\Openclaw-VPS\tools\x-photo-studio\venv\Scripts\python.exe" "C:\My Claw\Openclaw-VPS\tools\smart_lightcraft_mcp.py" --live

# รันประมวลผลทั้งโฟลเดอร์
& "C:\My Claw\Openclaw-VPS\tools\x-photo-studio\venv\Scripts\python.exe" "C:\My Claw\Openclaw-VPS\tools\smart_lightcraft_mcp.py" "V:\Picture\2026\..."
```
