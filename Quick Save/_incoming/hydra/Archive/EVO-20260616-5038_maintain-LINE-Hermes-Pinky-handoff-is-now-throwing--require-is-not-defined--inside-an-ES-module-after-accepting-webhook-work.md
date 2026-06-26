---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-06-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260616-5038
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: LINE Hermes Pinky handoff is now throwing `require is not defined` inside an ES module after accepting webhook work
---

# Oracle Proposal (EVO-20260616-5038)
**Mission:** maintain
**Level:** critical
**Title:** LINE Hermes Pinky handoff is now throwing `require is not defined` inside an ES module after accepting webhook work

## Evidence
```json
{
  "web_log": "[LINE] Pinky Integration Exception: ReferenceError: require is not defined at Timeout._onTimeout (file:///root/brain-app/routes/line-hermes.js:160:32)",
  "context": "brain-app remains online, but recent /root/.pm2/logs/brain-app-error.log shows LINE Hermes webhook follow-up integration failing after webhook processing; this is distinct from the already-tracked clearHistory duplicate declaration and privacy prompt issues.",
  "ops_correlation": "Recent deploy-hook events repeatedly restarted brain-app and discord-bot on 2026-06-16; PM2 restart counts were not used alone for diagnosis."
}
```

## Recommended Action
Inspect routes/line-hermes.js around the delayed Pinky integration block and replace CommonJS `require(...)` usage with ESM-compatible static import or dynamic `await import(...)`; add a small startup/import smoke test for line-hermes so future deploys catch ESM/CommonJS regressions before webhooks accept messages.
