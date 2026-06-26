---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-25
brain_task_id: ~
source: oracle
proposal_id: EVO-20260525-7882
tags: [oracle, declutter, optimization]
summary: >
  Oracle optimization finding: brain-app error log is dominated by stale startup failures that no longer reflect the live process state
---

# Oracle Proposal (EVO-20260525-7882)
**Mission:** declutter
**Level:** optimization
**Title:** brain-app error log is dominated by stale startup failures that no longer reflect the live process state

## Evidence
```json
{
  "web_error_tail": "Last 160 brain-app error lines repeat `Error: Cannot find module '/root/brain-app/server.js'`.",
  "current_filesystem": "`/root/brain-app/server.js` exists in the project root.",
  "current_runtime": "PM2 reports brain-app online with pm_exec_path `/root/brain-app/server.js`, and web out log shows successful 200/202 responses after restarts.",
  "risk": "Future monitoring or manual triage can mistake old boot-loop noise for an active outage, especially because the error tail contains no newer contextual separator or timestamp."
}
```

## Recommended Action
Add a deploy-time or PM2 logrotate policy that timestamps/rotates error logs after successful boot, and consider emitting a clear `boot_ok` marker so stale pre-fix stack traces do not dominate the default tail view.
