---
proposal_id: EVO-20260501-377
status: awaiting_human
persona: bold
category: experiment
risk_level: medium
date: 2026-05-01T05:01:55.558Z
---
# 🚀 Evolution Proposal: HTTP Keep-Alive Agent + Async Request Coalescing for AI Gateway

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** experiment | **Risk:** medium
**Root Cause:** ทุก axios.post() ไป AI Gateway สร้าง TCP connection ใหม่ตั้งแต่ต้น (no keep-alive) + มี race condition ที่ multiple concurrent requests สำหรับ key เดียวกันไปถึง API พร้อมกันก่อนที่ cache จะ set เสร็จ ทำให้ API ถูกเรียกซ้ำโดยไม่จำเป็น — ทั้งสองอย่างเพิ่ม latency โดยตรง

**Description:**
เพิ่ม persistent HTTP Agent กับ keep-alive และ connection pooling สำหรับ AI Gateway calls เพื่อลด TCP handshake overhead ทุก request พร้อมเพิ่ม async coalescing buffer สำหรับ rapid-fire identical requests ภายใน 50ms window ที่จะถูกรวมเป็น call เดียว — ลด API latency ได้โดยตรงโดยเฉพาะ workloads ที่มี repeated/similar queries

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add http.Agent with keepAlive:true and shared connection pool (maxSockets:50) at module top. Pass ht | medium |

## 🎯 Innovation Score: 83/100
- Novelty: 8 | Depth: 8 | Compounding: 10 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
