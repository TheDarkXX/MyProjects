---
proposal_id: EVO-20260430-669
status: awaiting_human
persona: bold
category: experiment
risk_level: safe
date: 2026-04-30T05:01:05.689Z
---
# 🚀 Evolution Proposal: API latency optimization via non-blocking cache writes

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** experiment | **Risk:** safe
**Root Cause:** Cache writes ถูก `await` ใน hot path ทำให้ response ต้องรอ I/O completion ก่อน return ทั้งๆ ที่ client ไม่ได้ต้องการข้อมูลจาก cache write result

**Description:**
ปัจจุบัน `lib/ai-call.js` มี 2-tier cache (L1 in-memory + L2 Redis) อยู่แล้ว แต่ cache writes ทั้ง L1 และ L2 ถูก `await` ซึ่งทำให้ response ต้องรอจน cache เขียนเสร็จ ส่งผลให้ API latency สูงขึ้นโดยไม่จำเป็น เนื่องจาก Redis write มี network overhead การเปลี่ยนเป็น fire-and-forget จะลด latency ได้ทันทีโดยไม่กระทบ correctness ของระบบ

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Change cache write from blocking (await) to fire-and-forget pattern: l1Cache.set() and redisCache.se | safe |

## 🎯 Innovation Score: 82/100
- Novelty: 7 | Depth: 9 | Compounding: 8 | Specificity: 9

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
