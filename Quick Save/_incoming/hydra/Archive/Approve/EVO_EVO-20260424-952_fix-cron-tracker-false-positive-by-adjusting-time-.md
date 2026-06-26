---
proposal_id: EVO-20260424-952
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-24T18:30:13.265Z
---
# 🚀 Evolution Proposal: Fix Cron Tracker False Positive by Adjusting Time Window Logic

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** Logic การตรวจสอบใน runCronOutcomeCheck ใช้เงื่อนไขที่เข้มงวดเกินไป โดยตรวจสอบว่า 'ไม่มีงานที่ถูก scheduled ใน 24 ชม.' แต่ในความเป็นจริง cron jobs บางตัวอาจไม่ได้รันทุกวัน หรือรันในช่วงเวลาที่ไม่สม่ำเสมอ ทำให้เกิด false positive เมื่อไม่มีงานรันใน 24 ชั่วโมงที่ผ่านมา แม้ว่าระบบจะทำงานปกติ

**Description:**
🏆 **ARENA CHAMPION** (Defeated 2 other variants. Winner: PRAGMATIC)

แก้ไขปัญหา false positive ของ watchdog check 'cron-tracker-check' ที่รายงานว่า 'ไม่มีงานที่ถูก scheduled ใน 24 ชม.' ทั้งๆ ที่ระบบทำงานปกติ โดยปรับปรุง logic การตรวจสอบ time window ให้เหมาะสมกับพฤติกรรมจริงของ cron jobs

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/watchdog/watchdog.js` | Modify runCronOutcomeCheck function to use 48-hour window instead of 24-hour for scheduled jobs chec | safe |
| `scripts/watchdog/watchdog.js` | Add grace period logic for weekends or specific days when cron jobs are intentionally less frequent | safe |
| `scripts/watchdog/watchdog.js` | Improve logging to show actual cron schedule patterns for better debugging | safe |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
