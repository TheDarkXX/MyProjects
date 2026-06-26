---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-18
brain_task_id: ~
source: oracle
proposal_id: EVO-20260518-7224
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Sync-sheets downloader jobs are now crashing on undefined runtime variables instead of only failing individual Facebook reels
---

# Oracle Proposal (EVO-20260518-7224)
**Mission:** maintain
**Level:** critical
**Title:** Sync-sheets downloader jobs are now crashing on undefined runtime variables instead of only failing individual Facebook reels

## Evidence
```json
{
  "web_error_log": [
    "[sync-sheets] Job sync_1777627179933 crashed: urls is not defined",
    "[sync-sheets] Job sync_1777627914048 crashed: urls is not defined",
    "❌ Error: targetTabName is not defined"
  ],
  "code_context": "/root/brain-app/routes/downloader.js owns the sync-sheets queue/job state and is mounted unauthenticated at /api/downloader before auth middleware",
  "delta_context": "These crashes appear in the current brain-app log alongside active 2026-05-18 deploy/runtime output; this is distinct from the already tracked Facebook upload-token and FB Reels checkpointing items because the job runner itself is throwing ReferenceError-style failures."
}
```

## Recommended Action
Audit routes/downloader.js around the sync job start/resume/finalize paths and replace stale variable references like urls and targetTabName with the current job payload/state names. Add a top-level per-job try/catch that marks the job failed with the missing variable name and preserves queue state instead of crashing the whole sync job.
