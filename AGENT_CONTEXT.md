# 🏠 MyProjects — Agent Router

> **อ่านไฟล์นี้ก่อนเสมอ** เมื่อ Agent เข้ามาทำงานที่ MyProjects root

## ⛔ Iron Rule: Project Focus Lock

เมื่อเปิด session ใหม่ที่ root:

1. **ถ้า User ระบุโปรเจกต์ตั้งแต่แรก** → Lock ทันที → อ่าน `[Project]/AGENT_CONTEXT.md` + `[Project]/memory.md`
2. **ถ้าไม่ระบุ** → Agent MUST ถามก่อน: "ตอนนี้จะทำงานโปรเจกต์ไหนครับ?"
3. **เมื่อ Lock แล้ว** → ทุก path (save, qc, skill) scope ไปที่โปรเจกต์นั้น
4. **ถ้า User เปลี่ยนโปรเจกต์กลาง session** → Agent ต้อง Re-Lock + อ่าน context ใหม่
5. **ห้ามเขียนไฟล์นอก scope** ของโปรเจกต์ที่ Lock ไว้ โดยไม่แจ้ง User ก่อน

## 📂 Projects

| Project | Path | ประเภท | สถานะ |
|---------|------|--------|-------|
| **DoctorBank Band** | `DoctorBank-Band/` | Brand/Business | ✅ Active |

## 📜 Memory Inheritance

```
🌍 Global: Openclaw-VPS/AGENTS.md (Iron Rules ทั้งหมด)
    ↓
🏠 Root: MyProjects/AGENT_CONTEXT.md (Focus Protocol + Router)
    ↓
📁 Project: [Project]/AGENT_CONTEXT.md + memory.md (กฎเฉพาะโปรเจกต์)
    ↓
📦 Sub-project: [Project]/Products/[Name]/PRODUCT_MEMORY.md (กฎเฉพาะสินค้า)
```

> ⚠️ **กฎ Override:** กฎชั้นล่าง Override กฎชั้นบนเสมอ

## 🔗 Essential Files
- ดัชนีสกิล: [ag_skills_backup/AG_SKILLS_INDEX.md](ag_skills_backup/AG_SKILLS_INDEX.md)
- Global Rules: [Openclaw-VPS/AGENTS.md](file:///c:/My%20Claw/Openclaw-VPS/AGENTS.md)
- User Profile: [Openclaw-VPS/USER.md](file:///c:/My%20Claw/Openclaw-VPS/USER.md)

## 🔄 System Integration
- **Git:** MyProjects เป็น 1 repo — `git push` ครั้งเดียว sync ทุกโปรเจกต์
- **Openclaw-VPS Sync:** Quick Save sync ไป `Openclaw-VPS/Quick Save/` เพื่อ search-manifest (ศูนย์บัญชาการ)
- **Quick Save:** อยู่ที่ root level `MyProjects/Quick Save/` แยก subfolder ตามโปรเจกต์
