# 🌐 Skill: `/web`

## Objective
General web research — ค้นหาข้อมูลทั่วไปจากอินเทอร์เน็ต สำหรับหัวข้อที่ไม่ต้องการความลึกระดับ academic ผลลัพธ์เป็นบทความที่อ่านง่าย มี inline citations 15–50 รายการ

## Target Output
- **Inline Citations:** 15–50
- **Word Count:** 800–1,500 คำ (กระชับ อ่านได้เร็ว)
- **Source Quality:** General web — news, blogs, trusted sites
- **Time:** ~3–5 นาที

## Execution Steps

1. **Parse the topic** from the user's request (หลัง `/web`)

2. **Run `medical_research.py` in `--mode web`** with `research_report` type (faster, less deep):
   ```powershell
   Set-Location "C:\My Claw\MyProjects\DoctorBank-Band\gpt-researcher"
   $env:PYTHONUTF8=1; .\venv\Scripts\python.exe medical_research.py "<TOPIC>" --mode web --lang english --type research_report
   ```
   - หากต้องการภาษาไทย ใส่ `--lang thai`

3. **Check output stats** — ถ้า Unique References < 10 ให้ switch เป็น `--mode mixed` แล้วรันใหม่

4. **Save to Research folder** ที่ `C:\My Claw\MyProjects\DoctorBank-Band\Content\Research\<TopicName>.md`

5. **Report** ด้วย stats: Words, Refs, Time

## Config (.env) ที่ใช้
```
CURATE_SOURCES=False
MAX_ITERATIONS=5
MAX_SEARCH_RESULTS_PER_QUERY=8
TOTAL_WORDS=1500
```
