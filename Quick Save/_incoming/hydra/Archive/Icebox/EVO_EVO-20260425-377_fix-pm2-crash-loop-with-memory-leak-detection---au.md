---
proposal_id: EVO-20260425-377
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-25T20:00:33.018Z
---
# 🚀 Evolution Proposal: Fix PM2 Crash Loop with Memory Leak Detection & Auto-Restart Throttling

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** brain-app มี memory leak หรือ unhandled exception ที่ทำให้ process ตายซ้ำๆ โดย PM2 พยายาม restart อัตโนมัติแต่ไม่สำเร็จเพราะปัญหาเดิมเกิดขึ้นซ้ำ ทำให้เกิด infinite crash loop

**Description:**
แก้ไขปัญหา PM2 crash loop ของ brain-app ที่ restart 880 ครั้ง โดยเพิ่ม memory leak detection และ throttling สำหรับ auto-restart เพื่อป้องกัน infinite loop

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/watchdog/watchdog.js` | Add memory usage monitoring and crash loop detection logic | high |
| `scripts/watchdog/remediate.js` | Implement throttled restart with exponential backoff for brain-app | high |
| `lib/heartbeat.js` | Add memory leak detection and graceful shutdown before crash | high |
| `scripts/hydra/doctor.js` | Add crash loop diagnosis and remediation as event-driven agent | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
