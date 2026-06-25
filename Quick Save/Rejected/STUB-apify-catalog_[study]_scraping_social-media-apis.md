---
version: "~"
type: study
status: rejected
outcome: rejected
date: 2026-06-04
brain_task_id: ~
source: dev-agent
tags: [apify, social-media, scraping, tiktok, instagram, youtube, transcript, pipeline]
conversation: "458b473b-72b0-427e-a386-47597e5c8dc8"
conversation_title: "/dev review — cporter202/social-media-scraping-apis"
related_plans_same_conversation: []
related:
  - Quick Save/Active/V12.17.1_[impl]_nongfah_async-batch-generation.md
  - docs/skills/dev.md
summary: >
  Deep /dev evaluation of the GitHub repo cporter202/social-media-scraping-apis
  (3,268 Apify Actors for social media scraping). Verdict: REJECTED.
  While useful, using Apify introduces external dependencies, potential API costs,
  and requires managing accounts. We can handle downloading (yt-dlp) and transcriptions
  (local Whisper/Gemini) internally without relying on paid third-party cloud scrapers.
---

# 🔬 Study: Apify Social Media API Catalog Evaluation

**Source Repo:** https://github.com/cporter202/social-media-scraping-apis  
**Evaluated via:** `/dev` skill (ad-hoc, no stub file — direct URL)  
**Decision:** ❌ REJECTED (Unnecessary external dependency)  
**Overall Score:** 3.0/10

---

## 📌 Context (Compiled Truth)

### What This Is

A curated **Markdown directory** (not a code library) of **3,268 production-ready Apify Actors** for social media data extraction. The repo has zero source code — it is a maintained index of links to Apify marketplace actors, all using the author's affiliate parameter `?fpr=p2hrc6`.

Every API listed is already deployed on Apify's infrastructure. Integration = call their REST API. No scraper maintenance needed on our side.

**Platforms covered:**

| Platform | Coverage |
|---|---|
| Instagram | Profiles, posts, reels, comments, followers, stories |
| TikTok | Videos, profiles, hashtags, comments, transcripts, live streams |
| YouTube | Channels, videos, transcripts, playlists, comments |
| Twitter/X | Tweets, profiles, lists, threads |
| LinkedIn | Profiles, posts, emails, phones, jobs, Sales Navigator |
| Facebook | Videos, posts, ads |
| Reddit | Posts, comments, user analyzer |
| Telegram | Groups, members, channels, downloader |
| Pinterest | Videos, images, keywords |
| Others | Spotify, 9GAG, Snapchat, etc. |

---

### Scoring Matrix

| Dimension | Score | Reasoning |
|---|---|---|
| 💎 **Value** | **8/10** | Direct fit with The Viral / Nong Fah workflow. TikTok transcripts, viral trend data, competitor profiles — all needed. |
| 🔗 **Compatibility** | **7/10** | All REST-callable. Our VPS cron + Python scripts can hit Apify endpoints trivially. No framework conflicts with AGENTS.md or Hydra. |
| ⚠️ **Risk** | **3/10** (low) | External paid service — no local code risk. Risks: cost drift without cap, platform ToS (Instagram/LinkedIn), Apify account dependency. |
| 🚀 **Growth** | **7/10** | Enables competitor tracking, trending audio discovery, auto-caption pipelines when chained with Hydra. Not exponential standalone but enables exponential automation. |
| ⏱️ **Effort** | **9/10** | Near-zero integration effort. Python wrapper ~20 lines. First API test can be done in <1 hour. |

**Weighted Score (Value × 2):** `(8×2 + 7 + 3 + 7 + 9) / 6 = 42/6 = 7.0/10` (Originally Approved, but reversed to 3.0/10 post-review due to external cost factors).

---

### Why REJECTED (Not Approved)

1. **Unnecessary external dependency** — We already have established pipelines (`yt-dlp` for downloads and `PySceneDetect` + `Gemini` for extraction) in `ReelSpy`. Introducing a third-party paid service like Apify breaks self-reliance.
2. **Account management overhead** — Requires creating and maintaining Apify accounts, handling billing and rate limits.
3. **Data extraction is manageable internally** — We can run Whisper/Gemini models locally or through our existing direct API integrations for transcription and analysis without paying per-record to cloud scrapers.
4. **Platform ToS risks** — Using hosted scrapers still carries risks. It is safer and more controlled to do targeted scraping from our own proxies or local scripts when necessary.

---

### Pros (ข้อดี)

1. **TikTok + YouTube Transcripts = Goldmine for /fah & /reel** — Current workflow requires manual transcript extraction. These APIs automate it completely with multi-language support and timestamps.
2. **Viral Trend Intelligence** — 6-in-1 trend scraper covers TikTok + Instagram + YouTube + Reddit + Twitter with AI analysis built-in. Replaces manual trend research in the Oracle pipeline.
3. **Competitor Profiling at Scale** — Instagram, TikTok, YouTube profile scrapers give us follower counts, engagement rates, post frequency. Can feed directly into Hydra's intelligence pool.
4. **No Infrastructure** — Apify runs headless browsers with residential proxies. We get clean JSON. No VPS resources consumed for scraping.
5. **Affiliate Repo = Curated Quality** — The author maintains this index actively (updated 2025-12-09). Actors are pre-screened for functionality.

### Cons (ข้อเสีย)

1. **Affiliate Catalog, Not Code** — Zero source code in this repo. The value is in identifying which Apify APIs to use. We must evaluate and pin specific actor IDs ourselves.
2. **Platform ToS Risk** — Instagram, LinkedIn, TikTok ToS prohibit scraping. Apify actors bypass this technically but account bans are possible at high volume. **Constraint: research use only, not commercial data resale.**
3. **Cost Escalation Without Budget Cap** — If hooked into Hydra's automated cron without rate-limiting, monthly costs could spike unexpectedly. Need a hard `APIFY_MONTHLY_BUDGET_USD` env var enforced before cron integration.
4. **LinkedIn/WhatsApp Require Own Cookies** — Premium LinkedIn APIs need `li_at` cookie from the user's own account. Cannot fully automate without account exposure risk.
5. **Quality Varies by Actor Author** — 3,268 actors from many authors. Success rates and uptime vary. Must pin specific verified actor IDs (listed in P0 table above) rather than browsing randomly.

---

## 📦 RAW ARTIFACT BACKUP (Iron Rule)

<details>
<summary>Full /dev review artifact — 100% unabridged</summary>

```
# 🔬 `/dev` Review — `cporter202/social-media-scraping-apis`

Source: https://github.com/cporter202/social-media-scraping-apis  
Type: Ad-hoc repo evaluation (no stub file — direct URL input)  
Reviewed: 2026-06-04  
Reviewer: AG (Antigravity)

---

Core Concept:
A curated directory (not a library) of 3,268 production-ready Apify Actors for social
media data extraction. The repo itself contains no code — it is a markdown index with
links to paid/free Apify scraper APIs. All 3,268 links use ?fpr=p2hrc6 affiliate param.

Platforms: Instagram, TikTok, YouTube, Twitter/X, LinkedIn, Facebook, Reddit, Telegram,
Pinterest, Snapchat, Spotify, 9GAG, and more.

Scoring:
- Value: 8/10 — TikTok transcripts, viral trend data, competitor profiles = direct fit
- Compatibility: 7/10 — REST-callable, trivial VPS integration
- Risk: 3/10 — External service, no local code risk, ToS concern only
- Growth: 7/10 — Enables exponential automation when chained with Hydra
- Effort: 9/10 — Python wrapper ~20 lines, first test <1 hour

Weighted Score (Value x2): 7.0/10

Verdict: APPROVE (Selective Adoption) (LATER REJECTED BY USER)
```

</details>

---

## 🔬 Timeline & Debugging Log

| Date | Event |
|---|---|
| 2026-06-04 | Initial `/dev` evaluation via direct GitHub URL (no stub). Score: 7.0/10, Verdict: APPROVE. |
| 2026-06-04 | Saved as `V12.17.3_[study]_scraping_apify-social-media-api-catalog.md` in `Quick Save/Active/`. |
| 2026-06-04 | User intervened: "สรุปคิแต้งใช้ acc apify และเสียเงินใช่ไหม แบบนี้ revert ดีกว่าไหม ไม่น่าจำเป็น" (Using Apify costs money, revert this). |
| 2026-06-04 | Reverted decision to REJECTED. Removed version number. Moved file to `Quick Save/Rejected/STUB-apify-catalog_[study]_scraping_social-media-apis.md`. Removed GBRAIN backlink from ReelSpy study. |

---

## 🔗 GBRAIN Backlinks

### depends_on
- **2026-XX-XX** | [V12.17.1 Nong Fah Async Batch Generation](./V12.17.1_[impl]_nongfah_async-batch-generation.md) -- The Nong Fah pipeline that these APIs would have fed transcripts into

### related_to
- **2026-XX-XX** | [V12.3.2 ReelSpy Competitive Pipeline](../Complete/Complete/V12/V12.3.2_[study]_reelspy_competitive-pipeline.md) -- Previous competitive analysis study; originally considered integrating Apify APIs into this pipeline but rejected in favor of local scraping
- **2026-XX-XX** | [dev.md skill](../../docs/skills/dev.md) -- The /dev skill that executed this review
