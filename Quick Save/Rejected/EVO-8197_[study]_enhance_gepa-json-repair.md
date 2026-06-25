---
version: "draft"
type: study
status: rejected
outcome: rejected
date: 2026-05-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260514-8197
tags: [oracle, enhance, gepa, pipeline, rejected]
conversation: "718edc46-503e-4824-a740-48a18d88eea2"
conversation_title: "Hydra Proposal Review"
related_plans_same_conversation:
  - "V12.7.14_[hotfix]_maintain_error-logging.md"
  - "V12.7.15_[hotfix]_maintain_routine-id.md"
related:
  - "scripts/ag-gepa.js"
summary: >
  Rejected during implementation. `ag-gepa.js` was completely deleted in V12.2.0 (Oracle Rebuild Completion). Oracle was hallucinating from an old `/tmp/cron-ag-gepa.log`.
---

# EVO-8197: AG-GEPA JSON Parse Failure

## 📌 Context (Compiled Truth)
Upon implementation attempt, it was discovered that `ag-gepa.js` no longer exists in the repository. It was removed in `V12.2.0` (Oracle Rebuild). The cron logs Oracle analyzed in `/tmp/cron-ag-gepa.log` were stale remnants from before the deletion. This issue is obsolete.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-14
brain_task_id: ~
source: oracle
proposal_id: EVO-20260514-8197
tags: [oracle, enhance, optimization]
summary: >
  Oracle optimization finding: AG-GEPA evolution cron is burning cycles because MiniMax responses are treated as strict JSON without a repair/fallback path
---

# Oracle Proposal (EVO-20260514-8197)
**Mission:** enhance
**Level:** optimization
**Title:** AG-GEPA evolution cron is burning cycles because MiniMax responses are treated as strict JSON without a repair/fallback path

## Evidence
```json
{
  "cron_log": "/tmp/cron-ag-gepa.log shows repeated runs: '[GEPA] Starting AG-GEPA Evolution Loop...', '[GEPA] Phase 2: Reflective Mutation', then JSON parse failures such as Unexpected token 'I' and Thai apology text before '[GEPA] Failed to generate variants.'",
  "frequency_observed": "3 consecutive AG-GEPA runs in the inspected cron tail failed at the same variant-generation stage",
  "model": "minimax/minimax-m2.7",
  "db_context": "evolution_experiments table exists but recent schema inspection shows it tracks proposal_id/metric_tracked/status rather than enough detail to diagnose malformed variant outputs from the failed cron directly",
  "memory_check": "Not present in approved/deployed/rejected/iceboxed previousProposals; distinct from the already-approved Hydra inspector silence item and the already-deployed AI monitor BytePlus cooldown item."
}
```

## Recommended Action
Add a lightweight structured-output guard for AG-GEPA: request JSON with an explicit schema, extract JSON from fenced/text replies, validate with a small parser/repair step, and on non-JSON apology/refusal retry once via a known JSON-capable fallback such as Gemini response_format before marking the run failed. Also log model, raw first 300 chars, and failure stage into evolution_log/ag_logs so repeated model-format failures are visible without reading /tmp cron logs.
```

## 🔬 Timeline & Debugging Log
- **2026-05-16**: Approved via `/evo`. Promoted to Active.

## 🔗 GBRAIN Backlinks
- **2026-05-16** | [V12.7.14_[hotfix]_maintain_error-logging.md](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Active/V12.7.14_[hotfix]_maintain_error-logging.md) -- Context
