---
name: qc
version: "2.0.0"
updated_at: "2026-09-29"
description: "Quick Clear & Workspace Hygiene Engine — สแกนทำความสะอาด Quick Save, จัดระเบียบ Component Folders, กำจัด Ghost Files และ Re-index Search Manifest อัตโนมัติ"
---
# 🧹 Skill: `/qc` (Quick Clear & Workspace Hygiene Engine V2)

## Objective
สแกนตรวจสอบความสะอาดของทั้ง Workspace อย่างเป็นระบบด้วย **Automated QC Engine (`scripts/qc-audit.js`)** ครอบคลุม:
1. **Root Folder Hygiene:** ตรวจสอบไฟล์ Script ที่หน้าบ้าน (Root) ต้องไม่เกิน 20 ไฟล์และต้องอยู่ใน LOCKED list
2. **Recursive Ghost Scan:** สแกนเจาะลึกทุก Component Folder ใน `Quick Save/Active/` เพื่อตรวจหา Ghost Files (ไฟล์ที่เสร็จและอยู่ใน `Complete/` แล้ว) แล้วลบทิ้ง
3. **Loose Files Enforcer:** ตรวจจับไฟล์ที่วางทิ้งลอยๆ ที่หน้าบ้าน `Quick Save/Active/` นอกโฟลเดอร์ Component
4. **Complete Organization:** ตรวจสอบโฟลเดอร์ `Complete/<Component>/` ให้คงไฟล์ Floating ที่ Root ไม่เกิน 5-7 ไฟล์ตามกฎ
5. **Mandatory Manifest Sync:** รัน Re-index `search-manifest.md` ทันทีหลังมีการย้ายหรือลบไฟล์ เพื่อป้องกัน Dead Link

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
- ค้นหา Ghost Files ที่ซ้ำกับ `Quick Save/Complete/`
- ตรวจสอบไฟล์ลอย (Loose Files) ที่ Root ของ `Active/`
- ตรวจสอบจำนวน Floating Files ใน `Complete/Core-VPS/` (ต้องไม่เกิน 7 ไฟล์)

---

### Step 2: Auto-Fix หรือสั่งสะสางตามหมวดหมู่

#### Option A: รัน Auto-Fix ด้วย Engine (แนะนำ)
หากพบ Ghost Files หรือไฟล์ที่ไม่ใช่ markdown (เช่น `.html`) ลอยอยู่ใน Active ให้รัน:
```bash
node scripts/qc-audit.js --fix
```
สคริปต์จะลบ Ghost Files ทันที, ย้ายไฟล์ขยะไป `scratch/`, และสั่งรัน `node scripts/qs-indexer.js` ให้เสร็จสรรพในคำสั่งเดียว

#### Option B: จัดการ Loose Files และ Unmoved Completed Plans
หากมี Loose Files ที่หน้าบ้าน `Active/` หรือไฟล์ที่ทำเสร็จแล้วแต่ลืมย้าย:
1. **ไฟล์ที่เสร็จแล้ว (Completed):** 
   - อัปเดต frontmatter เป็น `status: complete` และ `outcome: shipped`
   - ย้ายเข้าไปยัง `Quick Save/Complete/<Component>/Vxx/` (ใช้ Node.js หรือ PowerShell `-LiteralPath`)
2. **ไฟล์ข้อเสนอเก่า / ไม่ได้ทำต่อ (Old Proposals / Inactive Studies):**
   - ย้ายไปยัง `Quick Save/Icebox/<Component>/`
3. **ไฟล์งาน Active จริง:**
   - ย้ายเข้าไปยัง Subfolder ของ Component นั้นๆ (เช่น `Quick Save/Active/Core-VPS/`)

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
