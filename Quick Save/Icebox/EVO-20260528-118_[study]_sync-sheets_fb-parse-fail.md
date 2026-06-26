---
version: "draft"
type: study
status: icebox
outcome: pending
date: 2026-06-01
brain_task_id: ~
source: oracle
tags: [oracle, maintain, yt-dlp]
conversation: "95e670f8-6d70-4ee0-a204-e52f33c1c8fa"
conversation_title: "Hydra EVO Batch Review"
related_plans_same_conversation:
  - "V12.17.0_[impl]_mission-control_fb-send-idempotency.md"
merged_task_ids: [EVO-20260528-118]
related: []
summary: >
  Oracle critical finding: Sync-sheets reel ingestion is now failing on Facebook extractor parse errors, not just individual token or runtime bugs. Iceboxed.
---

# EVO-118: Sync-sheets yt-dlp parse failures

## 📌 Context (Compiled Truth)
Evaluated in batch review and sent to ICEBOX. Wait for yt-dlp update first before implementing complex cookie/auth fallbacks, as yt-dlp often patches these upstream.

## 📦 RAW ARTIFACT BACKUP (Iron Rule)
```markdown
---
version: "draft"
type: hotfix
status: active
outcome: pending
date: 2026-05-28
brain_task_id: ~
source: oracle
proposal_id: EVO-20260528-118
tags: [oracle, maintain, critical]
summary: >
  Oracle critical finding: Sync-sheets reel ingestion is now failing on Facebook extractor parse errors, not just individual token or runtime bugs
---

# Oracle Proposal (EVO-20260528-118)
**Mission:** maintain
**Level:** critical
**Title:** Sync-sheets reel ingestion is now failing on Facebook extractor parse errors, not just individual token or runtime bugs

## Evidence
{
  "web_error_log": "Recent brain-app errors show multiple sync-sheets downloads failing with yt-dlp exit 1: ERROR: [facebook] <reel_id>: Cannot parse data; examples include reels 999056495909915, 34766954836283887, 1596380324986593, and 1418903449563634.",
  "scope_check": "Database has fb_reels_history/mc_jobs/reel_blueprints tables, but mc_jobs currently only shows 76 completed rows, so these failed reel imports are not visible as failed mc_jobs and can silently disappear from operator dashboards.",
  "not_duplicate_of_memory": "This is distinct from the approved sync-sheets undefined-runtime-variable crash and from the iceboxed downloader checkpointing proposals: the current failure mode is Facebook extraction/parsing by yt-dlp itself."
}

## Recommended Action
Add a sync-sheets ingestion health path that records per-reel yt-dlp failures into the database, then update/pin yt-dlp and add a fallback extractor strategy for Facebook reels, such as cookies/authenticated metadata retrieval or Graph/API metadata before marking the item failed.
```

## 🔬 Timeline & Debugging Log
- **2026-06-01**: ICEBOXED.

## 🔗 GBRAIN Backlinks
### related_to
- **2026-06-01 07:57** | [V12.8.0 Discord reel storyboard pipeline](../Complete/Complete/V12/V12.8.0_[impl]_discord_reel-storyboard-pipeline.md) -- Context on yt-dlp usage
