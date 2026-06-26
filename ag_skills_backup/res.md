# 🔬 Skill: `/res`

## Objective
Medical / Academic normal research — ค้นหาข้อมูลเชิงวิทยาศาสตร์จาก PubMed/PMC/ClinicalTrials.gov ผลลัพธ์เป็นบทความวิชาการที่มี inline citations 15–50 รายการ พร้อม Evidence Tags, Safe Claims Table, Toxicity Section

## Target Output
- **Inline Citations:** 15–50
- **Unique References:** 12–20
- **Word Count:** 2,000–2,500 คำ
- **Source Quality:** Academic — PubMed, PMC, ClinicalTrials.gov (95%+)
- **Time:** ~5–8 นาที

## Execution Steps

1. **Parse the topic** from the user's request (หลัง `/res`)

2. **Check/verify .env settings:**
   ```
   CURATE_SOURCES=False       ← must be False (ป้องกัน timeout)
   MAX_ITERATIONS=8
   MAX_SEARCH_RESULTS_PER_QUERY=10
   TOTAL_WORDS=2500
   ```

3. **Verify no hardcoded overrides in medical_research.py** (Rule B — Env Override Audit):
   - Grep for `os.environ["CURATE_SOURCES"]` ใน medical_research.py ต้องไม่มี

4. **Run research:**
   ```powershell
   cd "C:\My Claw\MyProjects\DoctorBank-Band\gpt-researcher"
   $env:PYTHONUTF8=1; .\venv\Scripts\python.exe medical_research.py "<TOPIC>" --mode academic --lang english --type detailed_report
   ```

5. **Validate output stats:**
   - Unique References ≥ 12 ✅
   - ถ้าน้อยกว่า → เพิ่ม `MAX_ITERATIONS=10` แล้วรันใหม่

6. **Save to Research Folder** ที่ `C:\My Claw\MyProjects\DoctorBank-Band\Content\Research\<TopicName>.md`

7. **Report** ด้วย stats: Words, Refs, Inline Citations, Time

## Config (.env) ที่ใช้
```
CURATE_SOURCES=False
MAX_ITERATIONS=8
MAX_SEARCH_RESULTS_PER_QUERY=10
TOTAL_WORDS=2500
```
