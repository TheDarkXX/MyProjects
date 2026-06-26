---
version: "draft"
type: impl
status: rejected
outcome: rejected
date: 2026-05-18
brain_task_id: ~
source: oracle
tags: [oracle, declutter, optimization]
summary: >
  Discord multi-client bot is logging every bot-authored message three times before filtering it out.
---

# Discord multi-client bot is logging every bot-authored message three times before filtering it out

## 📌 Context (Compiled Truth)
Minor log noise from triple-logging debug lines before the bot filter check.
Evaluation Score: 2.25/5.0
Verdict: REJECT

Plan: REJECTED due to low impact.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```json
{
  "discord_out_log": "Recent discord-bot out log repeatedly shows `[debug-lily]`, `[debug-pinky]`, and `[debug-tata]` for the same bot-authored messages across #ai-monitor, #bill-subscription, #credit-tracker, #task-tracker, etc.",
  "code_order": "discord-bot/index.js logs `console.log([debug-${botDef.id}] msg...)` before `if (message.author.bot) return;`. Because three clients are running in one process, each bot message is observed and logged by all three clients even though it is then ignored.",
  "impact": "This produces high-volume noise in PM2 logs during normal bot activity and makes real errors harder to see; it is independent of the already-tracked 404 and TaskFileGen push failures."
}
```

## 🔬 Timeline & Debugging Log
- 2026-05-18: Rejected via `/evo` command.
