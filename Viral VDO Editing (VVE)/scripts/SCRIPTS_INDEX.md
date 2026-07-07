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
| **05** | `05-word-segment.py` | แบ่งคำภาษาไทยอัตโนมัติด้วย AI (PyThaiNLP) เพื่อเตรียมทำซับไตเติล |
| **05b** | `05b-align-ai.py` | จับคู่เวลาเสียงให้ตรงกับไฟล์สคริปต์ที่เตรียมไว้ (Custom Text/AI Script) เพื่อซับเป๊ะ 100% |
| **06** | `06-generate-srt.py` | สร้างไฟล์ซับไทเทิล `.srt` สำหรับใช้งาน |
| **07** | `07-scene-generator.py` | วางแผน Scene / ตัดสลับ B-Roll โดยวิเคราะห์จากเนื้อหา (ทำ Scene Table) |
| **08** | `08-footage-assembler.py` | ดึง Footage (รูป/วิดีโอ) มาประกอบลง Timeline ตามแผนที่วางไว้ |
| **09** | `09-sfx-placer.py` | วาง Sound Effect (SFX) ประกอบฉากตามจุดต่างๆ โดยอัตโนมัติ |
| **10** | `10-capcut-inject.py` | ยัดทุกอย่าง (ซับ, B-Roll, SFX) ลงไปใน CapCut Project ผ่าน capcut-cli |
| **10b** | `10b-capcut-auto-style.py` | ตกแต่งซับไทเทิล/ใส่ Transition สีสันต่างๆ ใน CapCut ให้อัตโนมัติ |
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
