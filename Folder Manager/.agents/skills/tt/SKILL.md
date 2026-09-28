---
name: tt
version: "2.1.0"
updated_at: "2026-09-28"
description: "TikTok Trend Intelligence Engine — ดึงข้อมูลสดจาก VPS API ถอดรหัส Engagement DNA, จัดเกรด Authority Level (L1-L6), เช็ค Topic Dedup ชนคลังสคริปต์ DoctorBank, วิเคราะห์ Heatmap เวลาทองคำ และสรุป War Brief ระดับเทพลุยงานทันที ใช้เมื่อ: /tt [keyword] [timeframe]"
---

# 🚀 Skill: `/tt` (v2.1.0)

> **Slash Command:** `/tt [keyword]` หรือ `/tt [keyword] [timeframe]`  
> **ตัวอย่าง:**  
> - `/tt นอน` (ค้นหาคีย์เวิร์ด 'นอน' ย้อนหลัง 30 วัน ค่า default)  
> - `/tt แมกนีเซียม 30d`  
> - `/tt ผิวขาว 7d`  
> - `/tt กรดไหลย้อน this_month`  

ดึงข้อมูลสดจากระบบ **TikTok Trend Intelligence บน VPS (brain.doctorbankonline.com)** แบบเรียลไทม์ ผ่าน 5 ขุมพลังการวิเคราะห์ เพื่อค้นหาช่องว่างตลาด (Blue Ocean Gap), สกัด Hook ไวรัล, ตรวจจับเนื้อหาซ้ำซ้อนกับคลัง DoctorBank และฟันธงกลยุทธ์ทำเงินทันที

---

## 🧬 5 ขุมพลังการวิเคราะห์ (5 Intelligence Layers)

1. **Engagement DNA Decoder:**
   - คำนวณ **Share Rate %** (`shares ÷ views × 100`) — ชี้วัดความคุ้มค่าในการแชร์ต่อ (>1% คือระดับทองคำ)
   - คำนวณ **Velocity (Views/Hour)** — วัดความเร็วการพุ่งของคลิปว่ากำลังติดสปีดหรือแผ่วลงแล้ว
   - คำนวณ **Total Engagement Rate %**

2. **Authority Level Auto-Tag (L1 - L6):**
   - ถอดรหัสพาดหัวและแคปชั่นตาม **พีระมิด 6 ขั้น (Authority Pyramid)** ของ DoctorBank:
     - `L1`: วิธีแก้ปัญหาทั่วไป (How-to, 3 เทคนิค, 5 เคล็ดลับ) — *โหล / AI ทั่วไปก๊อปได้*
     - `L2`: สิ่งที่ทำผิดแต่ไม่รู้ (Mistake, ข้อห้าม, คำเตือน) — *โหล*
     - `L3`: สิ่งที่เชื่อผิดแต่ไม่รู้ (Myth Busted, ความเชื่อผิดๆ) — *โหล*
     - `⭐ L4`: **วินิจฉัยต้นตอแท้จริง (Diagnostic)** เช่น ต้นตอคอร์ติซอล, สารสื่อประสาท, ลำไส้, ฮอร์โมน — ***The Winning Zone สำหรับ DoctorBank!***
     - `⭐ L5`: ทำนายอนาคต (Predict Future / วิจัยใหม่ล่าสุด)
     - `⭐ L6`: ชี้ช่องโอกาสใหม่ (Opportunity / พลิกวิกฤต)
   - วิเคราะห์สัดส่วน **Fluff Alert % (L1-L3)** เทียบกับ **Authority Ratio % (L4-L6)**

3. **Topic Dedup Gate (R4 Compliance):**
   - สแกนจับคู่กับคลังสคริปต์จริงของ DoctorBank ใน `Quick Save/Complete/Content/` และ `Content/` อัตโนมัติ
   - แจ้งเตือนทันที: `⚠️ มีแล้ว (ชื่อสคริปต์เดิม)` หรือ `🟢 Blue Ocean (ยังไม่มีในคลัง ลุยได้เลย)`

4. **Posting Heatmap Insights:**
   - ดึงข้อมูลจาก VPS `/api/tiktok/analysis/posting-heatmap`
   - ชี้ชัด **Top 3 ช่วงเวลาทองคำ (วัน + เวลา)** ที่คลิปสุขภาพได้ยอดวิวเฉลี่ยสูงสุด

5. **มารบูรพา War Brief:**
   - สรุปยุทธศาสตร์รบตรงไปตรงมา ชี้เป้าว่าตลาดเอียนอะไร และขาดอะไร
   - แจก **3 หมัดเด็ด L4 Killer Hooks (Fierce Empathy 55/59)** พร้อม Visual + Spoken Hook
   - ปุ่มทางลัดเชื่อมต่อคำสั่งถัดไป (`/devilscript`, `/viralscript`, `/tt`)

---

## ⚙️ ขั้นตอนการทำงานสำหรับ Agent (Pipeline Execution)

เมื่อผู้ใช้พิมพ์ `/tt [keyword] [timeframe?]` ให้ Agent ดำเนินการตามลำดับนี้:

1. **สกัดพารามิเตอร์:**
   - `keyword`: คำค้นหา (เช่น "นอน", "แมกนีเซียม", "กลูต้า")
   - `date_range`: ช่วงเวลา (default คือ `30d`, รองรับ `today`, `yesterday`, `3d`, `7d`, `14d`, `30d`, `this_month`, `all`)

2. **รันคำสั่งสกัดข้อมูลสดจาก VPS API:**
   ใช้ `run_command` รันสคริปต์ประมวลผล (รันได้จากทั้ง XBrain หรือระบุ Path เต็ม):
   ```powershell
   python .agents/skills/tt/scripts/tt_intel.py "[keyword]" "[date_range]"
   ```
   *(หรือใช้ Path เต็ม: `python "C:\XBrain\.agents\skills\tt\scripts\tt_intel.py" "[keyword]" "[date_range]"` / `python "C:\My Claw\Openclaw-VPS\.agents\skills\tt\scripts\tt_intel.py" "[keyword]" "[date_range]"`)
   - ระบบจะตรวจจับ Spiderweb Mesh เชื่อมต่อคลังสคริปต์ทั้งใน `DoctorBank-Brand` และคลังกลาง `XBrain` อัตโนมัติ

3. **นำเสนอรายงานด้วยสไตล์ "มารบูรพา 🔥":**
   - **Anchor First Word:** เริ่มต้นด้วย "ฟังนะมึง", "กูบอกเลย", "มาดูกัน", "เอาล่ะ", หรือ "กูจัดให้!"
   - พ่นตารางเปรียบเทียบคลีนตา อ่านง่าย พร้อม DNA Champions
   - สรุป **Heatmap ช่วงเวลาทองคำ**
   - ขยี้ด้วย **War Brief** ฟันธง 3 L4 Hooks ที่จะฉีกตลาด
   - **XBrain Pipeline Chaining:** เสนอทางเลือกลุยต่อด้วยขุมพลัง XBrain ทันที:
     - `/tsc [คลิปไวรัล]` เพื่อแกะสคริปต์ตัวจริงมาศึกษา
     - `/gcons [keyword]` หรือ `/gdeep 5 [keyword]` เพื่อขุดเปเปอร์การแพทย์มารับประกันความน่าเชื่อถือ
     - สลับไป `DoctorBank-Brand` เพื่อเขียนสคริปต์เต็มด้วย `/devilscript` หรือ `/viralscript`
     - ปิดท้ายด้วย `/save` บันทึกผลวิเคราะห์ลงระบบ Quick Save

---

## ⛔ กฎเหล็ก (Iron Rules)

1. **LIVE VPS Only:** ดึงข้อมูลผ่าน live API บน VPS เท่านั้น ห้ามเปิดอ่าน SQLite เก่าในเครื่อง (`brain_vps.db`) เด็ดขาด เพราะข้อมูลในเครื่องไม่อัปเดต
2. **Fresh Execution:** ห้ามจำผลลัพธ์เก่ามาตอบ ต้องสั่งรันสคริปต์ใหม่ทุกครั้งที่เรียก `/tt`
3. **5-Layer Mandatory:** ผลลัพธ์ต้องมีครบทั้ง 5 มิติ (DNA, Authority L1-L6, Dedup Gate, Heatmap, War Brief) ห้ามตัดทอน
4. **Action-Oriented:** War Brief ต้องมี 3 L4 Killer Hooks และ Call-to-action เชื่อมไปสร้างสคริปต์จริงเสมอ
