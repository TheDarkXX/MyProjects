---
version: "draft"
type: study
status: rejected
outcome: rejected
date: 2026-05-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260515-9183
tags: [oracle, guard, rejected]
conversation: "718edc46-503e-4824-a740-48a18d88eea2"
conversation_title: "Hydra Proposal Review"
related_plans_same_conversation: []
related: []
summary: >
  Rejected: Threat model mismatch. Single-user VPS.
---

# EVO-9183: PM2 Environment Token Exposure

## 📌 Context (Compiled Truth)
This is a textbook "defense in depth" recommendation that makes sense for multi-user or enterprise environments. But this is a **single-user VPS with root-only SSH access**. The tokens are only visible to someone who already has root — at which point they can read `.env` files directly anyway. The operational cost of restructuring PM2 env loading outweighs the security benefit.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
# Oracle Proposal (EVO-20260515-9183)
**Title:** PM2 process environments contain live service tokens and API keys
```

## 🔬 Timeline & Debugging Log
- **2026-05-16**: Rejected via `/evo`.

## 🔗 GBRAIN Backlinks
- **2026-05-16** | [V12.7.14_[hotfix]_maintain_error-logging.md](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Active/V12.7.14_[hotfix]_maintain_error-logging.md) -- Context
