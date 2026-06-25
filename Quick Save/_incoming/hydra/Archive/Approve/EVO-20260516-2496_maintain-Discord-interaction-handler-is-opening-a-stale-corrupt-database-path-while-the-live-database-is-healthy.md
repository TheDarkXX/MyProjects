---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260516-2496
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Discord interaction handler is opening a stale/corrupt database path while the live database is healthy
---

# Oracle Proposal (EVO-20260516-2496)
**Mission:** maintain
**Level:** critical
**Title:** Discord interaction handler is opening a stale/corrupt database path while the live database is healthy

## Evidence
```json
{
  "new_since_last_run": "Discord error log now includes `[interaction] Error handling interaction: database disk image is malformed`.",
  "healthy_live_db": "`PRAGMA integrity_check;` via queryDB returned `ok` and sqlite_master reports 74 tables.",
  "path_mismatch": "discord-bot/lib/brain.js uses Brain API at `http://127.0.0.1:3001/api`, but discord-bot/index.js InteractionCreate dynamically opens `../db/brain.db` directly.",
  "stale_files_present": "/root/brain-app/db contains brain.db plus brain.db.corrupt, brain.db.old, brain.db.pre-deploy, brain.db.pre-restore-20260505 and WAL/SHM companions, increasing risk that direct SQLite access is using an old/corrupt side database instead of the API-backed DB.",
  "why_new_not_duplicate": "This is not the previously rejected/approved backup-integrity topic: the live DB integrity check is OK; the new issue is a Discord interaction code path bypassing the Brain API and touching a separate/stale SQLite file, causing user-facing interaction failures."
}
```

## Recommended Action
Route Discord InteractionCreate reads/writes through the existing Brain API wrappers, or verify/standardize the DB path to the single canonical database and add an integrity/open check before registering interaction actions. Also remove or quarantine stale `.corrupt/.old/.pre-*` DB files from runtime lookup paths after confirming backups.
