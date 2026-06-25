---
proposal_id: EVO-20260427-050
status: awaiting_human
persona: bold
category: experiment
risk_level: safe
date: 2026-04-27T05:01:43.283Z
---
# 🚀 Evolution Proposal: Add Redis caching layer to AI call responses

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** experiment | **Risk:** safe
**Root Cause:** ระบบเรียก AI API ใหม่ทุกครั้งโดยไม่มีการ cache responses ทำให้ repeated/similar queries ต้องรอ AI inference ทุกครั้ง (~500-800ms) แทนที่จะดึงจาก cache (~10-30ms)

**Description:**
เพิ่ม caching layer สำหรับ AI API responses โดยใช้ request hash เป็น cache key ลด response time จาก ~500-800ms เหลือ ~20-50ms สำหรับ repeated queries โดยเฉพาะ content/knowledge lookups ที่ซ้ำๆ

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add Redis caching wrapper around AI calls with 1-hour TTL. Hash request (model + prompt + temperatur | safe |
| `routes/knowledge.js` | Add cache-control headers and Redis caching for knowledge base lookups to reduce repeated embedding  | safe |

## 🎯 Innovation Score: 68/100
- Novelty: 5 | Depth: 7 | Compounding: 9 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
