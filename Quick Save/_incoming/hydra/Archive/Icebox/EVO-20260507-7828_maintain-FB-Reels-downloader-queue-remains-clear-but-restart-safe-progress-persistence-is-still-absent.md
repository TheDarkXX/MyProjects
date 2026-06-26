---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-7828
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: FB Reels downloader queue remains clear but restart-safe progress persistence is still absent
---

# Oracle Proposal (EVO-20260507-7828)
**Mission:** maintain
**Level:** optimization
**Title:** FB Reels downloader queue remains clear but restart-safe progress persistence is still absent

## Evidence
```json
{
  "queue_file": "/root/brain-app/data/fb-reels-scraper.json = {activeJob:null,jobQueue:[]}",
  "risk": "brain-app still receives clean SIGINT restarts; future long downloader jobs can still replay batch work if progress is only persisted at flush boundaries"
}
```

## Recommended Action
Before the next large sync, persist downloader progress after each URL or track processed IDs, and pause auto-resume if the same index repeats after restart.
