---
name: sendall
description: Spiderweb Mesh Universal Skill Broadcaster — สกิลกระจายและซิงก์สกิลข้าม 13 โปรเจกต์ทั่วทั้งจักรวาล Spiderweb Mesh อัตโนมัติในคำสั่งเดียว ก๊อปปี้ไฟล์จาก XBrain ไปยังทุกโปรเจกต์ดาวเทียม + Global Config + Master Backup พร้อมระบบ Targeted Git Staging ล็อกเป้าเฉพาะไฟล์สกิล และ Auto-Push ขึ้น GitHub (`origin`) และ VPS ทันที ปลอดภัย 100% ไร้ความเสี่ยงต่อโค้ด WIP ใช้เมื่อ: /sendall [skill_name] หรือ /sendall [skill_name] --dry-run
---

# 🕷️ Skill: `/sendall` (Spiderweb Mesh Universal Skill Broadcaster)

## 📌 วัตถุประสงค์
เมื่อมีการสร้างหรืออัปเกรดสกิลใน **XBrain (`C:\XBrain\.agents\skills\<skill_name>`)** และต้องการส่งต่อให้ **ทุกโปรเจกต์ดาวเทียมในเครือข่าย Spiderweb (13 โหนด)** ได้ใช้งานทันที พร้อมอัปเดตขึ้น GitHub และ VPS เพื่อให้เครื่อง **PC Home** ซิงก์ได้ทันทีผ่าน `/gitpull`

---

## ⚡ ไวยากรณ์การสั่งใช้งาน (Usage Syntax)

```powershell
/sendall [skill_name]              # กระจายสกิล + Targeted Staging + Commit & Push ทันที (โหมดปกติ)
/sendall [skill_name] --dry-run    # ซ้อมรบเสมือนจริง ตรวจสอบไฟล์ที่จะถูกแตะโดยไม่เซฟจริง
/sendall [skill_name] --no-push    # ก๊อปปี้และ Commit ลง Local Git เท่านั้น ยังไม่ยิง Push
```

**ตัวอย่างจริง:**
- `/sendall tt` ➔ กระจายสกิล TikTok Trend Intelligence Engine ไปทุกโปรเจกต์
- `/sendall flow` ➔ กระจายสกิล FlowKit Automation
- `/sendall save` ➔ กระจายระบบ Turbo Save Pipeline
- `/sendall tsc --dry-run` ➔ จำลองการส่งสกิล Transcript Fetcher

---

## 🛡️ กฎเหล็กความปลอดภัย 3 ประการ (Iron Safety Rules)

1. **Targeted Staging Whitelist Armor:**
   - ⛔ **ห้ามสั่ง `git add .` เด็ดขาดในทุกโปรเจกต์ดาวเทียม**
   - สคริปต์จะใช้ `git status --porcelain -uall` และกรองเฉพาะ Path ที่ตรงกับ `.agents/skills/<skill_name>/` เท่านั้น
   - โค้ดงานจริงหรือไฟล์ดราฟต์ (WIP) ที่ผู้ใช้ทำค้างไว้ในโปรเจกต์อื่นจะไม่ถูกแตะต้อง 100%
2. **Multi-Remote & Branch Dynamic Detection:**
   - ตรวจจับ Remotes ที่มีจริง (`origin`, `vps`) และ Active Branch (`master` หรือ `main`) ของแต่ละโหนดอัตโนมัติ
3. **Multi-Tier Broadcast Coverage:**
   - กระจายลง 3 ระดับเสมอ:
     1. 13 โหนดโปรเจกต์ (ตาม `docs/project_index_spiderweb.json` รวมโฟลเดอร์ย่อยใน `MyProjects`)
     2. Global IDE Config (`C:\Users\Admin\.gemini\config\skills\<skill_name>`)
     3. The Viral Master Backup (`P:\AI\The Viral\ag_skills_backup\<skill_name>`)

---

## 🚀 ขั้นตอนการทำงานสำหรับ Agent (Single Tool Call Execution)

เมื่อผู้ใช้พิมพ์คำสั่ง `/sendall [skill_name]` Agent ต้องทำตามขั้นตอนต่อไปนี้:

1. **รัน Single Node Orchestrator เพียง 1 คำสั่งถ้วน:**
   เรียก `run_command` ใน root directory `C:\My Claw\Openclaw-VPS`:
   ```powershell
   node tools/spiderweb-sendall.js "<skill_name>"
   ```
   *(หากผู้ใช้ระบุ `--dry-run` หรือ `--no-push` ให้ส่งต่อแฟล็กนั้นไปด้วย)*

   > ⛔ **CRITICAL PARAMETER:**
   > ต้องตั้งค่า `WaitMsBeforeAsync: 10000` (10 วินาที) เสมอ เพื่อให้คำสั่งรันจบแบบ Synchronous หรือส่งเข้า Background อย่างปลอดภัย

2. **แสดงผล Audit Dashboard:**
   นำตาราง Markdown สรุปสถานะรายโปรเจกต์จาก Output ของสคริปต์มาแสดงให้ผู้ใช้เห็นชัดเจน:
   - รายชื่อโปรเจกต์
   - จำนวนไฟล์ที่สเตจ
   - Commit Hash
   - ปลายทาง Remote และสถานะ Push
