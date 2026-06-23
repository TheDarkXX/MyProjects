# 🧬 DoctorBank-Band: GPT-Researcher AI Guide

This folder contains a heavily customized version of `gpt-researcher` optimized for deep medical/academic research with dense inline citations (Perplexity-style).

## ⛔ CRITICAL RULES FOR AI AGENTS (Iron Rules)

### 1. Rule B: Env Override Audit Before Rerun
**Context:** In the past, AI edited `.env` to change `CURATE_SOURCES=False` but a hardcoded `os.environ["CURATE_SOURCES"] = "True"` in `medical_research.py` silently overrode it, causing a 38-minute timeout.
**Rule:**
- Every time you edit a `.env` value, you MUST grep `medical_research.py` and other scripts to check for hardcoded overrides (`os.environ["KEY"]`).
- Do NOT assume `.env` wins. Fix the code override if found.

### 2. Rule C: Proportional Scaling Check Before Increasing Batch Size
**Context:** Increasing `MAX_ITERATIONS` from 5→12 caused 130+ URLs to be fed into LLM curation, exceeding the token window and causing a silent 38-minute hang.
**Rule:**
- Before increasing parameters that multiply downstream load (`MAX_ITERATIONS`, `MAX_SEARCH_RESULTS_PER_QUERY`), calculate: `iterations × results = total_URLs`.
- **Thresholds:** If `CURATE_SOURCES=True`, max safe URLs ≈ 30-50. If `CURATE_SOURCES=False`, you can go up to 100+.
- Scale in steps (e.g. 5→8→10), not jumps.

## 🚀 Execution Guide

Always run research via the `medical_research.py` wrapper, which enforces academic rigor and conciseness via explicit prompt injections.

**Base Command:**
```powershell
$env:PYTHONUTF8=1; .\venv\Scripts\python.exe medical_research.py "<TOPIC>" --mode academic --lang english --type detailed_report
```

**Required `.env` Configuration for Deep Research (80+ Citations):**
```env
CURATE_SOURCES=False       ← MUST be False for deep research to avoid timeouts
MAX_ITERATIONS=8           ← Increase to 10 if you need >20 unique references
MAX_SEARCH_RESULTS_PER_QUERY=10
TOTAL_WORDS=2500           ← Do NOT set >3000, it causes word salad. Conciseness is key.
```

**Post-Run Validation Targets:**
1. **Unique References:** ≥ 15 (If < 15, increase `MAX_ITERATIONS` to 10)
2. **Inline Citations (`[^1]`):** ≥ 80
3. **Quality:** DOIs present, NO hedging language, NO bloated summaries.

> **Note:** The `MEDICAL_ROLE` string inside `medical_research.py` strictly forces `MINIMUM 15 UNIQUE REFERENCES`. Do not remove this constraint.
