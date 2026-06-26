---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-06-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260616-6943
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Host-header localhost bypass can turn external requests into fully trusted local admin traffic
---

# Oracle Proposal (EVO-20260616-6943)
**Mission:** guard
**Level:** critical
**Title:** Host-header localhost bypass can turn external requests into fully trusted local admin traffic

## Evidence
```json
{
  "auth_code": "/root/brain-app/routes/auth.js bypasses authentication whenever `host.startsWith('localhost') || host.startsWith('127.0.0.1')`",
  "secondary_auth_gap": "/root/brain-app/routes/config.js `checkPassword()` accepts any Bearer token with length > 10 as authenticated for sensitive config/AI-registry writes once the global auth gate is bypassed",
  "live_probe_context": "brain-app access log shows external scanners actively probing `/.env`, `/docker-compose.yml`, `/secrets.json`, `/credentials.json`, `/config.js`, and `/app.js`; normal Host requests are currently redirected/401, but the code trusts the client-controlled Host header for localhost bypass"
}
```

## Recommended Action
Remove Host-header-based auth bypass from production, or restrict it to the actual socket remote address/proxy-authenticated loopback. Also make config route authorization validate the same generated token/password instead of accepting any long Bearer string.
