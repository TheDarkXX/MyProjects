---
name: res
description: "Migrated res skill"
---
# ๐”ฌ Skill: `/res`

## Objective
Medical / Academic normal research โ€” เธเนเธเธซเธฒเธเนเธญเธกเธนเธฅเน€เธเธดเธเธงเธดเธ—เธขเธฒเธจเธฒเธชเธ•เธฃเนเธเธฒเธ PubMed/PMC/ClinicalTrials.gov เธเธฅเธฅเธฑเธเธเนเน€เธเนเธเธเธ—เธเธงเธฒเธกเธงเธดเธเธฒเธเธฒเธฃเธ—เธตเนเธกเธต inline citations 15โ€“50 เธฃเธฒเธขเธเธฒเธฃ เธเธฃเนเธญเธก Evidence Tags, Safe Claims Table, Toxicity Section

## Target Output
- **Inline Citations:** 15โ€“50
- **Unique References:** 12โ€“20
- **Word Count:** 2,000โ€“2,500 เธเธณ
- **Source Quality:** Academic โ€” PubMed, PMC, ClinicalTrials.gov (95%+)
- **Time:** ~5โ€“8 เธเธฒเธ—เธต

## Execution Steps

1. **Parse the topic** from the user's request (เธซเธฅเธฑเธ `/res`)

2. **Check/verify .env settings:**
   ```
   CURATE_SOURCES=False       โ must be False (เธเนเธญเธเธเธฑเธ timeout)
   MAX_ITERATIONS=8
   MAX_SEARCH_RESULTS_PER_QUERY=10
   TOTAL_WORDS=2500
   ```

3. **Verify no hardcoded overrides in medical_research.py** (Rule B โ€” Env Override Audit):
   - Grep for `os.environ["CURATE_SOURCES"]` เนเธ medical_research.py เธ•เนเธญเธเนเธกเนเธกเธต

4. **Run research:**
   ```powershell
   $env:PYTHONUTF8=1; .\venv\Scripts\python.exe medical_research.py "<TOPIC>" --mode academic --lang english --type detailed_report
   ```

5. **Validate output stats:**
   - Unique References โฅ 12 โ…
   - เธ–เนเธฒเธเนเธญเธขเธเธงเนเธฒ โ’ เน€เธเธดเนเธก `MAX_ITERATIONS=10` เนเธฅเนเธงเธฃเธฑเธเนเธซเธกเน

6. **Save to Logseq vault** เธ—เธตเน `logseq-vault/pages/<TopicName>.md`

7. **Report** เธ”เนเธงเธข stats: Words, Refs, Inline Citations, Time

## Config (.env) เธ—เธตเนเนเธเน
```
CURATE_SOURCES=False
MAX_ITERATIONS=8
MAX_SEARCH_RESULTS_PER_QUERY=10
TOTAL_WORDS=2500
```
