---
proposal_id: EVO-20260426-413
status: awaiting_human
persona: bold
category: innovation_trigger
risk_level: safe
date: 2026-04-26T05:01:50.114Z
---
# 🚀 Evolution Proposal: GC5-OffPeak Expansion: 6 New Scheduled Agents for 21 Dead Hours

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** innovation_trigger | **Risk:** safe
**Root Cause:** off-peak agents ถูกออกแบบมาแค่ time-based trigger ในช่วง 00:00-06:00 แต่มี scripts ที่ทำงานได้ดีในช่วง idle หลายตัว (backlink-generator, graph-search, check-content-readiness, cron-content-review, db-cleanup) ยังไม่ถูก integrate เข้า off-peak system และ cron-auto-planner ยังต้องรอ manual run ทำให้ idle capacity 21 ชม. สูญเปล่า

**Description:**
ระบบมี 21 ชั่วโมงว่าง/วัน (idle hours) แต่ off-peak agent รันแค่ 00:00–06:00 (6 ชม.) ขยาย window เป็น 00:00–22:00 และเพิ่ม 6 new off-peak agents: (1) backlink-generator สร้าง backlink อัตโนมัติ, (2) graph-search วิเคราะห์ Social Graph ทุกชม., (3) check-content-readiness ตรวจ readiness ทุก 6 ชม., (4) content-review cron ทุก เช้า 07:00, (5) db-cleanup ทุกคืน, (6) weekly-reflection ทุกวันจันทร์ และปรับ cron-auto-planner ให้รันทุก 6 ชม. แทนที่จะรอ manual trigger

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/off-peak-agents/off-peak-maintenance.js` | Extend off-peak window from 00:00-06:00 to 00:00-22:00 (skip 08:00-18:00 business hours) by adding h | safe |
| `scripts/off-peak-agents/off-peak-content-generator.js` | Add call to graph-search.js after content generation completes in each off-peak cycle, passing recen | safe |
| `scripts/off-peak-agents/off-peak-maintenance.js` | After regular cleanup, call check-content-readiness.js every 3rd off-peak cycle to refresh content r | safe |
| `scripts/cron-auto-planner.js` | Change the trigger condition at the bottom of main() to also schedule the script for 06:00, 12:00, 1 | safe |
| `scripts/off-peak-agents/off-peak-content-generator.js` | Add backlink-generator.js call after graph-search step, using output from graph-search as seed data  | safe |
| `scripts/off-peak-agents/off-peak-maintenance.js` | Add cron-content-review.js call for 07:00 Bangkok time check by registering it within the off-peak m | safe |

## 🎯 Innovation Score: 78/100
- Novelty: 8 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
