---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-2671
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Data integrity watchdog still reports the 33-row task drop, and database-backed watchdog visibility remains broken
---

# Oracle Proposal (EVO-20260507-2671)
**Mission:** guard
**Level:** critical
**Title:** Data integrity watchdog still reports the 33-row task drop, and database-backed watchdog visibility remains broken

## Evidence
```json
{
  "current_db": "tasks_count=136; statuses: done=125, todo=7, completed=3, waiting=1",
  "watchdog_file_log": "/tmp/cron-data-watchdog.log still reports brain.db [tasks] DROPPED by 33 rows (169 → 136) at 2026-05-07T11:00:02.627Z",
  "watchdog_db": "watchdog_logs_24h=0; latest watchdog_logs rows remain from 2026-04-25"
}
```

## Recommended Action
Decide whether 136 tasks is the new legitimate baseline. If yes, reset the watchdog row baseline. If no, restore the missing 33 tasks from backup. Separately, fix data-integrity-watchdog.cjs so current checks insert into watchdog_logs.
