---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-14
brain_task_id: ~
source: oracle
proposal_id: EVO-20260514-3569
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: Brain-app error logging collapses repeated production failures to message-only lines, making regressions hard to locate
---

# Oracle Proposal (EVO-20260514-3569)
**Mission:** maintain
**Level:** optimization
**Title:** Brain-app error logging collapses repeated production failures to message-only lines, making regressions hard to locate

## Evidence
```json
{
  "readWebLog": "Recent brain-app error log contains repeated opaque lines like `❌ Error: no such column: routine_id`, `❌ Error: targetTabName is not defined`, plus SyntaxError stack traces without request context.",
  "server.js": "Global `app.onError` only logs `console.error('❌ Error:', err.message)` and returns the raw message. It does not include route, method, request id, stack, or component tags.",
  "db_check": "Current DB schema does contain `tasks.routine_id`, so the repeated `routine_id` errors may be stale or from a different DB/query path, but current logs do not provide enough context to identify the caller."
}
```

## Recommended Action
Enhance the Hono `app.onError` handler to log method, path, status, stack, and a short request id, while returning a generic JSON error to clients. This is a low-risk instrumentation fix that will make the next `routine_id`/`targetTabName` regression actionable without guessing from PM2 restarts.
