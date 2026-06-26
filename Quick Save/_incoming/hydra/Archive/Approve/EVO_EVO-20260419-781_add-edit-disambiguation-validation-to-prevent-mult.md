---
version: "N/A"
type: impl
status: active
outcome: pending
date: 2026-04-19
brain_task_id: EVO-20260419-781
source: hydra-ideator
tags: [high-risk, manual-review]
conversation: ""
conversation_title: ""
related_plans_same_conversation: []
related: []
summary: >
  เมื่อ evolver.js ทำการ replace string ด้วย split/join มันจะ replace ทุก occurrence ของ find string ซึ่งอาจทำให้โค้ดพังได้ถ้า find string ไม่จำเพาะพอ ควรเพิ่ม validation ที่ตรวจว่า find string ปรากฏกี่ครั้งและถ้ามากกว่า 1 ครั้งต้อง warn/error ก่อน apply
---

# Add edit disambiguation validation to prevent multi-replacement regressions

**Risk Level:** HIGH
**Category:** performance_opportunity

## Root Cause
ฟังก์ชัน applyEdits ใช้ split/join แทน single replacement ทำให้ทุก occurrence ถูกแทนที่ ขณะที่ validateEdits ตรวจแค่ว่า find string มีอยู่ในไฟล์หรือไม่ ไม่ได้นับว่ามีกี่ครั้ง ถ้า find string ซ้ำในไฟล์หลายที่ (เช่น ชื่อฟังก์ชันเดียวกัน) จะถูกแทนที่หมดทำให้โค้ดพัง

## Proposed Changes
```json
[
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add occurrence counting in validateEdits: after checking fileContent.includes(edit.find), add count = (fileContent.match(new RegExp(escapeRegExp(edit.find), 'g')) || []).length; if (count > 1) return { ok: false, error: `String '${edit.find.substring(0, 30)}' appears ${count} times in ${edit.file} — make find string more specific` }"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add helper function escapeRegExp at top of file: function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'); }"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "In buildJsonEditPrompt, add instruction: 'find string ต้องจำเพาะพอที่จะปรากฏแค่ครั้งเดียวในไฟล์ ถ้าชื่อฟังก์ชัน/ตัวแปรซ้ำกันให้ใส่ context รอบๆ เช่น บรรทัดก่อนหน้า 2-3 บรรทัด'"
  }
]
```
