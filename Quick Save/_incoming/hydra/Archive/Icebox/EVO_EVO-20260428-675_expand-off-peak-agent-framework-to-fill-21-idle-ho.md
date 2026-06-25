---
proposal_id: EVO-20260428-675
status: awaiting_human
persona: bold
category: innovation_trigger
risk_level: safe
date: 2026-04-28T05:01:33.173Z
---
# 🚀 Evolution Proposal: Expand off-peak agent framework to fill 21 idle hours with productivity agents

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** innovation_trigger | **Risk:** safe
**Root Cause:** cron-auto-planner.js มี off-peak agents แต่ถูกจำกัดให้ทำงานแค่ช่วง 00:00-06:00 เท่านั้น ทำให้ 21 ชั่วโมงที่เหลือไม่มี scheduled agents ทำงาน แม้ว่าจะมี idle CPU/bandwidth ที่สามารถใช้ประโยชน์ได้

**Description:**
ระบบมี 21 ชั่วโมงว่างในแต่ละวัน (idle hours) แต่ off-peak agents ทำงานแค่ 00:00-06:00 (6 ชม.) เท่านั้น โอกาสนี้จะขยาย off-peak framework ให้ครอบคลุมช่วงเวลาที่เหลืออีก 15 ชม. ด้วยการเพิ่ม 3 ชนิดของ productivity agents ใหม่: (1) Market Intel Agent — ดึงข่าว/เทรนด์ระหว่างค่ำ, (2) Content Research Agent — ค้นหา keywords/topics ระหว่างกลางคืน, (3) Analytics Prep Agent — ประมวลผล data สะสมเพื่อเตรียมรายงาน โดยจะสร้าง data flywheel ที่ทำให้ Doctor Skill มีข้อมูลมากขึ้นในการวางแผน content

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/off-peak-agents/off-peak-content-generator.js` | Add time-tier logic to spawn agents based on hour window: 00-06 maintenance/research, 08-14 midday i | safe |
| `scripts/off-peak-agents/market-intel-agent.js` | Create new agent that fetches Thai business/tech news during 08:00-14:00 Bangkok time, extracts key  | safe |
| `scripts/off-peak-agents/content-research-agent.js` | Create new agent that performs keyword research and competitor topic analysis during 14:00-18:00 Ban | safe |
| `scripts/off-peak-agents/analytics-prep-agent.js` | Create new agent that aggregates engagement metrics and prepares daily analytics summary during 20:0 | safe |

## 🎯 Innovation Score: 78/100
- Novelty: 8 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
