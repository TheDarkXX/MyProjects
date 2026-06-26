---
proposal_id: EVO-20260501-682
status: awaiting_human
persona: bold
category: optimization
risk_level: medium
date: 2026-05-01T05:01:10.562Z
---
# 🚀 Evolution Proposal: Bun-powered AI Agent Launcher for compute-intensive tasks

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** optimization | **Risk:** medium
**Root Cause:** ระบบ Hydra ใช้ Node.js สำหรับ AI agent execution ซึ่งมี overhead จาก V8 JIT compilation และ CommonJS module loading ทำให้ AI agent ที่ต้องประมวลผลหนักๆ ทำงานช้า และยังต้อง transpile TypeScript ก่อนรัน

**Description:**
สร้าง Bun launcher script สำหรับ AI Agent tasks ที่ต้องการความเร็วสูง โดยใช้ Bun runtime เร็วกว่า Node.js 3-4 เท่า รองรับ TypeScript native และมี built-in SQLite ที่เร็วกว่า better-sqlite3 ของ Node.js ระบบจะ fallback เป็น Node.js ถ้า Bun ไม่พร้อมใช้งาน และใช้ IPC สื่อสารกับระบบหลักผ่าน JSON signals

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `scripts/bun-launcher.js` | Create Bun launcher script with auto-fallback to Node.js, built-in SQLite query support, and IPC sig | medium |
| `scripts/off-peak-agents/lib/agent-executor.js` | Refactor agent execution to use bun-launcher for compute-intensive agents (content-research, market- | medium |
| `lib/heartbeat.js` | Add bun-native alternative using Bun.sql for heartbeat logging as fallback when running under Bun ru | medium |

## 🎯 Innovation Score: 78/100
- Novelty: 8 | Depth: 8 | Compounding: 9 | Specificity: 7

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
