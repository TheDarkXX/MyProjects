---
proposal_id: EVO-20260506-459
status: awaiting_human
persona: bold
category: experiment
risk_level: safe
date: 2026-05-06T05:01:04.288Z
---
# 🚀 Evolution Proposal: Aggressive cache key normalization to reduce duplicate AI calls

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** experiment | **Risk:** safe
**Root Cause:** Cache key สร้างจาก prompt text ที่มี dynamic content (วันที่, IDs, counters) แทรกอยู่ ทำใoм cache miss แม้ semantic content จะเหมือนกัน เช่น 'สรุป token cost วันที่ 2024-01-15' vs 'สรุป token cost วันที่ 2024-01-16' ถือว่าเป็นคนละ key ทั้งที่ context เดียวกัน

**Description:**
ปัจจุบัน cache key ใช้ xxhash จาก normalized prompt ทั้งหมด รวมถึง content ที่มี dynamic data เช่น วันที่, IDs, URLs ทำให้ cache miss สูงแม้ว่าคำถามจริงจะเหมือนกัน วิธีแก้คือ Normalize ตัว cache key ให้ strip ออก: (1) ลบ timestamp/date patterns ออกจาก prompt ก่อน hash, (2) แยก semantic content ออกจาก dynamic placeholders, (3) normalize whitespace/formatting อย่างเข้มงวด ผลลัพธ์ที่คาดหวังคือ cache hit rate สูงขึ้น 20-40% สำหรับ agents ที่ถามเรื่องเดิมซ้ำๆ ในวันเดียวกัน

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Enhance generateKey() in RedisCache class to aggressively normalize prompts before hashing: (1) Remo | safe |
| `lib/ai-call.js` | Update callAIGateway to use the enhanced generateKey() for both L1 and L2 cache lookups, ensuring co | safe |

## 🎯 Innovation Score: 78/100
- Novelty: 7 | Depth: 8 | Compounding: 9 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
