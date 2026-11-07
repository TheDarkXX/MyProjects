---
name: gitpull
version: "3.1.0"
updated_at: "2026-11-07"
description: >-
  Safe Git Sync, Spiderweb Mesh Multi-Repo Radar & Auto-Sync, Auto-Commit Pending Work, Executive Briefing, and Unfinished Task Hunter
---

# 🔄 Skill: /gitpull (Safe Sync & Spiderweb Multi-Repo Sentinel v3.1.0)

## Objective
ทำหน้าที่เป็น **Workspace Synchronizer**, **Spiderweb Mesh Multi-Repo Synchronizer (Mesh-First Default)**, และ **Cross-Project Reference Sentinel**:
1. ป้องกันโค้ดชน/สูญหายโดยการ **Auto-Commit งานที่ค้างอยู่ก่อนดึงโค้ด** (Commit then Pull) พร้อม Pre-Commit Sanity Check ป้องกัน Git Abort
2. **🕸️ Spiderweb Mesh Multi-Repo Sync (Mesh-First Default — ทลายกำแพง Single-Repo Blindness):**
   - ในระบบ Spiderweb เอเจนต์มักทำงานข้ามโปรเจกต์ เช่น เขียนสคริปต์ใน `VVE` แต่ไปบันทึก Storyboard ใน `The Viral` หรืออัปเดตความรู้ใน `XBrain`
   - เมื่อผู้ใช้สั่ง `/gitpull` เอนจินจะ **ดึงและซิงก์ครบทั้ง 4 โหนดคู่หูหลักเป็นค่าเริ่มต้น (Default)**:
     - `VVE` (`C:\My Claw\Viral VDO Editing (VVE)`)
     - `The Viral` (`C:\My Claw\The Viral`)
     - `DoctorBank-Brand` (`C:\My Claw\DoctorBank-Brand`)
     - `XBrain` (`C:\XBrain` / `C:\My Claw\Openclaw-VPS`)
   - ป้องกันปัญหา "ลิงก์ในเอกสารเปิดไม่ได้เพราะไฟล์จริงยังค้างอยู่บน GitHub ของโปรเจกต์อื่น" ได้ 100%
3. **🔍 Cross-Project Reference Sentinel (ดักจับและตรวจสอบลิงก์ข้ามโปรเจกต์):**
   - สแกนเอกสาร Quick Save ล่าสุดของโปรเจกต์ปัจจุบัน กวาดหา Path และ Backlinks ข้ามโฟลเดอร์
   - ตรวจสอบความมีอยู่จริงบนดิสก์ (`fs.existsSync`) แบบเรียลไทม์ ยืนยันว่าทุกไฟล์ที่กล่าวถึงมีตัวตนบนเครื่องจริง ไม่ใช่ลิงก์ผีหลอก
4. **โหมดการใช้งาน (Execution Modes):**
   - `/gitpull` (ค่าเริ่มต้น): ดึงซิงก์ครบทั้ง 4 โหนดคู่หู + ตรวจสอบ Backlinks ข้ามโปรเจกต์
   - `/gitpull --single` (หรือ `--current`): ดึงเฉพาะโฟลเดอร์ปัจจุบันที่ยืนอยู่เท่านั้น
   - `/gitpull --status`: สแกนตรวจเช็คสถานะ Git ของทั้ง 4 โหนดโดยไม่ดึงไฟล์

---

## ⛔ PRE-FLIGHT CHECKLIST (กฎเหล็กก่อนรัน)
- **Mesh-First by Default (Iron Rule):** ทุกครั้งที่สั่ง `/gitpull` ให้รัน `node tools/spiderweb-gitpull.mjs` ซึ่งจะดูแลทั้ง 4 โปรเจกต์คู่หูพร้อมกัน เพื่อความสมบูรณ์ของระบบ
- **Safe Auto-Commit Before Pull:** หากมีไฟล์ Local ค้าง (Dirty Tree) ในโหนดใดก็ตาม เอนจินจะ stage และ commit อัตโนมัติ ป้องกัน Git abort หรือ merge rejection
- **Dynamic Remote Awareness:** รองรับทั้ง `origin` (GitHub) และ `vps` และสลับกิ่ง `main`/`master` ตามโครงสร้างจริงของแต่ละ repo
- **Conflict Abort Guard:** หากเกิด Rebase Conflict ให้สั่ง `git rebase --abort` ทันทีและแจ้ง User ห้ามฝืนแก้สุ่มสี่สุ่มห้า

---

## 📋 Execution Protocol (การทำงาน)

### รันผ่านเอนจิน Spiderweb อัตโนมัติ (Single Tool Call — แนะนำที่สุด)
```powershell
node tools/spiderweb-gitpull.mjs          # ซิงก์ครบ 4 โหนดคู่หู + ตรวจสอบ Backlinks ข้ามโปรเจกต์ (Default)
node tools/spiderweb-gitpull.mjs --single # ซิงก์เฉพาะโฟลเดอร์ปัจจุบัน
node tools/spiderweb-gitpull.mjs --status # ตรวจสอบสถานะทั้งเครือข่ายโดยไม่ pull
```

---

## 📑 Output Template (โครงสร้างรายงานผล)

```markdown
(Anchor First Word เช่น จัดให้มึง!, มาดูกัน, ฟังนะมึง) ซิงก์โค้ดล่าสุดเรียบร้อยแล้วทั่วทั้ง Spiderweb Mesh!

### 🛰️ 1. สถานะการ Mesh Sync (4 Core Repos)
| โหนดโปรเจกต์ | Remote / Branch | การกระทำ | สถานะ |
|---|---|---|:---:|
| **Viral VDO Editing (VVE)** | origin/main | [ผลการดึง/Auto-commit] | ✅ In sync |
| **The Viral** | origin/master | [ผลการดึง/Auto-commit] | ✅ In sync |
| **DoctorBank-Brand** | origin/master | [ผลการดึง/Auto-commit] | ✅ In sync |
| **XBrain (Command Center)** | vps/master | [ผลการดึง/Auto-commit] | ✅ In sync |

### 🔍 2. Cross-Project Reference Audit (ตรวจเช็คไฟล์จริงข้ามโปรเจกต์)
- [ชื่อเอกสาร Quick Save ล่าสุด]:
  - ✅ [ชื่อไฟล์ข้ามโปรเจกต์ 1](file:///C:/path/to/file1.ext) (มีไฟล์จริงบนเครื่อง)
  - ✅ [ชื่อไฟล์ข้ามโปรเจกต์ 2](file:///C:/path/to/file2.ext) (มีไฟล์จริงบนเครื่อง)

### 📦 3. งานล่าสุดในระบบ (Latest Deployed Context)
- **เวอร์ชันล่าสุด:** V... - [ชื่อหัวข้องาน]
- **สาระสำคัญ:** (สรุปสั้นๆ 2-3 บรรทัดว่าระบบทำอะไรเสร็จไปแล้วบ้าง)
- **🔗 แฟ้มเอกสาร & โค้ดหลัก:**
  - [ชื่อไฟล์เอกสารหลัก](file:///C:/path/to/doc.md)

### 🎯 4. สิ่งที่ค้างอยู่ / ต้องทำต่อ (The Unfinished Agenda)
- [ ] **1. [ชื่องาน 1]:** [รายละเอียดสั้นๆ + ผลกระทบ]
- [ ] **2. [ชื่องาน 2]:** [รายละเอียดสั้นๆ + ผลกระทบ]

### ⚡ 5. คำแนะนำเชิงยุทธศาสตร์ถัดไป (Strategic Next Move)
👉 **โฟกัสอันดับ 1:** [ชี้เป้า 1 ประโยคชัดๆ]
```
