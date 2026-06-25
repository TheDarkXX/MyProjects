---
proposal_id: EVO-20260429-136
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-29T02:00:20.943Z
---
# 🚀 Evolution Proposal: Implement AI API Fallback Circuit Breaker with Health Check

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** ระบบปัจจุบันเรียกใช้ AI API โดยตรงโดยไม่มีกลไกตรวจสอบสถานะก่อนเรียก (pre-flight health check) และไม่มี circuit breaker เพื่อป้องกันการเรียกซ้ำไปยัง endpoint ที่ล้มเหลวติดต่อกันหลายครั้ง ทำให้เกิด latency สูงและ timeout 504 ซ้ำๆ

**Description:**
เพิ่มระบบ circuit breaker และ health check สำหรับ AI API endpoints เพื่อป้องกันการเรียกใช้ API ที่ล่มหรือ timeout ซ้ำๆ โดยอัตโนมัติเปลี่ยนไปใช้ fallback model เมื่อตรวจพบปัญหา

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add circuit breaker pattern with failure tracking and automatic fallback switching | high |
| `lib/ai-call.js` | Implement health check function that tests API endpoints before actual calls | high |
| `lib/ai-call.js` | Add model priority queue with automatic downgrade/upgrade based on health status | high |
| `scripts/hydra/doctor.js` | Extend Doctor agent to monitor API health and trigger automatic recovery procedures | high |
| `discord-bot/lib/ai.js` | Update AI wrapper to use the new circuit breaker system for all API calls | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
