---
proposal_id: EVO-20260505-419
status: awaiting_human
persona: bold
category: content
risk_level: medium
date: 2026-05-05T05:00:31.073Z
---
# 🚀 Evolution Proposal: Auto-escalate content plans stuck > 14 days in IDEA

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** content | **Risk:** medium
**Root Cause:** ระบบ content planning ไม่มี cleanup/escalation logic สำหรับ plans ที่ค้างอยู่ในสถานะ IDEA นานเกินไป ทำให้ pending items สะสมโดยไม่มีใครดูแล

**Description:**
เพิ่ม logic ให้ cron-auto-planner.js ตรวจจับ content plans ที่ติดอยู่สถานะ IDEA นานกว่า 14 วัน แล้วส่ง notification ไป Discord หรือ auto-escalate ไปสถานะถัดไป (DRAFT) เพื่อไม่ให้ content plan ถูกลืม

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/cron-auto-planner.js` | Add stuck-content detection: query for content_plans WHERE status='IDEA' AND updated_at < NOW()-14 d | medium |

## 🎯 Innovation Score: 52/100
- Novelty: 5 | Depth: 6 | Compounding: 6 | Specificity: 5

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
