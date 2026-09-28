---
name: gitpull
version: "2.0.0"
updated_at: "2026-09-28"
description: Safe Git Sync, Auto-Commit Pending Work, Executive Briefing, and Unfinished Task Hunter
---

# 🔄 Skill: /gitpull (Safe Sync & Executive Resume Officer v2.0.0)

## Objective
ทำหน้าที่เป็น **Workspace Synchronizer** และ **Briefing Officer** เมื่อเริ่มงานหรือสลับเครื่องบน **Openclaw-VPS**:
1. ป้องกันโค้ดชน/สูญหายโดยการ **Auto-Commit งานที่ค้างอยู่ก่อนดึงโค้ด** (Commit then Pull) พร้อม Pre-Commit Sanity Check ป้องกันการกวาดไฟล์ขยะ
2. สั่ง **git pull vps master** (หรือ git pull) จาก Main Workspace Root (`C:\My Claw\Openclaw-VPS`) อย่างปลอดภัย รองรับคอนฟิก `[pull] rebase = true`
3. วิเคราะห์สิ่งที่มีการเปลี่ยนแปลง และเสิร์ฟ **Clickable Markdown Links (`file:///C:/My%20Claw/Openclaw-VPS/...`)** ตรงไปยังเอกสาร Quick Save หรือโค้ดหลักล่าสุด
4. **🎯 Auto-Detect Scope & WIP Hunter (ควานหางานเฉพาะโปรเจกต์ปัจจุบัน ไม่ข้ามเขต!):**
   - **Auto-Detect Workspace Folder:** ตรวจสอบโฟลเดอร์ Workspace ปัจจุบันก่อนเสมอ
   - **Strict Scope Isolation:** เมื่อทำงานใน `Openclaw-VPS` (XBrain / Core-VPS) จะต้องสแกนงานเฉพาะของ **Core-VPS** เท่านั้น! **ห้าม** ข้ามเขตไปดึงงานของโฟลเดอร์โปรเจกต์อื่น (เช่น `DoctorBank-Brand`, `HyperCut`, `The-Viral`, `App Builder AI`, `My Stock Portfolio`) มาสรุปเด็ดขาด
   - **ขา A:** สแกนไฟล์ที่ **Root ของ `Quick Save/Active/`** (เช่น V13.x) และโฟลเดอร์ **`Quick Save/Active/Core-VPS/`** เท่านั้น
   - **ขา B:** สแกน **5-7 ไฟล์ลอยล่าสุด** ที่ Root ของ **`Quick Save/Complete/Core-VPS/`**
   เพื่อให้ User และ AI สามารถสับสวิตช์ลุยงานของโปรเจกต์นี้ต่อได้ทันทีใน 5 วินาที โดยไม่มีงานอื่นมาปน

---

## ⛔ PRE-FLIGHT CHECKLIST (กฎเหล็กก่อนรัน)
- **Workspace Auto-Detection & Scope Isolation (Iron Rule):** ตรวจจับ Path โฟลเดอร์ปัจจุบันเสมอ รายงานเฉพาะงานของโปรเจกต์ปัจจุบัน ห้ามมุดเข้าโฟลเดอร์ของโปรเจกต์อื่นที่ฝากแบ็กอัปไว้ใน `Quick Save/Active/<OtherProject>/` เด็ดขาด!
- **Main Workspace Priority (Iron Rule):** คำสั่ง Git ทั้งหมดต้องรันที่ Workspace Root เสมอ (`C:\My Claw\Openclaw-VPS`) ห้ามรันใน Subfolder ของเอกสารที่เปิดค้างอยู่
- **Target Remote Awareness:** ใน Repo นี้ Remote หลักคือ `vps` (`root@185.250.38.247:/root/repos/brain-app.git`) และเปิด `rebase = true` ไว้ ต้องเตรียมรับมือ Rebase State เสมอ
- **No Blind Overwrite:** หากมีไฟล์ที่ยังไม่ได้ commit ห้ามสั่ง pull ข้ามหัวหรือ stash หายสาบสูญ ให้ทำตามขั้นตอน Phase 1 เสมอ
- **No Browser Subagent:** ยืนยันผลการซิงก์และการทำงานผ่าน Git/Code Inspection เท่านั้น ห้ามเปิด browser subagent เองเด็ดขาด

---

## 📋 Execution Protocol (4 ขั้นตอนการทำงาน)

### Phase 1: Dirty Tree Check & Auto-Commit (เซฟงานค้างก่อนดึง)
1. **ตรวจสอบสถานะ Local:**
   ```powershell
   git status -s
   ```
2. **เงื่อนไขและการจัดการ:**
   - **กรณี Working Tree สะอาด (Clean):** ข้ามไป Phase 2 ได้ทันที
   - **กรณีมีไฟล์ค้าง (Dirty Tree):**
     - **Safety Sanity Check:** ดูรายการไฟล์ใน `git status -s` ก่อน:
       - หากมีไฟล์ขยะขนาดใหญ่ (เช่น `.mp4`, `.zip`, dump, log หนักๆ) ที่ไม่ควรขึ้น Git ให้เตือนผู้ใช้ หรือระบุเจาะจงเฉพาะไฟล์งาน
     - Stage และ Commit งานค้างทันที (ใส่ Double Quotes ครอบ Commit Message เสมอ):
       ```powershell
       git add -A
       git commit -m "chore: save local uncommitted changes before git pull [auto]"
       ```
     - จดบันทึกรายการไฟล์ที่ถูก auto-commit ไว้เพื่อแจ้งในสรุปตอนท้าย

### Phase 2: Safe Pull & Sync (ดึงข้อมูลล่าสุด & Rebase Guard)
1. **รันคำสั่งดึงโค้ด:**
   ```powershell
   git pull vps master
   ```
   *(หรือ `git pull` ตามที่ upstream config ไว้)*
2. **ตรวจสอบผลลัพธ์:**
   - **Already up to date:** เครื่องเป็นปัจจุบันแล้ว ข้ามไป Phase 3 เพื่อสรุปสถานะล่าสุด
   - **Fast-forward / Pulled successfully:** มีไฟล์อัปเดตเข้ามา ➔ เก็บรายการไฟล์ที่ถูกดึงด้วย:
     ```powershell
     git diff --name-status HEAD@{1} HEAD
     ```
   - **⚠️ Rebase Conflict (ระวังเป็นพิเศษ!):**
     - เนื่องจากระบบเปิด `[pull] rebase = true` หากมี conflict โค้ดจะค้างในสถานะ `rebasing`
     - **หยุดทันที!** ห้ามฝืนแก้สุ่มสี่สุ่มห้า
     - แจ้งไฟล์ที่ชน พร้อมคำสั่งกู้คืนความปลอดภัย (Safe Rollback):
       ```powershell
       git rebase --abort
       ```
     - วิเคราะห์สาเหตุและเสนอทางเลือกให้ User ตัดสินใจ (จะ abort แล้วตรวจ diff หรือจะ resolve ทีละจุดแล้ว `git rebase --continue`)

### Phase 3: Change Analysis & Document Detection (จับทิศทางงานล่าสุด)
1. **ตรวจสอบ Git Log ล่าสุด:**
   ```powershell
   git log -n 5 --stat --oneline
   ```
2. **ค้นหาเอกสารบริบทล่าสุด (Strict Project Scope - Dual-Scan Strategy):**
   - **Auto-Detect Current Project Scope:**
     - ตรวจสอบโฟลเดอร์ปัจจุบัน หากอยู่ที่ `Openclaw-VPS` (XBrain / Core-VPS) ให้จำกัดขอบเขตค้นหาเฉพาะ **Core-VPS** เท่านั้น
   - **Scan A (`Quick Save/Active/`):**
     - ตรวจสอบเฉพาะไฟล์ที่ **Root ของ `Quick Save/Active/`** (เช่น V13.x) และโฟลเดอร์ **`Quick Save/Active/Core-VPS/`**
     - ⛔ **ห้ามเด็ดขาด:** ห้ามสแกนเข้าไปใน Subfolder ของโปรเจกต์อื่น (เช่น `DoctorBank-Brand/`, `HyperCut/`, `Viral VDO Editing (VVE)/`, `App Builder AI/`, `My Stock Portfolio/`) แม้จะมีไฟล์อยู่ก็ตาม เพราะเป็นงานคนละโปรเจกต์
   - **Scan B (`Quick Save/Complete/Core-VPS/`):**
     - สแกนไฟล์ **5-7 ไฟล์ที่ลอยอยู่ที่ Root** ของโฟลเดอร์ `Quick Save/Complete/Core-VPS/` เท่านั้น (ห้ามไปดูโฟลเดอร์ Component ของโปรเจกต์อื่น)
3. **อ่านเนื้อหาไฟล์เอกสารล่าสุด:**
   - ใช้ `view_file` ส่องดูหัวข้อหลัก, สถาปัตยกรรม, และเจตนารมณ์ของงานชุดล่าสุดเฉพาะของโปรเจกต์นี้

### Phase 4: WIP Hunter & Executive Briefing (ล่าสิ่งค้างคา & ชี้เป้าลุยต่อ)
1. **สแกนหางานค้าง (Pending / Next Steps / Active Tasks):**
   - ตรวจสอบ YAML Frontmatter ของเอกสารล่าสุด:
     - `status: active`
     - `outcome: pending`
     - `brain_task_id: ...`
   - ค้นหา Section งานค้างในเอกสาร:
     - `## Next Steps` / `## Future Enhancements`
     - `## Pending Action Items` / `## สิ่งที่ต้องทำต่อ`
     - `## Unfinished / WIP`
   - ตรวจสอบในโค้ด (ถ้าเกี่ยวข้อง) เช่น `TODO:`, `FIXME:`, หรือ Mock/Stub functions
2. **ร่างรายงานสรุปให้ User (Executive Format):**
   - ใช้สรรพนามตาม Persona ประจำโปรเจกต์ (เช่น มารบูรพา = มึง/กู ชัดเจน ดุดัน ตรงไปตรงมา ไม่อ้อมค้อม)
   - แปะ **Clickable Markdown Links** รูปแบบ `[ชื่อไฟล์](file:///C:/My%20Claw/Openclaw-VPS/...)` (ใช้ Forward Slashes และ `%20` แทนช่องว่างเสมอ)
   - สรุปผล 4 หมวดหมู่ชัดเจน พร้อมเปิด Choice ให้เลือกสั่งลุยต่อได้ทันที

---

## 📑 Output Template (โครงสร้างรายงานผล)

```markdown
(Anchor First Word เช่น กูจัดให้!, มาดูกัน, ฟังนะมึง) ซิงก์โค้ดล่าสุดเรียบร้อยแล้ว!

### 🛰️ 1. สถานะการ Sync
- **การเปลี่ยนแปลง:** (เช่น ดึงเข้ามา X ไฟล์ / Already up to date)
- **สถานะ Local:** (สะอาดเรียบร้อย / มีการ auto-commit งานค้าง X ไฟล์ก่อนดึง)
- **สถานะ Remote:** vps/master ซิงก์ตรงกัน

### 📦 2. งานล่าสุดในระบบ (Latest Deployed Context)
- **เวอร์ชันล่าสุด:** V... - [ชื่อหัวข้องาน]
- **สาระสำคัญ:** (สรุปสั้นๆ 2-3 บรรทัดว่าระบบทำอะไรเสร็จไปแล้วบ้าง)
- **🔗 แฟ้มเอกสาร & โค้ดหลัก:**
  - [ชื่อไฟล์เอกสารหลัก](file:///C:/My%20Claw/Openclaw-VPS/path/to/doc.md)
  - [ชื่อไฟล์โค้ดหลัก](file:///C:/My%20Claw/Openclaw-VPS/path/to/code.js)

### 🎯 3. สิ่งที่ค้างอยู่ / ต้องทำต่อ (The Unfinished Agenda)
จากที่กูสแกนดูทั้งใน `Quick Save/Active/` และเอกสารล่าสุด นี่คืองานที่ค้างอยู่:
- [ ] **1. [ชื่องาน 1]:** [รายละเอียดสั้นๆ + ผลกระทบ]
- [ ] **2. [ชื่องาน 2]:** [รายละเอียดสั้นๆ + ผลกระทบ]
- [ ] **3. [ชื่องาน 3]:** [รายละเอียดสั้นๆ + ผลกระทบ]

### ⚡ 4. คำแนะนำเชิงยุทธศาสตร์ถัดไป (Strategic Next Move)
👉 **โฟกัสอันดับ 1:** [ชี้เป้า 1 ประโยคชัดๆ ว่าทำไมควรเคาะข้อนี้ก่อน]

มึงจะให้กูลุยข้อไหน (1, 2, 3) หรือมีโจทย์ใหม่อะไร บอกมาเลย!
```
