---
proposal_id: EVO-20260426-291
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-26T02:00:19.839Z
---
# 🚀 Evolution Proposal: Discord Bot Crash Loop Fix with Self-Healing Circuit Breaker

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** discord-bot มี error ที่ไม่ได้รับการแก้ไขอย่างถูกต้อง ทำให้ PM2 พยายาม restart ซ้ำๆ โดยไม่มี circuit breaker หรือ fallback mechanism ที่เหมาะสม

**Description:**
เพิ่มระบบ circuit breaker และ self-healing สำหรับ discord-bot เพื่อหยุดการ restart loop ที่เกิดขึ้น 826 ครั้ง โดยใช้ doctor.js เป็น event-driven agent แทนการพึ่งพา PM2 restart อย่างเดียว

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/hydra/doctor.js` | Add circuit breaker logic for discord-bot crashes with exponential backoff | high |
| `scripts/watchdog/remediate.js` | Add discord-bot crash detection and trigger doctor.js automatically | high |
| `discord-bot/index.js` | Add graceful shutdown and health check endpoint for monitoring | high |
| `lib/heartbeat.js` | Extend heartbeat monitoring to include discord-bot process health | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
