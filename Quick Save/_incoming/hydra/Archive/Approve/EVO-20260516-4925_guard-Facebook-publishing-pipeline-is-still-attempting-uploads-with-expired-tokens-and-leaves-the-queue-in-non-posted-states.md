---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-16
brain_task_id: ~
source: oracle
proposal_id: EVO-20260516-4925
tags: [oracle, guard, critical]
summary: >
  Oracle critical finding: Facebook publishing pipeline is still attempting uploads with expired tokens and leaves the queue in non-posted states
---

# Oracle Proposal (EVO-20260516-4925)
**Mission:** guard
**Level:** critical
**Title:** Facebook publishing pipeline is still attempting uploads with expired tokens and leaves the queue in non-posted states

## Evidence
```json
{
  "web_log": "brain-app error log shows `[Send to FB Error] FB Init: Error validating access token: Session has expired ... code 190 error_subcode 463` and a later FB Upload invalid endpoint error.",
  "db_status": "fb_post_queue status distribution currently has only `error`=4 and `commented`=2, with no posted/done/complete rows returned by the status summary.",
  "scope_check": "This is not the prior FB Reels checkpointing icebox item; the current failure is token/endpoint validation for outbound publishing."
}
```

## Recommended Action
Add a preflight FB token/endpoint validator before queue processing: pause outbound publish attempts when token validation fails, mark the integration as needing re-auth, and avoid consuming queue retries until credentials and upload endpoint version are healthy.
