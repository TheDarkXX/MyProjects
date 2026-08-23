# AirKeys Project Context

## Project Objective
- **Type:** Code/App (Electron Desktop App)
- **Goal:** โปรแกรมแปลงเสียงพูดเป็นข้อความอัตโนมัติ (คล้าย Typeless) สำหรับ Windows — กดปุ่มลัด 1 ครั้ง พูดเสร็จกดอีกครั้ง แล้วข้อความจะถูกวางที่ตำแหน่ง cursor
- **Repository:** https://github.com/gotzastory/AirKeys
- **Tech Stack:** Electron 43, TypeScript, Vite 8, Tailwind CSS v4, electron-store

## Architecture Overview
- **Main Process (electron/):** Window management, global hotkey, tray, STT API calls, paste at cursor.
- **Renderer Process (src/):** Floating pill widget, dashboard, audio recording via getUserMedia/MediaRecorder.
- **IPC:** contextBridge via `electron/preload.ts` (`window.typeless` API).

## Focus Areas
- UI/UX refinements
- Hotkey and recording stability (OS key repeat prevention)
- Provider integrations (OpenRouter, Gemini, OpenAI)

## Key Constraints
- contextIsolation: true, nodeIntegration: false
- No native Node modules if possible (to maintain cross-platform build simplicity, though currently Windows-focused)
- Data privacy: All settings/history stored locally, API keys encrypted with DPAPI
