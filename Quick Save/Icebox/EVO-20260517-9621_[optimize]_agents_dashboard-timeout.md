---
version: "draft"
type: impl
status: icebox
outcome: pending
date: 2026-05-18
brain_task_id: ~
source: oracle
tags: [oracle, optimize, optimization]
summary: >
  Agents dashboard repeatedly runs a failing OpenClaw sessions command on live API requests.
---

# Agents dashboard repeatedly runs a failing OpenClaw sessions command on live API requests

## 📌 Context (Compiled Truth)
GET /api/agents runs a heavy CLI command `sessions --all-agents` which fails and times out after 15s.
Evaluation Score: 2.75/5.0
Verdict: ICEBOX

Plan: Make sessions enrichment non-blocking and cached.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```json
{
  "logs": "/root/.pm2/logs/brain-app-error.log contains repeated `[agents] openclaw sessions --all-agents error: Command failed: openclaw sessions --all-agents --json`",
  "file": "/root/brain-app/routes/agents.js",
  "code_path": "GET /api/agents runs Promise.all([ocRun('agents list'), ocRun('status --usage'), ocRun('sessions --all-agents')]); GET /api/agents/:id also calls ocRun('sessions --all-agents')",
  "timeout": "ocRun default timeout is 15000ms, so a dashboard refresh can spend up to 15s on a known-failing optional enrichment call",
  "why_new": "Not the same as the previous Hydra inspector silence or Discord API 404 findings; this is a separate OpenClaw CLI enrichment failure inside the web API."
}
```

## 🔬 Timeline & Debugging Log
- 2026-05-18: Placed in ICEBOX via `/evo` command.
