---
proposal_id: EVO-20260424-171
status: awaiting_human
persona: bold
category: innovation_trigger
risk_level: safe
date: 2026-04-24T19:00:03.066Z
---
# 🚀 Evolution Proposal: Activate off-peak agents for 21 idle hours

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** innovation_trigger | **Risk:** safe
**Root Cause:** Off-peak infrastructure ถูกเขียนไว้แล้วแต่ไม่เคย uncomment และ implement จริง ทำให้เสียโอกาส 21 ชม./วัน ในการสร้าง content backlog อัตโนมัติ

**Description:**
ระบบมี idle hours ถึง 21 ชั่วโมงต่อวัน (00:00-07:00 และ 08:00-22:00) ซึ่ง cron-auto-planner.js มีโครงสร้าง off-peak agents พร้อมอยู่แล้วแต่ถูก comment ไว้ ควรสร้าง off-peak content generator ที่ทำงานระหว่าง 01:00-06:00 เพื่อเติม backlog และ maintenance agents สำหรับ cleanup DB หลัง page reach สูง

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/cron-auto-planner.js` | Uncomment and implement runOffPeakAgents() function with real content generator calls | safe |
| `scripts/off-peak-agents/off-peak-content-generator.js` | Create new file: generate content ideas using AI during 01:00-05:00 Bangkok time, insert into conten | safe |
| `scripts/off-peak-agents/off-peak-maintenance.js` | Create new file: run DB cleanup, archive old logs, compact SQLite during 05:00-06:00 | safe |

## 🎯 Innovation Score: 82/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
