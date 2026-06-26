---
proposal_id: EVO-20260428-410
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-28T08:00:20.483Z
---
# 🚀 Evolution Proposal: Implement AI Model Fallback Circuit Breaker with Health Check

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** ระบบปัจจุบันเรียกใช้ Kie: Gemini 2.5 Flash โดยตรงโดยไม่มีกลไกตรวจสอบสถานะ API ก่อนใช้งาน ทำให้เกิด timeout 6 วินาทีและกระทบการทำงานของระบบ

**Description:**
เพิ่มระบบ circuit breaker และ health check สำหรับ AI models เพื่อป้องกันการเรียกใช้ API ที่ล้มเหลวซ้ำๆ และเปลี่ยนไปใช้ fallback model โดยอัตโนมัติ

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add circuit breaker pattern with health check before API calls | high |
| `lib/ai-call.js` | Implement model health tracking with exponential backoff for failed models | high |
| `lib/ai-call.js` | Add automatic fallback to Qwen 72B when primary model (Gemini Flash) is unhealthy | high |
| `scripts/hydra/doctor.js` | Add health check monitoring for AI models with alerting to hydra-core channel | high |
| `scripts/watchdog/watchdog.js` | Extend watchdog to monitor AI model health status and trigger doctor when needed | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
