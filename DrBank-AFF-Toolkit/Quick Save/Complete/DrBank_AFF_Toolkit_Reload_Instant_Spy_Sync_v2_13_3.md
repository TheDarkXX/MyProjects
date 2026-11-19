---
version: "2.13.3"
type: impl
status: complete
outcome: shipped
date: 2026-11-19
aliases: [drbank-aff-toolkit, reload-ext, spy-collector, instant-sync]
conversation: "0507466b-c3ff-40bb-9521-09d0873524ae"
summary: >
  Upgrade DrBank AFF Toolkit to v2.13.3 with 1-click UI Extension Reload (Side Panel + Popup), live Pool Queue Refresh button on affiliate.shopee.co.th without killing the Service Worker, silent-error-swallowing fixes + localhost:3000 fallback cleanup, and Per-Card Instant Spy Collector Sync with truthful serverSynced badges and 1-click unsent-row upload.
---
# DrBank AFF Toolkit v2.13.3 — UI Reload, Live Queue Refresh & Per-Card Instant Spy Sync

## 📌 Context & Implementation (Compiled Truth)

- **1-Click UI Reload & Live Pool Queue Refresh:**
  - Added `RELOAD_EXTENSION` handler in `background.js` that checks `inFlightOfferFetches.size > 0` before calling `chrome.runtime.reload()` so active commission fetches are never aborted mid-flight.
  - Added `♻️` reload buttons in `sidepanel.html` (`#drb-sp-btn-reload-ext` in sticky header + `#drb-sp-btn-reload-ext-tool` in Tools fold) and `popup.html` (`#popup-reload-ext-btn` in `.app-header`), wired via `triggerExtensionReload()` in `sidepanel.js` (also guards `spyCollectRunning || spyBatchRetryRunning`) and `popup.js`.
  - Added `🔄 เช็กคิวใหม่` (`#drb-pool-btn-refresh-queue`) on `#drb-pool-bridge-bar` in `src/shopee-affiliate.js`, extracting `refreshPoolBridgeBannerStatus(bar, { manual })` so pending queue counts (`FETCH_POOL_PENDING`) update live without reloading the extension.
  - Added `#drb-sp-btn-refresh-pool` (`refreshPoolPendingFromSidePanel()`) in `sidepanel.js` + `REFRESH_POOL_BRIDGE_STATUS` listener in `src/shopee-affiliate.js` to sync open `affiliate.shopee.co.th` banners from the Side Panel.
- **Spy Commit Hardening & Version Bump (`v2.13.3`):**
  - Audited live `https://aff.doctorbankonline.com/api/aff/bootstrap` and `/api/shopee-aff/spy-logs`: confirmed `gateVersion: "v2.13.2"` is live with 6 active Spy Pool items and `0` rows in `aff_spy_collect_logs` on VPS (11 historical rows were local-only in `C:\XBrain\data\aff.db`).
  - Removed silent `.catch(() => {})` error swallowing in `rerunSingleSpyRow()` and `rerunFailedSpyRows()` in `sidepanel.js`; enforced `if (!commitRes || commitRes.ok === false) throw ...` in `ensureSpyRowsShortLinksAndSave()`.
  - Added `postWebUiJson()` helper in `background.js` with `AbortController` timeouts (25s for `SPY_COLLECT_REELS`, 20s for `SPY_COMMIT_REELS`) and automatic `http://localhost:3000` -> `https://aff.doctorbankonline.com` normalization.
  - Replaced stale `http://localhost:3000` fallbacks in `popup.js`, `popup.html`, and `src/shopee-hud.js` with `https://aff.doctorbankonline.com`, and bumped `manifest.json`, `sidepanel.html`, and `popup.html` to `v2.13.3`.
- **Per-Card Instant Spy Sync & Truthful Status UI:**
  - Refactored `runSpyReelCollector()` in `sidepanel.js` to execute `ensureSpyRowsShortLinksAndSave([row])` immediately after each card completes Stage 2 rate checking, preventing batch-wide loss if a later card hits Shopee `securityCheck`.
  - Added `serverSynced`, `serverSyncError`, and `serverSyncedAt` state tracking on Spy Collector items so `renderSpyCollectorResults()` only shows green `🟢 ☁️ ขึ้นเว็บ Spy Pool แล้ว!` or `🔴 ... — 🗂️ บันทึก Reject Log บนเว็บแล้ว` when confirmed by the server, and amber warning states (`data-gate="notag"`) when checked locally but unsynced.
  - Added 1-click `☁️ ส่งขึ้นเว็บทันที (N)` (`#drb-spy-btn-sync-unsent` -> `syncUnsentSpyRowsToServer()`) and per-card `.spy-sync-row-btn` (`syncSingleSpyRowToServer(idx)`) using `isSpyRowReadyToSync(r)` to upload cached cards without re-scraping Shopee.
- **Verification Results:**
  - `node --check` passed on `sidepanel.js`, `background.js`, `popup.js`, `src/shopee-affiliate.js`, and `src/shopee-hud.js` (`SYNTAX_ALL_OK`).
  - `node tools/verify_sidepanel_dom.cjs` passed (`All 117 HTML IDs verified`).
  - `node tools/verify_social_commission.cjs` passed all assertions.
  - `curl.exe` live check on `https://aff.doctorbankonline.com/api/aff/gate-config` confirmed `v2.13.2` active.
  - `git status --short` verified clean scoped changes across `DrBank-AFF-Toolkit/` only.



## 📋 Files Changed This Session
| File | What Changed | Scope |
|---|---|---|
| `rBank-AFF-Toolkit/background.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/manifest.json` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/popup.html` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/popup.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/sidepanel.html` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/sidepanel.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/src/shopee-affiliate.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/src/shopee-hud.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/src/styles/sidepanel.css` | Auto-detected session change | Core Repository |

## 🔬 Timeline & Debugging Log
- 08:51 — Investigated extension reload vs server queue refresh workflow (`FETCH_POOL_PENDING` vs `chrome.runtime.reload()`).
- 09:57 — Implemented Option 1: UI Reload Extension buttons + `🔄 เช็กคิวใหม่` Pool Bridge & Side Panel refresh.
- 10:00 — Audited live VPS `https://aff.doctorbankonline.com` (`/api/aff/bootstrap` & `/api/shopee-aff/spy-logs`), found `spyLogs: []`, identified stale `v2.13.1` extension + `.catch(() => {})` error swallowing + `localhost:3000` fallbacks, and shipped `v2.13.3` hardening.
- 11:08 — Upgraded Spy Collector to Per-Card Instant Sync, truthful `serverSynced` badges, and 1-click `☁️ ส่งขึ้นเว็บทันที` buttons; verified `node --check`, `verify_sidepanel_dom.cjs` (117 IDs), and `verify_social_commission.cjs`.

## 🔗 GBRAIN Backlinks
- **2026-11-19** | [DrBank_AFF_Spy_Gate_Log_Hardening_v2_13_2.md](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/Quick%20Save/Complete/DrBank_AFF_Spy_Gate_Log_Hardening_v2_13_2.md) -- Prior Spy Gate & Audit Log implementation


## 📦 RAW ARTIFACT BACKUP (Iron Rule)
> Auto-generated by qs-compiler.js — No standalone brain artifacts detected for this session.
> Context is fully captured in the compiled implementation notes and git diff log above.
