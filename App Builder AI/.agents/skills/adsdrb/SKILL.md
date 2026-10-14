---
name: adsdrb
version: "1.2.0"
updated_at: "2026-10-15"
description: >-
  DoctorBank TikTok Ads Storyboard & Prompt Compiler — สร้างสตอรี่บอร์ดโฆษณา TikTok Shop 4 หมัด (Hook, Twist, Proof, CTA) พร้อม Prompt ภาพ 9:16 และ Motion Veo 3.1 คุม Master Character สองเพศ (หญิง/ชาย) 5 บริบท ล็อกขวดแก้วจริง และบังคับทบทวนสูตรสารสกัดจริง (ไม่มั่ว ไม่มโน)
---

# 🎬 Ads DRB: TikTok Ads Production Engine (`/adsdrb` v1.2.0)

เอนจินผลิตวิดีโอโฆษณา TikTok Shop (Faceless POV / UGC Commercial) สำหรับแบรนด์ **DoctorBank** โดยถอดรหัสความสำเร็จ 71 ล้านบาทจาก Nectapharma ผสานสายพาน The Viral Prompt Compiler คายไฟล์ **All-in-One Markdown Master (`.md`)** ครบจบในไฟล์เดียว: Pure Script ก้อนเดียว, ตาราง 7 คอลัมน์ทองคำสำหรับ **DrView**, และคลัง Prompt เจนภาพ 9:16 + Veo 3.1 ที่ล็อกดีเอ็นเอตัวละครสองเพศ (หญิง 30-36 / ชาย 32-38) 5 สถานการณ์ และล็อกอัตลักษณ์บรรจุภัณฑ์จริง (Master Reference Packaging)

---

## 📌 จุดโฟกัสสินค้าและภาพต้นแบบจริง (Product Focus & Packaging Ground Truth)
- **Active Hero Product:** `magnesium` — **DoctorBank Magnesium Night Plus** (ขวดแก้วชาทรงหรู ฝาเกลียว ribbed ขาว ฉลากขาวคาดน้ำเงินเข้ม แคปซูลขาวด้าน matte 2 ท่อน คลายกล้ามเนื้อ หลับลึกสู่ REM Sleep)
- **Master Reference Packshots:** โฟลเดอร์ `P:\AI\The Viral\Ads DRB\03_Production_Assets\3Ref_Master_Pack\`
  - `DRB_MAG_REF01_front_hero.png` — ขวดหน้าตรง ฉลากคมชัด โลโก้ DOCTORBANK พระจันทร์เสี้ยว
  - `DRB_MAG_REF02_angle_and_capsules.jpeg` — ขวดมุมเฉียง 3/4 และกองแคปซูลขาวด้านแท้ (2-Piece Hard Matte Shell)
- **Secondary Product:** `asta` — **DoctorBank Asta Solar Prime** (AstaReal 6mg นำเข้าจากญี่ปุ่น ต้านแดด ซอฟต์เจลทับทิมใส)
- **WIP Product:** `gluta` — **DoctorBank Liposomal Gluta Prime** *(กำลังพัฒนาสูตรและ CI ทางการ)*

---

## 🧪 กฎเหล็กข้อที่ 0: ทบทวนสูตรและสารสกัดของจริงก่อนเขียน (Grounding Protocol — ห้ามมั่ว ห้ามมโน)

ก่อนเริ่มคิดสคริปต์ เขียนประโยคขาย หรือเจน Prompt ใดๆ Agent **ต้องทบทวนสเปกสารสกัดจริง** จาก Product Memory เสมอ ห้ามแต่งสารสกัดเองเด็ดขาด:

### ตารางสารสกัดและปริมาณมิลลิกรัมจริงของ Magnesium Night Plus (Dose: 2 เม็ดก่อนนอน):
| สารสกัด / สิทธิบัตร | ปริมาณ (mg) | บทบาทหน้าที่ทางวิทยาศาสตร์ |
|:---|:---:|:---|
| **Magnesium Bisglycinate Chelate** | **350 mg** | ดูดซึมตรง คลายกล้ามเนื้อลึก อ่อนโยนต่อกระเพาะ ไม่ทำให้ถ่ายเหลว |
| **Magnesium Amino Acid Chelate** | **200 mg** | เสริมคอมเพล็กซ์แร่ธาตุแมกนีเซียมคีเลตให้ครอบคลุม |
| **Magnesium Citrate** | **60 mg** | สนับสนุนการดูดซึมและการคลายตัวของเส้นประสาท |
| **Magnesium Malate** | **20 mg** | ฟื้นฟูกล้ามเนื้อระดับเซลล์ (Mitochondrial ATP) |
| **รวม Magnesium Complex** | **630 mg** | **ให้เนื้อแร่ธาตุแมกนีเซียมจริง (Elemental Mg) ≈ 161.8 mg** |
| **L-Theanine (AlphaWave® USA)** | **200 mg** | **Hero Calming:** กระตุ้นคลื่น Alpha Brainwave ตัดสวิตช์สมองคิดวน |
| **PharmaGABA® (Japan)** | **125 mg** | **Hero Sleep Onset:** สารสื่อประสาทผ่อนคลาย เร่งการเข้าสู่การนอนหลับธรรมชาติ |
| **Zinc Amino Acid Chelate (NovoMin®)** | **25 mg** | โคแฟกเตอร์สร้างสารสื่อประสาทและฟื้นฟูระบบร่างกาย |
| **Vitamin B6 (Pyridoxine HCl)** | **2 mg** | วิตามินสนับสนุนการเปลี่ยน Serotonin และ GABA ในสมอง |

### กฎการสื่อสารและการเคลม (Compliance Guardrails):
- **100% Non-Melatonin:** ไม่กดฮอร์โมนธรรมชาติ ไม่ทำให้ร่างกายดื้อ ตื่นเช้ามาสมองไบรท์ ไม่อึน ไม่แฮงก์ (Zero Brain Fog)
- **Non-Drug:** เน้นคำว่า *"ตัวช่วยตัดสวิตช์สมอง คลายกล้ามเนื้อลึก สู่ REM Sleep หลับลึก"* — **ไม่ใช่ยานอนหลับ ไม่กดประสาท**
- ❌ **ห้ามเคลมรักษาโรคนอนไม่หลับ (Insomnia Cure)** หรือใช้คำว่า "รักษา", "หายขาด"
- ❌ **ห้ามการันตีเวลาการหลับ** เช่น "หลับปุ๋ยใน 5 นาที" หรือ "หลับลึก 100% แน่นอน"
- ❌ **ห้ามเคลมฮอร์โมนเพศชาย / Testosterone**
- ❌ **ห้ามมั่วสารสกัดที่ไม่มีจริง** เช่น คาโมมายล์, เมลาโทนิน, รากวาเลอเรียน เด็ดขาด!
- **ราคาจำหน่ายจริง TikTok Shop:** 1 ขวด 890.- / เซตคู่ 2 ขวด 1,590.- (Hero SKU / มีคูปอง -100 เหลือ 1,490.-) / เซต 4 ขวด 2,670.-

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
/adsdrb [product] [style] [gender] [location] [script_or_idea]
```

- **gender:** `female` (The Relatable High-Performer หญิง 30-36 ปี) หรือ `male` (The Modern Executive ชาย 32-38 ปี) — ค่าเริ่มต้น: `female`
- **location:** `bedside` (ข้างเตียง), `wfh` (โต๊ะทำงาน), `kitchen` (ครัว/แพนทรี), `living_room` (โซฟา), `commute` (ในรถ) — ค่าเริ่มต้น: `bedside`

### ตัวอย่างการสั่งงาน:
1. **รันสินค้าหลัก (Magnesium) สไตล์ผู้บริหารชาย ทำงานดึก WFH (The Silent Tension):**
   ```text
   /adsdrb magnesium sensory male wfh
   ```
2. **รันหญิงทำงาน พักผ่อนบนโซฟาห้องนั่งเล่น:**
   ```text
   /adsdrb magnesium sensory female living_room
   ```
3. **รันพร้อมใส่สคริปต์ของตัวเอง:**
   ```text
   /adsdrb magnesium sensory female bedside "ใครเป็นบ้างคะ หัวถึงหมอนแต่ในหัวยังรันงานวนไม่หยุด..."
   ```

---

## ⚙️ ขั้นตอนการทำงานของ Agent (Agent Execution Steps)

เมื่อได้รับคำสั่ง `/adsdrb` ให้ Agent ทำตามขั้นตอนนี้:

1. **ถอดพารามิเตอร์:**
   - ตรวจสอบ `product`: ถ้าไม่ระบุ ให้ใช้ `magnesium` เป็นค่าเริ่มต้น
   - ตรวจสอบ `style`: ถ้าไม่ระบุ ให้ใช้ `sensory` เป็นค่าเริ่มต้น
   - ตรวจสอบ `gender`: `female` หรือ `male` (ค่าเริ่มต้น: `female`)
   - ตรวจสอบ `location`: `bedside`, `wfh`, `kitchen`, `living_room`, `commute` (ค่าเริ่มต้น: `bedside`)
   - ตรวจสอบ `script`: ถ้าผู้ใช้ระบุสคริปต์ ให้ใช้สคริปต์นั้น ถ้าผู้ใช้ให้แค่คีย์เวิร์ด/หัวข้อ ให้ Agent แต่งสคริปต์ภาษาไทยตามสูตรยอดขายอันดับ 1 (Hook 0-3.5s -> Twist 3.5-7.5s -> Proof 7.5-11.5s -> Duo Pack CTA 11.5-15s)

2. **รันคำสั่ง Master Compiler:**
   ```powershell
   python "P:\AI\The Viral\Ads DRB\tools\drb_compiler.py" --product <product> --style <style> --gender <gender> --location <location> --id <CAMPAIGN_ID> --script "<SCRIPT_TEXT>"
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
