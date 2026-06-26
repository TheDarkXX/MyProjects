---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-14
brain_task_id: ~
source: oracle
proposal_id: EVO-20260514-1841
tags: [oracle, declutter, optimization]
summary: >
  Oracle optimization finding: Discord TaskFileGen is repeatedly failing git pushes against a stale local repo and blocking git auto-cleanup
---

# Oracle Proposal (EVO-20260514-1841)
**Mission:** declutter
**Level:** optimization
**Title:** Discord TaskFileGen is repeatedly failing git pushes against a stale local repo and blocking git auto-cleanup

## Evidence
```json
{
  "discord_error_log": "Multiple `[TaskFileGen] Git push failed` blocks show `! [rejected] HEAD -> master (fetch first)` and `Updates were rejected because the remote contains work that you do not have locally`.",
  "git_maintenance_warning": "Log also reports `.git/gc.log` is present, `Automatic cleanup will not be performed until the file is removed`, and `There are too many unreachable loose objects`.",
  "impact": "Generated task-file changes can be lost or stuck, while repo object debris grows and future bot git operations become slower/flakier."
}
```

## Recommended Action
Make TaskFileGen use a safe git transaction: fetch/rebase or reset to remote before committing, serialize bot-side repo writes with a lock, and surface push failures to ops_events. Separately inspect and clear the root cause recorded in `.git/gc.log`, then run repository maintenance during a quiet window.
