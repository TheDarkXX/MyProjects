---
version: "2.6.3"
type: impl
status: complete
outcome: shipped
date: 2026-11-12
aliases: [drbank-aff-toolkit-v2, shopee-affiliate-grid-radar, shopee-category-comm-matrix]
conversation: "8f5d3503-30ff-48d0-a5c1-bd7ce48ed149"
summary: >
  Shipped DrBank AFF Scout v2.6.3 Chrome Extension: Complete overhaul to Lean Side Panel (Tab 1 Shopee vs Tab 2 Affiliate Offer),
  Affiliate Offer Grid Traffic Light Radar (compact top-right pill + hover popover), Shopee Search/Category Smart Commission Matrix (Categories A-F),
  1-Click AFF Offer bridge, Default Signal-Only card view with zero DOM distortion, and robust leaf-node DOM price extraction immune to display:none bugs.
---
# DrBank AFF Scout v2.6.3: Dual-Tab Side Panel, Affiliate Grid Radar & Shopee Category Matrix

## 📌 Context & Implementation (Compiled Truth)
- **Architecture Shift:** Upgraded from intrusive overlay to dual-mode Lean Side Panel (`sidepanel.html` + `sidepanel.js`) with complete tab isolation between `shopee.co.th` and `affiliate.shopee.co.th`.
- **Affiliate Offer Grid Radar (`affiliate.shopee.co.th/offer/product_offer`):** Injected floating top-right Corner Signal Pill (`position: absolute; top: 6px; right: 6px;`) showing compact emoji + net commission (`🔥 ฿89.5`, `✅ ฿51.6`, `⚠️ ฿27.7`, `⛔ ฿15.1`) with full details in Hover Popover Tooltip (`💰 คอมสุทธิ`, `🎯 คุ้มแอด 107฿`, `📦 ยอดขาย`, and `[⚡ ดึงเข้า Side Panel & Web UI]`).
- **Shopee Search / Category Commission Matrix (`shopee.co.th`):** Implemented `CATEGORY_COMM_DB` in `src/common/utils.js` classifying products into 6 standard categories (A: Beauty & Health ~15.5%, B: Fashion ~13.5%, C: Home & Living ~11.5%, D: Small Appliances/Cameras/Tools ~9.5%, E: IT/Mobiles ~3.0%, F: General Default ~10.5%).
- **1-Click AFF Offer Bridge:** Direct navigation button jumping from `shopee.co.th` product/card directly to its `affiliate.shopee.co.th/offer/product_offer/<itemId>` detail page to check real EXTRACOMM table.
- **Top Radar Toolbar & Clean Defaults:** Added `DrBank Category Radar` toolbar atop search results with power toggle (`🟢 เรดาร์: เปิด/ปิด`), rate selector dropdown (Auto / 10% / 15% / 20% / Base-only), and `🔄 ค่าเริ่มต้น: โชว์เฉพาะป้าย` keeping cards 100% natural and bright by default.
- **Critical Display:None Bug Autopsy (`v2.6.3`):** Replaced all `innerText` scans on grid cards with `extractShopeeCardDOMInfo()` extracting leaf nodes with strict newline separators and locking `data-drb-locked-price`. Prevents Chromium from concatenating hidden card prices and ratings (e.g. `฿392` + `5.0` => `฿3925.0`) when filtering for winning items.
- **Synced Destinations:** Master source at `DrBank-AFF-Toolkit/` safely synced to `O:\Program\My Extension\DrBank_AFF_Studio_v2_DEV` and `O:\Program\My Extension\DrBank_AFF_Studio`.

## 🔬 Timeline & Debugging Log
- 13:40 — User initiated UI cleanup and Break-even 107฿ ad cost prominence.
- 14:15 — Implemented Chrome Side Panel dual-tab architecture (Tab 1 Shopee vs Tab 2 Affiliate Offer).
- 14:50 — Built Affiliate Grid Radar (`v2.5.0` -> `v2.5.1`) with compact corner pill and hover popover.
- 16:00 — Updated toolbar badges to standard traffic light emojis (`🔥✅`, `⚠️`, `⛔`).
- 16:15 — Designed and implemented Smart Category Commission Matrix A-F for `shopee.co.th` with 1-Click AFF bridge (`v2.6.0`).
- 16:25 — Added Top Bar Menu on Shopee search grid, Radar ON/OFF toggle, and Default Signal-Only view (`v2.6.1`).
- 16:32 — Fixed camera/YOOSEE regex collision with beauty category ("เฝ้าดู" vs "ฝ้า") and locked discounted selling price (`v2.6.2`).
- 16:45 — Resolved Chromium `display:none` string concatenation bug via separate leaf-node DOM extractor and per-card price locking (`v2.6.3`).
- 18:25 — User verified and confirmed rock-solid stability ("รอบนี้นิ่งสนิทละ").

