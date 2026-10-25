---
name: cc
description: >-
  Claude Code Direct Engine & Handoff — สั่งรันโมเดล Anthropic Claude (Opus 5.5) ผ่าน Claude Code Engine ใน VS Code ได้โดยตรงจากแชทหลักแบบเดียวกับ /gpt พร้อมระบบ Auto Effort Switching (Default: Medium, /update หรือ VDO/HyperFrames/SFX: High) และโหมด Handoff สลับไปคุมงานสดใน VS Code ใช้เมื่อ /cc [คำสั่ง], ส่งต่อให้ Claude, ให้ claude คิด, /cc /update
---

# 👁️‍🗨️ /cc — Claude Code Direct Engine & Handoff

ดึงพลังสมองของ **Claude Code (Opus 5.5 — มหาเทพ 👁️‍🗨️)** ผ่านบัญชี **Claude Pro ($20/เดือน)** ที่ติดตั้งอยู่ใน VS Code มาร่วมคิด วางแผนสถาปัตยกรรม และรันงานโค้ดลึกๆ ได้จากใน **"แชทหลัก"** ของ Antigravity ได้โดยตรง เสมือนเป็น Native Engine เช่นเดียวกับ `/gpt`!

---

## ⚡ สถาปัตยกรรม 2 โหมดการใช้งาน

```
User: /cc [โจทย์/คำสั่ง]
  │
  ├─► โหมด 1: DIRECT EXECUTION (จบในแชทหลัก เหมือน /gpt) ──► รัน node tools/cc-bridge.js
  │      ├─ ปกติ: Opus 5.5 + Effort: MEDIUM (Default)
  │      ├─ เจองาน /update หรือตรวจแผน: Opus 5.5 + Effort: HIGH
  │      └─ เจองาน VDO / HyperFrames / Remotion / SFX: Opus 5.5 + Effort: HIGH
  │
  └─► โหมด 2: VS CODE HANDOFF (สำหรับงานนั่งเฝ้าหน้าจอสด) ──► เขียน Quick Save/Active/<file>.md
         └─ เปิด VS Code (มี DrView + Quota Status Bar) ทำงานร่วมกัน
```

---

## 🧠 ระดับการคิด (Dynamic Thinking / Effort Hierarchy)

Engine `tools/cc-bridge.js` จะตรวจจับประเภทงานและปรับระดับการคิด (Reasoning Effort) ให้อัตโนมัติ:

| คำสั่ง / ประเภทงาน | โมเดล | Effort | เหตุผลและจุดประสงค์ |
|---|:---:|:---:|---|
| **`/cc [โจทย์ทั่วไป]`** | Opus 5.5 | **MEDIUM** | คำถามทั่วไป, วางโครงร่าง, คิดฟังก์ชันเดี่ยว, สรุปไอเดีย (คิดไว ไม่เปลืองเวลา) |
| **`/cc /update`** หรือตรวจแผน | Opus 5.5 | **HIGH** | ตรวจสอบแผนงานเดิม, ทบทวน Architecture, หา Blind Spots และขอบเขตความเสี่ยง |
| **VDO / HyperFrames / Remotion / SFX** | Opus 5.5 | **HIGH** | งานตัดต่อ, คำนวณไทม์มิ่งเฟรม, เรนเดอร์ GSAP, มิกซ์เสียง SFX (ต้องการความแม่นยำสูง ห้ามกระตุก) |

---

## 🛠️ วิธีการทำงานของ Agent

### โหมดที่ 1: Direct Execution ในแชทหลัก (Default)

เมื่อ User พิมพ์ `/cc [ข้อความ]` หรือสั่ง "ให้ claude คิด...":
1. **รวบรวมบริบท (Context Assembly):**
   - รวบรวมคำถาม, ไฟล์ที่เปิดอยู่, หรือข้อมูลจากสนทนาปัจจุบัน
2. **รันคำสั่งผ่าน `tools/cc-bridge.js`:**
   ```bash
   node tools/cc-bridge.js --cwd "<PROJECT_ROOT>" "<PROMPT>"
   ```
   - ถ้าต้องการบังคับ effort แบบเจาะจง:
     ```bash
     node tools/cc-bridge.js --effort high --cwd "<PROJECT_ROOT>" "<PROMPT>"
     ```
3. **ส่งมอบผลลัพธ์:**
   - นำคำตอบของ Claude Code (มหาเทพ 👁️‍🗨️) มาแสดงในแชทหลักทันที
   - หากมีการสร้าง/แก้ไฟล์แผน ให้รายงานพาธและลิงก์ให้ผู้ใช้ทราบ

---

### โหมดที่ 2: VS Code Handoff (เมื่อ User ต้องการย้ายไปทำใน VS Code)

ใช้เมื่อ User สั่งชัดเจนว่า "ย้ายไปทำใน VS Code", "เปิดใน VS Code", หรือต้องการนั่งดู Terminal ทำงานสด:
1. **เขียนไฟล์ Handoff ลง `Quick Save/Active/`:**
   - บันทึก `V{x.y.z}_[type]_{component}_{desc}.md` พร้อมหัวข้อ `## 🤝 Handoff Brief` (Objective, Why, Target Files, Steps, Rules, Verification)
   - ตั้งค่า frontmatter:
     ```yaml
     handoff_to: claude
     handoff_status: pending
     handoff_project_root: "C:\\My Claw\\<Project>"
     ```
2. **สั่งเปิดไฟล์ใน VS Code ด้วย DrView ทันที:**
   ```bash
   code "<PATH_TO_QUICK_SAVE_FILE>"
   ```
3. **แจ้ง User:**
   - มอบคำสั่งสั้นๆ ให้ User นำไปเคาะในช่องแชท Claude Code ของ VS Code:
     `/cc <PATH_TO_QUICK_SAVE_FILE>`
   - User จะเห็นพรีวิว DrView ทางซ้าย และเห็น Claude ทำงานสดทางขวา

---

## 📋 กฎเหล็กความปลอดภัย (Iron Rules)
1. **Zero Lockout & Bypass Permissions:** รันผ่านสิทธิ์ `bypassPermissions` เสมอ ห้ามปล่อยให้ติดค้าง Permission Prompt
2. **One Session One Voice:** Antigravity (Gemini Flash) คือผู้บัญชาการหน้างาน (Muscle) — Claude Code (Opus 5.5) คือเสนาธิการมองขาด (Brain)
3. **ห้ามแก้ไฟล์ชนกัน:** ระหว่างที่ Claude Code กำลังแก้ไฟล์ใด ห้าม Antigravity เข้าไปแก้ไฟล์เดียวกันในเวลาเดียวกันเด็ดขาด
