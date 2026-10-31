---
name: citejump
description: >-
  Zero-Leakage Vancouver Jump-Citation & CRO Architecture Engine —
  ออโตเมตแปลงรหัสเปเปอร์และ raw PMIDs ในบทความสุขภาพหรือเซลส์เพจ
  ให้กลายเป็นระบบเลขอ้างอิงยกกำลัง [1], [2] เด้งแบบ Smooth Scroll ลงไปยัง Reference ท้ายหน้า
  พร้อมเอฟเฟกต์ :target highlight และปุ่มย้อนกลับ ↩ สองทาง โดยบล็อกไม่ให้มี outbound external link
  ส่งคนออกนอกเว็บแม้แต่ลิงก์เดียว เพื่อรักษา Conversion Rate สูงสุด ป้องกัน Funnel Leakage สู่ LINE CTA
---

# Zero-Leakage Vancouver Jump-Citation & CRO Engine (`/citejump`)

## 🎯 วัตถุประสงค์ (Mission Objective)
เมื่อทำบทความสุขภาพเชิงลึก (Medical Authority), หน้ารีวิวงานวิจัย หรือหน้า Landing Page ขายสินค้า/บริการทางการแพทย์ จุดตายที่พบบ่อยที่สุดคือ:
1. **ทิ้งรหัส `[PMID: xxxxx]` ลอยๆ:** ดูรก สายตาผู้อ่านสะดุด ไม่เป็นระเบียบตามมาตรฐานวิชาการสากล
2. **แปะลิงก์ตรงวิ่งไป PubMed / เว็บนอก (Funnel Leakage):** คนไข้หรือผู้มุ่งหวังคลิกแล้วเด้งออกไปเว็บภาษาอังกฤษ มึนหัว ปิดทิ้ง หรือลืมกลับมาที่หน้าเว็บ ทำให้หลุดออกจากกรวยขาย (Funnel) ไม่กดทัก LINE CTA
3. **เลื่อนลงแล้วหาไม่เจอ:** พอคนอ่านอยากดูว่าอ้างอิงจากไหน ต้องไถหาเองด้านล่าง พออ่านจบก็ไถกลับขึ้นมาหาจุดเดิมไม่เจอ

**สกิลนี้ (`/citejump`)** คือพิมพ์เขียวและกฎเหล็กในการสร้างระบบอ้างอิงทางการแพทย์ระดับโลก ที่น่าเชื่อถือ 100% ตรวจสอบได้จริง แต่ **ไม่มีทางออกนอกเว็บแม้แต่ประตูเดียว**

---

## 🛡️ กฎเหล็ก 4 ประการ (The 4 Iron Rules of Zero-Leakage Citation)

### กฎข้อที่ 1: ห้ามมี External Link ใน Reference เด็ดขาด (Zero Outbound Links)
- ในส่วนรายการอ้างอิงท้ายหน้า ให้แสดงชื่อผู้วิจัย, ชื่องานวิจัย, วารสาร, ปี, Volume, และรหัส `(PMID: xxxxx)` เป็น **ข้อความล้วน (Plain Text)**
- ❌ **ห้ามใส่:** `<a href="https://pubmed.ncbi.nlm.nih.gov/...">` หรือลิงก์ไปยังเว็บภายนอก
- ✅ **เหตุผล:** ผู้ที่ต้องการตรวจสอบความจริงสามารถ copy เลข PMID ไปค้นหาเองได้อยู่แล้ว แต่คนที่กำลังตัดสินใจซื้อหรือทักไลน์จะไม่ถูกดึงดูดให้กดออกจากหน้าเว็บ

### กฎข้อที่ 2: ใช้ระบบตัวเลขอ้างอิงยกกำลัง Vancouver (`[1]`, `[2]`, ...)
- ในเนื้อหา ทุกครั้งที่อ้างอิงงานวิจัย ให้ใช้รูปแบบ superscript ที่มีคลาส `.cr-cite` พร้อมตัวกำกับตำแหน่ง anchor:
  ```html
  <span id="cite-1" class="cr-anchor"></span><sup><a href="#ref-1" class="cr-cite">[1]</a></sup>
  ```
- หากประโยคนั้นอ้างอิงหลายงานวิจัย:
  ```html
  <sup><a href="#ref-1" class="cr-cite">[1]</a>,<a href="#ref-2" class="cr-cite">[2]</a></sup>
  ```

### กฎข้อที่ 3: ระบบกระโดดสองทาง (Two-Way Jump Navigation `↩`)
- ที่ท้ายรายการอ้างอิงแต่ละข้อ (`<li id="ref-X">`) ต้องมีปุ่มกระโดดกลับ:
  ```html
  <li id="ref-1">
    Fearon K, et al. Definition of cancer cachexia. <i>Lancet Oncol</i>. 2011;12(5):489–495. (PMID: 21296615) 
    <a href="#cite-1" class="cr-back" title="กลับไปที่เนื้อหา">↩</a>
  </li>
  ```
- เมื่อคนอ่านตรวจดูชื่อเปเปอร์เสร็จ สามารถแตะ `↩` แล้วพุ่งกลับขึ้นมายังจุดที่อ่านค้างไว้ได้ใน 0.1 วินาที

### กฎข้อที่ 4: เอฟเฟกต์นำสายตา Target Highlight (`:target`)
- เมื่อคลิกกระโดดลงมายัง Reference รายการนั้นจะต้องมีกรอบไฮไลต์สว่างขึ้นมาอัตโนมัติ เพื่อให้สายตารู้ทันทีว่ากำลังโฟกัสงานวิจัยชิ้นไหน

---

## 💻 Standard CSS Token & Boilerplate

บังคับใส่ชุด CSS นี้ในส่วน `<style>` ของเอกสาร HTML:

```css
/* Smooth Scroll & Scroll Padding for Fixed Headers */
html { 
  scroll-behavior: smooth; 
}
.cr-anchor { 
  scroll-margin-top: 80px; 
  display: inline-block; 
}

/* Superscript Jump Links in Body Text */
.cr-cite { 
  font-size: 0.8em; 
  font-weight: 700; 
  color: var(--theme-blue, #0a3f9d); 
  text-decoration: none; 
  padding: 0 1px; 
  transition: color 0.15s ease; 
}
.cr-cite:hover { 
  color: var(--theme-navy, #062863); 
  text-decoration: underline; 
}

/* References Section at Bottom */
.dj-refs ol { 
  padding-left: 1.4em; 
}
.dj-refs li { 
  margin-bottom: 10px; 
  line-height: 1.55; 
  font-size: 0.9em; 
  border-radius: 8px; 
  padding: 6px 10px; 
  transition: background 0.3s ease, outline 0.3s ease; 
}

/* Dynamic Target Highlight when Jumped To */
.dj-refs li:target { 
  background: rgba(10, 63, 157, 0.08); 
  outline: 2px solid var(--theme-blue, #0a3f9d); 
}

/* Return Button (↩) */
.cr-back { 
  display: inline-block; 
  font-size: 0.85em; 
  color: var(--theme-blue, #0a3f9d); 
  text-decoration: none; 
  margin-left: 6px; 
  padding: 1px 6px; 
  border-radius: 6px; 
  background: var(--theme-pale, #eef5fc); 
  font-weight: 600; 
  vertical-align: baseline; 
  transition: all 0.15s ease;
}
.cr-back:hover { 
  background: var(--theme-blue, #0a3f9d); 
  color: #ffffff; 
}
```

---

## 🛠️ ขั้นตอนการรันคำสั่ง `/citejump`

เมื่อได้รับคำสั่ง `/citejump [file_path]` ให้ทำตามลำดับต่อไปนี้:

1. **Scan:** สแกนหาแท็ก raw PMIDs หรือการอ้างอิงทั้งหมดในไฟล์เป้าหมาย เช่น `[PMID: 12345678]` หรือ `(JAMA 2009)`
2. **Compile Reference List:** เรียงลำดับงานวิจัยตามลำดับที่ปรากฏในเนื้อหา (Vancouver 1, 2, 3, ...) ดึงชื่อ First Author, ปี, วารสาร และเลข PMID
3. **Inject CSS:** ตรวจสอบว่ามี CSS ของ `.cr-cite`, `.cr-anchor`, `:target`, และ `.cr-back` หรือยัง ถ้ายังไม่มีให้เพิ่มเข้าไป
4. **Transform Body Text:** แทนที่แท็ก raw ด้วย `<span id="cite-X" class="cr-anchor"></span><sup><a href="#ref-X" class="cr-cite">[X]</a></sup>`
5. **Render Reference Block:** สร้าง `<ol>` ที่มี `<li id="ref-X">... (PMID: xxx) <a href="#cite-X" class="cr-back">↩</a></li>` โดย **ไม่มีแท็ก `<a href="http...">` แม้แต่จุดเดียว**
6. **Verify & Cache-Bust:** 
   - สแกน recheck ว่าไม่มี `[PMID:` ค้างอยู่ในเนื้อหา
   - สแกน recheck ว่าไม่มี external link ใน `<div class="dj-refs">`
   - รัน `node bump-cache.js` เพื่ออัปเดตเวอร์ชันแคช
   - ทำการ `git commit` และ `git push vps master` ทันทีตาม Iron Rule
