---
name: h3tvc
version: "1.1.0"
updated_at: "2026-11-02"
description: >-
  MiniMax H3 Masterpiece TVC & Ads Video Production Engine — ควบคุมสายพานผลิตวิดีโอโฆษณาเกรด TVC แบรนด์เนมและ UGC Commercial ระดับ Masterpiece บน Google Colab G4 Blackwell (96GB VRAM) / A100 ด้วยระบบ 2-Stage Seed Hunter Engine (Stage 1 เจนพรีวิว 0.4MP ตรวจสอบการแสดงและเสียงพูด Native Thai Audio ➔ Stage 2 ชุบทองด้วย 3D Latent Upscaler สู่ 1080x1920 คมกริบ) ผสานคู่หู LoRA Skin 0.5 + Motion 0.4, Native Full 12 Steps (Zero Turbo), อัตราส่วน 9:16, ความยาว 15 วินาที (362 เฟรม), และพิมพ์เขียว Qwen3-VL 32B 6 ท่อน ใช้เมื่อ: /h3tvc [คำสั่ง/สคริปต์], /h3hunt, หรือสร้างวิดีโอโฆษณา TVC ด้วย H3
---

# 📺 Skill: `/h3tvc` (MiniMax H3 Masterpiece TVC Engine)

> ### ⚡ Executive TL;DR Card
> * **วัตถุประสงค์:** ผลิตวิดีโอโฆษณา Commercial เกรด TVC และแอด TikTok Shop ระดับพรีเมียมด้วยโมเดล **MiniMax H3 Singularity / Ref2VA**
> * **สูตร Golden Parameters:** **Skin 0.5** (`h3-realism-people`) + **Motion 0.4** (`better_motion`) + **Native Full 12 Steps (Zero Turbo)** + **9:16 Vertical** + **ความยาว 15 วินาที (362 เฟรม)**
> * **สถาปัตยกรรมหัวใจ:** **2-Stage Seed Hunter Pipeline** (Stage 1 ยิง 3 Seeds ขนาด 0.4MP เช็คการแสดง + เสียงพูด Native ใน 30 วิ ➔ Stage 2 ดึงตัวชนะเข้า `MinimaxH3LatentUpscaler3D` ปั่นเป็น 1080x1920 คมกริบใน 20 วิ)
> * **ขุมพลังฮาร์ดแวร์:** Google Colab G4 Blackwell (NVIDIA RTX PRO 6000 96GB VRAM) หรือ A100 High-RAM
> * **การเชื่อมต่อ:** Tailscale Native WireGuard (`http://colab-doctorbank:8188`) พร้อมทริคเปิดเว็บไวใน 1 วิ `?empty=1`

---

<a id="toc"></a>
## 📑 สารบัญ (Table of Contents)
1. [สถาปัตยกรรม 2-Stage Seed Hunter](#two-stage-pipeline)
2. [พิมพ์เขียวกำกับบท 6 ท่อน (The Masterpiece Prompt Schema)](#masterpiece-prompt-schema)
3. [กฎเหล็กคุมเสียง Native Thai Audio (ไม่ต้องพึ่งพา TTS นอก)](#native-thai-audio)
4. [สูตรคณิตศาสตร์ต่อซีนไร้รอยต่อ 17n+5](#seamless-continuation)
5. [คำสั่งรันระบบ (CLI & Workflow Playbook)](#execution-commands)

---

<a id="two-stage-pipeline"></a>
## 🎯 1. สถาปัตยกรรม 2-Stage Seed Hunter Pipeline

การเจนวิดีโอแบบเดิม (Full-Res 1080p รอบเดียว 12-14 Steps) ใช้เวลา 160 วินาทีต่อคลิป และถ้า AI ขยับท่าทางเบี้ยวหรือเสียงเพี้ยน จะเสียเวลาและ CCU ฟรีทันที สกิลนี้จึงบังคับใช้กระบวนการ 2 ขั้นตอน:

```text
[Stage 1: Seed Hunter Preview (~30 วินาที)]
┌──────────────────────────────────────────────────────────────┐
│  • ความละเอียดต่ำ: 0.4 MP (480x864 หรือ 416x736 @ 9:16)      │
│  • สปีด Denosing: 6–8 Steps (Native / Fast Scheduler)        │
│  • สุ่มรัน 3 Candidate Seeds พร้อมกัน: Seed A, Seed B, Seed C │
│  • ได้ไฟล์ MP4 Preview 3 ตัว ส่งตรงเข้าเครื่องใน 30 วิ       │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
[ตรวจคุณภาพใน IDE / Browser: ฟังเสียงพูด Native + เช็คการแสดงหน้าตา]
                               │
                               ▼ เลือก Seed ที่ดีที่สุด (เช่น Seed #2)
[Stage 2: 3D Latent Upscaler ชุบทอง (~20 วินาที)]
┌──────────────────────────────────────────────────────────────┐
│  • ป้อน Latent ตัวชนะเข้าโหนด MinimaxH3LatentUpscaler3D      │
│  • ขยายในระดับ 3D Audio-Video Latent Space เป็น 2.0 MP       │
│  • Denoise ซ้ำ 2–4 Steps (denoise: 0.35–0.4)                 │
│  • ได้ Master MP4 1080x1920 24FPS คมกริบระดับ TVC 100%!     │
└──────────────────────────────────────────────────────────────┘
```

---

<a id="masterpiece-prompt-schema"></a>
## 📜 2. พิมพ์เขียวกำกับบท 6 ท่อน (The Masterpiece Prompt Schema)

MiniMax H3 ใช้สมอง **Qwen3-VL 32B** ในการแปลง Text และ Image References การเขียน Prompt บรรทัดเดียวแบบเดิมจะทำให้โมเดลหลอน หลุดคาแรคเตอร์ และสินค้าละลาย **บังคับคอมไพล์ Prompt ออกมาเป็น 6 ท่อนนี้เสมอ:**

```text
subject_definitions:
<Subject 1> is a 28-year-old Thai female doctor with glowing matte skin, gentle confident eyes, wearing a clean tailored white medical coat over dark navy scrubs.
<Subject 2> is DoctorBank Magnesium Night Plus, a premium cylindrical amber glass bottle 250ml with dark blue and white label, white screw cap.

summary:
[reference generation + audio reference] A luxury high-end TVC commercial scene inside a modern aesthetic bedroom with soft ambient warm lights.

retention_analysis:
<Picture 1>: Master facial identity reference for <Subject 1>.
<Picture 2>: Hero product bottle and label typography reference for <Subject 2>.
<Audio 1>: Vocal timbre and speech cadence reference for <Subject 1>.

detailed_description:
[Shot 1]: Eye-level steady vertical 9:16 medium close-up shot. The camera is completely invisible, NO phone visible in frame, NO tripod, NO desk mount shown. <Subject 1> gently holds <Subject 2> with one hand at chest level, looks directly into the lens and speaks with natural articulation: <d>[Thai] ใครที่มีปัญหานอนหลับยาก ตื่นมาเพลีย ลองตัวนี้คืนเดียวรู้เรื่อง</d>. Her delivery is soft, reassuring, authoritative, and speaks with clear Thai cadence.

overall_soundscape:
clean quiet bedroom acoustic atmosphere, crisp studio-grade female vocal delivery, zero background hiss or ambient noise.

non_diegetic_music:
N/A
```

---

<a id="native-thai-audio"></a>
## 🎙️ 3. กฎเหล็กคุมเสียง Native Thai Audio

ไม่ต้องเสียเวลาเจนเสียง TTS ข้างนอกแล้วเอามาวิ่ง LatentSync ซ้ำซ้อน H3 มี Dual-Diffusion Head คำนวณเสียงพูดพร้อมขยับปากได้ในตัว โดยต้องคุม 4 ปัจจัย:

1. **Dialogue Tag:** ครอบคำพูดด้วยแท็ก `<d>[Thai] บทพูด </d>` เสมอ
2. **Vocal Cadence & Accent:** ระบุต่อท้ายบทพูด เช่น `her tone is calm, empathetic, and speaks natural spoken Thai`
3. **Audio Shifter (`MiniMaxH3SigmaShift`):** บังคับล็อกค่า:
   * `shift_video = 12`
   * `shift_audio = 3` (หรือ 6) เพื่อไม่ให้คลื่นเสียงแตกหรือมีเสียงงึมงำในลำคอ
4. **Timbre Reference:** ส่งไฟล์เสียงตัวอย่าง 10–15 วินาทีของตัวละครเข้าช่อง `<Audio 1>` เพื่อล็อกเนื้อเสียงตัวละครตัวเดิมในทุกช็อต

---

<a id="seamless-continuation"></a>
## 📐 4. สูตรคณิตศาสตร์ต่อซีนไร้รอยต่อ 17n+5

เมื่อต้องการต่อซีนเดิมให้เป็นคลิปยาว (Long-take) ห้ามตัดเฟรมแบบสุ่ม:
* **3D Causal VAE Rule:** การบีบอัดข้อมูลตามแกนเวลาของ H3 ลงตัวที่สูตร `17n + 5` เสมอ
* **Overlap Frames ที่ถูกต้อง:** **5, 22, 39, หรือ 56 เฟรม** (ค่าแนะนำสำหรับ 24 FPS คือ **22 เฟรม**)
* **ขั้นตอนการต่อช็อต:**
  1. ดึง 22 เฟรมสุดท้ายของคลิปก่อนหน้า ➔ ป้อนเข้า `MiniMaxH3AddGuide` ที่ `frame_idx: 0`
  2. เริ่มต้น Prompt ด้วยคำว่า: `a single continuous shot from beginning to end...`
  3. ดึง 22 เฟรมแรกของคลิปใหม่มาทำ `ImageBlend (factor: 0.5)` เข้ากับ 22 เฟรมท้ายของคลิปเก่า
  4. รวมเสียงด้วย `AudioConcat` จะได้คลิปต่อกันสนิทไร้รอยต่อ 100%

---

<a id="execution-commands"></a>
## 💻 5. คำสั่งรันระบบ (Execution Commands)

### 1. โหมด Seed Hunter (เจนพรีวิว 3 Seeds เช็คภาพ+เสียง)
```powershell
node "C:\My Claw\Openclaw-VPS\tools\colab-ai-video\h3_tvc_runner.cjs" `
  --hunt 3 `
  --master "C:\My Claw\The Viral\output\netidol_master_matte_v2.jpg" `
  --product "C:\My Claw\The Viral\Ads DRB\Brand_Refs\Products\Magnesium\3Ref_Master_Pack\DRB_MAG_REF01_front_hero.png" `
  --dialogue "ใครที่มีปัญหานอนหลับยาก ตื่นมาเพลีย ลองตัวนี้คืนเดียวรู้เรื่อง" `
  --endpoint "http://colab-doctorbank:8188"
```
*ระบบจะบันทึกพรีวิว `preview_seed1.mp4`, `preview_seed2.mp4`, `preview_seed3.mp4` เข้าโฟลเดอร์ `The Viral\output\previews\` ทันทีใน ~30 วินาที*

### 2. โหมด Upscale TVC Master (ชุบทอง Seed ตัวชนะเป็น 1080p)
```powershell
node "C:\My Claw\Openclaw-VPS\tools\colab-ai-video\h3_tvc_runner.cjs" `
  --upscale 2 `
  --endpoint "http://colab-doctorbank:8188"
```
*ระบบจะดึง Latent ของ Seed #2 เข้า `MinimaxH3LatentUpscaler3D` รันต่อ 20 วิ แล้วส่งมอบไฟล์ `tvc_master_1080p.mp4` เข้าสู่ `00_MASTER_PREVIEWS\` ทันที!*

