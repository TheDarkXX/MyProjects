---
proposal_id: EVO-20260424-173
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-24T17:49:23.612Z
---
# 🚀 Evolution Proposal: Adjust Watchdog Schedule Check to Rolling 24h Window

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** SQL Query ใน goals.js สำหรับ check 'today-has-scheduled' น่าจะใช้เงื่อนไข DATE(start_time) = DATE('now') ซึ่งจะคืนค่า 0 หากยังไม่มี Job วิ่งในวันปัจจุบัน หรือเวลาของ Server กับ Database ไม่ตรงกัน (Timezone drift)

**Description:**
ปัญหาเกิดจากการตรวจสอบเงื่อนไข 'today-has-scheduled' ที่ใช้การเปรียบเทียบวันที่เข้มงวด (Strict Date) ซึ่งทำให้นับจำนวนงานได้ 0 ในช่วงเวลาที่ Job ยังไม่ทำงานของวัน หรือเกิดปัญหา Timezone แนะนำให้เปลี่ยน Query ให้ตรวจสอบงานที่เกิดขึ้นในช่วง 24 ชั่วโมงย้อนหลังแทน เพื่อให้แน่ใจว่าระบบยังมีการทำงานอยู่และลดการเตือนภัยที่ไม่จำเป็น

## 🛠️ Proposed Changes
```json
[
  {
    "file": "scripts/watchdog/goals.js",
    "action": "Update the query for 'today-has-scheduled' check to use 'start_time > datetime(\\'now\\', \\'-24 hours\\', \\'localtime\\')' instead of strict date equality to validate system health based on recent activity."
  }
]
```

## 🔙 Rollback Plan
Revert the query string in scripts/watchdog/goals.js back to the original strict date comparison.
