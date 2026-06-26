---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-06-24
brain_task_id: ~
source: oracle
proposal_id: EVO-20260624-843
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Brain API auth now has a hardcoded fallback bearer token that can bypass the new localhost-auth lockout if GATEWAY_AUTH_TOKEN is unset
---

# Oracle Proposal (EVO-20260624-843)
**Mission:** guard
**Level:** critical
**Title:** Brain API auth now has a hardcoded fallback bearer token that can bypass the new localhost-auth lockout if GATEWAY_AUTH_TOKEN is unset

## Evidence
```json
{
  "file": "/root/brain-app/routes/auth.js",
  "code": "const gatewayToken = process.env.GATEWAY_AUTH_TOKEN || 'ZIvyWp4BTqcX2Gm1aDHR7lwz0i8PrVqug5KWBX53wqI'; if (token && (token === generateStaticToken(correctPw) || token === 'no-auth' || token === gatewayToken)) { return next(); }",
  "delta_context": "Recent logs show the localhost auth bypass was removed and local callers now receive 401s; the replacement gateway-token path is therefore security-critical.",
  "observed_logs": [
    "brain-app out: GET /api/tasks -> 401 immediately after restart, then later authenticated 200s",
    "discord-bot error: repeated Brain API 401 Unauthorized after the auth change"
  ],
  "not_duplicate_of_memory": "Different from the deployed Host-header localhost bypass issue and different from the rejected PM2 environment-token exposure; this is a source-level hardcoded fallback credential that grants API access when env is missing."
}
```

## Recommended Action
Fail closed when GATEWAY_AUTH_TOKEN is absent: remove the literal fallback token, require an env-provided token, and log a startup warning/error if internal gateway auth is not configured. Rotate this token because it is now exposed in repository source.
