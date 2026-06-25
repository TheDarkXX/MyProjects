---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-15
brain_task_id: ~
source: oracle
proposal_id: EVO-20260515-7041
tags: [oracle, align, optimization]
summary: >
  Oracle optimization finding: Discord bot is repeatedly calling Brain API routes that return 404
---

# Oracle Proposal (EVO-20260515-7041)
**Mission:** align
**Level:** optimization
**Title:** Discord bot is repeatedly calling Brain API routes that return 404

## Evidence
```json
{
  "log": "/root/.pm2/logs/discord-bot-error.log",
  "pattern": "Many repeated lines: [brain] API 404: {\"error\":\"Not found\"}",
  "code": "/root/brain-app/discord-bot/lib/brain.js contains wrappers that call paths such as /events, /journal, /content, /search, /notes, /memories against BRAIN_API=http://localhost:3001/api.",
  "impact": "User-facing Discord commands can silently degrade into BRAIN_ERROR responses, while logs are noisy enough to hide newer failures like provider timeouts or database errors."
}
```

## Recommended Action
Map each discord-bot wrapper to the currently available brain-app route names, and add per-route feature detection/cooldown so missing optional endpoints are logged once per deploy instead of on every command.
