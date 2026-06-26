---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-12
brain_task_id: ~
source: oracle
proposal_id: EVO-20260512-1726
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Hydra inspector pipelines appear silent since May 6, leaving only AI monitor feeding intelligence_pool
---

# Oracle Proposal (EVO-20260512-1726)
**Mission:** maintain
**Level:** critical
**Title:** Hydra inspector pipelines appear silent since May 6, leaving only AI monitor feeding intelligence_pool

## Evidence
```json
{
  "previous_proposal_check": "No previousProposal matches inspector-log/inspector-infra/inspector-web liveness failure; existing watchdog/AI-monitor findings are adjacent but not this source-level outage.",
  "db_source_staleness": "intelligence_pool source recency shows ai-monitor last_created=2026-05-12 01:30:03, but inspector-infra last_created=2026-05-06 03:30:04, inspector-web last_created=2026-05-03 13:30:04, inspector last_created=2026-05-03 20:00:01, and inspector-log last_created=2026-05-02 16:00:04.",
  "log_staleness": "/tmp/cron-inspector-log.log mtime is 2026-05-06 12:00:02 and /tmp/cron-inspector-infra.log mtime is 2026-05-06 14:30:07, while other crons such as ai-monitor, watchdog, token-tracker, and backup are still updating through May 12-13.",
  "missed_signal": "PM2 logs show ai-gateway exited/restarted on 2026-05-12 17:02, but ops_events has 0 rows in the last 24h and inspector-infra has not created a new item since May 6; this indicates the monitoring source is stale rather than a new deploy/Watchdog restart event.",
  "health_context": "watchdog_logs continue writing OK rows through 2026-05-13 00:00:05 and backups completed successfully at 2026-05-13 04:00:06, so the outage is localized to Hydra inspector jobs rather than all cron/database writes."
}
```

## Recommended Action
Audit the cron entries or scheduler definitions for inspector-log, inspector-infra, inspector-web, and generic inspector; restore whichever commands stopped running, then add a cheap inspector liveness check that records last_success per inspector source and raises one alert when any source is silent for >24h.
