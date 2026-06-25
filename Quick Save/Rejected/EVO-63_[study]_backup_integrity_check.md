---
version: "draft"
type: study
status: rejected
outcome: rejected
date: 2026-05-08
brain_task_id: ~
source: oracle
proposal_id: EVO-63
tags: [oracle, guard, rejected]
conversation: "5bf9004e-3269-4248-bd77-c526c93082f3"
conversation_title: "Hydra Proposal Review - 2026-05-07 Batch"
related_plans_same_conversation: []
related: []
merged_task_ids: [EVO-63, EVO-4040, EVO-4271]
summary: >
  Proposal to add backup PRAGMA integrity_check. Rejected because this is already covered by existing Active plan V12.3.1_[impl]_hydra_backup-integrity-check.md.
---

# Rejected: Backup Integrity Check (Duplicate)

## 📌 Context
- Rejected because V12.3.1 already handles this.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
<details><summary>EVO-63</summary>

```json
{
  "latest_db": "/root/brain-app/db/brain.db 3444736 bytes",
  "latest_backup": "/root/brain-app/db/backups/brain_20260507_040001.db 3342336 bytes",
  "prior_issue": "inspector-backup previously logged a corrupted backup on 2026-05-05 with invalid page number; daily backup log only reports size/task counts"
}
```
</details>

## 🔬 Timeline
- 2026-05-08: Rejected as duplicate.
