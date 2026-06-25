---
proposal_id: EVO-20260424-146
status: awaiting_human
persona: pragmatic
category: performance_opportunity
risk_level: high
date: 2026-04-24T20:00:21.303Z
---
# 🚀 Evolution Proposal: Add auto-rollback on regression detection to Evolver

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** performance_opportunity | **Risk:** high
**Root Cause:** Inspector พบว่า proposal EVO-20260424-790 ทำให้เกิด 3 errors หลัง deploy แต่ระบบไม่มีกลไก rollback อัตโนมัติ ทำให้ต้องรอ manual intervention

**Description:**
เพิ่มระบบ auto-rollback ใน Evolver ที่จะตรวจสอบ regression หลัง deploy และ rollback อัตโนมัติถ้าพบ error เกิน threshold

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/hydra/evolver.js` | Add autoRollbackOnRegression function that checks error count after deploy and rolls back if exceeds | high |
| `scripts/hydra/evolver.js` | Modify deploy flow to call autoRollbackOnRegression after health check | high |
| `scripts/hydra/evolver.js` | Add regression monitoring logic that queries system_health_logs for errors after deploy timestamp | high |

## 🎯 Innovation Score: 75/100
- Novelty: 8 | Depth: 7 | Compounding: 9 | Specificity: 6

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
