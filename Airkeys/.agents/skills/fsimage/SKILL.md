---
name: fsimage
version: "2.1.0"
updated_at: "2026-10-29"
description: >-
  Gemini Imagen 3 & Nano Banana Sub-Agent Worker — เจนภาพ Mockup สินค้า, ภาพอ้างอิง Storyboard,
  Visual Pitch และ Image-to-Image (Ref) ด้วย Antigravity Native Engine (agy.exe) ฟรี 100%
  ไม่กินโควตา Claude และไม่ติดค่าบริการ
  ใช้เมื่อ: /fsimage [prompt] หรือสั่งเจนภาพ mockup จากหน้าต่าง Claude Code (CC)
---

# 🎨 Skill: /fsimage (Antigravity Nano Banana Engine v2.1.0)

> [!TIP]
> **ฟรี 100% ไม่กินโควตา Claude และไม่ตัดเงินบัตรเครดิต.**
> สกิลนี้เชื่อมต่อกับ **Antigravity Native CLI (`agy.exe`)** ใช้ขุมพลังตระกูล **Nano Banana / Imagen 3** ภายใน IDE ปลอดภัยด้วย `--sandbox` และมีระบบ Auto-Fallback ไปยัง Codex GPT-Image-2 อัตโนมัติ

## จุดเด่น
- **ฟรี 100%:** ใช้สิทธิ์ Antigravity Native Engine ของ IDE ไม่ต้องเปิด Billing บน Google Cloud
- **รองรับ Image Reference:** แนบภาพอ้างอิง (`--ref`) ได้สูงสุด 3 รูป เพื่อทำ Image-to-Image หรือล็อกสไตล์ (ทดสอบจริงผ่านฉลุย)
- **ปลอดภัย & แยก Session ชัดเจน:** ทำงานภายใต้ `--sandbox` และจับคู่ไฟล์ด้วย Unique Run ID ไร้ปัญหาหยิบรูปผิดใบแม้รันพร้อมกัน
- **ข้ามโปรเจกต์ได้ 100%:** สั่งรันผ่าน Canonical Tool Path (`C:/XBrain/tools/fs-image.js`) ใช้งานได้จากทุกโปรเจกต์ดาวเทียม

## วิธีเรียกใช้
1. **ในหน้าต่าง Claude Code (CC):**
   `/fsimage [prompt]`
2. **ในหน้าต่าง Antigravity (AG):**
   `/fsimage [prompt]` หรือสั่งเอเจนต์ให้วาดภาพได้ตรงๆ
3. **ผ่าน Terminal / Node.js (ใช้ได้จากทุกโปรเจกต์):**
   `node "C:/XBrain/tools/fs-image.js" -p "<prompt>" -o "<out.jpg>" --ar 9:16`
   `node "C:/XBrain/tools/fs-image.js" -p "<prompt>" --ref "<ref_image.jpg>" --ar 1:1`

## CLI Parameters
- `-p`, `--prompt`: คำอธิบายภาพภาษาอังกฤษ (Prompt คมชัด)
- `-o`, `--out`: พิกัดบันทึกไฟล์ (ค่าเริ่มต้น: `scratch/fsimage/fsimg_<timestamp>.jpg`)
- `-s`, `--session`: ชื่อ Session เพื่อแยกโฟลเดอร์เป็นสัดส่วน (เช่น `-s gameboy` จะเซฟลง `scratch/sessions/gameboy/`)
- `--ar`, `--aspect-ratio`: สัดส่วนภาพ (ค่าเริ่มต้น: `9:16`, รองรับ `1:1`, `16:9`, `3:4`, `4:3`, `2:3`, `3:2`)
- `-r`, `--ref`: ไฟล์ภาพอ้างอิงสำหรับ Image-to-Image (ใส่ได้สูงสุด 3 ภาพ)
- `-e`, `--engine`: `ag` (Antigravity Nano Banana, ค่าเริ่มต้น) หรือ `gpt` (Codex DALL-E 3) หรือ `auto`
