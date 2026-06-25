---
version: "draft"
type: study
status: rejected
outcome: pending
date: 2026-06-01
brain_task_id: ~
source: oracle
tags: [oracle, optimization, shallow]
conversation: "95e670f8-6d70-4ee0-a204-e52f33c1c8fa"
conversation_title: "Hydra EVO Batch Review"
related_plans_same_conversation:
  - "V12.17.0_[impl]_mission-control_fb-send-idempotency.md"
merged_task_ids: [EVO-20260524-7879]
related: []
summary: >
  Oracle optimization finding: Mission Control planner update endpoint is turning malformed client JSON into repeated server errors. Rejected (Shallow).
---

# EVO-7879: Mission Control JSON 500 (REJECTED)

## 📌 Context (Compiled Truth)
Evaluated in batch review and REJECTED. Too shallow. Changing a 500 to a 400 does not solve the root cause (client sending malformed JSON) and has zero behavioral impact.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
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

## Recommended Action
Wrap the planner update body parse in a narrow try/catch that returns a 400 with a concise validation message, and inspect the Mission Control planner client for hand-built JSON/string escaping so it sends `JSON.stringify` output with the correct content type.
```

## 🔬 Timeline & Debugging Log
- **2026-06-01**: REJECTED (Too shallow).

## 🔗 GBRAIN Backlinks
### related_to
- **2026-06-01 07:59** | [V12.7.2 Mission Control Viral Planner](../Complete/Complete/V12/V12.7.2_[impl]_ui_mission-control-viral-planner.md) -- Context on planner API
