---
version: "draft"
type: study
status: icebox
outcome: pending
date: 2026-05-23
brain_task_id: ~
source: oracle
tags: [oracle, maintain, optimization, icebox]
conversation: "7cfb2629-1d85-4e4d-b99a-8eb43406959b"
conversation_title: "Hydra EVO Batch Review"
related_plans_same_conversation:
  - "V12.10.0_[impl]_mission-control_async-analytics-sync.md"
  - "V12.10.1_[hotfix]_mission-control_publish-status-enum-guard.md"
  - "EVO-20260521-4907_[study]_discord_reel-pipeline-ffprobe-model.md"
related:
  - "routes/reel-blueprints.js"
summary: >
  Iceboxed proposal to add a Content-Type guard before parsing formData. No production impact.
---
# Reel Blueprint import endpoint is throwing 500s when callers do not send multipart form data

## 📌 Context (Compiled Truth)
Valid defensive fix, but trivially low impact. Callers already use FormData. Bundled into Icebox to fix next time `reel-blueprints.js` is touched.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
<details>
<summary>EVO-20260521-4287_maintain-Reel-Blueprint-import-endpoint-is-throwing-500s-when-callers-do-not-send-multipart-form-data.md</summary>

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

</details>

## 🔬 Timeline & Debugging Log
- **2026-05-23:** Iceboxed by User/EVO due to low impact.

## 🔗 GBRAIN Backlinks
### related_to
- **2026-05-23 15:30** | [MOC_hydra](c:\My Claw\Openclaw-VPS\Quick Save\Complete\MOC_hydra.md) -- Evaluated and iceboxed by EVO skill
