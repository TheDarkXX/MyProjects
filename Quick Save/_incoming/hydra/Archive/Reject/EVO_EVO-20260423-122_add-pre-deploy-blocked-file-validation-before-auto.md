---
version: "N/A"
type: impl
status: active
outcome: pending
date: 2026-04-23
brain_task_id: EVO-20260423-122
source: hydra-ideator
tags: [high-risk, manual-review]
conversation: ""
conversation_title: ""
related_plans_same_conversation: []
related: []
summary: >
  ระบบ auto-deploy ของ evolver ไม่ได้ validate ว่า proposed_changes มีไฟล์ที่ classify เป็น BLOCKED หรือไม่ก่อน deploy ทำให้ proposal ที่แก้ไขไฟล์ใน scripts/hydra/ ถูก auto-deploy ได้โดยไม่มีใครตรวจ ทำให้เกิด regression 9 errors หลัง deploy ควรเพิ่ม pre-deploy validation ที่ reject ทันทีถ้ามีไฟล์ BLOCKED ใน proposal
---

# Add pre-deploy BLOCKED file validation before auto-deploy execution

**Risk Level:** HIGH
**Category:** performance_opportunity

## Root Cause
ฟังก์ชัน classifyFileRisk() มีอยู่แล้วแต่ไม่ได้ถูกเรียกใช้ตอน deploy time - evolver มี CONFIG.DEPLOY_HEALTH_CHECK_THRESHOLD: 5 แต่ไม่มี pre-deploy check ที่ตรวจว่าไฟล์ที่จะแก้เป็น BLOCKED หรือไม่ ทำให้ scripts/hydra/*.js (BLOCKED) ถูกแก้ได้ใน auto mode และ deploy ผ่าน health check แต่ยังคงมี errors หลัง deploy

## Proposed Changes
```json
[
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add preDeployValidation function that rejects auto-deploy if any proposed_changes file is classified as BLOCKED or HIGH risk"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Call preDeployValidation before applyEdits in the deploy flow, sending Discord alert and skipping deploy if validation fails"
  }
]
```
