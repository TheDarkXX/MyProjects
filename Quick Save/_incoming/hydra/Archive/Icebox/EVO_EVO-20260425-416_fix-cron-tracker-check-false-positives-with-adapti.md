---
proposal_id: EVO-20260425-416
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-25T14:00:19.901Z
---
# 🚀 Evolution Proposal: Fix cron-tracker-check false positives with adaptive threshold

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** check cron-tracker-check ใช้เกณฑ์ตายตัวในการตรวจสอบว่าไม่มีงาน scheduled ใน 24 ชม. โดยไม่พิจารณาว่าช่วงเวลานั้นอาจเป็นช่วงที่ระบบไม่ควรมีงาน (เช่น weekend) หรือระบบเพิ่งเริ่มทำงานใหม่ ทำให้เกิด false positive บ่อยครั้ง

**Description:**
แก้ไขปัญหา cron-tracker-check ที่รายงานข้อผิดพลาดซ้ำๆ เนื่องจากใช้เกณฑ์ตรวจสอบที่เข้มงวดเกินไป โดยปรับให้ใช้ adaptive threshold ที่พิจารณาประวัติการทำงานจริงและช่วงเวลาที่เหมาะสม

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/watchdog/watchdog.js` | Enhance runCronOutcomeCheck to use smarter detection logic with historical patterns and time-aware t | safe |
| `scripts/watchdog/goals.js` | Update cron-tracker-check configuration to use more lenient thresholds based on system patterns | safe |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
