---
name: web
description: "Migrated web skill"
---
# ๐ Skill: `/web`

## Objective
General web research โ€” เธเนเธเธซเธฒเธเนเธญเธกเธนเธฅเธ—เธฑเนเธงเนเธเธเธฒเธเธญเธดเธเน€เธ—เธญเธฃเนเน€เธเนเธ• เธชเธณเธซเธฃเธฑเธเธซเธฑเธงเธเนเธญเธ—เธตเนเนเธกเนเธ•เนเธญเธเธเธฒเธฃเธเธงเธฒเธกเธฅเธถเธเธฃเธฐเธ”เธฑเธ academic เธเธฅเธฅเธฑเธเธเนเน€เธเนเธเธเธ—เธเธงเธฒเธกเธ—เธตเนเธญเนเธฒเธเธเนเธฒเธข เธกเธต inline citations 15โ€“50 เธฃเธฒเธขเธเธฒเธฃ

## Target Output
- **Inline Citations:** 15โ€“50
- **Word Count:** 800โ€“1,500 เธเธณ (เธเธฃเธฐเธเธฑเธ เธญเนเธฒเธเนเธ”เนเน€เธฃเนเธง)
- **Source Quality:** General web โ€” news, blogs, trusted sites
- **Time:** ~3โ€“5 เธเธฒเธ—เธต

## Execution Steps

1. **Parse the topic** from the user's request (เธซเธฅเธฑเธ `/web`)

2. **Run `medical_research.py` in `--mode web`** with `research_report` type (faster, less deep):
   ```powershell
   $env:PYTHONUTF8=1; .\venv\Scripts\python.exe medical_research.py "<TOPIC>" --mode web --lang english --type research_report
   ```
   - เธซเธฒเธเธ•เนเธญเธเธเธฒเธฃเธ เธฒเธฉเธฒเนเธ—เธข เนเธชเน `--lang thai`

3. **Check output stats** โ€” เธ–เนเธฒ Unique References < 10 เนเธซเน switch เน€เธเนเธ `--mode mixed` เนเธฅเนเธงเธฃเธฑเธเนเธซเธกเน

4. **Save to Logseq vault** เธ—เธตเน `logseq-vault/pages/<TopicName>.md`

5. **Report** เธ”เนเธงเธข stats: Words, Refs, Time

## Config (.env) เธ—เธตเนเนเธเน
```
CURATE_SOURCES=False
MAX_ITERATIONS=5
MAX_SEARCH_RESULTS_PER_QUERY=8
TOTAL_WORDS=1500
```
