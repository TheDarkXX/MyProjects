---
version: "2.14.0"
type: impl
status: complete
outcome: shipped
date: 2026-11-24
aliases: [drbank-aff-toolkit, auto-pull, shopee-commission, report-ingest, aff-db, pubilo-clone]
conversation: "6c4991f1-e088-440b-9a88-096fba957614"
summary: >
  Implemented Auto-Pull Shopee Affiliate commission, orders, clicks, and daily summaries into aff.db via DrBank AFF Scout v2.14.0 (passive MAIN-world XHR/Fetch interceptor + auto-paginating replay up to 25 pages + Ant-Design DOM fallback + 30-min chrome.alarms sync + Side Panel UI) paired with Zero-Overwrite Cross-Source Dedup Guard on XBrain apps/aff/index.js. Verified live sync of 1,493 clicks across 15 pages into aff.db on VPS.
---
# DrBank AFF Toolkit v2.14.0 — Auto-Pull Shopee Commission & Clicks into aff.db

## 📌 Context & Implementation (Compiled Truth)

- **Origin & Motivation:** Reverse-engineered `pubilo.com` (`/clone`), identified their Extension-bridged Shopee Affiliate auto-income sync, and built a superior Zero-Overwrite Auto-Pull pipeline directly into `DrBank AFF Scout v2.14.0` + `aff.db` (`https://aff.doctorbankonline.com`).
- **Extension Changes (`C:\My Claw\MyProjects\DrBank-AFF-Toolkit`, v2.14.0):**
  - `manifest.json`: Bumped to `v2.14.0`, added `"alarms"` permission for 30-minute background Auto-Pull.
  - `src/page-main-bridge.js`: Added passive `MAIN`-world XHR & Fetch interceptor (`isReportApiUrl`) capturing `method`, `url`, and `reqBody` for `/report`, `/dashboard`, `/conversion`, `/click`, `/order`, `/gql`, `/performance`, `/commission`, emitting `DRB_AFF_REPORT_INTERCEPTED`.
  - `src/shopee-affiliate.js`:
    - Added `interceptedReportBucket` (`conversions`, `clicks`, `daily`, `capturedRequests`) + `normalizeShopeeMoney` (handles micro-currency `1e5` scaling) + `normalizeShopeeTimestamp` (UTC+7) + `extractSubIdsFromRecord`.
    - Added `PULL_SHOPEE_REPORTS` handler: Step 1 auto-paginates captured real API requests (pages 2..25 with 250ms pacing), Step 2 probes internal `/api/v3/` endpoints, Step 3 falls back to Ant-Design DOM table parsing (`รายงานคำสั่งซื้อ` & `รายงานคลิก`).
    - Added debounced `scheduleAutoPushInterceptedReport()` for passive auto-sync when browsing Shopee Affiliate report pages.
  - `background.js`: Upgraded `PUSH_REPORT_TO_WEBUI` for 3-table payload (`conversions`, `clicks`, `daily`, `accountLabel`), added `AUTO_PULL_COMMISSION_NOW`, `GET_REPORT_SYNC_STATE`, `SET_AUTO_PULL_SETTINGS`, and `chrome.alarms` (`drb_auto_pull_commission`, default 30 min).
  - `sidepanel.html` & `sidepanel.js`: Added `💰 Auto-Pull ยอดคอม ➔ aff.db` panel with Auto-Pull toggle, multi-account selector (`DRB` / `Namcha` / `Ashira`), live `aff.db` totals badge, `⚡ ดูดยอดคอม ➔ aff.db ตอนนี้`, and `📊 หน้า Report ↗`.
- **Server & Database Guard (`C:\My Claw\Openclaw-VPS\apps\aff\index.js`, Commit `9e1db96a`, deployed to VPS):**
  - Upgraded `POST /api/shopee-aff/report-ingest` to upsert all 3 tables (`aff_conversions`, `aff_clicks`, `aff_platform_daily`) with **Zero-Overwrite & Cross-Source Dedup Guard** (`findExistingConv` by `order_id + item_id + model_id` + `INSERT OR IGNORE` + `MAX()` on daily metrics + `dryRun` support), ensuring manual CSV uploads are never overwritten or double-counted.
  - Added `GET /api/shopee-aff/report-sync-status` returning live `aff.db` conversion, click, daily, and top `sub_id2` counts.
- **Verification (Live Production):**
  - `node --check` passed on `apps/aff/index.js`, `background.js`, `src/page-main-bridge.js`, `src/shopee-affiliate.js`, `sidepanel.js`.
  - `node tools/verify_sidepanel_dom.cjs` passed (`All 124 HTML IDs verified`).
  - Live test on `affiliate.shopee.co.th` Click Report (15 pages, 100/page) pushed and verified via `GET https://aff.doctorbankonline.com/api/shopee-aff/report-sync-status`: `aff_clicks` updated from `3` ➔ `1,493` clicks while `aff_conversions` remained untouched at `12` orders (Zero-Overwrite verified).

## 📋 Files Changed This Session
| File | What Changed | Scope |
|---|---|---|
| `DrBank-AFF-Toolkit/manifest.json` | Bump v2.14.0 + `alarms` permission | Extension |
| `DrBank-AFF-Toolkit/src/page-main-bridge.js` | MAIN-world XHR/Fetch report & request capture | Extension |
| `DrBank-AFF-Toolkit/src/shopee-affiliate.js` | Normalizer, auto-paginator (pages 2..25), DOM fallback | Extension |
| `DrBank-AFF-Toolkit/background.js` | `AUTO_PULL_COMMISSION_NOW`, `alarms`, 3-table push | Extension |
| `DrBank-AFF-Toolkit/sidepanel.html` | Auto-Pull UI card + account selector | Extension |
| `DrBank-AFF-Toolkit/sidepanel.js` | Auto-Pull UI controls & status hydration | Extension |
| `Openclaw-VPS/apps/aff/index.js` | 3-table `report-ingest` + dedup guard + `report-sync-status` | XBrain Backend |

## 🔬 Timeline & Debugging Log
- 23:06 — Audited `aff.db` schema (`aff_conversions`, `aff_clicks`, `aff_platform_daily`) and `DrBank-AFF-Toolkit` architecture.
- 23:12 — Built 3-table `report-ingest`, MAIN-world interceptor, background alarms, and Side Panel UI (`124/124 IDs` verified).
- 23:21 — Added Zero-Overwrite Cross-Source Dedup Guard matching CSV rows by `order_id + item_id + model_id` and deployed `9e1db96a` to VPS (`brain-app` Zero-Downtime reload).
- 00:07 — Fixed `handleMessage({ action, payload })` call signature bug in `runAutoPullCommissionNow()`.
- 00:15 — Added captured-request replay auto-pagination (pages 2..25) + Ant-Design DOM fallback; verified live pull of `1,493` clicks across 15 pages into `aff.db`.

## 🔗 GBRAIN Backlinks
- **2026-11-19** | [DrBank_AFF_Toolkit_Spy_Views_Page_Fix_v2_13_4.md](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/Quick%20Save/Complete/DrBank_AFF_Toolkit_Spy_Views_Page_Fix_v2_13_4.md) -- Prior v2.13.4 release
- **2026-11-23** | [17_PUBILO_Meta_AI_Master_Prompts_And_Architecture.md](file:///C:/My%20Claw/ShopeeAff/rules/17_PUBILO_Meta_AI_Master_Prompts_And_Architecture.md) -- PUBILO teardown & Meta AI prompt archive
