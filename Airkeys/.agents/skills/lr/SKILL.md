---
name: lr
version: "1.7.0"
description: >-
  Intelligent Portrait and Culinary Food Development and GPU Direct Export Engine for LightCraft and Lightroom workflows.
  Features Korean Idol Ultra Pop (ขาว ป๊อป เด้ง อมชมพูพีชระเรื่อ), Salient Neutral White & Neutral Gray Detection (Retinex Eye Emulation),
  Dynamic Face-Scale Aware Auto-Exposure (+1.28 to +1.58 EV floor), DoctorBank 2026 Food Suite (Cafe Pop, Dark Michelin, Vivid Feast),
  Mandatory develop.reset pure-canvas guarantee, 4-Dimension Situational Radar, Universal Multi-Face Glow, and Orange Luminance +24 boost.
  Supports /lr (Smart Default), /lrlive (Live GUI Sync), /lrbatch (Batch Render JPEG), and /lrexport (One-Click GPU Fast Export 2048px).
---

# Skill: `/lr` (`/lrlive` / `/lrbatch` / `/lrexport`) — Intelligent Portrait Development Engine

## 📌 ภาพรวม (Overview)
เครื่องยนต์แต่งภาพพอร์ตเทรตอัจฉริยะระบบครบวงจร (4-Tier Architecture) รองรับทั้งการเกรดสีสดๆ บนหน้าจอ **LightCraft GUI**, การประมวลผลเรนเดอร์เบื้องหลัง, คำสั่ง **Direct GPU Export** รวดเดียวทั้งอัลบั้ม และชุดพรีเซ็ต **"Korean Idol Glass Skin & Studio Airy Suite"** (.xmp สำหรับ Adobe Lightroom Classic / Camera Raw) ด้วยมาตรฐานผิวขาวกระจ่างใส อมชมพูระเรื่อ ดุจกระเบื้องเคลือบสไตล์ดารา-ไอดอลเกาหลี

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

## 🧬 6 เสาหลักสถาปัตยกรรม (Core Architectural Pillars)

1. **Mandatory Pure Clean Reset (`develop.reset` — กฎเหล็กล้างกระดานก่อนสวมพรีเซ็ต):**
   - **ปัญหาคอขาดบาดตาย:** ใน LightCraft / RAW Developer หากสวมพรีเซ็ตใหม่ทับพรีเซ็ตเดิมโดยไม่สั่ง Reset ค่าสไลเดอร์, Curve, และ Tone ย่อยจากพรีเซ็ตเก่าจะค้างและผสมทับซ้อน (Compounded Edits) จนทำให้สีเพี้ยน/สกินโทนเน่า
   - **กฎเหล็กเด็ดขาด (Iron Rule):** ทุกครั้งที่สั่งรัน Live Sync หรือสวมพรีเซ็ตใหม่ ไม่ว่าจะรันครั้งแรกหรือรันซ้ำ **ต้องสั่ง `develop.reset` ล้างค่าเดิมทิ้ง 100% จนเป็นกระดาษขาวสะอาด** ก่อนยิง `preset.apply` และ `develop.set` เสมอ!
2. **Salient Neutral White & Neutral Gray Detection (Retinex Eye Emulation & WB Clamp <= 6220K):**
   - เลียนแบบสายตามนุษย์: กวาดหาวัตถุสีขาวบริสุทธิ์ (กระดาษรองขนม, แป้ง, จานชาม, ขอบเสื้อ) และเทากลาง กักกันผิวหนังด้วย MediaPipe/YuNet แล้วคำนวณปรับ `wb.temp` และ `wb.tint` แบบไดนามิก พร้อมขึงเพดานความอุ่นไม่เกิน `6220K` เพื่อให้สีขาวเป็น $R = G = B$ ปราศจากคราบเหลืองเลี่ยน
3. **Face-Scale Aware Ultra Pop Exposure (+1.28 ถึง +1.58 EV Floor):**
   - ปลดล็อกเพดานแสงคงที่ โดยชดเชยแสงตามพื้นที่ใบหน้าหลัก (`max_face_area`) สัมพันธ์กับความสว่างผิวจริง ภาพมุมแคบไม่โอเวอร์ ภาพมุมกว้างไม่จมมืด พร้อมขึงฐานความสว่างขั้นต่ำ `+1.28 EV`
4. **Adaptive Tone Controls Coupling (Highlights -56 ถึง -66, Whites +38 ถึง +42, & Blacks -7 ถึง -8):**
   - สเกลลึกตามค่า EV ล็อกผมดำสนิทไม่ให้เทาลอย ขับผิวสว่างให้ "ป๊อป เด้ง" มีมิติ 3D คมชัด และกางเกราะป้องกันไม่ให้หน้าผาก/ไฮไลท์ขาวหลุด Clipping
5. **Universal Multi-Face Glow Masking (Dewy Skin Pop):**
   - สแกนและสวม Face Glow Mask ให้กับ **"ทุกคนในภาพ"** ไม่ทิ้งใครไว้ข้างหลัง ปรับผิวนุ่มละมุน ฉ่ำวาว ดุจกระจก ด้วย `Exposure +0.42, Whites +16, Shadows +25, Clarity -10, Temp -2`
6. **Dopamine Palette & Peach Apricot Glow:**
   - Tone Curve กระจกเงา `(192, 212)` เพิ่ม **Orange Luminance (+24)**, **Yellow Luminance (+12)**, **Red Saturation (+8)**, **Green Saturation (+4)** และ **Midtones Apricot Hue 22, Sat 10** เติมความสดใสฉ่ำวาว ผิวขาวอมชมพูพีชระเรื่อ

---

## 🎨 DoctorBank 2026 Korean Idol & Studio Preset Suite (.xmp)

ติดตั้งและพร้อมใช้งานทันทีใน **Adobe Lightroom Classic** และ **Camera Raw**:
- โฟลเดอร์ Lightroom: `C:\Users\Admin\AppData\Roaming\Adobe\Lightroom\Develop Presets\DR.Bank Preset\`
- โฟลเดอร์ Camera Raw: `C:\Users\Admin\AppData\Roaming\Adobe\CameraRaw\Settings\DoctorBank 2026 Korean Suite\`

| พรีเซ็ต | บทบาทและแนวภาพ | พารามิเตอร์เด่น |
|---|---|---|
| **`[DB] 01 - Korean Idol Glass Skin (Master)`** | สไตล์ดารา-ไอดอลเกาหลี ผิวขาวใส อมชมพูพีชระเรื่อ ดุจกระเบื้องเคลือบ (Porcelain Glass Skin) | Orange Lum +18, Sat -2, Red Sat +8, Green Sat +4, Midtone Hue 22 Sat 10, Texture +6, Clarity +3 |
| **`[DB] 02 - Ultra Airy Pop (Studio Japan)`** | สไตล์ High-Key ญี่ปุ่น สะอาดตา โปร่ง โล่ง สบายตา เสื้อขาววิ้ง (FEB_1600 Ground Truth) | Whites +22, High -48, Shadows +36, Green Sat -14, Texture +4 |
| **`[DB] 03 - Warm Porcelain (Tungsten Neutralizer)`** | กู้ชีพภาพในร่ม/ร้านอาหาร/ไฟส้มทังสเตน ฆ่าคราบเหลืองเลี่ยน ดึงผิวเนียนผ่อง ไม่ติดฟ้าซีด | Yellow Sat -28, Orange Sat -14, Lum +20, Shadow +40, High -55 |
| **`[DB Mod] Korean Pink Blush & Glow`** | เครื่องมือคลิกเสริม: สวมสีผิวอมชมพูและกลาสสกินให้รูป โดยไม่แตะ Exposure หรือ WB เดิม | Red/Orange HSL + Calibration Boost เพียวๆ ผิวเด้งทันที |

---

## 🍳 DoctorBank 2026 Food Preset Suite (.xmp)

ชุดพรีเซ็ตภาพอาหารระดับพรีเมียม (Dopamine Palette & Ceramic Plate Shield) สำหรับ **LightCraft**, **Lightroom Classic**, และ **Camera Raw**:
- โฟลเดอร์ Lightroom: `AppData\Roaming\Adobe\Lightroom\Develop Presets\DoctorBank 2026 Food Suite\`
- โฟลเดอร์ Camera Raw: `AppData\Roaming\Adobe\CameraRaw\Settings\DoctorBank 2026 Food Suite\`

| พรีเซ็ต | แนวภาพและประเภทอาหาร | พารามิเตอร์เด่น & วิศวกรรมสี |
|---|---|---|
| **`[DB Food] 01 - Golden Crisp & Cafe Pop`** | คาเฟ่ เบเกอรี่ กาแฟ และอาหารเช้า คลีน สดใส จานขาวไม่ระเบิด | Contrast +12, High -35, Shadow +24, Texture +10, Red Sat +16, Orange Lum +10, Yellow Hue +10 |
| **`[DB Food] 02 - Dark Michelin & Omakase`** | Fine Dining, โอมากาเสะ, อิซากายะ, สเต็กเฮาส์ สปอตไลต์มู้ดดี้ ซอสฉ่ำเงา ลึก มีเสน่ห์ | Contrast +22, High -40, Shadow -12, Whites +20, Blacks -10, Texture +14, Clarity +10, Amber Split-Tone |
| **`[DB Food] 03 - Vivid Feast & Street Sizzle`** | สตรีทฟู้ด อาหารไทยรสจัดจ้าน คอนทราสต์จัด สีจัดจ้าน ชวนน้ำลายสอ | Contrast +28, High -45, Shadow +18, Whites +28, Blacks -12, Vibrance +20, Red/Orange/Yellow Sat +22..+26, Texture +16 |

> **กฎเหล็กวิศวกรรมสีอาหาร (Food Color Science):**
> 1. **ยอมให้แตะ Tone & Contrast:** ขับความฉ่ำเด้งของอาหาร ด้วย Contrast (+12 ถึง +28) และเกราะกันจานขาวระเบิด Highlights (-35 ถึง -45)
> 2. **ห้ามแตะ Exposure ในพรีเซ็ต:** ปล่อย Exposure = 0.0 เสมอ เพื่อให้ปรับหมุนแสงจริงตามสภาพร้านได้อย่างอิสระ
> 3. **Dopamine Palette:** ดึง Red/Orange/Yellow เพื่อกระตุ้นต่อมรับรสและทำให้อาหารดูสดใหม่ กรอบ อร่อย น่ากินที่สุด

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
