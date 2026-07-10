# 🧠 Memory: Viral VDO Editing (VVE)

## 📌 Core Identity
- **Project Name:** Viral VDO Editing (VVE)
- **Role:** AI Video Editing App / Automation Tool

## 🛑 Project Specific Rules (Iron Rules)
1. **Preserve Original Data:** ระมัดระวังห้ามเขียนทับข้อมูลเดิมหรือทำให้ข้อมูลสูญหาย (Rule added by Boss)

**[Architectural & Workflow Iron Rules]**
2. **CapCut Process Guard (VVE Failsafe):** ก่อนจะปรับแก้ไฟล์ของ CapCut ต้องป้องกันปัญหา File Locks หรือถูก Auto-Save เขียนทับเสมอ
   - **เมื่อไหร่ที่ต้องใช้:** ทุกครั้งก่อนใช้ `capcut-cli` หรือรันสคริปต์ Python ที่เขียน/แก้ไขไฟล์ `draft_content.json` โดยตรง
   - **วิธีใช้งาน:** ต้องรันคำสั่ง `python scripts/force_close_capcut.py` เป็นขั้นตอนแรกสุดเสมอ เพื่อ Kill Process ตระกูล CapCut/JianYing เบื้องหลังให้เกลี้ยง 100%
3. **Path Verification:** ต้องอ่านไฟล์ `AGENT_CONTEXT.md` เป็นหลักเสมอ ห้ามเดา Path จากโฟลเดอร์ชั่วคราว (เช่น `Quick Save\Complete\`)
4. **No Skip (User Validation):** หลังยิง SRT หรือจบ Phase สำคัญ ต้องรอ User ยืนยันความถูกต้องใน CapCut ก่อนเดินหน้าไป Phase ถัดไปเสมอ
5. **AI Refiner สำหรับคลิปสั้น:** ห้ามพึ่ง PyThaiNLP ตัดซับไทเทิลอย่างเดียว ต้องใช้ระบบ AI Refiner (AG/LLM) กรองตาม `references/masterprompt_subtitle_segmentation.md` เสมอ
6. **Lesson Learned Loop:** เมื่อ User แนะนำการตั้งค่าใหม่ (เช่น รูปแบบตัวเลข, การรวมคำ) ต้องจดบันทึกเข้า Master Prompt Reference ทันที

**[Technical Pipeline Iron Rules]**
7. **Strict Transcription Pipeline:** ต้องใช้ **ElevenLabs Scribe v2** สำหรับถอดเสียงเท่านั้น ห้ามใช้ Whisper เพื่อรักษาความแม่นยำระดับ Character-level
8. **Process on CUT Audio Only:** การทำงานทั้งหมด (ถอดเสียง/สร้างซับ) ต้องทำบนไฟล์เสียงที่ผ่านการตัดเงียบ (Timebolt) แล้วเท่านั้น ห้ามใช้ไฟล์เสียงดิบ
9. **Subtitle Overlap Prevention:** Script แปลง SRT ต้องบังคับใช้ `strict zero-overlap` เสมอ ห้ามปล่อยให้เวลาซับเกยกันจนเกิดบั๊กซ้อนกันใน CapCut
10. **Resilient Alignment:** Script ทาบเวลา (`03b-align-ai.py`) ต้องมีกลไกข้ามคำที่สะกดผิด (Fuzzy Match) ห้ามหยุดทำงานหรือตัดซับทิ้งเพียงเพราะเจออักษรไม่ตรงกัน 1-2 คำ
11. **Unicode Enforcement:** การอ่าน/เขียน JSON ภาษาไทยใน Python ต้องใส่ `encoding="utf-8"` และ `ensure_ascii=False` เสมอ เพื่อกันปัญหา Mojibake
12. **SRT Import Fallback (Plan B):** ต้องสร้างไฟล์ `.srt` เซฟทิ้งไว้ในโฟลเดอร์ต้นทางของวิดีโอ (ทำหน้าที่เป็น Asset folder ของคลิปนั้น) เสมอ เพื่อให้ User สามารถลากไฟล์เข้า CapCut ได้ด้วยตัวเอง หากระบบ Injection โดน CapCut Auto-Save เซฟทับ
13. **The Base Master Principle:** ห้ามมองว่า Pipeline เป็นการ Modify ต่อกันเป็นทอดๆ (Sequential Chain) การ Apply Cuts (04b) หรือขยับ Timeline จะต้องดึง `step_01b` กลับมาเป็น Immutable Base Master ใหม่ทุกครั้ง ห้ามดัดแปลงไฟล์จากสเตปก่อนหน้า (06) ซ้ำซ้อนเพื่อป้องกันบัคสะสม
14. **Viral Subtitle Pacing:** ซับไตเติ้ลสำหรับ Viral Video ต้องสั้นกระชับ โดยมีกฎคือ "หลักๆ 3 คำ และห้ามเกิน 4 คำต่อซับ" (เช่น 'ใครที่เริ่ม', 'มีปัญหา') โดยต้องไม่ตัดฉีกคำ
15. **Subtitle Timestamp Integrity:** ห้ามใช้ AEA (Audio Energy Analysis) ในการพยายามหดหาง (Trailing Silence) ของซับไตเติ้ลให้แนบสนิท เพราะเสียงพูดมี Micro-valleys ทำให้ซับตัดหายกลางคำได้ ให้ยอมรับการที่ STT ลากหาง timestamp เล็กน้อย

## 📝 Ongoing Context / Notes
- อยู่ระหว่างเตรียมรัน Phase 5: Scene & B-Roll Generator (ใช้ AI ปั้น Prompt 8 Categories จาก `doctorbank_masterprompt.yaml`)