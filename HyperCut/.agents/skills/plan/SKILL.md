---
name: plan
description: Masterpiece Implementation Plan Engine — สกิลวางแผนงานสถาปัตยกรรมระดับ Production Grade พร้อม Fact-Based Quality Gate รองรับ 3 โหมด: (1) Flash Plan (Rapid Surveyor กวาดไฟล์จริงใน 15 วิ), (2) Opus Masterplan (มหาเทพ 👁️‍🗨️ ไม้เดียวจบด้วย Evidence Ledger & Decision Matrix), และ (3) GPT Sol Plan (/plan sol ดึงพลัง Senior Architect ผ่าน MCP ฟรี 100%) บังคับ Evidence Ledger, Non-Goals, Data Contract, Rollback Plan และ Verification Gate ที่มีอยู่จริงก่อนลงมือโค้ด ใช้เมื่อ: /plan [โจทย์] หรือ /plan sol [โจทย์] หรือ /plan opus [โจทย์]
---

# 🧠 Skill: `/plan` (Masterpiece Implementation Plan Engine)

## 📌 วัตถุประสงค์
หยุดปัญหา "แผนลอย แผนมโน คำสั่งเทสไม่มีอยู่จริง สโคปบวม และบั๊กระเบิดทีหลัง" สกิลนี้คือ **เครื่องจักรวางแผนงานแบบฉลาดรู้โมเดล (Fact-Based & Model-Aware)** ที่บังคับใช้ **Evidence Ledger** (แยกความจริงที่ตรวจแล้วออกจากสมมติฐาน) และผ่าน **Plan Quality Gate** ก่อนส่งมอบแผนให้ผู้ใช้อนุมัติเสมอ

---

## ⚡ 3 โหมดการทำงาน (Triple-Engine Architecture)

```
                              User สั่ง: /plan [โจทย์]
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
   [Mode 1: Flash Plan ⚡]       [Mode 2: Opus Masterplan 👁️‍🗨️]    [Mode 3: GPT Sol Plan 🧠]
  (รันบน Gemini 3.8 Flash)          (รันบน Claude / Opus 4.6)        (พิมพ์ /plan sol ในแชทใดก็ได้)
            │                             │                             │
    • ขุดไฟล์ด้วย ripgrep         • ตาเทพ (Architect's Eye)     • รันผ่าน Codex MCP ฟรี 100%
    • หา Path จริง (file:///)     • ผ่าตัด Root Cause ลึกสุดขั้ว  • ผสาน 4-Layer Context + Dual Fallback
    • สร้าง Evidence Ledger       • วาง Decision Matrix ครบสูตร • ปล่อย Sol คิดระดับ High (60-90s)
    • ร่างโครงร่าง 85% ใน 15 วิ    • ดัก Failure Modes & Rollback• สถาปัตยกรรมระดับ Senior Architect
            │                             │                             │
            ▼                             ▼                             ▼
   ได้ร่างมาตรฐาน 85%                แผนสมบูรณ์แบบระดับเทพ              แผนคมกริบไร้รอยต่อ
 (ส่งต่อ /update หากซับซ้อน)       (ไม้เดียวจบ ไม่ต้องตรวจซ้ำ)       (ไม่ต้องสลับโมเดลใน IDE)
            │                             │                             │
            └─────────────────────────────┴─────────────────────────────┘
                                          │
                                          ▼
                       [ผ่าน Plan Quality Gate 5 ข้อ]
                                          │
                                          ▼
                [บันทึกลง implementation_plan.md และแจ้ง User ตรวจสอบ]
```

---

## 🛠️ รายละเอียดการทำงานของแต่ละโหมด

### 🟢 Mode 1: Flash Plan (The Rapid Surveyor — ค่าเริ่มต้นบน Gemini Flash)
- **จุดเด่น:** รวดเร็ว 15–20 วินาที กวาดไฟล์จริงด้วย `grep_search` และ `list_dir` ใน 0ms
- **สิ่งที่ต้องทำ:**
  1. สแกนหาไฟล์ที่มีอยู่จริงในโปรเจกต์ ห้ามเดาหรือมโน Path เองเด็ดขาด
  2. ใส่ Clickable Links รูปแบบ `[ชื่อไฟล์](file:///absolute/path/to/file)` เสมอ
  3. บันทึก **Evidence Ledger** แยกสิ่งที่มีอยู่จริง vs สิ่งที่คาดเดา
  4. บันทึก **Non-Goals** ดักสโคปบวม
  5. หากงานมีความซับซ้อนสูง (แตะไฟล์ > 3 ไฟล์ หรือกระทบ Data Schema) ให้แนบคำแนะนำ:
     `> 💡 งานนี้มีความซับซ้อน สามารถพิมพ์ /update เพื่อให้ GPT Sol หรือ Opus ช่วย Hardening สถาปัตยกรรมได้`

### 🔵 Mode 2: Opus Masterplan (The Supreme Architect — เมื่ออยู่บน Claude / Opus 4.6)
- **จุดเด่น:** สายตาเทวโลก (The Architect's Eye) **"ไม้เดียวจบสมบูรณ์แบบ 100%"**
- **สิ่งที่ต้องทำ:**
  1. สวมบทบาท **"มหาเทพ 👁️‍🗨️"** ตามกฎใน `AGENTS.md`
  2. ชำแหละ **Root Cause (สาเหตุรากเหง้า)** โดยอ้างอิงหลักฐานจริงจาก Evidence Ledger
  3. สร้าง **Decision Matrix (สิ่งที่ต้อง REUSE vs BUILD NEW)** ป้องกันการเขียนโค้ดทับซ้อน
  4. วิเคราะห์ **Blast Radius & Regression** ป้องกันไม่ให้โค้ดใหม่ไปกระทบส่วนเดิม (เช่น Desktop พังเพราะแก้ Mobile)
  5. วาง **Data Contracts, Migration & Rollback Strategy** ชัดเจน
  6. ออกแบบการดัก **Failure Modes & Edge Cases** (Timeout, Network Drop, Null State, Data Duplication)

### 🟣 Mode 3: GPT Sol Plan (Senior Architect via MCP — เมื่อพิมพ์ `/plan sol [โจทย์]`)
- **จุดเด่น:** ดึงพลัง **GPT-5.6-Sol (Reasoning: High)** เข้ามาร่วมวางแผนในแชท Flash **(ฟรี 100% ไร้ค่า API)**
- **สิ่งที่ต้องทำ:**
  1. Agent (Flash) กวาดไฟล์และบริบทในแชทปัจจุบัน
  2. ส่งผ่าน `tools/gpt-invoke.cjs` หรือ `call_mcp_tool(gpt, codex)`:
     - ผสาน **4-Layer Context Mirroring** (Workspace Identity, Open Files, Chat History, User Task)
     - ตั้งค่า `cwd: "C:\\My Claw\\Openclaw-VPS"` และ `model: "gpt-5.6-sol"`, `effort: "high"`
     - ใช้ระบบ **Dual Timeout Fallback** (ถ้าติดเพดาน 3 นาที จะเสนอโหมด High หรือ Background Script Bypass ทันที)
  3. นำผลลัพธ์ของ Sol มาประกอบเข้ากับแม่แบบ Masterpiece และบันทึกลง `implementation_plan.md`

---

## 📋 แม่แบบโครงสร้างมาตรฐาน `implementation_plan.md` (The Masterpiece Scaffold)

ทุกครั้งที่รัน `/plan` ไม่ว่าจะโหมดไหน แผนงาน **ต้องมีหัวข้อสำคัญเหล่านี้ครบถ้วน**:

```markdown
# [ชื่อเป้าหมายงาน / Goal Description]

สรุปภาพรวม 1-2 ย่อหน้า: ทำอะไร เพื่ออะไร และสถาปัตยกรรมภาพรวมเป็นแบบไหน

---

## 🔍 1. Verified Facts, Assumptions & Open Questions (Evidence Ledger)
แยกแยะความจริงที่ตรวจพบออกจากสมมติฐานอย่างเด็ดขาด:

| ประเภท | รายละเอียด | หลักฐานอ้างอิง (ไฟล์ / บรรทัด / คำสั่ง) |
|---|---|---|
| **Verified Fact** | โค้ดเดิมใช้ Express Route แบบ mount ใน server.js | [server.js](file:///c:/My%20Claw/Openclaw-VPS/server.js#L25) |
| **Verified Fact** | ไม่มีคำสั่ง npm test ใน package.json แต่มี test.js ใน tools/ | [package.json](file:///c:/My%20Claw/Openclaw-VPS/package.json) |
| **Assumption** | ผู้ใช้ต้องการให้บันทึกข้อมูลแบบ Append-only ไม่ลบของเก่า | อนุมานจากพฤติกรรมของระบบ Quick Save |
| **Open Question** | ถ้า Network Timeout ควร Retry กี่รอบก่อนแจ้ง Error? | [รอ User ตัดสินใจ] |

---

## 🎯 2. Acceptance Criteria & Non-Goals (ขอบเขตงาน)
### ✅ Acceptance Criteria (เกณฑ์ชี้ขาดว่างานเสร็จจริง)
1. API `/api/xxx` ตอบกลับ HTTP 200 พร้อม Schema ที่ถูกต้องภายใน 500ms
2. หน้า UI แสดงผลถูกต้องทั้ง Desktop (1440px) และ Mobile (390px)
3. สคริปต์รันเทสผ่าน 100% ไร้ Unhandled Promise Rejection

### ⛔ Non-Goals (สิ่งที่จะ "ไม่ทำ" ในรอบนี้เด็ดขาด)
- ไม่ทำการ Refactor โค้ดในส่วนที่ไม่เกี่ยวข้อง
- ไม่เพิ่มไลบรารีใหม่จากภายนอกหากของเดิมมีอยู่แล้ว

---

## ⚖️ 3. Decision Matrix (สิ่งที่ต้อง REUSE vs BUILD NEW)
| Component / Logic | การตัดสินใจ (Action) | เหตุผลเชิงสถาปัตยกรรม |
|---|---|---|
| เช่น Existing Auth Middleware | **REUSE** (ห้ามสร้างใหม่) | ป้องกันช่องโหว่ความปลอดภัย และลดโค้ดซ้ำซ้อน |
| เช่น Mobile Layout Shell | **BUILD NEW** (แยกไฟล์) | ป้องกัน Desktop Layout Regression |

---

## 📐 4. Proposed Changes (รายการไฟล์และพิกัดจริง)
แยกหมวดหมู่ตาม Component อย่างเป็นระเบียบ:

### [Component / Layer Name]
#### [MODIFY] [ชื่อไฟล์](file:///absolute/path/to/file)
- **จุดที่แก้:** ฟังก์ชัน `xyz()` หรือบรรทัดที่เกี่ยวข้อง
- **สิ่งที่เปลี่ยน:** คำอธิบายสั้นกระชับพร้อม Logic

#### [PROPOSED NEW] `path/to/newfile.js`
- **Parent Directory:** ยืนยันว่าโฟลเดอร์ปลายทางมีอยู่จริง
- **หน้าที่:** ระบุ Responsibility ของไฟล์ใหม่อย่างชัดเจน

---

## 📦 5. Data Contracts, Migration & Rollback
- **Data Schema:** Input / Output Payload ตัวอย่าง
- **Idempotency & Dedup Key:** คีย์ป้องกันข้อมูลซ้ำซ้อน
- **Rollback Strategy:** หากระบบล่ม จะย้อนกลับอย่างไร (เช่น กู้ไฟล์จาก Git, รันคำสั่ง Revert)

---

## 🛡️ 6. Failure Modes, Security & Edge Cases Armor
- **Timeout Defense:** การรับมือขีดจำกัดเวลา (180s ของ IDE หรือ Network Drop)
- **Input Edge Cases:** การจัดการค่า Null / Empty / ข้อมูลผิดรูปแบบ
- **Lifecycle & Memory:** การเคลียร์ Timer, Event Listener หรือ Process ตกค้าง

---

## 🧪 7. Concrete Verification Plan (คำสั่งที่มีอยู่จริง)
*(ต้องตรวจสอบ package.json หรือ tools/ ก่อน ห้ามมโนคำสั่งเทส)*

### Automated Verification Commands
```powershell
# คำสั่งรันเทสจริงที่ตรวจสอบแล้วว่ารันได้ในโปรเจกต์นี้
node "tools/test_feature.js"
```
- **Expected Output:** รายละเอียดผลลัพธ์ที่ถูกต้องที่ต้องปรากฏ

### Manual / Visual Verification
- จุดที่ต้องเปิดเบราว์เซอร์ส่องตรวจ UI สเกลหัว-ท้าย หรือส่อง Network DevTools

---

## 🚦 8. Plan Quality Gate (เช็คลิสต์ตรวจความแน่นหนา)
ก่อนเริ่มเขียนโค้ด ต้องผ่านเกณฑ์ทั้ง 5 ข้อ:
- [ ] ไฟล์ที่ [MODIFY] ทุกไฟล์มีพิกัดจริงและเปิดตรวจแล้ว
- [ ] ไฟล์ที่ [PROPOSED NEW] ระบุ Parent Directory ที่มีอยู่จริง
- [ ] คำสั่ง Verification มีอยู่จริงในเครื่อง รันได้จริง
- [ ] มีการระบุ Non-Goals ชัดเจน ป้องกันสโคปบวม
- [ ] มีแผน Rollback รองรับกรณีระบบพัง
```

---

## 🚦 Plan Quality Gate Protocol (กฎเหล็กของ Agent)

> ⛔ **IRON RULE: ห้ามส่งแผนให้ผู้ใช้อนุมัติเด็ดขาด หากยังไม่ผ่านเกณฑ์ Quality Gate!**
> 1. ถ้ายังมีข้อสงสัยสำคัญ (Open Question) ที่เป็นจุดตาย ให้ถามผู้ใช้ก่อน หรือตั้งเป็นหัวข้อเด่นที่ต้องขอความเห็น
> 2. ห้ามเขียนคำสั่งเทสลอยๆ เช่น `npm test` ถ้าใน `package.json` ไม่มี script test อยู่จริง!
> 3. ห้ามใช้คำว่า "รับประกัน 100%" แต่ให้ใช้คำว่า **"ผ่าน Quality Gate ตามหลักฐานที่ตรวจพบ"**

---

## 🚀 ลำดับขั้นตอนการทำงานของ Agent (Execution Flow)

1. **ถอดรหัสคำสั่ง (Parse Intent):**
   - ตรวจสอบคีย์เวิร์ด `/plan sol`, `/plan opus`, หรือ `/plan` ปกติ
2. **ขุดค้นหาความจริง (Active Reconnaissance):**
   - รัน `grep_search` หรือส่องไฟล์จริงใน Workspace
   - สร้างตาราง Evidence Ledger บันทึกสิ่งที่พบ
3. **ตรวจสอบคำสั่งเทสจริง:**
   - อ่าน `package.json` หรือส่องโฟลเดอร์ `tools/` เพื่อดูว่าระบบใช้ชุดเทสอะไร
4. **ร่างแผนและบันทึกลงดิสก์:**
   - ใช้ `write_to_file` บันทึกลง `C:\Users\The Dark\.gemini\antigravity-ide\brain\<conversation-id>\implementation_plan.md`
   - ตั้ง `RequestFeedback: true` และ `UserFacing: true`
5. **ส่งมอบผลงาน (Concise Delivery):**
   - แจ้งผู้ใช้สั้นๆ ว่าแผนร่างขึ้นเสร็จแล้ว พร้อมระบุสถานะ Quality Gate
   - สรุป 3 ไฮไลต์หลักของแผน
   - ชี้ลิงก์ไปยัง [`implementation_plan.md`](file:///C:/Users/The%20Dark/.gemini/antigravity-ide/brain/<conversation-id>/implementation_plan.md) เพื่อรอการกด Approve
