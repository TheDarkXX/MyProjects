# 🧠 Memory: App Builder AI

## 📋 Project Purpose
คลังเก็บข้อมูล, prompts, และ tool designs สำหรับสร้าง custom Tools (mini-apps) บน Google Flow (flow.google)

## 🔧 Google Flow Tools Workflow
1. เข้า [flow.google](https://flow.google) → เปิด/สร้าง Project
2. Sidebar → **Tools** → **Create Tool**
3. พิมพ์ prompt อธิบาย tool ที่ต้องการ (ภาษาอังกฤษ)
4. กด **Generate** → รอ AI สร้าง interface + logic
5. Review → **Save** → ใช้งานได้ทันทีใน project

## 📝 Naming Convention
- Tool folders: `[Category]-[Name]` เช่น `image-grayscale-filter`, `video-thumbnail-gen`
- Prompt files: `prompt-v1.md`, `prompt-v2.md` (version ตาม iteration)
- Config files: `config.json` หรือ `settings.md`

## ⚠️ Limitations (จาก Research)
- Tools ทำงานภายใน Google Flow platform เท่านั้น — ไม่ support external API integrations
- Media ที่ generate ผ่าน Tool ใช้ Google Flow credits
- Tools สามารถ share publicly หรือ remix จากคนอื่นได้

## 📚 Lessons Learned
<!-- เพิ่มไปเรื่อยๆ เมื่อเจอ insight ใหม่ -->
