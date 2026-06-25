---
proposal_id: EVO-20260425-656
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-25T14:00:34.871Z
---
# 🚀 Evolution Proposal: Fix Watchdog today-has-scheduled Logic with Adaptive Threshold

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** Watchdog ใช้เงื่อนไข cnt >= 1 ในการตรวจสอบว่า cron jobs ถูก schedule ในวันนี้หรือไม่ แต่ในความเป็นจริงระบบอาจไม่มีงานที่ต้อง schedule ในวันนั้นๆ (เช่น วันหยุด, ระบบใหม่ที่ยังไม่มีประวัติ) ทำให้เกิด false positive ถึง 26 ครั้งใน 3 วัน

**Description:**
แก้ไข logic การตรวจสอบ today-has-scheduled ใน watchdog ที่นับจำนวน cron jobs ที่ถูก schedule ในวันนี้ โดยปรับให้ใช้ threshold ที่ยืดหยุ่นตามประวัติการทำงานจริงของระบบ แทนการใช้ค่าตายตัว cnt >= 1

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/watchdog/watchdog.js` | Modify today-has-scheduled check to use adaptive threshold based on historical patterns instead of f | safe |
| `scripts/watchdog/goals.js` | Update the expect condition from 'cnt >= 1' to a smarter function that considers historical averages | safe |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
