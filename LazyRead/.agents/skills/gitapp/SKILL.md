---
name: gitapp
description: >-
  GitApp Radar and Upstream Ecosystem Sentinel — ตรวจสอบการอัปเดตเวอร์ชันและคอมมิตล่าสุดของเครื่องมือ Upstream สำคัญในระบบ (FlowKit, Concat, LightCraft, PhotoCraft, FilmCraft, Earshot) พร้อมระบบ Sentinel เฝ้าระวังความเสี่ยงบั๊กวิกฤตและสถานะบล็อกบัญชีของ FlowKit อัตโนมัติ ใช้เมื่อ: /gitapp หรือ /gitapp flowkit
---

# 📡 Skill: `/gitapp` — GitApp Upstream Radar & FlowKit Sentinel

## 🎯 วัตถุประสงค์
สกิลสำหรับตรวจสอบเวอร์ชันและการอัปเดตของเครื่องมือ Upstream ภายนอกทั้งหมดที่ระบบเราใช้งานอยู่ เทียบระหว่างเวอร์ชันที่ติดตั้งในเครื่อง (Local) กับเวอร์ชันล่าสุดบน GitHub (Remote) ในคำสั่งเดียว พร้อมระบบ **FlowKit Security Sentinel** สำหรับตรวจจับประเด็นเสี่ยงต่อการถูกแบนบัญชีหรือบั๊กวิกฤต

---

## 🚀 วิธีการเรียกใช้งาน (Slash Commands)

```text
/gitapp             # ตรวจสอบเครื่องมือภายนอกทั้งหมดในระบบ (6 เครื่องมือหลัก) พร้อม FlowKit Sentinel
/gitapp flowkit     # เจาะลึกเฉพาะ FlowKit (เช็คคอมมิตล่าสุด + สแกน Open Issues เฝ้าระวังความปลอดภัย)
/gitapp concat      # เช็คเฉพาะ Concat Video Editor
/gitapp lightcraft  # เช็คเฉพาะ LightCraft
/gitapp photocraft  # เช็คเฉพาะ PhotoCraft
/gitapp filmcraft   # เช็คเฉพาะ FilmCraft
/gitapp earshot     # เช็คเฉพาะ Earshot Audio Engine
```

---

## 🛠️ รายการเครื่องมือที่เฝ้าระวัง (Monitored Tools Matrix)

| รหัสแอป | ชื่อเครื่องมือ | GitHub Repository | ประเภทการติดตั้งในเครื่อง | หน้าที่ใน Ecosystem |
|---|---|---|---|---|
| `flowkit` | **FlowKit** | `crisng95/flowkit` | Git Clone (`The Viral\FlowKit`) | Google Flow (Veo 3.1) Automation **(มี Sentinel เฝ้าระวังแบน)** |
| `concat` | **Concat** | `jub0t/concat` | Desktop Binary (`AppData\Local\Programs\Concat`) | Headless CapCut Replacement & Native MCP |
| `lightcraft` | **LightCraft** | `storytold/lightcraft` | Local Port 7980 / Socket API | RAW Photo Developer & Smart Scene Classifier |
| `photocraft` | **PhotoCraft** | `storytold/photocraft` | Desktop GUI / MCP Server | Photoshop Alternative, Liquify, Layers |
| `filmcraft` | **FilmCraft** | `storytold/filmcraft` | Desktop GUI / CLI | NLE Video Editor & Color Grading |
| `earshot` | **Earshot** | `Leonxlnx/earshot` | Git Clone / Python venv (`tools\earshot`) | Audio SFX, LUFS Loudness & Audio Critique MCP |

---

## ⚡ เบื้องหลังการทำงาน (Execution Architecture)

เมื่อผู้ใช้เรียก `/gitapp` เอเจนต์จะรันสคริปต์กลาง:
```powershell
python "C:\My Claw\Openclaw-VPS\tools\check_gitapp_radar.py"
```
หรือเจาะจงรายแอป:
```powershell
python "C:\My Claw\Openclaw-VPS\tools\check_gitapp_radar.py" --app flowkit
```

### 🛡️ กลไกของ FlowKit Account-Safety Sentinel:
1. ดึง Open Issues ล่าสุดจาก GitHub ของ FlowKit
2. คัดกรองด้วยคีย์เวิร์ดความเสี่ยงสูง: `unusual`, `block`, `ban`, `safety`, `hijack`, `hold`, `recaptcha`, `failed`
3. แจ้งเตือนหมายเลข Issue พร้อมลิงก์ทันทีหากมีสัญญาณความเสี่ยงต่อบัญชี Google
