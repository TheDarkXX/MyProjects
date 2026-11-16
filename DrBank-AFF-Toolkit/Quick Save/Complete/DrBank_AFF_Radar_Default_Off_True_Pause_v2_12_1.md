---
version: "2.12.1"
type: impl
status: complete
outcome: shipped
date: 2026-11-16
aliases: [shopee-radar, default-off, true-pause, drbank-aff-toolkit]
conversation: "51af684f-4b2d-42fc-a8d0-56cc6cc8fb98"
summary: >
  Changed Shopee listing/grid radar in DrBank AFF Toolkit to Default OFF with True Pause so DOM scanning, card overlays, MutationObserver triggers, and background cache hydration do not run unless explicitly enabled by the user.
---
# Shopee Listing Radar Default OFF & True Pause

## 📌 Context & Implementation (Compiled Truth)
- **Root Cause & Risk Audit:**
  - Before this change, `shopeeGridState.enabled` in `src/shopee-hud.js` defaulted to `true` and persisted `radarEnabled` from `chrome.storage.local` across sessions.
  - Even when the user clicked **"⚪ เรดาร์: ปิด"**, `scanAndOverlayShopeeGrid()` and the `document.body` `MutationObserver` kept running continuously on every DOM update.
  - While scroll/hover API auto-prefetch was already disabled, the content script still scraped all product links and prices, mutated every card element with `data-drb-*` attributes, injected `.drb-aff-card-overlay` DOM nodes, and called `GET_CACHED_REAL_OFFERS` — only hiding the UI visually via CSS class `.drb-aff-radar-off`.
  - Keeping continuous DOM scraping/injection active during normal Shopee browsing introduces unnecessary extension-detection surface and background CPU overhead.
- **Architectural Changes (Before vs. After):**
  - **Default State (`src/shopee-hud.js`):** Changed `shopeeGridState.enabled` initial value to `false` and removed `chrome.storage.local.get(['radarEnabled'])` restoration in `initShopeeHUD()` so listing pages always start in safe standby mode.
  - **URL Navigation Reset (`MutationObserver`):** Whenever `location.href !== lastUrl` on non-product pages, `shopeeGridState.enabled` resets to `false`, `drb-aff-radar-off` is added, `cleanupShopeeGridOverlays()` strips previous overlays/state, and `#drb-aff-grid-toolbar` is re-mounted cleanly.
  - **True Pause Guard:**
    - `scanAndOverlayShopeeGrid()` now immediately returns `0` when `!shopeeGridState.enabled`, only calling `findFirstShopeeGridContainer()` + `renderOrUpdateShopeeGridToolbar(container)` to mount the standby bar.
    - `MutationObserver` returns early without scheduling any scan whenever `!isSingleProductUrl() && !shopeeGridState.enabled` and `#drb-aff-grid-toolbar` is already mounted.
  - **Clean Teardown (`cleanupShopeeGridOverlays()`):** Clicking toggle OFF clears `gridAutoQueue`, `gridAutoQueuedIds`, `gridLoadingIds`, `cardDwellTimers`, and `gridCardElByItemId`, removes all `.drb-aff-card-overlay` elements, strips `.drb-aff-grid-card*` classes and `data-drb-sig` / `data-drb-tier` / `data-drb-est-net` attributes, and resets `shopeeGridState.counts`.
  - **Standby Toolbar UI (`renderOrUpdateShopeeGridToolbar()`):** When OFF, hides `realCheckBtnHtml`, rate mode `<select>`, and filter buttons; displays `⚪ เรดาร์: ปิด (คลิกเพื่อเปิดสแกน)` alongside the safety mode notice.
  - **Side Panel Sync (`src/shopee-hud.js` & `sidepanel.js`):**
    - `GET_SCRAPED_PRODUCT` returns `radarEnabled: shopeeGridState.enabled` and activates scanning on-demand if `req.forceRefresh` is true.
    - `sidepanel.js` displays `⚪ เรดาร์หน้ารวมสินค้าปิดอยู่ (โหมดปลอดภัย) — กดปุ่มเปิดสแกนบนหน้าเว็บ หรือกด ↻ ด้านบนเมื่อต้องการใช้งาน` when `response.radarEnabled === false`.
  - **Single Product Pages (`isSingleProductUrl()`):** Left active automatically as intended, since users explicitly open single SKU pages to inspect affiliate economics.
- **Verification Results:**
  - `node --check src/shopee-hud.js` & `node --check sidepanel.js`: exit 0.
  - `node tools/verify_sidepanel_dom.cjs`: 109 HTML IDs verified (0 missing references).
  - `node tools/verify_social_commission.cjs`: all commission & parser assertions passed.



## 📋 Files Changed This Session
| File | What Changed | Scope |
|---|---|---|
| `rBank-AFF-Toolkit/sidepanel.js` | Auto-detected session change | Core Repository |
| `DrBank-AFF-Toolkit/src/shopee-hud.js` | Auto-detected session change | Core Repository |

## 🔬 Timeline & Debugging Log
- 16:40 — Audited `src/shopee-hud.js` and confirmed auto-prefetch on scroll/hover was already disabled, but DOM scraping/injection and `MutationObserver` still ran continuously even when radar was toggled OFF.
- 16:44 — Implemented Default OFF, `cleanupShopeeGridOverlays()`, `findFirstShopeeGridContainer()`, True Pause guard in `MutationObserver`, and Side Panel standby sync in `src/shopee-hud.js` and `sidepanel.js`.
- 16:48 — Passed syntax checks (`node --check`), `verify_sidepanel_dom.cjs`, and `verify_social_commission.cjs`.

## 🔗 GBRAIN Backlinks
- **2026-11-16** | [shopee-hud.js](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/src/shopee-hud.js) -- Default OFF & True Pause grid radar logic
- **2026-11-16** | [sidepanel.js](file:///C:/My%20Claw/MyProjects/DrBank-AFF-Toolkit/sidepanel.js) -- Side Panel standby message when listing radar is OFF


## 📦 RAW ARTIFACT BACKUP (Iron Rule)
> Auto-generated by qs-compiler.js — No standalone brain artifacts detected for this session.
> Context is fully captured in the compiled implementation notes and git diff log above.
