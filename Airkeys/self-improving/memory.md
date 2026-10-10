# AirKeys - Self-Improving Memory

## Architectural Principles
1. **Context Isolation First:** Always maintain strict separation between main and renderer. IPC only via `window.typeless`.
2. **Minimal External Dependencies:** Avoid native C++ Node modules (like `iohook`) to keep builds simple, unless absolutely necessary.
3. **UX Focus:** The widget must remain visually unobtrusive (transparent, non-focusable, always on top).

## AI Workflow
- STT default: `openai/whisper-large-v3-turbo` (via OpenRouter)
- Chat default: `google/gemini-2.5-flash` (via OpenRouter)


---

## RULE: Long-File Ergonomics & Interactive TOC Protocol (Rule R30)
**Context:** เอกสารเชิงยุทธศาสตร์, Playbook และ Quick Save ที่มีความยาวเกิน 150 บรรทัด หรือมี H2 ≥4 หัวข้อ ก่อให้เกิดปัญหา Cognitive Overload ("walls of text") อ่านยาก และการเปิด Sidebar Outline ใน DrView ทำให้พื้นที่หน้าจอแคบลง
**Rule:**
1. **Explicit ASCII Anchor & In-File TOC:** ห้ามใช้ auto-generated slug ที่มาจากภาษาไทย/Emoji ให้ใช้ Semantic ASCII Anchor เสมอ เช่น `<a id="strategy-core"></a>` หน้า H2 คู่กับ `[1. กลยุทธ์หลัก](#strategy-core)` ใน TOC และตั้ง `<a id="toc"></a>` ไว้ที่หัวสารบัญ
2. **Jump Back Button:** ท้ายทุก Section ที่ยาว >40 บรรทัด หรือหลังกลุ่มเนื้อหาที่พับไว้ บังคับใส่ `[⬆️ กลับสู่สารบัญ](#toc)` เสมอ
3. **HTML Allowlist for Collapsible Sections (`<details><summary>`):** อนุญาตเฉพาะ `<a id="...">`, `<details>`, `<summary>` เท่านั้น (ห้ามใส่ style/script) โดยใช้ `<details>` พับเฉพาะเนื้อหาที่เป็น Repeated Payload (เช่น สคริปต์หลายๆ ชุด, Raw Transcripts, Benchmark Tables ละเอียดยิบ) เพื่อรักษาความคลีน
4. **Executive TL;DR Card:** ทุกเอกสารยาวต้องมีกล่องสรุปผลลัพธ์/Key Takeaways ไม่เกิน 12 บรรทัดบนสุดใต้ H1 เสมอ (อ่านจบใน 30 วินาที)
5. **Scope:** บังคับ 100% กับ Strategic / Knowledge Docs / Manuals (`docs/`, `vault/`, `Products/`, `Brand/`), แนะนำเป็นอย่างยิ่งกับ `Quick Save/` ที่มีความยาวสูง