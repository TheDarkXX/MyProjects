---
name: vdoclone
description: >-
  Reverse-engineer any AI video or viral clip into prompt formulas, camera motion vectors, and Image-to-Video seed frames for Veo 3.1, Kling, Wan 2.1, and Luma.
---

# 🎬 /vdoclone — AI Video Reverse-Engineering & Prompt Inversion Engine

ส่องไส้ในวิดีโอ AI แกะ Prompt, Lighting, Cinematography, และ Camera Motion Dynamics ออกมาเป๊ะ 1:1 ด้วยระบบ 3-Stage Hybrid Analysis (FFmpeg + OpenCV Farneback Optical Flow + Gemini Multimodal Vision) พร้อมแจกแจงสูตร Prompt สำหรับ **Google Veo 3.1**, **Kling / Runway Gen-3**, **Wan 2.1 / ComfyUI / Luma Dream Machine** และ **Image-to-Video (I2V)**

---

## 🎯 ความสามารถหลัก (Core Capabilities)

1. **Deterministic Optical Flow Analysis (OpenCV Farneback):**
   - วัดทิศทางและเวกเตอร์การเคลื่อนกล้องจริงทางฟิสิกส์ (Dolly In/Out, Pan Left/Right, Tilt Up/Down, Static)
   - ไม่พึ่งพาการเดาของ LLM แต่คำนวณเวกเตอร์ความเร็ว (dx, dy, radial divergence) จากพิกเซลจริง
2. **Keyframe & Motion Progression Extraction:**
   - **`frame_0.png`:** Anchor Frame แรกสุดสำหรับนำไปเป็น Seed Image ในโหมด Image-to-Video (ได้ความแม่นยำ 98% ทันที)
   - **`frame_last.png`:** End Frame เพื่อดูการสิ้นสุดของการเคลื่อนไหว
   - **`motion_strip.jpg`:** Contact Sheet การเคลื่อนไหว 5 จังหวะ (0%, 25%, 50%, 75%, 100%)
3. **Multimodal Dense Prompt Inversion (Gemini Vision Cascade):**
   - ถอดรหัส **Subject DNA** (สรีระ, ผิว, เสื้อผ้า, อารมณ์)
   - ถอดรหัส **Lighting & Environment** (Key light, Rim light, Volumetric, Color palette)
   - ถอดรหัส **Cinematography & Optics** (Focal length, DoF, Shutter angle)
   - ถอดรหัส **Physics & Dynamic Motion** (การสะบัดของผ้า, ลม, อนุภาค, ทิศทางการแพน)
4. **Target Model Tailoring:**
   - **Google Veo 3.1:** ภาษาธรรมชาติบรรยายภาพยนตร์ลื่นไหล
   - **Kling / Runway Gen-3:** ไวยากรณ์ Camera Bracket เช่น `[Camera: Slow Dolly In, Pan Left]`
   - **Wan 2.1 / ComfyUI / Luma:** Prompt สไตล์ Dense Tags และ Negative Prompt
   - **I2V Direction:** สั่ง Motion เฉพาะจุดคู่กับ `frame_0.png`

---

## 💻 การเรียกใช้งาน (CLI & Slash Command)

```bash
# 1. ใช้งานผ่าน Slash Command
/vdoclone <path_to_video.mp4>

# 2. รัน CLI ผ่าน Python ตรงๆ
python tools/vdoclone.py "C:/path/to/clip.mp4"

# 3. กำหนดโฟลเดอร์ Output ปลายทาง
python tools/vdoclone.py "C:/path/to/clip.mp4" --out "scratch/my_clone"

# 4. โหมด Computer Vision ล้วน (ไม่ยิง AI ประหยัด Token)
python tools/vdoclone.py "C:/path/to/clip.mp4" --no-ai

# 5. Export JSON ดิบเพื่อนำไปต่อยอดใน Automation
python tools/vdoclone.py "C:/path/to/clip.mp4" --json
```

---

## 📂 ผลลัพธ์ที่ได้ใน Output Folder

เมื่อรันเสร็จ สคริปต์จะสร้างไฟล์ 5 รายการในโฟลเดอร์ปลายทาง:
- `CLONE_PROMPT.md` — เอกสารสรุป prompt และ camera motion พร้อมก๊อปปี้ไปใช้งาน
- `clone_recipe.json` — ข้อมูลเชิงลึกทั้ง Optical Flow metrics และ AI prompts สำหรับนำไปต่อยอดระบบอัตโนมัติ
- `frame_0.png` — Anchor Seed Frame (PNG คุณภาพสูง 100%)
- `frame_last.png` — End Keyframe
- `motion_strip.jpg` — Contact sheet 5-stage motion strip

---

## 🛡️ Best Practice: สูตรโคลนให้เป๊ะ 98% (I2V Protocol)

1. **อย่าเจนแบบ Text-to-Video (T2V) จากศูนย์** ถ้าต้องการให้หน้าตาและคอมโพสิตเหมือนต้นฉบับ 100%
2. **ใช้ `frame_0.png` โยนเข้าช่อง Image Input** ของ Veo 3.1, Kling, Wan 2.1, หรือ Haiper
3. **หยิบ Prompt ในหัวข้อ `Image-to-Video (I2V) Motion Direction` ใน `CLONE_PROMPT.md` มาใส่เป็นข้อความสั่ง Motion**
4. ผลลัพธ์ที่ได้จะรักษารูปร่าง ตัวละคร และแสงสีเดิมไว้ครบถ้วน โดยขยับตามทิศทาง Optical Flow ที่วัดได้เป๊ะๆ
