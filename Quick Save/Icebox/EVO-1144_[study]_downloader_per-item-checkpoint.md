---
version: "draft"
type: study
status: icebox
outcome: deferred
date: 2026-05-08
brain_task_id: ~
source: oracle
proposal_id: EVO-1144
tags: [oracle, maintain, downloader]
conversation: "5bf9004e-3269-4248-bd77-c526c93082f3"
conversation_title: "Hydra Proposal Review - 2026-05-07 Batch"
related_plans_same_conversation:
  - "V12.4.0_[impl]_infra_restart-attribution-deploy-lock.md"
related: []
merged_task_ids: [EVO-1144, EVO-3474, EVO-7828]
summary: >
  Future enhancement to implement restart-safe checkpointing for the FB Reels downloader. Will pause auto-resume if the same index repeats, saving progress after each successful item instead of batch flushes. Deferred because the queue is currently empty.
---

# FB Reels Downloader - Per-Item Checkpointing (Icebox)

## 📌 Context (Compiled Truth)
- FB Reels downloader previously looped and replayed 25 clips upon PM2 restarts.
- Recommend persisting index per item.
- Placed in ICEBOX as the queue is currently empty, not urgent right now.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
<details><summary>EVO-1144</summary>

```json
{
  "queue_file": "/root/brain-app/data/fb-reels-scraper.json now activeJob=null, jobQueue=[]",
  "prior_failure_pattern": "restarts during sync replayed work from the last 25-item flush boundary",
  "current_code_risk": "downloader persists currentIndex only after batch flush, so future restarts can replay up to 25 clips"
}
```
</details>

## 🔬 Timeline & Debugging Log
- 2026-05-08: ICEBOXED from Oracle /evo review.

## 🔗 GBRAIN Backlinks
### related_to
- **2026-05-08 08:44** | [PM2 Restart Attribution](c:\My Claw\Openclaw-VPS\Quick Save\Active\V12.4.0_[impl]_infra_restart-attribution-deploy-lock.md) -- Resolves the underlying PM2 restarts that caused the downloader to loop.
