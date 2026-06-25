---
proposal_id: EVO-20260424-708
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-24T17:48:45.047Z
---
# 🚀 Evolution Proposal: Adjust Watchdog Cron Check Window to Reduce False Positives

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** Logic การตรวจสอบ runCronOutcomeCheck ใน scripts/watchdog/watchdog.js มีเงื่อนไขเพียงอย่างเดียวคือต้องมี Log ใน 24 ชม. ย้อนหลังเสมอ ขาดความยืดหยุ่นในกรณีที่มีช่องว่างของเวลา (Gap) หรือ Logs ถูกจัดการโดย Process อื่น

**Description:**
ปัญหา Recurring Error เกิดจาก Watchdog ตรวจสอบ Cron Logs ย้อนหลัง 24 ชม. และพบว่าไม่มีข้อมูล ซึ่งอาจเกิดจากช่องว่างเวลาในการรันงาน หรือ Logs ถูก Cleanup ไปก่อนหน้านี้ ทำให้เกิด False Positive ขอเสนอแก้ไข Logic ให้มีการตรวจสอบ Fallback ย้อนหลัง 48 ชม. หาก 24 ชม. ไม่มีข้อมูล เพื่อยืนยันว่าระบบหยุดทำงานจริงๆ หรือแค่หยุดชั่วคราว

## 🛠️ Proposed Changes
```json
[
  {
    "file": "scripts/watchdog/watchdog.js",
    "action": "Update runCronOutcomeCheck to implement a 48-hour fallback check when the 24-hour count is zero, to distinguish between system downtime and temporary gaps or log cleanup."
  }
]
```

## 🔙 Rollback Plan
Revert the code in scripts/watchdog/watchdog.js to the previous version that strictly enforces the 24-hour window.
