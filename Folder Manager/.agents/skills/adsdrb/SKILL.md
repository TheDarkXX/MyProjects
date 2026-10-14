---
name: adsdrb
version: "1.0.0"
updated_at: "2026-10-14"
description: >-
  DoctorBank TikTok Ads Storyboard & Prompt Compiler — สร้างสตอรี่บอร์ดโฆษณา TikTok Shop 4 หมัด (Hook, Twist, Proof, CTA) พร้อม Prompt ภาพ 9:16 และ Motion Veo 3.1 สำหรับ DoctorBank Magnesium Night Plus
---

# 🎬 Ads DRB: TikTok Ads Production Engine (`/adsdrb` v1.0.0)

เอนจินผลิตวิดีโอโฆษณา TikTok Shop (Faceless POV / UGC Commercial) สำหรับแบรนด์ **DoctorBank** โดยถอดรหัสความสำเร็จ 71 ล้านบาทจาก Nectapharma ผสานสายพาน The Viral Prompt Compiler คายไฟล์ **All-in-One Markdown Master (`.md`)** ครบจบในไฟล์เดียว: Pure Script ก้อนเดียว, ตาราง 7 คอลัมน์ทองคำสำหรับ **DrView**, และคลัง Prompt เจนภาพ 9:16 + Veo 3.1

---

## 📌 จุดโฟกัสสินค้า (Product Focus)
- **Active Hero Product:** `magnesium` — **DoctorBank Magnesium Night Plus** (ขวดแก้วชาทรงหรู ฝาเกลียว ribbed ขาว ฉลากขาวคาดน้ำเงินเข้ม แคปซูลขาวด้าน matte 2 ท่อน คลายกล้ามเนื้อ หลับลึกสู่ REM Sleep)
- **Secondary Product:** `asta` — **DoctorBank Asta Solar Prime** (AstaReal 6mg นำเข้าจากญี่ปุ่น ต้านแดด ซอฟต์เจลทับทิมใส)
- **WIP Product:** `gluta` — **DoctorBank Liposomal Gluta Prime** *(กำลังพัฒนาสูตรและ CI ทางการ)*

---

## 🎨 4 พรีเซ็ตสไตล์ภาพ (Visual Presets)
1. `sensory` *(แนะนำสำหรับ Magnesium)*: อาการเจ็บจริง/ทรมานจริง เช่น หัวถึงหมอนแล้วคิดงานวน นอนไม่หลับ เอามือกุมขมับ จ้องเพดานในห้องนอนมืดสลัว (ต้นแบบคลิป 9.1 แสน)
2. `athlete`: กิจกรรมกลางแจ้ง หรือนักวิ่ง/สายออกกำลังกาย นั่งนวดกล้ามเนื้อขาที่เมื่อยล้าหลังซ้อมตอนหัวค่ำ (ต้นแบบคลิป 7.4 แสน)
3. `myth_lab`: โต๊ะแล็บคลีน เครื่องแก้วทดลอง แสงขาว 5000K โชว์ผลวิเคราะห์ฟอร์มคีเลตดูดซึมตรง (ต้นแบบคลิป 4.2 แสน)
4. `ugc_daily`: วิถีชีวิตประจำวัน โต๊ะข้างเตียงยามค่ำคืน มุมมอง POV แก้วน้ำวางข้างขวด (ดูจริงใจ ไร้การประดิษฐ์)

---

## 💻 วิธีเรียกใช้งานคำสั่ง (How to Trigger)

### รูปแบบคำสั่ง:
```text
/adsdrb [product] [style] [script_or_idea]
```

### ตัวอย่างการสั่งงาน:
1. **รันสินค้าหลัก (Magnesium) สไตล์นอนไม่หลับ (Sensory) สูตรยอดขายอันดับ 1:**
   ```text
   /adsdrb magnesium sensory
   ```
2. **รันพร้อมใส่สคริปต์ของตัวเอง:**
   ```text
   /adsdrb magnesium sensory "ใครเป็นบ้างคะ หัวถึงหมอนแต่ในหัวยังรันงานวนไม่หยุด พลิกตัวเป็นชั่วโมงก็ไม่หลับ..."
   ```
3. **รันสไตล์นักวิ่งฟื้นฟูกล้ามเนื้อ:**
   ```text
   /adsdrb magnesium athlete
   ```

---

## ⚙️ ขั้นตอนการทำงานของ Agent (Agent Execution Steps)

เมื่อได้รับคำสั่ง `/adsdrb` ให้ Agent ทำตามขั้นตอนนี้:

1. **ถอดพารามิเตอร์:**
   - ตรวจสอบ `product`: ถ้าไม่ระบุ ให้ใช้ `magnesium` เป็นค่าเริ่มต้น
   - ตรวจสอบ `style`: ถ้าไม่ระบุ ให้ใช้ `sensory` เป็นค่าเริ่มต้น
   - ตรวจสอบ `script`: ถ้าผู้ใช้ระบุสคริปต์ ให้ใช้สคริปต์นั้น ถ้าผู้ใช้ให้แค่คีย์เวิร์ด/หัวข้อ ให้ Agent แต่งสคริปต์ภาษาไทยตามสูตรยอดขายอันดับ 1 (Hook 0-3.5s -> Twist 3.5-7.5s -> Proof 7.5-11.5s -> Duo Pack CTA 11.5-15s)

2. **รันคำสั่ง Master Compiler:**
   ```powershell
   python "P:\AI\The Viral\Ads DRB\tools\drb_compiler.py" --product <product> --style <style> --id <CAMPAIGN_ID> --script "<SCRIPT_TEXT>"
   ```

3. **ผลลัพธ์ที่ได้ (All-in-One Master Output - Clean 2-Section Structure):**
   - 📝 **Markdown Master File (`.md`):** `P:\AI\The Viral\Ads DRB\02_Creative_Blueprint\Storyboards\<CAMPAIGN_ID>_production_table.md`
     - **Section 1: Pure Voiceover Script** เป็นพารากราฟข้อความธรรมดา อ่านง่าย คัดลอกไปลง ElevenLabs / CapCut ได้ทันที (ไม่มี Code Block)
     - **Section 2: Master Shot Table** ในบล็อก ````tsv ```` เพื่อให้ DrView ดักจับและเรนเดอร์เป็น **Interactive Excel-Grade Spreadsheet** ทันที (คลิกลากเซลล์, สลับ `⚡ Prompts Only`, ย่อ-ขยายแถว `📏 Compact`, ฮอตคีย์ `Ctrl+C`)
     - **Thanwa & Squid Game Prompt Standard:** ทุก Prompt มี Prefix รหัสช็อตนำหน้า (เช่น `[MAG01-S01]`) และแบ่งหมวดหมู่ด้วย Semantic Tags `(Shot): ... (Subject): ... (Lighting & Atmosphere): ... (Quality): 4k master.` โดยใช้เครื่องหมายจุด `.` คั่นหมวด
   - 🌐 **Interactive Board:** `P:\AI\The Viral\Ads DRB\02_Creative_Blueprint\Storyboards\<CAMPAIGN_ID>_storyboard.html`

4. **รายงานผลต่อผู้ใช้:**
   - สรุปสเปกแคมเปญและสินค้า
   - แสดงตาราง 7 คอลัมน์ทองคำ (`ID`, `Beat`, `Timing`, `ภาพหน้าจอ`, `เสียงพากย์`, `Image Prompt`, `Motion Prompt`)
   - ใส่ Link ไปยังไฟล์ Markdown Master File
   - ย้ำกฎเหล็ก **Duo Pack CTA** (วางขวดคู่ 2 ขวดเสมอเพื่อเพิ่ม AOV) และ **TikTok UI Safe Zone** (เว้นซ้ายล่างสำหรับตะกร้าเหลือง)
