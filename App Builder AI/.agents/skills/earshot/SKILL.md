---
name: earshot
description: >-
  Earshot Acoustic Intelligence & Audio Quality Gate Engine — วิเคราะห์และตรวจสอบคุณภาพเสียง, ถอดรหัสความรู้สึกของเสียงด้วย CLAP, ตรวจจับจังหวะเสียงตกกระทบเทียบกับคัตวิดีโอ (Cut-to-beat sync), วัดค่าทางกายภาพ (LUFS, True Peak, Spectrogram), และสังเคราะห์เสียง SFX ในตัวด้วยสูตรโค้ด DSP โดยไม่ต้องใช้เสียงสต็อก ใช้เมื่อ: /earshot [คำสั่ง/ไฟล์เสียง]
---

# 🎧 Skill: `/earshot` (Acoustic Intelligence & Audio Gate)

## Objective
ให้ AI Agent มี "หู" ในการฟัง, ตรวจสอบ, วิเคราะห์ และสร้างสรรค์เสียงสำหรับงานวิดีโอ (VVE, The Viral, HyperEngine, FlowKit) รันบน Local CPU 100% ผ่าน MCP Server หรือ CLI โดยไม่ต้องง้อ Cloud

---

## 🛠️ Execution Interface

### Path อ้างอิงระบบ:
* **Directory:** `C:\My Claw\Openclaw-VPS\tools\earshot`
* **Python Executable:** `C:\My Claw\Openclaw-VPS\tools\earshot\.venv\Scripts\python.exe`
* **MCP Server Name:** `earshot` (เชื่อมต่อแล้วทั้งใน Claude Code และ Antigravity)

---

## 🚀 Key Commands & Playbook

### 1. วัดค่าทางกายภาพ (Model-Free, รวดเร็ว 0s delay)
```bash
C:\My Claw\Openclaw-VPS\tools\earshot\.venv\Scripts\python.exe -m earshot measure <file.wav/mp4>
```
* วัดความดัง integrated LUFS, True Peak (dBTP), Dynamic Range (LRA), Noise Floor, Attack/Decay ms, และ Spectral Bandwidth
* หากใส่ `music=true` จะคำนวณ Tempo (BPM), Beat Grid, และคีย์เพลงให้ด้วย

### 2. วิเคราะห์ความหมายและลักษณะเสียง (CLAP Semantic Tags)
```bash
C:\My Claw\Openclaw-VPS\tools\earshot\.venv\Scripts\python.exe -m earshot describe <file.wav>
```
* ถอดรหัสว่าเสียงนี้คืออะไร (เช่น Snare hit, Keypress, Wood impact, Whoosh)
* แสดง z-score (ความชัดเจนของหมวดหมู่) และ AudioSet classification

### 3. ตรวจสอบความตรงของคำบรรยาย (Semantic Match)
```bash
C:\My Claw\Openclaw-VPS\tools\earshot\.venv\Scripts\python.exe -m earshot match <file.wav> "a deep thocky mechanical keyboard press" --alts "a mouse click" "a plastic snap"
```
* ประเมินความแม่นยำเทียบกับ Prompt ที่ต้องการ พร้อมระบุว่าใกล้เคียงกับตัวเลือกอื่นแค่ไหน

### 4. ตรวจสอบความสอดคล้องภาพกับเสียง (Timeline Sync Audit สำหรับวิดีโอ)
```bash
C:\My Claw\Openclaw-VPS\tools\earshot\.venv\Scripts\python.exe -m earshot timeline <audio.wav> --video <video.mp4>
```
* ตรวจสอบว่าเสียงกระทบ (SFX transient) ตกตรงกับคัตภาพ (Video Cut Frame) หรือไม่ (แสดงค่า Offset ระดับ millisecond)

### 5. เรนเดอร์เสียง SFX จากสูตรโค้ด (Procedural Sound Bank - 252 เสียง)
```bash
# ดูรายชื่อเสียงทั้งหมด 252 เสียง
C:\My Claw\Openclaw-VPS\tools\earshot\.venv\Scripts\python.exe -m earshot sfx list

# สั่งเรนเดอร์เสียงที่ต้องการ (ปรับ duration และ apex ได้)
C:\My Claw\Openclaw-VPS\tools\earshot\.venv\Scripts\python.exe -m earshot sfx render click/soft -o click.wav
C:\My Claw\Openclaw-VPS\tools\earshot\.venv\Scripts\python.exe -m earshot sfx render whoosh/fast --dur 0.35 --apex 0.65 -o whoosh.wav
```

### 6. ตรวจความสมจริงของเสียง (Real vs Synthesized)
```bash
C:\My Claw\Openclaw-VPS\tools\earshot\.venv\Scripts\python.exe -m earshot realness <file.wav>
```
* คำนวณค่า `p_real` ว่าเป็นเสียงอัดของจริง หรือเป็นเสียงบีป/เสียงสังเคราะห์ดิจิทัลหยาบๆ

---

## 🔗 GBRAIN Backlinks
- **2026-10-26 22:15** | [V14.55.0 [impl] audio: Earshot Acoustic Intelligence & MCP Engine](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Active/Core-VPS/V14.55.0_[impl]_audio_earshot-acoustic-intelligence-and-mcp-engine.md) -- แผนการติดตั้งและสถาปัตยกรรม Earshot ในระบบ
- **2026-10-15 19:44** | [V14.35.0 [study] video: concat capcut replacement mcp & gl transitions](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Complete/Core-VPS/V14/V14.35.0_[study]_video_concat-capcut-replacement-mcp-and-gl-transitions-parity-study.md) -- สถาปัตยกรรม MCP ตัดต่อวิดีโอและซิงก์ไทม์ไลน์
- **2026-10-12 23:26** | [V14.41.0 [impl] vve: capcut native keyframes snap zoom upgrade](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Complete/Core-VPS/V14/V14.41.0_[impl]_vve_capcut_native_keyframes_snap_zoom_upgrade_and_ecosystem_audit.md) -- ระบบจังหวะเสียง Whoosh -30ms และคีย์เฟรมวิดีโอ
