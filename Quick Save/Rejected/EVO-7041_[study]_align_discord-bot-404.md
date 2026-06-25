---
version: "draft"
type: study
status: rejected
outcome: rejected
date: 2026-05-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260515-7041
tags: [oracle, align, rejected]
conversation: "718edc46-503e-4824-a740-48a18d88eea2"
conversation_title: "Hydra Proposal Review"
related_plans_same_conversation: []
related: []
summary: >
  Rejected: V12.7.12 fixed the core AI routing issue. Remaining 404s are dead code stubs.
---

# EVO-7041: Discord Bot 404 API Routes

## 📌 Context (Compiled Truth)
V12.7.12 (the oracle/AI gateway refactor) already fixed the core AI routing issue. The remaining 404s are from optional Brain API wrappers (`/events`, `/journal`, `/notes`) that were never implemented — they're aspirational stubs from the Discord bot's `brain.js` library. Cleaning them up is nice-to-have but doesn't fix any user-visible problem. The bot gracefully degrades with `BRAIN_ERROR` fallbacks.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
# Oracle Proposal (EVO-20260515-7041)
**Title:** Discord bot is repeatedly calling Brain API routes that return 404
```

## 🔬 Timeline & Debugging Log
- **2026-05-16**: Rejected via `/evo`.

## 🔗 GBRAIN Backlinks
- **2026-05-14** | [V12.7.12_[hotfix]_infra_cli-to-mcp-gateway-refactor.md](file:///c:/My%20Claw/Openclaw-VPS/Quick%20Save/Active/V12.7.12_[hotfix]_infra_cli-to-mcp-gateway-refactor.md) -- Related Fix
