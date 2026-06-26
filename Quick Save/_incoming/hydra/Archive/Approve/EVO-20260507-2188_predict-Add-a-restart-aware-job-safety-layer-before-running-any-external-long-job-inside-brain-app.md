---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-2188
tags: [oracle, predict, innovation]
summary: >
  Oracle innovation finding: Add a restart-aware job safety layer before running any external long job inside brain-app
---

# Oracle Proposal (EVO-20260507-2188)
**Mission:** predict
**Level:** innovation
**Title:** Add a restart-aware job safety layer before running any external long job inside brain-app

## Evidence
```json
{
  "patterns_seen": "FB metadata sync, Google Sheets writes, Discord notifications, DB WAL activity, and PM2 restarts all share one server process",
  "risk": "in-process background jobs are fragile when deploys or PM2 restarts happen during execution",
  "user_fit": "ship_fast_fix_later favors a small guard over a full queue rewrite"
}
```

## Recommended Action
Create a lightweight job_runs table with job_id, type, current_index, last_progress_at, restart_seen_count, paused_reason; on boot, resume only if progress advanced recently, otherwise pause and notify with resume/skip controls.
