---
version: "draft"
type: study
status: icebox
outcome: pending
date: 2026-05-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260514-1841
merged_task_ids: [EVO-20260514-6465]
tags: [oracle, declutter, git]
conversation: "718edc46-503e-4824-a740-48a18d88eea2"
conversation_title: "Hydra Proposal Review"
related_plans_same_conversation:
  - "V12.7.14_[hotfix]_maintain_error-logging.md"
related: []
summary: >
  TaskFileGen fails git push because local repo is stale. Merged with EVO-6465 regarding Hydra Archive Status Pollution.
---

# EVO-1841: TaskFileGen Git Push Failures & Archive Status

## 📌 Context (Compiled Truth)
Discord TaskFileGen fails `git push` because local repo is stale (needs fetch/rebase first). Also `.git/gc.log` is blocking auto-cleanup. Valid problem but low urgency. TaskFileGen is a background sync feature, not mission-critical. Revisit when Discord bot git workflow gets more traffic.
Merged with EVO-6465: Archived proposals still have `status: awaiting_human` in frontmatter.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
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
```

### Merged: EVO-20260514-6465
```markdown
# Oracle Proposal (EVO-20260514-6465)
**Mission:** declutter
**Level:** optimization
**Title:** Hydra archive files are being committed with live `awaiting_human` status, risking stale proposal re-ingestion

## Recommended Action
Update the Hydra proposal ingestion/archive workflow so archived files are either rewritten to terminal statuses (`approved`, `deep_frozen`, `rejected`) or ignored by path prefix `Quick Save/_incoming/hydra/Archive/**`. Add a small guard in the scanner: if path contains `/Archive/`, never treat `status: awaiting_human` as actionable.
```

## 🔬 Timeline & Debugging Log
- **2026-05-16**: Iceboxed via `/evo`.

## 🔗 GBRAIN Backlinks
- **2026-05-16** | [V12.7.14_[hotfix]_maintain_error-logging.md](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Active/V12.7.14_[hotfix]_maintain_error-logging.md) -- Context
