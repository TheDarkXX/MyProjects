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
```json
{
  "source": "readWebLog(160)",
  "errors": "[Schedule Times] Error: ReferenceError: require is not defined repeated 4 times",
  "location": "file:///root/brain-app/routes/mission-control.js:1223",
  "runtime_context": "brain-app is running as ESM; the route file already uses top-level `import` statements",
  "since_last_run": "Not present in the previous proposal memory; surfaced after the 2026-05-23/2026-05-24 deploy wave"
}
```

## Recommended Action
Patch `routes/mission-control.js` around the schedule-times handler to use ESM-safe imports or the already imported `fs`/`path` utilities instead of `require`; add a lightweight smoke check for the schedule-times endpoint so deploys catch ESM/CommonJS regressions.
