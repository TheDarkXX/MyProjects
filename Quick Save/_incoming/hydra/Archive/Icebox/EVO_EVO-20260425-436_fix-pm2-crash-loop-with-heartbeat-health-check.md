---
proposal_id: EVO-20260425-436
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-25T08:00:15.911Z
---
# 🚀 Evolution Proposal: Fix PM2 Crash Loop with Heartbeat Health Check

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** brain-app ไม่มี health check mechanism ทำให้ process ตายแบบไม่รู้สาเหตุและ PM2 พยายาม restart ซ้ำๆ โดยไม่มีการป้องกัน

**Description:**
เพิ่ม health check ใน brain-app เพื่อป้องกัน crash loop โดยตรวจสอบ memory usage และ restart แบบ graceful เมื่อเกิน threshold

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/heartbeat.js` | Add memory usage monitoring and auto-restart logic when memory exceeds 90% for 3 consecutive checks | high |
| `scripts/watchdog/watchdog.js` | Add brain-app health monitoring to detect crash patterns and trigger Doctor agent | high |
| `scripts/hydra/doctor.js` | Add PM2 crash loop remediation logic with 3-tier fallback analysis | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
