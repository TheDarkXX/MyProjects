---
name: cc
description: >-
  Claude Code Direct Engine & Handoff — สั่งรันโมเดล Anthropic Claude (Opus 5.5) ผ่าน Claude Code Engine ใน VS Code ได้โดยตรงจากแชทหลักแบบเดียวกับ /gpt พร้อมท่อ UTF-8 แท้, ระบบ Auto Effort Switching (Default: Medium, /update หรือ VDO/HyperFrames/SFX: High), Session Continuity (--resume), รองรับไฟล์ขนาดใหญ่ (--file/--out) และโหมด Handoff สลับไปคุมงานสดใน VS Code ใช้เมื่อ /cc [คำสั่ง], ส่งต่อให้ Claude, ให้ claude คิด, /cc /update
---

# 👁️‍🗨️ /cc — Claude Code Direct Engine & Unified Panel (v2.1)

ดึงพลังสมองของ **Claude Code (Opus 5.5 — มหาเทพ 👁️‍🗨️)** ผ่านบัญชี **Claude Pro ($20/เดือน)** ที่ติดตั้งอยู่ใน **Antigravity IDE (และ VS Code)** มาร่วมคิด วางแผนสถาปัตยกรรม และรันงานโค้ดลึกๆ ได้จากใน **"แชทหลัก"** ของ Antigravity ได้โดยตรง เสมือนเป็น Native Engine เช่นเดียวกับ `/gpt`!

---

## ⚡ สถาปัตยกรรม 2 โหมดการใช้งาน (All-in-One Antigravity)

```
User: /cc [โจทย์/คำสั่ง]
  │
  ├─► โหมด 1: DIRECT EXECUTION (จบในแชทหลัก เหมือน /gpt) ──► รัน node tools/cc-bridge.js
  │      ├─ ดึง Engine จาก .antigravity-ide/extensions โดยตรง (รวดเร็ว ไร้รอยต่อ)
  │      ├─ ปกติ: Opus 5.5 + Effort: MEDIUM (Default)
  │      ├─ เจองาน /update หรือตรวจแผน: Opus 5.5 + Effort: HIGH
  │      ├─ เจองาน VDO / HyperFrames / Remotion / SFX: Opus 5.5 + Effort: HIGH
  │      └─ ท่อส่ง UTF-8 Stdin: ไร้ปัญหาภาษาไทยเพี้ยน ไร้ข้อจำกัดความยาว Command Line
  │
  └─► โหมด 2: UNIFIED INTERACTIVE PANEL (คลิกแถบ Claude Code ใน AG หรือ VS Code)
         └─ เปิดแถบ Claude Code ทางขวาของ Antigravity ทำงานเคียงคู่กับ DrView ได้ในหน้าต่างเดียว ไม่ต้องสลับแอป
```

---

## ⚡ สูตรลัดเลือกโมเดล & ระดับการคิด 5 ระดับ (5-Tier Shorthand Spectrum)

ระบบรองรับระดับสมอง (Reasoning Effort) ครบทั้ง 5 ขั้นตามมาตรฐานของ Anthropic Claude Code:
- **`l`** = **Low** (คิดเร็วสุด ประหยัดเวลา)
- **`m`** = **Medium** (มาตรฐาน สมดุล)
- **`h`** = **High** (คิดลึก สถาปัตยกรรม/แก้บั๊ก)
- **`e`** = **Extra High (`xhigh`)** (คิดเจาะลึกพิเศษ งานคำนวณไทม์มิ่ง/แอนิเมชัน)
- **`x`** = **Max (`max`)** (สุดขีดความสามารถสมอง ปลดล็อกเพดาน Thinking สูงสุด)

### ตารางสูตรย่อ 2 ตัวอักษร:

| สูตรย่อ | โมเดล (Model) | ระดับสมอง (Effort) | เมื่อไหร่ควรใช้ |
|:---:|:---:|:---:|---|
| **`ol`** | **Opus 5.5** | **LOW** | อยากได้มุมมองภาพรวมของ Opus แบบด่วนพิเศษ ไม่เปลืองเวลารอนาน |
| **`om`** | **Opus 5.5** | **MEDIUM** | *(Default)* วิเคราะห์ทั่วไป, วาง Task List, ให้ความเห็นเชิงสถาปัตยกรรม |
| **`oh`** | **Opus 5.5** | **HIGH** | วางระบบใหม่, แก้บั๊กมหาโหด, งาน VVE / HyperFrames / Remotion / SFX |
| **`oe`** | **Opus 5.5** | **EXTRA HIGH** | สถาปัตยกรรมระดับจักรวาล, เช็คขอบเขตความปลอดภัยระดับองค์กร |
| **`ox`** | **Opus 5.5** | **MAX** | **พลังสูงสุด (Max Thinking):** รื้อโครงสร้างทั้งระบบ, แก้บั๊กที่แก้ไม่ตก 3 วัน |
| **`sl`** | **Sonnet** | **LOW** | ความเร็วแสง: ปั่นโค้ดเร็วสุดขีด, งาน Typo, ปรับ Format |
| **`sm`** | **Sonnet** | **MEDIUM** | **Workhorse โค้ดดิ้งประจำวัน:** เขียนฟังก์ชัน, แปลงโค้ด, Refactor รวดเร็ว |
| **`sh`** | **Sonnet** | **HIGH** | โค้ดดิ้งซับซ้อนที่ต้องการทั้งความเร็วของ Sonnet และการคิดลึกรอบคอบ |
| **`se`** | **Sonnet** | **EXTRA HIGH** | เขียนสคริปต์ขนาดใหญ่หลายโมเดลที่ต้องการความแม่นยำสูงแบบด่วน |
| **`sx`** | **Sonnet** | **MAX** | Sonnet ปลดล็อกสมองเต็มขีดสุดสำหรับโปรเจกต์โค้ดดิ้งขนาดมหึมา |

**ตัวอย่างการสั่งงาน:**
- `/cc ox รื้อสถาปัตยกรรมระบบนี้ใหม่ทั้งหมด ขอแผนแบบไร้จุดบอด` ➔ รัน **Opus 5.5 + MAX Thinking**
- `/cc oe คำนวณไทม์มิ่งเฟรม HyperFrames สำหรับคลิปนี้ให้เป๊ะ` ➔ รัน **Opus 5.5 + Extra High Thinking**
- `/cc sm เขียนฟังก์ชันแปลงเวลาเป็นภาษาไทยให้ที` ➔ รัน **Sonnet + Medium Thinking**
- `/cc oh ตรวจสอบแผนงานนี้` ➔ รัน **Opus 5.5 + High Thinking**
- `/cc วางแผนทั่วไป` *(ไม่ใส่สูตร)* ➔ รัน **Opus 5.5 + Medium Thinking** (Auto-detect)

---

## 🧠 ระดับการคิดอัตโนมัติ (Auto-Detect Fallback)

ถ้าผู้ใช้ไม่ได้ระบุ Shorthand ระบบจะตรวจจับจากเนื้อหาคำสั่ง:
- **เจองาน `/update` หรือ `ตรวจแผน`:** ปรับเป็น **Opus 5.5 + HIGH** อัตโนมัติ
- **เจองาน `vdo`, `video`, `remotion`, `hyperframe`, `ตัดต่อ`, `sfx`:** ปรับเป็น **Opus 5.5 + HIGH** อัตโนมัติ
- **งานทั่วไป:** ใช้ **Opus 5.5 + MEDIUM** เป็นค่าเริ่มต้น

---

## 🛠️ วิธีการทำงานของ Agent

### โหมดที่ 1: Direct Execution ในแชทหลัก (Default)

เมื่อ User พิมพ์ `/cc [ข้อความ]` หรือสั่ง "ให้ claude คิด...":
1. **รวบรวมบริบท (Context Assembly):**
   - รวบรวมคำถาม, ไฟล์ที่เปิดอยู่, หรือข้อมูลจากบทสนทนาปัจจุบัน
2. **รันคำสั่งผ่าน `tools/cc-bridge.js`:**
   ```bash
   node tools/cc-bridge.js --cwd "<PROJECT_ROOT>" "<PROMPT>"
   ```
   - **กรณีมีไฟล์เอกสารหรือบริบทขนาดยาว (>1,000 บรรทัด):**
     ```bash
     node tools/cc-bridge.js --cwd "<PROJECT_ROOT>" --file "<PATH_TO_FILE>" "<PROMPT>"
     ```
   - **กรณีต้องการให้บันทึกผลลัพธ์ลง Quick Save ทันที:**
     ```bash
     node tools/cc-bridge.js --cwd "<PROJECT_ROOT>" --out "<OUTPUT_QUICK_SAVE_PATH>" "<PROMPT>"
     ```
   - **กรณีสั่งงานต่อเนื่องในหัวข้อเดิม (Session Continuity):**
     ```bash
     node tools/cc-bridge.js --resume "<PROMPT>"
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

## 📋 กฎเหล็กความปลอดภัย & ข้อควรระวัง (Iron Rules)
1. **Zero Lockout & Bypass Permissions:** รันผ่านสิทธิ์ `bypassPermissions` เสมอ ห้ามปล่อยให้ติดค้าง Permission Prompt
2. **One Session One Voice:** Antigravity (Gemini Flash) คือผู้บัญชาการหน้างาน (Muscle) — Claude Code (Opus 5.5) คือเสนาธิการมองขาด (Brain)
3. **UTF-8 Pipe Integrity:** ส่งข้อความผ่าน Stdin UTF-8 เสมอ เพื่อรักษาความถูกต้องของสระและวรรณยุกต์ภาษาไทย
4. **ห้ามแก้ไฟล์ชนกัน:** ระหว่างที่ Claude Code กำลังแก้ไฟล์ใด ห้าม Antigravity เข้าไปแก้ไฟล์เดียวกันในเวลาเดียวกันเด็ดขาด
