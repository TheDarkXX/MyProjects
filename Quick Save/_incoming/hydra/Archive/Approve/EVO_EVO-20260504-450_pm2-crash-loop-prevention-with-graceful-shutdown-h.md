---
proposal_id: EVO-20260504-450
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-05-04T20:00:34.747Z
---
# 🚀 Evolution Proposal: PM2 Crash Loop Prevention with Graceful Shutdown & Health Checks

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** PM2 crash loop เกิดจากกระบวนการ brain-app ตายซ้ำๆ เนื่องจาก: 1) การเชื่อมต่อ Redis ล้มเหลวแต่ไม่มีการ retry หรือ fallback ที่เหมาะสม 2) การเรียกใช้ AI Gateway ที่ timeout หรือ error แล้วไม่มีการจัดการ promise ที่ค้างอยู่ 3) ไม่มี health check mechanism ทำให้ PM2 พยายาม restart ตลอดเวลา

**Description:**
เพิ่มระบบ graceful shutdown และ health check เพื่อป้องกัน PM2 crash loop ของ brain-app ที่เกิดจากการ restart ถึง 1101 ครั้ง โดยเพิ่มการตรวจสอบสถานะของ Redis connection และ database connection ก่อนเริ่มทำงานจริง พร้อมทั้งเพิ่มการจัดการ error ที่เหมาะสมใน callAIGateway เพื่อป้องกัน memory leak

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add connection health check before making AI calls and implement proper promise cleanup | safe |
| `lib/heartbeat.js` | Add database connection validation and retry logic with exponential backoff | safe |
| `scripts/watchdog/watchdog.js` | Add PM2 crash detection and cooldown mechanism to prevent infinite restart loops | safe |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
