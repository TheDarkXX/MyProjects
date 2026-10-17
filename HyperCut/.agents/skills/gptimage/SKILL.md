---
name: gptimage
version: "1.0.0"
updated_at: "2026-10-17"
description: >-
  OpenAI GPT Image 2 Engine (Codex) — สร้างภาพ Infographic การแพทย์ ภาพปกไวรัล และอาร์ตเวิร์กคุณภาพสูง เรนเดอร์ภาษาไทยคมชัด 100% สระไม่เพี้ยน ไม่จม รองรับสัดส่วน 1:1 9:16 16:9 และ Image-to-Image อ้างอิงภาพเดิม ใช้เมื่อผู้ใช้พิมพ์ /gptimage หรือสั่งเจนภาพด้วย gpt
---

# 🎨 Skill: `/gptimage` (OpenAI GPT-Image-2 Engine)

## 📌 ภาพรวม (Overview)
เครื่องยนต์เจนภาพขั้นเทพผ่าน **GPT-Image-2 (OpenAI Codex Backend)** ฟรี 100% ผ่านระบบ Auth ของ Codex ในเครื่อง
จุดเด่นที่เหนือกว่าโมเดลสร้างภาพอื่น (เช่น Imagen 3 หรือ Midjourney):
1. **ภาษาไทยคมชัด 100%**: เรนเดอร์ตัวอักษรไทย วรรณยุกต์ สระ ตัวสะกด ได้ถูกต้องสมบูรณ์แบบ ไม่เพี้ยน ไม่เป็นภาษาต่างดาว
2. **Infographic & Typography ในตัว**: สร้างข้อความพาดหัว 3D แถบสี และตารางเปรียบเทียบข้อมูลการแพทย์หลายช่องได้ใน Prompt เดียว
3. **Photo-Realistic 3D & Human Emotion**: แสดงสีหน้า แววตา และกายวิภาคการแพทย์ (Anatomy 3D) ได้สมจริง น่าเชื่อถือ

---

## 🚀 วิธีการเรียกใช้งาน (Execution Command)

รันผ่านสคริปต์ Node.js ในโฟลเดอร์ `tools/`:

```powershell
node tools/gpt-image.cjs --prompt "PROMPT" [--ar RATIO] [--ref REF_IMAGE] [--out OUTPUT_PATH]
```

### พารามิเตอร์หลัก
| ธง (Flag) | ความหมาย | ค่าที่รองรับ / ตัวอย่าง |
|---|---|---|
| `--prompt`, `-p` | คำสั่งเจนภาพ (อังกฤษแนะนำที่สุด) | `--prompt "A viral medical infographic..."` |
| `--ar` | สัดส่วนภาพ (Aspect Ratio) | `1:1`, `9:16`, `16:9`, `4:5`, `3:4` (ค่าเริ่มต้น: `1:1`) |
| `--ref`, `-r` | รูปต้นแบบสำหรับ Image-to-Image / Style | `--ref path/to/sample.jpg` (ใส่ได้หลายภาพ) |
| `--out`, `-o` | ปลายทางไฟล์ภาพผลลัพธ์ | `--out output/my_image.png` (ค่าเริ่มต้น: `image_<timestamp>.png`) |
| `--quality`, `-q` | ระดับคุณภาพภาพ | `auto`, `standard`, `high` (ค่าเริ่มต้น: `auto`) |
| `--format`, `-f` | ฟอร์แมตไฟล์ | `png`, `jpeg`, `webp` (ค่าเริ่มต้น: `png`) |

> 💡 **Auto-Mirror to Artifacts**: สคริปต์นี้จะก็อปปี้ภาพผลลัพธ์ไปยังโฟลเดอร์ Artifacts ของ Antigravity Session ปัจจุบันโดยอัตโนมัติ ทำให้สามารถแสดงภาพในแชทได้ทันทีผ่าน `view_file`!

---

## 📐 กฎเหล็กการเขียน Prompt ภาษาไทยในภาพ (Prompt Engineering)

เพื่อให้ได้ภาษาไทยที่คมกริบและเลย์เอาต์สไตล์ Facebook Viral / DoctorBank ให้ทำตามโครงสร้างนี้:

### 1. ล็อกข้อความด้วย Single Quotes
ระบุข้อความภาษาไทยตรงๆ ในเครื่องหมายคำพูดเดี่ยว เช่น:
- `Top headline in bold 3D white text: 'นอนครบ 8 ชม. อย่าเพิ่งดีใจ!'`
- `Red banner banner text in bold yellow: 'ตื่นมาเพลีย เช็กด่วน 5 ค่านี้!'`

### 2. กำหนด Style ของตัวอักษร (Typography)
- ระบุสีข้อความ สีขอบ (Stroke) และเงา เช่น `embossed 3D text with thick black outline`
- ระบุสีแถบรองหลัง เช่น `solid bright red rectangular banner (#FF0000)`

### 3. โครงสร้าง Layout สไตล์เพจการแพทย์ไวรัล
- **TOP/HEADER**: ข้อความพาดหัว 3D ใหญ่สะดุดตา + แถบเตือนสีแดง
- **CENTER/BODY**: หมอแสดงอารมณ์ชัดเจน (ช็อก, ชี้เตือน, ตั้งคำถาม) + กราฟิก 3D (หัวใจ, สมอง, ดวงตา, ตับ, หลอดเลือด)
- **BOTTOM**: ตารางเปรียบเทียบ (Comparison Columns) หรือ กล่องข้อมูลไอคอน (Grid Boxes)
- **STYLE**: Ultra-photorealistic, high-contrast, modern clean medical infographic, 8k resolution.

---

## ⚡ ตัวอย่างการใช้งานจริง

### ตัวอย่าง 1: ภาพพาดหัวแนวเตือนภัย (Square 1:1)
```powershell
node tools/gpt-image.cjs --prompt "A viral medical Facebook infographic poster in Thai language. TOP: A 35-year-old Asian doctor looking shocked pointing at an eye. Behind him is a 3D medical render of a human brain with red ischemic stroke vessel. BOTTOM: Large 3D white text with black outline: 'ตาก็เป็น \"สโตรก\" ได้!'. Below it a bright red banner: 'ไม่อยากเสี่ยงตาบอดต้องอ่านโพสต์นี้!' in yellow text. Ultra-realistic, high contrast." --ar 1:1 --out scratch/eye_stroke.png
```

### ตัวอย่าง 2: ภาพปกแนวตั้งสำหรับ Reels / TikTok (9:16)
```powershell
node tools/gpt-image.cjs --prompt "Vertical 9:16 poster. A friendly Asian doctor holding a stethoscope. Large bold text at the top in Thai: '5 สัญญาณเตือนไตเสื่อม' with red accent banner: 'รู้ก่อนฟอกไต'. 3D kidney illustration in the background." --ar 9:16 --out scratch/kidney_reels_cover.png
```

### ตัวอย่าง 3: อ้างอิงภาพจริง (Image-to-Image / Style Transfer)
```powershell
node tools/gpt-image.cjs --prompt "Recreate this medical poster concept featuring an Asian doctor in white coat, with exact Thai typography: 'หัวใจเต้นผิดจังหวะ มีกี่แบบ?' in identical clean 5-column infographic layout." --ref "input_photo.jpg" --out scratch/cloned_poster.png
```
