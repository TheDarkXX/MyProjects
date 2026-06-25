---
version: "N/A"
type: impl
status: active
outcome: pending
date: 2026-04-19
brain_task_id: EVO-20260419-615
source: hydra-ideator
tags: [high-risk, manual-review]
conversation: ""
conversation_title: ""
related_plans_same_conversation: []
related: []
summary: >
  Evolver ใช้ applyEdits ที่ใช้ split/join แทนที่ string ทั้งหมดที่ match โดยไม่มี boundary awareness ทำให้ถ้า find string ซ้ำกันหลายที่ (เช่น ชื่อ function ที่คล้ายกัน) จะถูก replace หมดโดยไม่ตั้งใจ รวมถึงไม่มี JS syntax validation ก่อน deploy ทำให้ syntax error 21 ตัวหลุดเข้า production
---

# Add pre-deploy syntax validation before applyEdits

**Risk Level:** HIGH
**Category:** performance_opportunity

## Root Cause
applyEdits ใช้ fileContent.split(edit.find).join(edit.replace) ซึ่ง replace ALL occurrences โดยไม่มี word boundary หรือ position awareness และไม่มีการ validate JavaScript syntax ก่อน commit ว่า code ที่ได้หลัง replace จะ compile ได้หรือไม่

## Proposed Changes
```json
[
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Replace applyEdits to use regex with word boundary for replacement, adding syntax validation via vm.compile in Node.js before writing files"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add post-edit validation: after applyEdits, iterate each modified file, call vm.compile to check syntax, and reject if compilation fails"
  }
]
```
