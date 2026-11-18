---
version: "2.12.2"
type: impl
status: complete
outcome: shipped
date: 2026-11-18
aliases: [drbank-aff-toolkit, spy-collector, extracom-retry, direct-commission]
conversation: "a58191f5-eea7-413f-8beb-4c5598b58569"
summary: >
  Add per-row and batch 0% retry buttons for Spy Reel Collector & V1 Scanner, harden Tier 2 keyword search + DOM fallback for EXTRACOMM fetching, and remove 3% WHT and 7% VAT ad-cost adjustments so commission values match affiliate.shopee.co.th 100%.
---
# DrBank AFF Toolkit v2.12.2 — Per-Row EXTRACOMM Retry & Direct AFF Commission Parity

## 📌 Context & Implementation (Compiled Truth)

### 1. Per-Row Re-fetch (`🔄 ดึงเรทใหม่`) & Batch Retry (`🔄 รีเช็กตัวที่ 0%`)
- **Spy Reel Collector (`sidepanel.html`, `sidepanel.js`, `src/styles/sidepanel.css`)**:
  - Extracted `resolveSpyRowItemAndRate(row, forceRefresh)` and `ensureSpyRowsShortLinksAndSave(targetRows)` from `runSpyReelCollector()` so individual rows can be refreshed without re-running the entire batch.
  - Added per-row **`🔄 ดึงเรทใหม่`** button (`rerunSingleSpyRow(idx)`) on each card footer: if `item_id` is missing and `competitor_short_url` exists, calls `RESOLVE_SHOPEE_SHORT_URL` in `background.js`, forces `GET_REAL_AFF_OFFER` with `forceRefresh: true`, generates missing `s.shopee.co.th` shortlink, and persists only that row via `SAVE_POOL_SHORTLINKS`.
  - Added summary header button **`🔄 รีเช็กตัวที่ 0% (N)`** (`#drb-spy-btn-retry-failed` -> `rerunFailedSpyRows()`) to sequentially retry only items missing `item_id`, `extraRate <= 0`, or `netComm <= 0`.
- **V1 Realtime Scanner (`src/shopee-affiliate.js`)**:
  - Added per-row **`🔄`** button (`recheckV1RowRealRate`) in the ACTION column + shared `applyVerifiedOfferToV1Row(r, verifiedOffer)` helper to refresh Social Media commission rates and persist to `drbV1ScannerLastResult`.

### 2. Root-Cause Hardening for Intermittent `EXTRACOMM` Failures
- **Tier 2 Search Keyword Cleaning (`src/shopee-affiliate.js`)**: Updated `fetchSingleOfferDetailViaMainBridge` to strip emojis, brackets, and promotional symbols and search both the 60-char cleaned title and a shorter ≤32-char core keyword (`makeShortCore`) before falling back to `cleanId`.
- **Forced DOM Table Fallback (`background.js`)**: In `fetchRealAffOfferImpl`, when `forceRefresh` is true, deleted stale `realOfferCache` entries upfront and allowed `scrapeOfferDetailViaBgTab` to trigger whenever `extraRate <= 0` in `single` mode (even if `hasRealCommission` was set from a base-only rate).
- **Short URL Resolution Bridge (`background.js`)**: Added `RESOLVE_SHOPEE_SHORT_URL` message handler calling `resolveShopeeShortUrlInExt`.

### 3. Direct `affiliate.shopee.co.th` Commission Parity (Zero Tax / VAT Adjustments)
- Removed the 3% WHT deduction (`whtRate = 0.0`, `whtAmount = 0`, `netComm = grossComm`) and 7% VAT ad-cost inflation (`realDailyAdCostTHB = 100` instead of `107`) in `src/common/utils.js`, `background.js`, `sidepanel.html`, `sidepanel.js`, `src/shopee-affiliate.js`, `src/shopee-hud.js`, `popup.html`, and `tools/verify_social_commission.cjs`.
- Shopee's 250 THB Base Commission Cap remains enforced across all calculators and table renderers.
- Updated `sidepanel.html` & `sidepanel.js` Hero cards (`renderHero`) to show `Extra ฿xx + Base ฿yy` and `ทุนแอด 100฿/วัน` instead of tax-deducted net figures.
- Updated `src/shopee-hud.js` floating HUD & Shopee Grid signal cards (`scanAndOverlayShopeeGrid`) to compute break-even units against `100฿` daily ad spend and direct AFF commission.
- Updated `src/shopee-affiliate.js` V1 Scanner table headers, `.xlsx` / `.csv` export columns, and Conversion Report `scanReportDOM` (`netCommission = maxVal` without `0.97` multiplier).
- Updated `popup.html` status summary to display `100฿ / วัน (ตรงตาม AFF)`.

### 4. Auto-Detect & On-Demand Auto-Wake for Sleeping AFF Tabs (`v2.13.0`)
- **Version Bump (`manifest.json`, `sidepanel.html`, `popup.html`, `src/common/utils.js`)**: Bumped extension version from `2.12.0` to `2.13.0` and updated manifest description to `100฿/วัน (ตรงตามหน้า AFF)`.
- **On-Demand Wakeup Without RAM Lock (`background.js`)**:
  - Added `isTabSleeping(tab)` (`tab.discarded || tab.status === 'unloaded'`), `wakeAffTabIfSleeping(tab)` (reloads sleeping tab, waits for completion + 750ms for `sec_sdk`), `inspectAffBridgeStatus()`, and `ensureAffBridgeReady(options)` without forcing permanent `autoDiscardable: false`.
  - Sorted `findOpenAffTabs()` and `fetchRealAffOfferImpl()` to prioritize awake AFF tabs over sleeping tabs, and updated `sendToAffTabWithReinject()` to auto-wake discarded tabs before messaging.
  - Added `GET_AFF_BRIDGE_STATUS` and `ENSURE_AFF_BRIDGE_READY` message handlers (and unified `OPEN_BACKGROUND_AFF_BRIDGE_TAB`).
- **Live Bridge Status Strip & Pre-Flight Feedback (`sidepanel.html`, `sidepanel.js`, `src/styles/sidepanel.css`)**:
  - Added `#drb-spy-aff-bridge` banner and `#drb-spy-btn-wake-aff` button displaying live state (`ready`, `sleeping`, `missing`, `security`), plus `ensureSpyAffBridgeReadyWithFeedback()` wired into `runSpyReelCollector()`, `rerunSingleSpyRow()`, and `rerunFailedSpyRows()`.

### Verification Results
- `node tools/verify_sidepanel_dom.cjs` — PASSED (`All 113 HTML IDs verified`).
- `node tools/verify_social_commission.cjs` — PASSED (direct parity `58.40`, `136.30`, `90.37`).
- `node --check` on `background.js`, `sidepanel.js`, `src/shopee-affiliate.js`, `src/shopee-hud.js`, `src/common/utils.js` — all exited 0.



## 📋 Files Changed This Session
| File | What Changed | Scope |
|---|---|---|
| `rBank-AFF-Toolkit/background.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/popup.html` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/sidepanel.html` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/sidepanel.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/src/common/utils.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/src/shopee-affiliate.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/src/shopee-hud.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/src/styles/sidepanel.css` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/tools/verify_social_commission.cjs` | Auto-detected session change | Core Repository |

## 🔬 Timeline & Debugging Log
- 09:51 — Audited `sidepanel.js`, `background.js`, and `src/shopee-affiliate.js`; identified Tier 2 65-char keyword misses and skipped DOM fallback on base-only API responses as causes of intermittent `EXTRACOMM` 0%.
- 09:57 — Aligned on removing 3% WHT and 107฿ VAT adjustment so displayed baht amounts match `affiliate.shopee.co.th` directly using 100฿ daily ad budget.
- 10:02–10:09 — Implemented per-row/batch retry UI, API/DOM hardening, and direct commission parity across 9 files; verified all DOM, commission, and syntax checks.
- 10:34–10:39 — Implemented v2.13.0 version bump + sleeping AFF tab auto-detect, on-demand auto-wake (`wakeAffTabIfSleeping`), and Spy Collector live bridge status banner (`#drb-spy-aff-bridge`); verified 113 DOM IDs and all checks.

## 🔗 GBRAIN Backlinks
- **2026-11-18** | [sidepanel.js](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/sidepanel.js) -- Spy Reel Collector per-row & 0% batch retry controllers + direct commission hero rendering
- **2026-11-18** | [shopee-affiliate.js](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/src/shopee-affiliate.js) -- Hardened Tier 2 keyword candidates + V1 row `🔄` recheck
- **2026-11-18** | [utils.js](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/src/common/utils.js) -- Zero-tax `calculateCommission` & 100฿ `evaluateAdViability`


## 📦 RAW ARTIFACT BACKUP (Iron Rule)
> Auto-generated by qs-compiler.js — No standalone brain artifacts detected for this session.
> Context is fully captured in the compiled implementation notes and git diff log above.
