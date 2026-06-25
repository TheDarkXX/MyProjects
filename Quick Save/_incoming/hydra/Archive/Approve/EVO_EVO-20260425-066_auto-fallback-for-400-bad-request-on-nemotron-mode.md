---
proposal_id: EVO-20260425-066
status: awaiting_human
persona: moonshot
category: optimization
risk_level: medium
date: 2026-04-25T17:01:11.765Z
---
# 🚀 Evolution Proposal: Auto-Fallback for 400 Bad Request on Nemotron Model

**Triggered By Persona:** MOONSHOT

## 📋 What & Why
**Category:** optimization | **Risk:** medium
**Root Cause:** โมเดล Nemotron Nano 12B VL ตอบสนองด้วยสถานะ 400 Bad Request ซึ่งแสดงถึงความไม่เข้ากันได้ของพารามิเตอร์หรือโมเดลถูกปิดใช้งานชั่วคราว แต่ระบบปัจจุบันยังไม่มีการจัดการ Error Code นี้ให้เข้าสู่กระบวนการ Fallback ที่รวดเร็ว

**Description:**
แก้ไขปัญหา AI API Down ที่เกิดจาก 400 Bad Request โดยเพิ่ม Logic การจัดการข้อผิดพลาดใน `lib/ai-call.js` หากตรวจพบว่าเป็น 400 จากโมเดล `or-nemotron-nano-12b` ให้ระบบทำการ Retry ด้วยโมเดลสำรองที่กำหนดไว้ (เช่น `qwen/qwen-2-72b-instruct`) ทันที เพื่อให้ระบบยังคงทำงานต่อไปได้โดยไม่ต้องหยุดชะงัก

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Implement error handling for status 400 specifically for 'or-nemotron-nano-12b' to trigger an automa | medium |

## 🎯 Innovation Score: 85/100
- Novelty: 7 | Depth: 9 | Compounding: 9 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
