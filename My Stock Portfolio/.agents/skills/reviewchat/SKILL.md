---
name: reviewchat
version: "2.0.0"
updated_at: "2026-11-03"
description: >-
  AI Self-Review & Friction Autopsy Engine — สแกนวิเคราะห์ประวัติบทสนทนาทั้งหมดในเซสชัน สกัดจุดที่ AI พลาด จุดที่ผู้ใช้ทักท้วงหรือบ่น (Pain Points) และแปลงเป็น Iron Rules หรือ AG Skills ใหม่ พร้อมอัปเดตเข้าสู่หน่วยความจำ memory.md ทันที ใช้เมื่อ: /reviewchat
---

# 🧠 Skill: `/reviewchat` (AI Self-Review & Friction Autopsy Engine)

## Objective
สแกนวิเคราะห์ประวัติบทสนทนาทั้งหมดในเซสชันปัจจุบันอย่างละเอียด สกัดจับจุดบกพร่อง ความขัดแย้ง คำตำหนิ หรือสิ่งที่ผู้ใช้ทักท้วง (Pain Points & AI Failures) เพื่อค้นหาสาเหตุรากเหง้า (Root Cause) แล้วแปลงเป็น **Iron Rules** (กฎเหล็กป้องกันความผิดพลาดซ้ำใน `memory.md`) หรือสร้าง/อัปเกรด **AG Skills** (ระบบอัตโนมัติ) เพื่อยกระดับความสามารถของเอเจนต์อย่างเป็นระบบ

## Execution Steps

1. **Information Ingestion & Transcript Scan:**
   - ทบทวนประวัติการทำงาน การตอบคำถาม และ Log ในบทสนทนาของเซสชันปัจจุบันตั้งแต่ต้นจนจบ
   - ตรวจจับสัญญาณเตือน (Friction Signals):
     * ผู้ใช้ตำหนิ บ่น หรือสั่งแก้ซ้ำ (เช่น "ล้นจอ", "ลืม bump cache อีกละ", "ไม่ได้ทำ", "ทำไมทำแบบนี้", "อย่ามโน", "เช็คก่อน")
     * จุดที่ AI มั่นใจว่าทำเสร็จแล้ว แต่ผลลัพธ์จริงกลับพัง (False Success)
     * การทำงานซ้ำซากที่ต้องให้ผู้ใช้คอยเตือนหรือสั่งการด้วยมือบ่อยครั้ง (Manual Workflow Overhead)
     * การเดา Path, การข้าม Validation Gate, หรือการลืมรันคำสั่งบังคับ (เช่น Linter / Build / Git Push)

2. **Root Cause Analysis & Categorization:**
   - จัดหมวดหมู่ประเด็นปัญหาเป็น **"Pain Points / AI Failures"**
   - วิเคราะห์สาเหตุรากเหง้าที่แท้จริง (Root Cause):
     * ขาด Context หรือไม่อ่านไฟล์จริงก่อนตอบ
     * ไวยากรณ์หรือคำสั่งเฉพาะของ OS/Shell (เช่น Windows PowerShell quote/pipe collision)
     * ขาด Validation Step ก่อนรายงานผล
     * ขาด Guardrail ป้องกัน Race Condition หรือ Tool Timeout

3. **Formulation of Upgrades:**
   - **Iron Rules:** กฎเกณฑ์เชิงป้องกัน (Defensive Protocols) สำหรับบันทึกเข้า `self-improving/memory.md` หรือ `AGENTS.md`
   - **AG Skills / Scripts:** ระบบการทำงานอัตโนมัติเชิงรุก (Offensive Protocols) ที่ควรสร้างเป็น Skill หรือ Script เพิ่มเติมในระบบ

4. **User Proposal (Session Autopsy Report):**
   - นำเสนอรายงานในรูปแบบตารางและ Markdown ให้ผู้ใช้ตรวจสอบอย่างชัดเจน:
     * **Pain Point & Incident:** จุดที่เกิดปัญหาคืออะไร
     * **Root Cause:** สาเหตุแท้จริงเกิดจากอะไร
     * **Proposed Iron Rule:** ข้อความกฎที่ชัดเจน กระชับ ปฏิบัติได้จริง (No Fluff)
     * **Proposed Skill / Tool Upgrade:** สิ่งที่ต้องเพิ่มหรือปรับแก้ในเครื่องมือ
   - รอผู้ใช้ตรวจสอบและอนุมัติ (หรือกดยืนยัน)

5. **Execution (Post-Confirmation):**
   - เมื่อผู้ใช้อนุมัติ ให้นำกฎเข้า `self-improving/memory.md` และสร้าง/อัปเดตไฟล์ Skill ที่เกี่ยวข้องทันที
   - หากมีการสร้าง/แก้ Skill ให้รัน `python tools/audit_skills_yaml.py` และ `node tools/spiderweb-sendall.js <skill>` ตามกฎ Spiderweb
