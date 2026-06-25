---
proposal_id: EVO-20260427-769
status: awaiting_human
persona: bold
category: skill_gap
risk_level: high
date: 2026-04-27T05:01:21.383Z
---
# 🚀 Evolution Proposal: GC2: Crystallize Rare Skills into High-Priority Skill Registry

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** skill_gap | **Risk:** high
**Root Cause:** Skill compilation pipeline ไม่ได้ prioritize rare-but-critical skills ที่มี anti-patterns สำคัญ ทำให้ agents ไม่ได้รับ reminders สำหรับ patterns เหล่านี้เมื่อต้องทำงานที่เกี่ยวข้อง

**Description:**
ระบบมี 8 skill tags ที่สำคัญ (self-healing, meta-agent, doctor-agent, fallback-tiers, hydra-core, event-driven, ai-manager, openclaw) แต่ถูกใช้น้อยกว่า 3 ครั้งใน 30 วัน ต้อง crystallize เหล่านี้ให้เป็น high-priority skills ที่ compile-skills.js จะ prioritize และ expose ให้ agents เห็นบ่อยขึ้น

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/compile-skills.js` | Add high-priority skill registry for rare-but-critical skills. When compiling skills from skill-emit | high |
| `scripts/compile-skills.js` | Add skill usage tracking with decay - track first_seen, last_seen, and usage_count per skill. If a r | high |
| `scripts/hydra/ideator.js` | Add skill_gap detection logic - when generating growth proposals, check if the proposal relates to a | high |

## 🎯 Innovation Score: 72/100
- Novelty: 7 | Depth: 8 | Compounding: 8 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
