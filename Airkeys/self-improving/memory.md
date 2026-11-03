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
## RULE: 3-Tier Rule Governance & Human Gate Protocol
**Context:** ซิงก์กฎข้ามโปรเจกต์มั่วๆ ทำให้เกิด Context Poisoning (เช่น เอากฎตัดคลิปไปใส่ในเว็บหุ้น) ทำให้ AI มึนและเปลืองโทเคน
**Core Rules:**
1. **3-Tier Separation (แบ่งชั้นกฎ 3 ระดับ):**
   - **Tier 1 (Global System):** สัจธรรมสากลใช้ได้ทุกงาน (เช่น Markdown Rule R30, UTF-8 บน Windows, Git Root Hygiene, `/cc` Claude handoff) ➔ ศูนย์กลางคือ `XBrain` และซิงก์ด้วย Spiderweb
   - **Tier 2 (Domain Cluster):** เฉพาะสายพันธุ์งาน (เช่น เทคนิคตัดต่อ/Pacing 150 ตัวอักษรสำหรับ Content/Video; CSS Design Tokens/Cache-Busting สำหรับ Web App) ➔ แชร์เฉพาะโหนดในคลัสเตอร์
   - **Tier 3 (Local Private Memory):** เฉพาะตัวแอป (เช่น LightCraft Highlights/Whites GPU Pipeline, สูตรอาหารเสริม DoctorBank) ➔ ห้ามซิงก์ออกนอกโฟลเดอร์เด็ดขาด
2. **Human Gate Protocol (ห้ามบอทบรอดแคสต์เอง):**
   - ก่อนจะยิงกฎระดับ Global (Tier 1) กระจายสู่ระบบ Spiderweb เอเจนต์ต้องถามบอส 1 บรรทัดในแชทเสมอ:
     > *"บอส กฎเรื่อง [X] เข้าข่าย Tier 1 Global ขอยัดเข้า XBrain แล้วยิง Spiderweb เลยนะ?"*
   - เมื่อบอสเคาะ *"จัดไป"* หรือ *"โอเค"* จึงรันสคริปต์บรอดแคสต์


## RULE: Clickable Image & Asset Reference Links Protocol (Rule R36)
**Context:** การระบุชื่อไฟล์รูปภาพ, ปก, สไลด์, สตอรี่บอร์ด หรือ Assets ในแชทหรือเอกสารสรุปงานเป็นแค่ข้อความตัวเปล่าๆ หรือใส่ในโค้ดบล็อก ทำให้ผู้ใช้ต้องเสียเวลาไปเปิดโฟลเดอร์ ค้นหา path เองทีละไฟล์ ก่อให้เกิด Friction และ Cognitive Overhead
**Core Rule:**
1. **Mandatory Clickable Links:** ทุกครั้งที่มีการอ้างอิงภาพในข้อความสนทนา หรือในรายงาน Markdown ต้องทำเป็น Markdown Link ที่คลิกได้เสมอ: `[ชื่อไฟล์หรือคำอธิบาย](file:///C:/path/to/image.png)`
2. **Path Standard:** ใช้ Absolute Path เสมอ เริ่มต้นด้วย `file:///C:/...` เปลี่ยน Backslash (`\`) เป็น Forward Slash (`/`) และแทนช่องว่างด้วย `%20`
3. **No Plain Filenames:** ห้ามเขียนแค่ชื่อไฟล์ตัวเปล่าๆ หรือในบล็อกโค้ดโดยไม่มีลิงก์เด็ดขาด



---

## RULE: Zero-Chat-Image & One-Click DrView Protocol (Rule R37)
**Context:** การเรนเดอร์รูปภาพในแชท IDE มีปัญหาจุกจิกเรื้อรัง (ภาพล้นจอ, ขยายเต็ม 100% Width, พิกเซลแตกเมื่อย่อขนาด, แชทกระตุก) ในขณะที่หน้าต่างตรงกลาง (DrView / Main Editor / Studio Inspector) มีฟังก์ชันซูม แพน เทียบภาพ และคีย์ลัดที่สมบูรณ์แบบกว่า
**Core Rules:**
1. **No Inline Chat Images (ห้ามส่งรูปเข้ามาในแชท 100%):** เลิกแปะรูปภาพเข้ามาเรนเดอร์ในกล่องแชทโดยเด็ดขาด เพื่อรักษาความคลีน เบาสบายตา และไม่กินพื้นที่แชท
2. **One-Click DrView / Main Viewport Links:** เมื่อมีรูปภาพใหม่ให้ผู้ใช้ตรวจ ให้ส่งเฉพาะ **Clickable Links** ที่ชัดเจน เช่น `👉 [🔍 เปิดตรวจ Candidate ใน DrView / Main Editor (Full 8K)](file:///path/to/image.png)` ผู้ใช้คลิกปุ๊บ ภาพจะเด้งเปิดขึ้นมาในหน้าต่าง Editor หลักตรงกลาง (Main Viewport) ทันที คมกริบ 100% ซูมดูได้เต็มตา
3. **Studio Inspector Companion:** แนบลิงก์ `[🖥️ เปิดตรวจใน Studio Inspector (Port 4777)](http://127.0.0.1:4777/)` ควบคู่กันเสมอ สำหรับการตรวจเทียบหลายภาพและกด Hotkey (1-6, A/D, Z, S, Space)
