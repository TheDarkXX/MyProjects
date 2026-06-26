---
proposal_id: EVO-20260424-189
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-24T18:59:06.541Z
---
# 🚀 Evolution Proposal: Fix today-has-scheduled cron check logic and add auto-healing

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** 1. การ query ใช้ DATE(start_time) = DATE('now', 'localtime') ซึ่งอาจไม่ตรงกับ timezone ของระบบ ทำให้นับ cron jobs ในวันนี้ผิดพลาด 2. ไม่มี fallback mechanism สำหรับกรณีที่ไม่มี cron jobs ถูก schedule ในวันนี้ (อาจเป็นเพราะระบบ scheduler ไม่ทำงานจริงๆ หรือเป็นช่วงเวลาที่ไม่ควรมี cron jobs)

**Description:**
แก้ไขปัญหา recurring error ของ watchdog check 'today-has-scheduled' ที่นับจำนวน cron jobs ในวันนี้ไม่ถูกต้อง และเพิ่มระบบ auto-healing สำหรับกรณีที่ไม่มี cron jobs ถูก schedule

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/watchdog/watchdog.js` | Fix timezone handling in runCronOutcomeCheck() by using datetime('now', 'localtime') for both compar | safe |
| `scripts/watchdog/watchdog.js` | Add smarter logic to distinguish between 'no cron jobs scheduled today' (normal) vs 'scheduler is br | safe |
| `scripts/watchdog/watchdog.js` | Add auto-healing mechanism that triggers scheduler if no cron jobs have run in extended period and s | safe |
| `scripts/watchdog/remediate.js` | Add remediation function for today-has-scheduled check that can restart scheduler or trigger manual  | safe |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
