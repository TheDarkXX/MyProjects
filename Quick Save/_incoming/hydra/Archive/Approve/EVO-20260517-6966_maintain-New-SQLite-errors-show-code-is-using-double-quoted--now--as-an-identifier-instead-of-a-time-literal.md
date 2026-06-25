---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-17
brain_task_id: ~
source: oracle
proposal_id: EVO-20260517-6966
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: New SQLite errors show code is using double-quoted `now` as an identifier instead of a time literal
---

# Oracle Proposal (EVO-20260517-6966)
**Mission:** maintain
**Level:** optimization
**Title:** New SQLite errors show code is using double-quoted `now` as an identifier instead of a time literal

## Evidence
```json
{
  "web_error_log": "brain-app error log repeatedly reports `no such column: \"now\" - should this be a string literal in single-quotes?`.",
  "db_schema_control": "queryDB shows existing schema defaults correctly use `datetime('now','localtime')`, so the error is likely from application SQL added outside table definitions, not the base schema.",
  "not_duplicate": "This is distinct from the already-approved `routine_id` column issue; both appear in the same log tail, but `no such column: \"now\"` is a separate SQL literal/quoting regression."
}
```

## Recommended Action
Search recent route/worker SQL for `datetime("now")`, `date("now")`, `strftime(...,"now")`, or raw `"now"` date expressions. Replace with single-quoted SQLite literals such as `datetime('now','localtime')` or parameterized timestamps, and add a small smoke test for the affected endpoint/job.
