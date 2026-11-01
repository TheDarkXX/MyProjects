---
name: drview
description: >-
  DoctorBank DrView & IDE Editor Associations Sentinel — สกิลตรวจสอบและซ่อมแซมคอนฟิกระบบเปิดไฟล์ของ Antigravity IDE และ VS Code ในคำสั่งเดียว บังคับใช้ค่า Default สำหรับไฟล์ Markdown ทั่วไป (.md), รูปภาพ (Image Studio), และวิดีโอ (Video Studio) ให้เปิดด้วย DrView 100% พร้อมปกป้องไฟล์ Implementation Plan และ Brain Artifacts ให้เปิดด้วย Antigravity Artifact View ดั้งเดิม (มีปุ่ม Proceed และ Comment Box) พร้อมระบบสกัดกั้น Office Viewer อัตโนมัติ
---

# 🩺 DrView Sentinel & Editor Association Manager (`/drview`)

> **Executive TL;DR Card**  
> สกิลตรวจสอบ ซ่อมบำรุง และล็อกคอนฟิกการเปิดไฟล์บน Antigravity IDE และ VS Code ทั่วทุกโปรเจกต์:  
> 1. **ไฟล์ `.md` ทั่วไป:** ล็อกให้เปิดด้วย **DrView Markdown Viewer** (TOC, Table, YAML Frontmatter)  
> 2. **ไฟล์รูปภาพ (.png, .jpg, .webp, .svg, ฯลฯ):** ล็อกให้เปิดด้วย **DrView Image Studio** (Filmstrip, Session Scope, Zoom/Pan)  
> 3. **ไฟล์วิดีโอ (.mp4, .mov, .webm, ฯลฯ):** ล็อกให้เปิดด้วย **DrView Video Studio** (VLC 200% Super Boost, Capsule Dock)  
> 4. **Implementation Plan & Brain Artifacts:** ล็อกให้เปิดด้วย **Antigravity Artifact View** ดั้งเดิม (ปุ่ม `[ Proceed ]` และกล่องแสดงความเห็นไม่หาย)  
> 5. **สกัดกั้น Office Viewer Hijacking:** ตอนเขี้ยวเล็บ `cweijan.vscode-office` ป้องกันการแย่งเปิดไฟล์ Markdown อัตโนมัติ

---

## 🚀 วิธีเรียกใช้งาน (Usage Commands)

| คำสั่ง | พฤติกรรมของระบบ |
|---|---|
| `/drview` หรือ `/drview fix` | **Audit & Auto-Repair (Default):** ตรวจสอบสถานะและซ่อมแซมคอนฟิก `settings.json`, ตอนเขี้ยวเล็บ Office Viewer, และรายงานผลสรุปทันที |
| `/drview check` หรือ `/drview status` | **Audit Only (Read-Only):** สแกนตรวจสอบความถูกต้องของคอนฟิกโดยไม่มีการเขียนทับไฟล์ |

---

## 📋 เบื้องหลังการทำงาน (Core Mechanics)

### 1. กฎการจับคู่ไฟล์ (Master Association Table)
ระบบจะตรวจสอบและเขียนค่าลงใน `workbench.editorAssociations` ของ `Antigravity IDE` และ `Code` ดังนี้:

```json
"workbench.editorAssociations": {
    "**/.gemini/**/brain/**/*.md": "antigravity.artifactEditor",
    "**/brain/**/*.md": "antigravity.artifactEditor",
    "*implementation_plan*.md": "antigravity.artifactEditor",
    "**/implementation_plan*.md": "antigravity.artifactEditor",
    "**/Implementation_Plan*.md": "antigravity.artifactEditor",
    "*plan*.md": "antigravity.artifactEditor",
    "antigravity:/**/*.md": "antigravity.artifactEditor",
    "jetski-artifact:/**/*.md": "antigravity.artifactEditor",
    "*.md": "drview.mdViewer",
    "*.png": "drview.imageViewer",
    "*.jpg": "drview.imageViewer",
    "*.jpeg": "drview.imageViewer",
    "*.webp": "drview.imageViewer",
    "*.gif": "drview.imageViewer",
    "*.svg": "drview.imageViewer",
    "*.bmp": "drview.imageViewer",
    "*.ico": "drview.imageViewer",
    "*.avif": "drview.imageViewer",
    "*.mp4": "drview.videoViewer",
    "*.mov": "drview.videoViewer",
    "*.webm": "drview.videoViewer",
    "*.mkv": "drview.videoViewer",
    "*.m4v": "drview.videoViewer",
    "*.avi": "drview.videoViewer",
    "*.xlsx": "cweijan.officeViewer",
    "*.xls": "cweijan.officeViewer",
    "*.csv": "cweijan.officeViewer"
}
```

### 2. ทำไม Implementation Plan ถึงไม่ถูก DrView แย่งเปิด?
* **Glob Specificity Sorting:** กลไกภายในของ VS Code Editor Resolver จัดลำดับความสำคัญของกฎตาม **ความยาวของตัวอักษร (`pattern.length`)**
* แพทเทิร์น `*implementation_plan*.md` (ความยาว 24 ตัวอักษร) จะชนะ `*.md` (ความยาว 4 ตัวอักษร) อย่างเด็ดขาด
* เมื่อเปิดไฟล์ Implementation Plan ตัว IDE จึงส่งไฟล์เข้า `antigravity.artifactEditor` ทันที ทำให้ปุ่ม **`[ Proceed ]`** สีฟ้าและกล่องรับ Feedback ปรากฏตามปกติ
* ในขณะที่เอกสารคู่มือ บันทึก หรือ Quick Save ทั่วไป จะจับคู่กับ `*.md` และเปิดเข้า DrView

### 3. Safety Bridge ใน DrView
แม้ว่าจะมีไฟล์แปลกปลอมหรือผู้ใช้กดคลิกขวา "Open With DrView" เข้ามา หากตรวจพบว่าเป็น Implementation Plan ตัว DrView จะแสดงปุ่ม **`🚀 Artifact`** สีฟ้าโดดเด่นบนแถบเครื่องมือด้านบน กดคลิกเดียวจะสลับกลับไปยัง Antigravity Artifact View ใน 0ms

---

## 🛠️ CLI Execution Reference

เมื่อผู้ใช้พิมพ์คำสั่ง เอเจนต์สามารถรันสคริปต์ประจำตัวของสกิลได้โดยตรง (Self-Contained ใช้งานได้ทุกโปรเจกต์ใน Spiderweb):

```powershell
# โหมด Auto-Fix (Default)
node .agents/skills/drview/scripts/drview-doctor.cjs

# โหมด Check Only
node .agents/skills/drview/scripts/drview-doctor.cjs --check

# (ทางเลือกสำหรับ XBrain)
node tools/drview-doctor.cjs
```

