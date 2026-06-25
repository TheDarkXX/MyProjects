# 🧠 DoctorBank Band — Project Memory & Context

## 🎯 Project Overview
- **Location:** `c:\My Claw\MyProjects\DoctorBank-Band\`
- **Purpose:** Brand/Business project — วางแผนสินค้า สร้างแบรนด์ ขายครบ loop
- **Owner:** Doctor Bank (Anocha) — อะชิระ รีโซลูชัน จำกัด
- **Environment:** Git (via MyProjects umbrella repo)
- **System Integration:** Hybrid Quick Save → `MyProjects/Quick Save/` + Openclaw-VPS Sync

---

## 📜 Project Rules (Iron Rules)

1. **Product-Centric Structure:** ทุกข้อมูลเฉพาะสินค้าต้องอยู่ใน `Products/[name]/`
2. **Brand Consistency:** ทุก content ต้องสอดคล้องกับ Brand positioning ใน `Brand/brand-memory.md`
3. **Quick Save อยู่ที่ root:** ใช้ `MyProjects/Quick Save/Active/DoctorBank-Band/` (ไม่ใช่ local)
4. **Version Track แยก:** เริ่ม V1.0.0 ไม่นับต่อจาก Openclaw-VPS
5. **Cold Start Protocol:** เมื่อ Focus Lock มาที่โปรเจกต์นี้ AI MUST อ่าน
   1) `AGENT_CONTEXT.md` → 2) `memory.md`
6. **Local Skills Lookup:** ถ้าเจอคำสั่งขึ้นต้นด้วย `/` ที่ไม่มีในระบบ AI MUST เปิดอ่าน `C:\My Claw\MyProjects\ag_skills_backup\AG_SKILLS_INDEX.md` เสมอ เพื่อดูว่ามี skill นี้สร้างไว้เป็นไฟล์แยกหรือไม่
7. **Skill Dependency Audit (Anti-Git-Crash):** เมื่อเพิ่ม Skill ใหม่เข้า Skills Bridge → AI MUST อ่านเนื้อหาสกิลต้นทาง แล้วตรวจว่ามี dependency ที่ขัดกับ Project Rules หรือเปล่า ถ้ามี → สร้าง Local Override version ก่อนลิงก์
8. **Explicit Change Confirmation (Anti-Echo Question):** หลังอัพเดท artifact ตาม User feedback → Agent MUST สรุปท้ายด้วย bullet list ที่แสดง **ก่อน vs หลัง** สำหรับทุก feedback item
9. **Supplement Knowledge strict Separation:** ห้ามสับสนระหว่าง "Magnesium L-Threonate" (Mg ฟอร์มบำรุงสมอง) กับ "L-Theanine" (กรดอะมิโนสร้าง Alpha Wave) เด็ดขาด DR.BANK มี "L-Theanine" แต่ **ไม่มี** "Threonate"
10. **E-Commerce Coupon Math:** การคำนวณราคาขายและกำไร (Profit/Margin) ที่มีคูปองเข้ามาเกี่ยวข้อง ให้ยึดหลัก **"Flat Discount per Order"** เสมอ เพื่อรักษา Gap ของ Decoy Pricing เอาไว้
11. **Thai Medical Ethics Compliance (Critical):** ห้ามใช้คำว่า "หมอ" "แพทย์" "โรงพยาบาล" ในการขายสินค้า ให้ใช้ Founder / Formulator เท่านั้น (ผิดประมวลจริยธรรมแพทยสภาไทย มีความเสี่ยงถอนใบประกอบวิชาชีพ)
12. **Research Citation Dose Gate:** ตรวจสอบ Dose ในสูตร vs งานวิจัยก่อนอ้างอิงทุกครั้ง ถ้าต่ำกว่าห้ามพูดว่า "สูตรเราให้ผลเหมือนงานวิจัย" ให้แนะนำเป็น Dosage ตามกรณีแทน (cross-check UL ก่อน)
13. **Evidence Citation Footnote Required:** ทุกครั้งที่ใช้ภาพ/กราฟ/ตัวเลขจากงานวิจัยในสื่อ ต้องมี footnote อ้างอิง Paper ต้นฉบับ (เช่น *Nobre et al., 2008, Asia Pac J Clin Nutr*)
14. **STRICT FORMULA & DOSAGE LOCK:** การสื่อสารทั้งหมดอ้างอิงฐาน "1 แคปซูล" เท่านั้น: Mg Complex 595mg, L-Theanine (AlphaWave) 200mg, PharmaGABA 125mg, Zinc AAC (NovoMin) 60mg (12mg elemental), B6 2mg. ห้ามหลอนใส่ Chamomile หรือ Zinc ฟอร์มอื่น
15. **VISUAL THEME - CLEAN WHITE MEDICAL:** ทุกการออกแบบต้องใช้ธีมพื้นขาว/เทาอ่อน, สีหลัก Midnight Navy, จุดเน้น Amber/Gold ห้ามใช้ Dark Mode ห้ามสร้างขวดปลอม ต้องระบุให้ใช้ "ภาพขวด Doctorbank Magnesium Night Plus" เสมอ
16. **PRODUCTION-READY PROMPT FRAMEWORK:** Prompt AI ทำภาพต้องใช้ 7 โครงสร้าง: Objective, Main message, Visual concept, Exact copy, Data/dose (ระบุ Status), Layout and composition, และ Negative instructions เสมอ
17. **FDA COMPLIANCE & SAFE COPYWRITING:** ห้ามใช้คำเคลมเสี่ยง อย. (เช่น รักษา, แก้นอนไม่หลับ, หลับทันที, ไม่มีผลข้างเคียง, ผ่าน อย. แน่นอน) ให้ใช้คำที่ปลอดภัย (สนับสนุนการพักผ่อน, ไม่ใส่เมลาโทนินสังเคราะห์, 5 สารสำคัญ)
18. **AUDIENCE-FIRST IDEATION:** ก่อนเสนอไอเดียคอนเทนต์หรือภาพบุคคล ต้องระบุ Target Audience Persona เสมอ (เช่น ผู้บริหาร, ออฟฟิศซินโดรม) ห้ามเสนอไอเดียลอยๆ โดยไม่ล็อกกลุ่มเป้าหมายที่มีกำลังซื้อ

---

## 🔗 Key Files
- Brand memory: [Brand/brand-memory.md](Brand/brand-memory.md)
- Product memory: [Products/Magnesium-Night-Plus/PRODUCT_MEMORY.md](Products/Magnesium-Night-Plus/PRODUCT_MEMORY.md)
- Product image: [Products/Magnesium-Night-Plus/product-hero.png](Products/Magnesium-Night-Plus/product-hero.png)
- Research Plan (Evidence DB): [Products/Magnesium-Night-Plus/Evidence/00_evidence-overview.md](Products/Magnesium-Night-Plus/Evidence/00_evidence-overview.md)
- 1M Battle Plan (กลยุทธ์): [Sales/3.1_Plan_1M-battle-plan.md](Sales/3.1_Plan_1M-battle-plan.md)
- Road to 1M Execution (ปฏิบัติการ): [Sales/4.1_Execution_road-to-1m-execution.md](Sales/4.1_Execution_road-to-1m-execution.md)
- Daily Action Plan (รายวัน): [Sales/Daily-Action-Plan/](Sales/Daily-Action-Plan/00-overview.md)
- GPT-Researcher AI Guide: [gpt-researcher/AI_GUIDE.md](gpt-researcher/AI_GUIDE.md)
- Local Skills Bridge: `C:\My Claw\MyProjects\ag_skills_backup\AG_SKILLS_INDEX.md`

## 🕒 Changelog & Updates
- **2026-06-14:** 📝 Initialized project structure.
- **2026-06-14:** 🛡️ `/reviewchat` — Added Iron Rules (Skill Dependency Audit, Explicit Change Confirmation).
- **2026-06-14:** 🏠 Migrated to `MyProjects/` umbrella repo. Removed local skills/Quick Save (now global at root).
- **2026-06-15:** 🔄 Major data import from Quick Upload — Brand memory, Product memory (full), product image (product-hero.png) อัปเดตแล้ว.
- **2026-06-15:** 🛡️ `/reviewchat` — Added Iron Rules 8 & 9 (Supplement Knowledge strict Separation, E-Commerce Coupon Math).
- **2026-06-23:** 🛡️ `/reviewchat` — Added Iron Rules 10-13 (Thai Medical Ethics, Research Dose Gate, Citation Footnote, Local Skills Lookup). Updated Key Files paths.
- **2026-06-24:** 🛡️ `/reviewchat` — Added Iron Rules 14-18 (Formula lock, Clean White theme, Production-Ready Prompt framework, FDA Compliance, Audience-first ideation).
