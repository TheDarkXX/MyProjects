---
proposal_id: EVO-20260428-756
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-28T14:00:16.948Z
---
# 🚀 Evolution Proposal: Implement AI Model Fallback with Circuit Breaker Pattern

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** ระบบปัจจุบันเรียกใช้ AI model เดียว (DeepSeek-V3.2) โดยไม่มี fallback mechanism เมื่อ API ล้มเหลวหรือ timeout ทำให้ระบบหยุดทำงานและส่งผลกระทบต่อการทำงานของ agents ทั้งหมดที่ต้องใช้ AI

**Description:**
เพิ่มระบบ fallback สำหรับ AI models และ circuit breaker pattern เพื่อป้องกันปัญหา Gateway Timeout (504) จาก Openrouter DeepSeek-V3.2 โดยเมื่อเกิด error จะสลับไปใช้ model สำรองอัตโนมัติ และมีระบบป้องกันการเรียกซ้ำไปยัง model ที่ล้มเหลวเป็นเวลาที่กำหนด

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add fallback model list and circuit breaker logic to handle API failures | high |
| `lib/brain-ai.js` | Update AI model selection to use fallback system with priority order | high |
| `scripts/hydra/doctor.js` | Add monitoring for AI model health and automatic fallback switching | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
