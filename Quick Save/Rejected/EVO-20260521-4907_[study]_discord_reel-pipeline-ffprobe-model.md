---
version: "draft"
type: study
status: rejected
outcome: rejected
date: 2026-05-23
brain_task_id: ~
source: oracle
tags: [oracle, maintain, critical, rejected]
conversation: "7cfb2629-1d85-4e4d-b99a-8eb43406959b"
conversation_title: "Hydra EVO Batch Review"
related_plans_same_conversation:
  - "V12.10.0_[impl]_mission-control_async-analytics-sync.md"
  - "V12.10.1_[hotfix]_mission-control_publish-status-enum-guard.md"
  - "EVO-20260521-4287_[study]_reel-blueprints_import-endpoint-content-type.md"
related:
  - "scripts/off-peak-agents/reel-blueprint-pipeline.js"
summary: >
  Rejected proposal because model is already gemini-2.5-flash and ffprobe dependency is tracked.
---
# Discord viral ReelPipeline is blocked by missing ffprobe and a retired OpenRouter model

## 📌 Context (Compiled Truth)
Redundant proposal. Model issue is already fixed to `gemini-2.5-flash`. The `ffprobe` dependency issue was already tracked as a deployment prerequisite in V12.8.0.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
<details>
<summary>EVO-20260521-4907_maintain-Discord-viral-ReelPipeline-is-blocked-by-missing-ffprobe-and-a-retired-OpenRouter-model.md</summary>

---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-21
brain_task_id: ~
source: oracle
proposal_id: EVO-20260521-4907
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Discord viral ReelPipeline is blocked by missing ffprobe and a retired OpenRouter model
---

# Oracle Proposal (EVO-20260521-4907)
**Mission:** maintain
**Level:** critical
**Title:** Discord viral ReelPipeline is blocked by missing ffprobe and a retired OpenRouter model

## Evidence
```json
{
  "discord_log": "After successful Facebook video downloads to /root/brain-app/tmp/viral-clips, ReelPipeline fails with `/bin/sh: 1: ffprobe: not found`, then retries `anthropic/claude-3.5-sonnet` three times and receives OpenRouter 404 `No endpoints found for anthropic/claude-3.5-sonnet`.",
  "recent_examples": [
    "viral_clip_1779335021411.f3423768334445538v.mp4 downloaded, ffprobe missing",
    "pipeline attempts 1-3 failed for anthropic/claude-3.5-sonnet with 404",
    "same model failure repeated on a second ReelPipeline run"
  ],
  "delta_context": "This is visible in the latest discord-bot error log after the recent deploy wave; it is not one of the previously tracked/rejected/iceboxed items."
}
```

## Recommended Action
Install/provision ffmpeg/ffprobe in the runtime image or gate ReelPipeline startup with a dependency check; replace `anthropic/claude-3.5-sonnet` with an available OpenRouter model and fail fast on provider 404 instead of retrying the same retired model three times.

</details>

## 🔬 Timeline & Debugging Log
- **2026-05-23:** Rejected by User/EVO due to being redundant.

## 🔗 GBRAIN Backlinks
### related_to
- **2026-05-23 15:30** | [MOC_hydra](c:\My Claw\Openclaw-VPS\Quick Save\Complete\MOC_hydra.md) -- Evaluated and rejected by EVO skill
