---
name: gitapp
description: >-
  GitApp Radar and Upstream Ecosystem Sentinel — ตรวจสอบการอัปเดตเวอร์ชันและคอมมิตล่าสุดของ 9 เครื่องมือ Upstream สำคัญในระบบ (FlowKit, Concat, LightCraft, PhotoCraft, FilmCraft, Earshot, HyperFrames, HeyGen CLI, REA CLI) พร้อมระบบ Sentinel เฝ้าระวังความเสี่ยงบั๊กวิกฤตและสถานะบล็อกบัญชีของ FlowKit อัตโนมัติ ใช้เมื่อ: /gitapp หรือ /gitapp flowkit
---

# 📡 Skill: `/gitapp` — GitApp Upstream Radar & FlowKit Sentinel

## 🎯 วัตถุประสงค์
สกิลสำหรับตรวจสอบเวอร์ชันและการอัปเดตของเครื่องมือ Upstream ภายนอกทั้งหมดที่ระบบเราใช้งานอยู่ เทียบระหว่างเวอร์ชันที่ติดตั้งในเครื่อง (Local) กับเวอร์ชันล่าสุดบน GitHub / NPM Registry (Remote) ในคำสั่งเดียว พร้อมระบบ **FlowKit Security Sentinel** สำหรับตรวจจับประเด็นเสี่ยงต่อการถูกแบนบัญชีหรือบั๊กวิกฤต

---

## 🚀 วิธีการเรียกใช้งาน (Slash Commands)

```text
/gitapp             # ตรวจสอบเครื่องมือภายนอกทั้งหมดในระบบ (9 เครื่องมือหลัก) พร้อม FlowKit Sentinel
/gitapp flowkit     # เจาะลึกเฉพาะ FlowKit (เช็คคอมมิตล่าสุด + สแกน Open Issues เฝ้าระวังความปลอดภัย)
/gitapp concat      # เช็คเฉพาะ Concat Video Editor
/gitapp lightcraft  # เช็คเฉพาะ LightCraft
/gitapp photocraft  # เช็คเฉพาะ PhotoCraft
/gitapp filmcraft   # เช็คเฉพาะ FilmCraft
/gitapp earshot     # เช็คเฉพาะ Earshot Audio Engine
/gitapp hyperframes # เช็คเฉพาะ HyperFrames HTML-to-Video Engine
/gitapp heygen      # เช็คเฉพาะ HeyGen CLI (Avatar & Video Engine)
/gitapp rea         # เช็คเฉพาะ REA CLI (Reverse Engineering Engine ของ /clone)
```

---

## 🛠️ รายการเครื่องมือที่เฝ้าระวัง (Monitored Tools Matrix — 9 Tools)

| รหัสแอป | ชื่อเครื่องมือ | GitHub Repository / NPM | ประเภทการติดตั้งในเครื่อง | หน้าที่ใน Ecosystem |
|---|---|---|---|---|
| `flowkit` | **FlowKit** | `crisng95/flowkit` | Git Clone (`The Viral\FlowKit`) | Google Flow (Veo 3.1) Automation **(มี Sentinel เฝ้าระวังแบน)** |
| `concat` | **Concat** | `jub0t/concat` | Desktop Binary (`AppData\Local\Programs\Concat`) | Headless CapCut Replacement & Native MCP |
| `lightcraft` | **LightCraft** | `storytold/lightcraft` | Local Port 7980 / Socket API | RAW Photo Developer & Smart Scene Classifier |
| `photocraft` | **PhotoCraft** | `storytold/photocraft` | Desktop GUI / MCP Server | Photoshop Alternative, Liquify, Layers |
| `filmcraft` | **FilmCraft** | `storytold/filmcraft` | Desktop GUI / CLI | NLE Video Editor & Color Grading |
| `earshot` | **Earshot** | `Leonxlnx/earshot` | Git Clone / Python venv (`tools\earshot`) | Audio SFX, LUFS Loudness & Audio Critique MCP |
| `hyperframes` | **HyperFrames** | `heygen-com/hyperframes` | NPX Package (`npm:hyperframes`) | HTML-to-Video Engine & CLI (`/hyperframes`) |
| `heygen` | **HeyGen CLI** | `heygen-com/heygen-cli` | CLI Executable (`heygen`) | Avatar Video, AI Voice, BGM & Lipsync Engine |
| `rea` | **REA CLI** | `morluto/rea` | NPX Package (`npm:rea-agents`) | Reverse Engineer & App Cloner Engine (`/clone`) |

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

### 🛡️ กลไกความเสถียร & ป้องกัน Rate-Limit:
1. **Zero-Rate-Limit Smart HTTP:** ใช้ `git ls-remote` และ NPM Registry (`registry.npmjs.org`) สำรองอัตโนมัติ ทำให้สแกนได้ไม่จำกัดจำนวนครั้ง แม้ไม่มี GitHub Token
2. **On-Demand Package Sniffer:** ดึงเวอร์ชันแคชจาก `_npx` ของระบบเพื่อเทียบกับ NPM Latest โดยไม่ต้องสั่งดาวน์โหลดใหม่
3. **FlowKit Account-Safety Sentinel:** คัดกรอง Open Issues ด้วยคีย์เวิร์ดความเสี่ยงสูง (`unusual`, `block`, `ban`, `safety`, `hijack`, `hold`, `recaptcha`, `failed`) แจ้งเตือนความเสี่ยงต่อบัญชี Google อัตโนมัติ
