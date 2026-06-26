---
proposal_id: EVO-20260424-011
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: safe
date: 2026-04-24T18:34:51.325Z
---
# 🚀 Evolution Proposal: Optimize AI Model Fallback Logic with Cost-Aware Tiered Routing

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** ระบบ fallback ปัจจุบันใช้ลำดับคงที่ (Qwen 72B → QwQ-32b → Gemini Flash KIE) โดยไม่คำนึงถึง cost efficiency จริง-time และอาจใช้ model แพงเกินจำเป็นเมื่อ model ถูกกว่ายังใช้งานได้

**Description:**
🏆 **ARENA CHAMPION** (Defeated 2 other variants. Winner: PRAGMATIC)

ปรับปรุงระบบ fallback ของ AI models จาก 3-tier ให้เป็น cost-aware routing โดยเพิ่มการตรวจสอบ budget และเลือก model ที่ถูกที่สุดที่ยังตอบโจทย์ได้ แทนที่จะใช้ลำดับคงที่

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add cost-aware model selection algorithm that checks budget and picks cheapest suitable model first | safe |
| `lib/budget-guard.js` | Integrate with budget guard to get real-time cost limits per model tier | safe |
| `scripts/hydra/doctor.js` | Update doctor agent to use cost-aware routing instead of fixed fallback sequence | safe |
| `scripts/hydra/evolver.js` | Update evolver to use same cost-aware routing for consistency | safe |

## 🎯 Innovation Score: 82/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
