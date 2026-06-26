---
proposal_id: EVO-20260426-835
status: awaiting_human
persona: moonshot
category: optimization
risk_level: safe
date: 2026-04-26T06:22:12.690Z
---
# 🚀 Evolution Proposal: Implement Dynamic Fallback for 400 Bad Request Errors

**Triggered By Persona:** MOONSHOT

## 📋 What & Why
**Category:** optimization | **Risk:** safe
**Root Cause:** การเรียกใช้ Model `or-qwen-32b` ผิดพลาดด้วยสถานะ 400 ซึ่งอาจเกิดจาก Model ID ไม่ถูกต้องหรือถูกปิดใช้งาน ทำให้ Flow การทำงานของ AI หยุดชะงักเนื่องจากขาด Mechanism ในการจัดการ Error ชนิดน Client Error (4xx) โดยเฉพาะ

**Description:**
เพิ่มกลไก Fallback อัตโนมัติใน `lib/ai-call.js` เพื่อจัดการกรณี Model คืนค่า 400 Bad Request โดยจะตรวจสอบว่าเป็น Model ที่มีปัญหาหรือไม่ แล้วสลับไปใช้ Model ถัดไปในรายการ (เช่น Qwen 72B) ทันทีโดยไม่ต้อง Restart ระบบ

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Update the callAI function to catch 400 status errors and trigger a retry with the next available mo | safe |

## 🎯 Innovation Score: 80/100
- Novelty: 7 | Depth: 8 | Compounding: 9 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
