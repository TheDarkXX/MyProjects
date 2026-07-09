# 🎬 VVE Scripts Index (Viral VDO Editing)

เอกสารนี้รวบรวมรายชื่อสคริปต์ `.py` ทั้งหมดในระบบ VVE พร้อมคำอธิบายสั้นๆ

## 🚀 Main Pipeline (`scripts/`)

| Step | ชื่อไฟล์ | หน้าที่หลัก (ทำอะไร) |
|:---|:---|:---|
| **01a** | `01a-timebolt-cut.py` | เอาไฟล์ XML จาก Timebolt มาหั่นคลิปใน CapCut JSON (สาย Manual) |
| **01b** | `01b-silence-cut.py` | ใช้ AI (Silero VAD) หาเสียงพูดแล้วหั่นคลิปใน CapCut (สาย Auto) |
| **02** | `02-extract-audio.py` | สกัดไฟล์เสียง (.wav) ออกมาจากผลลัพธ์ของ `01a` หรือ `01b` เพื่อส่งไปถอดเสียงในขั้นตอนที่ `03` |
| **03** | `03-transcribe.py` | ส่งไฟล์เสียงไปให้ ElevenLabs ถอดเป็นข้อความ (Transcript) |
| **04** | `04-editorial-agent.py` | ให้ AI ช่วยวิเคราะห์และจัดแผนการตัดต่อวิดีโอ (Editorial Cut Plans) |
| **04b** | `04b-apply-editorial-cuts.py` | (Execute) นำแผนที่เลือกจาก 04 มาหั่นวิดีโอใน CapCut และร่นเวลาใน Transcript ให้ตรงกัน |
| **04Loop** | `04Loop-run04b-06.py` | (Loop) สคริปต์มัดรวม! รันรวดเดียวตั้งแต่ 04b -> 05 -> 06 เพื่อยัดซับไตเติลให้จบในคลิกเดียว |
| **05** | `05-word-segment.py` | แบ่งคำภาษาไทยอัตโนมัติด้วย AI (PyThaiNLP) เพื่อเตรียมทำซับไตเติล (ระบบเก่า) |
| **05a** | `05a-subtitle-agent.py` | (AI Pause Check) สร้าง Prompt ให้ AI จัดวรรคตอนซับไตเติลตามสคริปต์ที่หั่นแล้ว + มีระบบ Auto-Invalidation ทิ้งไฟล์ซับเก่าถ้าแผนตัดต่อเปลี่ยน |
| **05b** | `05b-align-ai.py` | จับคู่เวลาเสียงให้ตรงกับไฟล์สคริปต์ที่เตรียมไว้ (Custom Text/AI Script) เพื่อซับเป๊ะ 100% |
| **06** | `06-generate-srt.py` | สร้างไฟล์ซับไทเทิล `.srt` สำหรับใช้งาน |
| **07a** | `07a-scene-analyzer.py` | AI วิเคราะห์บทบาท จังหวะ และจุดเน้นของแต่ละ Scene (Kallaway Pacing + Dopamine Hit) |
| **07b** | `07b-scene-splitter.py` | AI ตัดสินใจแบ่ง A-Roll / B-Roll ตามผลวิเคราะห์ + ใส่ emphasis field |
| **07c** | `07c-broll-prompt.py` | สร้าง B-Roll Prompt MD ตามสูตร 8 Categories (A-H) สำหรับ God Flow / Text2Video |
| **08** | `08-footage-assembler.py` | ดึง Footage (รูป/วิดีโอ) มาประกอบลง Timeline ตามแผนที่วางไว้ |
| **09** | `09-sfx-placer.py` | วาง Sound Effect (SFX) ประกอบฉากตามจุดต่างๆ โดยอัตโนมัติ |
| **10** | `10-capcut-inject.py` | ยัดทุกอย่าง (ซับ, B-Roll, SFX) ลงไปใน CapCut Project ผ่าน capcut-cli |
| **10b** | `10b-capcut-auto-style.py` | ตกแต่งซับไทเทิล/ใส่ Transition สีสันต่างๆ ใน CapCut ให้อัตโนมัติ |
| **10c** | `10c-aroll-zoom.py` | Snap Zoom A-Roll ตาม emphasis จาก AI (07a/07b) — ฟึ้บฟั่บ Dopamine Hit |
| **11** | `11-qa-recheck.py` | ตรวจสอบความเรียบร้อยของโปรเจกต์ (ไม่มีสื่อหาย, Sync ตรงกัน) |
| **12** | `12-viral-score.py` | ให้ AI ประเมินคะแนนความไวรัลของคลิปนี้ |

---

## 🛠️ Utilities & Helpers (`scripts/utils/`)

| ชื่อไฟล์ | หน้าที่หลัก (ทำอะไร) |
|:---|:---|
| `capcut_utils.py` | 🔐 Gateway หลักในการเซฟ/โหลด `draft_content.json` (มี Auto Backup + Force Close) |
| `capcut_editor.py` | Engine หลังบ้านสำหรับแก้ไข CapCut JSON แบบละเอียด |
| `capcut_reader.py` | ใช้สำหรับอ่านและวิเคราะห์ข้อมูลจาก CapCut JSON |
| `capcut_injector_v4.py` | Engine สำหรับยัดสื่อลง CapCut |
| `config_loader.py` | ตัวโหลดไฟล์ตั้งค่า (config / yaml) ของแต่ละช่อง |
| `force_close_capcut.py` | สั่งปิดโปรแกรม CapCut บังคับป้องกัน Auto-save ชนกัน |
| `editorial_subagent.py` | ระบบย่อย (Sub-agent) ช่วยจัดการเรื่องบท |
| `whisper_transcriber.py` | Engine ถอดเสียงด้วย Whisper (ระบบเก่า/สำรอง) |
| `vad_extractor.py` | Engine ค้นหาเสียงพูด (Voice Activity Detection) |
| `process_sfx.py` | ตัวจัดการและเตรียมไฟล์ Sound Effect |
| `sfx_analyzer.py` | วิเคราะห์ความดัง/ประเภทของ SFX |
| `split_merged_sfx.py` / `_fast.py` | หั่นไฟล์ SFX รวมให้แยกเป็นชิ้นๆ |
| `sync_timestamps.py` | ซิงค์เวลาเสียงกับข้อความให้ตรงกัน |
| `rename_bgm.py` | จัดระเบียบชื่อไฟล์เพลง Background Music |
| `fix_srt.py` | ซ่อมไฟล์ `.srt` ที่เวลาซ้อนทับกัน |

---

## 🧪 Tests & Legacy (`scripts/_legacy/`)

| ชื่อไฟล์ | หน้าที่หลัก (ทำอะไร) |
|:---|:---|
| `test_cut_audio.py` | เทสการตัดไฟล์เสียง |
| `test_elevenlabs_chars.py` | เทสเชื่อมต่อระบบ ElevenLabs API |
| `split_shutter_1.py` | สคริปต์เทสระบบหั่นไฟล์ |
| `check_tracks.py` | (Legacy) เช็ค Track ใน CapCut แบบเก่า |
| `run_transcribe.py` | (Legacy) สคริปต์เทสรันระบบถอดเสียง |

---

## 🚨 Critical Gotchas & Bug Fixes (บันทึกกันลืม)

1. **`draft_content.json` อยู่ในโฟลเดอร์ Timelines (สำหรับ CapCut v8.8+)**
   - **ปัญหา:** `capcut-cli` เป็น Tool นอกที่แก้ไฟล์ `draft_content.json` หน้า Root เท่านั้น ทำให้เวลายัดซับไตเติลสำเร็จ แต่เปิดโปรแกรม CapCut มากลับไม่เห็นซับ!
   - **วิธีแก้:** ในสคริปต์ที่ใช้ยัดของ (เช่น `06-generate-srt.py`) **ต้อง** สั่งรัน Glob ค้นหาไฟล์ `draft_content.json` ทุกที่ (รวมถึงโฟลเดอร์ซ่อน `Timelines/<UUID>/`) แล้วก๊อปปี้ไฟล์หน้า Root ไปทับให้ครบทุกจุดเสมอ!

2. **ระบบ Padding เวลาหั่นตัดวิดีโอ (04b) ห้ามใช้ค่าตายตัว**
   - **ปัญหา:** ตอนคำนวณ `keep_regions` ถ้าใช้ `POST_PAD = 0.1` วินาที มันจะไป "กิน" เศษเสี้ยวของคำที่พูดตะกุกตะกัก (Stutter) ที่เราอยากตัดทิ้ง ทำให้คำขยะเหล่านั้นดันหลุดกลับเข้ามาในซับไตเติลและวิดีโอ (Micro-clips)
   - **วิธีแก้:** ต้องใช้ "Dynamic Padding" (เช่น เอาช่องว่าง `gap` ระหว่างคำมาหารสอง) เพื่อรับประกันว่าจะไม่มีทางลามไปโดนคำถัดไปที่ถูกตัดทิ้ง (ทำใน `build_keep_regions`)

3. **บั๊ก `restore_snapshot` ดึงไทม์ไลน์เก่ามาทำพัง**
   - **ปัญหา:** สคริปต์ `06` ดึง Snapshot ก่อนหน้ามาใช้โดยระบุชื่อไฟล์แบบตายตัว (`step_04b.json`) แต่ในความเป็นจริง `04b` มีการรันซ้ำหลายรอบ ทำให้ไฟล์อัปเดตล่าสุดคือตัวที่มี `_v{num}` ต่อท้าย!
   - **วิธีแก้:** ต้องใช้ `_latest.json` เสมอเวลาเซฟและโหลด Snapshot เพื่อการันตีว่าดึงเอาไทม์ไลน์เวอร์ชันสุดท้ายจริงๆ มาทำงานต่อ ไม่ใช่ไปขุดเอาอันเน่าๆ มาใช้

4. **การจับคู่ซับไตเติล (05b) พังเมื่อเปลี่ยนแผนตัดต่อ (Auto-Invalidation)**
   - **ปัญหา:** หากสลับแผนจาก `rough_cut` เป็น `viral_cut` จำนวนคำจะสั้นลง แต่สคริปต์ `05b` ดันพยายามเอาซับไตเติลเวอร์ชันเก่าที่คำเยอะกว่า (`ai_segmented_latest.txt`) มายัดใส่ ทำให้เกิด Error "Ran out of characters"
   - **วิธีแก้:** ฝังระบบเช็คใน `05a` โดยให้มันเทียบข้อความดิบ (Raw Text) จาก `transcript.json` รุ่นล่าสุด กับไฟล์ซับที่เคยเรียงไว้ ถ้าตรวจพบว่า "ความยาวไม่เท่ากัน" ให้ **ลบทิ้งทันที** เพื่อดักให้ 05b หยุดรอให้ AI มาเรียงซับให้ใหม่ (PAUSE Code 100)
