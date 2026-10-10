---
name: lr
version: "1.2.0"
description: >-
  Intelligent Portrait Development and GPU Direct Export Engine for LightCraft and Lightroom workflows.
  Features 4-Dimension Situational Radar, Zone VIII- Luminous Skin Pop, Universal Multi-Face Glow,
  WB Kelvin Floor 5800K clamp, and Orange Luminance boost.
  Supports /lr (Smart Default), /lrlive (Live GUI Sync), /lrbatch (Batch Render JPEG), and /lrexport (One-Click GPU Fast Export 2048px).
---

# Skill: `/lr` (`/lrlive` / `/lrbatch` / `/lrexport`) — Intelligent Portrait Development Engine

## 📌 ภาพรวม (Overview)
เครื่องยนต์แต่งภาพพอร์ตเทรตอัจฉริยะระบบครบวงจร (4-Tier Architecture) รองรับทั้งการเกรดสีสดๆ บนหน้าจอ **LightCraft GUI**, การประมวลผลเรนเดอร์เบื้องหลัง, และคำสั่ง **Direct GPU Export** รวดเดียวทั้งอัลบั้ม ด้วยมาตรฐาน **"Ultra Luminous Bright & Airy Pop"** (ขาวสว่างใสวิ้ง อมชมพู มิติโปร่งตา สไตล์ญี่ปุ่น/เกาหลี)

---

## ⚡ 4 พี่น้องตระกูล `/lr` (Command Triggers)

| คำสั่ง | มู้ดการใช้งาน | พฤติกรรมของระบบ |
|---|:---:|---|
| **`/lr`** | **Smart Workhorse** | **ค่าตั้งต้นสุดฉลาด:** ถ้าเปิด LightCraft ค้างไว้ จะทำ Live Sync อัลบั้มปัจจุบันทันที หรือถ้าตามด้วยชื่ออัลบั้มจะ Auto-resolve ค้นหาโฟลเดอร์ให้ |
| **`/lrlive`** | **Pure GUI Sync** | **ล็อกโหมดสด 100%:** สแกนและปรับสไลเดอร์สดๆ ในหน้าต่าง LightCraft ไม่บันทึกไฟล์ทับลงดิสก์ (เช่น `/lrlive` หรือ `/lrlive "HBD Tiger"`) |
| **`/lrbatch`** | **Offline Render** | **ล็อกโหมดเรนเดอร์ไฟล์:** ประมวลผลทั้งโฟลเดอร์และ Export เซฟไฟล์เป็น JPEG คุณภาพสูง 95% ลงโฟลเดอร์ปลายทาง (เช่น `/lrbatch "HBD Tiger"`) |
| **`/lrexport`** | **GPU Direct Export** | **One-Click ส่งงานทันที:** สั่ง LightCraft GPU Engine ส่งออกไฟล์รูปทั้งอัลบั้มลง `V:\Picture\Render\<Album>` ด้วยโปรไฟล์ทองคำ (JPEG, sRGB, Q90, Long Edge 2048px, Screen Sharpening, `{folder}-{seq:3}`) รวดเร็วระดับเสี้ยววินาทีต่อรูป |

---

## 💎 สูตรตั้งค่า Export ทองคำ (Golden Export Standards)

| การตั้งค่า | ค่าที่เลือก | เหตุผลเชิงวิศวกรรมช่างภาพระดับโปร |
|---|:---:|---|
| **Format** | **JPEG** | มาตรฐานสากล เปิดได้ทุกอุปกรณ์ ทุกระบบปฏิบัติการ |
| **Color Space** | **sRGB** | **สำคัญที่สุด:** สีตรง 100% บนมือถือ, เว็บเบราว์เซอร์, และ Facebook (ห้ามใช้ Adobe RGB/ProPhoto บนเว็บ เพราะสีจะซีด อมเทาทันที) |
| **Quality** | **90** | **Sweet Spot สูงสุด:** คุณภาพสายตาแยกไม่ออกเทียบกับ 100 แต่ประหยัดเนื้อที่ 50-60% ส่งงานผ่านแชท/Drive ไวมาก |
| **Resize** | **Long Edge 2048px** | **สูตรลับโซเชียล:** 2048px คือความละเอียดสูงสุดที่ Facebook จะ **ไม่บีบอัดภาพซ้ำ (No Downscaling)** ทำให้รูปคมกริบ ไร้รอยแตก |
| **Don't Enlarge** | **Checked (เปิด)** | ป้องกันกรณีภาพต้นฉบับเล็กกว่า ไม่ให้ถูกดึงขยายจนแตก |
| **Resolution** | **240 ppi** | มาตรฐานความละเอียดสูง พร้อมอัดขยายภาพขนาดโปสการ์ดได้ทันที |
| **Sharpen** | **Screen (Standard)** | **แนะนำเปิด:** ชดเชยความนุ่มนวลจากการย่อภาพ (Bicubic Downsampling) กู้คืน Micro-contrast ขนตา แววตา เส้นผม และดีเทลผิวให้คมกริบมีมิติ |
| **File Naming** | **`{folder}-{seq:3}`** | รันเลข 3 หลักตามชื่องาน เช่น `2026-02-07 HBD Tiger-001.jpg` เป็นระเบียบ ไม่ซ้ำ ไม่ชน |
| **Destination** | **`V:\Picture\Render\<Album>`** | แยกโฟลเดอร์เรนเดอร์ชัดเจน ไม่ปะปนกับโฟลเดอร์ RAW หรือต้นฉบับ |

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

# 2. โหมด /lrexport (One-Click GPU Fast Export 2048px)
& "C:\My Claw\Openclaw-VPS\tools\x-photo-studio\venv\Scripts\python.exe" "C:\My Claw\Openclaw-VPS\tools\smart_lightcraft_mcp.py" --export

# 3. โหมด /lrbatch (Offline Render to Disk)
& "C:\My Claw\Openclaw-VPS\tools\x-photo-studio\venv\Scripts\python.exe" "C:\My Claw\Openclaw-VPS\tools\smart_lightcraft_mcp.py" [album_or_folder] --render
```
