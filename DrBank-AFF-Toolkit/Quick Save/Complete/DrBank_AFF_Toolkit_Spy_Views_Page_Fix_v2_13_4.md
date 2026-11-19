---
version: "2.13.4"
type: impl
status: complete
outcome: shipped
date: 2026-11-19
aliases: [drbank-aff-toolkit, spy-collector, fb-views, competitor-page, spy-pool-persistence]
conversation: "4a32247d-7241-456a-83d5-5a868e6c1f9a"
summary: >
  Fixed Spy Reel Collector returning 0 views and numeric metric strings ("10K", "4.4K", "4K") as competitor_page across both DrBank AFF Toolkit v2.13.4 and XBrain aff/index.js, relocated runtime spy_competitor_pool.json into data/ so VPS deploys never overwrite live pool items, and restored/backfilled all 20 Spy Pool items with verified views, durations, and page names.
---
# DrBank AFF Toolkit v2.13.4 — FB Reel Views Extraction, Real Page Guard & Runtime Pool Protection

## 📌 Context & Implementation (Compiled Truth)

- **Root Causes Identified:**
  1. **Missing `fb_views` Extraction:** Neither `DrBank-AFF-Toolkit` (`background.js` `extractShopeeTagFromHtml`, `scrapeActiveFacebookReelTabImpl`, `SPY_COLLECT_REELS`; `sidepanel.js` `parseSpyTextareaReels`) nor `XBrain/apps/aff/index.js` (`scrapeFbReelLight`, `/api/shopee-aff/spy-collect`) extracted `fb_views` from Facebook Reels (`fb_views` defaulted to `0`).
  2. **Numeric `competitor_page` Pollution (`10K`, `4.4K`, `4K`):** The DOM header link selector (`a[role="link"] strong`) in `background.js` matched compact engagement numbers instead of skipping metric-only strings.
  3. **Sidebar / Comment Metric Contamination:** Regexes for `play_count` and `unified_reactors` matched recommended sidebar videos (`767`) or comment reaction counts (`1` / `2`) instead of the main Reel payload (`video_view_count`, `FBReelsFeedbackBar_feedback`, `fb_reel_react_button`).
  4. **Deploy-Time Pool Overwrite Risk:** `10M_Project/Shopee_Aff/spy_competitor_pool.json` was git-tracked outside `data/`, causing `git checkout -f master` on VPS `post-receive` to overwrite live Spy Pool items on deploy.
- **Extension Changes (`DrBank-AFF-Toolkit` v2.13.4, Commit `9032b6df`):**
  - `background.js`: Added `decodeHtmlEntities`, `parseCompactFbCount` (Thai `พัน`/`หมื่น`/`แสน`/`ล้าน` + EN `K`/`M`/`B`), `isInvalidCompetitorPageName`, `extractFbReelIdFromUrl`, `extractFbMetricsFromHtml`, and `scrapeFbWatchFallback` (`https://www.facebook.com/watch/?v=<id>` with `en-US` headers for 3-sig-fig `og:title` views and `video_view_count` / `playable_duration_in_ms` fallback). Scoped feedback regexes to `FBReelsFeedbackBar_feedback` / `fb_reel_react_button`.
  - `sidepanel.js`: Forwarded `fb_views` & `duration_sec` in `parseSpyTextareaReels()`, displayed `👁️` view counts in `#drb-spy-tab-preview` and result cards.
  - Bumped version to `v2.13.4` in `manifest.json`, `sidepanel.html`, and `popup.html`.
- **Server & Data Persistence (`C:\XBrain\apps\aff\index.js`, Commits `e9f1230c` & `64a87e21`):**
  - Upgraded `scrapeFbReelLight` (`parseFbReelHtmlMeta` + `/watch/?v=` fallback), `commitSpyItemsLocked`, `mergeSourceReels`, and `/api/shopee-aff/spy-collect` to extract `fb_views`, `duration_sec`, and replace invalid numeric `competitor_page` values.
  - Added `POST /api/shopee-aff/spy-refresh-metrics` for refreshing missing views/page names.
  - Relocated runtime `SPY_POOL_JSON_PATH` to `data/spy_competitor_pool.json` (auto-seeding from legacy path if missing) so VPS `post-receive` `HYDRA_DATA_DIR` preserves live Spy Pool state across deploys.
- **Verification & Live Backfill:**
  - `node --check` passed on `background.js`, `sidepanel.js`, `popup.js`, and `apps/aff/index.js`.
  - `node tools/verify_sidepanel_dom.cjs` (`All 117 HTML IDs verified`) and `node tools/verify_social_commission.cjs` passed all assertions.
  - Live `https://aff.doctorbankonline.com/api/aff/bootstrap` verified 20 Spy Pool items (`seq 1..9`, `24..37`) with non-zero `fb_views`, real `competitor_page` names, `duration_sec`, and 3 local product images per restored item:
    - `aidrb1611s024`: `49,000` views · `นายหัวคัดมาบอกต่อ` (`10s`)
    - `aidrb1611s025`: `1,800,000` views · `นายหัวคัดมาบอกต่อ` (`10s`)
    - `aidrb1611s026`: `130,000` views · `นายหัวคัดมาบอกต่อ` (`9.9s`)
    - `aidrb1611a458`: `140,000` views · `ตาต้น สายแข็ง` (`10s`)
    - `aidrb1611s028`: `110,000` views · `บ้านฉันน่าอยู่มาก` (`10s`)
    - `aidrb1611s029`: `840,000` views · `ของมันต้องมี` (`93.1s`)
    - `aidrb1611s030`: `124,231` views · `Wani Haa` (`10s`)
    - `aidrb1611a541` – `aidrb1611s037`: `3,800` – `4,600,000` views · `กระดานดำ` (`12s` – `20.1s`)



## 📋 Files Changed This Session
| File | What Changed | Scope |
|---|---|---|
| `DrBank-AFF-Toolkit/background.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/manifest.json` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/popup.html` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/sidepanel.html` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/sidepanel.js` | Auto-detected session change | Core Repository |

## 🔬 Timeline & Debugging Log
- 13:51 — Audited screenshot showing `VIEWS = 0`, `0.0% eng`, and `4K`/`10K` under competitor page names; traced missing `fb_views` across `background.js`, `sidepanel.js`, and `apps/aff/index.js`.
- 13:57 — Verified `https://www.facebook.com/watch/?v=<id>` returns `en-US` `og:title` views (`839K views`), `video_view_count` (`124231`), `playable_duration_in_ms`, and `owner.name`.
- 14:04 — Caught and fixed sidebar `play_count` and comment `unified_reactors` regex collisions; verified 5 live Reels in Node (`48K`, `100K`, `110K`, `840K`, `124,231` views).
- 14:07 — Discovered `git push vps master` overwrote git-tracked `spy_competitor_pool.json`; relocated runtime `SPY_POOL_JSON_PATH` to `data/spy_competitor_pool.json`, redeployed, and restored all `aff_spy_collect_logs` items (`20` total in live `spyPool`).

## 🔗 GBRAIN Backlinks
- **2026-11-19** | [DrBank_AFF_Toolkit_Reload_Instant_Spy_Sync_v2_13_3.md](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/Quick%20Save/Complete/DrBank_AFF_Toolkit_Reload_Instant_Spy_Sync_v2_13_3.md) -- Prior v2.13.3 Spy Collector instant sync & UI reload release


## 📦 RAW ARTIFACT BACKUP (Iron Rule)
> Auto-generated by qs-compiler.js — No standalone brain artifacts detected for this session.
> Context is fully captured in the compiled implementation notes and git diff log above.
