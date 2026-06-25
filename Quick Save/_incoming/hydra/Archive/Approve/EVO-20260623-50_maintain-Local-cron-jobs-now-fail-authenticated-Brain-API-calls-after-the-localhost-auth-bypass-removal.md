---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-06-23
brain_task_id: ~
source: oracle
proposal_id: EVO-20260623-50
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Local cron jobs now fail authenticated Brain API calls after the localhost auth bypass removal
---

# Oracle Proposal (EVO-20260623-50)
**Mission:** maintain
**Level:** critical
**Title:** Local cron jobs now fail authenticated Brain API calls after the localhost auth bypass removal

## Evidence
```json
{
  "web_log_401s": "brain-app out log shows local cron/API calls returning 401: POST /api/cc/cron-logs, GET /api/cc/expenses?year_month=2026-06, POST /api/mc/planner/sync-analytics, plus repeated GET /api/cc/* and /api/tasks calls.",
  "code_auth_gate": "server.js applies authMiddleware() before /api/cc and /api/mc routes; auth.js only bypasses /api/auth, /api/webhook, /api/health and static assets. Localhost no longer bypasses auth.",
  "code_cron_viral": "scripts/cron-viral-analytics.js POSTs http://127.0.0.1:3001/api/mc/planner/sync-analytics without Authorization, so the analytics sync cron receives Unauthorized instead of running.",
  "code_cc_statements": "discord-bot/scripts/cron-cc-statements.js calls http://127.0.0.1:3001/api/cc/credit-cards without Authorization; on non-OK it returns an empty imported-bank set, which can force unnecessary Gmail/AI statement scanning.",
  "db_symptom": "cc_cron_run_logs latest row is id=180 on 2026-06-21 23:55:03, while recent web logs show POST /api/cc/cron-logs -> 401, indicating run-log ingestion has stopped."
}
```

## Recommended Action
Give first-party cron scripts an internal authenticated API helper that attaches GATEWAY_AUTH_TOKEN/static Brain token for localhost requests, and update cron-viral-analytics, cron-cc-statements, cc cron-log poster, and other local cron API fetches to use it. Add a small cron preflight that fails loudly if /api/health passes but an authenticated /api/cc/crons request returns 401.
