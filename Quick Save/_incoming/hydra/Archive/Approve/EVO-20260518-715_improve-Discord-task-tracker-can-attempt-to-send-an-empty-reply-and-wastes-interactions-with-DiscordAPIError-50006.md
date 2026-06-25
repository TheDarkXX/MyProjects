---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-18
brain_task_id: ~
source: oracle
proposal_id: EVO-20260518-715
tags: [oracle, improve, optimization]
summary: >
  Oracle optimization finding: Discord task-tracker can attempt to send an empty reply and wastes interactions with DiscordAPIError 50006
---

# Oracle Proposal (EVO-20260518-715)
**Mission:** improve
**Level:** optimization
**Title:** Discord task-tracker can attempt to send an empty reply and wastes interactions with DiscordAPIError 50006

## Evidence
```json
{
  "discord_error_log": "[bot] Error in #task-tracker: DiscordAPIError[50006]: Cannot send an empty message",
  "stack_location": "file:///root/brain-app/discord-bot/index.js:131:7",
  "request_body": "content: ''",
  "related_but_not_duplicate": "The log also contains repeated Brain API 404s, but that route mismatch was previously rejected; this finding is only about missing output validation before channel.send()."
}
```

## Recommended Action
Before TextChannel.send at discord-bot/index.js:131, normalize the generated response and short-circuit empty/whitespace content to a small fallback like 'No update generated' or skip sending with a debug log. This avoids Discord 400s even when an upstream brain/API call returns no usable text.
