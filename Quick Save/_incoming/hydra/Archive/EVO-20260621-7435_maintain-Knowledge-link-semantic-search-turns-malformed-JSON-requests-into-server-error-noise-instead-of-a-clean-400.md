---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-06-21
brain_task_id: ~
source: oracle
proposal_id: EVO-20260621-7435
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: Knowledge-link semantic-search turns malformed JSON requests into server error noise instead of a clean 400
---

# Oracle Proposal (EVO-20260621-7435)
**Mission:** maintain
**Level:** optimization
**Title:** Knowledge-link semantic-search turns malformed JSON requests into server error noise instead of a clean 400

## Evidence
```json
{
  "log": "brain-app error log shows `POST /api/links/semantic-search - Error: Bad escaped character in JSON at position 9` with stack through `c.req.json()` and `routes/links.js:207`",
  "code": "`routes/links.js` directly does `const { query } = await c.req.json();` in `/semantic-search` before validation, so JSON parse failures escape the route handler",
  "scope": "This is distinct from the already-tracked embedding-model/vector-index issues: it is a request parsing hardening bug on the semantic-search API boundary."
}
```

## Recommended Action
Patch only the `/api/links/semantic-search` handler to parse JSON inside a small try/catch, reject non-object or missing `query` with HTTP 400, and log at warn/debug level instead of emitting full server error stacks for malformed client bodies.
