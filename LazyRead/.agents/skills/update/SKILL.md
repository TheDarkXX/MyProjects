---
name: update
description: World-Class Architecture Review & Plan Hardening Engine (RFC/ADR Grade) — ยกระดับ implementation_plan.md จากร่างเดิมสู่แผนสถาปัตยกรรมระดับท็อปคลาส (มาตรฐาน Stripe, Google, GitHub RFC) ด้วยขุมพลัง Opus 4.6 (มหาเทพ 👁️‍🗨️) หรือ GPT-5.6-Sol (Senior Architect ⚡ ผ่าน /gpt sol) มีระบบ Auto-Snapshot สำรองแผนเดิม, Plan Delta ชี้จุดต่างชัดเจน, 9-Pillar Audit Matrix, Task Identity Protection ป้องกันสถานะงานหาย, และ Architecture Decision Record (ADR) ใช้เมื่อ: /update หรือ /update sol หรือ /update opus
---

# 🧠 Skill: `/update` (World-Class Plan Hardening & RFC/ADR Review)

## 📌 วัตถุประสงค์
หยุดการ "เขียนทับแผนเดิมจนประวัติและสถานะงานหาย" หรือ "ไม่รู้ว่า V2 ต่างจาก V1 ตรงไหน" สกิลนี้ยกระดับการตรวจแผนให้เทียบเท่า **ระบบ RFC (Request for Comments) & ADR (Architecture Decision Record) ของทีมวิศวกรรมระดับโลก (Stripe, Google, GitHub)**:
1. **Auto-Snapshot:** สำรองแผนเดิมเป็น Snapshot เสมอ ป้องกันข้อมูลและสถานะงานที่ติ๊กแล้ว `[x]` สูญหาย
2. **Plan Delta:** แสดงตารางเปรียบเทียบชัดเจนว่า เพิ่ม/ลด/เปลี่ยน อะไร และทำไม
3. **9-Pillar Enterprise Matrix:** ครอบคลุมลึกถึง Security, Observability, Rollback, และ Delivery
4. **RFC Status Gate:** จัดเกรดสถานะแผน (`APPROVED` / `NEEDS_DECISION` / `BLOCKED`) ดักจุดตายก่อนเริ่มโค้ด

---

## ⚡ เวิร์กโฟลว์ระดับ World-Class (The 6-Stage Hardening Pipeline)

```
[ขั้นตอนที่ 1] User สั่ง: /update
             │
             ▼
[Stage 1: Baseline Snapshot] ──► สำรอง implementation_plan.v1.snapshot.md อัตโนมัติ
             │                   พร้อมบันทึก Task Status [x] และ Git Status
             ▼
[Stage 2: Engine Routing]    ──► เลือก Opus 4.6 (เมื่ออยู่บน Claude) หรือ GPT-5.6-Sol (บน Flash ฟรี 100%)
             │                   ส่ง 4-Layer Context + Plan เดิม + Code Diff
             ▼
[Stage 3: 9-Pillar Audit]    ──► ชำแหละสถาปัตยกรรม 9 เสาหลัก (ครอบคลุม Security & Observability)
             │
             ▼
[Stage 4: Generate Plan Delta]─► ออกตาราง Delta: Added / Modified / Removed พร้อมเหตุผล
             │
             ▼
[Stage 5: RFC Review Gate]   ──► ประเมินสถานะ: APPROVED / NEEDS_DECISION / BLOCKED
             │
             ▼
[Stage 6: Atomic Promotion]  ──► อัปเดต implementation_plan.md V2 พร้อมประทับ ADR Receipt!
```

---

## 🏛️ The 9-Pillar Enterprise Audit Matrix (เกณฑ์ 9 เสาหลัก)

ทุกครั้งที่สั่ง `/update` โมเดลระดับสถาปนิกสูงสุดต้องตรวจเช็คผ่าน 9 มิติ:

| เสาหลัก (Pillar) | สิ่งที่ต้องชำแหละและตรวจสอบ | เกณฑ์ผ่าน (Pass Criteria) |
|---|---|---|
| **1. Root Cause & Blindspots** | แผนเดิมแก้อาการหรือแก้ที่ต้นตอ? มีอะไรที่ซ่อนอยู่ใต้พรมไหม? | แยก Module แทนการยัด IF-ELSE ซ้อน |
| **2. Decision Matrix** | อะไรคือสิ่งที่ต้อง **REUSE** vs **BUILD NEW**? | ห้ามสร้างซ้ำถ้ามี Component เดิมที่ใช้ได้ |
| **3. Data Contracts & Dedup** | Schema ข้อมูลไหลยังไง? Single Source of Truth อยู่ไหน? | มี Payload Schema, Idempotency & Dedup Key |
| **4. Failure Modes & Armor** | ถ้าเน็ตหลุด / ชน Timeout 180s ของ IDE / ค่าว่าง จะพังไหม? | มี Graceful Degradation และ Timeout Fallback |
| **5. Blast Radius & Regression** | แตะไฟล์นี้แล้วจะพาจุดอื่นพังไหม? | แยก Mobile/Desktop ชัดเจน ไม่กระทบของเดิม |
| **6. Concrete Verification** | คำสั่งเทสมีอยู่จริงใน `package.json` หรือ `tools/` ไหม? | คำสั่งรันได้จริง 100% ไร้มโน |
| **7. Security & Privacy (ใหม่)** | มี Hardcoded Secret, ช่องโหว่ Auth, หรือ Data Leak ไหม? | ใช้ Env Var, สิทธิ์ต่ำสุด (Least Privilege) |
| **8. Operability & Telemetry (ใหม่)**| มี Logging เมื่อพังไหม? ตรวจสอบสถานะการทำงานยังไง? | มี Error Log ระบุ Context และ Telemetry ชัดเจน |
| **9. Delivery & Rollback (ใหม่)** | ถ้าระบบพังหน้างาน จะถอยกลับยังไงใน 30 วินาที? | มีคำสั่ง Git Revert / Rollback Script พร้อมใช้ |

---

## 🛡️ กฎเหล็ก Task Identity & Status Preservation (Iron Rule)

> ⛔ **ห้ามล้างงานที่ทำเสร็จแล้วเด็ดขาด!**
> 1. หากในแผนเดิมมี Task ที่ทำเสร็จแล้ว (`- [x] ...`) **ต้องคงสถานะ `[x]` ไว้เสมอ** ห้ามรีเซ็ตกลับเป็น `[ ]`
> 2. หาก Task เดิมถูกยกเลิกเนื่องจากสถาปัตยกรรมเปลี่ยน ให้ทำเครื่องหมายเป็น `~~- [ ] Task เดิม~~ (Superseded by Task XYZ)` พร้อมระบุเหตุผล
> 3. Task ใหม่ทุกตัวต้องมี **Stable ID** (เช่น `[TASK-01]`, `[TASK-02]`) เพื่อให้ตามรอยได้ง่าย

---

## 📋 แม่แบบโครงสร้างมาตรฐาน `implementation_plan.md` ฉบับ V2 (RFC/ADR Grade)

เมื่อรัน `/update` ไฟล์ที่ได้จะต้องมีส่วนประกอบเหล่านี้:

```markdown
# [RFC / Plan V2]: [ชื่อเป้าหมายงาน]

**Status:** 🟡 `NEEDS_DECISION` หรือ 🟢 `APPROVED_FOR_EXECUTION`  
**Baseline Snapshot:** [`implementation_plan.v1.snapshot.md`](file:///...)  
**Reviewed By:** Opus 4.6 (มหาเทพ 👁️‍🗨️) / GPT-5.6-Sol (Senior Architect ⚡)

---

## 🔄 1. Plan Delta (สิ่งที่เปลี่ยนแปลงจาก V1 ➔ V2)
สรุปการเปลี่ยนแปลงให้ผู้ใช้เห็นชัดเจนใน 10 วินาที:

| หมวดการเปลี่ยน | รายการสิ่งที่เปลี่ยน | เหตุผลเชิงสถาปัตยกรรม (Architectural Rationale) | ผลกระทบ/ความเสี่ยง |
|---|---|---|---|
| **ADDED** | เพิ่ม Timeout Fallback Bypass | IDE มี Hard Timeout 180s ถ้าคิดลึกจะหลุด | ต่ำ (เสริมความปลอดภัย) |
| **MODIFIED** | แยก View Mobile ออกจาก Desktop | โค้ดเดิมยัดลงจอ 390px แล้วพัง | กลาง (ต้องสร้างไฟล์ใหม่) |
| **REMOVED / DEFERRED** | เลื่อนการทำ Dark Mode ไป Phase 2 | ลด Scope เพื่อให้ Core Flow นิ่งก่อน | ต่ำ (Non-Goal) |

---

## 📜 2. Architecture Decision Record (ADR)
บันทึกการตัดสินใจเชิงเทคนิคที่สำคัญ:
- **Decision:** ทำไมถึงเลือกแนวทางนี้แทนแนวทางอื่น?
- **Alternatives Considered:** ทางเลือกอื่นที่พิจารณาแล้วปัดตกคืออะไร? ทำไมถึงตก?
- **Consequences:** ข้อดีที่ได้รับ และข้อจำกัดที่ยอมรับ (Trade-offs)

---

## 🔍 3. Verified Evidence & Requirements Ledger
- **Verified Facts:** [รายการไฟล์และโค้ดที่เปิดตรวจจริงแล้ว]
- **Confirmed Constraints:** [ขีดจำกัดของระบบ เช่น Timeout, Node Version]
- **Resolved Blockers:** [คำถามที่ผู้ใช้ตอบเคาะแล้ว]

---

## 🎯 4. Refined Acceptance Criteria & Non-Goals
### ✅ Acceptance Criteria (เกณฑ์ตรวจรับงาน)
- [ ] ข้อที่ 1: เกณฑ์เชิงเทคนิค (Response status, Latency)
- [ ] ข้อที่ 2: เกณฑ์เชิง UI (Responsive state, Visual scale)
- [ ] ข้อที่ 3: เกณฑ์เชิง Functional (End-to-End Test ผ่าน)

### ⛔ Non-Goals (ขอบเขตที่ไม่ทำเด็ดขาด)
- [ระบุสิ่งที่อยู่นอก Scope ของรอบนี้]

---

## 📐 5. Hardened Execution Plan (พร้อม Task IDs & Status)
### Phase 1: Core / Backend Layer
- [x] `[TASK-01]` สิ่งที่ทำเสร็จแล้วใน V1 (คงสถานะเดิมไว้)
- [ ] `[TASK-02]` สิ่งที่ต้องทำต่อใน V2 (ระบุ [MODIFY] หรือ [PROPOSED NEW])

### Phase 2: Frontend / UI Layer
- [ ] `[TASK-03]` รายละเอียดงานหน้าบ้าน

---

## 🛡️ 6. Failure Modes, Security & Rollback Plan
- **Security Check:** Least privilege, no plaintext secrets
- **Runtime Armor:** Timeout defense, Error Boundaries, Memory leak cleanup
- **Rollback Command:**
  ```powershell
  git checkout master -- path/to/modified/file.js
  ```

---

## 🧪 7. Concrete Verification Checklist
```powershell
# คำสั่งเทสจริงที่ตรวจสอบแล้วใน package.json หรือ tools/
node "tools/test_feature.js"
```
```

---

## 🚀 ลำดับขั้นตอนการทำงานของ Agent (Execution Protocol)

### Step 1: Auto-Snapshot (ห้ามข้ามเด็ดขาด)
1. ตรวจสอบว่ามีไฟล์ `implementation_plan.md` อยู่หรือไม่
2. ถ้ามี: คัดลอกไฟล์เดิมไปเป็น `implementation_plan.v1.snapshot.md` (หรือ `.v2.snapshot.md` ตามรอบ) ไว้ใน Artifact Directory ทันที
3. สกัดรายการ Task ที่ติ๊กเสร็จแล้ว (`- [x]`) ออกมาเก็บไว้ในความจำ

### Step 2: รวบรวมบริบทและเลือก Engine (Engine Routing)
- **โหมด Claude / Opus:** สวมบทบาทมหาเทพ 👁️‍🗨️ ชำแหละแผนเดิมผ่าน 9-Pillar Matrix
- **โหมด Gemini Flash:** รวบรวม Plan เดิม + Snapshot + คำสั่งล่าสุด ส่งให้ **GPT-5.6-Sol** ผ่าน `tools/gpt-invoke.cjs` หรือ `call_mcp_tool(gpt, codex)` (ฟรี 100%)

### Step 3: ประกอบแผน V2 และบันทึกแบบ Atomic Promotion
1. คำนวณตาราง **Plan Delta** (สิ่งที่เปลี่ยนไประหว่าง V1 กับ V2)
2. รวม Task เดิมที่ติ๊กแล้ว `[x]` เข้ากับ Task ใหม่
3. ประเมิน RFC Status: ถ้ายังมีจุดที่ต้องการให้ผู้ใช้ตัดสินใจ ให้ตั้งเป็น `🟡 NEEDS_DECISION` พร้อมชี้ชัดเจนว่าต้องการให้ฟันธงเรื่องอะไร
4. ใช้ `write_to_file` เขียนลง `implementation_plan.md` (ตั้ง `RequestFeedback: true`)

### Step 4: ส่งมอบและสรุปผลในแชท (Delivery Report)
รายงานผู้ใช้สั้นกระชับใน 3 บล็อก:
1. **Delta Summary:** สรุปสั้นๆ 3 จุดสำคัญที่ V2 ปรับปรุงจาก V1
2. **RFC Status:** แจ้งสถานะ (`APPROVED_FOR_EXECUTION` หรือ `NEEDS_DECISION`)
3. **Artifact Links:** ชี้ลิงก์คู่:
   - 📄 [`implementation_plan.md`](file:///C:/Users/The%20Dark/.gemini/antigravity-ide/brain/<conversation-id>/implementation_plan.md) (ฉบับ V2 อัปเกรด)
   - 📦 [`implementation_plan.v1.snapshot.md`](file:///C:/Users/The%20Dark/.gemini/antigravity-ide/brain/<conversation-id>/implementation_plan.v1.snapshot.md) (ฉบับสำรองเดิม)
