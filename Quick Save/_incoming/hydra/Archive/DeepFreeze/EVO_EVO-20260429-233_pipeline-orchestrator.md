---
proposal_id: EVO-20260429-233
status: awaiting_human
persona: bold
category: optimization
risk_level: medium
date: 2026-04-29T05:00:27.997Z
---
# 🚀 Evolution Proposal: Pipeline Orchestrator — Workflow Stage Manager สำหรับ Multi-Agent Automation

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** optimization | **Risk:** medium
**Root Cause:** ระบบ Hydra ปัจจุบันมี standalone agents ที่ทำงานแยกกัน (ideator generate, evolver approve, inspector audit) แต่ไม่มี Pipeline Orchestrator ที่ควบคุม flow ข้าม agents, จัดการ stage transitions, หรือ enforce quality gates ระหว่างขั้นตอน ทำให้ขาด structured end-to-end automation ที่ ai-auto-work repo แสดง

**Description:**
สร้าง Pipeline Orchestrator ใหม่ใน lib/pipeline-orchestrator.js ที่จัดการ workflow แบบ chained stages (วิจัย → ทบทวน → วางแผน → ทบทวน → พัฒนา → ทบทวน → ทดสอบ) โดยใช้ concept จาก ai-auto-work repository ที่แบ่งขั้นตอนชัดเจนแต่ละ stage มี own AI call, gate logic ตัดสินว่าจะ proceed/loop/escalate และ outcome tracking เก็บเข้า hydra-memory ผ่าน appendOutcome() ที่มีอยู่แล้ว ปัจจุบัน Hydra มีแค่ isolated agents (ideator/evolver/inspector) แต่ขาด orchestration layer ที่เชื่อม stages กัน ทำให้ไม่สามารถทำ full-cycle automation ได้

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `lib/pipeline-orchestrator.js` | Create new Pipeline Orchestrator module with stage definitions (RESEARCH → REVIEW → PLAN → REVIEW →  | medium |

## 🎯 Innovation Score: 82/100
- Novelty: 9 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
