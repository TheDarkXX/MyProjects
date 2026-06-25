---
proposal_id: EVO-20260504-687
status: awaiting_human
persona: bold
category: experiment
risk_level: safe
date: 2026-05-04T05:02:26.467Z
---
# 🚀 Evolution Proposal: Reduce API latency via faster request coalescing and L1 cache expansion

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** experiment | **Risk:** safe
**Root Cause:** Coalescing window 200ms ทำให้ duplicate requests ต้องรอนานเกินจำเป็นก่อนถูก coalesce และ L1 cache ขนาด 2000 entries อาจไม่เพียงพอสำหรับ workload ปัจจุบัน ทำให้ eviction rate สูงและต้องไป hit Redis บ่อยขึ้น

**Description:**
ลด api_latency_ms โดยการ (1) ลด coalescing window จาก 200ms เหลือ 50ms ทำให้ duplicate requests ภายใน 50ms ถูก coalesce และ response เร็วขึ้น (2) เพิ่ม L1 in-memory cache size จาก 2000 เป็น 5000 entries และ TTL จาก 1800s เป็น 3600s ทำให้ cache hit rate สูงขึ้นและลด Redis lookup overhead

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Reduce COALESCE_WINDOW_MS from 200 to 50ms — duplicate requests within 50ms will share one API call  | safe |
| `lib/ai-call.js` | Expand L1InMemoryCache from maxEntries=2000/ttlSeconds=1800 to maxEntries=5000/ttlSeconds=3600 — lar | safe |

## 🎯 Innovation Score: 52/100
- Novelty: 4 | Depth: 5 | Compounding: 7 | Specificity: 6

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
