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
