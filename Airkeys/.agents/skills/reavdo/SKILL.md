---
name: reavdo
description: >-
  Master Shot-by-Shot Video Forensics, 4-Stem Audio Extractor & Downstream Handoff Router (Powered by JuneYaooo/rea-video) — ด่านหน้าตัวหลักสำหรับผ่าชันสูตรคลิปวิดีโอทุกชนิดทีละช็อต (แยกถ่ายจริง / เจน AI / โค้ดโมชัน / 3D / อวตาร), แยกแทร็กเสียง 4 Stems (เสียงพูดล้วน vocals.wav, ดนตรี music.wav, เอฟเฟกต์ effects.wav + หั่นไฟล์เสียง sfx/*.wav), ดึงซับไตเติ้ล (.srt/.ass) และเฟรมตั้งต้นสะอาดไร้ตัวหนังสือ (Clean Keyframes) พร้อมสร้างใบจ่ายงาน HANDOFF_DISPATCH.md และแพ็กเกจ VIDEO.md เพื่อส่งต่อให้ /hfclone, /vdoclone, /flow, /h3tvc, /h3ugc, /earshot, /hflibrary และ /clonescript อัตโนมัติ ใช้เมื่อ: /reavdo [path/url] หรือ /reavideo [path/url]
---

# 🔬 Skill: `/reavdo` (alias: `/reavideo`) — Master Video Forensics & Downstream Handoff Hub

ด่านหน้าตัวหลัก (Primary Upstream Video Decomposer) ของระบบ สำหรับ **ผ่าชันสูตรคลิปวิดีโอคู่แข่งหรือคลิปอ้างอิงทุกชนิดทีละช็อต** ก่อนจ่ายงานต่อไปยังสกิลผลิตปลายทางในระบบของเรา

---

## 🏗️ สถาปัตยกรรมการทำงาน (Upstream Hub ➔ Downstream Builders)

```mermaid
flowchart TD
    Input["🎬 คลิปต้นฉบับ (ไฟล์ MP4 หรือ URL TikTok/Reels/Shorts)"] --> Hub["🔬 /reavdo (Master Decomposer)\npython tools/reavdo.py"]
    
    Hub --> P1["1️⃣ Shot Forensics (VIDEO.md)\nจำแนกทีละช็อต: Live / AI / Code / 3D / Avatar"]
    Hub --> P2["2️⃣ 4-Stem Audio & SFX Slicer\nvocals.wav | music.wav | effects.wav | sfx/*.wav"]
    Hub --> P3["3️⃣ Packaging & Clean Plates\nsubtitles.srt/.ass + Sticker Crops + Clean Seed Frames"]
    Hub --> P4["4️⃣ HANDOFF_DISPATCH.md\nตารางจ่ายงาน + คำสั่ง Copy-Paste เข้าสกิลปลายทาง"]

    P4 -->|ช็อต Code / Motion Graphic| D1["🎨 /hfclone & /hflibrary\nแกะโค้ด HTML+GSAP + Alpha ProRes"]
    P4 -->|ช็อต AI Video / B-Roll| D2["🎥 /vdoclone · /flow · /h3tvc · /h3ugc\nโคลนด้วย Clean First Frame + Optical Flow"]
    P4 -->|ไฟล์เสียง SFX & Stems| D3["🔊 /earshot & คลังเสียง VVE\nนำไฟล์ sfx/*.wav และ vocals.wav ไปใช้งานทันที"]
    P4 -->|บทพูด & โครงสร้างซับ| D4["📝 /clonescript & /hfscript\nแปลงเป็นบทแอดหมอแบงค์ 4 ซีน / 19 ช็อต"]
```

---

## 💻 คำสั่งเรียกใช้งาน (CLI & Slash Commands)

### 1. ผ่าชันสูตรครบวงจร (Full Forensics + 4 Stems + Subtitles + Handoff Router)
```powershell
# โยนไฟล์ MP4 หรือลิงก์ TikTok / Reels / YouTube เข้าไปตรงๆ
python tools/reavdo.py "path/to/video.mp4"
python tools/reavdo.py "https://www.tiktok.com/@user/video/7123456789"
```

### 2. โหมดด่วนพิเศษ (Fast Shot Breakdown — ข้ามการแยกเสียงและ OCR ซับ)
ใช้เมื่อต้องการรู้โครงสร้างช็อต, วิธีทำรายช็อต (Live vs AI vs Code), และดึงเฟรมตั้งต้นอย่างรวดเร็วใน ~10–15 วินาที:
```powershell
python tools/reavdo.py "path/to/video.mp4" --fast
```

### 3. โหมดผสานตาเทพ Gemini VLM (`--vlm`)
ใช้เมื่อคลิปถูกบีบอัดซ้ำจากแพลตฟอร์มจน Sensor Noise หาย หรือต้องการให้ Gemini ช่วยเขียน Reverse Prompt รายช็อตพร้อมตรวจช็อตที่ก้ำกึ่ง:
```powershell
python tools/reavdo.py "path/to/video.mp4" --vlm
```

### 4. โหมดดูดเสียง 4 Stems ล้วน (`--stems-only`)
ใช้เมื่อต้องการดึงเฉพาะเสียงพูดแห้ง (`vocals.wav`), ดนตรี (`music.wav`), และเสียงเอฟเฟกต์ (`effects.wav`) ด้วยโมเดล UVR MDX-Net + BandIt v2:
```powershell
python tools/reavdo.py "path/to/video.mp4" --stems-only
```

---

## 📂 โครงสร้างไฟล์ผลลัพธ์ใน `scratch/reavdo/<ชื่อคลิป>/`

เมื่อรัน `/reavdo` เสร็จ ระบบจะสร้างชุดไฟล์พร้อมเสียบต่อสายพานทันที:
1. **`HANDOFF_DISPATCH.md`** ⭐ — **ใบจ่ายงานภาษาไทย** สรุปตารางรายช็อต พิกัดไฟล์เสียง/เฟรมตั้งต้น และคำสั่ง Copy-Paste สำหรับรัน `/hfclone`, `/vdoclone`, `/hflibrary`, `/clonescript` ต่อทันที
2. **`VIDEO.md` + โฟลเดอร์ `video/`** — แพ็กเกจข้อมูลแบบ Layered Open Format สำหรับให้ AI Agent อ่านเจาะเฉพาะช็อตโดยไม่เปลือง Token
3. **`report.html` & `report.md`** — รายงานฉบับเต็มพร้อมกราฟ Timeline เสียงและปุ่มกดฟังเสียง SFX รายจุดในเบราว์เซอร์
4. **`storyboard.jpg` & `audio.png`** — แผ่นภาพรวมทุกช็อตและกราฟคลื่นเสียง/จุดตัดบีต
5. **`shots/shot_XXX_first.jpg`** — เฟรมแรกของทุกช็อตสำหรับส่งเข้า Image-to-Video (`/flow`, `/h3tvc`, `/h3ugc`)
6. **`stems/` & `sfx/`** — แทร็กเสียงแยกส่วน (`original.wav`, `vocals.wav`, `music.wav`, `effects.wav`) และไฟล์เสียงเอฟเฟกต์ที่ถูกหั่นแยกชิ้น (`sfx/*.wav`)
7. **`packaging/`** — ไฟล์ซับไตเติ้ล `.srt`, `.ass` (พร้อมสีและตำแหน่ง) และภาพสติกเกอร์ที่แคปแยกออกมา

---

## 🛡️ กฎเหล็กการทำงานของ Agent เมื่อผู้ใช้เรียก `/reavdo`

1. **รัน `python tools/reavdo.py` เป็นด่านแรกเสมอ:**
   - หากผู้ใช้ต้องการผ่าเต็มสูบ (ทั้งภาพ เสียง ซับ SFX) ให้รันคำสั่งมาตรฐาน
   - หากผู้ใช้ต้องการเช็กโครงสร้างช็อตไวๆ ให้เติม `--fast`
2. **เปิดอ่าน `HANDOFF_DISPATCH.md` และ `VIDEO.md`:**
   - ห้ามเปิดอ่าน `breakdown.json` ดิบทั้งก้อนในแชทเพื่อประหยัด Context Window ให้ดูจาก `HANDOFF_DISPATCH.md` และ `VIDEO.md` เสมอ
3. **รายงานผลกระชับ + เสนอทางไปต่อทันที:**
   - สรุปให้ผู้ใช้เห็นว่าคลิปนี้มีกี่ช็อต แบ่งเป็น Live / AI / Code กี่ %
   - แนบลิงก์คลิกเปิด [`HANDOFF_DISPATCH.md`], [`report.html`], และ [`storyboard.jpg`]
   - ถามผู้ใช้สั้นๆ ว่าจะให้ส่งช็อตไหนเข้า `/hfclone` (แกะโค้ด GSAP), `/vdoclone` (แกะ I2V Prompt), หรือ `/clonescript` (แปลงบทหมอแบงค์) ต่อทันที
