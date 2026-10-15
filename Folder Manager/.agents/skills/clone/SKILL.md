---
name: clone
description: >-
  Reverse Engineer and Clone Engine — แงะไส้ในแอป โคลนฟีเจอร์ แกะ Chrome Extension, Web App, Electron (.asar) และส่อง API คู่แข่ง ด้วย REA CLI แบบ Zero Context Tax โดยไม่ต้องลงทะเบียน MCP ถาวร
---

# 🧬 Skill: `/clone` — Reverse Engineer & Feature Cloner

## 🎯 Objective
สกิลสำหรับแกะไส้ในแอปพลิเคชัน (Reverse Engineering), ส่องโครงสร้างโค้ด, ดักดูเส้นทาง API ที่ซ่อนอยู่ และโคลนตรรกะหรือฟีเจอร์ที่ต้องการ ออกมาเป็นโค้ดสะอาด (Clean-Room Implementation) ในโปรเจกต์ของเรา โดยขับเคลื่อนด้วยเครื่องยนต์ `rea-agents` ผ่าน CLI แบบ On-Demand ไม่เปลือง Token ประจำ IDE (Zero Context Tax)

---

## ⚡ Execution Philosophy: The Clean-Room Triad
1. **Inspect (ส่องไส้):** ผ่าโครงสร้างไฟล์ โมดูล เครือข่าย และฟังก์ชันโดยตรง
2. **Understand with Evidence (จับหลักฐาน):** ค้นหาจุดยิง API, Data Contract และ Flow การทำงานจริง ไม่มโน
3. **Recreate (สร้างใหม่):** สังเคราะห์โค้ดใหม่ในภาษา/สแตกที่โปรเจกต์เราใช้ ไม่ก๊อปโค้ดขยะหรือ license ที่ติดพิษมา

---

## 🚀 Triggers & Usage Syntax

```text
/clone [target]                # โหมดออโต้ ตรวจจับประเภทเป้าหมายเอง
/clone ext [path_or_crx]       # โหมดแกะ Chrome Extension
/clone app [path_or_asar]      # โหมดแกะ Electron / Desktop Application (.asar หรือโฟลเดอร์)
/clone web [url]               # โหมดแกะ Web App / ดักโครงสร้าง Frontend & API
/clone recover [path]          # โหมดกู้คืน Source Code JavaScript แบบอ่านง่าย
/clone trace [target] [query]  # โหมดเจาะลึกเฉพาะฟีเจอร์ เช่น ค้นหา, ส่งข้อมูล, บันทึก
```

---

## 🛠️ Step-by-Step Autonomous Workflow

### Step 1: Target Inspection & Type Routing
Agent ต้องวิเคราะห์ประเภทของ Target ที่ผู้ใช้ส่งเข้ามา:
- **Chrome Extension (โฟลเดอร์ หรือ `.crx`):** แตกไฟล์และจัดทำ Module Graph
- **Electron / Node Desktop (โฟลเดอร์แอป หรือไฟล์ `.asar`):** ชำแหละสคริปต์หน้าบ้าน/หลังบ้าน
- **Web App / URL:** ดึง assets หรือใช้ browser inspect วิเคราะห์ Network API
- **Managed Assembly (.dll / .exe ของ .NET):** ส่อง Metadata และ CIL Types
- **Local SQLite DB:** ส่องโครงสร้างตารางและตัวอย่างข้อมูล

> ⚠️ **Windows Iron Rule:** บน Windows ต้องเรียกผ่าน `npx.cmd` เสมอ (ห้ามใช้ `npx` ลอยๆ เพราะจะติด PowerShell Execution Policy)

---

### Step 2: Run REA Inspection CLI

รันคำสั่งตามประเภทของเป้าหมาย:

#### 1. Electron / JavaScript Application / Chrome Extension Unpacked:
```powershell
npx.cmd -y rea-agents@latest analyze-javascript-application "<ABSOLUTE_PATH>" --json
```

#### 2. กู้คืน JavaScript Source Modules กลับมาเป็นไฟล์โค้ดอ่านง่าย:
```powershell
npx.cmd -y rea-agents@latest recover-javascript-sources "<ABSOLUTE_PATH>" --output "<SCRATCH_OUT_DIR>"
```

#### 3. ส่องโครงสร้าง .NET DLL / Windows Executable:
```powershell
npx.cmd -y rea-agents@latest inspect-managed-artifact "<PATH_TO_DLL>" --json
npx.cmd -y rea-agents@latest inspect-managed-members "<PATH_TO_DLL>" --json
```

#### 4. เจาะค้นหาเฉพาะฟีเจอร์ (Tracing):
```powershell
npx.cmd -y rea-agents@latest trace "<PATH>" "<FEATURE_KEYWORD>" --json
```

---

### Step 3: Analysis, Evidence & Clone Radar Scorecard
เมื่อได้ข้อมูลจากการ Inspect ให้สรุปรายงานพร้อมตัดเกรดผ่าน **Clone Radar Scorecard (5 มิติ 100 คะแนน)** และบังคับคำนวณ **Clone Fidelity Index (% ความสมบูรณ์ในการโคลน)** ทุกครั้ง เพื่อให้ผู้ใช้รู้ทันทีว่าแกะออกมาได้กี่เปอร์เซ็นต์:

#### 🎯 Clone Fidelity Index (% ความสมบูรณ์ในการโคลน)
ต้องแจกแจงตัวเลข % จริงหน้างานเสมอ:
- 📐 **Layout & DOM Structure (%):** โครงสร้างบล็อกและการจัดวางเนื้อหา
- ⚙️ **Interactive Logic & State (%):** ตรรกะเบื้องหลัง ควิซ แบบฟอร์ม หรือการจำลอง State
- 📡 **Tracking & API Contracts (%):** ความครบถ้วนของ Payload และเส้นทางส่งข้อมูล CAPI
- 🎨 **CSS Tokens & Typography (%):** สี สัดส่วนฟอนต์ และความลื่นไหลของแอนิเมชัน
- 🖼️ **Assets & Media Parity (%):** ปริมาณรูปภาพที่กู้คืนได้ (หักลบภาพลิขสิทธิ์ที่ต้องคลีนออก)
👉 **Overall Clone Fidelity: XX%** (สรุป % ความสมบูรณ์รวมที่พร้อมใช้งาน)

#### 📊 Radar Matrix (5 มิติ 100 คะแนน)
| มิติการประเมิน (Radar Dimensions) | คะแนนเต็ม | เกณฑ์การให้คะแนน |
|---|:---:|---|
| **1. UX & Performance** | 20 | ความเร็วโหลด (<1.5s), Mobile Ergonomics, การใช้ Typography/CSS Tokens |
| **2. Conversion & Persuasion** | 25 | ความคมของ Hook, Gamification (Quiz/Checklist), CTA Hierarchy, Social Proof |
| **3. Attribution & CAPI Resilience** | 20 | First-Party Cookie, Server-Side CAPI Deduplication (`eventID`), ทน Ad-blocker |
| **4. Code Modularity & Cleanliness** | 15 | แยก Layer ชัดเจน, ปลอด Bloatware Frameworks, โค้ดอ่านเข้าใจง่าย |
| **5. Clone Feasibility & Speed** | 20 | ความง่ายและเร็วในการทำ Clean-Room (1=แกะเป็นเดือน, 20=เสร็จใน 5 นาที) |

**Composite Tier & Verdict:**
- 🏆 **90–100 (S-Tier):** Lethal Masterpiece — คู่แข่งระดับเทพ ต้องสกัดทั้ง Logic, UI และ Tracking ไปใช้ทันที
- ⭐ **75–89 (A-Tier):** High-Converting Asset — งานคุณภาพสูง มีจุดแข็งด้านคอนเวอร์ชั่นชัดเจน คุ้มค่าแก่การโคลน
- ⚖️ **60–74 (B-Tier):** Standard Play — ทั่วไป ลอกได้เฉพาะบางส่วนที่น่าสนใจ
- ⚠️ **< 60 (C-Tier):** Bloated / Inefficient — โค้ดรกรุงรัง หรือคอนเวอร์ชั่นอ่อน ไม่คุ้มที่จะโคลนทั้งยวง

**Action Matrix บังคับสรุป 3 ข้อ:**
1. 🔥 **Steal This (จุดที่ต้องลอก):** ทริกหรือระบบที่คู่แข่งทำได้เด็ดขาด
2. ⚠️ **Drop This (จุดขยะที่ต้องทิ้ง):** โค้ดขยะ ตราสินค้า หรือ Dependency เกินจำเป็น
3. 🚀 **Next Steps:** ลำดับการเอาไปประยุกต์ใช้ในโปรเจกต์เรา

---

### Step 4: Clean-Room Code Synthesis & Output Artifacts
ลงมือสร้างไฟล์ Clean-Room ในโฟลเดอร์ `scratch/clone_<name>/` ทันที พร้อมส่งมอบ 2 ส่วน:
1. **Clean Code Package:** แยกเป็นไฟล์พร้อมรัน (เช่น `index.html`, `brand.css`, `tracker.js`, `component.js`) โดยตัดเครื่องหมายการค้าเดิมออกทั้งหมด
2. **Autonomous Scorecard Report (`CLONE_SCORECARD.md`):** บันทึกตารางคะแนน, Radar Breakdown, Hidden APIs, และ Evidence ลงในโฟลเดอร์ scratch นั้นเสมอ เพื่อให้ย้อนกลับมาดูผลการประเมินได้ตลอดเวลา

---

## 🛡️ Iron Rules for `/clone`
1. **Zero Hallucination:** ทุกข้อสรุปต้องมีหลักฐานจากโค้ดจริง (ไฟล์ไหน บรรทัดไหน URL อะไร)
2. **Clean Output:** สคริปต์ชั่วคราวหรือไฟล์ที่ Decompile ออกมาให้เก็บใน `scratch/clone_<name>/` หรือ `tmp/` เท่านั้น ห้ามวางเกะกะที่ root
3. **Legal & Security Fence:** ใช้เพื่อการเชื่อมต่อ (Interoperability), ศึกษาตรรกะ, และทำ Automation ภายใน ห้ามนำไปแคร็กหรือคัดลอก UI ที่ติดเครื่องหมายการค้าแบบ 1:1

---

## 🔗 GBRAIN Backlinks
### related_to
- **2026-10-14 19:15** | [V14.31.0 [impl] Clone Skill & REA Reverse Engineer Engine](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Complete/Core-VPS/V14.31.0_[impl]_infra_clone-skill-and-rea-reverse-engineer-engine.md) -- Initial creation of /clone on-demand REA skill wrapper.
