---
version: "draft"
type: study
status: rejected
outcome: pending
date: 2026-06-01
brain_task_id: ~
source: oracle
tags: [oracle, duplicate]
conversation: "95e670f8-6d70-4ee0-a204-e52f33c1c8fa"
conversation_title: "Hydra EVO Batch Review"
related_plans_same_conversation:
  - "V12.17.0_[impl]_mission-control_fb-send-idempotency.md"
merged_task_ids: [EVO-20260524-7719]
related: []
summary: >
  Oracle critical finding: Mission Control schedule-times route is broken by CommonJS require inside an ES module. Rejected (Duplicate of V12.9.1).
---

# EVO-7719: Mission Control schedule-times ESM (REJECTED)

## 📌 Context (Compiled Truth)
Evaluated in batch review and REJECTED. This was already fixed in `V12.9.1_[hotfix]_mc_schedule-times-bug.md`. Oracle flagged this based on a stale error log.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-24
brain_task_id: ~
source: oracle
proposal_id: EVO-20260524-7719
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Mission Control schedule-times route is broken by CommonJS `require` inside an ES module
---

# Oracle Proposal (EVO-20260524-7719)
**Mission:** maintain
**Level:** critical
**Title:** Mission Control schedule-times route is broken by CommonJS `require` inside an ES module

## Evidence
{
  "source": "readWebLog(160)",
  "errors": "[Schedule Times] Error: ReferenceError: require is not defined repeated 4 times",
  "location": "file:///root/brain-app/routes/mission-control.js:1223",
  "runtime_context": "brain-app is running as ESM; the route file already uses top-level `import` statements",
  "since_last_run": "Not present in the previous proposal memory; surfaced after the 2026-05-23/2026-05-24 deploy wave"
}

## Recommended Action
Patch `routes/mission-control.js` around the schedule-times handler to use ESM-safe imports or the already imported `fs`/`path` utilities instead of `require`; add a lightweight smoke check for the schedule-times endpoint so deploys catch ESM/CommonJS regressions.
```

## 🔬 Timeline & Debugging Log
- **2026-06-01**: REJECTED (Duplicate).

## 🔗 GBRAIN Backlinks
### related_to
- **2026-06-01 07:58** | [V12.9.1 MC Schedule Times Bug](../Complete/V12.9.1_[hotfix]_mc_schedule-times-bug.md) -- The actual fix that rendered this proposal obsolete
