---
proposal_id: EVO-20260505-183
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-05-05T08:00:16.878Z
---
# 🚀 Evolution Proposal: Discord Bot Crash Loop Prevention with Graceful Degradation

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** discord-bot พยายามเชื่อมต่อ Redis และ Database อย่างต่อเนื่องโดยไม่มี fallback mechanism เมื่อ connection ล้มเหลวซ้ำๆ ทำให้เกิด infinite crash loop (1027 restarts)

**Description:**
เพิ่มระบบป้องกัน PM2 crash loop สำหรับ discord-bot โดยใช้ graceful degradation pattern แทนการ crash เมื่อ Redis หรือ Database ล้มเหลว

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `discord-bot/index.js` | Add graceful degradation wrapper around Redis/Database initialization with exponential backoff and c | safe |
| `discord-bot/lib/ai.js` | Implement fallback to in-memory cache when Redis is unavailable | safe |
| `discord-bot/lib/brain.js` | Add database health check with cooldown period before retrying | safe |
| `lib/ai-call.js` | Extend existing cooldown mechanism to include database health checks | safe |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
