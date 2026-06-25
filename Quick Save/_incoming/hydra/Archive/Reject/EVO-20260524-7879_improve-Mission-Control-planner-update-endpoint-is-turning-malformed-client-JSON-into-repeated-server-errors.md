---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-24
brain_task_id: ~
source: oracle
proposal_id: EVO-20260524-7879
tags: [oracle, improve, optimization]
summary: >
  Oracle optimization finding: Mission Control planner update endpoint is turning malformed client JSON into repeated server errors
---

# Oracle Proposal (EVO-20260524-7879)
**Mission:** improve
**Level:** optimization
**Title:** Mission Control planner update endpoint is turning malformed client JSON into repeated server errors

## Evidence
```json
{
  "source": "readWebLog(160)",
  "endpoint": "PUT /api/mc/planner/216",
  "errors": [
    "Expected property name or '}' in JSON at position 1",
    "Bad escaped character in JSON at position 18"
  ],
  "count_in_tail": 6,
  "location": "routes/mission-control.js:582 via Hono request JSON parsing",
  "impact": "Repeated 500-class error logging during planner edits instead of a controlled 400 response or client-side validation"
}
```

## Recommended Action
Wrap the planner update body parse in a narrow try/catch that returns a 400 with a concise validation message, and inspect the Mission Control planner client for hand-built JSON/string escaping so it sends `JSON.stringify` output with the correct content type.
