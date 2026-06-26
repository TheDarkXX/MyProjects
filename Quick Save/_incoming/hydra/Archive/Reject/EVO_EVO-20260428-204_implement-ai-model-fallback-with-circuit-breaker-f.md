---
proposal_id: EVO-20260428-204
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-28T20:00:16.985Z
---
# 🚀 Evolution Proposal: Implement AI Model Fallback with Circuit Breaker for BytePlus DeepSeek

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** AI model BytePlus DeepSeek-V3.2 มีปัญหา Gateway Timeout ทำให้ระบบไม่สามารถใช้งานได้ เนื่องจากขาดระบบ fallback และ circuit breaker ที่จะป้องกันการเรียกซ้ำไปยัง endpoint ที่ล้มเหลว

**Description:**
เพิ่มระบบ fallback และ circuit breaker สำหรับ AI model BytePlus DeepSeek-V3.2 ที่กำลังมีปัญหา Gateway Timeout (504) โดยเมื่อตรวจพบความล้มเหลว จะสลับไปใช้ model สำรองอัตโนมัติ และปิดการใช้งาน model ที่มีปัญหาชั่วคราวเพื่อป้องกันการเรียกซ้ำ

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add circuit breaker logic with fallback model switching for BytePlus DeepSeek failures | high |
| `scripts/hydra/doctor.js` | Extend self-healing to monitor and recover from AI model failures automatically | high |
| `discord-bot/lib/ai.js` | Implement model fallback chain: DeepSeek-V3.2 -> Qwen-72B -> QwQ-32b -> Gemini Flash | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
