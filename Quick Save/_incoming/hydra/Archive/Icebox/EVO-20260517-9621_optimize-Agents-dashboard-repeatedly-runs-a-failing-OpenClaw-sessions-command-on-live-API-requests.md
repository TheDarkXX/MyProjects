---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-17
brain_task_id: ~
source: oracle
proposal_id: EVO-20260517-9621
tags: [oracle, optimize, optimization]
summary: >
  Oracle optimization finding: Agents dashboard repeatedly runs a failing OpenClaw sessions command on live API requests
---

# Oracle Proposal (EVO-20260517-9621)
**Mission:** optimize
**Level:** optimization
**Title:** Agents dashboard repeatedly runs a failing OpenClaw sessions command on live API requests

## Evidence
```json
{
  "logs": "/root/.pm2/logs/brain-app-error.log contains repeated `[agents] openclaw sessions --all-agents error: Command failed: openclaw sessions --all-agents --json`",
  "file": "/root/brain-app/routes/agents.js",
  "code_path": "GET /api/agents runs Promise.all([ocRun('agents list'), ocRun('status --usage'), ocRun('sessions --all-agents')]); GET /api/agents/:id also calls ocRun('sessions --all-agents')",
  "timeout": "ocRun default timeout is 15000ms, so a dashboard refresh can spend up to 15s on a known-failing optional enrichment call",
  "why_new": "Not the same as the previous Hydra inspector silence or Discord API 404 findings; this is a separate OpenClaw CLI enrichment failure inside the web API."
}
```

## Recommended Action
Make sessions enrichment non-blocking and cached: return agent list from `agents list` even when `sessions --all-agents` fails, add a short TTL/circuit breaker after failures, and log the first failure per cooldown instead of every request.
