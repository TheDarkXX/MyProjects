---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-4040
tags: [oracle, guard, optimization]
summary: >
  Oracle optimization finding: Backup health is currently OK but the chain contains a recent corrupted backup event that should become a regression test
---

# Oracle Proposal (EVO-20260507-4040)
**Mission:** guard
**Level:** optimization
**Title:** Backup health is currently OK but the chain contains a recent corrupted backup event that should become a regression test

## Evidence
```json
{
  "latest_backups": "brain_20260506_040001.db=2805760 bytes; brain_20260507_040001.db=3342336 bytes",
  "inspector_log": "2026-05-05 inspector reported backup integrity_check corruption with invalid page number",
  "daily_backup_log": "latest backups pass size and task-count checks, but historical May 5 corruption was only logged"
}
```

## Recommended Action
Add sqlite PRAGMA integrity_check to daily-backup.sh immediately after creating every DB backup and fail loudly before rotation if corruption is detected; keep at least one known-good pre-corruption backup outside rotation.
