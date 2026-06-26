---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-09
brain_task_id: ~
source: oracle
proposal_id: EVO-20260509-869
tags: [oracle, maintain, optimization]
summary: >
  Oracle optimization finding: Usage accounting can drop writes when concurrent AI calls share the same temp file
---

# Oracle Proposal (EVO-20260509-869)
**Mission:** maintain
**Level:** optimization
**Title:** Usage accounting can drop writes when concurrent AI calls share the same temp file

## Evidence
```json
{
  "new_log": "2026-05-09 cron-brief shows `[usage] save error: ENOENT: no such file or directory, rename '/root/brain-app/discord-bot/data/usage.json.tmp' -> '/root/brain-app/discord-bot/data/usage.json'`",
  "current_file": "discord-bot/data/usage.json exists and parses, but tmp file is absent after the failed rename",
  "code_path": "/root/brain-app/discord-bot/lib/ai.js logs `[usage] save error` from the usage save path",
  "delta_context": "PM2 uptime is stable and no new crash evidence appeared; this is a telemetry persistence race, not a process restart issue"
}
```

## Recommended Action
Patch usage saving to serialize writes or use a unique temp file per write (`usage.json.${pid}.${timestamp}.tmp`) followed by atomic rename, and ensure the data directory exists before writing so token/cost accounting is not silently lost during overlapping cron AI calls.
