---
proposal_id: EVO-20260427-466
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-27T08:00:21.147Z
---
# 🚀 Evolution Proposal: Discord Bot Crash Loop Auto-Heal with Graceful Restart

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** discord-bot อาจ crash จาก memory leak, unhandled promise rejection, หรือ external API error แต่ระบบปัจจุบันไม่มี mechanism ที่ดีในการ recover โดยอัตโนมัติ ทำให้ PM2 พยายาม restart ซ้ำๆ โดยไม่มีการวิเคราะห์สาเหตุ

**Description:**
เพิ่มระบบ auto-heal สำหรับ discord-bot ที่ crash บ่อย โดยใช้ watchdog.js ตรวจจับสถานะ PM2 และทำการ restart แบบ graceful พร้อมบันทึกเหตุผลก่อน crash เพื่อป้องกัน infinite loop

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/watchdog/watchdog.js` | Add PM2 status monitoring for discord-bot process, detect crash loops (>5 restarts in 5 minutes) | safe |
| `scripts/watchdog/watchdog.js` | Implement graceful restart with pre-restart logging to capture last error before crash | safe |
| `scripts/watchdog/remediate.js` | Add remediation function for discord-bot crash that cleans up temp state before restart | safe |
| `discord-bot/index.js` | Add global error handler to catch unhandled rejections and log to file before exit | safe |
| `discord-bot/index.js` | Implement health check endpoint for watchdog to verify bot is responsive | safe |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
