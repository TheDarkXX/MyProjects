---
proposal_id: EVO-20260428-724
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-28T08:00:39.428Z
---
# 🚀 Evolution Proposal: Implement AI Model Fallback Circuit Breaker with Exponential Backoff

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** ระบบปัจจุบันเรียกใช้ AI API โดยตรงโดยไม่มีกลไกป้องกันเมื่อ API ล้มเหลวหรือ timeout ทำให้ระบบหยุดทำงานเมื่อโมเดลหลัก (Qwen 72B) มีปัญหา โดยเฉพาะกับโมเดลขนาดใหญ่ที่ใช้เวลาประมวลผลนานและมีโอกาส timeout สูง

**Description:**
เพิ่มระบบ circuit breaker สำหรับ AI API calls ที่ล้มเหลว โดยเฉพาะกับ OpenRouter Qwen 72B ที่มีปัญหา Gateway Timeout บ่อยครั้ง โดยใช้หลักการ exponential backoff และ fallback ไปยังโมเดลสำรองอัตโนมัติ

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add circuit breaker logic with exponential backoff for failed API calls | high |
| `lib/ai-call.js` | Implement automatic fallback to secondary models (QwQ-32b, Gemini Flash) when primary fails | high |
| `lib/ai-call.js` | Add failure tracking and cooldown periods for problematic models | high |
| `scripts/hydra/doctor.js` | Enhance doctor agent to monitor and reset circuit breakers when appropriate | high |
| `discord-bot/lib/ai.js` | Update Discord bot AI calls to use the enhanced ai-call.js with fallback support | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
