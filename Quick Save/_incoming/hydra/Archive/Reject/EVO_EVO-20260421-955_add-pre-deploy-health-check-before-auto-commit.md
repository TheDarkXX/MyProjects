---
version: "N/A"
type: impl
status: active
outcome: pending
date: 2026-04-21
brain_task_id: EVO-20260421-955
source: hydra-ideator
tags: [high-risk, manual-review]
conversation: ""
conversation_title: ""
related_plans_same_conversation: []
related: []
summary: >
  ปัญหา: evolver.js เป็น BLOCKED tier แต่กลับถูก auto-deploy ซึ่งทำให้เกิด 19 errors หลัง deploy วิธีแก้คือเพิ่ม pre-deploy health check — นับ errors ก่อน deploy, deploy, แล้วตรวจสอบ errors หลัง deploy ว่าเกิน threshold หรือไม่ ถาเกินให้ rollback ทันที
---

# Add pre-deploy health check before auto-commit

**Risk Level:** HIGH
**Category:** performance_opportunity

## Root Cause
CONFIG มี DEPLOY_HEALTH_CHECK_THRESHOLD=5 และ DEPLOY_HEALTH_CHECK_TIMEOUT_MS=30000 แต่ไม่มีการใช้งานจริงใน deployment flow — evolver.js ซึ่งเป็น BLOCKED tier ถูก auto-deploy โดยไม่มี health check ก่อน commit ทำให้ regression เกิดขึ้นแล้วต้องรอ inspector ตรวจพบทีหลัง

## Proposed Changes
```json
[
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add a countCurrentErrors() helper function that queries Discord bot error log or runs a quick smoke test via health check endpoint to get current error count"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add deployWithHealthCheck() async function that: (1) captures preDeployErrors = countCurrentErrors(), (2) commits changes, (3) waits DEPLOY_HEALTH_CHECK_TIMEOUT_MS, (4) captures postDeployErrors, (5) if postDeployErrors > preDeployErrors + DEPLOY_HEALTH_CHECK_THRESHOLD → rollback immediately"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Replace direct execSync(git commit) calls in the auto-deploy flow with deployWithHealthCheck() wrapper"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "If DEPLOY_HEALTH_CHECK_THRESHOLD is undefined or 0, skip health check gracefully to maintain backward compatibility"
  }
]
```
