---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260516-5172
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Viral planner analytics client is hammering a missing `/planner/sync-analytics` route and consuming brain-app CPU
---

# Oracle Proposal (EVO-20260516-5172)
**Mission:** maintain
**Level:** critical
**Title:** Viral planner analytics client is hammering a missing `/planner/sync-analytics` route and consuming brain-app CPU

## Evidence
```json
{
  "web_log": "Last 200 brain-app out lines are dominated by repeated `POST /planner/sync-analytics` returning 404 in 0-1ms.",
  "pm2": "brain-app is online but using ~106.5% CPU with PM2 HTTP metric at 667.42 req/min and p95 latency still low, consistent with high-volume cheap 404 traffic rather than slow requests.",
  "memory_check": "Previous rejected 404 finding was specifically Discord bot Brain API 404s; this is a separate brain-app planner endpoint flood after the shipped viral planner work."
}
```

## Recommended Action
Trace the Viral Planner UI/background poller that posts `/planner/sync-analytics`; either restore the server route or gate the client call behind route detection and exponential backoff so a missing analytics endpoint cannot spin at hundreds of requests per minute.
