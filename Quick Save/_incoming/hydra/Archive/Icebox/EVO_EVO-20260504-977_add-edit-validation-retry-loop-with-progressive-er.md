---
version: "N/A"
type: impl
status: active
outcome: pending
date: 2026-05-04
brain_task_id: EVO-20260504-977
source: hydra-ideator
tags: [high-risk, manual-review]
conversation: ""
conversation_title: ""
related_plans_same_conversation: []
related: []
summary: >
  Evolver currently runs AI → validate → execute in one shot and crashes if validation fails. Since 79% of proposals fail (72/91), adding a 2-stage retry with progressive error context (validation error → simplified prompt → retry) could double success rate without new AI calls.
---

# Add edit validation retry loop with progressive error context

**Risk Level:** HIGH
**Category:** performance_opportunity

## Root Cause
The loop in evolver.js calls AI once then validates. If validation fails (disallowed paths, ambiguous find strings, syntax errors), it logs error and moves to next proposal. No retry mechanism means 79% of failed proposals die on first validation attempt without giving AI a chance to self-correct.

## Proposed Changes
```json
[
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add maxRetries=2 constant after DEPLOY_HEALTH_CHECK_TIMEOUT_MS line"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Wrap the AI call block in evolveOne(proposal) with retry loop: for (let attempt = 0; attempt <= maxRetries; attempt++) { editResult = callAI(model, prompt); validation = validateEdits(editResult, sourceTexts); if (validation.ok) break; else prompt = buildRetryPrompt(proposal, sourceTexts, validation.error, attempt); }"
  },
  {
    "file": "scripts/hydra/evolver.js",
    "action": "Add buildRetryPrompt(originalProposal, sourceTexts, error, attempt) function that returns simplified prompt with error context and hint to use more context in find strings, preceded by extra rule: 'ถ้าทำผิดซ้ำ ลองใช้ more context lines รอบ find string หรือ simplify the change'"
  }
]
```
