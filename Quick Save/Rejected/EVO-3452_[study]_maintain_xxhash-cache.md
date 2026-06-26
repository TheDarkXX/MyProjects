---
version: "draft"
type: study
status: rejected
outcome: rejected
date: 2026-05-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260515-3452
tags: [oracle, maintain, rejected]
conversation: "718edc46-503e-4824-a740-48a18d88eea2"
conversation_title: "Hydra Proposal Review"
related_plans_same_conversation: []
related: []
summary: >
  Rejected: Already fixed in V12.0.4 hotfix.
---

# EVO-3452: xxhash Cache Crash

## 📌 Context (Compiled Truth)
This was already resolved in **V12.0.4** (sqlite_wal-corruption hotfix). The fix added `xxhash`, `xxhash-wasm`, and `redis` to `package.json` and ran `npm install` on VPS. Oracle is re-proposing a fix that shipped 11 days ago. This is stale data.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
# Oracle Proposal (EVO-20260515-3452)
**Mission:** maintain
**Level:** critical
**Title:** AI cache hashing path can crash requests after the xxhash migration
```

## 🔬 Timeline & Debugging Log
- **2026-05-16**: Rejected via `/evo`.

## 🔗 GBRAIN Backlinks
- **2026-05-05** | [V12.0.4_[hotfix]_sqlite_wal-corruption.md](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Complete/Complete/V12/V12.0.4_[hotfix]_sqlite_wal-corruption.md) -- Original Fix
