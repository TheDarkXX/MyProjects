---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-15
brain_task_id: ~
source: oracle
proposal_id: EVO-20260515-9183
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: PM2 process environments contain live service tokens and API keys
---

# Oracle Proposal (EVO-20260515-9183)
**Mission:** guard
**Level:** critical
**Title:** PM2 process environments contain live service tokens and API keys

## Evidence
```json
{
  "tool": "pm2Status",
  "components": [
    "brain-app",
    "discord-bot",
    "ai-gateway"
  ],
  "examples_redacted": [
    "DISCORD_BOT_TOKEN=MTQ4...QsYk",
    "TATA_BOT_TOKEN=MTQ4...zPMg",
    "LILY_BOT_TOKEN=MTQ4...P_Js",
    "TELEGRAM_BOT_TOKEN=8633...5tOr0",
    "OPENROUTER_API_KEY=sk-or-v1-...33f1",
    "GOOGLE_API_KEY=AIza...PLI",
    "BRAIN_PASSWORD=doctorbank2026"
  ],
  "risk": "Any diagnostic dump, copied PM2 JSON, or broad process-inspection access exposes credentials that can control Discord bots, AI spend, Telegram, and internal Brain access."
}
```

## Recommended Action
Rotate exposed bot/API credentials, move secrets to a root-only env file or secret loader not emitted in routine PM2 status dumps, and add a redaction step to any ops-reporting path that serializes pm2_env/env.
