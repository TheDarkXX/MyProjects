---
version: "draft"
type: hotfix
status: rejected
outcome: rejected
date: 2026-05-13
brain_task_id: ~
source: oracle
proposal_id: EVO-20260511-5087
tags: [oracle, maintain, critical, infra]
conversation: "30f64001-46e6-4af8-8358-98bbb7e3ef94"
conversation_title: "Hydra Proposal Review - May 2026 Batch"
related_plans_same_conversation:
  - "V12.7.6_[hotfix]_cron_inspector-pipeline-silence.md"
  - "V12.7.7_[hotfix]_gateway_double-send-response-crash.md"
  - "V12.7.8_[hotfix]_aimonitor_byteplus-glm-429-spam.md"
  - "V12.7.9_[hotfix]_telemetry_usage-temp-file-race.md"
related: []
summary: >
  Proposal to fix deploy hook running no-op restart waves. Rejected because this overlaps almost entirely with the already-shipped V12.4.0 (Deploy Lock / Restart Attribution). Any residual oldrev checks can be patched directly into the existing fix without a new plan.
---

# 🧠 REJECTED: Deploy Hook No-op Restarts

## 📌 Context (Compiled Truth)
- **Verdict: REJECTED.**
- The issue described (PM2 restart storms during deployment) was already addressed by **V12.4.0** (`restart-attribution-deploy-lock`) shipped on 2026-05-08.
- Creating a separate plan for this is redundant. The minor gap (checking `oldrev` vs `newrev`) can just be patched ad-hoc.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)

<details>
<summary>EVO-20260511-5087</summary>

```json
{
  "git_delta": "`git log --since='2026-05-11 00:00:00 +0700' --all` returned no commits; latest visible commit remains d193d74 from 2026-05-07",
  "ops_events": "47 deploy_executed rows were recorded on 2026-05-11 between 02:34 and 09:39, all labelled `Git push to vps (brain-app discord-bot)`",
  "pm2_correlation": "PM2 shows clean SIGINT stop/start waves for brain-app and discord-bot throughout 2026-05-11, including 09:00-16:00; discord-bot restarts rose from 1105 to 1152 while brain-app stayed at 1106 in the current PM2 snapshot",
  "not_crash_evidence": "Exits are clean SIGINT and paired brain-app/discord-bot restarts, so this is deploy/reload orchestration, not app crashes"
}
```

**Recommended Action:**
Patch `/root/repos/brain-app.git/hooks/post-receive` to treat unchanged target revisions as no-op: compare oldrev/newrev and the checked-out `/root/brain-app` HEAD before running npm/pm2, add a simple lock/debounce around post-receive, and write `deploy_skipped_noop` ops_events for skipped pushes so valid deploy attribution remains visible without restarting services.

</details>

## 🔬 Timeline & Debugging Log
- 2026-05-13: Rejected via /evo skill (Redundant with V12.4.0).

## 🔗 GBRAIN Backlinks
### related_to
- **2026-05-13 16:20** | [Deploy Lock](c:\My Claw\Openclaw-VPS\Quick Save\Complete\Complete\V12\V12.4.0_[impl]_infra_restart-attribution-deploy-lock.md) -- The primary fix that made this redundant.
