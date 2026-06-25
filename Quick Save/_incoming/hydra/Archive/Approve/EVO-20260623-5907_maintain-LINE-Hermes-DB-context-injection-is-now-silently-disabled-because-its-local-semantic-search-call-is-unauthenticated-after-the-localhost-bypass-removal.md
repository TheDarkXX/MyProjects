---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-06-23
brain_task_id: ~
source: oracle
proposal_id: EVO-20260623-5907
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: LINE Hermes DB-context injection is now silently disabled because its local semantic-search call is unauthenticated after the localhost bypass removal
---

# Oracle Proposal (EVO-20260623-5907)
**Mission:** maintain
**Level:** critical
**Title:** LINE Hermes DB-context injection is now silently disabled because its local semantic-search call is unauthenticated after the localhost bypass removal

## Evidence
```json
{
  "mode": "delta",
  "web_log": "After a LINE webhook request, brain-app logs `POST /api/links/semantic-search` returning 401, followed by multiple auth-protected DB endpoints also returning 401, then LINE replies anyway.",
  "code_line_hermes": "routes/line-hermes.js calls `fetch('http://localhost:3001/api/links/semantic-search', { headers: { 'Content-Type': 'application/json' } ... })` with no Authorization header.",
  "code_auth": "routes/auth.js now only bypasses `/api/auth`, `/api/webhook`, `/api/health`, static assets, and requires a static/gateway token for all other `/api/*` routes; the old localhost Host-header bypass is explicitly removed.",
  "why_new": "This is not the prior host-header bypass issue; it is a post-fix regression where an internal trusted LINE workflow lost access to the protected semantic-search API."
}
```

## Recommended Action
Update the LINE Hermes internal fetches to include the configured `GATEWAY_AUTH_TOKEN`/service token, or expose a narrow internal helper/function for semantic search that does not traverse the public auth middleware. Also log non-OK semantic-search responses so DB-context loss is visible instead of silently falling back.
