---
name: fb
version: "1.0.0"
updated_at: "2026-10-16"
description: >-
  Facebook Posts Trend Intelligence Engine — ดึงข้อมูลสดจาก VPS API ถอดรหัส Engagement DNA, จัดเกรด Authority Level (L1-L6), สรุป Share Rate % ไวรัลแชมเปี้ยน, วิเคราะห์ Heatmap เวลาทองคำโพสต์ Facebook และสรุป War Brief ลุยงานทันที ใช้เมื่อ: /fb [keyword] [timeframe]
---

# 🚀 Skill: `/fb` (v1.0.0)

> **Slash Command:** `/fb [keyword]` หรือ `/fb [keyword] [timeframe]`  
> **ตัวอย่าง:**  
> - `/fb นอน` (ค้นหาโพสต์เกี่ยวกับ 'นอน' ย้อนหลัง 30 วัน ค่า default)  
> - `/fb แมกนีเซียม 7d`  
> - `/fb ผิวขาว this_month`  
> - `/fb กรดไหลย้อน all`  

ดึงข้อมูลสดจากระบบ **Facebook Posts Trend Intelligence บน VPS (brain.doctorbankonline.com)** แบบเรียลไทม์ ผ่าน 5 ขุมพลังการวิเคราะห์ เพื่อค้นหาโพสต์ที่ทำยอดแชร์สูงสุด (Organic Virality), สกัด Hook หยุดนิ้วโป้ง, วิเคราะห์สเปกตรัมความน่าเชื่อถือ L1-L6 และฟันธงกลยุทธ์ทำเงินทันที

---

## 🧬 5 ขุมพลังการวิเคราะห์ (5 Intelligence Layers)

1. **Share Rate % Dominance (Organic Virality Engine):**
   - คำนวณ **Share Rate %** (`shares ÷ reactions × 100`) — ชี้วัดพลังการแชร์จริงบน Facebook (โพสต์ที่ Share Rate ≥ 20% คือระดับไวรัลทองคำ)
   - คำนวณ **Discussion Rate %** (`comments ÷ reactions × 100`) — วัดการถกเถียงและจุดชนวนความคิดเห็นในคอมเมนต์

2. **Authority Level Auto-Tag (L1 - L6):**
   - ถอดรหัสพาดหัวและเนื้อหาตาม **พีระมิด 6 ขั้น (Authority Pyramid)** ของ DoctorBank:
     - `L1`: วิธีแก้ปัญหาทั่วไป (How-to, 3 เทคนิค, 5 เคล็ดลับ) — *โหล*
     - `L2`: สิ่งที่ทำผิดแต่ไม่รู้ (Mistake, ข้อห้าม, คำเตือน) — *โหล*
     - `L3`: สิ่งที่เชื่อผิดแต่ไม่รู้ (Myth Busted, ความเชื่อผิดๆ) — *โหล*
     - `⭐ L4`: **วินิจฉัยต้นตอแท้จริง (Diagnostic)** เช่น ต้นตอคอร์ติซอล, สารสื่อประสาท, ลำไส้, ฮอร์โมน — ***The Winning Zone สำหรับ DoctorBank!***
     - `⭐ L5`: ทำนายอนาคต (Predict Future / วิจัยใหม่ล่าสุด)
     - `⭐ L6`: ชี้ช่องโอกาสใหม่ (Opportunity / พลิกวิกฤต)
   - วิเคราะห์สัดส่วน **Authority Ratio % (L4-L6)**

3. **Thumb-Stopping Hook Extraction:**
   - สกัด 2 บรรทัดแรกของโพสต์ที่ทำยอดแชร์และ Reactions สูงสุด ออกมาเป็นคลัง Hook สำเร็จรูปพร้อมนำไปต่อยอด

4. **Facebook Posting Heatmap Insights:**
   - ดึงข้อมูลจาก VPS `/api/fb/posts/heatmap`
   - ชี้ชัด **Top ช่วงเวลาทองคำ (วัน + เวลา)** ที่โพสต์ Facebook ได้ engagement สูงสุด

5. **มารบูรพา War Brief:**
   - สรุปยุทธศาสตร์รบตรงไปตรงมา ชี้เป้าว่าตลาด Facebook กำลังแชร์อะไร และโพสต์แบบไหนตายสนิท
   - แจก **3 หมัดเด็ด Facebook Killer Hooks** พร้อมโครงสร้างโพสต์แบบยาว (Long-form High-Share Blueprint)

---

## ⚙️ ขั้นตอนการทำงานสำหรับ Agent (Pipeline Execution)

เมื่อผู้ใช้พิมพ์ `/fb [keyword] [timeframe?]` ให้ Agent ดำเนินการตามลำดับนี้:

1. **สกัดพารามิเตอร์:**
   - `keyword`: คำค้นหา (เช่น "นอน", "วิตามิน", "ตับ")
   - `date_range`: ช่วงเวลา (default คือ `30d`, รองรับ `today`, `3d`, `7d`, `14d`, `30d`, `this_month`, `all`)

2. **รันคำสั่งสกัดข้อมูลสดจาก VPS API:**
   ใช้ `run_command` รันสคริปต์ประมวลผล:
   ```powershell
   python .agents/skills/fb/scripts/fb_intel.py "[keyword]" "[date_range]"
   ```
   *(หรือใช้ Path เต็ม: `python "C:\XBrain\.agents\skills\fb\scripts\fb_intel.py" "[keyword]" "[date_range]"`)*

3. **นำเสนอรายงานด้วยสไตล์ "มารบูรพา 🔥":**
   - **Anchor First Word:** เริ่มต้นด้วย "ฟังนะมึง", "กูบอกเลย", "มาดูกัน", "เอาล่ะ", หรือ "กูจัดให้!"
   - พ่นตารางเปรียบเทียบคลีนตา อ่านง่าย พร้อม DNA Champions และสัดส่วน Share Rate %
   - สรุป **Heatmap ช่วงเวลาทองคำ**
   - ขยี้ด้วย **War Brief** ฟันธง 3 Hooks พร้อมแนะโครงสร้างโพสต์ที่คนอยากกดเซฟและกดแชร์
   - **XBrain Pipeline Chaining:** เสนอทางเลือกลุยต่อด้วยขุมพลัง XBrain ทันที:
     - `/tsc [URL]` เพื่อแกะซับ/เนื้อหาคลิปในโพสต์
     - `/gcons [keyword]` หรือ `/gdeep 5 [keyword]` เพื่อขุดงานวิจัยการแพทย์มารองรับ
     - นำไปเขียนเป็นโพสต์ตัวจริง หรือต่อยอดเป็น Landing Page ด้วย `/lp`
     - ปิดท้ายด้วย `/save` บันทึกผลวิเคราะห์ลง Quick Save

---

## ⛔ กฎเหล็ก (Iron Rules)

1. **LIVE VPS Only:** ดึงข้อมูลผ่าน live API บน VPS เท่านั้น
2. **Fresh Execution:** ห้ามจำผลลัพธ์เก่ามาตอบ ต้องสั่งรันสคริปต์ใหม่ทุกครั้งที่เรียก `/fb`
3. **High Share Rate Focus:** โฟกัสโพสต์ที่ Share Rate สูง เพราะ Facebook ขับเคลื่อนด้วย Share มากกว่า Like ธรรมดา
4. **Action-Oriented:** War Brief ต้องมี 3 Facebook Hooks เสมอ
