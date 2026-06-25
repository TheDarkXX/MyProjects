---
version: "draft"
type: study
status: icebox
outcome: deferred
date: 2026-06-14
brain_task_id: ~
source: oracle
proposal_id: EVO-20260612-8055
tags: [oracle, maintain, optimization, downloader, stream, webstream]
conversation: "0c354422-1811-4b46-b8b1-d1ce3ebc41b6"
conversation_title: "Hydra EVO Batch Review 2026-06-14"
related_plans_same_conversation:
  - "V12.19.2_[hotfix]_links_gemini-embedding-model-swap.md"
  - "V12.19.3_[hotfix]_line_hermes-webhook-credentials.md"
  - "V12.19.4_[hotfix]_cache_redis-reconnect-on-read-write.md"
  - "EVO-20260610-3409_[study]_infra_hermes-dashboard-insecure (Icebox)"
related:
  - routes/downloader.js
  - docs/skills/evo.md
summary: >
  Downloader streaming route throws ERR_INVALID_STATE (double-close on ReadableStreamDefaultController)
  during reel sync jobs. The stream is already closed when cleanup fires. Fix is trivial (add idempotent
  closed flag guard) but impact is cosmetic — only noisy error logs, no data loss. Iceboxed for next
  maintenance sweep.
---

# EVO-20260612-8055 — Downloader Stream Double-Close (ICEBOXED)

## 📌 Context (Compiled Truth)

### Why Iceboxed
- Cosmetic error — the stream is already done when the double-close fires
- No user-facing impact, no data loss
- Reel sync failures are caused by upstream issues, not the double-close itself
- Fix is trivial (add `closed` flag) — bundle with next maintenance round

### Star Scores
| Dimension | Score |
|---|---|
| 🚀 Impact | ⭐⭐ |
| ⚙️ Feasibility | ⭐⭐⭐⭐ |
| ⏱️ Urgency | ⭐⭐ |
| 🎯 Alignment | ⭐⭐ |
| **Overall** | **2.5 / 5** |

## 📦 RAW ARTIFACT BACKUP (Iron Rule)

<details>
<summary>Original EVO Proposal (EVO-20260612-8055)</summary>

```
# Oracle Proposal (EVO-20260612-8055)
**Mission:** maintain
**Level:** optimization
**Title:** Downloader streaming route can double-close its Web Stream controller during reel sync jobs

## Evidence
{
  "logs": "brain-app error log shows TypeError [ERR_INVALID_STATE]: Invalid state: Controller is already closed at ReadableStreamDefaultController.close and /root/brain-app/routes/downloader.js:503:61",
  "context": "The error appears amid sync-sheets reel ingestion failures, indicating the stream cleanup path is throwing after a child process/socket end path has already closed the response stream",
  "memory_check": "This is distinct from the existing iceboxed Facebook extractor parse-error finding; the new issue is the route's stream lifecycle throwing ERR_INVALID_STATE during cleanup."
}

## Recommended Action
Guard the downloader stream close/error paths with an idempotent `closed` flag and avoid calling controller.close/enqueue after abort, socket end, timeout, or prior close. Log the original yt-dlp/job failure without throwing a secondary Web Streams exception.
```

</details>

## 🔗 GBRAIN Backlinks

### related_to
- **2026-06-14** | [V12.8.0 — Discord Reel Storyboard Pipeline](../Complete/Complete/V12/V12.8.0_[impl]_discord_reel-storyboard-pipeline.md) -- reel pipeline context
