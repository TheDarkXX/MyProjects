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
6. **Skill Dependency Audit (Anti-Git-Crash):** เมื่อเพิ่ม Skill ใหม่เข้า Skills Bridge → AI MUST อ่านเนื้อหาสกิลต้นทาง แล้วตรวจว่ามี dependency ที่ขัดกับ Project Rules หรือเปล่า ถ้ามี → สร้าง Local Override version ก่อนลิงก์
7. **Explicit Change Confirmation (Anti-Echo Question):** หลังอัพเดท artifact ตาม User feedback → Agent MUST สรุปท้ายด้วย bullet list ที่แสดง **ก่อน vs หลัง** สำหรับทุก feedback item
8. **Supplement Knowledge strict Separation:** ห้ามสับสนระหว่าง "Magnesium L-Threonate" (Mg ฟอร์มบำรุงสมอง) กับ "L-Theanine" (กรดอะมิโนสร้าง Alpha Wave) เด็ดขาด DR.BANK มี "L-Theanine" แต่ **ไม่มี** "Threonate"
9. **E-Commerce Coupon Math:** การคำนวณราคาขายและกำไร (Profit/Margin) ที่มีคูปองเข้ามาเกี่ยวข้อง ให้ยึดหลัก **"Flat Discount per Order"** เสมอ เพื่อรักษา Gap ของ Decoy Pricing เอาไว้

---

## 🔗 Key Files
- Brand memory: [Brand/brand-memory.md](Brand/brand-memory.md)
- Product memory: [Products/Magnesium-Night-Plus/PRODUCT_MEMORY.md](Products/Magnesium-Night-Plus/PRODUCT_MEMORY.md)
- Product image: [Products/Magnesium-Night-Plus/product-hero.png](Products/Magnesium-Night-Plus/product-hero.png)
- 1M Battle Plan (กลยุทธ์): [Sales/1M-battle-plan.md](Sales/1M-battle-plan.md)
- Road to 1M Execution (ปฏิบัติการ): [Sales/road-to-1m-execution.md](Sales/road-to-1m-execution.md)

## 🕒 Changelog & Updates
- **2026-06-14:** 📝 Initialized project structure.
- **2026-06-14:** 🛡️ `/reviewchat` — Added Iron Rules (Skill Dependency Audit, Explicit Change Confirmation).
- **2026-06-14:** 🏠 Migrated to `MyProjects/` umbrella repo. Removed local skills/Quick Save (now global at root).
- **2026-06-15:** 🔄 Major data import from Quick Upload — Brand memory, Product memory (full), product image (product-hero.png) อัปเดตแล้ว.
- **2026-06-15:** 🛡️ `/reviewchat` — Added Iron Rules 8 & 9 (Supplement Knowledge strict Separation, E-Commerce Coupon Math).
