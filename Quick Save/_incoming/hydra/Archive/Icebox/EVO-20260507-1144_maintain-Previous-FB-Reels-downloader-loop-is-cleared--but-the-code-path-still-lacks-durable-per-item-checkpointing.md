---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-1144
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: Previous FB Reels downloader loop is cleared, but the code path still lacks durable per-item checkpointing
---

# Oracle Proposal (EVO-20260507-1144)
**Mission:** maintain
**Level:** optimization
**Title:** Previous FB Reels downloader loop is cleared, but the code path still lacks durable per-item checkpointing

## Evidence
```json
{
  "queue_file": "/root/brain-app/data/fb-reels-scraper.json now activeJob=null, jobQueue=[]",
  "prior_failure_pattern": "restarts during sync replayed work from the last 25-item flush boundary",
  "current_code_risk": "downloader persists currentIndex only after batch flush, so future restarts can replay up to 25 clips"
}
```

## Recommended Action
Keep the queue cleared, but patch downloader state saving to checkpoint after each successful URL or maintain a processed-id set; add a paused state when the same index repeats across restarts.
