---
proposal_id: EVO-20260427-293
status: awaiting_human
persona: bold
category: content
risk_level: high
date: 2026-04-27T05:00:32.861Z
---
# 🚀 Evolution Proposal: Auto-unstick IDEA content stuck > 14 days

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** content | **Risk:** high
**Root Cause:** ระบบขาด watchdog สำหรับติดตาม content lifecycle แม้ inspector ตรวจพบ finding แต่ไม่มี auto-remediation ที่จะย้าย content ที่ค้างอยู่ให้ไปต่อหรือถูก abandon อย่างเป็นระบบ

**Description:**
ปัญหาคือมี content plan ติดอยู่สถานะ IDEA นานกว่า 14 วันโดยไม่มีใครจัดการ วิธีแก้คือเพิ่ม logic ใน check-content-readiness.js ให้ตรวจจับ content ที่ค้าง และส่ง notification ไปยัง Discord หรือ auto-escalate เปลี่ยนสถานะเป็น NEEDS_REVIEW เพื่อให้ทีมเห็นและดำเนินการ

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/check-content-readiness.js` | Add query to find content plans stuck in IDEA status for > 14 days, then send Discord notification w | high |
| `scripts/hydra/inspector.js` | Extend inspector to include remediation_trigger field and auto-call a fix function for stuck_content | high |

## 🎯 Innovation Score: 58/100
- Novelty: 5 | Depth: 6 | Compounding: 7 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
