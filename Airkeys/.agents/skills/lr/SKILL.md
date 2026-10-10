---
name: lr
version: "1.1.0"
description: >-
  Intelligent Portrait Development Engine for LightCraft and Lightroom workflows.
  Features 4-Dimension Situational Radar, Zone VIII- Luminous Skin Pop, Universal Multi-Face Glow,
  WB Kelvin Floor 5800K clamp, and Orange Luminance boost.
  Supports /lr (Smart Default), /lrlive (Live GUI Sync), and /lrbatch (Batch Render JPEG).
---

# Skill: `/lr` (`/lrlive` vs `/lrbatch`) — Intelligent Portrait Development Engine

## 📌 ภาพรวม (Overview)
เครื่องยนต์แต่งภาพพอร์ตเทรตอัจฉริยะระบบคู่ รองรับทั้งการเกรดสีสดๆ บนหน้าจอ **LightCraft GUI** และการประมวลผลเรนเดอร์เป็นไฟล์ภาพ JPEG สำหรับส่งมอบงาน ด้วยมาตรฐาน **"Ultra Luminous Bright & Airy Pop"** (ขาวสว่างใสวิ้ง อมชมพู มิติโปร่งตา สไตล์ญี่ปุ่น/เกาหลี)

---

## ⚡ เลือกระบบการสั่งงาน (Command Triggers)

| คำสั่ง | มู้ดการใช้งาน | พฤติกรรมของระบบ |
|---|:---:|---|
| **`/lr`** | **Smart Workhorse** | **ค่าตั้งต้นสุดฉลาด:** ถ้าเปิด LightCraft ค้างไว้ จะทำ Live Sync อัลบั้มปัจจุบันทันที หรือถ้าตามด้วยชื่ออัลบั้มจะ Auto-resolve ค้นหาโฟลเดอร์ให้ |
| **`/lrlive`** | **Pure GUI Sync** | **ล็อกโหมดสด 100%:** สแกนและปรับสไลเดอร์สดๆ ในหน้าต่าง LightCraft ไม่บันทึกไฟล์ทับลงดิสก์ (เช่น `/lrlive` หรือ `/lrlive "HBD Tiger"`) |
| **`/lrbatch`** | **Export Pipeline** | **ล็อกโหมดเรนเดอร์ไฟล์:** ประมวลผลทั้งโฟลเดอร์และ Export เซฟไฟล์เป็น JPEG คุณภาพสูง 95% ลงโฟลเดอร์ปลายทาง (เช่น `/lrbatch "HBD Tiger"`) |

---

## 🧬 5 เสาหลักสถาปัตยกรรม (Core Architectural Pillars)

1. **Target Skin Zone VIII- (`0.82`):**
   - คำนวณความสว่างผิวจริงด้วยมาตรฐาน Rec.709 Photometric ดันผิวขาวสว่างสดใส สไตล์ High-Key หมดปัญหาภาพแอบอันเดอร์ทึมๆ
2. **Whites (+20 ถึง +24) & Highlights Shield (-48 ถึง -55):**
   - เสื้อเชิ้ตขาว เค้ก ป้าย และประกายตาขาวสว่างวิ้งสะดุดตา โดยที่หน้าผาก จมูก และเทียนวันเกิดไม่หลุดขาว (Clipped)
3. **Pop Contrast (+12 ถึง +13) & Airy Shadows (+36 ถึง +40):**
   - ภาพคมชัดมีมิติ สีสูทและลายผ้าเด้งชัด ไร้เงาดำจมทึบตัน (`Blacks: -1 ถึง 0`)
4. **WB Kelvin Floor Clamp (`5800K`):**
   - ล็อกกันภาพติดฟ้าซีดถาวร ผิวคงความอุ่นละมุนและมีเลือดฝาดด้วย **Tint `+6 ถึง +10`**
5. **Universal Multi-Face Glow Masking & Orange Lum (+15):**
   - สแกนและสวม Face Glow Mask ให้กับ **"ทุกคนในภาพ"** (พ่อ, แม่, ลูกทุกคน) ไม่ทิ้งใครไว้ข้างหลัง
   - เพิ่ม **Orange Luminance (+15)** เจาะจงความสว่างเฉพาะเม็ดสีผิวคนเอเชียโดยตรง

---

## 💻 เบื้องหลังการรันคำสั่ง (CLI Mapping)

```powershell
# 1. โหมด /lr หรือ /lrlive (Live GUI Sync)
& "C:\My Claw\Openclaw-VPS\tools\x-photo-studio\venv\Scripts\python.exe" "C:\My Claw\Openclaw-VPS\tools\smart_lightcraft_mcp.py" [album_or_folder] --live

# 2. โหมด /lrbatch (Batch Render to Disk)
& "C:\My Claw\Openclaw-VPS\tools\x-photo-studio\venv\Scripts\python.exe" "C:\My Claw\Openclaw-VPS\tools\smart_lightcraft_mcp.py" [album_or_folder] --render
```
