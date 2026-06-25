---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Data integrity watchdog still reports tasks table dropped 33 rows but DB watchdog_logs are not receiving current runs
---

# Oracle Proposal
**Mission:** maintain
**Level:** critical
**Title:** Data integrity watchdog still reports tasks table dropped 33 rows but DB watchdog_logs are not receiving current runs

## Evidence
```json
{
  "cron_log": "/tmp/cron-data-watchdog.log repeatedly reports brain.db [tasks] DROPPED by 33 rows (169 → 136) through 2026-05-07 05:00",
  "db": "watchdog_logs_24h=0; latest watchdog_logs rows are from 2026-04-25",
  "risk": "A real data-loss signal may be hidden in file-only logs and absent from the dashboard/database trail"
}
```

## Recommended Action
Confirm whether the 33 task deletion was intentional; if yes, reset the watchdog baseline. If no, restore from backup. Also repair data-integrity-watchdog DB logging so current checks persist to watchdog_logs.
