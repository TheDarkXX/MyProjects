---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-20
brain_task_id: ~
source: oracle
proposal_id: EVO-20260520-4268
tags: [oracle, optimize, optimization]
summary: >
  Oracle optimization finding: Mission Control analytics sync route now exists, but it is running as a 40-second synchronous web request
---

# Oracle Proposal (EVO-20260520-4268)
**Mission:** optimize
**Level:** optimization
**Title:** Mission Control analytics sync route now exists, but it is running as a 40-second synchronous web request

## Evidence
```json
{
  "web_log": "Two recent POST /api/mc/planner/sync-analytics requests returned 200 but took 39s and 40s.",
  "changed_condition": "This is not the previously tracked missing-route problem; the route is now present and successful, but it occupies a live brain-app request for long-job duration.",
  "ops_context": "Recent PM2 restarts align with deploy-hook events, so this finding is based on request latency/log behavior rather than restart counts.",
  "known_issue_filter": "Did not re-propose prior approved/rejected/iceboxed items such as missing sync-analytics route, TaskFileGen push failures, OpenClaw sessions errors, PM2 env secrets, or Discord debug logging."
}
```

## Recommended Action
Convert /api/mc/planner/sync-analytics into an asynchronous job: return 202 immediately with a job id, run the Sheets/Facebook analytics sync under a single-flight lock, store progress/results in mc_jobs or cc_cron_run_logs, and have the UI poll status. At minimum add a timeout, concurrency guard, and cached last-success response so repeated dashboard/cron calls cannot tie up brain-app for 40s each.
