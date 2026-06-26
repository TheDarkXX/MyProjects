---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-06-10
brain_task_id: ~
source: oracle
proposal_id: EVO-20260610-3409
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Hermes dashboard is running in insecure mode on all network interfaces
---

# Oracle Proposal (EVO-20260610-3409)
**Mission:** guard
**Level:** critical
**Title:** Hermes dashboard is running in insecure mode on all network interfaces

## Evidence
```json
{
  "process": "hermes-dashboard",
  "pm2_exec_path": "/usr/bin/bash",
  "pm2_args": "hermes dashboard --no-open --insecure --host 0.0.0.0 --port 9119",
  "status": "online",
  "memory": "218935296 bytes",
  "why_new": "This is distinct from the previously rejected PM2 environment-secret exposure finding; the risk is an actively exposed unauthenticated/insecure dashboard listener."
}
```

## Recommended Action
Move Hermes dashboard behind localhost-only binding or an authenticated reverse proxy: change host from 0.0.0.0 to 127.0.0.1, remove --insecure where possible, and allow access only via SSH tunnel/VPN or a firewall-restricted authenticated proxy.
