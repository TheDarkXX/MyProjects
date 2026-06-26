---
proposal_id: EVO-20260424-276
status: awaiting_human
persona: pragmatic
category: optimization
risk_level: high
date: 2026-04-24T18:58:32.814Z
---
# 🚀 Evolution Proposal: Optimize AI Model Fallback Logic in Hydra Agents

**Triggered By Persona:** PRAGMATIC

## 📋 What & Why
**Category:** optimization | **Risk:** high
**Root Cause:** ระบบ fallback ปัจจุบันใช้แค่ 3-tier (Qwen 72B → QwQ-32b → Gemini Flash KIE) โดยไม่พิจารณาประเภทงาน ทำให้บางงานใช้ model ที่ไม่เหมาะสมและ cost ไม่คุ้มค่า

**Description:**
ปรับปรุงระบบ fallback ของ AI models ใน Hydra agents จาก 3-tier เป็น 4-tier พร้อมเพิ่ม logic การเลือก model ตามประเภทงานและ cost efficiency ที่ชาญฉลาดขึ้น

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/hydra/doctor.js` | Add 4-tier fallback logic with task-type detection and cost-aware model selection | high |
| `scripts/hydra/evolver.js` | Implement intelligent model routing based on task complexity and required reasoning depth | high |
| `scripts/hydra/ideator.js` | Add model performance tracking and auto-switch based on success rate per task type | high |
| `lib/ai-call.js` | Enhance AI call wrapper to support dynamic model selection with fallback chains | high |

## 🎯 Innovation Score: 82/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
