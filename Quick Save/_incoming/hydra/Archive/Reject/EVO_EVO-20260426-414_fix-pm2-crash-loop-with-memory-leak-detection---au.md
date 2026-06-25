---
proposal_id: EVO-20260426-414
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-26T20:00:35.202Z
---
# 🚀 Evolution Proposal: Fix PM2 Crash Loop with Memory Leak Detection & Auto-Restart Throttling

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** 1) ไม่มี memory leak detection ใน brain-app ทำให้ process กิน memory จน crash 2) ไม่มี restart throttling ใน PM2 config ทำให้ restart loop เกิดขึ้นโดยไม่มี delay 3) ไม่มี health check endpoint เพื่อตรวจสอบว่า app พร้อมทำงานจริงก่อนจะถือว่า healthy

**Description:**
brain-app มีการ restart ถึง 903 ครั้ง เนื่องจาก crash loop จาก memory leak หรือ unhandled promise rejection โดยไม่มี circuit breaker ทำให้ PM2 พยายาม restart ซ้ำอย่างต่อเนื่อง

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/heartbeat.js` | Add memory usage monitoring and auto-restart throttling logic | high |
| `scripts/watchdog/watchdog.js` | Add PM2 crash loop detection and auto-remediation | high |
| `scripts/hydra/doctor.js` | Add brain-app crash diagnosis and healing procedure | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
