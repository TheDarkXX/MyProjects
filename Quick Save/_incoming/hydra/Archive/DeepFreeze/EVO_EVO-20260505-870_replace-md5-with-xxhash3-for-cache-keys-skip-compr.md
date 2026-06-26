---
proposal_id: EVO-20260505-870
status: awaiting_human
persona: bold
category: experiment
risk_level: safe
date: 2026-05-05T05:01:34.655Z
---
# 🚀 Evolution Proposal: Replace MD5 with xxhash3 for cache keys + skip compression for small payloads

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** experiment | **Risk:** safe
**Root Cause:** MD5 เป็น cryptographic hash ที่ออกแบบมาเพื่อความปลอดภัย ไม่ใช่ความเร็ว ใช้ CPU cycles มากเกินจำเป็นสำหรับ cache key ที่ไม่ต้องการ collision resistance และ zlib compression เพิ่ม overhead แม้แต่กับ response ขนาดเล็ก

**Description:**
ปรับปรุง API latency โดย (1) เปลี่ยน hash algorithm จาก MD5 เป็น xxhash3 ซึ่งเร็วกว่า 5-10 เท่า (SIMD-accelerated) สำหรับ cache key generation ใน hot path (2) ข้าม compression สำหรับ payload ที่เล็กกว่า 500 bytes เพื่อลด CPU overhead ทั้งตอน set และ get

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Replace crypto.createHash('md5') with xxhash (import xxhash from 'xxhash' and use xxhash3() for cach | safe |
| `lib/ai-call.js` | Add payload size check in RedisCache.get() and set() methods - skip zlib decompression/compression f | safe |

## 🎯 Innovation Score: 82/100
- Novelty: 7 | Depth: 8 | Compounding: 9 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
