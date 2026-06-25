---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-21
brain_task_id: ~
source: oracle
proposal_id: EVO-20260521-4287
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: Reel Blueprint import endpoint is throwing 500s when callers do not send multipart form data
---

# Oracle Proposal (EVO-20260521-4287)
**Mission:** maintain
**Level:** optimization
**Title:** Reel Blueprint import endpoint is throwing 500s when callers do not send multipart form data

## Evidence
```json
{
  "log": "brain-app error log shows `[Blueprint Import Error] TypeError: Content-Type was not one of \"multipart/form-data\" or \"application/x-www-form-urlencoded\"` at `routes/reel-blueprints.js:139:24`.",
  "code": "`app.post('/import', async (c) => { const formData = await c.req.formData(); ... })` has no Content-Type guard or JSON fallback before parsing formData.",
  "scope": "This is distinct from the already pending Discord ReelPipeline ffprobe/OpenRouter blocker: the `/api/reel-blueprints/import` web/API endpoint can fail before any blueprint data is accepted."
}
```

## Recommended Action
Update `/api/reel-blueprints/import` to validate `Content-Type` before calling `c.req.formData()`: return a clear 415/400 JSON error for unsupported requests, or support both multipart and JSON payloads. Also make the frontend/import caller send `multipart/form-data` explicitly when uploading grid/thumbnail files.
