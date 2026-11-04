---
name: table
version: "1.0.0"
updated_at: "2026-11-04"
description: >-
  DoctorBank B-Roll Production Table Generator — แปลงสคริปต์, เสียงพากย์ Voiceover, หรือ Scene List ให้เป็นตาราง TSV Table 6 คอลัมน์มาตรฐาน (ID, Ref, Subtitle, Visual Action TH, Image Prompt, Motion Prompt) ตามสูตร Master ID เช่น MAG10-S01 (H1) พร้อมบันทึกลงไฟล์ .md โดยตรง ไม่พ่นตาราง TSV รกในแชท ใช้เมื่อ: /table [ไฟล์หรือสคริปต์]
---

# 📋 /table — B-Roll Production Table Generator (v1.0.0)

> **Slash Command:** `/table [script_or_file] [--campaign CAMPAIGN_ID]`  
> **Target Output:** ไฟล์ `.md` ที่มี **TSV Code Block แถวเดียวจบ** สำหรับคัดลอกลง Google Sheets / Excel / FlowKit  
> **Source of Truth:** [`references/BROLL_TABLE_SAMPLE.md`](references/BROLL_TABLE_SAMPLE.md) *(หรือ [`C:\My Claw\Viral VDO Editing (VVE)\references\BROLL_TABLE_SAMPLE.md`](file:///C:/My%20Claw/Viral%20VDO%20Editing%20(VVE)/references/BROLL_TABLE_SAMPLE.md))*

---

## ⛔ 2 กฎเหล็กห้ามละเมิดเด็ดขาด (Iron Mandates)

1. ❌ **Chat Silence Rule (ห้ามพ่น TSV ลงแชต):**  
   **ห้ามพิมพ์ตาราง TSV หรือ Markdown Table ลงในแชตเด็ดขาด!** ให้เขียน/อัปเดตลงไฟล์ `.md` ปลายทางเท่านั้น แล้วตอบสรุปในแชตเพียง 3-4 บรรทัด (จำนวนช็อต, สัดส่วน Ref, และลิงก์ไฟล์)
2. ❌ **No Visual Preview Table in File:**  
   ในไฟล์ `.md` **ไม่ต้องมีตาราง Markdown Table ซ้ำซ้อน** ให้ใส่เฉพาะ **TSV Code Block** (` ```tsv `) เพียงอันเดียว เพื่อให้ผู้ใช้สามารถคลิกปุ่ม Copy ของบล็อกโค้ดไปวางใน Google Sheets / Excel ได้ในคลิกเดียว

---

## 📐 โครงสร้าง 6 คอลัมน์มาตรฐาน (Gold Standard Schema)

| คอลัมน์ | ตัวอย่างค่า | บทบาท & คำอธิบาย |
|---|---|---|
| **`ID`** | `MAG10-S01 (H1)` | **สูตรมาตรฐาน:** `<CAMPAIGN_CODE>-S<เลขซีน 2 หลัก> (<BEAT>)` |
| **`Ref`** | `Person` \| `Product` \| `-` | **ตัวชี้เป้า Asset:**<br>• `Product` = แนบภาพสินค้าจริง ([`REF_BOTTLE`](file:///C:/My%20Claw/The%20Viral/Ads%20DRB/03_Production_Assets/3Ref_Master_Pack/DRB_MAG_REF01_front_hero.png))<br>• `Person` = แนบภาพตัวละคร/หน้า Influencer<br>• `-` = เจนสดจาก Text Prompt (3D CGI วิทยาศาสตร์/อวัยวะ) |
| **`Subtitle`** | เสียงพากย์ภาษาไทย | คำพูดในไทม์ไลน์ ให้รู้ว่า B-roll ช็อตนี้ต้องวางทับเสียงพากย์ประโยคไหนใน CapCut |
| **`Visual Action (TH)`** | สรุปภาพ 1 บรรทัด | สรุปภาพภาษาไทยกระชับ 1 บรรทัด สำหรับกวาดสายตาตรวจงาน |
| **`Image Prompt`** | ภาษาอังกฤษ 9:16 | สั่งเจนภาพนิ่ง Anchor Frame (ขึ้นต้นด้วย `[CAMPAIGN-Sxx]`) |
| **`Motion Prompt`** | กริยาการเคลื่อนไหว | สั่งโมชันกล้อง I2V ใน Veo 3.1 / Kling / Luma (ขึ้นต้นด้วย `[CAMPAIGN-Sxx]`) |

---

## 🏷️ รหัสบทบาทสตอรี่บอร์ด (`<BEAT>`)

- **`H` (Hook):** ช็อตหยุดนิ้ว 0–3 วินาทีแรก (ปัญหาเจ็บปวด, พฤติกรรมคุ้นเคย)
- **`D` (Danger / Pain / Myth):** ขยี้จุดเจ็บเดิม ความเชื่อผิดๆ หรืออันตรายสะสม
- **`M` (Mechanism):** กลไกการออกฤทธิ์ทางชีวเคมี / สารสกัดพระเอก
- **`T` (Treatment / Benefit):** ผลลัพธ์เชิงบวก การผ่อนคลาย หรือการฟื้นฟูระดับเซลล์
- **`G` (GABA / Specific Hero Active):** จุดเน้นสารสกัดเฉพาะเจาะจง
- **`O` (Outro / CTA):** จบสรุป วิธีทาน หรือช็อตแบรนด์

---

## 🛠️ ขั้นตอนการทำงานของ Agent เมื่อรัน `/table`

### Step 1: แตกสคริปต์เป็น Beat & ตัด A-Roll ออก
1. สแกนหาเสียงพากย์และตัดช็อตที่เป็น A-Roll (หน้าคนพูดหลักรีวิวหน้ากล้อง) ออกจากตาราง **เหลือเฉพาะคัต B-Roll 100%**
2. กำหนดรหัสซีนตามสูตร: `<แคมเปญ>-S<เลขซีน 2 หลัก> (<BEAT>)` เช่น `MAG10-S01 (H1)`

### Step 2: จัดหมวดหมู่ Asset ในช่อง `Ref`
- ถ้าเป็นภาพคน (นอนบนเตียง, ทำงาน, ตื่นนอน) ➔ ใส่ `Person`
- ถ้าเป็นภาพขวดอาหารเสริม / เม็ดแคปซูล ➔ ใส่ `Product`
- ถ้าเป็น 3D CGI สมอง, เซลล์ประสาท, กระดูก, หยดสารสกัด, บรรยากาศ ➔ ใส่ `-`

### Step 3: เขียน Prompt คู่ (Image + Motion)
- **Image Prompt:** บังคับ 9:16, ระบุแสง Studio High-Key หรือ Moody Cozy ตาม Scene, ห้ามมี Text/Watermark, **ต้องขึ้นต้นด้วย `[CAMPAIGN-Sxx]` เสมอ**
- **Motion Prompt:** ระบุการเคลื่อนไหวใน 1-2 วินาทีแรกชัดเจน (Push-in, Orbital, Drift), หลีกเลี่ยงเอฟเฟกต์แสงระเบิดลิเก, **ต้องขึ้นต้นด้วย `[CAMPAIGN-Sxx]` เสมอ**

### Step 4: บันทึกลงไฟล์ `.md`
- บันทึกไฟล์ที่: `references/storyboards/<CAMPAIGN>_broll_table.md` (หรือพาธที่ User กำหนด)
- โครงสร้างไฟล์:
  ```markdown
  # 📋 B-Roll Production Table: <CAMPAIGN>
  
  ```tsv
  ID	Ref	Subtitle	Visual Action (TH)	Image Prompt	Motion Prompt
  ...
  ```
  ```

### Step 5: ตอบกลับใน Chat (Chat Silence Compliance)
ตอบสั้นๆ ไม่พ่น TSV:
```markdown
เอาล่ะมึง! อัปเดตตาราง B-Roll เรียบร้อยแล้วที่ [filename.md](file:///path)

📊 **สรุปภาพรวม:**
- ทั้งหมด: N ช็อต
- Ref: Person N ช็อต · Product N ช็อต · เจนสด (-) N ช็อต
- คัดลอก TSV Block จากในไฟล์ไปวางลง Excel / Google Sheets ได้ทันที!
```

