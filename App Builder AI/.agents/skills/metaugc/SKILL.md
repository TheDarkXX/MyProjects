---
name: metaugc
version: "1.1.0"
updated_at: "2026-10-21"
description: >-
  Meta AI UGC Video Production Engine — ควบคุมสายพานผลิตวิดีโอโฆษณา DoctorBank 40 วินาทีอัตโนมัติด้วย Meta AI ผ่าน 3 สเต็ปเหล็ก (Subagent Browser Handoff -> Playwright CDP 9222 -> Scene Rendering -> Master Concatenation & Auto-Sync to 00_MASTER_PREVIEWS Hub) รองรับ dry-run, resume ซีนที่ค้าง, และตรวจสอบความสมบูรณ์ของ Master MP4 ใช้เมื่อ: /metaugc [path/to/storyboard.md] หรือ /ugcvdo [คำสั่งเรนเดอร์]
---

# 🎬 Skill: `/metaugc` (Meta AI UGC Production Engine)

## 📌 วัตถุประสงค์
ควบคุมสายพานผลิตวิดีโอโฆษณาอัตโนมัติด้วย Meta AI โดยแปลงพิมพ์เขียวจาก `storyboard.md` เป็น Master Video ความยาว 40 วินาทีเต็ม (4 ซีนต่อเนื่องแบบ Chained Endframe) พร้อมระบบป้องกัน Cloudflare/Session Drop ด้วย **3 สเต็ปเหล็ก (The 3-Phase State Machine)** และส่งเข้า **Preview Hub (`00_MASTER_PREVIEWS/`)** อัตโนมัติทันที

---

## ⚡ สถาปัตยกรรม 3 สเต็ปเหล็ก (The 3-Phase State Machine)

```
                    คำสั่ง: /metaugc [storyboard.md]
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ [สเต็ปที่ 1: SESSION_BOOTSTRAP] (Subagent Browser Launch)                     │
│ 1. เรียก tool `browser_subagent` เปิดหน้า https://www.meta.ai/              │
│ 2. รอหน้าเว็บโหลดพร้อมใช้งาน แล้ว Stop Process ทันทีเพื่อ Handoff เบราว์เซอร์    │
│ ❌ ห้ามใช้ subprocess หรือ Popen เปิด Chrome โปรไฟล์เปล่าเด็ดขาด!              │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ [สเต็ปที่ 2: SCENE_RENDER] (Playwright CDP localhost:9222)                  │
│ 1. สั่งรัน Python Pipeline เข้าเกาะพอร์ต 9222 อัตโนมัติ                         │
│ 2. ยิง Prompt ซีน 1 (s1_hook) ➔ โหลดวิดีโอ ➔ ดึง Endframe                   │
│ 3. ยิง Prompt ซีน 2–4 ต่อเนื่องด้วยภาพ Endframe และภาพสินค้า 3Ref Pack        │
│ 4. รองรับ --from-scene หากต้องการเรนเดอร์ต่อจากซีนที่ค้าง                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ [สเต็ปที่ 3: ASSEMBLY & HUB SYNC] (Atomic Master Concat & Preview Mirror)   │
│ 1. ต่อ 4 คลิปเข้าด้วยกันผ่าน FFmpeg: [s1 + s2 + s3 + s4] = 40 วินาที        │
│ 2. ตรวจสอบขนาดไฟล์และความสมบูรณ์ (ต้อง > 10 MB และอ่านเฟรมได้)                 │
│ 3. บันทึกผลสำเร็จลงในตาราง Master Index และรายงานขนาดไฟล์ทันที                │
│ 4. ⚡ Auto-Sync Hub: ส่ง Master Video เข้า 00_MASTER_PREVIEWS/ อัตโนมัติ       │
│    (Smart Mirror Cache รองรับทั้ง NTFS Hardlink และ Virtual Drive อย่าง pCloud) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ วิธีการสั่งรัน (Execution Protocols)

### 1. โหมดจำลองความถูกต้อง (Safe Dry-Run)
ใช้เมื่อต้องการตรวจความถูกต้องของสคริปต์, พิกัดภาพสินค้า 3Ref, และตารางเวลา โดยไม่ต้องเปิดเบราว์เซอร์จริง:
```powershell
python "C:\My Claw\The Viral\Ads DRB\tools\meta_ugc_engine\run_full_pipeline.py" --storyboard "C:\My Claw\The Viral\Ads DRB\Campaigns\Magnesium\DRB_MAG_01_A_UGC\storyboard.md" --dry-run
```

### 2. โหมดรันจริงแบบสมบูรณ์ (Full Production Run)
เมื่อพร้อมผลิต ให้เริ่มด้วยการเปิด Session เบราว์เซอร์ก่อนเสมอ:
1. เรียก `browser_subagent` ไปยัง `https://www.meta.ai/`
2. เมื่อหน้าเว็บพร้อม ให้ส่งคำสั่ง:
```powershell
python "C:\My Claw\The Viral\Ads DRB\tools\meta_ugc_engine\run_full_pipeline.py" --storyboard "C:\My Claw\The Viral\Ads DRB\Campaigns\Magnesium\DRB_MAG_01_A_UGC\storyboard.md"
```

### 3. โหมดเรนเดอร์ต่อจากจุดที่ค้าง (Scene Resume)
หากซีน 1–2 เสร็จแล้ว และหลุดที่ซีน 3:
```powershell
python "C:\My Claw\The Viral\Ads DRB\tools\meta_ugc_engine\run_full_pipeline.py" --storyboard "C:\My Claw\The Viral\Ads DRB\Campaigns\Magnesium\DRB_MAG_01_A_UGC\storyboard.md" --from-scene 3
```

### 4. โหมดข้ามไปรวมไฟล์ Master ทันที (Concat Only)
หากได้ไฟล์ย่อย `s1.mp4` ถึง `s4.mp4` ครบแล้ว แต่ต้องการประกอบไฟล์ใหม่:
```powershell
python "C:\My Claw\The Viral\Ads DRB\tools\meta_ugc_engine\run_full_pipeline.py" --storyboard "C:\My Claw\The Viral\Ads DRB\Campaigns\Magnesium\DRB_MAG_01_A_UGC\storyboard.md" --from-step concatenate
```

### 5. โหมดซิงก์คลังพรีวิวรวม (Preview Hub Sync)
หากมีการเพิ่มหรือแก้ไขคลิปมาสเตอร์แบบ Manual หรือต้องการตรวจเช็คคลังพรีวิวรวม `00_MASTER_PREVIEWS`:
```powershell
python "C:\My Claw\The Viral\Ads DRB\tools\sync_master_previews.py"
```

---

## 🛡️ การรับมือข้อผิดพลาด (Failure Armor)

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| `Cannot connect to CDP at 127.0.0.1:9222` | ยังไม่ได้เปิดเบราว์เซอร์ผ่าน `browser_subagent` | เรียก `browser_subagent` ไปที่ `https://www.meta.ai/` เพื่อเปิดพอร์ต 9222 |
| `Missing Product Reference` | ไฟล์ภาพใน `Brand_Refs/` ถูกย้ายหรือพิมพ์ผิด | ตรวจสอบผ่าน `ads_drb_paths.py` ว่าภาพสินค้า 3Ref อยู่ครบ |
| `Meta AI Filter / Warning` | มีคำต้องห้ามเกี่ยวกับยา/เคมี/อย. | ดัดแปลงคำเคลมเป็นภาษา UGC รีวิวธรรมชาติ (ตัดคำว่า `สารสื่อประสาท`, `มี อย.`) |
| `Concat Master 0-byte` | FFmpeg หาไม่เจอหรือไฟล์ซีนย่อยไม่สมบูรณ์ | ระบบจะคงไฟล์ชั่วคราวไว้ และไม่ทับไฟล์ `master.mp4` เดิมเด็ดขาด |
| `Preview Hub Sync Notice` | ไดรฟ์ไม่รองรับ Hardlink | ระบบจะ Fallback สลับเป็น Smart Mirror Cache (ก๊อปปี้ความเร็วสูง) อัตโนมัติ |

---

## 🚀 ตัวอย่างคำสั่งใช้งาน

```text
/metaugc C:\My Claw\The Viral\Ads DRB\Campaigns\Magnesium\DRB_MAG_01_A_UGC\storyboard.md
/metaugc --storyboard DRB_MAG_02_PONG_UGC --dry-run
/ugcvdo รันเจนวิดีโอคลิป 3 ต่อจากซีนที่ 2 ให้หน่อย
```
