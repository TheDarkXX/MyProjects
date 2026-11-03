---
name: vdogrid
description: >-
  High-speed video contact sheet and visual pacing extractor. Slices video into
  precision frame grids with metadata header and timecode overlays for rapid
  visual pacing inspection and AI vision auditing.
---

# 🎞️ /vdogrid — High-Speed Video Frame Grid & Contact Sheet Engine

สกัดเฟรมจากวิดีโอ (MP4, MOV, MKV) ออกมาเป็นภาพ **Frame Grid (Contact Sheet)** ที่แม่นยำ สวยงาม และเร็วที่สุดในโลก (~2-3 วินาทีต่อคลิป) พร้อมแถบสรุป **Metadata Header** ด้านบน และ **Timecode Overlay** สีขาวบนกล่องดำโปร่งแสงที่มุมล่างซ้ายของทุกช่อง เหมาะสำหรับทั้งการตรวจงานด้วยสายตามนุษย์ (Visual Pacing) และการส่งให้ AI Vision Model (Gemini / Claude / GPT) ตรวจสอบความละเอียดระดับจุลภาค

---

## ⚡ Quick Start

```powershell
# รันแบบ Smart Auto (เลือกความถี่และขนาดที่เหมาะสมให้อัตโนมัติ)
python tools/vdo_grid.py "C:\path\to\video.mp4"

# รันแบบภาพคมชัดพิเศษ HD (450x800 px ต่อช่อง) สำหรับซูมตรวจตัวหนังสือเล็กๆ
python tools/vdo_grid.py "C:\path\to\video.mp4" --res hd

# รันทั้งโฟลเดอร์ (Batch Processing)
python tools/vdo_grid.py "C:\path\to\renders\*.mp4"
```

---

## 🛠️ Parameters & Options

| ตัวแปร | Short | Default | รายละเอียด |
|---|---|---|---|
| `input` | — | *(บังคับ)* | Path ไฟล์วิดีโอ หรือโฟลเดอร์ (รองรับ Wildcard เช่น `*.mp4`) |
| `--res` | `-r` | `normal` | ความละเอียดต่อช่อง: `normal` (360×640), `hd` (450×800), `ultra` (540×960), หรือระบุ `WxH` |
| `--interval` | `-i` | `auto` | ความถี่การสกัดภาพ (วินาที) เช่น `0.5`, `1.0`. ถ้าไม่ระบุจะปรับตามความยาวคลิปอัตโนมัติ |
| `--cols` | `-c` | `5` | จำนวนคอลัมน์แนวนอน (Default: 5 สำหรับ 9:16 พอดีกับหน้าจอคอมพิวเตอร์) |
| `--rows` | — | `auto` | จำนวนแถวแนวตั้ง (คำนวณตามจำนวนเฟรมและคอลัมน์อัตโนมัติ) |
| `--frames` | `-f` | — | ฟิกซ์จำนวนช่องรวม เช่น `80` หรือ `60` ช่อง (คำนวณช่วงเวลาสม่ำเสมอให้เอง) |
| `--theme` | `-t` | `light` | ธีมสีพื้นหลัง: `light` (`#EEF1F8` สไตล์ Contact Sheet ดั้งเดิม) หรือ `dark` (`#181B22` สไตล์ Dark Dashboard) |
| `--split` | `-s` | `1` | แบ่งแผ่นออกเป็น N ภาพ (เช่น `--split 2` หรือ `--split 4`) เหมาะสำหรับส่งให้ AI Vision อ่านละเอียด 1:1 โดยไม่โดนย่อส่วน |
| `--output` | `-o` | ข้างไฟล์เดิม | ระบุชื่อไฟล์ปลายทาง หรือโฟลเดอร์เป้าหมาย (Default: `<filename>.mp4.jpg`) |
| `--format` | — | `jpg` | รูปแบบไฟล์: `jpg` (คุณภาพ 92%) หรือ `png` |
| `--no-header` | — | `false` | ปิดแถบข้อมูล Header ด้านบน |
| `--no-timecode`| — | `false` | ปิดตัวเลขเวลา Timecode ล่างซ้าย |
| `--open` | — | `false` | สั่งเปิดภาพที่เจนเสร็จขึ้นมาบนหน้าจอทันที |

---

## 🎯 Use Cases & Presets

### 1. คลิปสั้นไวรัล (15s – 40s) — เก็บทุก Hook และ Transition
```powershell
python tools/vdo_grid.py "clip.mp4" --interval 0.5
# หรือปล่อย Auto ระบบจะเลือก interval 0.5s ให้อัตโนมัติ (ได้ ~60-80 เฟรม คมชัดเป๊ะ)
```

### 2. ตรวจสอบ Text ละเอียดระดับ Master (HD Zoom)
```powershell
python tools/vdo_grid.py "clip.mp4" --res hd --theme dark --open
```

### 3. ส่งให้ AI Vision Model ตรวจสคริปต์/คัตฉาก (Deep AI Audit Mode)
เพื่อป้องกันไม่ให้ AI บีบย่อภาพขนาดยักษ์ (ป้องกัน Downscaling Trap):
```powershell
# แบ่งเป็น 2 หรือ 4 แผ่น แผ่นละ 20-35 ช่อง ทำให้ภาพเข้าเกณฑ์ Native Resolution ของ Claude/GPT/Gemini
python tools/vdo_grid.py "clip.mp4" --split 2
```

---

## 🏛️ Engine Architecture

- **Core Extraction:** ดึงและเรียงภาพผ่าน `ffmpeg` filter complex (`fps`, `scale`, `drawtext`, `tile`) ใน Single-pass Execution แบบ Hardware-friendly
- **Metadata Compositing:** แปะแถบ Header ด้านบนด้วย `PIL (Pillow)` จัดสัดส่วนฟอนต์และสีเรียบหรูระดับโปร
- **Aspect Ratio Awareness:** ตรวจจับทิศทางวิดีโอ (9:16 แนวตั้ง หรือ 16:9 แนวนอน) อัตโนมัติ ไม่มีการยืดหดหรือติดขอบดำ
