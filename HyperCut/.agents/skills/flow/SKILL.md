---
name: flow
description: FlowKit Storyboard-to-Video Automation Engine — ออโตเมต Google Flow RPCs ควบคุม Veo 3.1 & Omni Flash, ล็อกหน้าตัวละคร/ฉาก (Reference-to-Video), ทำ Scene Chaining ต่อเนื่อง และรัน Direct API เจนวิดีโอโดยไม่ต้องคลิกหน้าเว็บ
---

# 🎬 FlowKit Storyboard-to-Video Engine (`/flow`)

คู่มือการใช้งานระบบ **FlowKit** ร่วมกับ Google Flow (Veo 3.1 / Omni Flash) บนเครื่องและไดรฟ์ `P:\AI\The Viral\FlowKit`
ระบบนี้ส่งคำสั่งตรงเข้า Google Flow RPCs (`batchexecute`) ผ่าน WebSocket Extension และ FastAPI Backend โดย **ไม่ต้องพึ่งพาการคลิกปุ่มบนหน้าเว็บ (Zero DOM Clicks)** มั่นคง รวดเร็ว ล็อกหน้าตัวละคร และสร้างวิดีโอสตอรี่บอร์ดหลายฉากต่อกันแบบอัตโนมัติ

---

## ⚡ ข้อมูลพิกัดระบบ (Paths & Ports)

| องค์ประกอบ | ค่า / Path | หมายเหตุ |
|---|---|---|
| **Engine Root** | `P:\AI\The Viral\FlowKit` | อยู่บน Drive P: ป้องกัน C: VPS Repo บวม |
| **Python Virtualenv** | `P:\AI\The Viral\FlowKit\venv\Scripts\python.exe` | Python 3.10 + FastAPI + WebSockets |
| **CLI Helper** | `P:\AI\The Viral\FlowKit\flow_cli.py` | สคริปต์กลางสำหรับ Agent สั่งงาน |
| **Extension Path** | `P:\AI\The Viral\FlowKit\extension` | โหลดแบบ Unpacked ใน Google Chrome |
| **FastAPI Backend** | `http://127.0.0.1:8100` | REST API สำหรับสั่งเจนภาพ/วิดีโอ/โปรเจกต์ |
| **WebSocket Port** | `ws://127.0.0.1:9222` | ท่อคุยระหว่าง Backend กับ Chrome Extension |
| **Dashboard Panel** | `http://127.0.0.1:8100/docs` หรือผ่าน Side Panel | เช็คสถานะคิวงาน |
| **Output Video** | `P:\AI\The Viral\FlowKit\output\` | ไฟล์วิดีโอสุดท้ายที่ Concat แล้ว |

---

## 🛠️ ขั้นตอนเตรียมความพร้อม (One-Time Setup)

ก่อนเริ่มสั่งงาน Agent หรือ User ต้องเปิด Chrome ทิ้งไว้ดังนี้:
1. **ติดตั้ง Chrome Extension (ทำครั้งเดียว):**
   - เปิด Chrome ไปที่ `chrome://extensions`
   - เปิดสวิตช์ **Developer mode** (มุมขวาบน)
   - กดปุ่ม **Load unpacked** (โหลดส่วนขยายที่คลายการบีบอัดแล้ว)
   - เลือกโฟลเดอร์: `P:\AI\The Viral\FlowKit\extension`
2. **เปิดหน้า Google Flow ค้างไว้ 1 แท็บ:**
   - เปิดเบราว์เซอร์ไปที่ `https://flow.google.com/`
   - ล็อกอินด้วยบัญชี Google ที่มีสิทธิ์ใช้งาน Flow / Veo (แท็บนี้ต้องเปิดค้างไว้เพื่อให้ Extension ส่ง RPCs ได้)
3. **เปิด Backend Service:**
   - รันผ่าน CLI: `& "P:\AI\The Viral\FlowKit\venv\Scripts\python.exe" "P:\AI\The Viral\FlowKit\flow_cli.py" start`
   - หรือดับเบิลคลิกไฟล์: `P:\AI\The Viral\FlowKit\start.bat`

---

## 🚀 คำสั่งหลัก (Subcommands)

### 1. ตรวจสอบสถานะระบบ (`/flow status`)
```powershell
& "P:\AI\The Viral\FlowKit\venv\Scripts\python.exe" "P:\AI\The Viral\FlowKit\flow_cli.py" status
```
- ถ้า Server ดับ ➔ จะแจ้งเตือนให้สั่ง start
- ถ้า Extension ยังไม่ต่อ ➔ จะแจ้งเตือนให้เปิด Chrome ที่ `flow.google.com`

### 2. สตาร์ท Backend (`/flow start`)
```powershell
& "P:\AI\The Viral\FlowKit\venv\Scripts\python.exe" "P:\AI\The Viral\FlowKit\flow_cli.py" start
```

### 3. เจนภาพนิ่งโดยตรง (`/flow img`)
```powershell
& "P:\AI\The Viral\FlowKit\venv\Scripts\python.exe" "P:\AI\The Viral\FlowKit\flow_cli.py" img --prompt "A beautiful portrait of Thai woman in white dress" --ratio 9:16
# กรณีต้องการล็อกหน้าด้วยรูป reference:
& "P:\AI\The Viral\FlowKit\venv\Scripts\python.exe" "P:\AI\The Viral\FlowKit\flow_cli.py" img --prompt "Drinking coffee in cafe" --ratio 9:16 --refs "P:\path\to\face.png"
```

### 4. เจนวิดีโอโดยตรง (`/flow vdo`)
```powershell
# แบบ Text-to-Video ตรงๆ (ผ่าน Gemini Omni Flash):
& "P:\AI\The Viral\FlowKit\venv\Scripts\python.exe" "P:\AI\The Viral\FlowKit\flow_cli.py" vdo --prompt "A drone shot flying over misty mountain peak at sunrise. Cinematic 4K." --ratio 16:9

# แบบ Image-to-Video ล็อกภาพตั้งต้น (ผ่าน Google Veo 3.1):
& "P:\AI\The Viral\FlowKit\venv\Scripts\python.exe" "P:\AI\The Viral\FlowKit\flow_cli.py" vdo --prompt "She smiles gently. The camera slowly dollies in." --image "P:\path\to\character.png" --model veo --ratio 9:16
```

### 5. อัปโหลดรูป Reference จากเครื่องขึ้น Flow (`/flow upload-ref`)
```powershell
& "P:\AI\The Viral\FlowKit\venv\Scripts\python.exe" "P:\AI\The Viral\FlowKit\flow_cli.py" upload-ref --file "P:\path\to\character.png"
```
- ส่งภาพ local ขึ้น Google Flow แล้วคืนค่า `media_id` สำหรับเอาไปล็อกหน้าตัวละครหรือฉาก

### 6. สร้างโปรเจกต์และกำหนดสตอรี่บอร์ด (`/flow create`)
```powershell
& "P:\AI\The Viral\FlowKit\venv\Scripts\python.exe" "P:\AI\The Viral\FlowKit\flow_cli.py" create --name "Cyber Samurai" --story "A neon cyber samurai walks in rainy Neo-Tokyo" --characters "Samurai,Neo-Tokyo Street"
```

---

## 🎯 Full Storyboard-to-Video Pipeline (SOP)

เมื่อ User สั่งสร้างคลิปวิดีโอเป็นเรื่องราว ให้รันตามลำดับ 5 สเต็ปนี้เสมอ:

```
[1. Create Project] ➔ [2. Gen/Upload Refs] ➔ [3. Gen Scene Images] ➔ [4. Gen Veo Videos] ➔ [5. Concat Final]
```

### Step 1: สร้าง Project และ Scene Definitions
- แตกเนื้อเรื่องออกเป็น:
  - **Entities (Characters / Locations):** ระบุรูปลักษณ์ภายนอกอย่างละเอียด (Appearance ONLY ไม่ใส่ Action)
  - **Scenes:** บรรยาย Action และมุมกล้องในแต่ละฉาก (Action ONLY ไม่ต้องบรรยายหน้าตาตัวละครซ้ำ)
  - **`character_names`:** กำหนดว่าฉากไหนมีตัวละคร/สถานที่ใดปรากฏบ้าง

### Step 2: สร้างภาพ Reference (`fk-gen-refs`)
- ยิง API เพื่อสร้างภาพต้นแบบของตัวละครและสถานที่แต่ละตัว
- หรือใช้ออปชัน `upload-ref` แนบรูปจริงจากเครื่อง
- รอให้ทุก Reference ขึ้นสถานะ `COMPLETED` และได้ UUID `media_id`

### Step 3: สร้างภาพแต่ละฉาก (`fk-gen-images`)
- ยิง API สร้างภาพหลักของแต่ละฉาก โดยระบบจะแนบ `media_id` ของ Entities ที่ปรากฏในฉากนั้นเข้าไปใน `imageInputs` อัตโนมัติ
- ผลลัพธ์: ตัวละครจะหน้าตาและชุดเหมือนเดิมทุกฉาก

### Step 4: สร้างคลิปวิดีโอ Veo 3.1 / Omni Flash (`fk-gen-videos`)
- ยิง API แปลงภาพแต่ละฉากเป็นวิดีโอ 8 วินาที
- ระบบรองรับ First Frame (`start_image_media_id`) และ Frame Chaining (`end_image_media_id`)
- ใช้เวลาประมาณ 1-3 นาทีต่อฉาก โดยมีคิว worker จัดการแบบ FIFO ปลอดภัยไม่โดน Rate limit

### Step 5: ดาวน์โหลดและรวมคลิป (`fk-concat`)
- ดึงคลิปทุกฉากลงมาเก็บที่ `P:\AI\The Viral\FlowKit\output\<project_name>\`
- Normalize ความละเอียดและ fps
- รัน FFmpeg ต่อคลิปเข้าด้วยกันเป็นไฟล์มาสเตอร์ `_final.mp4`

---

## ⚙️ REST API Endpoints สำหรับ Agent เรียกตรง

Base URL: `http://127.0.0.1:8100`

- `GET /health` ➔ ตรวจสอบสุขภาพและดูสถานะ Extension
- `GET /api/flow/status` ➔ ข้อมูลการเชื่อมต่อ Flow และ Flow Project ID
- `GET /api/projects` ➔ ดึงรายชื่อโปรเจกต์ทั้งหมด
- `POST /api/projects` ➔ สร้างโปรเจกต์ใหม่พร้อม Entities
- `POST /api/videos` ➔ สร้างวิดีโอคอนเทนเนอร์
- `POST /api/scenes` ➔ เพิ่มฉากในวิดีโอ
- `POST /api/flow/upload-image` ➔ ส่งรูป local ขึ้น Flow คืนค่า `media_id`
- `POST /api/flow/generate-image` ➔ เจนภาพแบบด่วน (พร้อม refs)
- `POST /api/flow/generate-video` ➔ เจนวิดีโอ Veo หรือ Omni Flash (First Frame / Chaining)
- `POST /api/flow/check-status` ➔ เช็คสถานะการเรนเดอร์วิดีโอ

---

## 🚨 กฎเหล็กประจำสกิล (Iron Rules)
1. **Drive P Isolation:** ไฟล์วิดีโอ output, ภาพแคช, และ python virtualenv ต้องอยู่ใน `P:\AI\The Viral\FlowKit` ห้ามนำไฟล์หนักๆ มาเก็บในไดรฟ์ C: เด็ดขาด
2. **Never Freehand DOM:** ห้ามเขียน script ไปคลิกปุ่มบนหน้าเว็บ Flow เด็ดขาด ให้สั่งผ่าน REST API / Extension WebSocket เสมอ
3. **One Generation at a Time:** Google Flow มี cooldown แนะนำให้รอแต่ละ Request เสร็จสิ้น (COMPLETED) ก่อนสั่งฉากถัดไป เพื่อป้องกัน Token throttled
