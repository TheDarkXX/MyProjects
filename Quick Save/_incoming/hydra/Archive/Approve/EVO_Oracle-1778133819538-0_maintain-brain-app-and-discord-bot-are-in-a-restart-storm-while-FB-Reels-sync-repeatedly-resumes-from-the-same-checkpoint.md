---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: brain-app and discord-bot are in a restart storm while FB Reels sync repeatedly resumes from the same checkpoint
---

# Oracle Proposal
**Mission:** maintain
**Level:** critical
**Title:** brain-app and discord-bot are in a restart storm while FB Reels sync repeatedly resumes from the same checkpoint

## Evidence
```json
{
  "pm2": "brain-app online, restarts=1106, uptime≈50s; discord-bot online, restarts=1068, uptime≈49s",
  "logs": "brain-app repeatedly logs SIGINT shutdown, resumes sync_1778133293889, and restarts fetching around items 26-40/140",
  "queue_file": "/root/brain-app/data/fb-reels-scraper.json activeJob sync_1778133293889 totalUrls=140 currentIndex=25 totalNew=25",
  "code": "routes/downloader.js saves currentIndex only after 25-item flush; repeated restarts before the next flush can replay work"
}
```

## Recommended Action
Treat as active incident: temporarily pause or clear the persisted sync job after preserving the queue JSON, then fix downloader resume to checkpoint after each item or on every successful metadata fetch, and add a PM2 restart-rate alert/circuit breaker for long sync jobs.
