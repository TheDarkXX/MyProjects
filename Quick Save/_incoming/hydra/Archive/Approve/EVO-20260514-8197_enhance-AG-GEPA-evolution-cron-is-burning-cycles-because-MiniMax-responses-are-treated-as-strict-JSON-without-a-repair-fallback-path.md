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
