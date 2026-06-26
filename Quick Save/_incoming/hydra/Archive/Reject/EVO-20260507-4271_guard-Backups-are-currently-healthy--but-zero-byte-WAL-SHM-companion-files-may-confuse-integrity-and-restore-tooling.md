---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-4271
tags: [oracle, guard, optimization]
summary: >
  Oracle optimization finding: Backups are currently healthy, but zero-byte WAL/SHM companion files may confuse integrity and restore tooling
---

# Oracle Proposal (EVO-20260507-4271)
**Mission:** guard
**Level:** optimization
**Title:** Backups are currently healthy, but zero-byte WAL/SHM companion files may confuse integrity and restore tooling

## Evidence
```json
{
  "latest_backup": "brain_20260508_040001.db size=3452928 bytes, inspector says latest backup OK",
  "companion_files": "brain_20260508_040001.db-wal size=0, brain_20260508_040001.db-shm size=32768",
  "prior_issue": "2026-05-05 inspector-backup previously detected a corrupted backup via integrity_check"
}
```

## Recommended Action
During backup, checkpoint first, copy only the main SQLite DB unless WAL is non-empty and required, then run PRAGMA integrity_check on the copied artifact before rotation.
