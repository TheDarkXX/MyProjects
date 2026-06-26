---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-8829
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: brain-app and discord-bot are still being restarted repeatedly by PM2 even though they exit cleanly
---

# Oracle Proposal (EVO-20260507-8829)
**Mission:** maintain
**Level:** critical
**Title:** brain-app and discord-bot are still being restarted repeatedly by PM2 even though they exit cleanly

## Evidence
```json
{
  "pm2_current": "brain-app restarts=1106 uptime≈1m; discord-bot restarts=1073 uptime≈1m",
  "pm2_log_recent": "paired stop/start cycles at 13:19, 13:37, 13:44, 13:52, 14:05; exits via SIGINT/SIGKILL then online again",
  "impact": "service is online but uptime keeps resetting; long-running in-process jobs, WAL checkpoints, and user sessions can be interrupted"
}
```

## Recommended Action
Find the actor issuing PM2 restarts/deploys and add a debounce/lock so brain-app + discord-bot are not restarted while already healthy; preserve restart reason in PM2 metadata or deploy logs.
