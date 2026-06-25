---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-187
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: PM2 restart loop is still active, now clearly tied to deployment/reload behavior rather than crashes
---

# Oracle Proposal (EVO-20260507-187)
**Mission:** maintain
**Level:** critical
**Title:** PM2 restart loop is still active, now clearly tied to deployment/reload behavior rather than crashes

## Evidence
```json
{
  "pm2": "brain-app online restarts=1106 uptime≈14m; discord-bot online restarts=1080 uptime≈14m",
  "pm2_events": "paired brain-app + discord-bot stop/start cycles at 14:05, 14:17, 14:27, 14:54, 16:00, 16:02, 19:20, 20:47; exits are clean SIGINT/SIGKILL, not process crashes",
  "probable_source": "tmp/post-receive contains pm2 stop brain-app, pm2 start brain-app, pm2 restart discord-bot; scripts/watchdog/remediate.js and health-check.sh can also restart services"
}
```

## Recommended Action
Add restart attribution and a deploy/restart lock: log caller + reason before every PM2 restart, skip restarts when a deploy hook is already active, and debounce health/remediation restarts for at least 30 minutes per service.
