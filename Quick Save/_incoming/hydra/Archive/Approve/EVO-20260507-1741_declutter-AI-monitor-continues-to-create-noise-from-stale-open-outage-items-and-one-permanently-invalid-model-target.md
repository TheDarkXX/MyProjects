---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-1741
tags: [oracle, declutter, optimization]
summary: >
  Oracle optimization finding: AI monitor continues to create noise from stale open outage items and one permanently invalid model target
---

# Oracle Proposal (EVO-20260507-1741)
**Mission:** declutter
**Level:** optimization
**Title:** AI monitor continues to create noise from stale open outage items and one permanently invalid model target

## Evidence
```json
{
  "open_pool_items": 32,
  "stale_items": "AI API Down/Slow items from 2026-05-06 remain open for Kie, OpenRouter, and BytePlus",
  "monitor_log": "Recent runs show OpenRouter, BytePlus, and Kie OK, while Openrouter nvidia/nemotron-nano-12b-2-vl repeatedly returns Not Found"
}
```

## Recommended Action
Auto-resolve provider-down and slow-response intelligence items after two clean monitor passes, and remove/replace nvidia/nemotron-nano-12b-2-vl from the monitor target list.
