---
version: "draft"
type: study
status: icebox
outcome: pending
date: 2026-06-01
brain_task_id: ~
source: oracle
tags: [oracle, optimize, mc]
conversation: "95e670f8-6d70-4ee0-a204-e52f33c1c8fa"
conversation_title: "Hydra EVO Batch Review"
related_plans_same_conversation:
  - "V12.17.0_[impl]_mission-control_fb-send-idempotency.md"
merged_task_ids: [EVO-20260528-695]
related: []
summary: >
  Oracle optimization finding: Mission Control analytics sync is no longer blocking, but the client is now enqueueing duplicate sync requests in bursts. Iceboxed.
---

# EVO-695: Mission Control analytics sync debounce

## 📌 Context (Compiled Truth)
Evaluated in batch review and sent to ICEBOX. Client-side debounce + server coalesce is easy to do but not urgent since the route responds in 3ms.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-28
brain_task_id: ~
source: oracle
proposal_id: EVO-20260528-695
tags: [oracle, optimize, optimization]
summary: >
  Oracle optimization finding: Mission Control analytics sync is no longer blocking, but the client is now enqueueing duplicate sync requests in bursts
---

# Oracle Proposal (EVO-20260528-695)
**Mission:** optimize
**Level:** optimization
**Title:** Mission Control analytics sync is no longer blocking, but the client is now enqueueing duplicate sync requests in bursts

## Evidence
{
  "mode": "delta",
  "previous_proposal_checked": "Existing approved analytics-sync finding was about a 40s synchronous request; current logs show the route now returns 202 quickly, so this is a changed/new follow-up condition rather than the same issue.",
  "web_log": "Recent brain-app log tail shows repeated `POST /api/mc/planner/sync-analytics` responses with HTTP 202 in 3–10ms, including a burst of back-to-back calls with no intervening user navigation.",
  "examples": [
    "--> POST /api/mc/planner/sync-analytics 202 6ms",
    "--> POST /api/mc/planner/sync-analytics 202 4ms",
    "--> POST /api/mc/planner/sync-analytics 202 3ms",
    "--> POST /api/mc/planner/sync-analytics 202 608ms"
  ],
  "ops_context": "Recent PM2 restarts align with deploy-hook deploy_executed events, so this is not diagnosed from restart counts."
}

## Recommended Action
Add a lightweight single-flight/debounce guard for `/api/mc/planner/sync-analytics`: client-side disable/cooldown while a sync is pending, plus server-side coalescing that returns the existing in-flight job instead of starting another analytics sync for the same project/window.
```

## 🔬 Timeline & Debugging Log
- **2026-06-01**: ICEBOXED.

## 🔗 GBRAIN Backlinks
### related_to
- **2026-06-01 07:56** | [V12.10.0 Mission Control Async Analytics Sync](../Complete/The-Viral/V12.10.0_[impl]_mission-control_async-analytics-sync.md) -- Context on async fix
