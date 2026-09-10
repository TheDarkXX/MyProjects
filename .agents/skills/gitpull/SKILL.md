---
name: gitpull
description: Safe Git Sync, Auto-Commit Pending Work, Executive Briefing, and Unfinished Task Hunter for MyProjects Umbrella
---

# 🔄 Skill: /gitpull (MyProjects Safe Sync & Executive Resume Officer)

## Objective
ทำหน้าที่เป็น **Workspace Synchronizer** และ **Briefing Officer** เมื่อเริ่มงานหรือสลับเครื่องบนโปรเจกต์เครือ **MyProjects**:
1. ป้องกันโค้ดชน/สูญหายโดยการ **Auto-Commit งานที่ค้างอยู่ก่อนดึงโค้ด** (Commit then Pull) พร้อม Pre-Commit Sanity Check
2. สั่ง **git pull origin master** (หรือ git pull) จาก Main Workspace Root (`C:\My Claw\MyProjects`) อย่างปลอดภัย
3. วิเคราะห์สิ่งที่มีการเปลี่ยนแปลง และเสิร์ฟ **Clickable Markdown Links (`file:///C:/My%20Claw/MyProjects/...`)** ตรงไปยังเอกสาร Quick Save หรือโค้ดแอปหลักล่าสุด
4. **ควานหางานที่ค้างอยู่ (WIP / Pending / Next Steps Hunter)** แบบ 2 ขา:
   - **ขา A:** สแกน `Quick Save/Active/` (ซึ่งครอบคลุมทั้ง HyperCut, My Stock Portfolio, App Builder AI, LazyRead, Airkeys, VVE ฯลฯ)
   - **ขา B:** สแกน **5-7 ไฟล์ลอยล่าสุด** ที่ Root ของ `Quick Save/Complete/` หรือ subfolder ของแต่ละแอป
   เพื่อให้ User และ AI สามารถสับสวิตช์กระโดดกลับเข้าสู่ Context ของโปรเจกต์ที่ทำค้างไว้ได้ทันทีใน 5 วินาที

---

## ⛔ PRE-FLIGHT CHECKLIST (กฎเหล็กก่อนรัน)
- **Main Workspace Priority (Iron Rule):** คำสั่ง Git ทั้งหมดต้องรันที่ Workspace Root เสมอ (`C:\My Claw\MyProjects`) ห้ามรันใน Subfolder ของแอปย่อย
- **Target Remote Awareness:** ใน Repo นี้ Remote หลักคือ `origin` (GitHub `https://github.com/TheDarkXX/MyProjects.git`) และมีรีโมตรอง `vps` สำหรับ Stock Portfolio คำสั่งดึงหลักคือ `git pull origin master`
- **No Blind Overwrite:** หากมีไฟล์ที่ยังไม่ได้ commit ห้ามสั่ง pull ข้ามหัวหรือ stash หายสาบสูญ ให้ทำตามขั้นตอน Phase 1 เสมอ
- **Sub-App Build Artifacts:** ระวัง build artifacts ของ Electron, Vite, Node modules ในแอปย่อย (เช่น HyperCut, App Builder) อย่าเผลอกวาดลง Git

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
       - หากมีไฟล์ขยะขนาดใหญ่ (เช่น `.mp4`, build output, node_modules, log หนักๆ) ให้เตือนผู้ใช้หรือแยกยกเว้น
     - Stage และ Commit งานค้างทันที (ใส่ Double Quotes ครอบ Commit Message เสมอ):
       ```powershell
       git add -A
       git commit -m "chore: save local uncommitted changes before git pull [auto]"
       ```
     - จดบันทึกรายการไฟล์ที่ถูก auto-commit ไว้เพื่อแจ้งในสรุปตอนท้าย

### Phase 2: Safe Pull & Sync (ดึงข้อมูลล่าสุด & Conflict Guard)
1. **รันคำสั่งดึงโค้ด:**
   ```powershell
   git pull origin master
   ```
   *(หรือ `git pull` ตาม upstream)*
2. **ตรวจสอบผลลัพธ์:**
   - **Already up to date:** เครื่องเป็นปัจจุบันแล้ว ข้ามไป Phase 3 เพื่อสรุปสถานะล่าสุด
   - **Fast-forward / Pulled successfully:** มีไฟล์อัปเดตเข้ามา ➔ เก็บรายการไฟล์ที่ถูกดึงด้วย:
     ```powershell
     git diff --name-status HEAD@{1} HEAD
     ```
   - **⚠️ Git Conflict (ระวังเป็นพิเศษ!):**
     - **หยุดทันที!** ห้ามฝืน merge สุ่มสี่สุ่มห้า
     - แจ้งไฟล์ที่ชน พร้อมคำสั่งกู้คืนความปลอดภัย:
       ```powershell
       git merge --abort
       ```
     - วิเคราะห์สาเหตุและเสนอทางเลือกให้ User ตัดสินใจ

### Phase 3: Change Analysis & Document Detection (จับทิศทางงานล่าสุด)
1. **ตรวจสอบ Git Log ล่าสุด:**
   ```powershell
   git log -n 5 --stat --oneline
   ```
2. **ค้นหาเอกสารบริบทล่าสุด (Dual-Scan Strategy):**
   - **Scan A (`Quick Save/Active/`):** ตรวจสอบไฟล์ใน `Quick Save/Active/` (เช็ค subfolder เช่น `HyperCut/`, `My Stock Portfolio/`, `App Builder AI/` ฯลฯ)
   - **Scan B (`Quick Save/Complete/`):** สแกนไฟล์ **5-7 ไฟล์ลอยล่าสุด** ในโฟลเดอร์ Complete หรือเอกสารใน `docs/`
3. **อ่านเนื้อหาไฟล์เอกสารล่าสุด:**
   - ใช้ `view_file` ส่องดูหัวข้อหลัก, สถาปัตยกรรม, และฟังก์ชันของแอปที่กำลังพัฒนา

### Phase 4: WIP Hunter & Executive Briefing (ล่าสิ่งค้างคา & ชี้เป้าลุยต่อ)
1. **สแกนหางานค้าง (Pending / Next Steps / Active Tasks):**
   - ตรวจสอบ YAML Frontmatter ของเอกสารล่าสุด:
     - `status: active`
     - `outcome: pending`
   - ค้นหา Section งานค้างในเอกสาร:
     - `## Next Steps` / `## Future Enhancements`
     - `## Pending Action Items` / `## สิ่งที่ต้องทำต่อ`
     - `## Unfinished / WIP`
   - ตรวจสอบในโค้ดของแอปย่อย (ถ้าเกี่ยวข้อง) เช่น `TODO:`, `FIXME:`, หรือ Mock components
2. **ร่างรายงานสรุปให้ User (Executive Format):**
   - ใช้สรรพนามตาม Persona ประจำโปรเจกต์ (เช่น มารบูรพา = มึง/กู ชัดเจน ดุดัน ตรงไปตรงมา)
   - แปะ **Clickable Markdown Links** รูปแบบ `[ชื่อไฟล์](file:///C:/My%20Claw/MyProjects/...)` (ใช้ Forward Slashes และ `%20` เสมอ)
   - สรุปผล 4 หมวดหมู่ชัดเจน พร้อมเปิด Choice ให้เลือกสั่งลุยต่อได้ทันที

---

## 📑 Output Template (โครงสร้างรายงานผล)

```markdown
(Anchor First Word เช่น กูจัดให้!, มาดูกัน, ฟังนะมึง) ซิงก์ MyProjects ล่าสุดเรียบร้อยแล้ว!

### 🛰️ 1. สถานะการ Sync
- **การเปลี่ยนแปลง:** (เช่น ดึงเข้ามา X ไฟล์ / Already up to date)
- **สถานะ Local:** (สะอาดเรียบร้อย / มีการ auto-commit งานค้าง X ไฟล์ก่อนดึง)
- **สถานะ Remote:** origin/master ซิงก์ตรงกัน

### 📦 2. งานล่าสุดในระบบ (Latest Deployed Context)
- **แอป / โมดูล:** [เช่น HyperCut, My Stock Portfolio, App Builder AI]
- **เวอร์ชันล่าสุด:** V... - [ชื่อหัวข้องาน]
- **สาระสำคัญ:** (สรุปสั้นๆ 2-3 บรรทัดว่าฟีเจอร์หรือแอปทำอะไรเสร็จไปแล้วบ้าง)
- **🔗 แฟ้มเอกสาร & โค้ดหลัก:**
  - [ชื่อไฟล์เอกสารหลัก](file:///C:/My%20Claw/MyProjects/path/to/doc.md)
  - [ชื่อไฟล์โค้ดหลัก](file:///C:/My%20Claw/MyProjects/path/to/code.tsx)

### 🎯 3. สิ่งที่ค้างอยู่ / ต้องทำต่อ (The Unfinished Agenda)
จากที่กูสแกนดูทั้งใน `Quick Save/Active/` และเอกสารล่าสุด นี่คืองานที่ค้างอยู่:
- [ ] **1. [ชื่องาน 1]:** [รายละเอียดสั้นๆ + แอปที่เกี่ยวข้อง]
- [ ] **2. [ชื่องาน 2]:** [รายละเอียดสั้นๆ + แอปที่เกี่ยวข้อง]
- [ ] **3. [ชื่องาน 3]:** [รายละเอียดสั้นๆ + แอปที่เกี่ยวข้อง]

### ⚡ 4. คำแนะนำเชิงยุทธศาสตร์ถัดไป (Strategic Next Move)
👉 **โฟกัสอันดับ 1:** [ชี้เป้า 1 ประโยคชัดๆ ว่าทำไมควรเคาะข้อนี้ก่อน]

มึงจะให้กูลุยแอปไหน ข้อไหน (1, 2, 3) หรือมีไอเดียใหม่อะไร สั่งมาเลย!
```
