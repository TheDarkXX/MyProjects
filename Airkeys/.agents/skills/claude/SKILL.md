---
name: claude
description: >-
  Dual-Agent Handoff Orchestrator — แพ็กบริบท สถาปัตยกรรม และแผนงานจาก Antigravity
  เพื่อส่งต่อไปให้ Claude Code CLI (Claude Pro $20) หรือ Claude Desktop ลงมือทำต่ออย่างไร้รอยต่อ
  พร้อมสร้างคำสั่ง 1-line copy-paste รันได้ทันที
---

# 🤝 /claude — Dual-Agent Handoff Orchestrator

สกิลสำหรับส่งไม้ต่อระหว่าง **Antigravity (ผู้วางแผน / สถาปัตยกรรม)** ไปยัง **Claude Code CLI หรือ Claude Desktop (ผู้ลงมือทำ / โควต้า Pro $20)**

---

## 🎯 เมื่อไหร่ที่ควรใช้
- มึงคุย วางแผน หรือคิดไอเดียกับ Antigravity เสร็จแล้ว อยากให้ Claude เอาโควต้า Pro $20 ไปลุยโค้ดต่อ
- งานโค้ดยากๆ หรือไฟล์ใหญ่ เช่น HyperFrames GSAP, Remotion, Refactor โครงสร้างข้ามโมดูล
- สั่งผ่าน: `/claude [ชื่องานหรือคำสั่งที่ต้องการส่งต่อ]`

---

## 🛠️ ขั้นตอนการทำงานของ Agent (SOP)

### 1. รวบรวมบริบทและวิเคราะห์เป้าหมาย (Gather Context)
- ตรวจสอบว่างานนี้อยู่ในโปรเจกต์ใดของ Spiderweb Mesh (`C:\XBrain\docs\PROJECT_INDEX_SPIDERWEB.md`)
- ดึงไฟล์ที่เกี่ยวข้อง (Files to inspect/modify) พร้อมเลขบรรทัดหรือจุดสำคัญ

### 2. สร้างไฟล์แผนงานใน Quick Save (Zero Context Loss)
- สร้างไฟล์แผนงานที่ `Quick Save/Active/` ของโปรเจกต์นั้น โดยใช้รูปแบบ:
  `V{x.y.z}_[plan]_{component}_{desc}.md`
- บรรจุเนื้อหาครบถ้วน 100%:
  - **Objective:** สิ่งที่ต้องทำ และผลลัพธ์ที่คาดหวัง
  - **Context & Decisions:** เหตุผลทางสถาปัตยกรรมที่เพิ่งคุยกับ User
  - **Target Files:** Path ไฟล์แบบ Absolute Link
  - **Step-by-Step Task List:** รายการขั้นตอนการโค้ดอย่างละเอียด (พร้อม Code Snippet ตัวอย่าง ห้ามมี Placeholder)
  - **Verification:** คำสั่งสำหรับตรวจสอบความถูกต้อง

### 3. ส่งมอบ 1-Line Handoff Command ให้ User
- แสดงการสรุปสั้นๆ ให้ User ทราบว่าแผนถูกเซฟไว้ที่ไหน
- แสดงคำสั่งบรรทัดเดียวสำหรับก๊อปปี้ไปวางใน Claude Code / Claude Desktop:

```text
อ่านแผนงานในไฟล์ <path-to-quick-save> แล้วลงมือปฏิบัติตามขั้นตอนที่ระบุให้ครบถ้วน จากนั้นตรวจสอบผลลัพธ์
```

- เตือน User ให้ปิดแท็บไฟล์ที่เกี่ยวข้องใน IDE ก่อนเริ่ม เพื่อป้องกันปัญหาไฟล์ชนกัน
