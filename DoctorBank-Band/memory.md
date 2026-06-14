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
2. **Brand Consistency:** ทุก content ต้องสอดคล้องกับ Brand positioning ใน `Brand/`
3. **Quick Save อยู่ที่ root:** ใช้ `MyProjects/Quick Save/Active/DoctorBank-Band/` (ไม่ใช่ local)
4. **Version Track แยก:** เริ่ม V1.0.0 ไม่นับต่อจาก Openclaw-VPS
5. **Cold Start Protocol:** เมื่อ Focus Lock มาที่โปรเจกต์นี้ AI MUST อ่าน
   1) `AGENT_CONTEXT.md` → 2) `memory.md`
6. **Skill Dependency Audit (Anti-Git-Crash):** เมื่อเพิ่ม Skill ใหม่เข้า Skills Bridge → AI MUST อ่านเนื้อหาสกิลต้นทาง แล้วตรวจว่ามี dependency ที่ขัดกับ Project Rules หรือเปล่า ถ้ามี → สร้าง Local Override version ก่อนลิงก์
7. **Explicit Change Confirmation (Anti-Echo Question):** หลังอัพเดท artifact ตาม User feedback → Agent MUST สรุปท้ายด้วย bullet list ที่แสดง **ก่อน vs หลัง** สำหรับทุก feedback item

---

## 🕒 Changelog & Updates
- **2026-06-14:** 📝 Initialized project structure.
- **2026-06-14:** 🛡️ `/reviewchat` — Added Iron Rules (Skill Dependency Audit, Explicit Change Confirmation).
- **2026-06-14:** 🏠 Migrated to `MyProjects/` umbrella repo. Removed local skills/Quick Save (now global at root).
