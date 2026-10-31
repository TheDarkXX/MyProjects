---
name: fs
version: "1.0.0"
updated_at: "2026-10-28"
description: >-
  Flash Sub-Agent Worker — เรียกใช้งาน Gemini Flash 3.8 High (และ 3.6 Cascade)
  ช่วยปั่นโค้ด งานกรรมกร แปลงไฟล์ วิเคราะห์ข้อมูล หรือสเกลงานหนักๆ โดยไม่เปลืองโควต้าและฟรี 100%
---

# ⚡ Skill: /fs (Flash Sub-Agent Worker v1.0.0)

## Objective
เรียกใช้ **Gemini Flash 3.8 High (พร้อม Cascade Failover ไป 3.6/3.7)** ทำหน้าที่เป็น Sub-Agent หรือ Worker กรรมกร ปั่นงาน เขียนโค้ด แปลงข้อมูล หรือร่างโครงสร้างไฟล์ โดยไม่ต้องเผาโควต้า Anthropic Claude Pro $20 แม้แต่ token เดียว และให้ความเร็วระดับ 1.5 - 3 วินาที

รองรับการเรียกใช้ได้จากทุกหน้าต่าง:
1. **ในหน้าต่าง Antigravity (AG):** พิมพ์ `/fs [คำสั่งหรือโค้ดที่ต้องการ]`
2. **ในหน้าต่าง Claude Code (cc):** พิมพ์ `/fs [คำสั่ง]` (ผ่าน `.claude/commands/fs.md`)
3. **ใน Terminal / PowerShell:** พิมพ์ `fs "คำสั่ง"` หรือ `node tools/flash-worker.js [ตัวเลือก]`

---

## 📋 Execution Protocol (ขั้นตอนการทำงาน)

### Step 1: Parse Request & Target Files
วิเคราะห์คำสั่งของผู้ใช้:
1. **งานถาม-ตอบ/วิเคราะห์เนื้อหาทั่วไป:**
   - ใช้โหมด Direct Prompt
2. **งานเขียนไฟล์/แก้โค้ดดิบ (Code Drafting/Refactoring):**
   - ระบุไฟล์ต้นทาง (`-f <source_file>`) หากมี
   - ระบุไฟล์ปลายทาง (`-o <output_file>`)
   - ใช้แฟล็ก `--code` เสมอ เพื่อให้ตัดบล็อก markdown wrapper ออกและเซฟโค้ดดิบลงไฟล์ทันที

### Step 2: Execute Flash Worker
รันคำสั่งผ่าน `tools/flash-worker.js`:

```powershell
# 1. เขียนโค้ดลงไฟล์ปลายทางโดยตรง (ประหยัดเวลา ไม่ต้อง manual copy)
node tools/flash-worker.js --code -p "<prompt>" -o "<target_file>"

# 2. แก้ไขโค้ดเดิมโดยส่งไฟล์ต้นทางไปเป็น Context
node tools/flash-worker.js --code -f "<source_file>" -p "<instructions>" -o "<target_file>"

# 3. ถาม-ตอบหรือขอคำแนะนำทั่วไป
node tools/flash-worker.js "<prompt>"
```

### Step 3: Verification Gate (Gate Function)
หลังจาก Flash ทำงานเสร็จ:
1. ตรวจสอบไฟล์ผลลัพธ์ว่าถูกสร้างหรือเขียนอย่างถูกต้อง (`view_file` หรือ `Test-Path`)
2. ตรวจสอบ syntax หรือ lint หากเป็นไฟล์โปรแกรมมิ่ง
3. รายงานสรุปผลให้ผู้ใช้ทราบทันที พร้อมระบุ Model ที่ถูกใช้ และเวลาที่ใช้รัน (Latency)

---

## 📑 Output Template

```markdown
(Anchor First Word เช่น กูจัดให้!, ลุยเลยมึง!) Flash Worker ปั่นงานเสร็จเรียบร้อย!

### ⚡ รายละเอียดการประมวลผล
- **Model:** `gemini-3.8-flash` (หรือ fallback 3.6)
- **Target File:** `[ไฟล์ปลายทาง]`
- **Status:** สำเร็จ (0 Claude Tokens Burned)

### 📋 ผลงานที่ได้
[สรุปสั้นๆ ว่าสร้างหรือแก้อะไรไป พร้อม clickable file link]
```
