---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-8583
tags: [oracle, declutter, optimization]
summary: >
  Oracle optimization finding: AI monitor still reports stale open outage items even though providers are mostly healthy
---

# Oracle Proposal (EVO-20260507-8583)
**Mission:** declutter
**Level:** optimization
**Title:** AI monitor still reports stale open outage items even though providers are mostly healthy

## Evidence
```json
{
  "open_pool_items": 32,
  "stale_items": "AI API Down/Slow items from 2026-05-06 remain open for Kie, OpenRouter, and BytePlus",
  "monitor_log": "Recent monitor runs show Kie, OpenRouter, BytePlus OK; only Openrouter nvidia/nemotron-nano-12b-2-vl consistently returns Not Found"
}
```

## Recommended Action
Auto-close AI monitor intelligence_pool items after two successful pings and remove or replace nvidia/nemotron-nano-12b-2-vl from the monitor target list.
