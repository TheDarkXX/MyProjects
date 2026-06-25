---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-14
brain_task_id: ~
source: oracle
proposal_id: EVO-20260514-6465
tags: [oracle, declutter, optimization]
summary: >
  Oracle optimization finding: Hydra archive files are being committed with live `awaiting_human` status, risking stale proposal re-ingestion
---

# Oracle Proposal (EVO-20260514-6465)
**Mission:** declutter
**Level:** optimization
**Title:** Hydra archive files are being committed with live `awaiting_human` status, risking stale proposal re-ingestion

## Evidence
```json
{
  "mode": "delta",
  "gitDiff": "Last diff adds archived proposal files under `Quick Save/_incoming/hydra/Archive/Approve/` and `Archive/DeepFreeze/` while their frontmatter still says `status: awaiting_human`. Examples include `EVO_EVO-20260504-450_pm2-crash-loop-prevention...md`, `EVO_EVO-20260505-183_discord-bot-crash-loop...md`, and `EVO_EVO-20260505-870_replace-md5-with-xxhash3...md`.",
  "memory_conflict_check": "Not present in previous approved/deployed/rejected/iceboxed Oracle proposals.",
  "impact": "Old PM2/backup/cache proposals can look active again to any scanner that keys on frontmatter status instead of archive path, polluting human review queues and Oracle/Hydra memory with already-handled or rejected topics."
}
```

## Recommended Action
Update the Hydra proposal ingestion/archive workflow so archived files are either rewritten to terminal statuses (`approved`, `deep_frozen`, `rejected`) or ignored by path prefix `Quick Save/_incoming/hydra/Archive/**`. Add a small guard in the scanner: if path contains `/Archive/`, never treat `status: awaiting_human` as actionable.
