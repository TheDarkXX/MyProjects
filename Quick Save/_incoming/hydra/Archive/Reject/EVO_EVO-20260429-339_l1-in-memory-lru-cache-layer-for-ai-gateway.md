---
proposal_id: EVO-20260429-339
status: awaiting_human
persona: bold
category: experiment
risk_level: safe
date: 2026-04-29T05:00:48.072Z
---
# 🚀 Evolution Proposal: L1 In-Memory LRU Cache Layer for AI Gateway

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** experiment | **Risk:** safe
**Root Cause:** ทุกครั้งที่ cache hit จะต้อง axios.post ไป Redis ซึ่งเป็น network I/O (~50-150ms) ทำให้แม้แต่ cache hit ก็ยังมี latency สูง ควรมี L1 in-process cache (Map) ที่เป็น memory access เร็วกว่านั้นมาก

**Description:**
เพิ่ม L1 In-Memory LRU Cache (Map-based) ก่อน Redis cache ใน callAIGateway เพื่อตัด network round-trip ไป Redis ออก ลด API latency จาก ~200ms เหลือ ~50-80ms สำหรับ cache hits ที่ hit L1 โดยใช้ LRU eviction (max 500 entries) เพื่อไม่ให้กิน memory เกินไป และ sync กับ Redis cache ที่เป็น L2 เมื่อ set/evict

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Add L1InMemoryCache class with Map + LRU eviction (maxEntries=500, ttlSeconds=600) before Redis in c | safe |

## 🎯 Innovation Score: 72/100
- Novelty: 6 | Depth: 8 | Compounding: 9 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
