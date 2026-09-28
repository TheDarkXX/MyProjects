---
name: sendall
version: "1.1.0"
updated_at: "2026-09-28"
description: Spiderweb Mesh Universal Skill Broadcaster & Matrix Auditor — สกิลกระจายและซิงก์สกิลข้าม 13 โปรเจกต์ทั่วทั้งจักรวาล Spiderweb Mesh อัตโนมัติในคำสั่งเดียว รองรับทั้งรายสกิลและโหมดเหมาเข่ง 10 Core Skills (`--core`) ก๊อปปี้ไฟล์จาก XBrain ไปยังทุกโปรเจกต์ดาวเทียม + Global Config + Master Backup พร้อมระบบ Targeted Git Staging ล็อกเป้าเฉพาะไฟล์สกิล และ Auto-Push ขึ้น GitHub (`origin`) และ VPS ทันที ปลอดภัย 100% ไร้ความเสี่ยงต่อโค้ด WIP ใช้เมื่อ: /sendall [skill_name] หรือ /sendall --core หรือ /sendall audit
---

# 🕷️ Skill: `/sendall` (v1.1.0)

## 📌 วัตถุประสงค์
เมื่อมีการสร้างหรืออัปเกรดสกิลใน **XBrain (`C:\XBrain\.agents\skills\<skill_name>`)** และต้องการส่งต่อให้ **ทุกโปรเจกต์ดาวเทียมในเครือข่าย Spiderweb (13 โหนด)** ได้ใช้งานทันที พร้อมอัปเดตขึ้น GitHub และ VPS เพื่อให้เครื่อง **PC Home** ซิงก์ได้ทันทีผ่าน `/gitpull`

---

## ⚡ ไวยากรณ์การสั่งใช้งาน (Usage Syntax)

```powershell
/sendall [skill_name]              # กระจายสกิลเดี่ยว + Targeted Staging + Commit & Push ทันที
/sendall --core                    # เหมาเข่งกระจาย 10 Core Skills รวดเดียวทั่วจักรวาล (Push รวดเดียว)
/sendall [skill1] [skill2] ...     # กระจายเฉพาะกลุ่มสกิลที่ระบุพร้อมกัน
/sendall audit                     # ตรวจสอบ Matrix เวอร์ชันสกิลทั้ง 6 โหนดหลัก (spiderweb-audit.js)
/sendall [skill_name] --dry-run    # ซ้อมรบเสมือนจริง ตรวจสอบไฟล์ที่จะถูกแตะโดยไม่เซฟจริง
/sendall [skill_name] --no-push    # ก๊อปปี้และ Commit ลง Local Git เท่านั้น ยังไม่ยิง Push
```

**ตัวอย่างจริง:**
- `/sendall --core` ➔ ซิงก์ 10 Core Skills (save, sendall, tt, tsc, flow, gpt, plan, update, gitpull, kbg) ทั้งหมดในครั้งเดียว
- `/sendall tt` ➔ กระจายสกิล TikTok Trend Intelligence Engine ไปทุกโปรเจกต์
- `/sendall audit` ➔ สแกนเช็คว่าโปรเจกต์ไหนสกิลหลุดเวอร์ชัน (Drift) หรือไม่
- `/sendall tsc --dry-run` ➔ จำลองการส่งสกิล Transcript Fetcher

---

## 🛡️ กฎเหล็กความปลอดภัย 3 ประการ (Iron Safety Rules)

1. **Targeted Staging Whitelist Armor:**
   - ⛔ **ห้ามสั่ง `git add .` เด็ดขาดในทุกโปรเจกต์ดาวเทียม**
   - สคริปต์จะใช้ `git status --porcelain -uall` และกรองเฉพาะ Path ที่ตรงกับ `.agents/skills/<target_skills>/` เท่านั้น
   - โค้ดงานจริงหรือไฟล์ดราฟต์ (WIP) ที่ผู้ใช้ทำค้างไว้ในโปรเจกต์อื่นจะไม่ถูกแตะต้อง 100%
2. **Safe Overwrite on Network Drives:**
   - ใช้กลยุทธ์ Unlink-Before-Copy เพื่อป้องกันปัญหา Windows/SMB lock หรือ filesystem caching บนไดรฟ์ภายนอก (`P:`)
3. **Multi-Tier Broadcast Coverage:**
   - กระจายลง 3 ระดับเสมอ:
     1. 13 โหนดโปรเจกต์ (ตาม `docs/project_index_spiderweb.json` รวมโฟลเดอร์ย่อยใน `MyProjects`)
     2. Global IDE Config (`C:\Users\Admin\.gemini\config\skills\<skill_name>`)
     3. The Viral Master Backup (`P:\AI\The Viral\ag_skills_backup\<skill_name>`)

---

## 🚀 ขั้นตอนการทำงานสำหรับ Agent (Single Tool Call Execution)

เมื่อผู้ใช้พิมพ์คำสั่ง `/sendall` Agent ดำเนินการดังนี้:

1. **กรณีตรวจสอบ Matrix (`/sendall audit`):**
   ```powershell
   node tools/spiderweb-audit.js
   ```

2. **กรณีซิงก์สกิล (`/sendall <args>`):**
   ```powershell
   node tools/spiderweb-sendall.js <args>
   ```
   *(ตั้งค่า `WaitMsBeforeAsync: 10000` เสมอ)*

3. **แสดงผล Audit Matrix / Broadcast Table:**
   นำตาราง Markdown สรุปผลลัพธ์มาให้ผู้ใช้เห็นสถานะแบบเรียลไทม์
