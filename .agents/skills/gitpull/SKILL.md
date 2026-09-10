---
name: gitpull
description: "Safe Git Sync, Auto-Commit Pending Work, Executive Briefing, and Unfinished Task Hunter"
---

# 🔄 Skill: `/gitpull` (Safe Sync & Executive Resume Officer)

## Objective
ทำหน้าที่เป็น **Workspace Synchronizer** และ **Briefing Officer** เมื่อเริ่มงาน:
1. ป้องกันโค้ดชน/สูญหายโดยการ **Auto-Commit งานที่ค้างอยู่ก่อนดึงโค้ด** (Commit then Pull)
2. สั่ง **`git pull`** จาก Main Workspace Root อย่างปลอดภัย
3. วิเคราะห์สิ่งที่มีการเปลี่ยนแปลง และเสิร์ฟ **Clickable Markdown Links (`file:///...`)** ตรงไปยังเอกสารยุทธศาสตร์หรือโค้ดหลักล่าสุด
4. **ควานหางานที่ค้างอยู่ (WIP / Pending / Next Steps Hunter)** จากเอกสาร Quick Save ล่าสุดและ Codebase เพื่อให้ User และ AI สามารถกระโดดกลับเข้าสู่ Context รบได้ทันทีใน 5 วินาที

---

## ⛔ PRE-FLIGHT CHECKLIST (กฎเหล็กก่อนรัน)
- **Main Workspace Priority:** คำสั่ง Git ทั้งหมดต้องรันที่ Root Directory เสมอ (`c:\My Claw\MyProjects`) ห้ามรันใน Subfolder ของเอกสารที่เปิดค้างอยู่
- **No Blind Overwrite:** หากมีไฟล์ที่ยังไม่ได้ commit ห้ามสั่ง pull ข้ามหัวหรือ stash หายสาบสูญ ให้ทำตามขั้นตอน Phase 1 เสมอ
- **No Browser Subagent:** ยืนยันผลการซิงก์และการทำงานผ่าน Git/Code Inspection เท่านั้น ห้ามเปิด browser subagent เองเด็ดขาด

---

## 📋 Execution Protocol (4 ขั้นตอนการทำงาน)

### Phase 1: Dirty Tree Check & Auto-Commit (เซฟงานค้างก่อนดึง)
1. **ตรวจสอบสถานะ Local:**
   ```powershell
   git status -s
   ```
2. **เงื่อนไข:**
   - **กรณี Working Tree สะอาด (Clean):** ข้ามไป Phase 2 ได้ทันที
   - **กรณีมีไฟล์ค้าง (Dirty Tree):**
     - ให้ทำการ Stage และ Commit งานค้างทันที เพื่อไม่ให้เกิด conflict หรือโค้ดหาย:
       ```powershell
       git add -A
       git commit -m "chore: save local uncommitted changes before git pull [auto]"
       ```
     - จดบันทึกไว้ในใจว่ามีไฟล์ไหนที่ถูก auto-commit ไปบ้าง เพื่อแจ้งในสรุปตอนท้าย

### Phase 2: Safe Pull & Sync (ดึงข้อมูลล่าสุด)
1. **รันคำสั่งดึงโค้ด:**
   ```powershell
   git pull
   ```
2. **ตรวจสอบผลลัพธ์:**
   - ถ้าขึ้น `Already up to date.` ➔ แปลว่าเครื่องเป็นปัจจุบันแล้ว ไป Phase 3 เพื่อสรุปสถานะล่าสุด
   - ถ้ามีไฟล์ดาวน์โหลดเข้ามา ➔ เก็บรายการไฟล์ที่ถูกดึง (`git diff --name-status HEAD@{1} HEAD` หรือจาก Output ของ `git pull`)
   - ถ้าเกิด Git Conflict (ชนกันระดับเนื้อโค้ด) ➔ **หยุดทันที** ระบุไฟล์ที่ชน แจ้งสาเหตุ และเสนอแนวทางแก้ให้ User ตัดสินใจ

### Phase 3: Change Analysis & Document Detection (จับทิศทางงานล่าสุด)
1. **ตรวจสอบ Git Log ล่าสุด:**
   ```powershell
   git log -n 5 --stat --oneline
   ```
2. **ค้นหาเอกสารเวอร์ชันล่าสุด (Latest Compiled Truth):**
   - ตรวจดูในโฟลเดอร์ `Quick Save/Complete/` หรือ `strategies/` หรือ `docs/`
   - มองหาไฟล์บันทึกที่มีเลข Version สูงสุด (เช่น `V2.15.1_*.md`) หรือไฟล์ที่เพิ่งถูกเพิ่ม/แก้ไขล่าสุด
3. **อ่านเนื้อหาไฟล์เอกสารล่าสุด:**
   - ใช้ `view_file` ส่องดูหัวข้อหลัก, สถาปัตยกรรม, และวัตถุประสงค์ของงานชุดนั้น

### Phase 4: WIP Hunter & Executive Briefing (ล่าสิ่งค้างคา & ชี้เป้าลุยต่อ)
1. **สแกนหางานค้าง (Pending / Next Steps / TODO):**
   - ค้นหาในไฟล์ Quick Save ล่าสุดที่อ่าน ในหัวข้อ:
     - `## Next Steps` / `## Future Enhancements`
     - `## Pending Action Items` / `## สิ่งที่ต้องทำต่อ`
     - `## Unfinished / WIP`
   - ตรวจสอบในโค้ด (ถ้าเกี่ยวข้อง) เช่น มองหา `TODO:`, `FIXME:`, หรือฟังก์ชันจำลอง (Stub / Dummy)
2. **ร่างรายงานสรุปให้ User (Executive Format):**
   - ต้องใช้สรรพนามตาม Persona (มารบูรพา = มึง/กู ชัดเจน ดุดัน ตรงไปตรงมา)
   - แปะ **Clickable Markdown Links** รูปแบบ `[ชื่อไฟล์](file:///c:/My%20Claw/MyProjects/...)` (ใช้ Forward Slashes เสมอ)
   - สรุปผล 4 หมวดหมู่ชัดเจน:
     1. **🛰️ สถานะการ Sync (Sync Status):** Clean / Auto-committed / Pulled X files
     2. **📦 งานล่าสุดที่ทำเสร็จไป (Latest Accomplishment):** สรุปสาระ 2-3 บรรทัด + Markdown Links ตรงไปยังเอกสารหลัก
     3. **🎯 งานที่ค้างอยู่ / ต้องทำต่อ (The Unfinished Agenda):** แปะเป็น Checklist `[ ]` ชัดเจน เพื่อให้ผู้ใช้เคาะสั่งลุยต่อได้ทันที
     4. **⚡ คำแนะนำเชิงยุทธศาสตร์ถัดไป (Strategic Next Move):** สิ่งที่ควรให้ความสำคัญเป็นอันดับ 1 ในตอนนี้

---

## 📑 Output Template (โครงสร้างรายงานผล)

```markdown
(Anchor First Word ตาม Persona เช่น "กูจัดให้!", "มาดูกัน") ซิงก์โค้ดล่าสุดเรียบร้อยแล้ว!

### 🛰️ 1. สถานะการ Sync
- **การเปลี่ยนแปลง:** (เช่น ดึงเข้ามา 84 ไฟล์ / Already up to date)
- **สถานะ Local:** (สะอาดเรียบร้อย / มีการ auto-commit งานค้าง 2 ไฟล์ก่อนดึง)

### 📦 2. งานล่าสุดในระบบ (Latest Deployed Context)
- **เวอร์ชัน:** `V2.15.1` - [ชื่อหัวข้องาน]
- **สาระสำคัญ:** (สรุปสั้นๆ 2-3 บรรทัดว่าระบบทำอะไรได้แล้วบ้าง)
- **🔗 แฟ้มเอกสารหลัก:**
  - [ชื่อไฟล์เอกสารหลัก](file:///c:/My%20Claw/MyProjects/path/to/doc.md)
  - [ชื่อไฟล์โค้ดหลัก](file:///c:/My%20Claw/MyProjects/path/to/code.tsx)

### 🎯 3. สิ่งที่ค้างอยู่ / ต้องทำต่อ (Action Items / Next Steps)
จากที่กูอ่านในเอกสารและโค้ดล่าสุด นี่คืองานที่ค้างอยู่และรอให้ลุยต่อ:
- [ ] **งานที่ 1:** [รายละเอียดที่สกัดมาจาก Next Steps]
- [ ] **งานที่ 2:** [รายละเอียด]
- [ ] **งานที่ 3:** [รายละเอียด]

### ⚡ 4. มารบูรพา Recommendation
[ชี้เป้า 1 ประโยคชัดๆ ว่าควรเริ่มเคาะข้อไหนก่อน] สั่งมาได้เลยว่าจะลุยข้อไหนต่อ!
```
