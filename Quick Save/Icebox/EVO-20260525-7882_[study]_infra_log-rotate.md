---
version: "draft"
type: study
status: icebox
outcome: pending
date: 2026-06-01
brain_task_id: ~
source: oracle
tags: [oracle, declutter, logs]
conversation: "95e670f8-6d70-4ee0-a204-e52f33c1c8fa"
conversation_title: "Hydra EVO Batch Review"
related_plans_same_conversation:
  - "V12.17.0_[impl]_mission-control_fb-send-idempotency.md"
merged_task_ids: [EVO-20260525-7882]
related: []
summary: >
  Oracle optimization finding: brain-app error log is dominated by stale startup failures that no longer reflect the live process state. Iceboxed.
---

# EVO-7882: Infra error log rotate

## 📌 Context (Compiled Truth)
Evaluated in batch review and sent to ICEBOX. Good hygiene but not urgent since no active outage. Adding logrotate + boot_ok marker would help prevent Oracle false positives in the future.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
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
{
  "web_error_tail": "Last 160 brain-app error lines repeat `Error: Cannot find module '/root/brain-app/server.js'`.",
  "current_filesystem": "`/root/brain-app/server.js` exists in the project root.",
  "current_runtime": "PM2 reports brain-app online with pm_exec_path `/root/brain-app/server.js`, and web out log shows successful 200/202 responses after restarts.",
  "risk": "Future monitoring or manual triage can mistake old boot-loop noise for an active outage, especially because the error tail contains no newer contextual separator or timestamp."
}

## Recommended Action
Add a deploy-time or PM2 logrotate policy that timestamps/rotates error logs after successful boot, and consider emitting a clear `boot_ok` marker so stale pre-fix stack traces do not dominate the default tail view.
```

## 🔬 Timeline & Debugging Log
- **2026-06-01**: ICEBOXED.

## 🔗 GBRAIN Backlinks
### enables
- **2026-06-01 07:56** | [EVO-7719 Rejected](../Rejected/EVO-20260524-7719_[study]_mc_schedule-times-esm.md) -- Helps prevent Oracle reading stale logs
