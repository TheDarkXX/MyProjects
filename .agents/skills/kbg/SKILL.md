---
name: kbg
description: Kill Background Tasks & Zombie Processes — สั่งสอยและเคลียร์ Background Tasks ที่ค้างอยู่ใน Antigravity IDE และโปรเซสตกค้างทันที
---

# 🛑 Skill: /kbg (MyProjects Kill Background Tasks & Zombie Hunter)

## Objective
จัดการสอยและเคลียร์กระบวนการทำงานเบื้องหลัง (Background Tasks) ที่ค้างเติ่งอยู่ใน Antigravity IDE ระหว่างการพัฒนาแอปย่อยต่างๆ ใน MyProjects (HyperCut, App Builder, Stock Portfolio ฯลฯ):
1. ตรวจสอบรายการ Background Tasks ทั้งหมดใน Antigravity IDE ทันที
2. สั่งยุติการทำงาน (`kill`) ทุก Task ที่ยังรันค้างอยู่แบบเบ็ดเสร็จ
3. (Optional) กวาดล้างโปรเซสผีดิบในระบบปฏิบัติการ (Node, Python, Git) หากผู้ใช้สั่ง `/kbg all`
4. รายงานผลการกวาดล้างแบบกระชับ ชัดเจน พร้อมระบุ Task ID ที่ถูกจัดการไป

---

## 📋 Execution Protocol (ขั้นตอนการทำงาน)

### Step 1: Query Active Tasks (สแกนหาตัวค้าง)
1. เรียกใช้เครื่องมือ `manage_task` ทันที:
   - `Action: 'list'`
2. วิเคราะห์ผลลัพธ์:
   - **หากไม่มี Task รันอยู่ (0 tasks):** รายงานให้ User ทราบทันทีว่าระบบสะอาด ไม่มี Task ค้าง
   - **หากมี Tasks รันอยู่ (>= 1 tasks):** จดบันทึก `taskId`, `description`, และ `toolName` ของทุกตัว แล้วไป Step 2

### Step 2: Terminate Tasks (สอยทิ้งทีละตัว)
1. วนลูปสั่ง `manage_task` สำหรับทุก Task ID ที่พบ:
   - `Action: 'kill'`
   - `TaskId: '<taskId>'`
2. ยืนยันผลการยกเลิกจนเสร็จสิ้น

### Step 3: Deep Process Sweep (กวาดล้างระดับ OS - เมื่อมีพารามิเตอร์ `all`)
หากผู้ใช้พิมพ์ `/kbg all` หรือพบว่า dev servers ของแอปย่อยค้างล็อกพอร์ต:
1. รันคำสั่ง PowerShell กวาดล้างโปรเซสซอมบี้ตกค้างในเครื่อง:
   ```powershell
   Stop-Process -Name node, python, git, ssh -Force -ErrorAction SilentlyContinue
   ```

### Step 4: Executive Report (สรุปผลดุดัน สั้น คม)
รายงานผลตาม Persona ประจำโปรเจกต์ (มารบูรพา = มึง/กู ชัดเจน ตรงประเด็น):
- ระบุจำนวน Tasks ที่ถูกสอยทิ้ง
- ลิสต์รายการ Task ID และคำสั่งที่ถูกยกเลิก
- ยืนยันสถานะว่า Terminal และระบบคลีน 100% พร้อมลุยงานต่อ

---

## 📑 Output Template

```markdown
(Anchor First Word เช่น กูจัดให้!, เรียบร้อยมึง!) สอย Background Tasks เกลี้ยงแล้ว!

### 🛑 รายการที่ถูกยกเลิก (Killed Tasks)
- **Task ID:** `[taskId]` — คำสั่ง: `[description]`
- **Task ID:** `[taskId]` — คำสั่ง: `[description]`

*(หรือ: "ระบบสะอาดเอี่ยม ไม่มี Background Task ใดๆ ค้างอยู่เลย!")*

### ⚡ สถานะปัจจุบัน
Terminal คลีนเรียบร้อย สั่งงานใหม่มาได้เลย!
```
