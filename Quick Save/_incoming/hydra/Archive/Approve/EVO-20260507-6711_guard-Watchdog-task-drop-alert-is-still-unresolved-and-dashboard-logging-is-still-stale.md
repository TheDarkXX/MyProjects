---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-6711
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Watchdog task-drop alert is still unresolved and dashboard logging is still stale
---

# Oracle Proposal (EVO-20260507-6711)
**Mission:** guard
**Level:** critical
**Title:** Watchdog task-drop alert is still unresolved and dashboard logging is still stale

## Evidence
```json
{
  "tasks": "current tasks_count=136; done=125, todo=7, completed=3, waiting=1",
  "file_log": "/tmp/cron-data-watchdog.log still reports brain.db [tasks] DROPPED by 33 rows (169 → 136), latest seen 2026-05-07T17:00:02.551Z",
  "db_log": "watchdog_logs_24h=0; latest watchdog_logs rows are still from 2026-04-25"
}
```

## Recommended Action
Decide baseline immediately: if 136 is correct, reset db/.row-baseline.json; if not, restore the missing 33 tasks. Then fix data-integrity-watchdog.cjs to persist every run into watchdog_logs.
