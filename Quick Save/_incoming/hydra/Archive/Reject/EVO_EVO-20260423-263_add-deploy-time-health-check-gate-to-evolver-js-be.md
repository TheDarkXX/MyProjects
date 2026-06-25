---
version: "N/A"
type: impl
status: active
outcome: pending
date: 2026-04-23
brain_task_id: EVO-20260423-263
source: hydra-ideator
tags: [high-risk, manual-review]
conversation: ""
conversation_title: ""
related_plans_same_conversation: []
related: []
summary: >
  ระบบ auto-deploy ของ evolver.js ไม่มี health check gate ก่อน commit ทำให้ deploy ที่มี bug (เช่น EVO-20260419-269 ที่แก้ SQL query) ถูก auto-commit ไปแล้วเกิด regression 9 errors ต้องเพิ่ม health check step ที่รัน syntax check / dry-run ของ key files ก่อนที่จะ auto-commit ถ้า health check fail → rollback แทนที่จะ commit ผิด
---

# Add deploy-time health check gate to evolver.js before auto-deploy commits

**Risk Level:** HIGH
**Category:** performance_opportunity

## Root Cause
evolvers auto-deploy ใช้ deploy-then-check pattern คือ apply edits แล้ว commit ทันทีโดยไม่ได้ health-check ก่อน ถ้า deploy มี bug จะไปอยู่ใน production จนกว่าจะมีคนจับได้ EVO-20260419-269 ที่แก้ SQL query สำหรับ ideas-in-queue check มี bug ทำให้ 9 errors เกิดหลัง deploy

## Proposed Changes
```json
[
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add DEPLOY_HEALTH_CHECK_THRESHOLD=5 constant and health-check function that runs node --check on all affected JS files and returns pass/fail with error count. Insert health check call after applyEdits but before git add/commit. If health check fails (errors >= threshold), call rollback(snapshotHash) and notifyDiscord with regression alert instead of committing."
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "In the deploy sequence (after applyEdits), add: const healthOk = await runHealthCheck(affectedFiles); if (!healthOk) { rollback(snapshotHash); await notifyDiscord(`❌ Auto-deploy REGRESSED: ${proposal.id} caused ${errorCount} errors. Rolled back automatically.`); return; } // proceed with git add/commit only if health check passes"
  }
]
```
