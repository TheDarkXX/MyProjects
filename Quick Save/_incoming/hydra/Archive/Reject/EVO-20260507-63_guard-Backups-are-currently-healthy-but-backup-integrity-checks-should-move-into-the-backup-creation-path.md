---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-07
brain_task_id: ~
source: oracle
proposal_id: EVO-20260507-63
tags: [oracle, guard, optimization]
summary: >
  Oracle optimization finding: Backups are currently healthy but backup integrity checks should move into the backup creation path
---

# Oracle Proposal (EVO-20260507-63)
**Mission:** guard
**Level:** optimization
**Title:** Backups are currently healthy but backup integrity checks should move into the backup creation path

## Evidence
```json
{
  "latest_db": "/root/brain-app/db/brain.db 3444736 bytes",
  "latest_backup": "/root/brain-app/db/backups/brain_20260507_040001.db 3342336 bytes",
  "prior_issue": "inspector-backup previously logged a corrupted backup on 2026-05-05 with invalid page number; daily backup log only reports size/task counts"
}
```

## Recommended Action
Run sqlite PRAGMA integrity_check immediately after every daily backup and before rotation; retain at least one known-good pre-corruption backup outside normal rotation.
