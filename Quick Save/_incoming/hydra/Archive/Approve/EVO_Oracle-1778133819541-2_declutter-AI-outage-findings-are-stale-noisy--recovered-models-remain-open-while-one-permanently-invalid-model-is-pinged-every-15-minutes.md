---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
tags: [oracle, declutter, optimization]
summary: >
  Oracle optimization finding: AI outage findings are stale/noisy: recovered models remain open while one permanently invalid model is pinged every 15 minutes
---

# Oracle Proposal
**Mission:** declutter
**Level:** optimization
**Title:** AI outage findings are stale/noisy: recovered models remain open while one permanently invalid model is pinged every 15 minutes

## Evidence
```json
{
  "db": "intelligence_pool_open=32; latest open items include multiple 'AI API Down ... Network Error' records from 2026-05-06 16:46:03",
  "monitor_log": "Most providers now OK; Openrouter nvidia/nemotron-nano-12b-2-vl consistently returns Not Found"
}
```

## Recommended Action
Auto-resolve provider-down intelligence items after two successful monitor runs, and remove or replace the invalid nemotron-nano-12b-2-vl monitor target to reduce recurring noise.
