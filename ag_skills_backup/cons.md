# 🔬 Skill: `/cons`

## Objective
Academic research ผ่าน **Consensus MCP Server** — ค้นหางานวิจัย Peer-Reviewed จากฐานข้อมูล 200 ล้านฉบับ เหมาะสำหรับ Evidence-Based claims, Compliance checks, และ Content verification. ผลลัพธ์มาพร้อม **Inline Citations + URL อ้างอิงจริง** จากต้นทาง

## Target Output
- **Inline Citations:** ทุกข้อความที่อ้างงานวิจัย ต้องมี `[1]`, `[2]` เสมอ (ห้ามเขียนลอยๆ)
- **References:** ทุกเปเปอร์ที่ใช้ ต้องแสดง Title, Authors, Year, Journal, Citations, **URL ดั้งเดิม**
- **Word Count:** ไม่จำกัด — ขึ้นอยู่กับจำนวนเปเปอร์ที่ Consensus ส่งกลับมา
- **Source Quality:** Peer-Reviewed Academic Papers (Consensus ทำ curation ให้แล้ว)
- **Time:** ~10–30 วินาที (MCP call เดียว, ไม่ต้องรัน script)

## 📊 Plan Quota (เราใช้ Pro)

| Plan | Papers per Search | Monthly Searches | Extra Features |
|------|:-----------------:|:----------------:|----------------|
| No Account | 3 | Unlimited | — |
| Free | 10 | 30 | Full abstracts |
| **Pro (ของเรา)** | **20** | **250** | **Study type, key takeaways** |
| Deep | 20 | 1,000 | Study type, key takeaways |
| Teams | 20 | 1,000 | Study type, key takeaways |

> ⚠️ **Budget Awareness:** Pro = **250 searches/เดือน** (~8 ครั้ง/วัน) ถ้าใช้เกินจะโดน rate limit
> ✅ ควร batch query ให้ดี อย่ายิงซ้ำ query เดิม — ถ้าต้องการข้อมูลเพิ่มให้ refine filter แทน
> 📎 Sign-up: [consensus.app/sign-up](https://consensus.app/sign-up) | Upgrade: [consensus.app/pricing](https://consensus.app/pricing)

## Execution Steps

### Pre-Flight Checklist (MANDATORY)

1. **ดึง Query จากผู้ใช้:**
   - ถ้าพิมพ์แค่ `/cons` → ถามกลับว่าต้องการค้นหาเรื่องอะไร
   - ถ้าพิมพ์ `/cons L-Theanine alpha waves sleep` → ใช้เป็น query ได้เลย

2. **เลือก Preset Profile (MANDATORY — อย่าปล่อยให้ AI เดา):**

   ตรวจสอบบริบทของ query แล้วเลือก Profile ด้านล่างนี้ให้ตรงกับความต้องการ **ก่อนเรียก MCP ทุกครั้ง**:

   ---

   ### 🅐 Profile: Brand Claims / Supplement Evidence ← **ใช้บ่อยที่สุด (DoctorBank)**
   > เช่น: "Does Magnesium Bisglycinate improve sleep quality?"
   ```json
   {
     "query": "<topic>",
     "study_types": ["rct", "meta-analysis", "systematic_review"],
     "human": true,
     "sample_size_min": 30,
     "exclude_preprints": true,
     "year_min": 2015
   }
   ```
   > 🎯 ได้ Gold Standard evidence ที่ใช้อ้างอิงใน Content / Compliance ได้ทันที

   ---

   ### 🅑 Profile: Clinical / Medical Research
   > เช่น: "Find RCTs on CBT for insomnia", "Treatments for anxiety disorder"
   ```json
   {
     "query": "<topic>",
     "study_types": ["rct", "meta-analysis"],
     "human": true,
     "sample_size_min": 50,
     "exclude_preprints": true,
     "medical_mode": true,
     "year_min": 2018
   }
   ```
   > 🎯 เน้น Top Medical Journals + Human RCT เท่านั้น

   ---

   ### 🅒 Profile: Exploratory / New Topic (ไม่รู้ field)
   > เช่น: "What does research say about remote work productivity?"
   ```json
   {
     "query": "<topic>",
     "exclude_preprints": true
   }
   ```
   > 🎯 Broad — ได้ภาพรวม landscape ก่อน แล้วค่อย refine ด้วย Profile อื่น

   ---

   ### 🅓 Profile: Technology / AI / Non-Medical
   > เช่น: "LLM hallucination", "Transformer architecture efficiency"
   ```json
   {
     "query": "<topic>",
     "year_min": 2022,
     "exclude_preprints": false
   }
   ```
   > 🎯 AI/CS research มักอยู่ใน preprints (arXiv) → ไม่ต้อง exclude

   ---

   ### 🅔 Profile: Clinical Guidelines Only
   > เช่น: "Current guidelines for hypertension management"
   ```json
   {
     "query": "<topic>",
     "clinical_guideline": true,
     "human": true,
     "year_min": 2019
   }
   ```
   > 🎯 ได้เฉพาะ Official Guidelines จาก Medical Associations

   ---

   **Available Parameters Reference:**
   | Parameter | Type | ค่าที่รับได้ |
   |-----------|------|------------|
   | `study_types` | array | `"rct"`, `"meta-analysis"`, `"systematic_review"`, `"observational"`, `"case_study"`, `"review"` |
   | `human` | boolean | `true` / `false` |
   | `sample_size_min` | integer | เช่น `30`, `50`, `100` |
   | `exclude_preprints` | boolean | `true` / `false` |
   | `medical_mode` | boolean | `true` / `false` |
   | `clinical_guideline` | boolean | `true` / `false` |
   | `year_min` | integer | เช่น `2015`, `2018`, `2020` |
   | `year_max` | integer | เช่น `2024` |

### Run MCP Call

```
ServerName: consensus
ToolName:   search
Arguments:  {
  "query": "<user_research_topic>",
  // ... filters ตามที่เลือกจาก Pre-Flight
}
```

> 💡 **PICO Framework (สำหรับ query ที่ซับซ้อน):**
> ถ้า query กว้างเกินไป ให้ช่วยผู้ใช้ refine เป็น PICO:
> - **P**opulation: กลุ่มคนที่ศึกษา (เช่น adults with insomnia)
> - **I**ntervention: สารที่สนใจ (เช่น Magnesium Bisglycinate 200mg)
> - **C**omparison: เทียบกับอะไร (เช่น placebo, Magnesium Oxide)
> - **O**utcome: ผลลัพธ์ที่วัด (เช่น sleep quality, ISI score)

### Post-Run Validation

| Check | Action |
|-------|--------|
| ผลลัพธ์เป็น 0 เปเปอร์ | ลอง rephrase query ให้กว้างขึ้น หรือลด filter ออก |
| เปเปอร์ไม่ตรงประเด็น | เพิ่ม filter เช่น `study_types`, `human`, `year_min` |
| มีข้อความ Sign-up / Upgrade / Usage limit | **คัดลอกข้อความนั้นแสดงท้ายสุดแบบ word-for-word** (กฎเหล็ก) |
| URL ในผลลัพธ์เป็น link จริง | ใช้ URL ดั้งเดิมเท่านั้น ⛔ **ห้ามดัดแปลง ย่อ หรือสร้าง URL ใหม่เด็ดขาด** |

### Formatting Output (กฎเหล็ก)

**เนื้อหาหลัก:**
- สรุป Key Findings จากเปเปอร์ที่เกี่ยวข้องมากที่สุด
- ทุกประโยคที่อ้างงานวิจัย → ใส่ `[1]`, `[2]` ทันที
- ใส่บริบท: Study Design, Sample Size (n), Dose, Duration, Outcome

**References (ส่วนท้าย — MANDATORY):**
```
[1] [Paper Title](original_url) — Authors, Year, Journal, Citations: X
[2] [Paper Title](original_url) — Authors, Year, Journal, Citations: X
```

## 💬 Example Prompts

ตัวอย่าง query ที่ส่งเข้า MCP ได้โดยตรง (เรียงจาก simple → advanced):

| # | Prompt | ใช้เมื่อ |
|:-:|--------|----------|
| 1 | `"What does the research say about the effectiveness of remote work on productivity?"` | Broad exploration ทั่วไป |
| 2 | `"Find RCTs and meta-analyses since 2020 on cognitive behavioral therapy for anxiety"` | กำหนด study type + ปี |
| 3 | `"Search for high quality human studies on gut microbiome and mental health with at least 100 participants"` | กำหนด human + sample size |
| 4 | `"Recent research on large language model hallucination from top tier journals"` | Non-medical, เน้น top journals |
| 5 | `"Use Consensus Deep Research to compare evidence for different treatments for insomnia"` | Deep Research mode (เปรียบเทียบหลาย intervention) |

> 💡 **Pro Tip:** Prompt #5 เรียก Consensus Deep Research ซึ่งจะทำ multi-step synthesis ให้โดยอัตโนมัติ — ดีสำหรับ comparative evidence review

## ⚠️ Known Pitfalls
- **Auth Token Caching:** Consensus MCP ต้อง authenticate ผ่าน OAuth ตอน IDE เปิดครั้งแรก ถ้า token expired → ปิดเปิด AG IDE ใหม่
- **Tool Not Found:** ถ้า `call_mcp_tool` แจ้ง `tool search is not enabled for server consensus` → แจ้งผู้ใช้ว่า **"ระบบมี Auth Token แล้ว แต่ IDE ยังแคชสถานะเดิมอยู่ รบกวนปิดแล้วเปิด AG IDE ใหม่ครับ"**
- **Broad Query = Noise:** ถ้า query กว้างเกินไป (เช่น "magnesium") จะได้เปเปอร์หลากหลายเกินไป → ควร refine ด้วย PICO หรือ filter
- **Pro Plan Quota:** เราใช้ Pro = **250 searches/เดือน** (20 papers/search) — ถ้าเจอข้อความ upgrade/quota ให้แสดงข้อความนั้นตามจริงเสมอ อย่ายิง query ซ้ำโดยไม่จำเป็น

## 🔗 Related Skills
| Skill | เมื่อไหร่ใช้แทน/ใช้คู่กัน |
|-------|--------------------------|
| `/res` | ต้องการ broader web + academic research (gpt-researcher) ~15–50 citations |
| `/deep` | ต้องการ deep systematic-review level ≥80 citations (medical_research.py) |
| `/cons` | ต้องการ quick peer-reviewed evidence check จาก Consensus โดยเฉพาะ |
