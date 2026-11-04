---
name: flow
version: "2.1.0"
updated_at: "2026-11-04"
description: >-
  FlowKit Storyboard-to-Video Automation Engine — ออโตเมต Google Flow RPCs ควบคุม Veo 3.1 & Omni Flash ล็อกหน้าตัวละคร ฉาก (Reference-to-Video) ทำ Scene Chaining ต่อเนื่อง และรัน Direct API เจนวิดีโอโดยไม่ต้องคลิกหน้าเว็บ พร้อมล็อกค่าเริ่มต้นเป็น 9:16, Nano Banana Pro (GEM_PIX_2), Veo 3.1 Lite Low Priority (0 Credit) 6s x1 ชิ้นงาน
---

# 🎬 FlowKit Storyboard-to-Video Engine (`/flow` v2.1.0)

คู่มือการใช้งานระบบ **FlowKit** ร่วมกับ Google Flow (Veo 3.1 / Omni Flash) บนเครื่องและไดรฟ์ `C:\My Claw\The Viral\FlowKit`
ระบบนี้ส่งคำสั่งตรงเข้า Google Flow RPCs (`batchexecute`) ผ่าน WebSocket Extension และ FastAPI Backend โดย **ไม่ต้องพึ่งพาการคลิกปุ่มบนหน้าเว็บ (Zero DOM Clicks)** มั่นคง รวดเร็ว ล็อกหน้าตัวละคร และสร้างวิดีโอสตอรี่บอร์ดหลายฉากต่อกันแบบอัตโนมัติ

---

## 🔒 ค่าคอนฟิกล็อกมาตรฐานของระบบ (Locked Default Configuration)

ระบบถูกล็อกค่าเริ่มต้น (Default Parameters) ไว้ตามสเปกนี้ทุกคำสั่ง:

| หมวด | ค่าที่ล็อกไว้ (Default) | รหัสทางเทคนิค (Internal ID) | หมายเหตุ |
|---|---|---|---|
| **สัดส่วนภาพ & วิดีโอ** | **`9:16` (Vertical)** | `IMAGE_ASPECT_RATIO_PORTRAIT` / `VIDEO_ASPECT_RATIO_PORTRAIT` | มาตรฐาน TikTok, Shorts, Reels |
| **โมเดลภาพนิ่ง** | **`Nano Banana Pro`** | `GEM_PIX_2` (`NANO_BANANA_PRO`) | คมชัด แสงเงาสวย ไม่ติดลายน้ำ |
| **โหมดวิดีโอ** | **`Frame to Video`** | `frame_2_video` (I2V First Frame) | อ้างอิงภาพนิ่งต้นฉบับแปลงเป็นวิดีโอ |
| **โมเดลวิดีโอ** | **`Veo 3.1 Lite (Low Priority)`** | `veo_3_1_i2v_lite_low_priority` | **0 Credit (ฟรี 100%)** ไม่กินโควตาเหรียญ |
| **ความยาววิดีโอ** | **`6 วินาที`** | `duration_s: 6` | ค่าเริ่มต้นกระชับสำหรับวิดีโอสั้น |
| **จำนวนชิ้นงาน** | **`x1 ชิ้นงาน`** | `count: 1` | เจนทีละ 1 รูป / 1 คลิป เพื่อความปลอดภัย |

---

## ⚡ ข้อมูลพิกัดระบบ (Paths & Ports)

| องค์ประกอบ | ค่า / Path | หมายเหตุ |
|---|---|---|
| **Engine Root** | `C:\My Claw\The Viral\FlowKit` | โฟลเดอร์หลักของโปรเจกต์ FlowKit |
| **Python Virtualenv** | `C:\My Claw\The Viral\FlowKit\venv\Scripts\python.exe` | Python 3.10 + FastAPI + WebSockets |
| **CLI Helper** | `C:\My Claw\The Viral\FlowKit\flow_cli.py` | สคริปต์กลางสำหรับ Agent และ User สั่งงาน |
| **Extension Path** | `C:\My Claw\The Viral\FlowKit\extension` | โหลดแบบ Unpacked ใน Google Chrome (v0.5.2) |
| **FastAPI Backend** | `http://127.0.0.1:8100` | REST API สำหรับสั่งเจนภาพ/วิดีโอ/โปรเจกต์ |
| **WebSocket Port** | `ws://127.0.0.1:9222` | ท่อคุยระหว่าง Backend กับ Chrome Extension |
| **Dashboard Panel** | `http://127.0.0.1:8100/docs` หรือผ่าน Side Panel | เช็คสถานะคิวงาน |
| **Output Video** | `C:\My Claw\The Viral\FlowKit\output\` | ไฟล์วิดีโอสุดท้ายที่เรนเดอร์เสร็จ |

---

## 🛠️ ขั้นตอนเตรียมความพร้อม (One-Time Setup)

ก่อนเริ่มสั่งงาน Agent หรือ User ต้องเปิด Chrome ทิ้งไว้ดังนี้:
1. **ติดตั้ง Chrome Extension (ทำครั้งเดียว):**
   - เปิด Chrome ไปที่ `chrome://extensions`
   - เปิดสวิตช์ **Developer mode** (มุมขวาบน)
   - กดปุ่ม **Load unpacked**
   - เลือกโฟลเดอร์: `C:\My Claw\The Viral\FlowKit\extension` (v0.5.2)
2. **เปิดหน้า Google Flow ค้างไว้ 1 แท็บ:**
   - เปิดเบราว์เซอร์ไปที่ `https://flow.google.com/`
   - ล็อกอินด้วยบัญชี Google ที่มีสิทธิ์ใช้งาน Flow (เปิดแท็บนี้ค้างไว้เพื่อให้ Extension ส่ง RPCs ได้)
3. **เปิด Backend Service:**
   - รันผ่าน CLI: `python "C:\My Claw\The Viral\FlowKit\flow_cli.py" start`
   - หรือดับเบิลคลิกไฟล์: `C:\My Claw\The Viral\FlowKit\start.bat`

---

## 🚀 คำสั่งหลัก (Subcommands) — ใช้ค่าล็อกอัตโนมัติ

### 1. ตรวจสอบสถานะระบบ (`/flow status`)
```powershell
python "C:\My Claw\The Viral\FlowKit\flow_cli.py" status
```
- ถ้า Server ดับ ➔ จะแจ้งเตือนให้สั่ง start
- ถ้า Extension ยังไม่ต่อ ➔ จะแจ้งเตือนให้เปิด Chrome ที่ `flow.google.com`

### 2. สตาร์ท Backend (`/flow start`)
```powershell
python "C:\My Claw\The Viral\FlowKit\flow_cli.py" start
```

### 3. เจนภาพนิ่ง (`/flow img`) — ค่าเริ่มต้น: 9:16 + Nano Banana Pro + 1 รูป
```powershell
# ยิงด้วยค่า default ทันที (9:16, GEM_PIX_2, 1 รูป):
python "C:\My Claw\The Viral\FlowKit\flow_cli.py" img --prompt "A handsome Asian doctor in modern clinic"

# กรณีต้องการล็อกหน้าด้วยรูป reference:
python "C:\My Claw\The Viral\FlowKit\flow_cli.py" img --prompt "Examining medicine bottle" --refs "C:\path\to\face.png"
```

### 4. เจนวิดีโอ (`/flow vdo`) — ค่าเริ่มต้น: 9:16 + Veo 3.1 Lite Low Priority (0 Credit) + 6s
```powershell
# แบบ Image-to-Video ล็อกภาพตั้งต้น (Veo 3.1 Lite Low Priority 0-Credit):
python "C:\My Claw\The Viral\FlowKit\flow_cli.py" vdo --image "C:\path\to\image.png" --prompt "He smiles gently. Camera slowly dollies in."

# แบบ Text-to-Video ตรงๆ ด้วย Omni Flash 6s:
python "C:\My Claw\The Viral\FlowKit\flow_cli.py" vdo --model omni_flash --prompt "A cinematic drone shot over mountains at sunrise."
```

### 5. อัปโหลดรูป Reference จากเครื่องขึ้น Flow (`/flow upload-ref`)
```powershell
python "C:\My Claw\The Viral\FlowKit\flow_cli.py" upload-ref --file "C:\path\to\character.png"
```

---

## 🎯 Full Storyboard-to-Video Safe Pipeline (SOP)

สูตรการยิงที่ปลอดภัยสูงสุดคือ **"Scene-by-Scene Sequential"**:

```
[ ซีนที่ 1 ] ➔ เจนภาพ (รอ ~20s) ➔ หน่วง 5s ➔ เจนวิดีโอ (รอ ~90s) ➔ พัก 25s (Human Pacing) ➔
[ ซีนที่ 2 ] ➔ เจนภาพ (รอ ~20s) ➔ หน่วง 5s ➔ เจนวิดีโอ (รอ ~90s) ➔ พัก 25s ...
```

1. **ห้ามยิงซ้อนกัน:** ยิงทีละ 1 งาน (`MAX_CONCURRENT=1`)
2. **ไม่ฝืนเมื่อติดบล็อก:** ถ้าระบบขึ้น `UNUSUAL_ACTIVITY` พักเครื่อง 60 นาทีตามตัวตัดไฟอัตโนมัติ

---

## 🚨 กฎเหล็กประจำสกิล (Iron Rules)
1. **Local NVMe SSD Hub:** ไฟล์วิดีโอ output และ python virtualenv ประจำการอยู่ที่ `C:\My Claw\The Viral\FlowKit` บน Local NVMe SSD เพื่อความเร็วสูงสุด
2. **Never Freehand DOM:** ห้ามเขียน script ไปคลิกปุ่มบนหน้าเว็บ Flow เด็ดขาด ให้สั่งผ่าน REST API / Extension WebSocket เสมอ
3. **One Generation at a Time:** Google Flow มีระบบ Pacing ปล่อยให้คลิปแต่ละอันเสร็จสมบูรณ์ก่อนสั่งฉากถัดไป
