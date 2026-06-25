---
proposal_id: EVO-20260425-870
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-25T14:00:58.418Z
---
# 🚀 Evolution Proposal: Discord Bot Crash Loop Fix via Graceful Shutdown & Auto-Restart

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** discord-bot อาจ crash เนื่องจาก Discord API connection ล้มเหลว, unhandled promise rejection, หรือ memory leak ที่ทำให้ process ตายซ้ำๆ โดย PM2 พยายาม restart อัตโนมัติ

**Description:**
แก้ไขปัญหาการ restart ซ้ำของ discord-bot 811 ครั้ง โดยเพิ่ม graceful shutdown handler และตรวจสอบการเชื่อมต่อ Discord ก่อนเริ่มทำงานจริง

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `discord-bot/index.js` | Add graceful shutdown handlers for SIGTERM/SIGINT and unhandled rejection/exception | safe |
| `discord-bot/index.js` | Implement connection health check with retry logic before starting bot | safe |
| `discord-bot/index.js` | Add memory usage monitoring and auto-restart if exceeds threshold | safe |
| `scripts/watchdog/watchdog.js` | Add discord-bot crash detection and auto-remediation via PM2 restart with delay | safe |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
