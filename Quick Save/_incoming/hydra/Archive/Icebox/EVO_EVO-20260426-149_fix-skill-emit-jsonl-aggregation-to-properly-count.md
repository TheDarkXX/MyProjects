---
proposal_id: EVO-20260426-149
status: awaiting_human
persona: bold
category: performance_opportunity
risk_level: high
date: 2026-04-26T05:01:16.886Z
---
# 🚀 Evolution Proposal: Fix skill-emit.jsonl aggregation to properly count recent skill usage

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** performance_opportunity | **Risk:** high
**Root Cause:** skill-emit.jsonl aggregation script มีแนวโน้มว่าใช้ date filter ผิด เช่น ใช้ '30 days ago' แต่ timestamp field เป็น format ที่ไม่ตรงกัน หรือ JSONL parsing ข้ามบรรทัดที่มี special characters ทำให้นับได้ไม่ครบ

**Description:**
ระบบติดตาม skill tags มี bug ทำให้นับจำนวนครั้งใช้งานผิดพลาด — skills ที่ถูก emit เมื่อ 11 วันก่อน (14-20 เมษายน 2026) ถูกรายงานว่าใช้ <3 ครั้น ทั้งที่มีหลักฐานใน Recent Skills view ว่าใช้แล้วจริง ควรตรวจสอบ aggregation logic ที่อ่าน skill-emit.jsonl และแก้ไข date filter หรือ parsing bug

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/hydra/inspector-infra.js` | Add debug logging to skill-emit.jsonl aggregation to print raw timestamps and parsed dates before fi | high |
| `scripts/hydra/inspector-infra.js` | Test JSONL parsing with sample of recent entries to verify line breaks and special char handling | high |

## 🎯 Innovation Score: 62/100
- Novelty: 6 | Depth: 7 | Compounding: 7 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
