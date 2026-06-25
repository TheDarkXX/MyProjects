---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-2150
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Data watchdog still flags a 33-row task drop while watchdog DB logging is stale
---

# Oracle Proposal (EVO-20260507-2150)
**Mission:** guard
**Level:** critical
**Title:** Data watchdog still flags a 33-row task drop while watchdog DB logging is stale

## Evidence
```json
{
  "tasks_count": "current tasks table has 136 rows: 125 done, 7 todo, 3 completed, 1 waiting",
  "watchdog_file_log": "/tmp/cron-data-watchdog.log repeatedly reports brain.db [tasks] DROPPED by 33 rows (169 → 136) through 2026-05-07 05:00",
  "watchdog_db": "watchdog_logs_24h=0; latest watchdog_logs rows are from 2026-04-25"
}
```

## Recommended Action
Confirm whether the 33 deleted tasks were intentional. If intentional, reset the row baseline; if not, restore from backup. Also fix data-integrity-watchdog so current findings are inserted into watchdog_logs, not only written to /tmp logs.
