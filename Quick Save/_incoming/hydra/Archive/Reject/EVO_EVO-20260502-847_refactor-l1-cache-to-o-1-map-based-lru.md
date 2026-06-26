---
proposal_id: EVO-20260502-847
status: awaiting_human
persona: moonshot
category: experiment
risk_level: safe
date: 2026-05-02T17:00:56.326Z
---
# 🚀 Evolution Proposal: Refactor L1 Cache to O(1) Map-based LRU

**Triggered By Persona:** MOONSHOT

## 📋 What & Why
**Category:** experiment | **Risk:** safe
**Root Cause:** การใช้ Array.filter และ Array.shift ในคลาส L1InMemoryCache เพื่อจัดการลำดับ LRU มีความซับซ้อนเชิงเวลาเป็น O(N) ซึ่งเมื่อ Cache มีข้อมูลเยอะหรือมีการเรียกใช้บ่อย จะส่งผลให้เกิด CPU Bottleneck และเพิ่ม api_latency_ms โดยไม่จำเป็น

**Description:**
ปรับปรุงประสิทธิภาพของ L1 In-Memory Cache ใน lib/ai-call.js โดยเปลี่ยนวิธีการจัดการลำดับ LRU จากการใช้ Array (ซึ่งมีความซับซ้อน O(N) ในการ filter/shift) ไปใช้ Map ที่รักษาลำดับการแทรกข้อมูล (O(1)) แทน เพื่อลดภาระ CPU และลดเวลาตอบสนองของ API ในกรณีที่มี Cache Hit

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Refactor L1InMemoryCache class to use a single Map for storage and ordering. Remove accessOrder arra | safe |

## 🎯 Innovation Score: 65/100
- Novelty: 5 | Depth: 8 | Compounding: 7 | Specificity: 9

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
