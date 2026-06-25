---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-15
brain_task_id: ~
source: oracle
proposal_id: EVO-20260515-3452
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: AI cache hashing path can crash requests after the xxhash migration
---

# Oracle Proposal (EVO-20260515-3452)
**Mission:** maintain
**Level:** critical
**Title:** AI cache hashing path can crash requests after the xxhash migration

## Evidence
```json
{
  "file": "/root/brain-app/lib/ai-call.js",
  "current_import": "import xxhash from 'xxhash';",
  "current_call": "return `ai:cache:${xxhash3(data).toString(16)}`;",
  "problem": "xxhash3 is called but is not imported or defined in the module. Recent brain-app logs also show an earlier deployment failure around this same change: Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'xxhash' imported from /root/brain-app/lib/ai-call.js.",
  "delta_context": "gitDiff shows the last change added a DeepFreeze proposal to replace MD5 with xxhash3, while the live lib/ai-call.js already contains the migrated code."
}
```

## Recommended Action
Patch lib/ai-call.js to use the actual installed library API consistently, or revert to the previous crypto hash until a tested xxhash implementation is wired. Add a tiny startup/unit smoke check that imports lib/ai-call.js and calls RedisCache.generateKey once so future hash-library migrations fail before deploy.
