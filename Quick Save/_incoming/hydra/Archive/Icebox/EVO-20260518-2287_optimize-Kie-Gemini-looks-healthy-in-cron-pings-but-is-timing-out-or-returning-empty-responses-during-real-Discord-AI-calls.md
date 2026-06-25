---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-18
brain_task_id: ~
source: oracle
proposal_id: EVO-20260518-2287
tags: [oracle, optimize, optimization]
summary: >
  Oracle optimization finding: Kie Gemini looks healthy in cron pings but is timing out or returning empty responses during real Discord AI calls
---

# Oracle Proposal (EVO-20260518-2287)
**Mission:** optimize
**Level:** optimization
**Title:** Kie Gemini looks healthy in cron pings but is timing out or returning empty responses during real Discord AI calls

## Evidence
```json
{
  "discord_errors": [
    "[ai] ⚠️ callAI step gemini-2.5-flash (kie) failed: Empty response from model. Trying next...",
    "[ai] ⚠️ callAI step gemini-2.5-flash (kie) failed: The operation was aborted due to timeout. Trying next..."
  ],
  "cron_contrast": "AI monitor reports Kie: Gemini 2.5 Flash OK in roughly 4.4–5.3s during recent pings.",
  "pm2_signal": "kie-proxy process is online, but PM2 reports HTTP p95 latency around 28814ms and mean around 5302ms."
}
```

## Recommended Action
Treat Kie/Gemini health as workload-sensitive: record empty-response and timeout rates from real Discord calls, temporarily demote Kie when consecutive production calls fail, and keep cron ping status separate from routing priority.
