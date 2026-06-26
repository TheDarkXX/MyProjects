---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
tags: [oracle, predict, innovation]
summary: >
  Oracle innovation finding: Add a self-pausing long-job guard for downloader jobs before they create restart loops
---

# Oracle Proposal
**Mission:** predict
**Level:** innovation
**Title:** Add a self-pausing long-job guard for downloader jobs before they create restart loops

## Evidence
```json
{
  "active_job": "FB sync job has 140 URLs and external yt-dlp/Google Sheets/Discord dependencies",
  "failure_pattern": "Repeated SIGINT + resume from stale checkpoint causes duplicate external work and PM2 churn",
  "user_profile": "ship_fast_fix_later; top components include infra and hydra"
}
```

## Recommended Action
Implement a lightweight job supervisor: track per-job restart count, last progressed index, and elapsed time; if progress is unchanged across 2 restarts, mark job paused and notify with resume/skip controls instead of auto-resuming blindly.
