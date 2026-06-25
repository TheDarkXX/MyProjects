---
proposal_id: EVO-20260425-633
status: awaiting_human
persona: moonshot
category: optimization
risk_level: medium
date: 2026-04-25T17:01:43.419Z
---
# 🚀 Evolution Proposal: Vision Model Circuit Breaker for Nemotron 400 Errors

**Triggered By Persona:** MOONSHOT

## 📋 What & Why
**Category:** optimization | **Risk:** medium
**Root Cause:** The `or-nemotron-12b` model is returning 400 Bad Request, likely due to payload incompatibility or temporary service issues. The current implementation lacks a specific fallback handler for Vision models, causing the task to fail instead of switching to an available alternative.

**Description:**
Implement a Circuit Breaker and Fallback mechanism in the AI call layer specifically for Vision-Language tasks. When `or-nemotron-12b` returns a 400 Bad Request, the system will automatically retry the request using `openai/gpt-4o-mini` as a backup. This ensures that PDF/Image processing workflows do not fail due to a single model's instability.

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add error handling logic to catch 400 errors specifically for 'or-nemotron-12b' and automatically re | medium |
| `discord-bot/scripts/test-local-pdf.js` | Update default model configuration to use 'openai/gpt-4o-mini' as primary if Nemotron is unstable. | medium |

## 🎯 Innovation Score: 85/100
- Novelty: 7 | Depth: 9 | Compounding: 9 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
