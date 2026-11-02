---
name: repoapp
description: >-
  RepoApp Radar and Upstream Ecosystem Sentinel — ตรวจสอบการอัปเดตเวอร์ชันและคอมมิตล่าสุดของ 8 เครื่องมือ Upstream สำคัญในระบบ พร้อมเจาะลึกสรุป Major Updates ล่าสุดของ 4 ขุมพลังหลัก (FlowKit, LightCraft, PhotoCraft, Concat) และระบบ Sentinel เฝ้าระวังความเสี่ยงบัญชี FlowKit อัตโนมัติ ใช้เมื่อ: /repoapp หรือ /repoapp flowkit
---

# 📡 Skill: `/repoapp` — RepoApp Upstream Radar & Major Update Sentinel

## 🎯 วัตถุประสงค์
สกิลสำหรับตรวจสอบเวอร์ชันและการอัปเดตของเครื่องมือ Upstream ภายนอกทั้งหมดที่ระบบเราใช้งานอยู่ เทียบระหว่างเวอร์ชันที่ติดตั้งในเครื่อง (Local) กับเวอร์ชันล่าสุดบน GitHub / NPM Registry (Remote) ในคำสั่งเดียว พร้อมระบบ **Major Update Digest** เจาะลึกฟีเจอร์สำคัญล่าสุดของ 4 ขุมพลังหลัก (FlowKit, LightCraft, PhotoCraft, Concat) และ **FlowKit Security Sentinel** สำหรับตรวจจับประเด็นเสี่ยงต่อการถูกแบนบัญชีหรือบั๊กวิกฤต

---

## 🚀 วิธีการเรียกใช้งาน (Slash Commands)

```text
/repoapp             # ตรวจสอบเครื่องมือภายนอกทั้งหมด พร้อมคาย Major Updates ล่าสุด (FlowKit, LightCraft, PhotoCraft, Concat)
/repoapp flowkit     # เจาะลึกเฉพาะ FlowKit (เช็คคอมมิตล่าสุด + สแกน Open Issues เฝ้าระวังความปลอดภัย)
/repoapp concat      # เจาะลึกเฉพาะ Concat Video Editor
/repoapp lightcraft  # เจาะลึกเฉพาะ LightCraft
/repoapp photocraft  # เจาะลึกเฉพาะ PhotoCraft
/repoapp filmcraft   # เช็คเฉพาะ FilmCraft
/repoapp earshot     # เช็คเฉพาะ Earshot Audio Engine
/repoapp hyperframes # เช็คเฉพาะ HyperFrames HTML-to-Video Engine
/repoapp rea         # เช็คเฉพาะ REA CLI (Reverse Engineering Engine ของ /clone)
```

---

## 🛠️ รายการเครื่องมือที่เฝ้าระวัง (Monitored Tools Matrix — 8 Tools)

| รหัสแอป | ชื่อเครื่องมือ | GitHub Repository / NPM | ประเภทการติดตั้งในเครื่อง | หน้าที่ใน Ecosystem |
|---|---|---|---|---|
| `flowkit` | **FlowKit** | `crisng95/flowkit` | Git Clone (`The Viral\FlowKit`) | Google Flow (Veo 3.1) Automation **(มี Sentinel เฝ้าระวังแบน + โมเดล Beluga)** |
| `concat` | **Concat** | `jub0t/concat` | Desktop Binary (`AppData\Local\Programs\Concat`) | Headless CapCut Replacement & Native MCP **(Audio Shelf, Voice Clones)** |
| `lightcraft` | **LightCraft** | `storytold/lightcraft` | Local Port 7980 / Socket API | RAW Photo Developer & Smart Scene Classifier **(egui 0.37, Auto-Import Wait)** |
| `photocraft` | **PhotoCraft** | `storytold/photocraft` | Desktop GUI / MCP Server | Photoshop Alternative, Liquify, Layers **(Tiled Damage Render, Live Drag)** |
| `filmcraft` | **FilmCraft** | `storytold/filmcraft` | Desktop GUI / CLI | NLE Video Editor & Color Grading |
| `earshot` | **Earshot** | `Leonxlnx/earshot` | Git Clone / Python venv (`tools\earshot`) | Audio SFX, LUFS Loudness & Audio Critique MCP |
| `hyperframes` | **HyperFrames** | `heygen-com/hyperframes` | NPX Package (`npm:hyperframes`) | HTML-to-Video Engine & CLI (`/hyperframes`) |
| `rea` | **REA CLI** | `morluto/rea` | NPX Package (`npm:rea-agents`) | Reverse Engineer & App Cloner Engine (`/clone`) |

---

## ⚡ เบื้องหลังการทำงาน (Execution Architecture)

เมื่อผู้ใช้เรียก `/repoapp` เอเจนต์จะรันสคริปต์กลาง:
```powershell
python "C:\My Claw\Openclaw-VPS\tools\check_repoapp_radar.py"
```
หรือเจาะจงรายแอป:
```powershell
python "C:\My Claw\Openclaw-VPS\tools\check_repoapp_radar.py" --app flowkit
```

### 🛡️ กลไกการคายข้อมูล Major Updates & Security Sentinel:
1. **Curated Major Updates Extractor:** คายสรุปฟีเจอร์สำคัญและ Breaking Changes ล่าสุดของ 4 เครื่องมือหลัก (FlowKit, LightCraft, PhotoCraft, Concat) โดยอัตโนมัติ
2. **Zero-Rate-Limit Smart HTTP:** ใช้ `git ls-remote` และ NPM Registry (`registry.npmjs.org`) สำรองอัตโนมัติ ทำให้สแกนได้ไม่จำกัดจำนวนครั้ง แม้ไม่มี GitHub Token
3. **FlowKit Account-Safety Sentinel:** คัดกรอง Open Issues ด้วยคีย์เวิร์ดความเสี่ยงสูง (`unusual`, `block`, `ban`, `safety`, `hijack`, `hold`, `recaptcha`, `failed`) แจ้งเตือนความเสี่ยงต่อบัญชี Google อัตโนมัติ
