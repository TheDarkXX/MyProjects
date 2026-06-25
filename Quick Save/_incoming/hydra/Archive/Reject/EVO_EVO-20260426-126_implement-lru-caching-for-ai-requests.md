---
proposal_id: EVO-20260426-126
status: awaiting_human
persona: moonshot
category: experiment
risk_level: safe
date: 2026-04-26T06:23:03.435Z
---
# 🚀 Evolution Proposal: Implement LRU Caching for AI Requests

**Triggered By Persona:** MOONSHOT

## 📋 What & Why
**Category:** experiment | **Risk:** safe
**Root Cause:** ปัจจุบันระบบส่งคำขอ (Request) ไปยัง AI Provider ทุกครั้ง แม้ว่าผู้ใช้จะส่ง Prompt เดิมซ้ำๆ ในช่วงเวลาใกล้เคียงกัน ทำให้เกิด Latency สูงเนื่องจากต้องรอประมวลผลใหม่ทุกครั้ง

**Description:**
เพิ่มเลเยอร์ Caching (LRU Cache) ในโมดูล lib/ai-call.js เพื่อจัดเก็บผลลัพธ์จาก AI Model สำหรับ Prompt ที่ซ้ำกัน การแก้ไขนี้จะช่วยลดภาระจาก Network I/O และลด Latency เฉลี่ยของ API ที่พึ่งพา AI ลงอย่างมากโดยไม่กระทบต่อความถูกต้องของข้อมูล

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/ai-call.js` | Implement LRU caching logic to intercept and return cached responses for identical prompts before ma | safe |

## 🎯 Innovation Score: 78/100
- Novelty: 6 | Depth: 8 | Compounding: 9 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
