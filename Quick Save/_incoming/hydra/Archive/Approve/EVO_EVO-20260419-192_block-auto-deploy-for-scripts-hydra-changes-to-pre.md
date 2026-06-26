---
version: "N/A"
type: impl
status: active
outcome: pending
date: 2026-04-19
brain_task_id: EVO-20260419-192
source: hydra-ideator
tags: [high-risk, manual-review]
conversation: ""
conversation_title: ""
related_plans_same_conversation: []
related: []
summary: >
  ปัญหา: ระบบ auto-deploy ปล่อยให้ proposal ที่แก้ไข watchdog error ใน scripts/hydra/ ถูก deploy อัตโนมัติแล้วเกิด 21 errors ทันที ต้องย้าย scripts/hydra/ จาก tier HIGH ไปเป็น BLOCKED เพื่อให้ทุกการแก้ไขในระบบ meta-agent ต้องผ่าน manual review ก่อน deploy
---

# Block auto-deploy for scripts/hydra/ changes to prevent regression cascades

**Risk Level:** HIGH
**Category:** performance_opportunity

## Root Cause
classifyFileRisk() จัด scripts/hydra/ เป็น HIGH risk แต่ยังอนุญาตให้ auto-deploy ได้ (ต่างจาก routes/ ที่เป็น BLOCKED) ทำให้ watchdog fix ที่มี bug ถูก deploy ทันทีโดยไม่มีใครตรวจ ส่งผลให้ 21 errors เกิดขึ้นหลัง deploy

## Proposed Changes
```json
[
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Change classifyFileRisk: move 'scripts/hydra/' from 'HIGH' tier to 'BLOCKED' tier — replace the line 'if (b.startsWith('scripts/hydra/')) return 'HIGH';' with 'if (b.startsWith('scripts/hydra/')) return 'BLOCKED';'"
  }
]
```
