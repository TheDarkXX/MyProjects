---
proposal_id: EVO-20260426-804
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-26T20:00:20.383Z
---
# 🚀 Evolution Proposal: AI Gateway Crash Loop Fix with Health Check & Auto-Restart

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** ai-gateway อาจ crash เนื่องจาก dependencies (เช่น database connection, external API) ยังไม่พร้อม หรือ memory leak จาก long-running connections ทำให้ process ตายซ้ำๆ โดยไม่มี recovery mechanism ที่ชาญฉลาด

**Description:**
แก้ไขปัญหา PM2 Crash Loop ของ ai-gateway โดยเพิ่ม health check endpoint และปรับปรุง startup script ให้ตรวจสอบความพร้อมของ dependencies ก่อนเริ่มทำงานจริง พร้อมเพิ่ม circuit breaker เพื่อป้องกันการ restart ซ้ำๆ เกิน 5 ครั้งภายใน 5 นาที

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/hydra/doctor.js` | Add ai-gateway health check function with dependency validation | high |
| `scripts/watchdog/remediate.js` | Implement circuit breaker for ai-gateway crashes (max 5 restarts in 5 minutes) | high |
| `routes/ai.js` | Add /health endpoint that checks database, external APIs, and memory usage | high |
| `lib/heartbeat.js` | Extend to monitor ai-gateway uptime and trigger doctor.js if abnormal restart pattern detected | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
