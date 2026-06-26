---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-26
brain_task_id: ~
source: oracle
proposal_id: EVO-20260526-6768
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: NongFah batch generation is a synchronous web route that can spend 120s on Codex before falling back to Gemini
---

# Oracle Proposal (EVO-20260526-6768)
**Mission:** maintain
**Level:** optimization
**Title:** NongFah batch generation is a synchronous web route that can spend 120s on Codex before falling back to Gemini

## Evidence
```json
{
  "mode": "delta",
  "recent_change_signal": "routes/nongfah.js was actively deployed today; ops_events show three failed deploy preflights for syntax errors in routes/nongfah.js at 03:27, 06:18, and 06:19, followed by successful deploys at 06:19, 06:48, and 06:56.",
  "route_code": "POST /api/nongfah/generate-batch awaits fetch('http://127.0.0.1:18810/openai/v1/chat/completions') inside the request handler, then falls back to Gemini inside the same request path.",
  "live_log": "brain-app-error.log contains: [nongfah] Codex failed, falling back to Gemini: Gateway timeout (120s).",
  "impact": "A user-triggered batch generation request can occupy the HTTP handler for two minutes before even attempting fallback, making the new NongFah UI feel hung and tying user success to the slowest provider path."
}
```

## Recommended Action
Move NongFah batch generation to a queued job flow or add a short per-provider AbortController timeout with immediate 202/job-id response; record generation progress/error in nongfah_jobs instead of holding the web request through Codex+Gemini.
