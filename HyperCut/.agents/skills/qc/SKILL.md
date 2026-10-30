---
name: qc
version: "3.0.0"
updated_at: "2026-10-30"
description: >-
  Quick Clear & Workspace Hygiene Engine V3 — สแกนตรวจสอบความสะอาด Quick Save,
  ตรวจสอบงานค้างจริง vs ค้างหลอก (Active Reality Radar), กำจัด Ghost Files,
  คุม Floating Files ใน Complete และ Re-index Search Manifest อัตโนมัติ
---
# 🧹 Skill: `/qc` (Quick Clear & Workspace Hygiene Engine V3 — Active Reality Radar)

## Objective
สแกนตรวจสอบความสะอาดของทั้ง Workspace อย่างเป็นระบบด้วย **Automated QC Engine (`scripts/qc-audit.js`)** ครอบคลุม:
1. **Root Folder Hygiene:** ตรวจสอบไฟล์ Script ที่หน้าบ้าน (Root) ต้องไม่เกิน 20 ไฟล์และต้องอยู่ใน LOCKED list
2. **Active Reality Radar (เช็คงานค้างจริง vs ค้างหลอก):** สแกนเจาะลึกไส้ในไฟล์ `Quick Save/Active/` ทุกอันเพื่อพิสูจน์สถานะจริง:
   - 🟢 **Genuine Active:** มี Task ค้าง `[ ]` และกำลังทำอยู่จริง (Work in progress)
   - 🔴 **False Active:** ติ๊ก `[x]` ครบ 100% แล้ว หรือมีข้อความจบงาน (COMPLETED/DEPLOYED) แต่ลืมแก้ frontmatter และยังไม่ได้ย้ายไป `Complete/`
   - ❄️ **Stale / Dormant:** งานค้างที่ไม่มีความคืบหน้านานเกิน 30 วัน (แนะนำให้รีวิวหรือย้ายเข้า `Icebox/`)
   - 🟡 **Untasked Deliverables:** เอกสารประเภท Study / Docs ที่ไม่มี Checklist และเก่าเกิน 14 วัน (ตรวจสอบว่าศึกษาเสร็จแล้วหรือยัง)
3. **Recursive Ghost Scan:** สแกนเจาะลึกทุก Component Folder ใน `Quick Save/Active/` เพื่อตรวจหา Ghost Files (ไฟล์ที่เสร็จและอยู่ใน `Complete/` แล้ว) แล้วลบทิ้งอย่างปลอดภัยผ่าน Safe Quarantine
4. **Loose Files Enforcer:** ตรวจจับไฟล์ที่วางทิ้งลอยๆ ที่หน้าบ้าน `Quick Save/Active/` นอกโฟลเดอร์ Component
5. **Complete Organization:** ตรวจสอบโฟลเดอร์ `Complete/<Component>/` ให้คงไฟล์ Floating ที่ Root ไม่เกิน 5-7 ไฟล์ตามกฎ SemVer
6. **Mandatory Manifest Sync:** รัน Re-index `search-manifest.md` ทันทีหลังมีการย้ายหรือลบไฟล์ เพื่อป้องกัน Dead Link

> ⚠️ **CRITICAL WARNING FOR AI AGENTS:**
> 1. **PowerShell `[]` Wildcard:** ชื่อไฟล์ Quick Save มีเครื่องหมายก้ามปู `[impl]`, `[hotfix]` ซึ่ง PowerShell จะมองเป็น Wildcard หากใช้ `Move-Item` หรือ `Remove-Item` แบบปกติจะล้มเหลวเงียบๆ **ต้องใช้ `-LiteralPath` หรือใช้ Node.js / `scripts/qc-audit.js` เท่านั้น**
> 2. **Component Path Structure:** โครงสร้างโฟลเดอร์ที่ถูกต้องคือ `Quick Save/Complete/<Component>/` (เช่น `Core-VPS/`, `HyperCut/`) และเวอร์ชันย่อยอยู่ใน `<Component>/Vxx/` (ห้ามสร้าง path เบิ้ล เช่น `Complete/Complete/` เด็ดขาด)
> 3. **Never Skip Manifest Re-indexing:** หลังลบหรือย้ายไฟล์ใดๆ ต้องรัน `node scripts/qs-indexer.js` เสมอ!

---

## 🚀 Execution Workflow (ขั้นตอนการทำงาน)

### Step 1: รันคำสั่ง Audit Engine
เรียกคำสั่งหลักเพื่อสแกนทั้งระบบทันที:
```bash
node scripts/qc-audit.js
```
สคริปต์จะทำการ:
- ตรวจ Root Folder Scripts เทียบกับ LOCKED list
- สแกน `Quick Save/Active/` แบบ Recursive ลึกทุกโฟลเดอร์ Component
- **[Phase 1b] รัน Active Reality Radar:** วิเคราะห์ Task Checkboxes (`[ ]` vs `[x]`), วันที่, และคีย์เวิร์ดจบงานของทุกไฟล์ใน Active
- ค้นหา Ghost Files ที่ซ้ำกับ `Quick Save/Complete/` (ตรวจ SHA-256 Hash)
- ตรวจสอบไฟล์ลอย (Loose Files) ที่ Root ของ `Active/`
- ตรวจสอบจำนวน Floating Files ใน `Complete/Core-VPS/` (ต้องไม่เกิน 7 ไฟล์)

---

### Step 2: สะสางตามผลตรวจ (Fix & Reality Reconciliation)

#### Option A: รัน Auto-Fix & Auto-Promote ด้วย Engine (แนะนำ)
หากพบ Ghost Files, Loose Files, ไฟล์ Floating เกินโควตา หรือเจอ **🔴 False Active (งานที่เสร็จแล้วแต่ยังคาใน Active)** ให้รันคำสั่งเดียวจบ:
```bash
node scripts/qc-audit.js --fix
# หรือ
node scripts/qc-audit.js --promote
```
สคริปต์จะทำการ:
1. **Quarantine Ghost Files:** แบ็กอัปเข้า `.system_quarantine/` ก่อนลบอย่างปลอดภัย
2. **Auto-Promote False Active:** ปรับสถานะ frontmatter เป็น `status: complete` + `outcome: shipped` และ Move เข้าโฟลเดอร์ `Complete/<Component>/` (หรือโฟลเดอร์เวอร์ชัน `Vxx/`) ให้อัตโนมัติทันที
3. **Route Loose Files:** จัดระเบียบไฟล์ลอยเข้าโฟลเดอร์ Component หรือโยกเข้า Icebox หากค้างเกิน 30 วัน
4. **SemVer Archive:** โยกไฟล์เก่าลง `_Legacy/` หรือ `Vxx/` หากไฟล์ลอยที่ root ใน Complete เกิน 5-7 ไฟล์
5. **Re-index Manifest:** สั่งรัน `node scripts/qs-indexer.js` ให้เสร็จสรรพในคำสั่งเดียว ป้องกัน Dead Link

#### Option B: จัดการ False Active และ Stale Tasks จาก Phase 1b
1. **หากเจอ 🔴 False Active (งานเสร็จ 100% แล้วแต่ยังอยู่ใน Active):**
   - อัปเดต frontmatter เป็น `status: complete` และ `outcome: shipped`
   - ย้ายเข้าไปยัง `Quick Save/Complete/<Component>/Vxx/`
2. **หากเจอ ❄️ Stale Tasks (ดองนานเกิน 30 วัน):**
   - สอบถาม User หรือประเมินเพื่อย้ายไปยัง `Quick Save/Icebox/<Component>/`
3. **หากเจอ 🟡 Untasked Deliverables (Study ที่วิจัยจบแล้ว):**
   - อัปเดต frontmatter เป็น `status: complete` และย้ายเข้า `Complete/<Component>/`

---

### Step 3: ตรวจสอบ `_incoming/` Stubs
- ตรวจสอบ `Quick Save/_incoming/hydra/` และ `dev-agent/`
- หากมี stub ของ EVO หรือ Task ID ใดที่ถูก Implement ใน `Complete/` เรียบร้อยแล้ว ให้ย้ายเข้า `archive/` หรือลบทิ้ง

---

### Step 4: Post-Recheck Verification & Git Sync (MANDATORY)
1. **Source & Dest Verification:** ตรวจสอบว่าไฟล์ที่สั่งย้าย/ลบ หายไปจากต้นทางจริง และปลายทางมีไฟล์ครบ
2. **Manifest Check:** รัน `node scripts/qs-indexer.js` (หากยังไม่ได้รันผ่าน `--fix`)
3. **Git Sync:** ตรวจสอบ `git status` และรัน `git commit` พร้อม `git push vps master` เพื่อให้เซิร์ฟเวอร์ VPS อัปเดตตามทันที

---

## 📋 Standard Locked Root Scripts
ไฟล์ Script ที่ได้รับอนุญาตให้อยู่ที่ Root:
- `server.js`, `ai-gateway.js`, `generate_cloud_images.cjs`, `higgsfield-auth-watchdog-vps.cjs`
- `bump-cache.js`, `deploy.js`, `start.sh`, `Open AG.bat`, `start-voice.bat`, `ecosystem.config.js`

---

## 🔗 GBRAIN Backlinks
- **2026-09-29 08:45** | [V13.85.0 QC Skill Overhaul & Recursive Workspace Hygiene Engine](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Active/Core-VPS/V13.85.0_%5Bimpl%5D_skills_qc-radar-and-recursive-workspace-hygiene.md)
- **2026-06-14 12:55** | [Root Folder Hygiene & Systemic Rules](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Complete/Core-VPS/V12.20.0_[infra]_ag-skills_root-folder-hygiene-and-reviewchat.md)
