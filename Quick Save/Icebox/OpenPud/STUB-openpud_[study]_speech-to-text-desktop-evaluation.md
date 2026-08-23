---
brain_task_id: "DEV-openpud-2026-08-23"
title: "OpenPud — Speech-to-Text Desktop Tool Evaluation"
type: study
status: iceboxed
source: "https://github.com/gotzastory/OpenPud"
author: gotzastory
tech_stack: "Electron 43 + TypeScript + Vite 8 + Tailwind CSS v4"
version_evaluated: "0.1.1"
overall_score: 7.0
verdict: ICEBOX
created: 2026-08-23T16:40:00+07:00
reviewed_by: "มหาเทพ (Claude Opus 4.6)"
tags: [speech-to-text, electron, productivity, windows, whisper, openrouter]
---

# OpenPud — Speech-to-Text Desktop Tool Evaluation

## 📜 Context (Compiled Truth)

### What It Is
**OpenPud** — โปรแกรม Windows desktop แปลงเสียงพูดเป็นข้อความ (Speech-to-Text) แบบ system-wide hotkey คล้าย Typeless. สร้างด้วย Electron + TypeScript + Vite + Tailwind CSS v4.

**Core Flow:** กดปุ่มลัด (Ctrl+Space) → พูด → ปล่อยปุ่ม → ข้อความถูก paste ตรง cursor ของแอปที่กำลังใช้อยู่ทันที ผ่าน clipboard + Ctrl+V

### Architecture
- **Electron 2-process model:** Main (Node) + Renderer (DOM) คุยกันผ่าน contextBridge/preload เท่านั้น
- **contextIsolation: true, nodeIntegration: false** — Electron best practices
- **3 renderer entry points, 1 index.html:** Widget (floating pill), Dashboard, Onboarding — แยกด้วย location.hash
- **Widget window:** frameless, transparent, alwaysOnTop, skipTaskbar, focusable: false — ไม่แย่ง focus จากแอปที่กำลังพิมพ์
- **Recording pipeline:** getUserMedia → MediaRecorder → Blob → IPC → Whisper API → pasteAtCursor()

### Key Features
- Multi-provider: OpenRouter, OpenAI, Gemini (Google AI Studio), self-hosted whisper.cpp
- Dictionary bias สำหรับ STT + Correction rules สำหรับ post-processing
- AI polish (ขัดประโยค) + Translate mode (พูดภาษาใดก็ได้ แปลเป็นภาษาเป้าหมาย)
- History 500 รายการ
- Privacy: electron-store (JSON local), API key เข้ารหัส Windows DPAPI
- Auto-start with Windows, customizable hotkey

### Dependencies (package.json)
```
devDependencies:
  @tailwindcss/vite: ^4.3.3
  electron: ^43.2.0
  electron-builder: ^26.15.3
  tailwindcss: ^4.3.3
  typescript: ~6.0.2
  vite: ^8.1.1
  vite-plugin-electron: ^1.1.0

dependencies:
  electron-store: ^11.0.2
```

Minimal dependency footprint — lean และ maintainable

### 5-Dimension Star Scoring

| Dimension | Score | Reasoning |
|---|---|---|
| 🌟 Value | 9/10 | แก้ pain point จริง — text input acceleration สำหรับ daily workflow |
| 🔗 Compatibility | 6/10 | Standalone — ไม่ integrate เข้า AG pipeline โดยตรง |
| ⚠️ Risk | 2/10 | Low — external tool, ไม่แตะ codebase ใดของเรา |
| 🌱 Growth | 5/10 | Linear productivity gain, ไม่ enable exponential AG scale |
| ⏱️ Effort | 1/10 | Trivial — แค่โหลด installer มาลง + ใส่ API key |

**Overall: 7.0/10**

### ข้อดี
1. UX ดีมาก — floating pill ไม่แย่ง focus, keyboard-driven ทั้งหมด
2. Multi-provider — OpenRouter คีย์เดียวใช้ได้ทั้ง STT + Chat
3. Dictionary + Correction rules — ฉลาด แก้ปัญหาศัพท์เฉพาะ
4. Privacy-first — local storage, DPAPI encryption
5. Architecture สะอาด — context isolation, preload bridge, TypeScript strict
6. README/UI ภาษาไทย — เหมาะ user base ของเรา
7. Default model combo ดี — whisper-large-v3-turbo + gemini-3.5-flash-lite

### ข้อเสีย
1. ไม่มี License อย่างเป็นทางการ
2. ไม่มี test/lint setup
3. Windows only
4. Version 0.1.1 — early stage
5. ไม่มี plugin/extension system
6. Paste ผ่าน clipboard (Ctrl+V) — มี edge case
7. ไม่มี API/webhook output สำหรับ pipe transcription

### Verdict: 🧊 ICEBOX
เก็บไว้เป็น reference + personal tool. ยังไม่ adopt เข้า AG system จนกว่าจะมี use case ที่ต้องการ voice-to-text pipeline ในระบบ automation.

---

## 📦 RAW ARTIFACT BACKUP (Iron Rule)

<details>
<summary>README.md (Full Text)</summary>

โปรแกรมแปลงเสียงพูดเป็นข้อความอัตโนมัติ (คล้าย Typeless) สำหรับ **Windows** — กดปุ่มลัด พูด ปล่อยปุ่ม แล้วข้อความจะถูกวางที่ตำแหน่ง cursor ในแอปที่กำลังใช้งานอยู่ทันที ไม่ต้องสลับหน้าต่าง ไม่ต้องคัดลอกเอง

สร้างด้วย Electron + TypeScript + Vite + Tailwind CSS v4

**ดาวน์โหลดตัวติดตั้งล่าสุด** · Releases ทั้งหมด

### ความต้องการของระบบ
| รายการ | รายละเอียด |
|---|---|
| OS | Windows 10 / 11 (x64) |
| ไมโครโฟน | มีไมค์ (built-in หรือ USB) และอนุญาตสิทธิ์ไมค์ให้แอป |
| อินเทอร์เน็ต | จำเป็นตอนถอดเสียง / ใช้ AI (เรียก API ของ provider ที่เลือก) |
| API key | OpenRouter (แนะนำ), Google AI Studio, หรือ OpenAI |

### ฟีเจอร์
- Dictate ด้วยปุ่มลัดทั่วระบบ
- Floating pill — widget โปร่งใส ลอยกลางล่างจอ ไม่แย่ง focus
- หลาย provider — OpenAI, OpenRouter, Gemini, self-hosted
- Dictionary — คำเฉพาะ / ชื่อเฉพาะ / ศัพท์เทคนิค
- Correction rules — แทนที่คำที่ถอดผิดซ้ำๆ
- AI polish / Translate
- History — สูงสุด 500 รายการ
- ตั้งค่าปุ่มลัดแบบกดจริง
- เปิดตอน Windows เริ่ม

### โมเดลที่แนะนำ
| หน้าที่ | โมเดล |
|---|---|
| ถอดเสียง (STT) | openai/whisper-large-v3-turbo |
| Chat (polish/translate) | google/gemini-3.5-flash-lite |

### STT / Chat backend ที่รองรับ
| Provider | Base URL |
|---|---|
| OpenRouter (แนะนำ) | https://openrouter.ai/api/v1 |
| Gemini (Google AI Studio) | https://generativelanguage.googleapis.com/v1beta |
| OpenAI | https://api.openai.com/v1 |
| กำหนดเอง | ใส่เอง |

### สถาปัตยกรรมโดยย่อ
Electron แยก 2 โปรเซส คุยกันผ่าน contextBridge (electron/preload.ts) เท่านั้น — contextIsolation: true, nodeIntegration: false

- electron/ — main process: หน้าต่าง widget + dashboard, global hotkey, tray, ถอดเสียง, วางข้อความ, persistence
- src/ — renderer: floating pill, อัดเสียง, dashboard (Home / History / Dictionary / Settings), onboarding

</details>

<details>
<summary>CLAUDE.md (Architecture Deep Dive)</summary>

OpenPud — a Typeless-style voice dictation app for Windows: hold a global hotkey, speak, and the transcribed text is pasted at the cursor in whatever app currently has focus. Electron + TypeScript + Vite.

Two separate TypeScript programs bundled by vite-plugin-electron/simple (see vite.config.ts), each with its own tsconfig.json:
- electron/ — main process (Node context). Builds to dist-electron/main.js + dist-electron/preload.mjs.
- src/ — renderer process (DOM context, no Node access). Builds via normal Vite to dist/.

The two only talk through electron/preload.ts, which exposes a single window.typeless object via contextBridge. contextIsolation: true / nodeIntegration: false everywhere.

Three renderer entry points, one index.html:
- #/onboarding → 4-step first-run wizard
- Hash is /, /history, /dictionary, /settings → dashboard with sidebar nav
- No hash → floating recording pill (widget)

Widget window — frameless, transparent, alwaysOnTop, skipTaskbar, focusable: false, setIgnoreMouseEvents(true) — purely visual.
Main dashboard window — normal framed window, single instance.

Recording → transcription → paste pipeline:
1. widget.ts listens for hotkey:toggle-recording
2. MicRecorder.start() opens getUserMedia with configured micDeviceId
3. maxDurationSec safety timer auto-stops
4. On stop: window.typeless.runTranscription(buffer, mimeType, durationMs) → transcribeAudio() → pasteAtCursor()

</details>

<details>
<summary>package.json</summary>

```json
{
  "name": "OpenPud",
  "private": true,
  "version": "0.1.1",
  "type": "module",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "preview": "vite preview",
    "dist": "npm run build && electron-builder"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@types/node": "^26.1.1",
    "concurrently": "^10.0.3",
    "cross-env": "^10.1.0",
    "electron": "^43.2.0",
    "electron-builder": "^26.15.3",
    "tailwindcss": "^4.3.3",
    "typescript": "~6.0.2",
    "vite": "^8.1.1",
    "vite-plugin-electron": "^1.1.0",
    "vite-plugin-electron-renderer": "^1.0.0"
  },
  "dependencies": {
    "electron-store": "^11.0.2"
  },
  "build": {
    "appId": "com.openpud.app",
    "productName": "OpenPud",
    "directories": { "output": "release" },
    "files": ["dist/**", "dist-electron/**"],
    "win": { "target": "nsis" }
  }
}
```

</details>

---

## 🔬 Timeline & Debugging Log

| Timestamp | Event |
|---|---|
| 2026-08-23 16:40 | User submitted `/dev https://github.com/gotzastory/OpenPud` |
| 2026-08-23 16:40 | Fetched README.md, CLAUDE.md, package.json from GitHub |
| 2026-08-23 16:42 | 5-dimension scoring completed. Overall: 7.0/10 |
| 2026-08-23 16:42 | Verdict: ICEBOX — personal tool, no AG integration point |
| 2026-08-23 16:43 | User approved → executing file operations |

---

## 🔗 GBRAIN Backlinks

### related_to
- **2026-08-23 16:43** | [OpenCut Study](../Icebox/Viral%20VDO%20Editing%20(VVE)/STUB-opencut_[study]_opencut-capcut-alternative-evaluation.md) -- อีก evaluation หนึ่งของ external tool (video editing) ที่ถูก icebox เช่นกัน — pattern เดียวกัน: เครื่องมือดีแต่ไม่ fit AG pipeline
- **2026-08-23 16:43** | [HyperCut Architecture](../Active/HyperCut/V0.2.0_architecture_HyperCut_Grand_Plan.md) -- Electron desktop app architecture reference — HyperCut ก็เป็น desktop tool เหมือนกัน ใช้เทียบ pattern ได้
