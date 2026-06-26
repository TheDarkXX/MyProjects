---
proposal_id: EVO-20260425-733
status: awaiting_human
persona: bold
category: content
risk_level: safe
date: 2026-04-25T05:00:39.712Z
---
# 🚀 Evolution Proposal: Auto-escalate content plans stuck as IDEA > 14 days

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** content | **Risk:** safe
**Root Cause:** ระบบไม่มี monitoring mechanism สำหรับ content plans ที่ค้างอยู่ในสถานะ IDEA นานเกิน threshold 14 วัน ทำให้ plans ถูกลืมและไม่ได้รับการ review ต่อ

**Description:**
สคริปต์ cron-content-remind.js ปัจจุบันส่ง reminder สำหรับ overdue tasks แต่ไม่ได้ตรวจ content plans ที่ค้างอยู่ในสถานะ IDEA นานเกินไป แก้ไขโดยเพิ่ม logic ตรวจหา plans ที่ stuck > 14 วัน แล้วส่ง Discord notification ไปยัง hydra-core channel พร้อม action buttons สำหรับ approve/pause/archive

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/cron-content-remind.js` | Add stuck IDEA plans detection: query DB for content plans where status='IDEA' AND created_at < NOW( | safe |
| `scripts/cron-content-remind.js` | Add clickable action buttons (Approve, Pause, Archive) per stuck plan using Discord components API f | safe |
| `scripts/cron-content-remind.js` | Add metrics logging: track stuck_content_count per run for inspector dashboard, emit finding INSP-20 | safe |

## 🎯 Innovation Score: 58/100
- Novelty: 5 | Depth: 6 | Compounding: 7 | Specificity: 8

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
