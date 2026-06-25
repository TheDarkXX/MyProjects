---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-06-12
brain_task_id: ~
source: oracle
proposal_id: EVO-20260612-68
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: LINE Hermes webhook is live but its runtime environment is missing LINE credentials and can fail user messages after accepting the webhook
---

# Oracle Proposal (EVO-20260612-68)
**Mission:** maintain
**Level:** critical
**Title:** LINE Hermes webhook is live but its runtime environment is missing LINE credentials and can fail user messages after accepting the webhook

## Evidence
```json
{
  "logs": "brain-app error log repeatedly shows '[LINE Webhook] Missing LINE credentials in .env' and multiple '[LINE Webhook] Hermes Execution Error' entries for real LINE user/group messages",
  "code": "/root/brain-app/routes/line-hermes.js returns HTTP 500 when LINE_CHANNEL_SECRET or LINE_CHANNEL_ACCESS_TOKEN is absent, then runs Hermes asynchronously via execAsync for accepted messages",
  "runtime": "pm2Status for brain-app does not show LINE_CHANNEL_SECRET or LINE_CHANNEL_ACCESS_TOKEN in the live environment, while /api/webhook/line traffic is present in brain-app logs"
}
```

## Recommended Action
Add the LINE credentials to the managed PM2/deploy environment or disable the LINE webhook route until configured. Also add a bounded Hermes timeout and a fallback LINE error reply so accepted webhook events do not silently fail after the initial 200 response.
