---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-11
brain_task_id: ~
source: oracle
proposal_id: EVO-20260511-7866
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: AI monitor is repeatedly probing a rate-limited BytePlus GLM fallback instead of cooling it down
---

# Oracle Proposal (EVO-20260511-7866)
**Mission:** maintain
**Level:** optimization
**Title:** AI monitor is repeatedly probing a rate-limited BytePlus GLM fallback instead of cooling it down

## Evidence
```json
{
  "new_since_last_run": "A new intelligence_pool item appeared at 2026-05-12 01:30:03: `AI API Rate Limited: BytePlus: GLM-4.7`. This is not in previousProposals.",
  "log_signature": "/tmp/cron-ai-monitor.log shows BytePlus: GLM-4.7 was OK repeatedly, then shifted into consecutive `Error: Too Many Requests` entries from line 230729 through 230883.",
  "source_path": "/root/brain-app/discord-bot/scripts/cron-ai-monitor.js still includes BytePlus: GLM-4.7 in the static monitor list and creates `AI API Rate Limited` items, but the observed behavior shows no per-model 429 cooldown before the next scheduled probes.",
  "ops_context": "Recent ops_events after the last report are only known deploy-hook events ending 2026-05-11 09:39:02, so this is not explained by deploy restarts or PM2 counts."
}
```

## Recommended Action
Add a per-model 429 circuit breaker to cron-ai-monitor: when a model returns Too Many Requests, persist a cooldown with Retry-After if available or exponential backoff, skip that model during cooldown, and record/update one rate-limit state instead of continuing frequent probes against the free fallback.
