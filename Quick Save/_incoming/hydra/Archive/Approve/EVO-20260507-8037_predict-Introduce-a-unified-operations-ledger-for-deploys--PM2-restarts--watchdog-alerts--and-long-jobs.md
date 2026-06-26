---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-8037
tags: [oracle, predict, innovation]
summary: >
  Oracle innovation finding: Introduce a unified operations ledger for deploys, PM2 restarts, watchdog alerts, and long jobs
---

# Oracle Proposal (EVO-20260507-8037)
**Mission:** predict
**Level:** innovation
**Title:** Introduce a unified operations ledger for deploys, PM2 restarts, watchdog alerts, and long jobs

## Evidence
```json
{
  "current_gap": "PM2 logs show when restarts happen but not who requested them or why",
  "affected_systems": "deploy hook, watchdog remediation, health-check, downloader, oracle, and cron monitors all interact with runtime state",
  "user_profile": "ship_fast_fix_later benefits from a lightweight audit layer instead of heavyweight orchestration"
}
```

## Recommended Action
Add an ops_events table or JSONL ledger with event_type, actor, reason, service, start/end timestamps, and outcome. Use it to correlate deploys with restarts, prevent duplicate remediation, and surface one clear incident timeline in Hydra.
