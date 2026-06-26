---
proposal_id: EVO-20260503-367
status: awaiting_human
persona: bold
category: experiment
risk_level: safe
date: 2026-05-03T05:00:48.800Z
---
# 🚀 Evolution Proposal: Increase L1+L2 cache capacity and TTL to reduce redundant AI calls

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** experiment | **Risk:** safe
**Root Cause:** Cache configuration ยัง conservative เกินไป — L1 500 entries มีพื้นที่ไม่พอสำหรับ multi-agent workload ที่รันหลาย cron พร้อมกัน และ TTL 600s สั้นเกินไปสำหรับ content ที่อัปเดตไม่บ่อย ทำให้ repeat calls ไปถึง AI Gateway หลายครั้งโดยไม่จำเป็น

**Description:**
ระบบมี L1 (in-memory LRU) และ L2 (Redis) cache อยู่แล้วใน lib/ai-call.js แต่ cache size และ TTL ยังเล็กเกินไป ทำให้ miss rate สูง ขยาย L1 จาก 500 entries/600s เป็น 2000 entries/1800s และเพิ่ม L2 Redis TTL จาก 3600s เป็น 7200s พร้อมเพิ่ม prompt truncation ใน cache key generation เพื่อลด collision สำหรับ long prompts

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Increase L1InMemoryCache from (500, 600) to (2000, 1800) — 4x capacity, 3x TTL | safe |
| `lib/ai-call.js` | Increase RedisCache TTL from 3600 to 7200 seconds (2h) | safe |
| `lib/ai-call.js` | Add prompt truncation in generateKey() — truncate to 2000 chars before MD5 hash to improve hit rate  | safe |

## 🎯 Innovation Score: 78/100
- Novelty: 6 | Depth: 8 | Compounding: 9 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
