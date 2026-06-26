---
proposal_id: EVO-20260426-593
status: awaiting_human
persona: bold
category: content
risk_level: safe
date: 2026-04-26T05:00:35.614Z
---
# 🚀 Evolution Proposal: Auto-escalate content plans stuck in IDEA stage > 7 days

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** content | **Risk:** safe
**Root Cause:** Content plans ที่ติดอยู่ IDEA stage ไม่ได้รับการ re-evaluate เมื่อ deadline ผ่านไป ทำให้ไม่มี trigger ให้ระบบ review หรือ escalate ขึ้นมา ปัญหานี้เกิดจากขาด watchdog logic สำหรับ content plan lifecycle

**Description:**
เพิ่ม auto-escalation ใน cron-auto-planner.js ให้ตรวจจับ content plans ที่ติดอยู่ที่ IDEA stage เกิน 7 วัน โดยส่ง notification ไป Discord และ auto-mark ว่า needs_review พร้อมเพิ่ม self-healing logic ให้ระบบพยายาม re-evaluate plan โดยอัตโนมัติ

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/cron-auto-planner.js` | Add stuck plan detection: query plans where status='IDEA' AND created_at < NOW() - INTERVAL 7 DAY, t | safe |

## 🎯 Innovation Score: 72/100
- Novelty: 7 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
