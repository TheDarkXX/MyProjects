---
proposal_id: EVO-20260428-145
status: awaiting_human
persona: bold
category: experiment
risk_level: safe
date: 2026-04-28T05:02:02.071Z
---
# 🚀 Evolution Proposal: Implement Token Caching with LRU + Model Tiering

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** experiment | **Risk:** safe
**Root Cause:** ระบบปัจจุบันไม่มี caching layer สำหรับ AI calls - ทุกครั้งที่ถูกเรียกด้วย prompt เดียวกันจะถูกส่งไป API ใหม่ทุกครั้ง และใช้ model แพง (GPT-4) สำหรับทุก task โดยไม่แยกความซับซ้อน

**Description:**
เพิ่ม LRU Cache layer สำหรับ AI calls ที่ซ้ำกัน และใช้ Model Tiering โดยให้งานที่ไม่ซับซ้อนใช้ Qwen แทน GPT เพื่อลด token cost ลงอย่างมีนัยสำคัญ ระบบ cache จะจำ similar queries ไว้และ return cached response ทำให้ลดการเรียก API ซ้ำๆ

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add LRU cache middleware with 1-hour TTL. Cache key = hash of (model + normalized_prompt). On cache  | safe |
| `lib/brain-ai.js` | Add model selection logic: route simple queries (greetings, confirmations, simple lookups) to qwen m | safe |
| `discord-bot/lib/ai.js` | Implement semantic cache using embedding similarity instead of exact match. If query cosine similari | safe |

## 🎯 Innovation Score: 78/100
- Novelty: 8 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
