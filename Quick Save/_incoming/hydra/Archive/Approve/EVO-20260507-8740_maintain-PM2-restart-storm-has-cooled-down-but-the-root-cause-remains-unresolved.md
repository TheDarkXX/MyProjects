---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-8740
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: PM2 restart storm has cooled down but the root cause remains unresolved
---

# Oracle Proposal (EVO-20260507-8740)
**Mission:** maintain
**Level:** critical
**Title:** PM2 restart storm has cooled down but the root cause remains unresolved

## Evidence
```json
{
  "current": "brain-app uptime≈2h restarts=1106; discord-bot uptime≈2h restarts=1081",
  "recent_event": "last paired clean restart at 2026-05-08T02:21 via SIGINT, then both restarted normally",
  "pattern": "historical PM2 log shows many paired brain-app + discord-bot stop/start cycles, indicating deploy/restart orchestration rather than crashes"
}
```

## Recommended Action
Keep priority on restart attribution: add a small ops_events/restart log around deploy hook, watchdog remediation, and health-check restart paths so the next restart records actor, reason, service, and lock state.
