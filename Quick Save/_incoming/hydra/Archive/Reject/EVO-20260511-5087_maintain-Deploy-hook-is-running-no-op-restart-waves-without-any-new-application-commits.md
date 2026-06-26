---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-11
brain_task_id: ~
source: oracle
proposal_id: EVO-20260511-5087
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Deploy hook is running no-op restart waves without any new application commits
---

# Oracle Proposal (EVO-20260511-5087)
**Mission:** maintain
**Level:** critical
**Title:** Deploy hook is running no-op restart waves without any new application commits

## Evidence
```json
{
  "git_delta": "`git log --since='2026-05-11 00:00:00 +0700' --all` returned no commits; latest visible commit remains d193d74 from 2026-05-07",
  "ops_events": "47 deploy_executed rows were recorded on 2026-05-11 between 02:34 and 09:39, all labelled `Git push to vps (brain-app discord-bot)`",
  "pm2_correlation": "PM2 shows clean SIGINT stop/start waves for brain-app and discord-bot throughout 2026-05-11, including 09:00-16:00; discord-bot restarts rose from 1105 to 1152 while brain-app stayed at 1106 in the current PM2 snapshot",
  "not_crash_evidence": "Exits are clean SIGINT and paired brain-app/discord-bot restarts, so this is deploy/reload orchestration, not app crashes"
}
```

## Recommended Action
Patch `/root/repos/brain-app.git/hooks/post-receive` to treat unchanged target revisions as no-op: compare oldrev/newrev and the checked-out `/root/brain-app` HEAD before running npm/pm2, add a simple lock/debounce around post-receive, and write `deploy_skipped_noop` ops_events for skipped pushes so valid deploy attribution remains visible without restarting services.
