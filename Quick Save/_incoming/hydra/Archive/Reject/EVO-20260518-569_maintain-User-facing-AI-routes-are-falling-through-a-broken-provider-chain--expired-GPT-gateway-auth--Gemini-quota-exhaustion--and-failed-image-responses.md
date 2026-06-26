---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-18
brain_task_id: ~
source: oracle
proposal_id: EVO-20260518-569
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: User-facing AI routes are falling through a broken provider chain: expired GPT gateway auth, Gemini quota exhaustion, and failed image responses
---

# Oracle Proposal (EVO-20260518-569)
**Mission:** maintain
**Level:** critical
**Title:** User-facing AI routes are falling through a broken provider chain: expired GPT gateway auth, Gemini quota exhaustion, and failed image responses

## Evidence
```json
{
  "brain_app_errors": [
    "[ai-chat] GPT via ai-gateway error: Provided authentication token is expired. Please try signing in again.",
    "Gemini API error: {\"code\":429,\"message\":\"You exceeded your current quota...\"}",
    "[ai-imagine] Error: Image generation failed. GPT returned text:"
  ],
  "scope": "Observed in current brain-app error tail after the latest deploy events; distinct from prior AI-monitor cooldown/provider-noise items because this affects live ai-chat/ai-imagine request paths, not only monitoring."
}
```

## Recommended Action
Refresh or replace the expired GPT/ai-gateway upstream credential, then add a fast auth-expired/quota-exceeded provider health gate so ai-chat and ai-imagine skip known-bad providers instead of cascading into empty image outputs.
