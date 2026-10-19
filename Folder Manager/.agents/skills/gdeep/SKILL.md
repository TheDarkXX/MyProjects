---
name: gdeep
description: >-
  Web-Powered Deep Research V2 (God-Tier) — ดึงเปเปอร์ผ่าน PubMed, เรียงลำดับความน่าเชื่อถือด้วย
  Citation (Europe PMC), เจาะลึก Full-Text (OA/Pismin/Scrapling), และสังเคราะห์ GRADE-Lite ใช้เมื่อ: /gdeep [N] [หัวข้อ]
---
# Skill: `/gdeep` (God-Tier AI Research Agent V3 SSB)

**Command:** `/gdeep [N] [หัวข้อวิจัย]`
**Trigger:** เมื่อผู้ใช้พิมพ์ `/gdeep` ตามด้วยหัวข้อวิจัย (N = จำนวน queries, default = 5)
**Description:** Deep Research ขั้นสูงสุดระดับ SSB (Super Saiyan Blue) ที่ผสมผสาน Dynamic Queries (STORM Style), Citation Ranking เพื่อหา "Key Papers", และมุดหากำแพง Abstract เพื่ออ่าน Full-Text (PDF/XML) สกัด Key Stats พร้อมบังคับ Reference ขั้นต่ำ 20 เปเปอร์

---

## ⚙️ 4-Phase Workflow (กระบวนการทำงาน)

### Phase 1: 🔍 Insight Gathering & Angle-Aware Dynamic Query Generation

**Step 1.1 — Parse User Command & Extract Angle**
- วิเคราะห์คำสั่งแยกเป็น 2 ส่วน:
  1. **หัวข้อหลัก/สาร:** (เช่น `berberine`)
  2. **มุมเฉพาะ (Angle):** (เช่น `ดื้ออินซูลินและไมโตคอนเดรียพัง`)
- ⛔ **กฎเหล็ก:** การสร้าง Insights ต้องรวม "ข้อมูลพื้นฐานทั่วไปของสาร (Overview)" แต่ **เน้นน้ำหนักหนักๆ** ไปที่ "มุมเฉพาะ" ที่ผู้ใช้สั่งมา

**Step 1.2 — Web Insight Scan (ตั้งหลักแบบครอบคลุม)**
- ใช้ `search_web` ค้นหาข้อมูลภาพรวม + มุมเฉพาะ (เช่น `"berberine benefits overview"`, `"berberine AMPK insulin resistance mechanism"`)
- สกัด **Key Insights**: สรรพคุณทั่วไป (คร่าวๆ) + กลไกที่เจาะจงมุมเฉพาะ, ข้อถกเถียง, Dose ที่เป็นที่ยอมรับ

**Step 1.3 — Dynamic Query Brainstorming (Insight-Grounded)**
- สร้าง N Sub-queries (default 5-10) โดยห้ามมั่ว:
  - ต้องอิงจาก Insight ใน 1.2
  - ครอบคลุมทั้งกว้าง (Efficacy) และลึก (Specific Mechanisms)
  - ใช้ Medical Terms ของ PubMed + Study Design (เช่น `RCT`, `Meta-Analysis`)
- ⛔ ต้องนำเสนอรายการ Queries ในแชทก่อนรันสคริปต์ค้นหา

### Phase 2: 📊 Broad Search & Citation Ranking

**Step 2.1 — Execution via Python Script (GDeep Engine v3.0)**
- รันสคริปต์ `C:\My Claw\DoctorBank-Brand\.agents\skills\gdeep\scripts\gdeep_engine.py` โดยต้องส่ง Argument ที่ 3 เป็น `[AbsolutePath ของโฟลเดอร์ Reference ปลายทาง]` เพื่อให้สคริปต์เซฟไฟล์เปเปอร์แยกลงโฟลเดอร์อ้างอิงอัตโนมัติ
- ยิง PubMed eSearch + eSummary (ได้ 20 results/query) แล้ว Dedup เพื่อหาเปเปอร์ที่ไม่ซ้ำ
- ⚠️ **[V3 UPDATE]:** สคริปต์จะสร้างไฟล์ `papers_master.json` เพียงไฟล์เดียวในโฟลเดอร์ Reference ที่ระบุ (แทนการพ่น 70 JSONs) คุณต้องอ่านข้อมูลจากไฟล์ `papers_master.json` นี้เพื่อสกัด Data

**Step 2.2 — Citation Count & Ranking**
- นำ PMID ไปเช็คกับ **Europe PMC API** (`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=ext_id:{PMID}&format=json`) เพื่อดึง `citedByCount`
- คำนวณ **Influence Score** = `citedByCount × Evidence Weight` (NMA=4, Meta=3, RCT=2, Obs=1, Review=0.5)
- คัด **Top 5 Key Papers** ที่มีคะแนนสูงสุด

### Phase 3: 🔓 Full-Text Extraction & Cloudflare Unblocker (Key Papers Top 5 Only)

**Step 3.1 — Full-Text Waterfall (6 ชั้น พร้อม Scrapling Unblocker)**
สำหรับ Key Papers Agent ต้องพยายามดึง Full-Text ตามลำดับ:
1. **Automated Resolver & Unpaywall:**
   - รันคำสั่งอัตโนมัติ: `python tools/scrape/resolve_paper.py --doi {DOI} --out {ReferencePath}/{PMID}_fulltext.md`
   - ระบบจะเช็คสิทธิ์ Open Access ผ่าน Unpaywall API และดึงเนื้อหาผ่าน Scrapling Stealth Engine อัตโนมัติ
2. **Europe PMC XML:** `GET /rest/{PMID}/fullTextXML` (ถ้าบทความอยู่ใน Europe PMC)
3. **PubMed Central (PMC):** `ncbi.nlm.nih.gov/pmc/articles/PMC{ID}/`
4. **Cloudflare/Antibot Bypass (Scrapling Stealth):**
   - หากเจอปัญหาติด Cloudflare, Turnstile หรือหน้าเว็บ JS-heavy ให้ใช้:
     `python tools/scrape/scrape_page.py "{URL}" "{ReferencePath}/{PMID}_fulltext.md" --stealth`
5. **Pismin (Sci-Hub Proxy):** `https://www.pismin.com/{DOI}`
6. **Consensus MCP Fallback:** (ถ้าผู้ใช้สั่งหรือมี Credit)
7. **Abstract Only** (กรณีเปเปอร์ล็อก Paywall ถาวรและไม่มี OA)

**Step 3.2 — Deep Stat Extraction**
จาก Full-Text Agent ต้องสกัดหา "ข้อมูลที่ซ่อนอยู่":
- **Sample Size (N) & Demographics:** อาสาสมัครกลุ่มไหน จำนวนเท่าไหร่
- **Dosage & Protocol:** โดสเป๊ะๆ, รูปแบบการกิน (เช่น กินพร้อมอาหาร, กินเช้า/เย็น)
- **Primary Outcome + Effect Size:** P-value ที่ชัดเจน
- **Adverse Events & Dropout Rate:** คนถอนตัวกี่เปอร์เซ็นต์ เพราะอะไร

### Phase 4: 📝 Enhanced Synthesis & Output

- สังเคราะห์ข้อมูลโดยใช้ NO MAGIC Rule (ห้ามมั่ว ต้องมี Inline Citation เสมอ `[1]`)
- ดำเนินการจัดเก็บไฟล์ Output ภายใต้โครงสร้าง:
  `C:\My Claw\DoctorBank-Brand\Products\Ingredient-Library\[หมวดหมู่]\`
  - ไฟล์ตั้งชื่อแบบ v3: `[ชื่อสาร]_[scope]_gdeep.md` (เช่น `Vitamin-C_main_gdeep.md`)
  - Reference ไปที่: `[หมวดหมู่]/_Reference/[ชื่อสาร]/`
- ใช้เทมเพลตด้านล่างในการตอบ

---

## 📝 Output Template (บังคับ SSB V3!)

```markdown
# 🔬 [ชื่อหัวข้อ] — GDeep V3 Research Report

## 🔍 Search Strategy
- **Target Angle:** [มุมเฉพาะที่ผู้ใช้สั่ง]
- **Sub-queries:** [N queries]
- **Total Unique Papers:** [X papers]

## 📊 Citation Influence Ranking (Top 5 Key Papers)
| Rank | Paper Title | Study Type | Citations | Influence Score | Full-Text |
|:----:|-------------|:----------:|:---------:|:---------------:|:---------:|
| 1 | [Title](URL) | Meta-Analysis | 150 | 450 | ✅ XML |
| ... | ... | ... | ... | ... | ... |

## 🔎 Deep Dive from Full-Text (Key Papers)
### [Paper Title 1] (PMID: XXXXX)
- **Protocol:** [Dose], [Duration], [Population]
- **Primary Result:** [Effect size + CI + P-value]
- **Hidden Stat:** [สิ่งที่ Abstract ไม่ได้บอก เช่น Subgroup analysis]
- **Adverse Events / Dropouts:** [รายละเอียดจาก Full Text]

## 📊 Evidence Profile & Agreement Synthesis
| Finding | Support | Contradict | Weighted Agreement | Confidence |
|---------|:-------:|:----------:|:------------------:|:----------:|
| [Outcome 1] | X papers | Y papers | **XX%** | ⊕⊕⊕◯ Moderate |
*(สี: ≥85% 🟢, 65-84% 🟡, 50-64% 🟠, <50% 🔴)*

## 📋 Summary of Findings Table (SoF)
| Outcome | ผลลัพธ์ | จำนวน Studies (n) | Effect Direction | GRADE Certainty | Key Papers |
|---------|---------|-------------------|:----------------:|:---------------:|------------|
| [Outcome 1] | [สรุปสั้น] | X RCTs (n=XXX) | ↑ ดีขึ้น | ⊕⊕⊕◯ Moderate | [1][3] |

*(Effect Direction: ↑, ↓, ↔, ↑↓ | GRADE Certainty: ⊕⊕⊕⊕ High, ⊕⊕⊕◯ Moderate, ⊕⊕◯◯ Low, ⊕◯◯◯ Very Low)*

## 🏆 Executive Summary
สรุป 3-5 ข้อสำคัญที่สุด (รวม Overview พื้นฐานเบื้องต้น + เนื้อหาที่เน้นหนักไปทาง Angle ของผู้ใช้)

## 📋 Findings by Topic
### [หัวข้อย่อย 1]
- ... [N]

## ⚠️ Contradictory Evidence & Critical Appraisal
- ชี้จุดขัดแย้ง และใช้ข้อมูลจาก Full-Text มาช่วยอธิบาย (เช่น โดสไม่ถึง หรือฟอร์มการดูดซึมต่างกัน)

## 🚨 Limitations & Caveats
- ข้อจำกัดของหลักฐาน

## 📚 References (SSB Mandatory: ขั้นต่ำ 20 เปเปอร์)
เรียงตาม Evidence Hierarchy หรือ Influence Score (ต้องดึงมาอ้างอิงให้ถึง 20 เปเปอร์จาก papers_master.json ห้ามย่อ):
[1] [Paper Title](URL) (Author, Year, Journal) | Study Type | Citations: X
[2] ...

## 🇹🇭 สรุปภาษาไทยแบบเข้าใจง่าย (Plain Language Summary)
**คำถาม:** [ภาษาชาวบ้าน]
**คำตอบสั้นๆ:** [1-2 ประโยค]
**สิ่งที่งานวิจัยบอกเรา:**
- 🟢 [หลักฐานแน่น]
- 🟡 [ปานกลาง]
**ถ้าจะเริ่มทำ ทำอย่างไร:** (Dose & Protocol ที่ได้จาก Full-Text)
```

---

## 📁 File Saving, Path Convention & Craft Sync (สำคัญมาก!)

เนื่องจาก `/gdeep` เป็นเครื่องมือ Research แบบครอบจักรวาล การจัดเก็บไฟล์ต้องอิงตาม "ประเภทหัวข้อ":

1. **กรณีหัวข้อเป็น "สารอาหาร" (Ingredient):**
   - **บันทึกไฟล์ (MD):** `Products/Ingredient-Library/[หมวดหมู่]/[ชื่อสาร]_gdeep.md`
   - **โฟลเดอร์ Reference ปลายทาง (สำหรับ Script):** `Products/Ingredient-Library/[หมวดหมู่]/_Reference/[ชื่อสาร]/main_gdeep`
   - **อัปเดต Index:** อัปเดตไฟล์ `Products/Ingredient-Library/_INDEX.md`

2. **กรณีหัวข้อเป็น "ความรู้ทั่วไป/การแพทย์" (General Knowledge / Medical):**
   - **บันทึกไฟล์ (MD):** `docs/Research/[หัวข้อ]_gdeep.md` (สร้างโฟลเดอร์ถ้ายังไม่มี)
   - **โฟลเดอร์ Reference ปลายทาง (สำหรับ Script):** `docs/Research/_Reference/[หัวข้อ]/main_gdeep`
   - **อัปเดต Index:** (ไม่ต้องอัปเดต INDEX.md ของฝั่ง Ingredient)

- **Craft Sync (NEW):** หลังจากบันทึกไฟล์เสร็จสิ้น ให้รันสกิล `/craft "[AbsolutePath ของไฟล์ GDeep Report]"` เสมอ เพื่อยิงข้อมูลเข้า Craft.do และอัปเดตไฟล์ `SYNC_AUDIT_LOG.md` อัตโนมัติ
- **แจ้งผู้ใช้:** พ่นบอกพิกัดไฟล์ MD, พิกัด `papers_master.json`, และลิงก์ Craft URL ให้ผู้ใช้ทราบในแชททุกครั้ง

## ✅ Checklist ก่อนจบงาน
- [ ] ดึง Insight ทั้งภาพรวม (Overview) และ มุมเฉพาะ (Angle) แล้วใช่ไหม?
- [ ] รัน Dynamic Queries ที่ตรงตาม Insight แล้วใช่ไหม?
- [ ] ใช้ระบบเพื่อดึง Citation และ Full-Text ครบตาม Waterfall ไหม?
- [ ] นำเสนอ Deep Stats จาก Full-Text ใน Report แล้วใช่ไหม?
- [ ] เซฟไฟล์ลงโฟลเดอร์ถูกหมวดหมู่, อัปเดต `_INDEX.md`, และรัน `/craft` ส่งขึ้น Craft.do เรียบร้อยแล้ว?
