---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-06-12
brain_task_id: ~
source: oracle
proposal_id: EVO-20260612-8055
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: Downloader streaming route can double-close its Web Stream controller during reel sync jobs
---

# Oracle Proposal (EVO-20260612-8055)
**Mission:** maintain
**Level:** optimization
**Title:** Downloader streaming route can double-close its Web Stream controller during reel sync jobs

## Evidence
```json
{
  "logs": "brain-app error log shows TypeError [ERR_INVALID_STATE]: Invalid state: Controller is already closed at ReadableStreamDefaultController.close and /root/brain-app/routes/downloader.js:503:61",
  "context": "The error appears amid sync-sheets reel ingestion failures, indicating the stream cleanup path is throwing after a child process/socket end path has already closed the response stream",
  "memory_check": "This is distinct from the existing iceboxed Facebook extractor parse-error finding; the new issue is the route's stream lifecycle throwing ERR_INVALID_STATE during cleanup."
}
```

## Recommended Action
Guard the downloader stream close/error paths with an idempotent `closed` flag and avoid calling controller.close/enqueue after abort, socket end, timeout, or prior close. Log the original yt-dlp/job failure without throwing a secondary Web Streams exception.
