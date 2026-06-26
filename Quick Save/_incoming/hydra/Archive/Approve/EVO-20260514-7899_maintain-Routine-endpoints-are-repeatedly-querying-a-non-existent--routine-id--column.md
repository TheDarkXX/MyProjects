---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-14
brain_task_id: ~
source: oracle
proposal_id: EVO-20260514-7899
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Routine endpoints are repeatedly querying a non-existent `routine_id` column
---

# Oracle Proposal (EVO-20260514-7899)
**Mission:** maintain
**Level:** critical
**Title:** Routine endpoints are repeatedly querying a non-existent `routine_id` column

## Evidence
```json
{
  "web_error_log": "brain-app error log contains dozens of `❌ Error: no such column: routine_id` entries while routine API routes are being hit successfully in out.log",
  "schema_check": "PRAGMA table_info(routines) shows columns `id`, `title`, `description`, `frequency`, etc., but no `routine_id`",
  "impact": "Routine analytics or completion/history paths may silently fail or return incomplete data despite `/api/routines` itself returning 200."
}
```

## Recommended Action
Trace the routine stats/completion queries that reference `routine_id` and align them with the current schema: either use `routines.id` consistently, or add/repair the missing child-table column if the intended reference is in a related completion/log table. Add a small startup schema assertion for routine-related tables so this fails loudly after migrations.
