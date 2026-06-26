---
proposal_id: EVO-20260425-189
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-25T20:00:19.428Z
---
# 🚀 Evolution Proposal: Fix Watchdog 'today-has-scheduled' False Positive with Smart Cron Pattern Detection

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** watchdog ใช้การนับจำนวน cron jobs ที่ run ในวันนี้เท่านั้น (scheduledToday.cnt) โดยไม่พิจารณาว่า cron jobs บางตัวอาจไม่ได้ถูกกำหนดให้ run ทุกวัน หรืออาจมี schedule ที่ไม่สม่ำเสมอ ทำให้เกิด false positive เมื่อวันนั้นไม่มี cron jobs ที่ต้อง run จริงๆ

**Description:**
แก้ไขปัญหา recurring error ใน watchdog ที่รายงานว่าไม่มีงาน cron ที่ scheduled สำหรับวันนี้ ทั้งๆ ที่ระบบทำงานปกติ เนื่องจาก logic การตรวจจับยังไม่สมบูรณ์ โดยเพิ่มการวิเคราะห์ pattern การทำงานของ cron jobs แบบอัจฉริยะ และปรับเกณฑ์การตรวจสอบให้สอดคล้องกับพฤติกรรมจริงของระบบ

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/watchdog/watchdog.js` | Enhance runCronOutcomeCheck function with smarter pattern detection and adaptive thresholds | safe |
| `scripts/watchdog/goals.js` | Update the 'today-has-scheduled' goal configuration to use new adaptive checking logic | safe |
| `scripts/watchdog/remediate.js` | Add auto-healing logic for genuine scheduler failures detected by the enhanced checker | safe |

## 🎯 Innovation Score: 82/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
