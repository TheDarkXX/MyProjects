---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-3885
tags: [oracle, declutter, optimization]
summary: >
  Oracle optimization finding: AI monitor is generating stale open intelligence items for recovered providers and one permanently invalid model
---

# Oracle Proposal (EVO-20260507-3885)
**Mission:** declutter
**Level:** optimization
**Title:** AI monitor is generating stale open intelligence items for recovered providers and one permanently invalid model

## Evidence
```json
{
  "open_pool_items": 32,
  "db_open_examples": "AI API Down items from 2026-05-06 remain open for Kie, OpenRouter, BytePlus",
  "monitor_log": "Most providers are currently OK; Openrouter nvidia/nemotron-nano-12b-2-vl repeatedly returns Not Found"
}
```

## Recommended Action
Auto-close provider-down/slow items after two successful monitor runs and remove or replace nvidia/nemotron-nano-12b-2-vl from the ping list.
