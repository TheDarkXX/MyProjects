---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-3474
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: FB Reels downloader incident is cleared, but restart-safe checkpointing is still needed before the next large sync
---

# Oracle Proposal (EVO-20260507-3474)
**Mission:** maintain
**Level:** optimization
**Title:** FB Reels downloader incident is cleared, but restart-safe checkpointing is still needed before the next large sync

## Evidence
```json
{
  "queue_file": "/root/brain-app/data/fb-reels-scraper.json is now {activeJob:null,jobQueue:[]}",
  "remaining_risk": "brain-app still restarts during deploys; downloader historically persisted progress only at batch boundaries, so a future long job can replay work after SIGINT"
}
```

## Recommended Action
Patch downloader to persist currentIndex after each successful item or keep a processed-id set, and pause instead of auto-resume if the same index repeats across restarts.
