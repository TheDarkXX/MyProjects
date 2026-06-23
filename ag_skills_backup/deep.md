# 🧬 Skill: `/deep`

## Objective
Medical / Academic DEEP research ผ่าน `medical_research.py` — สำหรับหัวข้อที่ต้องการความลึกระดับ systematic review เทียบ Perplexity Deep Research แต่มีคุณภาพ source สูงกว่า ต้องการ **Inline Citations อย่างน้อย 80 รายการ** และ Unique References ≥ 15

## Target Output
- **Inline Citations:** ≥ 80
- **Unique References:** ≥ 15 (เป้าหมาย 20–25)
- **Word Count:** 2,000–3,000 คำ (กระชับ ไม่ยืดเยื้อ)
- **Source Quality:** Academic — PubMed, PMC, ClinicalTrials.gov (90%+)
- **Time:** ~7–12 นาที

## Execution Steps

### Pre-Flight Checklist (MANDATORY — Rule B & C)

1. **ตรวจ .env:**
   ```
   CURATE_SOURCES=False       ← MUST be False
   MAX_ITERATIONS=8           ← หาก Inline Citations < 80 ค่อยเพิ่มเป็น 10
   MAX_SEARCH_RESULTS_PER_QUERY=10
   TOTAL_WORDS=2500
   ```

2. **Proportional check (Rule C):**
   - 8 iterations × 10 results = 80 URLs → safe ✅ (CURATE_SOURCES=False)
   - ถ้าเพิ่ม MAX_ITERATIONS → ต้อง verify ก่อนว่า downstream รับได้

3. **Grep override check (Rule B):**
   ```powershell
   Select-String -Path ".\medical_research.py" -Pattern 'os\.environ\["CURATE_SOURCES"\]'
   ```
   ถ้าเจอ → ลบออกก่อนรัน

### Run Research

```powershell
$env:PYTHONUTF8=1; .\venv\Scripts\python.exe medical_research.py "<TOPIC>" --mode academic --lang english --type detailed_report
```

### Post-Run Validation

| Metric | Target | Action if Failed |
|--------|--------|-----------------|
| Unique References | ≥ 15 | เพิ่ม MAX_ITERATIONS=10 แล้ว re-run |
| Inline Citations | ≥ 80 | Check MEDICAL_ROLE มี "MINIMUM 15 UNIQUE REFERENCES" ไหม |
| Words | 2,000–3,000 | ถ้าเกิน 3,500 → ROLE มีปัญหา verbosity |
| Time | < 12 min | ถ้านานกว่า → อาจมี network issue หรือ CURATE_SOURCES=True หลุด |

### Save & Report

5. **Copy to Logseq vault:**
   ```powershell
   Copy-Item -Path ".\report_*.md" -Destination "C:\My Claw\Openclaw-VPS\logseq-vault\pages\<TopicName>.md"
   ```

6. **Report stats:** Words / Unique Refs / Inline Citations / Time / Source quality breakdown

## Config (.env) ที่ใช้
```
CURATE_SOURCES=False
MAX_ITERATIONS=8
MAX_SEARCH_RESULTS_PER_QUERY=10
TOTAL_WORDS=2500
```

## ⚠️ Known Pitfalls
- `CURATE_SOURCES=True` + >50 URLs = **38 min timeout** (เคยเกิดแล้ว รอบ 5)
- `MAX_ITERATIONS=12` + `CURATE_SOURCES=True` = instant hang
- Always scale in steps: 8 → 10 → 12 อย่า jump ทันที
