---
version: "draft"
type: impl
status: active
outcome: pending
date: 2026-05-20
brain_task_id: ~
source: oracle
proposal_id: EVO-20260520-3000
tags: [oracle, align, optimization]
summary: >
  Oracle optimization finding: Mission Control publish-state enum is drifting: analytics jobs are marked `posted` while reporting logic expects `published`
---

# Oracle Proposal (EVO-20260520-3000)
**Mission:** align
**Level:** optimization
**Title:** Mission Control publish-state enum is drifting: analytics jobs are marked `posted` while reporting logic expects `published`

## Evidence
```json
{
  "db_summary": "mc_jobs has 66 rows, 0 rows with publish_status='published', but 32 rows have non-empty fb_post_id",
  "recent_rows": "Latest synced rows id 216-225 all have publish_status='posted', fb_post_id populated, fb_synced_at='2026-05-20 19:03:26..38', and real fb_views/comments values",
  "runtime_log": "POST /api/mc/planner/sync-analytics now returns 200 after 39s, so analytics ingestion is active rather than missing",
  "why_new": "This is distinct from the prior missing /planner/sync-analytics route finding: the route now exists and succeeds, but downstream state semantics still make posted content invisible to any code that checks publish_status='published'."
}
```

## Recommended Action
Standardize Mission Control publish_status values. Either migrate existing `posted` rows to `published`, or update dashboard/planner/analytics queries to treat `posted` as the canonical published state. Add a small enum helper/constraint so future publishing, sync, and dashboard code cannot diverge again.
