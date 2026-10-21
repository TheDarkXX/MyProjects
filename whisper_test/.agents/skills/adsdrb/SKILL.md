---
name: adsdrb
version: "2.0.0"
updated_at: "2026-10-18"
description: >-
  DoctorBank TikTok Ads & UGC Video Production Engine — รองรับ 2 โหมดหลัก: 1) โหมดใหม่ /adsdrb meta (Plan B Master Anchor Chained UGC Video Engine 40s พร้อมระบบ End-Frame Chaining, Just-In-Time 2-Product Ref, และ Pacing Ceiling 110-120 ตัวอักษร) และ 2) โหมดเดิม /adsdrb classic (Thanwa 7-Column Storyboard Compiler & Veo 3.1 Motion Prompts)
---

# 🎬 Ads DRB: TikTok Ads & Chained UGC Video Engine (`/adsdrb` v2.0.0)

เอนจินผลิตวิดีโอโฆษณา TikTok Shop และ UGC Commercial สำหรับแบรนด์ **DoctorBank** อัปเกรดสู่สถาปัตยกรรม **Dual-Engine Architecture**:
1. **Engine 1 (New): `/adsdrb meta`** ➔ **Chained UGC Talking Head & Anti-Morphing Engine (30–40s)** สำหรับสร้างคลิปครีเอเตอร์รีวิวหน้ากล้องใน Meta AI ไร้รอยต่อ หน้าไม่เปลี่ยน ขวดไม่เบี้ยว ฝาไม่กลายพันธุ์ ด้วยระบบ End-Frame Chaining และ Just-In-Time Product Reference
2. **Engine 2 (Classic): `/adsdrb [product] [style]`** ➔ **Thanwa 7-Column Storyboard Compiler (15s)** สำหรับสร้างสตอรี่บอร์ดโฆษณาแนว Cinematic, CG แล็บวิจัย, และ Prompt สำหรับ Veo 3.1 / Kling

---

## 📌 จุดโฟกัสสินค้าและภาพ Master Reference จริง (Product Packaging Ground Truth)

### 🍾 2 ภาพ Master Product Reference ที่ล็อกพิกัดถาวร (Rule R34):
- **Ref 1 (ขวดจริงหน้าตรง):**  
  `C:\My Claw\The Viral\Ads DRB\03_Production_Assets\3Ref_Master_Pack\DRB_MAG_REF01_front_hero.png`  
  *(ขวดแก้วสีชาเข้มทรงกระบอก ฝาเกลียวขาว ribbed ฉลากขาวแถบน้ำเงินเข้ม โลโก้พระจันทร์เสี้ยว DOCTORBANK)*
- **Ref 2 (แคปซูลจริงขาวด้าน 2 ท่อน):**  
  `C:\My Claw\The Viral\Ads DRB\03_Production_Assets\3Ref_Master_Pack\DRB_MAG_REF02_angle_and_capsules.jpeg`  
  *(กองแคปซูลขาวนวลผิวซาติน 2-Piece Hard Shell แท้ ขนาดสมส่วน ไม่กลายพันธุ์)*

---

## 🧪 กฎเหล็กข้อที่ 0: ทบทวนสูตรและสารสกัดของจริงก่อนเขียน (Grounding Protocol)

### ตารางสารสกัดจริงของ Magnesium Night Plus (Dose: คืนละ 1 แคปซูลก่อนนอน / 1 ขวด = 1 เดือน):
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
- **Non-Drug:** เน้นคำว่า *"ตัวช่วยตัดสวิตช์สมอง คลายกล้ามเนื้อลึก สู่การนอนหลับลึก"* — **ไม่ใช่ยานอนหลับ ไม่กดประสาท**
- ❌ **ห้ามเคลมรักษาโรคนอนไม่หลับ (Insomnia Cure)** หรือใช้คำว่า "รักษา", "หายขาด"
- ❌ **ห้ามการันตีเวลาการหลับ** เช่น "หลับปุ๋ยใน 5 นาที"
- **ราคาจำหน่ายจริง TikTok Shop:** 1 ขวด 890.- / เซ็ตคู่ 2 ขวด 1,590.- (Hero SKU มีคูปองลดพิเศษ) / เซ็ต 4 ขวด 2,670.-

---

# 🚀 ENGINE 1: `/adsdrb meta` (Chained UGC Video Production)

สูตรผลิตวิดีโอ TikTok Shop ด้วย Meta AI Video Generator โดยแก้บั๊ก Character Swapping, Cutoff Glitch, และ Bottle Morphing 100%

### 1. วิธีเรียกใช้งาน (Syntax):
```text
/adsdrb meta [product] [persona] [location] "[script_or_topic]"
```

- **product:** `magnesium` (ค่าเริ่มต้น), `asta`, `gluta`
- **persona:**
  - `working_woman`: สาวออฟฟิศ 30–35 ปี ลุค Working Woman เสื้อสูทเบจ ฉลาด เป็นมิตร
  - `gen_z`: น้องนักศึกษา/สาวรุ่นใหม่ 20–25 ปี น่ารัก สดใส ชุดนอนพาสเทล
  - `executive_man`: ผู้บริหารหนุ่ม 32–38 ปี เสื้อเชิ้ตเรียบหรู ดูแลตัวเองดี
  - `clean_girl`: สาวสกินแคร์คลีนเกิร์ล 25–30 ปี รักสุขภาพ ผิวใสเป็นธรรมชาติ
- **location:** `bedside` (ข้างเตียง), `wfh` (โต๊ะทำงาน), `living_room` (โซฟา)
- **script_or_topic:** สคริปต์ไอเดีย หรือชื่อคลิปจาก Master Matrix (เช่น `"สายคิดวน นอนจ้องเพดาน"`)

---

### 2. กฎฟิสิกส์ 4 ข้อของโหมด Meta (Iron Rules):

1. **Pacing Ceiling (110–120 ตัวอักษรต่อซีน):**  
   สคริปต์แต่ละซีน (ความยาว 10 วินาที) **ต้องมีความยาวระหว่าง 110–120 ตัวอักษรไทย (ห้ามเกิน 130 เด็ดขาด)** เพื่อให้สปีดการพูดเป็นธรรมชาติ มีจุดพักหายใจ 0.5–1s ป้องกันเสียงขาดรอยต่อ (Cutoff Bug)
2. **Thai Phonetic Respelling (สะกดคำอ่านบ้านๆ):**  
   สะกดคำให้อ่านง่าย เช่น `ด็อก-เต้อ-แบ๊ง`, `ไน้ พลัส`, `ผิวโซม`, `ซาบ`, `ทอ-ระ-มาน` ป้องกัน AI พูดสำเนียงฝรั่งหรือสะกดตัวการันต์
3. **Posture A (Tabletop Hero Anti-Morphing):**  
   วางขวด DoctorBank ปิดฝาแน่นบนโต๊ะข้างหน้าเสมอ ตัวละครถือแค่เม็ดแคปซูลขาว 1 เม็ดโชว์ **ห้ามสั่งให้มือแตะหรือบิดฝาขวดใน Meta AI เด็ดขาด** (ให้ตัด B-roll จริงใน CapCut แทน)
4. **Just-In-Time Ref Protocol (แนบแคปซูลเฉพาะซีน 3):**

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🎬 Scene 1 (Hook 10s):      แนบ [Ref 1 ขวดจริง]                         │
│ 🎬 Scene 2 (The Truth 10s): แนบ [Ref 1 ขวดจริง] + [s1_endframe.jpg]    │
│ 🎬 Scene 3 (Solution 10s):  แนบ [Ref 1 ขวดจริง] + [Ref 2 แคปซูลจริง]   │
│                             + [s2_endframe.jpg] ⭐ (แคปซูลโผล่เฉพาะซีนนี้!)│
│ 🎬 Scene 4 (CTA 10s):       แนบ [Ref 1 ขวดจริง] + [s3_endframe.jpg]    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Pipeline การรันจริงและการสกัด End Frame ด้วย FFmpeg:

เมื่อผู้ใช้สั่ง `/adsdrb meta` ให้ Agent คายผลลัพธ์เป็น:
1. **บทพูด 4 ซีน (110–120 ch/scene)**
2. **ชุด Prompt สำเร็จรูปสำหรับ Meta AI ทีละรอบ (S1 ➔ S2 ➔ S3 ➔ S4)**
3. **สคริปต์คำสั่ง FFmpeg สำเร็จรูป** สำหรับสกัด End Frame และ Concat รวมคลิป:

```bash
# 1. สกัด End Frame จาก Scene 1 เพื่อใช้เป็น Ref ใน Scene 2
ffmpeg -sseof -0.1 -i scene1.mp4 -update 1 -q:v 2 s1_endframe.jpg

# 2. สกัด End Frame จาก Scene 2 เพื่อใช้เป็น Ref ใน Scene 3
ffmpeg -sseof -0.1 -i scene2.mp4 -update 1 -q:v 2 s2_endframe.jpg

# 3. สกัด End Frame จาก Scene 3 เพื่อใช้เป็น Ref ใน Scene 4
ffmpeg -sseof -0.1 -i scene3.mp4 -update 1 -q:v 2 s3_endframe.jpg

# 4. รวม 4 ซีนเป็นไฟล์วิดีโอสมบูรณ์ 40s ไร้รอยต่อ
ffmpeg -f concat -safe 0 -i filelist.txt -c copy final_master_40s.mp4
```

---

# 🏛️ ENGINE 2: `/adsdrb [classic]` (Cinematic Storyboard Compiler)

สูตรเดิมสำหรับการผลิตวิดีโอโฆษณา Cinematic / Myth Lab / Athlete ความยาว 15 วินาที สำหรับ Veo 3.1 และ Kling

### 1. วิธีเรียกใช้งาน (Syntax):
```text
/adsdrb [product] [style] [gender] [location] [script_or_idea]
```

- **style:** `sensory` (อาการทรมานจริง), `athlete` (สายออกกำลังกาย), `myth_lab` (โต๊ะทดลองคลีน), `ugc_daily` (วิถีชีวิตโต๊ะข้างเตียง)
- **gender:** `female` หรือ `male`
- **location:** `bedside`, `wfh`, `kitchen`, `living_room`, `commute`

### 2. ขั้นตอนการรัน Compiler:
```powershell
python "C:\My Claw\The Viral\Ads DRB\tools\drb_compiler.py" --product <product> --style <style> --gender <gender> --location <location> --id <CAMPAIGN_ID> --script "<SCRIPT_TEXT>"
```

### 3. ผลลัพธ์:
- คายไฟล์ Master Markdown ใน `C:\My Claw\The Viral\Ads DRB\02_Creative_Blueprint\Storyboards\<CAMPAIGN_ID>_production_table.md` พร้อมตาราง 7 คอลัมน์สำหรับ DrView และ Prompt มาตรฐาน Thanwa & Squid Game
