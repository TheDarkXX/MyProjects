---
proposal_id: EVO-20260425-450
status: awaiting_human
persona: moonshot
category: optimization
risk_level: medium
date: 2026-04-25T17:00:36.830Z
---
# 🚀 Evolution Proposal: Implement OpenRouter Fallback Logic in ai-call.js

**Triggered By Persona:** MOONSHOT

## 📋 What & Why
**Category:** optimization | **Risk:** medium
**Root Cause:** การเรียก API ผ่าน lib/ai-call.js ขาดกลไกการจัดการ Error และการสลับโมเดล (Fallback) เมื่อโมเดลเป้าหมายเกิดปัญหา ทำให้ Request ทั้งหมดล้มเหลวเพราะโมเดลเดียว

**Description:**
เพิ่มระบบ Fallback อัตโนมัติในไฟล์ lib/ai-call.js เพื่อจัดการกรณีที่โมเดลหลัก (เช่น or-qwen-3-32b) คืนค่า Error 400 (Bad Request) หรือ 500 โดยจะทำการสลับไปใช้โมเดลสำรองที่เสถียรกว่า (เช่น openai/gpt-4o-mini) ทันที เพื่อให้ระบบทำงานต่อได้โดยไม่หยุดชะงัก

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Implement try-catch block with retry logic using a fallback model list (e.g., openai/gpt-4o-mini) up | medium |

## 🎯 Innovation Score: 72/100
- Novelty: 7 | Depth: 8 | Compounding: 9 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
