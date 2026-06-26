---
version: "N/A"
type: impl
status: active
outcome: pending
date: 2026-04-19
brain_task_id: EVO-20260419-145
source: hydra-ideator
tags: [high-risk, manual-review]
conversation: ""
conversation_title: ""
related_plans_same_conversation: []
related: []
summary: >
  ระบบ auto-deploy ของ evolver ขาด validation gate ก่อน deploy และไม่มี auto-rollback เมื่อเกิด regression หลัง deploy ทำให้ proposal EVO-20260417-634 ที่มี bug ถูก deploy ไปสร้าง 21 errors ต้องเพิ่ม: 1) pre-deploy syntax/import validation 2) post-deploy error monitoring 3) auto-rollback เมื่อ detected errors เกิน threshold
---

# Add pre-deploy validation gate and post-deploy error monitoring with auto-rollback

**Risk Level:** HIGH
**Category:** performance_opportunity

## Root Cause
Evolver มีฟังก์ชัน validateEdits() และ dryRunPatch() อยู่แล้ว แต่ไม่ได้ถูกเรียกใช้ก่อนการ deploy จริง และไม่มี mechanism ตรวจจับ regression หลัง deploy เพื่อ trigger auto-rollback ทำให้ bad patch ถูก commit และ push ขึ้น production โดยไม่มี safety net

## Proposed Changes
```json
[
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add validateEditsAndSyntax() function that runs validateEdits() then does syntax check via node --check on each modified JS file before allowing deploy to proceed"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add postDeployHealthCheck() function that runs 'node --check' on all modified files within 30 seconds of deploy, counts stderr errors, and triggers rollback if errors > threshold (e.g., 5)"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Modify the main deploy flow to: 1) call validateEditsAndSyntax() before git add/commit/push 2) spawn postDeployHealthCheck() as async fire-and-forget after successful push 3) if health check fails, call rollback(snapshotHash) and notify Discord"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add CONFIG object with DEPLOY_HEALTH_CHECK_THRESHOLD: 5, DEPLOY_HEALTH_CHECK_TIMEOUT_MS: 30000 to make thresholds configurable"
  }
]
```
