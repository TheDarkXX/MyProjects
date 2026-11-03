---
name: clone
description: >-
  Reverse Engineer and Clean-Room Clone Engine — ส่องไส้ในแอป โคลนฟีเจอร์ แกะ Web App, Chrome Extension, Electron (.asar), Android APK, และ Game Assets ด้วย Craft Anything Native Rust CLI (320 Tools) พร้อมระบบ Visual Pixel Diff และ Clean-Room Synthesis
---

# 🧬 Skill: `/clone` — Reverse Engineer & Feature Cloner (V2.0 Craft Anything Powered)

## 🎯 Objective
สกิลสำหรับแกะไส้ในแอปพลิเคชัน (Reverse Engineering), ส่องโครงสร้างโค้ดและดีไซน์, ดักดูเส้นทาง API ที่ซ่อนอยู่ และโคลนตรรกะหรือฟีเจอร์ที่ต้องการ ออกมาเป็นโค้ดสะอาด (Clean-Room Implementation) ในโปรเจกต์ของเรา ขับเคลื่อนด้วยขุมพลัง **Craft Anything Native Rust Engine** (`craft-anything-cli.exe` 320 Tools) เป็นเครื่องยนต์หลัก รวดเร็ว 0ms Latency และคง `rea-agents` ไว้เป็นเครื่องยนต์สำรอง (Fallback) โดยไม่ต้องเสียค่า Token AI ในขั้นตอนการ Inspect (Zero Context Tax / 0 Token)

---

## ⚡ Execution Philosophy: The Clean-Room Triad
1. **Inspect (ส่องไส้ด้วย Native Tools):** ผ่าโครงสร้าง DOM, โมดูล JS, APK, หรือไฟล์ Asset โดยตรงด้วย Rust CLI 100% ไม่พึ่งพา AI
2. **Understand & Visual Parity (จับหลักฐาน & เทียบพิกเซล):** ค้นหาจุดยิง API, Data Contract, CSS Tokens และรัน `web_pixels_compare` เทียบความเหมือนของหน้าจอ (Responsive Viewports)
3. **Recreate (สังเคราะห์ใหม่):** เขียนโค้ดใหม่ (Clean-Room) ในสแตกที่เราต้องการ โดยให้ Antigravity หรือ Gemini Flash Worker ช่วยสร้างลง `scratch/` ไม่ก๊อปโค้ดขยะหรือ license ติดพิษมา

---

## 🚀 Triggers & Usage Syntax

```text
/clone [target]                # โหมดออโต้ ตรวจจับประเภทเป้าหมายเอง
/clone web [url]               # โหมดแกะ Web App / เซลส์เพจ / ดักโครงสร้าง Frontend & API
/clone diff [orig_url] [my_url]# โหมดเทียบหน้าเว็บระดับพิกเซล (Visual Pixel & Snapshot Diff)
/clone app [path_or_asar]      # โหมดแกะ Electron / Desktop Application (.asar หรือโฟลเดอร์)
/clone ext [path_or_crx]       # โหมดแกะ Chrome Extension และกู้โมดูล JS
/clone apk [path_or_apk]       # โหมดแกะ Android APK, Flutter AOT, Dalvik Bytecode
/clone game [path_to_assets]   # โหมดแกะ Unity .assets, Unreal .pak, IL2CPP Metadata
/clone trace [target] [query]  # โหมดเจาะลึกเฉพาะฟีเจอร์ / ฟังก์ชัน / ข้อความ
```

---

## 🛠️ Step-by-Step Autonomous Workflow

### Step 1: Engine Path & Environment Discovery
เรียกใช้งานไบนารี Native Rust ที่ติดตั้งไว้ใน Workspace เป็นอันดับแรก:
- **Primary Engine (Rust Native):**
  `C:\My Claw\Openclaw-VPS\tools\craft-anything\craft-anything-cli.exe` (หรือ `tools/craft-anything/craft-anything-cli.exe`)
- **Fallback Engine (Node CLI):**
  `npx.cmd -y rea-agents@latest` (กรณีรันบนสภาพแวดล้อมที่ไม่มีไบนารี)

---

### Step 2: Run Inspection Commands (Primary: Craft Anything)

#### 1. Web App / Landing Page Inspection:
```powershell
& "tools\craft-anything\craft-anything-cli.exe" web-page-show "<TARGET_URL>" --json
& "tools\craft-anything\craft-anything-cli.exe" web-site-capture "<TARGET_URL>" --output "scratch/capture_web"
```

#### 2. Visual Diff & Parity Verification (เทียบความเหมือนของหน้าเว็บ):
```powershell
& "tools\craft-anything\craft-anything-cli.exe" web-snapshots-compare "<ORIGINAL_URL>" "<LOCAL_DEV_URL>" --json
& "tools\craft-anything\craft-anything-cli.exe" web-pixels-compare "<SCREENSHOT_ORIG>" "<SCREENSHOT_DEV>" --tolerance 0.05
```

#### 3. Electron / JavaScript Application / Chrome Extension Source Recovery:
```powershell
# กู้คืนโมดูลโค้ดจาก Webpack/Bundler กลับมาเป็นไฟล์โครงสร้างเดิม
& "tools\craft-anything\craft-anything-cli.exe" js-sources-restore "<PATH_TO_APP_OR_ASAR>" --out-dir "scratch/recovered_src"
& "tools\craft-anything\craft-anything-cli.exe" js-app-map "<PATH_TO_APP_OR_ASAR>" --json
```

#### 4. Android APK / Mobile App Inspection:
```powershell
& "tools\craft-anything\craft-anything-cli.exe" android-package-show "<PATH_TO_APK>" --json
& "tools\craft-anything\craft-anything-cli.exe" android-flutter-identify "<PATH_TO_APK>" --json
```

#### 5. Native Binaries / .NET / Unity / Game Assets:
```powershell
& "tools\craft-anything\craft-anything-cli.exe" native-pe-resources-list "<PATH_TO_EXE>" --json
& "tools\craft-anything\craft-anything-cli.exe" game-unity-list "<PATH_TO_ASSETS>" --json
```

*(หมายเหตุ: หากเกิดข้อผิดพลาดกับ Native CLI ให้ Fallback ไปใช้ `npx.cmd -y rea-agents@latest` ทันที)*

---

### Step 3: Analysis, Evidence & Clone Radar Scorecard
เมื่อได้ข้อมูลจากการ Inspect ให้สรุปรายงานพร้อมตัดเกรดผ่าน **Clone Radar Scorecard (5 มิติ 100 คะแนน)** และบังคับคำนวณ **Clone Fidelity Index (% ความสมบูรณ์ในการโคลน)** ทุกครั้ง:

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
1. **Zero Hallucination:** ทุกข้อสรุปต้องมีหลักฐานจากโค้ดหรือการตรวจวัดจริง (URL, Selector, Payload, Asset Hash)
2. **Clean Output:** สคริปต์ชั่วคราวหรือไฟล์ที่ Decompile ออกมาให้เก็บใน `scratch/clone_<name>/` หรือ `tmp/` เท่านั้น ห้ามวางเกะกะที่ root
3. **Claude Code Quota Guard (Iron Rule):** **ห้ามสั่งรัน `craft-anything-cli rebuild` กับ Claude Code ใน background เด็ดขาด** เพื่อป้องกันโควตา Claude Pro ($20/เดือน) ถูกเผาจากลูป auto-refine ให้รันเฉพาะคำสั่ง Inspect/Compare แล้วให้ Antigravity หรือ Gemini Flash Worker ช่วยสร้างโค้ด Clean-room แทน
4. **Legal & Security Fence:** ใช้เพื่อการเชื่อมต่อ (Interoperability), ศึกษาตรรกะ, และทำ Automation ภายใน ห้ามนำไปแคร็กหรือคัดลอก UI ที่ติดเครื่องหมายการค้าแบบ 1:1

---

## 🔗 GBRAIN Backlinks
### depends_on
- **2026-11-04 01:25** | [V14.91.0 [impl] Craft Anything Clone Engine Upgrade](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Complete/Core-VPS/V14.91.0_[impl]_infra_craft-anything-clone-engine-upgrade.md) -- Integration of Craft Anything 320-tool Rust engine into /clone skill.
### related_to
- **2026-10-14 19:15** | [V14.31.0 [impl] Clone Skill & REA Reverse Engineer Engine](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Complete/Core-VPS/V14/V14.31.0_[impl]_infra_clone-skill-and-rea-reverse-engineer-engine.md) -- Initial creation of /clone on-demand REA skill wrapper.

