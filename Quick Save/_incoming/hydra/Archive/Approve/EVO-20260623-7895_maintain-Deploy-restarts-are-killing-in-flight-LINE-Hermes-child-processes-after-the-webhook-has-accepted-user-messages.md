---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-06-23
brain_task_id: ~
source: oracle
proposal_id: EVO-20260623-7895
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Deploy restarts are killing in-flight LINE Hermes child processes after the webhook has accepted user messages
---

# Oracle Proposal (EVO-20260623-7895)
**Mission:** maintain
**Level:** critical
**Title:** Deploy restarts are killing in-flight LINE Hermes child processes after the webhook has accepted user messages

## Evidence
```json
{
  "web_error_log": "[LINE Webhook] Hermes Execution Error ... code: null, killed: true, signal: 'SIGTERM' ... cmd: hermes -z '[LINE Chat] ...'",
  "web_out_log": "Multiple consecutive `🛑 Shutting down (SIGINT)...` followed by server reboots in the current brain-app log tail",
  "ops_events": "Recent deploy-hook events restarted brain-app/discord-bot at 2026-06-23 05:47:13 and multiple times on 2026-06-22",
  "distinction_from_pm2_counts": "This is not inferred from restart counts; it is evidenced by LINE child-process SIGTERM errors plus deploy/SIGINT log context."
}
```

## Recommended Action
Add graceful shutdown tracking for LINE Hermes child processes: on SIGINT/SIGTERM stop accepting new LINE work, wait for active Hermes executions up to a short drain timeout, and only then exit. For safer shipping, decouple LINE webhook from Hermes execution by enqueueing accepted events and processing them from a worker so deploy restarts do not silently drop user replies.
