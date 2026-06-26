---
proposal_id: EVO-20260426-810
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-26T08:00:23.653Z
---
# 🚀 Evolution Proposal: Fix Cron Tracker Check False Positives with Adaptive Thresholds

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** ตรรกะการตรวจสอบ cron-tracker-check ใช้เกณฑ์เวลาแบบตายตัว (24 ชั่วโมง) โดยไม่พิจารณารูปแบบการทำงานจริงของ cron jobs บาง cron job เช่น weekly หรือ monthly อาจไม่ทำงานทุกวัน ทำให้ระบบรายงาน false positive เมื่อไม่มีงานใน 24 ชั่วโมงที่ผ่านมา แม้ระบบจะทำงานปกติ

**Description:**
แก้ไขปัญหา recurring error ของ cron-tracker-check ที่รายงานว่า "ไม่มีงานที่ถูก scheduled ใน 24 ชม." ทั้งที่ระบบทำงานปกติ โดยปรับปรุงตรรกะการตรวจจับให้อิงตามรูปแบบการทำงานจริงของ cron jobs แทนการใช้เวลาแบบตายตัว

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/watchdog/watchdog.js` | Replace static 24h check with adaptive pattern-based detection in runCronOutcomeCheck function | safe |
| `scripts/watchdog/watchdog.js` | Add cron job pattern analysis to distinguish between 'no jobs scheduled' vs 'scheduler broken' | safe |
| `scripts/watchdog/watchdog.js` | Implement historical pattern learning to set appropriate time windows per cron job type | safe |
| `scripts/watchdog/watchdog.js` | Add cron job metadata table to track expected schedules and validate against actual runs | safe |

## 🎯 Innovation Score: 82/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
