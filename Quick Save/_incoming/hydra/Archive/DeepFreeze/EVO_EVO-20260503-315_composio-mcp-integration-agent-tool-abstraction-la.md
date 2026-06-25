---
proposal_id: EVO-20260503-315
status: awaiting_human
persona: bold
category: external
risk_level: high
date: 2026-05-03T05:00:21.772Z
---
# 🚀 Evolution Proposal: Composio MCP Integration - Agent Tool Abstraction Layer

**Triggered By Persona:** BOLD

## 📋 What & Why
**Category:** external | **Risk:** high
**Root Cause:** ปัจจุบัน agents เรียก external APIs แบบ ad-hoc ผ่าน axios/fetch โดยตรงในแต่ละ script ทำให้ไม่มี standardization, reusable tools, และไม่รองรับ complex workflows เช่น OAuth callbacks หรือ multi-step tool chains ที่ Composio ออกแบบมาเพื่อ handle

**Description:**
นำ Composio SDK มาเป็น Tool Abstraction Layer ให้ Hydra agents สามารถเรียก external APIs, OAuth flows, webhook triggers ได้อย่าง unified แทนที่จะต้อง hard-code API calls ในแต่ละ agent script โดยเฉพาะ MCP (Model Context Protocol) จะช่วยให้ agents สื่อสารกันผ่าน standard tool interface ได้

## 🛠️ Proposed Changes
| File | Action | Risk |
|------|--------|------|
| `package.json` | add composio-core dependency for Node.js tool integration | high |
| `lib/ai-call.js` | add Composio tool registry wrapper as alternative call path | high |
| `scripts/hydra/evolver.js` | add Composio tool actions to evolver's code generation capability | high |

## 🎯 Innovation Score: 55/100
- Novelty: 9 | Depth: 5 | Compounding: 6 | Specificity: 4

## 🤖 AG Decision Guide
- **ถ้า Approve:** ให้ AG ลงมือเขียนโค้ดและแก้ไขระบบตาม *Proposed Changes* ข้างต้น
- **ถ้า Reject:** เปลี่ยนสถานะไฟล์นี้เป็น rejected หรือลบทิ้ง ระบบ Memory จะบันทึกไว้สอน Ideator
