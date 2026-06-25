---
proposal_id: EVO-20260424-111
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-24T18:58:48.934Z
---
# 🚀 Evolution Proposal: Optimize Doctor Agent Fallback Logic with Cost-Aware Model Selection

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** Doctor Agent ใช้ fallback แบบ fixed 3-tier (Qwen 72B → QwQ-32b → Gemini Flash KIE) โดยไม่พิจารณาความซับซ้อนของปัญหา ทำให้อาจใช้ model แรงเกินความจำเป็นสำหรับปัญหาง่ายๆ หรือใช้ model ธรรมดาเกินไปสำหรับปัญหาซับซ้อน

**Description:**
ปรับปรุง Doctor Agent ให้เลือกใช้ AI model ตามความคุ้มค่าและความซับซ้อนของปัญหา แทนที่จะใช้ fallback แบบ fixed tier โดยเพิ่ม logic การประเมินความซับซ้อนของปัญหาและเลือก model ที่เหมาะสม

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/hydra/doctor.js` | Add complexity assessment function to analyze error patterns and determine required model capability | high |
| `scripts/hydra/doctor.js` | Implement cost-aware model selection based on error complexity and estimated token usage | high |
| `scripts/hydra/doctor.js` | Add model performance tracking to learn which models work best for different error types | high |
| `lib/ai-call.js` | Extend AI call function to accept model selection strategy parameter | high |

## 🎯 Innovation Score: 85/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
