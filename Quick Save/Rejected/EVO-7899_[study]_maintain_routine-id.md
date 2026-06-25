---
version: "draft"
type: study
status: rejected
outcome: rejected
date: 2026-05-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260514-7899
tags: [oracle, maintain, sqlite, bugfix, rejected]
conversation: "718edc46-503e-4824-a740-48a18d88eea2"
conversation_title: "Hydra Proposal Review"
related_plans_same_conversation:
  - "V12.7.14_[hotfix]_maintain_error-logging.md"
  - "V12.8.0_[impl]_enhance_gepa-json-repair.md"
related:
  - "db/brain.db"
summary: >
  Rejected during implementation. `routine_id` DOES exist in `tasks`. Oracle hallucinated an error from old PM2 logs prior to the `V10.9.0` DB migration.
---

# EVO-7899: Routine ID Column Error

## 📌 Context (Compiled Truth)
Upon implementation attempt, it was discovered that `tasks.routine_id` perfectly exists on the VPS (`12|routine_id|INTEGER|0||0`). The `no such column` errors found by Oracle were stale PM2 logs from days ago before the `migrate-routines.js` script was executed. The issue does not exist.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
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
```

## 🔬 Timeline & Debugging Log
- **2026-05-16**: Approved via `/evo`. Promoted to Active.

## 🔗 GBRAIN Backlinks
- **2026-05-16** | [V12.7.14_[hotfix]_maintain_error-logging.md](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Active/V12.7.14_[hotfix]_maintain_error-logging.md) -- Context
