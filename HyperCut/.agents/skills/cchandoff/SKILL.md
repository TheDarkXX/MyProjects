---
name: cchandoff
description: >-
  Claude Code Dedicated Handoff Engine — ระบบส่งต่อและรับงานระหว่าง Antigravity (Gemini Flash) กับ Claude Code ใน VS Code หรือ CLI แยกหน้าต่างแบบ Zero Context Tax ประหยัดโควตา Claude Pro 90% พร้อมฟังก์ชันแพ็ก Brief ลง Quick Save/Active, สร้างคำสั่ง 1-Liner ให้ Claude ทำงานคู่กับ Sub-Agent Flash Worker, และโหมด /cchandoff check เพื่อดึงผลงานกลับมา Verify และ Auto-Save ขึ้น VPS ใช้เมื่อ /cchandoff [หัวข้อ], ส่งงานให้ cc, สลับไปทำใน claude, /cchandoff check
---

# 🤝 /cchandoff — Claude Code Dedicated Handoff Engine (v1.0)

ระบบส่งต่อและรับช่วงงานระหว่าง **Antigravity (Gemini Flash Workhorse 🔥)** กับ **Claude Code (มหาเทพ Opus 5.5 / Sonnet 👁️‍🗨️ บนบัญชี Claude Pro $20/เดือน)** ในหน้าต่าง VS Code หรือ CLI แยกต่างหาก เพื่อประสิทธิภาพสูงสุดและ **ประหยัดโควตา 5-Hour Rolling สูงสุด 90%+ (Zero Context Tax)**!

---

## 💡 ทำไมการใช้ `/cchandoff` แยกหน้าต่างถึงประหยัดโควตากว่ารันในแชทตรง?

| มิติเปรียบเทียบ | รันตรงในแชทหลัก (`/cc`) | สลับไปแชทแยกด้วย Handoff (`/cchandoff`) ⭐ |
|---|---|---|
| **Context Tax** | แบกบทสนทนายาวใน AG (30k-100k tokens) ทุกเทิร์น | **Zero Context Tax:** Claude อ่านเฉพาะไฟล์ Brief สั้นๆ (~1.5k tokens) |
| **ความคุมได้ (Loop Control)** | รัน Autonomous Background Loop อาจวน 20-50 turns โดยไม่รู้ตัว | **Human Gate:** เห็น Claude คิดสดหน้าจอ ตัดบทหรือสั่งแก้ได้ทันทีด้วย `Ctrl+C` |
| **โควตา 5-hr Rolling** | หมดเร็วมากถ้าเจอโหมด Thinking วนลูป | **ประหยัดสุดขีด:** จบงานใน 1-3 turns เพราะ spec ชัดตั้งแต่เริ่ม |
| **การใช้ Flash Worker** | สั่งผ่าน bridge ในแชท | Claude ใน Terminal สั่ง `node tools/flash-worker.js` พิมพ์โค้ดแทนได้ลื่นไหล 100% |

---

## ⚡ สถาปัตยกรรม 2 โหมดการทำงาน (SEND & RECEIVE)

```
[ Antigravity Chat (Gemini Flash) ]
   │
   ├─► 1. ผู้ใช้พิมพ์: /cchandoff [หัวข้องาน]
   │      ├─ สแกนบริบทและสิ่งที่ต้องทำ
   │      ├─ เขียนไฟล์ Handoff Brief ใน Quick Save/Active/
   │      ├─ เปิดไฟล์ใน VS Code ด้วย DrView (code "<path>")
   │      └─ ยื่นคำสั่ง 1-Liner ให้ผู้ใช้ก๊อปไปวางใน Claude Code Terminal
   │
   ▼
[ Claude Code Terminal / VS Code (Claude Pro $20) ]
   │
   ├─► 2. ผู้ใช้วางคำสั่ง 1-Liner ใน Claude Code
   │      ├─ Claude อ่าน Brief (Objective, Target Files, Steps)
   │      ├─ Claude สั่ง node tools/flash-worker.js ช่วยพิมพ์โค้ด (ประหยัด Token)
   │      ├─ Claude ตรวจสอบผลงาน (Gate Function)
   │      └─ Claude เขียนผลลง ## 🔁 5. Handoff Result และแก้สถานะเป็น ready_for_review
   │
   ▼
[ Antigravity Chat (Gemini Flash) ]
   │
   └─► 3. ผู้ใช้กลับมาพิมพ์: /cchandoff check
          ├─ AG ตรวจจับไฟล์ ready_for_review
          ├─ ตรวจ Git diff และรัน Verification Gate
          ├─ อัปเดตสถานะเป็น completed
          └─ Auto-Save บันทึกลง Quick Save/Complete/ และ Push ขึ้น VPS
```

---

## 🛠️ ขั้นตอนการปฏิบัติการสำหรับ Agent

### โหมดที่ 1: SEND Workflow (`/cchandoff [หัวข้อ]`)

เมื่อผู้ใช้สั่ง `/cchandoff [หัวข้อ]`, "ส่งงานให้ claude", "สลับไปทำใน claude":

1. **คำนวณเวอร์ชัน & สร้างไฟล์ Handoff ใน `Quick Save/Active/`:**
   - เช็คเวอร์ชันล่าสุดใน `Quick Save/Complete/Core-VPS/`
   - ตั้งชื่อไฟล์: `Quick Save/Active/V{x.y.z}_[impl]_{component}_handoff-{topic}.md`
   - ใส่ Frontmatter บังคับ:
     ```yaml
     ---
     version: "14.x.x"
     type: impl
     status: active
     outcome: pending
     date: YYYY-MM-DD
     source: dev-agent
     tags: [claude-code, handoff, dual-agent]
     handoff_to: claude
     handoff_status: pending
     handoff_project_root: "C:\\My Claw\\<Project>"
     summary: >
       Handoff brief for Claude Code to execute <topic>.
     ---
     ```

2. **เขียนเนื้อหา Brief ให้คมชัด ไร้ Placeholder:**
   ```markdown
   # 🤝 Claude Code Handoff Brief: <Topic>

   ## 🎯 1. Objective & Architecture Decision
   - อธิบายเป้าหมายให้ชัดเจนว่าทำไมถึงทำ และผลลัพธ์ที่ต้องการคืออะไร

   ## 📂 2. Target Files & Reference Code
   - รายการไฟล์ที่ต้องเข้าไปแก้หรือสร้างใหม่ (ใส่ Absolute Link)
   - ไฟล์ตัวอย่างหรือ Reference ที่เกี่ยวข้อง

   ## ⚡ 3. Action Plan for Claude Code
   - Step 1: ...
   - Step 2: ...
   > 💡 **Quota Saving Rule:** สำหรับงานเขียน Boilerplate ยาวๆ, สร้างไฟล์ขนาดใหญ่, หรือแปลงข้อมูลซ้ำๆ ให้สั่งรัน Sub-Agent ผ่าน Terminal CLI แทนการพิมพ์เอง:
   > `node tools/flash-worker.js --code -p "<prompt>" -o "<destination_file>"`

   ## 🛡️ 4. Verification Gate
   - ระบุคำสั่งรันเทสจริง (เช่น `node scripts/test.js`, `npm run render`, หรือ `tsc`)

   ## 🔁 5. Handoff Result (Claude writes here)
   <!-- Claude Code จะมาบันทึกผลงานลงในส่วนนี้เมื่อทำเสร็จ -->
   ```

3. **เปิดไฟล์ใน VS Code & ส่งมอบคำสั่ง 1-Liner:**
   - รันคำสั่งเปิดไฟล์:
     ```bash
     code "<PATH_TO_HANDOFF_FILE>"
     ```
   - สรุปให้ผู้ใช้สั้นๆ พร้อมกล่องคำสั่ง 1-Liner ให้ก๊อปไปเคาะใน Claude Code Terminal:
     ```bash
     claude "อ่านและทำตาม <PATH_TO_HANDOFF_FILE> ทุกขั้นตอน เมื่อเสร็จแล้วให้รัน verification, บันทึกผลลงในหัวข้อ ## 🔁 5. Handoff Result และแก้ frontmatter เป็น handoff_status: ready_for_review"
     ```

---

### โหมดที่ 2: RECEIVE Workflow (`/cchandoff check`)

เมื่อผู้ใช้พิมพ์ `/cchandoff check` หรือ "ตรวจงาน claude":

1. **สแกนหาไฟล์ Handoff ใน `Quick Save/Active/`:**
   - ตรวจหาไฟล์ที่มี `handoff_to: claude` และ `handoff_status: ready_for_review` (หรือ `pending` หากผู้ใช้ลืมเปลี่ยนสถานะ)
2. **ตรวจเช็คผลงาน:**
   - อ่านหัวข้อ `## 🔁 5. Handoff Result` ที่ Claude บันทึกไว้
   - รัน `git status` และ `git diff` เพื่อตรวจสอบไฟล์ที่ถูกแก้ไขจริง
3. **รัน Verification Gate (ห้ามเชื่อลมปาก):**
   - รันคำสั่งตรวจสอบตามที่ระบุในหัวข้อที่ 4 ของ Brief ให้ผ่าน 100%
4. **ปิดรอบและ Auto-Save:**
   - แก้ไข Frontmatter:
     ```yaml
     handoff_status: completed
     outcome: shipped
     status: complete
     ```
   - ย้ายหรือบันทึกไฟล์เข้า `Quick Save/Complete/Core-VPS/`
   - รัน Git Commit และ `git push vps master` ปิดงานสมบูรณ์แบบ!

---

## 📋 กฎเหล็กความปลอดภัย (Iron Rules)

1. **Zero Context Bloat:** ไฟล์ Handoff ต้องกระชับ เฉพาะเจาะจง ห้าม copy ประวัติแชททั้งหน้าต่างลงไป
2. **Sub-Agent First:** เน้นย้ำใน Action Plan เสมอให้ Claude เรียก `node tools/flash-worker.js` ในงานถึก เพื่อประหยัดโควตา $20
3. **One Active Handoff:** ทำทีละ 1 Handoff เพื่อป้องกันการแก้ไฟล์ชนกัน
