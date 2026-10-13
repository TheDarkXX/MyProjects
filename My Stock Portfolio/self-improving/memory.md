# Project Memory

This file automatically stores extracted rules and context for this specific project.

## General Rules
- **Mandatory Instant Auto-Deploy Pipeline:** Whenever any code is modified in `My Stock Portfolio`, you MUST immediately execute the full deploy pipeline in the same turn without waiting for user commands: `npm run build` -> `node bump-cache.js` -> `git commit & push origin master` -> `scp -r dist/* root@185.250.38.247:/root/stock-portfolio/dist/` -> `ssh root@185.250.38.247 "pm2 reload stock-api"`.


---

## RULE: Long-File Ergonomics & Interactive TOC Protocol (Rule R30)
**Context:** เอกสารเชิงยุทธศาสตร์, Playbook และ Quick Save ที่มีความยาวเกิน 150 บรรทัด หรือมี H2 ≥4 หัวข้อ ก่อให้เกิดปัญหา Cognitive Overload ("walls of text") อ่านยาก และการเปิด Sidebar Outline ใน DrView ทำให้พื้นที่หน้าจอแคบลง
**Rule:**
1. **Explicit ASCII Anchor & In-File TOC:** ห้ามใช้ auto-generated slug ที่มาจากภาษาไทย/Emoji ให้ใช้ Semantic ASCII Anchor เสมอ เช่น `<a id="strategy-core"></a>` หน้า H2 คู่กับ `[1. กลยุทธ์หลัก](#strategy-core)` ใน TOC และตั้ง `<a id="toc"></a>` ไว้ที่หัวสารบัญ
2. **Jump Back Button:** ท้ายทุก Section ที่ยาว >40 บรรทัด หรือหลังกลุ่มเนื้อหาที่พับไว้ บังคับใส่ `[⬆️ กลับสู่สารบัญ](#toc)` เสมอ
3. **HTML Allowlist for Collapsible Sections (`<details><summary>`):** อนุญาตเฉพาะ `<a id="...">`, `<details>`, `<summary>` เท่านั้น (ห้ามใส่ style/script) โดยใช้ `<details>` พับเฉพาะเนื้อหาที่เป็น Repeated Payload (เช่น สคริปต์หลายๆ ชุด, Raw Transcripts, Benchmark Tables ละเอียดยิบ) เพื่อรักษาความคลีน
4. **Executive TL;DR Card:** ทุกเอกสารยาวต้องมีกล่องสรุปผลลัพธ์/Key Takeaways ไม่เกิน 12 บรรทัดบนสุดใต้ H1 เสมอ (อ่านจบใน 30 วินาที)
5. **Scope:** บังคับ 100% กับ Strategic / Knowledge Docs / Manuals (`docs/`, `vault/`, `Products/`, `Brand/`), แนะนำเป็นอย่างยิ่งกับ `Quick Save/` ที่มีความยาวสูง