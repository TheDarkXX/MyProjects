---
proposal_id: EVO-20260427-440
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-27T02:00:22.940Z
---
# 🚀 Evolution Proposal: Discord Bot Crash Loop - Memory Leak Detection & Auto-Restart

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** Discord Bot มี memory leak จาก event listeners หรือ connection ที่ไม่ถูก cleanup ทำให้ memory เพิ่มขึ้นเรื่อยๆ จน process ตายและ PM2 restart อัตโนมัติ

**Description:**
แก้ไขปัญหาการ restart ซ้ำๆ ของ Discord Bot ที่เกิดจาก memory leak โดยเพิ่ม memory monitoring และ graceful restart แทนการ crash

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `discord-bot/index.js` | Add memory monitoring and auto-restart before crash | safe |
| `discord-bot/lib/brain.js` | Add cleanup for event listeners and intervals | safe |
| `scripts/watchdog/watchdog.js` | Add Discord Bot health check with memory threshold | safe |
| `scripts/watchdog/remediate.js` | Add Discord Bot graceful restart procedure | safe |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
