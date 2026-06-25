---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-06-25
brain_task_id: ~
source: oracle
proposal_id: EVO-20260625-6702
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Discord bot is now failing authenticated Brain API calls with 401 after the Brain API auth changes
---

# Oracle Proposal (EVO-20260625-6702)
**Mission:** maintain
**Level:** critical
**Title:** Discord bot is now failing authenticated Brain API calls with 401 after the Brain API auth changes

## Evidence
```json
{
  "mode": "delta",
  "discord_error_log": "Repeated `[brain] API 401: {\"error\":\"Unauthorized\",\"login\":\"/login.html\"}` followed by `[bot] Brain API error: [BRAIN_ERROR] Brain API 401...` in the latest discord-bot error log.",
  "brain_web_log": "brain-app is returning 401 for API routes such as `GET /api/tasks`, confirming the auth layer is actively rejecting unauthenticated internal API requests.",
  "pm2_env_signal": "pm2Status shows brain-app has `GATEWAY_AUTH_TOKEN`, but the discord-bot process environment shown in pm2Status does not include `GATEWAY_AUTH_TOKEN`, `BRAIN_API_TOKEN`, or another visible Brain API bearer token.",
  "ops_context": "Recent restarts align with deploy-hook events on 2026-06-25, so this is not diagnosed from PM2 restart counts; the actionable symptom is current 401 log evidence after deploys."
}
```

## Recommended Action
Give discord-bot an explicit internal Brain API bearer token and make its Brain API client attach `Authorization: Bearer $GATEWAY_AUTH_TOKEN` (or a dedicated `BRAIN_API_TOKEN`) on all protected calls. Add a startup health check that fails loudly if `BRAIN_API_URL` is configured but no Brain API auth token is present, so future auth hardening does not silently break Discord task/memory/brain integrations.
