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
```json
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
```

## Recommended Action
Add a lightweight single-flight/debounce guard for `/api/mc/planner/sync-analytics`: client-side disable/cooldown while a sync is pending, plus server-side coalescing that returns the existing in-flight job instead of starting another analytics sync for the same project/window.
