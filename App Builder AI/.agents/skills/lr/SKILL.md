---
name: lr
version: "2.0.0"
description: >-
  Intelligent Portrait and Culinary Food Development and GPU Direct Export Engine for LightCraft and Lightroom workflows.
  Features Korean Idol Glass Skin and Universal Porcelain Master Suite with Zero-Clutter History Protection (history.clear single-step guarantee),
  Zero-Edge Powdered Skin (Clarity -4, Texture 0, Orange Lum +26, Yellow Sat -16, Red Sat -20),
  Salient Neutral White and Tungsten Neutralizer (5450K-5750K), Histogram Dynamic Fill Metering (+0.75 to +1.48 EV), Automatic Pick-Flagging (photo.flag pick),
  DoctorBank 2026 Food Suite, 4-Dimension Situational Radar, Tone Curve (192, 212), and Clean 5-Tier Combo Presets.
  Supports /lr (Smart Default), /lrlive (Live GUI Sync), /lrbatch (Batch Render JPEG), and /lrexport (One-Click GPU Fast Export 2048px).
---

# Skill: `/lr` (`/lrlive` / `/lrbatch` / `/lrexport`) — Intelligent Portrait Development Engine

## 📌 ภาพรวม (Overview)
เครื่องยนต์แต่งภาพพอร์ตเทรตอัจฉริยะระบบครบวงจร (4-Tier Architecture) รองรับทั้งการเกรดสีสดๆ บนหน้าจอ **LightCraft GUI**, การประมวลผลเรนเดอร์เบื้องหลัง, คำสั่ง **Direct GPU Export** รวดเดียวทั้งอัลบั้ม และชุดพรีเซ็ต **"Universal Porcelain Master & Korean Idol Suite"** (พร้อมใช้งานบน LightCraft GUI และ .xmp สำหรับ Adobe Lightroom Classic / Camera Raw) ด้วยมาตรฐานผิวขาวกระจ่างใส อมชมพูระเรื่อ ดุจกระเบื้องเคลือบสไตล์ดารา-ไอดอลเกาหลี พร้อมระบบ **Auto Pick-Flagging** ปักธงรูปที่ปรับแล้วให้อัตโนมัติเพื่อง่ายต่อการฟิลเตอร์ และระบบ **Zero-Clutter History Protection** ยุบประวัติการแต่งภาพเหลือ Step เดียว คลีนตา 100%

---

## ⚡ 4 พี่น้องตระกูล `/lr` (Command Triggers)

| คำสั่ง | มู้ดการใช้งาน | พฤติกรรมของระบบ |
|---|:---:|---|
| **`/lr`** | **Smart Workhorse** | **ค่าตั้งต้นสุดฉลาด:** ถ้าเปิด LightCraft ค้างไว้ จะทำ Live Sync อัลบั้มปัจจุบันทันที หรือถ้าตามด้วยชื่ออัลบั้มจะ Auto-resolve ค้นหาโฟลเดอร์ให้ |
| **`/lrlive`** | **Pure GUI Sync** | **ล็อกโหมดสด 100%:** สแกนและปรับสไลเดอร์สดๆ ในหน้าต่าง LightCraft พร้อมปักธง 🚩 Pick Flag ให้ทุกรูปที่ปรับ และเคลียร์ History ให้เหลือ Step เดียว (เช่น `/lrlive` หรือ `/lrlive "HBD Tiger"`) |
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

## 🧬 7 เสาหลักสถาปัตยกรรม (Core Architectural Pillars v2.0.0)

1. **Zero-Clutter History Protection (`history.clear` — กฎเหล็กล้างประวัติเหลือ Step เดียว สะอาดตา 100%):**
   - ทุกครั้งที่รันประมวลผล สวมพรีเซ็ต หรือจูนค่าแสง **ห้ามปล่อยให้มี History ลากยาวเป็นพรืดเด็ดขาด!**
   - ระบบจะส่งต่อค่าพรีเซ็ต + พารามิเตอร์ develop + หน้ากาก Multi-Face Glow แล้วจบด้วยคำสั่ง `history.clear` ทันที เพื่อยุบและล้างประวัติการปรับแต่งทั้งหมดให้เหลือเพียงสเต็ปเดียว (`Cleared History`) โดยคงค่าการเกรดสีและพรีเซ็ตไว้ครบถ้วน 100% หน้าต่าง History ของ LightCraft สะอาด คลีน ไร้ขยะรบกวนสายตา
2. **Automatic Pick-Flagging (`photo.flag: pick` — ปักธงรูปที่ปรับแล้วอัตโนมัติ):**
   - ทุกรูปที่ผ่านการปรับจูนระบบจะยิงคำสั่ง `photo.flag` ปักธงขาว (Pick Flag) ให้อัตโนมัติทันที เพื่อให้ผู้ใช้กดฟิลเตอร์กรองดูเฉพาะรูปที่ปรับแต่งแล้วได้ในคลิกเดียว
3. **Indoor Tungsten Neutralizer & Neutral Floor Guard (5450K - 5750K vs 6150K):**
   - กำจัดคราบเหลืองเลี่ยนของหลอดไฟทังสเตนและแสงสะท้อนจากผนังไม้ในคาเฟ่ ด้วยการดรอป Kelvin ลงมาที่ช่วง 5450K-5750K Tint -2.5
   - **Neutral Floor Guard (กันหน้าฟ้า/เขียว):** หากภาพต้นฉบับไม่ได้เหลืองจัด หรือถ่ายริมหน้าต่าง/กึ่งเอาท์ดอร์ (R/B < 1.15) ระบบจะ **ล็อกไว้ที่ 6050K-6150K Tint -1.5** อัตโนมัติ เพื่อป้องกันไม่ให้ผิวติดฟ้า ซีด หรือเขียวหลอกตา
4. **LightCraft Face Luminance Physics (Highlights & Whites Only — กฎเหล็กคุมแสงหน้าคน):**
   - **ความแตกต่างสำคัญจาก Lightroom Classic:** ใน LightCraft (Rust GPU Engine) สไลเดอร์ **`Shadows` และ `Blacks` ไม่มีผลต่อความสว่างของผิวหน้าคนเลย (0% effect)** ผิวหน้าคนจะอยู่ในย่านความสว่างที่ตอบสนองต่อ **`Highlights` และ `Whites` (บวกกับ `Exposure` และ `Orange Lum`) เท่านั้น!**
   - **ข้อห้ามเด็ดขาด:** ห้ามกด Highlights จมลึก (-50 ถึง -65) เด็ดขาด เพราะจะทำให้ "แสงหน้าคนดรอป" ทันที และไม่สามารถใช้ Shadows งัดหน้าขึ้นมาชดเชยได้เหมือนใน LR
5. **Coupled Highlights & Headroom Protection (Highlights -25 ถึง -35 & Whites +13 ถึง +18):**
   - ล็อกเพดาน Highlights ไว้ที่ช่วงทองคำ **`-25.0 ถึง -35.0`** เพื่อรักษาความสว่างออร่าของใบหน้าและมิติแสงแดดธรรมชาติให้โปร่งสบายตา แสงไม่ดรอป
   - เสริมพลังความขาวกระจ่างใสของผิวด้วย **`Whites (+13.0 ถึง +18.0)`** และ **`HSL Orange Lum (+26.0)`** ปล่อยให้ Shadows และ Blacks ทำหน้าที่คุมเฉพาะความลึกของฉากหลัง กิ่งไม้ และเส้นผมเท่านั้น ห้ามหวังผลยกหน้าด้วย Shadows เด็ดขาด!
6. **Zero-Edge Powdered Finish (แป้งพัฟระดับพิกเซล ไร้ขอบลอย 100% — Anti-Spill Tuning):**
   - **กฎเหล็กเรื่องสีผิวธรรมชาติ:** สกัดอาการหน้าแดงก่ำ/หน้าไหม้แดดด้วย **Red Sat (-20.0)** และ **Orange Sat (-6.0)**
   - **วิธีสร้างเนื้อแป้งที่ถูกต้อง:** ใช้ **HSL Orange Lum (+26.0)** ดึงแสงเฉพาะเม็ดสีผิวคน 0% ลามไปโดนโต๊ะหรือผม ร่วมกับ **Yellow Sat (-16)** ล้างคราบเหลืองสะท้อน และ **Clarity (-4.0) + Texture (0.0)** ลบความสากหยาบของรูขุมขน กลายเป็นผิวขาวเนียนนุ่มเหมือนตบแป้งพัฟบางๆ โดยที่ดวงตายังคมกริบ ไร้ขอบลอย 100%
7. **Pure Translucent Porcelain Skin & Dopamine Palette:**
   - Tone Curve กระจกเงา `(192, 212)` ร่วมกับ **Blue Calibration Sat (+16.0)**, **Yellow Luminance (+14)**, **Temp -2, Tint +4** เกลี่ยผิวขาวใสอมชมพูเรียบเนียนเป็นเนื้อเดียวกัน ไร้การฉาบแป้งด้วย Mask หลอกตา

---

## 🎨 DoctorBank 2026 Universal Porcelain & Mod Preset Suite

ติดตั้งและพร้อมใช้งานทันทีทั้งใน **LightCraft GUI** (ผ่าน Socket API / `presets.json`) และ **Adobe Lightroom Classic / Camera Raw**:
- โฟลเดอร์ Lightroom: `C:\Users\Admin\AppData\Roaming\Adobe\Lightroom\Develop Presets\DR.Bank Preset\`
- โฟลเดอร์ Camera Raw: `C:\Users\Admin\AppData\Roaming\Adobe\CameraRaw\Settings\DoctorBank 2026 Korean Suite\`

| พรีเซ็ต | บทบาทและแนวภาพ | พารามิเตอร์เด่น & วิศวกรรมสี |
|---|---|---|
| **`[DB] 00 - Universal Porcelain Master`** | **Master Base พ่อทุกสถาบัน:** ผิวขาวกระจ่างใส อมชมพูระเรื่อ ไม่ติดเหลือง ไม่แดงก่ำ คลีนทุกสถานการณ์ | Orange Lum +26, Sat -6, Red Sat -20, Yellow Sat -16, Temp -2, Tint +4, Blue Calibration +16, Tone Curve (192, 212) |
| **`[DB Mod] Scene - Garden & Lawn`** | **Combo เสริมฉากหญ้า/สวน:** ลดคราบเขียวสะท้อนเข้าหน้า ดรอป Saturation สีเขียว ดึงฉากหลังนุ่มตา | Green Sat -24, Green Lum +10, Yellow Sat -18 |
| **`[DB Mod] Scene - Backlit Shadow Lift`** | **Combo ช็อตย้อนแสง:** ยกเงาใบหน้า ดึงรายละเอียดเสื้อผ้าโดยไม่ทำให้ไฮไลท์ระเบิด | Shadows +48, Exposure +0.40, Highlights -60 |
| **`[DB Mod] Tool - Extra Rosy Blush`** | **Combo เติมแก้มอมชมพู:** เพิ่มเฉดสีผิวให้มีเลือดฝาด ดูสุขภาพดีสไตล์เกาหลี | Tint +4, Red Sat +12, Red Hue -4 |
| **`[DB Mod] Tool - Kill Red Flush`** | **Combo ฆ่าหน้าแดง/สิวผื่น:** กู้ชีพคนผิวแดงจัด หน้าเบิร์นแดด ให้กลับมาขาวเนียนผ่อง | Red Sat -30, Red Lum +15, Orange Sat -8 |
| **`[DB] 01 - Korean Idol Glass Skin (Master)`** | สไตล์ดารา-ไอดอลเกาหลี ผิวขาวใส อมชมพูพีชระเรื่อ ดุจกระเบื้องเคลือบ (Legacy Master) | Orange Lum +18, Sat -2, Red Sat +8, Green Sat +4, Midtone Hue 22 Sat 10, Texture +6, Clarity +3 |
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
