---
name: h3ugc
version: "1.0.0"
updated_at: "2026-11-02"
description: >-
  MiniMax H3 UGC Commercial Video Production Engine — ควบคุมสายพานผลิตวิดีโอแอด TikTok Shop 40 วินาทีเกรด Commercial บน Google Colab G4 Blackwell (96GB VRAM) / A100 ด้วย Native Full Precision (10-14 Steps, Zero LoRA/Turbo Distortion) ผสาน Master Candidate Pre-QC ใน IDE, Dual-Anchor Conditioning (Endframe + Master Ref), External TTS (ElevenLabs / MiniMax Speech-01), ByteDance LatentSync Lip-sync, และ Anti-Morphing Product Guard สำหรับ DoctorBank ใช้เมื่อ: /h3ugc [path/to/storyboard.md] หรือ /h3ugc [คำสั่งเรนเดอร์]
---

# 🎬 Skill: `/h3ugc` (MiniMax H3 Commercial UGC Video Engine)

เอนจินควบคุมสายพานผลิตวิดีโอโฆษณา TikTok Shop และ UGC Commercial ความยาว 40 วินาทีเต็ม (4 ซีนต่อเนื่อง) แบบ **Native Full Precision 100% (ไร้การบีบอัด Turbo LoRA)** บนสถาปัตยกรรม **Google Colab G4 Blackwell (NVIDIA RTX PRO 6000 96GB VRAM)** หรือ **A100 High-RAM**

---

## ⚡ สถาปัตยกรรม 6 สเต็ปหลัก (The 6-Phase Pipeline)

```text
[1. สคริปต์พิมพ์เขียว] ──► รับ storyboard.md จาก /clonescript (4 ซีน 110-120 ch, Zero ค่ะ/นะคะ)
          │
          ▼
[2. สวมเกราะคำอ่าน] ──► วิ่งผ่าน Phonetic Normalizer (ด็อก-เต้อ-แบ๊ง, แม็ก-นี-เซี่ยม ไน้-พลัส, ตี-สอง)
          │
          ▼
[3. คัดตัวละครใน IDE] ──► เจน Candidate ด้วย generate_image ➔ QC ปากผ่อนคลาย + ผิวแมตต์ ➔ ล็อก Master Anchor
          │
          ▼
[4. ผลิตเสียงพากย์ Tier S] ──► ยิงบทพูดเข้า ElevenLabs / MiniMax Speech-01 ➔ ได้ s1.wav - s4.wav ล่วงหน้า
          │
          ▼
[5. รัน Colab G4 Blackwell] ──► H3 Native Full (10-14 Steps) + Dual-Anchor + LatentSync ซิงก์ปากเป๊ะ 100%
          │
          ▼
[6. รวมไฟล์ Master] ──► FFmpeg Concat 4 ซีน = 40 วินาที ➔ Auto-Sync เข้า 00_MASTER_PREVIEWS/
```

---

## 🛡️ กฎเหล็ก 5 ประการของ `/h3ugc` (The 5 Iron Rules)

### 1. Dual-Anchor Conditioning (กันภาพแตก เบลอ วุ้น ในซีนต่อเนื่อง)
ในการรันซีนที่ 2, 3, 4 ห้ามส่งเฉพาะ Endframe ของซีนก่อนหน้าอย่างเดียว เพราะจะเกิดการสะสมสัญญาณรบกวน (Compounding Drift) จนหน้าละลายเป็นวุ้น:
* **Structural Anchor:** ป้อน `s{N-1}_endframe.jpg` เพื่อคุมมุมกล้อง ท่าทาง และความต่อเนื่อง
* **Identity & Quality Anchor:** ป้อน `identity_ref` (ภาพ Master ความละเอียดสูงที่ผ่านการ QC จาก IDE) เข้าโมเดลคู่กันเสมอ เพื่อล็อกเบ้าหน้า ตา จมูก ปาก ให้คมชัด 4K เท่าเดิม 100%

### 2. Tabletop Static Camera Only (ห้ามใช้ Handheld Shake)
* **มุมกล้อง:** ตั้งกล้องหน้านิ่งๆ บนโต๊ะ (Tabletop Propped Phone / Desk Stand) ระดับสายตา/อก แนวตั้ง 9:16
* **ความลึกภาพ:** Deep depth of field เห็นฉากห้องนอน/คอนโดเป็นธรรมชาติ ห้ามทำฉากหลังเบลอแบบ DSLR หลอกตา
* สองมือตัวละครเป็นอิสระ ไม่ต้องถือโทรศัพท์มือถือ

### 3. Anti-Morphing & Bottle Scale Guard (คุมขวดสินค้าจริง 100%)
* **สเกลขวด:** ขวดแก้วสีชาขนาดมาตรฐาน 250ml (สูงประมาณ 12–14 ซม.) สมส่วนกับมือมนุษย์ ไม่ใช่ถังยักษ์และไม่ใช่ขวดยาหยอดตา
* **รูปทรง:** ทรงกระบอกแก้วสีชาเข้ม ฝาเกลียวสีขาวมีรอยหยักปิดสนิท ฉลากขาว-น้ำเงิน โลโก้พระจันทร์เสี้ยว DOCTORBANK
* **กฎเหล็กห้ามเปิดฝา:** ห้ามสั่งให้ตัวละครเปิดฝาขวด หรือเทแคปซูลออกจากขวดเด็ดขาด! ให้ใช้:
  * *ท่า A (Tabletop Hero):* วางขวดปิดฝาแน่นบนโต๊ะข้างหน้า มือถือแค่แคปซูลขาว 1 เม็ดโชว์ข้างแก้ม
  * *ท่า B (One-Hand Base Hold):* มือจับเฉพาะฐานล่างของขวด ยกขึ้นระดับข้างแก้ม/อก อีกมือปล่อยว่าง

### 4. Anti-Basket Negative Constraint
เมื่อสคริปต์พูดถึง "ตะกร้าซ้ายล่าง" บังคับใส่ข้อห้ามใน Prompt ทุกครั้ง:
`NO physical basket, NO picnic basket, NO wicker basket, NO prop basket. The word basket refers exclusively to a mobile shopping UI button, NOT an object in the room.`

### 5. Native Full Denoise (10–14 Steps)
* **ห้ามใช้ Turbo LoRA 6–8 Steps:** เพื่อขจัดปัญหาผิวพลาสติกมันวับ คราบสีอมเขียว-เหลือง และภาพมัว
* **Optimal Step Selection บน G4 Blackwell (96GB):**
  * `10 Steps`: สปีดเร็วสุด (~130s/ซีน) คุณภาพดี 90%
  * `12 Steps (แนะนำสูงสุด / Optimal Sweet Spot)`: สปีดปานกลาง (~160s/ซีน) คุณภาพใสกริบ 95%
  * `14 Steps`: คุณภาพระดับสูงสุดสำหรับแอดฮีโร่ (~190s/ซีน)

---

## 🎙️ การเสียบไฟล์เสียง TTS (Audio Injection Protocol)

### จังหวะการเสียบไฟล์เสียง (Timing):
1. **ในสายพานอัตโนมัติ (`h3_ugc_runner.cjs`):**
   * ระบบจะอ่านบทพูดจาก `storyboard.md` ➔ ยิงเข้า API (ElevenLabs / MiniMax) ➔ ได้ไฟล์เสียง `s1.wav` ถึง `s4.wav`
   * สคริปต์จะโยนไฟล์ `.wav` ขึ้น Colab ผ่าน API `/upload/audio` **ก่อนสั่งรัน ComfyUI**
   * ComfyUI จะอ่านไฟล์เสียงเข้าโหนด **LatentSync** เพื่อขยับปากและผสานเสียงเข้าเป็น MP4 อัตโนมัติในรอบเดียว
2. **ในการเปิด ComfyUI หน้าเว็บเล่นเอง (Manual Mode):**
   * เสียบไฟล์ `s1.wav` ลงในโหนด `LoadAudio`
   * เสียบภาพ `master.jpg` ลงในโหนด `LoadImage`
   * ตั้งค่า Steps เป็น 12 แล้วกด **"Queue Prompt"**

---

## 💻 วิธีการสั่งรัน (Execution Commands)

### 1. โหมดคัดตัวละครใน IDE ก่อน (Pre-QC Step)
```powershell
# เจนภาพ Master Candidate ดูใน IDE ก่อน
python -c "from default_api import generate_image..."
```

### 2. โหมดรันแคมเปญจริง 4 ซีนต่อเนื่อง (Full Production Run)
```powershell
node "C:\My Claw\Openclaw-VPS\tools\colab-ai-video\h3_sequential_ugc_chain.cjs" --storyboard "C:\My Claw\The Viral\Ads DRB\Campaigns\Magnesium\DRB_MAG_01_A_UGC\storyboard.md" --master "C:\My Claw\The Viral\output\netidol_master_matte_v2.jpg" --steps 12 --endpoint http://colab-doctorbank:8188
```

### 3. โหมดเทสวัดความคุ้มค่า Steps (Step Sweep Benchmark: 10 vs 12 vs 14 vs 16)
```powershell
node "C:\My Claw\Openclaw-VPS\tools\colab-ai-video\test_scene3_native_full.cjs" --sweep 10,12,14,16 --endpoint http://colab-doctorbank:8188
```
