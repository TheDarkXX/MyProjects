/**
 * DrBank AFF Scout v2.1.0 — Shopee Winning SKU Hunter HUD (High-Contrast Traffic Light Edition)
 * Features:
 *  - High-Contrast 3 Checklist Badges (Single-Line Locked: Sold | Extra Comm | Rating & Origin)
 *  - Collapsible 5-Line Product Spec & Description Box with Scrollbar + Expand/Fold buttons
 *  - Vivid 4-Tier Traffic-Light Commission Card & Solid Break-Even Banner (100฿/Day, Direct AFF Match)
 *  - One-Click Hero Button: Push Full SKU + HD Photos + Spec to Web UI Command Center
 */

(function () {
  const ns = window.DrBankAFF;
  if (!ns) return;

  let currentState = {
    settings: {},
    title: '',
    specText: '',
    originalPrice: 0,
    price: 0,
    priceMax: 0,
    baseRate: 3.5,
    extraRate: 10.0,
    capTHB: 250,
    whtRate: 0.0,
    realDailyAdCostTHB: 100,
    soldCount: 0,
    soldText: '',
    rating: 4.9,
    shipFrom: 'ส่งในไทย',
    isOverseas: false,
    imagesHD: [],
    theme: 'light',
    variants: [],
    shopId: '',
    itemId: '',
    cleanUrl: '',
    offerPrice: 0,
    realRateVerified: false,
    realRateItemId: '',
    realRateLoading: false,
    realRateError: '',
    realRateSecurityCheck: false,
    liveExtraRate: 0,
    liveBaseRate: 0
  };
  let lastAutoFetchedOfferItemId = '';

  let shopeeGridState = {
    enabled: false, // Default OFF on listing pages for safety & zero background DOM/CPU overhead
    mode: 'all', // 'all' | 'win' | 'warn'
    rateMode: 'auto', // 'auto' | '15' | '10' | '20' | 'base_only'
    dimDanger: false, // Default: show ONLY Signal Pill, leave cards 100% normal
    hideDanger: false,
    counts: { total: 0, win: 0, warn: 0, danger: 0, realCount: 0, candidateCount: 0 }
  };

  // Option B: Hybrid 3-Layer Real Social Media Commission State
  const MAX_AUTO_CHECKS_PER_PAGE = 12;
  const gridRealCache = new Map();
  const gridLoadingIds = new Set();
  const gridAutoQueue = [];
  const gridAutoQueuedIds = new Set();
  const gridPopIds = new Set();
  const gridCardElByItemId = new Map();
  const cardDwellTimers = new Map();
  let gridAutoCheckedCountThisPage = 0;
  let gridQueueWorkerRunning = false;
  let gridCircuitTripped = false;
  let gridNeedAffTab = false;
  let gridHourlyQuotaReached = false;
  let gridCacheHydrationInFlight = false;
  let gridViewportObserver = null;

  function escHtmlGrid(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isSingleProductUrl(url = location.href) {
    return /-i\.\d+\.\d+|\/product\/\d+\/\d+/i.test(url);
  }

  async function initShopeeHUD() {
    try {
      const store = await ns.sendMessage('GET_STATE');
      const s = store.settings || {};
      currentState.settings = s;
      currentState.baseRate = Number(s.shopeeBaseRate) || 3.5;
      currentState.extraRate = Number(s.shopeeExtraRate) ?? 10.0;
      currentState.capTHB = Number(s.shopeeCapTHB) || 250;
      currentState.whtRate = 0.0;
      currentState.realDailyAdCostTHB = 100;
      currentState.theme = s.theme || 'light';
      currentState.displayMode = s.displayMode || 'sidepanel';
      // Default OFF on Shopee listing pages for safety & zero background DOM/CPU overhead
      shopeeGridState.enabled = false;
      document.body.classList.toggle('drb-aff-radar-off', !shopeeGridState.enabled);
    } catch (_e) {}

    if (isSingleProductUrl()) {
      scrapeShopeeProductDOM();
      fetchRealSocialCommissionForCurrentProduct(false);
    } else {
      scanAndOverlayShopeeGrid();
    }
    renderHUD();
    applyDisplayMode();

    // Listen for messages from Side Panel
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
        if (req.action === 'GET_SCRAPED_PRODUCT') {
          if (isSingleProductUrl()) {
            scrapeShopeeProductDOM();
            if (req.forceRefresh || !currentState.realRateVerified || currentState.realRateItemId !== currentState.itemId) {
              fetchRealSocialCommissionForCurrentProduct(Boolean(req.forceRefresh));
            }
          } else {
            if (req.forceRefresh && !shopeeGridState.enabled) {
              shopeeGridState.enabled = true;
              document.body.classList.remove('drb-aff-radar-off');
            }
            scanAndOverlayShopeeGrid();
          }
          sendResponse({
            ok: true,
            isGridPage: !isSingleProductUrl(),
            radarEnabled: shopeeGridState.enabled,
            gridCounts: shopeeGridState.counts,
            data: currentState
          });
          return true;
        }
        if (req.action === 'SET_DISPLAY_MODE') {
          currentState.displayMode = req.mode;
          applyDisplayMode();
          sendResponse({ ok: true });
          return true;
        }
        if (req.action === 'SET_THEME') {
          currentState.theme = req.theme;
          const hudRoot = document.getElementById('drb-aff-hud-root');
          const tBtn = document.getElementById('drb-btn-theme');
          ns.applyTheme(hudRoot, currentState.theme, tBtn);
          sendResponse({ ok: true });
          return true;
        }
        if (req.action === 'SELECT_VARIANT') {
          const vName = req.variantName;
          document.querySelectorAll('button').forEach((b) => {
            if ((b.textContent || '').trim() === vName) b.click();
          });
          setTimeout(() => {
            scrapeShopeeProductDOM();
            updateHUDValues();
            sendResponse({ ok: true, data: currentState });
          }, 350);
          return true;
        }
      });
    }

    let lastUrl = location.href;
    let lastStorageSyncSig = '';
    let gridTimer = null;
    const scheduleShopeeScan = () => {
      if (gridTimer) clearTimeout(gridTimer);
      gridTimer = setTimeout(() => {
        if (isSingleProductUrl()) {
          const oldTb = document.getElementById('drb-aff-grid-toolbar');
          if (oldTb) oldTb.remove();
          scrapeShopeeProductDOM();
          updateHUDValues();
          const sig = `${currentState.itemId}_${currentState.price}_${currentState.baseRate}_${currentState.extraRate}_${currentState.realRateVerified}`;
          if (currentState.itemId && sig !== lastStorageSyncSig) {
            lastStorageSyncSig = sig;
            chrome.storage.local.set({ activeShopeeGridProduct: { ...currentState } }).catch(() => {});
          }
          fetchRealSocialCommissionForCurrentProduct(false);
        }
        scanAndOverlayShopeeGrid();
      }, 650);
    };

    const observer = new MutationObserver((mutations) => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        gridAutoCheckedCountThisPage = 0;
        if (!isSingleProductUrl() && shopeeGridState.enabled) {
          shopeeGridState.enabled = false;
          document.body.classList.add('drb-aff-radar-off');
        }
        cleanupShopeeGridOverlays();
        const oldTb = document.getElementById('drb-aff-grid-toolbar');
        if (oldTb) oldTb.remove();
        scheduleShopeeScan();
        return;
      }
      // True Pause: when on a listing page with radar OFF and standby toolbar already mounted, ignore all DOM mutations
      if (!isSingleProductUrl() && !shopeeGridState.enabled && document.getElementById('drb-aff-grid-toolbar')) {
        return;
      }
      for (const m of mutations) {
        if (
          m.target &&
          m.target.nodeType === 1 &&
          !m.target.closest?.('.drb-aff-card-overlay, #drb-aff-grid-toolbar, #drb-aff-hud-root')
        ) {
          scheduleShopeeScan();
          break;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(scheduleShopeeScan, 1200);
    setTimeout(scheduleShopeeScan, 2600);
  }

  // ==========================================================================
  // SHOPEE SEARCH / CATEGORY / MALL GRID — SMART CATEGORY SIGNAL RADAR
  // ==========================================================================
  function getPageSearchContext() {
    try {
      const u = new URL(location.href);
      const kw = u.searchParams.get('keyword') || '';
      const h1 = document.querySelector('h1')?.textContent || '';
      return `${kw} ${h1}`.trim();
    } catch (_e) {
      return '';
    }
  }

  function extractShopeeCardDOMInfo(linkEl) {
    const leafLines = [];
    let domSellingPrice = 0;

    // Walk all elements inside linkEl, completely ignoring our overlay and crossed-out prices
    const allEls = linkEl.querySelectorAll('*');
    allEls.forEach((el) => {
      if (el.closest('.drb-aff-card-overlay, del, s, [class*="line-through"]')) return;

      // Check direct text of leaf nodes (or nodes with only text children)
      if (el.children.length === 0) {
        const t = (el.textContent || '').trim();
        if (!t) return;
        leafLines.push(t);

        // Pattern A: <span>฿</span> followed immediately by sibling <span>392</span>
        if (!domSellingPrice && t === '฿' && el.nextElementSibling) {
          const nextTxt = (el.nextElementSibling.textContent || '').trim();
          if (/^[0-9,]+(?:\.[0-9]{2})?$/.test(nextTxt)) {
            const pVal = ns.parsePriceNumber(nextTxt);
            if (pVal > 0 && pVal < 500000) domSellingPrice = pVal;
          }
        }

        // Pattern B: Single leaf node containing "฿392" or "฿1,290.00" (never 1-decimal star rating)
        if (!domSellingPrice && /^฿\s*([0-9,]+(?:\.[0-9]{2})?)$/.test(t)) {
          const pVal = ns.parsePriceNumber(t);
          if (pVal > 0 && pVal < 500000) domSellingPrice = pVal;
        }
      }
    });

    // Always join leaf nodes with newline so display:none NEVER concatenates "392" + "5.0" into "3925.0"!
    const separatedText = leafLines.join('\n');

    if (!domSellingPrice) {
      const cleanPriceText = separatedText.replace(
        /(?:ส่วนลด|ลด|ขั้นต่ำ|คืนสูงสุด)\s*\n?\s*฿\s*\n?\s*[0-9,]+/gi,
        ''
      );
      const m = cleanPriceText.match(/฿\s*\n?\s*([0-9,]+(?:\.[0-9]{2})?)(?!\.[0-9])/);
      if (m && m[1]) {
        domSellingPrice = ns.parsePriceNumber(m[1]);
      }
    }

    return { separatedText, leafLines, domSellingPrice };
  }

  async function hydrateGridCacheFromBackground(uncachedIds) {
    if (gridCacheHydrationInFlight || !Array.isArray(uncachedIds) || uncachedIds.length === 0) return;
    gridCacheHydrationInFlight = true;
    try {
      const res = await ns.sendMessage('GET_CACHED_REAL_OFFERS', { itemIds: uncachedIds });
      if (!res) return;
      gridCircuitTripped = Boolean(res.circuitBreaker?.tripped);
      gridNeedAffTab = Number(res.openAffTabCount || 0) === 0;
      const entries = Object.entries(res.cached || {});
      if (entries.length > 0) {
        entries.forEach(([id, offer]) => {
          if (offer) gridRealCache.set(id, offer);
        });
        scanAndOverlayShopeeGrid();
      } else {
        renderOrUpdateShopeeGridToolbar(null);
      }
    } catch (_e) {
    } finally {
      gridCacheHydrationInFlight = false;
    }
  }

  function ensureGridViewportObserver() {
    // Auto-prefetch on scroll is disabled to prevent cross-tab API contention & Shopee verify/traffic triggers.
    // Real rates are loaded from 24h storage cache (0 API calls) or when the user explicitly clicks a check button.
    return null;
  }

  function enqueueGridAutoItem(item) {
    if (!item || !item.itemId) return;
    if (gridRealCache.has(item.itemId) || gridLoadingIds.has(item.itemId) || gridAutoQueuedIds.has(item.itemId)) {
      return;
    }
    if (gridAutoCheckedCountThisPage + gridAutoQueue.length >= MAX_AUTO_CHECKS_PER_PAGE) return;
    if (gridCircuitTripped || gridHourlyQuotaReached) return;

    gridAutoQueuedIds.add(item.itemId);
    gridAutoQueue.push(item);
    gridAutoQueue.sort((a, b) => (Number(b.estNet) || 0) - (Number(a.estNet) || 0));
    renderOrUpdateShopeeGridToolbar(null);
    processGridAutoQueue();
  }

  async function processGridAutoQueue() {
    if (gridQueueWorkerRunning) return;
    gridQueueWorkerRunning = true;
    try {
      while (gridAutoQueue.length > 0) {
        if (!shopeeGridState.enabled || isSingleProductUrl() || gridCircuitTripped || gridHourlyQuotaReached) {
          gridAutoQueue.length = 0;
          break;
        }
        if (gridAutoCheckedCountThisPage >= MAX_AUTO_CHECKS_PER_PAGE) {
          gridAutoQueue.length = 0;
          break;
        }
        const next = gridAutoQueue.shift();
        if (!next || !next.itemId) continue;
        gridAutoQueuedIds.delete(next.itemId);
        if (gridRealCache.has(next.itemId)) continue;

        gridLoadingIds.add(next.itemId);
        scanAndOverlayShopeeGrid();

        const res = await ns
          .sendMessage('GET_REAL_AFF_OFFER', {
            itemId: next.itemId,
            shopId: next.shopId || '',
            forceRefresh: false,
            mode: 'grid_auto'
          })
          .catch((e) => ({ ok: false, error: e?.message || String(e) }));

        gridLoadingIds.delete(next.itemId);

        if (res?.ok && res.data) {
          gridNeedAffTab = false;
          gridCircuitTripped = false;
          if (!res.cached) {
            gridAutoCheckedCountThisPage++;
          }
          gridPopIds.add(next.itemId);
          gridRealCache.set(next.itemId, res.data);
          scanAndOverlayShopeeGrid();
        } else if (res?.circuitTripped || res?.securityCheck) {
          gridCircuitTripped = true;
          gridAutoQueue.length = 0;
          gridAutoQueuedIds.clear();
          scanAndOverlayShopeeGrid();
          ns.showToast('🛡️ Shopee ขอตรวจสอบความปลอดภัย — ระบบหยุดเช็กอัตโนมัติทันที กรุณาเปิดหน้า AFF ผ่านด่านก่อน', 'error');
          break;
        } else if (res?.quotaExceeded) {
          gridHourlyQuotaReached = true;
          gridAutoQueue.length = 0;
          gridAutoQueuedIds.clear();
          scanAndOverlayShopeeGrid();
          ns.showToast('⏱️ ถึงเพดานเช็กอัตโนมัติ 120 ชิ้น/ชม. (ชี้หรือคลิกที่ป้ายเพื่อเช็กเฉพาะชิ้นได้)');
          break;
        } else if (res?.needAffTab) {
          gridNeedAffTab = true;
          gridAutoQueue.length = 0;
          gridAutoQueuedIds.clear();
          scanAndOverlayShopeeGrid();
          break;
        } else {
          scanAndOverlayShopeeGrid();
        }
      }
    } finally {
      gridQueueWorkerRunning = false;
      renderOrUpdateShopeeGridToolbar(null);
    }
  }

  async function requestSingleCardRealRate(itemId, cardProductPayload = null, forceRefresh = false) {
    const cleanId = String(itemId || '').replace(/[^0-9]/g, '');
    if (!cleanId || gridLoadingIds.has(cleanId)) return null;
    if (!forceRefresh && gridRealCache.has(cleanId)) return gridRealCache.get(cleanId);

    gridLoadingIds.add(cleanId);
    scanAndOverlayShopeeGrid();
    try {
      const res = await ns.sendMessage('GET_REAL_AFF_OFFER', {
        itemId: cleanId,
        shopId: cardProductPayload?.shopId || '',
        forceRefresh: Boolean(forceRefresh),
        mode: 'grid_hover'
      });

      if (res?.ok && res.data) {
        gridCircuitTripped = false;
        gridNeedAffTab = false;
        gridPopIds.add(cleanId);
        gridRealCache.set(cleanId, res.data);
        if (currentState.itemId === cleanId) {
          currentState.baseRate = Number(res.data.baseRate) || 0;
          currentState.extraRate = Number(res.data.extraRate) || 0;
          currentState.offerPrice = Number(res.data.offerPrice || res.data.price) || 0;
          currentState.realRateVerified = true;
          currentState.realRateItemId = cleanId;
          updateHUDValues();
          chrome.storage.local.set({ activeShopeeGridProduct: { ...currentState } }).catch(() => {});
        }
        return res.data;
      }
      if (res?.circuitTripped || res?.securityCheck) {
        gridCircuitTripped = true;
        ns.showToast('🛡️ Shopee ขอตรวจสอบความปลอดภัย — กรุณาเปิดหน้า AFF ผ่านด่านตรวจก่อน', 'error');
      }
      return null;
    } catch (_e) {
      return null;
    } finally {
      gridLoadingIds.delete(cleanId);
      scanAndOverlayShopeeGrid();
    }
  }

  function cleanupShopeeGridOverlays() {
    gridAutoQueue.length = 0;
    gridAutoQueuedIds.clear();
    gridLoadingIds.clear();
    cardDwellTimers.forEach((t) => clearTimeout(t));
    cardDwellTimers.clear();
    gridCardElByItemId.clear();
    document.querySelectorAll('.drb-aff-card-overlay').forEach((el) => el.remove());
    document.querySelectorAll('.drb-aff-grid-card').forEach((cardEl) => {
      cardEl.classList.remove('drb-aff-grid-card', 'drb-aff-grid-card--dim', 'drb-aff-grid-card--hidden');
      cardEl.removeAttribute('data-drb-sig');
      cardEl.removeAttribute('data-drb-tier');
      cardEl.removeAttribute('data-drb-est-net');
    });
    shopeeGridState.counts = { total: 0, win: 0, warn: 0, danger: 0, realCount: 0, candidateCount: 0 };
  }

  function findFirstShopeeGridContainer() {
    const productLinks = Array.from(
      document.querySelectorAll('a[href*="-i."], a[href*="/product/"]')
    ).filter((a) => !a.closest('#drb-aff-hud-root, #drb-aff-grid-toolbar, .drb-aff-card-overlay'));
    if (productLinks.length < 2) return null;
    let curr = productLinks[0];
    for (let depth = 0; depth < 6 && curr.parentElement && curr.parentElement !== document.body; depth++) {
      const parentLinks = curr.parentElement.querySelectorAll('a[href*="-i."], a[href*="/product/"]');
      if (parentLinks.length >= 2) {
        return curr.parentElement;
      }
      curr = curr.parentElement;
    }
    return productLinks[0].parentElement || null;
  }

  function scanAndOverlayShopeeGrid() {
    if (!shopeeGridState.enabled) {
      if (!isSingleProductUrl()) {
        const container = findFirstShopeeGridContainer();
        if (container) {
          renderOrUpdateShopeeGridToolbar(container);
        }
      }
      return 0;
    }

    const productLinks = Array.from(
      document.querySelectorAll('a[href*="-i."], a[href*="/product/"]')
    ).filter((a) => !a.closest('#drb-aff-hud-root, #drb-aff-grid-toolbar, .drb-aff-card-overlay'));

    if (productLinks.length === 0) return 0;

    const cardMap = new Map();
    productLinks.forEach((linkEl) => {
      // Walk up from linkEl until parentElement contains >= 2 product links (so cardEl is the true outer grid cell)
      let curr = linkEl;
      for (let depth = 0; depth < 6 && curr.parentElement && curr.parentElement !== document.body; depth++) {
        const parentLinks = curr.parentElement.querySelectorAll('a[href*="-i."], a[href*="/product/"]');
        if (parentLinks.length >= 2) {
          break;
        }
        curr = curr.parentElement;
      }
      const cardEl = curr;
      if (cardEl && !cardMap.has(cardEl)) {
        cardMap.set(cardEl, linkEl);
      }
    });

    if (cardMap.size === 0) return 0;

    const searchContext = getPageSearchContext();
    const obs = ensureGridViewportObserver();
    const uncachedIds = [];
    let countTotal = 0;
    let countWin = 0;
    let countWarn = 0;
    let countDanger = 0;
    let countReal = 0;
    let countCandidates = 0;
    let firstGridContainer = null;

    cardMap.forEach((linkEl, cardEl) => {
      if (!firstGridContainer && cardEl.parentElement) {
        firstGridContainer = cardEl.parentElement;
      }

      const parsedIds = ns.parseShopeeIds(linkEl.href || '');
      const shopId = parsedIds.shopId;
      const itemId = parsedIds.itemId;
      const cleanUrl = parsedIds.cleanUrl || linkEl.href;

      // Extract DOM-separated leaf nodes & selling price (100% immune to display:none innerText concatenation!)
      const { separatedText: rawText, leafLines, domSellingPrice } = extractShopeeCardDOMInfo(linkEl);

      // Lock Price per ItemID so hiding a card in filter mode NEVER alters its price
      let price = domSellingPrice;
      const lockedItemId = cardEl.getAttribute('data-drb-item-id');
      const lockedPrice = Number(cardEl.getAttribute('data-drb-locked-price')) || 0;
      if (itemId && lockedItemId === itemId && lockedPrice > 0) {
        price = lockedPrice;
      } else if (price > 0 && itemId) {
        cardEl.setAttribute('data-drb-item-id', itemId);
        cardEl.setAttribute('data-drb-shop-id', shopId || '');
        cardEl.setAttribute('data-drb-locked-price', String(price));
      }
      if (!price || price <= 0) return;

      if (itemId) {
        gridCardElByItemId.set(itemId, cardEl);
        if (!gridRealCache.has(itemId) && !uncachedIds.includes(itemId)) {
          uncachedIds.push(itemId);
        }
      }

      // 2. Extract Sold Count ("ขายแล้ว 40พัน+ ชิ้น" or "ขายได้ 10พัน+ ชิ้น/เดือน")
      const mSold =
        rawText.match(/ขาย(?:แล้ว|ได้)\s*([0-9.,]+\s*(?:พัน|หมื่น|แสน|ล้าน|k|m)?\+?)/i) ||
        rawText.match(/([0-9.,]+\s*(?:พัน|หมื่น|แสน|ล้าน|k|m)?\+?)\s*ขายแล้ว/i);
      const soldText = mSold ? mSold[1].trim().slice(0, 14) : '0';
      const soldCount = mSold ? ns.parseSoldCount(soldText) : 0;

      // 3. Extract Product Title
      const lines = leafLines.filter(
        (l) =>
          l.length >= 8 &&
          !/^ลด\s*\d+%|^Flash\s*Sale|^ช้อปปี้ถูกชัวร์|^VIP\s*Price|^ขายแล้ว|^ขายได้|^฿|^Mall$|^ร้านแนะนำ|^ส่งฟรี|^โค้ดคุ้ม|^ค้นหาสินค้าคล้ายกัน|^การผ่อนชำระ/i.test(l)
      );
      const title = lines[0] || linkEl.getAttribute('title') || 'Shopee Product';

      // 4. Check Mall / Preferred / Overseas status
      const hasMallDom = Boolean(
        linkEl.querySelector('img[alt*="Mall" i], [class*="mall" i], [class*="official" i]')
      );
      const isMallOrPreferred =
        hasMallDom || /Mall|ร้านแนะนำ|Official|โค้ดคุ้ม|ส่งฟรี|Fulfilled/i.test(rawText) || soldCount >= 300;
      const isOverseas = /ต่างประเทศ|จีน|china|overseas|mainland/i.test(rawText);

      // 5. Estimate Category Commission (A - F) as baseline, then override if Real Social Media Rate is verified
      const catEst = ns.estimateCategoryCommission(
        title,
        isMallOrPreferred,
        shopeeGridState.rateMode,
        searchContext
      );

      const estComm = ns.calculateCommission({
        price,
        baseRate: catEst.baseRate,
        extraRate: catEst.extraRate,
        capTHB: 250,
        whtRate: 0.0,
        realDailyAdCostTHB: 100
      });

      cardEl.setAttribute('data-drb-est-net', String(+estComm.netComm.toFixed(2)));
      if (obs) obs.observe(cardEl);

      const realOffer = itemId ? gridRealCache.get(itemId) : null;
      const isLoading = Boolean(itemId && gridLoadingIds.has(itemId));
      const rateState = realOffer ? 'real' : isLoading ? 'loading' : 'est';

      const activeBaseRate = realOffer ? Number(realOffer.baseRate) || 0 : catEst.baseRate;
      const activeExtraRate = realOffer ? Number(realOffer.extraRate) || 0 : catEst.extraRate;
      const activeTotalRate = +(activeBaseRate + activeExtraRate).toFixed(1);

      const comm = realOffer
        ? ns.calculateCommission({
            price,
            baseRate: activeBaseRate,
            extraRate: activeExtraRate,
            capTHB: 250,
            whtRate: 0.0,
            realDailyAdCostTHB: 100
          })
        : estComm;

      if (realOffer) {
        countReal++;
      } else if (estComm.netComm >= 20) {
        countCandidates++;
      }

      // 6. Determine Card Tier (If real rate has 0% Extra, force danger per Exther rule)
      let cardTier = 'danger';
      let pillEmoji = '⛔';
      let tierTitle = '⛔ ไฟแดง! ไม่คุ้มแอด 100฿';

      if (realOffer && activeExtraRate <= 0) {
        cardTier = 'danger';
        pillEmoji = '⛔';
        tierTitle =
          activeBaseRate > 0
            ? `⛔ ไร้ EXTRACOMM (มีแค่ช้อปปี้ ${activeBaseRate}%)`
            : '⛔ สินค้านี้ไม่มีค่าคอม Affiliate (0%)';
        countDanger++;
      } else if (comm.netComm >= 80) {
        cardTier = 'god';
        pillEmoji = '🔥';
        tierTitle = '🔥 ตัวเทพ! กำไรตั้งแต่ออเดอร์แรก';
        countWin++;
      } else if (comm.netComm >= 45) {
        cardTier = 'pass';
        pillEmoji = '✅';
        tierTitle = '✅ ไฟเขียว! น่าลุยแอด (2-3 ชิ้นคืนทุน)';
        countWin++;
      } else if (comm.netComm >= 20) {
        cardTier = 'warning';
        pillEmoji = '⚠️';
        tierTitle = '⚠️ ไฟเหลือง! ต้องขาย 3-5 ชิ้น/วัน';
        countWarn++;
      } else {
        cardTier = 'danger';
        pillEmoji = '⛔';
        tierTitle = '⛔ ไฟแดง! คอมต่ำ ห้ามยิงแอด';
        countDanger++;
      }
      countTotal++;

      // Lock Card Signature: Only update if item/price/rateMode/real-rate state changed
      const rateSig = realOffer ? `R_${activeBaseRate}_${activeExtraRate}` : isLoading ? 'L' : 'E';
      const scanSig = `${itemId || title.slice(0, 18)}_${price}_${catEst.catId}_${shopeeGridState.rateMode}_${rateSig}`;
      const existingOv = cardEl.querySelector('.drb-aff-card-overlay');
      if (existingOv && cardEl.getAttribute('data-drb-sig') === scanSig) {
        cardEl.setAttribute('data-drb-tier', cardTier);
        return;
      }
      const wasPopPending = itemId && gridPopIds.has(itemId) && rateState === 'real';
      if (wasPopPending) gridPopIds.delete(itemId);
      cardEl.setAttribute('data-drb-sig', scanSig);

      const shortNet = comm.netComm >= 100 ? Math.round(comm.netComm) : comm.netComm.toFixed(1);
      let deltaArrow = '';
      if (realOffer && estComm.netComm > 0) {
        const relDiff = Math.abs(comm.netComm - estComm.netComm) / estComm.netComm;
        if (relDiff >= 0.25) {
          deltaArrow = comm.netComm < estComm.netComm ? ' ▼' : ' ▲';
        }
      }

      let pillLabel = '';
      if (realOffer) {
        if (activeExtraRate > 0) {
          pillLabel = `✓ ฿${shortNet} · ${activeTotalRate}%${deltaArrow}`;
        } else if (activeBaseRate > 0) {
          pillLabel = `⛔ ✓ ฿${shortNet} · ${activeBaseRate}% (ไร้ Extra)`;
        } else {
          pillLabel = '⛔ ✓ ฿0 (0%)';
        }
      } else if (isLoading) {
        pillLabel = `⏳ ~฿${shortNet} ⋯`;
      } else {
        pillLabel = `${pillEmoji} ~฿${shortNet}`;
      }

      const soldStatusLabel =
        soldCount >= 1000
          ? `🔥 ขายดี ${soldText}`
          : soldCount >= 300
          ? `✅ ขายแล้ว ${soldText}`
          : soldCount > 0
          ? `⚠️ ขายต่ำ ${soldText} (<300)`
          : `ℹ️ ไม่ระบุยอดขาย`;

      const imgEl = cardEl.querySelector('img[src*="susercontent.com"]');
      const imgUrl = imgEl ? (imgEl.getAttribute('src') || '').replace(/_tn$/i, '') : '';

      const cardProductPayload = {
        ...currentState,
        title,
        price,
        originalPrice: price,
        priceMax: price,
        baseRate: activeBaseRate,
        extraRate: activeExtraRate,
        offerPrice: realOffer ? Number(realOffer.offerPrice || realOffer.price) || price : 0,
        realRateVerified: Boolean(realOffer),
        realRateItemId: realOffer ? itemId : '',
        categoryLabel: realOffer ? 'เรทจริง Social Media' : catEst.catLabel,
        soldCount,
        soldText,
        rating: 4.9,
        shipFrom: isOverseas ? 'ส่งจากจีน' : 'ส่งในไทย',
        isOverseas,
        shopId,
        itemId,
        cleanUrl,
        imagesHD: imgUrl ? [imgUrl] : [],
        specText: realOffer
          ? `[เรทจริง Social Media จาก Affiliate — Verified]\n` +
            `• สินค้า: ${title}\n` +
            `• ราคาขายจริง: ฿${price.toLocaleString()}\n` +
            `• EXTRACOMM (Social Media): ${activeExtraRate}% (฿${comm.extraComm.toFixed(2)})\n` +
            `• ช้อปปี้ (Base Social): ${activeBaseRate}% (฿${comm.baseComm.toFixed(2)})\n` +
            `• ค่าคอมจริง (ตรง AFF): ฿${comm.netComm.toFixed(2)} / ชิ้น\n` +
            `• จุดคุ้มทุนแอด 100฿: ${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)`
          : `[ประเมินจากหน้าค้นหา Shopee — ${catEst.catLabel}]\n` +
            `• สินค้า: ${title}\n` +
            `• ราคาขายจริง: ฿${price.toLocaleString()}\n` +
            `• หมวดหมู่ประเมิน: ${catEst.catLabel} (Base ${catEst.baseRate}% + Extra ${catEst.extraRate}% = ~${catEst.totalRate}%)\n` +
            `• ค่าคอมประเมิน: ~฿${comm.netComm.toFixed(2)} / ชิ้น\n` +
            `• จุดคุ้มทุนแอด 100฿: ~${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)\n` +
            `• ยอดขายจริงบนการ์ด: ${soldText} ชิ้น (${isOverseas ? 'ส่งจากต่างประเทศ' : 'ส่งในไทย'})`
      };

      cardEl.classList.add('drb-aff-grid-card');
      cardEl.setAttribute('data-drb-tier', cardTier);

      const affOfferUrl = itemId
        ? `https://affiliate.shopee.co.th/offer/product_offer/${itemId}`
        : `https://affiliate.shopee.co.th/offer/product_offer`;

      const tooltipInnerHtml = `
        <div class="drb-aff-tt-title">${escHtmlGrid(tierTitle)}</div>
        ${
          realOffer
            ? `
        <div class="drb-aff-tt-row">
          <span>✅ เรทจริง Social:</span>
          <strong style="color:#4ade80;">Extra ${activeExtraRate}% + Base ${activeBaseRate}%</strong>
        </div>
        <div class="drb-aff-tt-row">
          <span>💰 ค่าคอมจริง:</span>
          <strong>${ns.formatTHB(comm.netComm)} / ชิ้น</strong>
        </div>
        ${
          deltaArrow
            ? `<div class="drb-aff-tt-row"><span>📊 เทียบค่าเดา (~${ns.formatTHB(estComm.netComm, 0)}):</span><strong style="color:${deltaArrow.includes('▼') ? '#fca5a5' : '#4ade80'};">${deltaArrow.includes('▼') ? 'ต่ำกว่าคาด ▼' : 'สูงกว่าคาด ▲'}</strong></div>`
            : ''
        }`
            : `
        <div class="drb-aff-tt-row">
          <span>🏷️ หมวด (เดา):</span>
          <strong>${escHtmlGrid(catEst.catLabel)} (~${catEst.totalRate}%)</strong>
        </div>
        <div class="drb-aff-tt-row">
          <span>💰 คอมประเมิน:</span>
          <strong>~${ns.formatTHB(comm.netComm)} / ชิ้น</strong>
        </div>`
        }
        <div class="drb-aff-tt-row">
          <span>🎯 คุ้มแอด 100฿:</span>
          <strong>${realOffer ? '' : '~'}${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)</strong>
        </div>
        <div class="drb-aff-tt-row">
          <span>📦 ยอดขาย:</span>
          <span>${escHtmlGrid(soldStatusLabel)}${isOverseas ? ' ⚠️จีน' : ''}</span>
        </div>
        <div class="drb-aff-card-btn-group">
          ${
            itemId
              ? `<button type="button" class="drb-aff-card-check-btn ${realOffer ? 'is-verified' : ''}">${
                  isLoading
                    ? '⏳ กำลังดึงเรทจริง...'
                    : realOffer
                    ? '✅ เช็กเรทจริงแล้ว (คลิกเช็กซ้ำ)'
                    : '🎯 ดึงเรทจริง Social Media'
                }</button>`
              : ''
          }
          <button type="button" class="drb-aff-card-pick-btn">⚡ ดึงเข้า Side Panel & Web UI</button>
          <button type="button" class="drb-aff-card-aff-btn">🔍 เช็กตารางหน้า AFF (1-Click)</button>
        </div>
      `;

      const cardCtx = {
        itemId,
        shopId,
        title,
        realOffer,
        comm,
        catEst,
        cardProductPayload,
        affOfferUrl
      };

      // Update existing overlay IN PLACE so hovering / clicking NEVER flickers or closes tooltip!
      if (existingOv) {
        existingOv.setAttribute('data-tier', cardTier);
        existingOv.setAttribute('data-rate-state', rateState);
        existingOv.__drbCtx = cardCtx;

        const existingPill = existingOv.querySelector('.drb-aff-card-pill');
        if (existingPill) {
          existingPill.classList.toggle('drb-aff-card-pill--pop', Boolean(wasPopPending));
          const spanEl = existingPill.querySelector('span');
          if (spanEl) spanEl.textContent = pillLabel;
        }
        const existingTt = existingOv.querySelector('.drb-aff-card-tooltip');
        if (existingTt) {
          const rect = cardEl.getBoundingClientRect();
          existingTt.classList.toggle('drb-aff-card-tooltip--flip-right', rect.left > 0 && rect.left < 220);
          const innerEl = existingTt.querySelector('.drb-aff-card-tooltip-inner');
          if (innerEl) innerEl.innerHTML = tooltipInnerHtml;
        }
        return;
      }

      const ov = document.createElement('div');
      ov.className = 'drb-aff-card-overlay';
      ov.setAttribute('data-tier', cardTier);
      ov.setAttribute('data-rate-state', rateState);
      ov.__drbCtx = cardCtx;

      const cardRect = cardEl.getBoundingClientRect();
      const flipRightCls = cardRect.left > 0 && cardRect.left < 220 ? ' drb-aff-card-tooltip--flip-right' : '';

      ov.innerHTML = `
        <div class="drb-aff-card-pill ${wasPopPending ? 'drb-aff-card-pill--pop' : ''}">
          <span>${escHtmlGrid(pillLabel)}</span>
        </div>
        <div class="drb-aff-card-tooltip${flipRightCls}">
          <div class="drb-aff-card-tooltip-inner">${tooltipInnerHtml}</div>
        </div>
      `;

      // Event delegation on persistent overlay wrapper (survives in-place HTML updates cleanly!)
      ov.addEventListener('click', async (e) => {
        const ctx = ov.__drbCtx || {};
        const checkTarget = e.target.closest('.drb-aff-card-check-btn');
        if (checkTarget) {
          e.preventDefault();
          e.stopPropagation();
          if (ctx.itemId) {
            requestSingleCardRealRate(ctx.itemId, ctx.cardProductPayload, Boolean(ctx.realOffer));
          }
          return;
        }

        const affTarget = e.target.closest('.drb-aff-card-aff-btn');
        if (affTarget) {
          e.preventDefault();
          e.stopPropagation();
          if (ctx.affOfferUrl) window.open(ctx.affOfferUrl, '_blank', 'noopener');
          return;
        }

        const pickTarget = e.target.closest('.drb-aff-card-pick-btn, .drb-aff-card-pill');
        if (pickTarget) {
          e.preventDefault();
          e.stopPropagation();
          currentState = { ...currentState, ...(ctx.cardProductPayload || {}) };
          updateHUDValues();
          try {
            await chrome.storage.local.set({ activeShopeeGridProduct: ctx.cardProductPayload });
            await ns.sendMessage('PUSH_SKU_TO_WEBUI', {
              id: `shopee_${ctx.shopId}_${ctx.itemId || Date.now()}`,
              platform: 'shopee',
              sourceTab: ctx.realOffer ? 'Shopee Grid (Verified SM)' : `Shopee Grid (${ctx.catEst?.catLabel || ''})`,
              title: ctx.cardProductPayload?.title,
              specText: ctx.cardProductPayload?.specText,
              price: ctx.cardProductPayload?.price,
              baseRate: ctx.cardProductPayload?.baseRate,
              extraRate: ctx.cardProductPayload?.extraRate,
              estimatedCommission: Number((ctx.comm?.netComm || 0).toFixed(2)),
              realDailyAdCostTHB: 100,
              breakEvenUnits: ctx.comm?.breakEvenUnits,
              breakEvenOrders: ctx.comm?.breakEvenOrders,
              adViabilityTier: ctx.comm?.tier,
              cleanUrl: ctx.cardProductPayload?.cleanUrl,
              imagesHD: ctx.cardProductPayload?.imagesHD,
              scrapedAt: new Date().toISOString()
            });
          } catch (_err) {}
          if (ctx.itemId && !ctx.realOffer && !gridLoadingIds.has(ctx.itemId)) {
            requestSingleCardRealRate(ctx.itemId, ctx.cardProductPayload, false);
          }
          ns.showToast(
            ctx.realOffer
              ? `✓ ดึง "${(ctx.title || '').slice(0, 24)}..." (${ns.formatTHB(ctx.comm?.netComm || 0)} เรทจริง) เข้า Side Panel แล้ว!`
              : `⚡ ดึง "${(ctx.title || '').slice(0, 24)}..." (~${ns.formatTHB(ctx.comm?.netComm || 0)}) — กำลังเช็กเรทจริงให้ต่อ!`
          );
        }
      });

      // Manual Click Only: do not auto-fire on mouseenter hover to protect affiliate.shopee.co.th API quota
      cardEl.appendChild(ov);
    });

    shopeeGridState.counts = {
      total: countTotal,
      win: countWin,
      warn: countWarn,
      danger: countDanger,
      realCount: countReal,
      candidateCount: countCandidates
    };

    if (uncachedIds.length > 0) {
      hydrateGridCacheFromBackground(uncachedIds);
    }

    if (!isSingleProductUrl() && countTotal > 0) {
      renderOrUpdateShopeeGridToolbar(firstGridContainer);
      applyShopeeGridFilterClasses();
    }

    return countTotal;
  }

  function renderOrUpdateShopeeGridToolbar(gridContainerEl) {
    let tb = document.getElementById('drb-aff-grid-toolbar');
    if (!tb && gridContainerEl) {
      tb = document.createElement('div');
      tb.id = 'drb-aff-grid-toolbar';

      // Prefer mounting right above .shopee-sort-bar or the multi-card grid container
      const sortBar = document.querySelector('.shopee-sort-bar');
      if (sortBar && sortBar.parentElement) {
        sortBar.parentElement.insertBefore(tb, sortBar);
      } else if (gridContainerEl && gridContainerEl.parentElement) {
        gridContainerEl.parentElement.insertBefore(tb, gridContainerEl);
      }
    }
    if (!tb) return;

    const c = shopeeGridState.counts;
    const isOn = shopeeGridState.enabled;
    const estRemaining = Math.max(0, (c.total || 0) - (c.realCount || 0));
    document.body.classList.toggle('drb-aff-radar-off', !isOn);

    const tbSig = `${isOn}_${c.total}_${c.win}_${c.warn}_${c.danger}_${c.realCount || 0}_${c.candidateCount || 0}_${gridAutoQueue.length}_${gridCircuitTripped}_${gridNeedAffTab}_${gridHourlyQuotaReached}_${shopeeGridState.mode}_${shopeeGridState.rateMode}_${shopeeGridState.dimDanger}_${shopeeGridState.hideDanger}`;
    if (tb.getAttribute('data-tb-sig') === tbSig) return;
    tb.setAttribute('data-tb-sig', tbSig);

    let realCheckBtnHtml = '';
    if (isOn) {
      if (gridCircuitTripped) {
        realCheckBtnHtml = `<button type="button" class="drb-grid-realcheck-btn is-breaker" id="drb-btn-check-top-real" title="Shopee แสดงหน้าตรวจสอบความปลอดภัย กรุณาเปิดหน้า AFF ผ่านด่านตรวจก่อน">🛡️ ติดด่านตรวจ Shopee (คลิกเปิดหน้า AFF)</button>`;
      } else if (c.candidateCount > 0 || gridAutoQueue.length > 0) {
        realCheckBtnHtml = `<button type="button" class="drb-grid-realcheck-btn" id="drb-btn-check-top-real" title="ดึงเรทจริง Social Media เฉพาะสินค้าที่ลุ้นแอดได้ (≥฿15) สูงสุด 12 ชิ้น/หน้า พร้อมหน่วงเวลาสุ่มกันแบน">
          ${gridAutoQueue.length > 0 ? `⏳ กำลังเช็กเรทจริง (${gridAutoQueue.length} คิว)...` : `🎯 เช็กเรทจริงตัวลุ้นแอด (${Math.min(MAX_AUTO_CHECKS_PER_PAGE, c.candidateCount)})`}
        </button>`;
      }
    }

    const summaryHtml = isOn
      ? `
          ✓ เรทจริง <strong style="color:#4ade80;">${c.realCount || 0}/${c.total}</strong> |
          ~ ประเมิน <strong>${estRemaining}</strong> |
          🔥✅ น่าลุย <strong>${c.win}</strong> |
          ⚠️ <strong>${c.warn}</strong> |
          ⛔ <strong>${c.danger}</strong>
          ${gridNeedAffTab && !gridCircuitTripped ? ' · <span style="color:#fbbf24;">💡 ชี้ป้ายหรือกดเช็กเรทเพื่อเปิดแท็บ AFF</span>' : ''}
        `
      : `🛡️ โหมดปลอดภัย: ปิดสแกนอัตโนมัติในหน้ารวมสินค้า — กดปุ่มซ้ายมือเมื่อต้องการเปิดสแกนหน้านี้`;

    tb.innerHTML = `
      <div class="drb-grid-tb-left">
        <button type="button" class="drb-grid-power-btn ${isOn ? '' : 'is-off'}" id="drb-btn-toggle-radar" title="เปิด/ปิด การสแกนและการแสดงป้าย Signal บนการ์ดทั้งหมด">
          ${isOn ? '🟢 เรดาร์: เปิด' : '⚪ เรดาร์: ปิด (คลิกเพื่อเปิดสแกน)'}
        </button>
        <span class="drb-grid-tb-title">⚡ DrBank Radar</span>
        <span class="drb-grid-tb-summary" style="${isOn ? '' : 'opacity:0.85;'}">
          ${summaryHtml}
        </span>
        ${realCheckBtnHtml}
        <select class="drb-grid-rate-select" id="drb-shopee-rate-mode" title="เลือกโหมดประเมินเรทสำหรับสินค้าที่ยังไม่เช็กเรทจริง" style="${isOn ? '' : 'display:none;'}" ${isOn ? '' : 'disabled'}>
          <option value="auto" ${shopeeGridState.rateMode === 'auto' ? 'selected' : ''}>🤖 Auto แยกตามหมวด A-F</option>
          <option value="15" ${shopeeGridState.rateMode === '15' ? 'selected' : ''}>🎯 ล็อกเรทรวม 15%</option>
          <option value="10" ${shopeeGridState.rateMode === '10' ? 'selected' : ''}>🎯 ล็อกเรทรวม 10%</option>
          <option value="20" ${shopeeGridState.rateMode === '20' ? 'selected' : ''}>🔥 ล็อกเรทรวม 20%</option>
          <option value="base_only" ${shopeeGridState.rateMode === 'base_only' ? 'selected' : ''}>⚠️ เฉพาะ Base 2.5% (ไร้ Extra)</option>
        </select>
      </div>
      <div class="drb-grid-tb-actions" style="${isOn ? '' : 'display:none;'}">
        <button type="button" class="drb-grid-filter-btn ${shopeeGridState.mode === 'all' && !shopeeGridState.dimDanger && !shopeeGridState.hideDanger ? 'active' : ''}" id="drb-btn-reset-default" title="ค่าเริ่มต้น: โชว์เฉพาะป้าย Signal มุมขวา ไม่ดรอปแสง ไม่ซ่อนการ์ด">
          🔄 ทั้งหมด (${c.total})
        </button>
        <button type="button" class="drb-grid-filter-btn drb-grid-filter-btn--green ${shopeeGridState.mode === 'win' ? 'active' : ''}" data-mode="win">
          🔥✅ น่าลุย (${c.win})
        </button>
        <button type="button" class="drb-grid-filter-btn ${shopeeGridState.mode === 'warn' ? 'active' : ''}" data-mode="warn">
          ⚠️ ≥฿20 (${c.win + c.warn})
        </button>
        <button type="button" class="drb-grid-filter-btn ${shopeeGridState.dimDanger ? 'active' : ''}" id="drb-btn-toggle-dim">
          💡 ดรอปไฟแดง: ${shopeeGridState.dimDanger ? 'เปิด' : 'ปิด'}
        </button>
        <button type="button" class="drb-grid-filter-btn ${shopeeGridState.hideDanger ? 'active' : ''}" id="drb-btn-toggle-hide">
          ⛔ ซ่อนไฟแดง (${c.danger})
        </button>
      </div>
    `;

    const realCheckBtn = tb.querySelector('#drb-btn-check-top-real');
    if (realCheckBtn) {
      realCheckBtn.addEventListener('click', async () => {
        if (gridCircuitTripped) {
          await ns.sendMessage('RESET_CIRCUIT_BREAKER').catch(() => {});
          gridCircuitTripped = false;
          window.open('https://affiliate.shopee.co.th/offer/product_offer', '_blank', 'noopener');
          renderOrUpdateShopeeGridToolbar(gridContainerEl);
          return;
        }
        if (gridNeedAffTab) {
          realCheckBtn.textContent = '⏳ กำลังเชื่อมแท็บ AFF...';
          const openRes = await ns.sendMessage('OPEN_BACKGROUND_AFF_BRIDGE_TAB').catch(() => null);
          if (openRes?.securityCheck) {
            gridCircuitTripped = true;
            renderOrUpdateShopeeGridToolbar(gridContainerEl);
            ns.showToast('🛡️ กรุณาเปิดหน้า affiliate.shopee.co.th ล็อกอิน/ผ่านด่านตรวจก่อน', 'error');
            return;
          }
          gridNeedAffTab = false;
        }
        const candidates = [];
        gridCardElByItemId.forEach((cEl, id) => {
          if (!document.body.contains(cEl)) return;
          if (gridRealCache.has(id) || gridLoadingIds.has(id) || gridAutoQueuedIds.has(id)) return;
          const estNet = Number(cEl.getAttribute('data-drb-est-net')) || 0;
          const price = Number(cEl.getAttribute('data-drb-locked-price')) || 0;
          const shopId = cEl.getAttribute('data-drb-shop-id') || '';
          if (estNet >= 15 || price >= 180) {
            candidates.push({ itemId: id, shopId, estNet });
          }
        });
        candidates.sort((a, b) => b.estNet - a.estNet);
        const batchToQueue = candidates.slice(0, MAX_AUTO_CHECKS_PER_PAGE);
        if (!batchToQueue.length) {
          ns.showToast('✓ เช็กเรทจริงครบทุกตัวที่ลุ้นแอดแล้ว (ชี้ป้ายใดๆ เพื่อเช็กเพิ่มรายตัวได้เลย)');
          return;
        }
        gridAutoCheckedCountThisPage = 0;
        batchToQueue.forEach((item) => enqueueGridAutoItem(item));
      });
    }

    const powerBtn = tb.querySelector('#drb-btn-toggle-radar');
    if (powerBtn) {
      powerBtn.addEventListener('click', () => {
        shopeeGridState.enabled = !shopeeGridState.enabled;
        document.body.classList.toggle('drb-aff-radar-off', !shopeeGridState.enabled);
        if (shopeeGridState.enabled) {
          scanAndOverlayShopeeGrid();
        } else {
          cleanupShopeeGridOverlays();
          renderOrUpdateShopeeGridToolbar(gridContainerEl);
        }
      });
    }

    const resetBtn = tb.querySelector('#drb-btn-reset-default');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        shopeeGridState.mode = 'all';
        shopeeGridState.dimDanger = false;
        shopeeGridState.hideDanger = false;
        renderOrUpdateShopeeGridToolbar(gridContainerEl);
        applyShopeeGridFilterClasses();
      });
    }

    const modeSelect = tb.querySelector('#drb-shopee-rate-mode');
    if (modeSelect) {
      modeSelect.addEventListener('change', (e) => {
        shopeeGridState.rateMode = e.target.value;
        scanAndOverlayShopeeGrid();
      });
    }

    tb.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const clickedMode = btn.getAttribute('data-mode');
        shopeeGridState.mode = shopeeGridState.mode === clickedMode ? 'all' : clickedMode;
        renderOrUpdateShopeeGridToolbar(gridContainerEl);
        applyShopeeGridFilterClasses();
      });
    });

    const dimBtn = tb.querySelector('#drb-btn-toggle-dim');
    if (dimBtn) {
      dimBtn.addEventListener('click', () => {
        shopeeGridState.dimDanger = !shopeeGridState.dimDanger;
        renderOrUpdateShopeeGridToolbar(gridContainerEl);
        applyShopeeGridFilterClasses();
      });
    }

    const hideBtn = tb.querySelector('#drb-btn-toggle-hide');
    if (hideBtn) {
      hideBtn.addEventListener('click', () => {
        shopeeGridState.hideDanger = !shopeeGridState.hideDanger;
        renderOrUpdateShopeeGridToolbar(gridContainerEl);
        applyShopeeGridFilterClasses();
      });
    }
  }

  function applyShopeeGridFilterClasses() {
    document.querySelectorAll('.drb-aff-grid-card').forEach((cardEl) => {
      const tier = cardEl.getAttribute('data-drb-tier');
      cardEl.classList.remove('drb-aff-grid-card--dim', 'drb-aff-grid-card--hidden');
      if (!shopeeGridState.enabled) return;

      if (tier === 'danger' && shopeeGridState.dimDanger) {
        cardEl.classList.add('drb-aff-grid-card--dim');
      }

      if (shopeeGridState.hideDanger && tier === 'danger') {
        cardEl.classList.add('drb-aff-grid-card--hidden');
        return;
      }

      if (shopeeGridState.mode === 'win' && tier !== 'god' && tier !== 'pass') {
        cardEl.classList.add('drb-aff-grid-card--hidden');
      } else if (shopeeGridState.mode === 'warn' && tier === 'danger') {
        cardEl.classList.add('drb-aff-grid-card--hidden');
      }
    });
  }

  async function fetchRealSocialCommissionForCurrentProduct(forceRefresh = false) {
    if (!isSingleProductUrl()) return;
    const reqItemId = String(currentState.itemId || '').replace(/[^0-9]/g, '');
    if (!reqItemId) return;
    if (!forceRefresh && (reqItemId === lastAutoFetchedOfferItemId || currentState.realRateLoading)) {
      return;
    }

    lastAutoFetchedOfferItemId = reqItemId;
    currentState.realRateLoading = true;
    currentState.realRateError = '';
    currentState.realRateSecurityCheck = false;
    try {
      await chrome.storage.local.set({ activeShopeeGridProduct: { ...currentState } }).catch(() => {});
      const res = await ns.sendMessage('GET_REAL_AFF_OFFER', {
        itemId: reqItemId,
        shopId: currentState.shopId,
        title: currentState.title,
        forceRefresh
      });

      if (currentState.itemId !== reqItemId) return;

      if (res?.ok && res.data) {
        currentState.baseRate = Number(res.data.baseRate) || 0;
        currentState.extraRate = Number(res.data.extraRate) || 0;
        currentState.offerPrice = Number(res.data.offerPrice || res.data.price) || 0;
        currentState.liveExtraRate = Number(res.data.liveExtraRate) || 0;
        currentState.liveBaseRate = Number(res.data.liveBaseRate) || 0;
        currentState.realRateVerified = true;
        currentState.realRateItemId = reqItemId;
        currentState.realRateLoading = false;
        currentState.realRateError = '';
        currentState.realRateSecurityCheck = false;
        currentState.categoryLabel = 'เรทจริง Social Media';
        scrapeShopeeProductDOM();
        updateHUDValues();
        await chrome.storage.local.set({ activeShopeeGridProduct: { ...currentState } }).catch(() => {});
      } else {
        currentState.realRateLoading = false;
        currentState.realRateSecurityCheck = Boolean(res?.securityCheck);
        currentState.realRateError = res?.error || 'ยังดึงเรทจริงจากหน้า AFF ไม่ได้';
        await chrome.storage.local.set({ activeShopeeGridProduct: { ...currentState } }).catch(() => {});
      }
    } catch (err) {
      if (currentState.itemId === reqItemId) {
        currentState.realRateLoading = false;
        currentState.realRateError = err?.message || String(err);
        await chrome.storage.local.set({ activeShopeeGridProduct: { ...currentState } }).catch(() => {});
      }
    }
  }

  function scrapeShopeeProductDOM() {
    const parsed = ns.parseShopeeIds(location.href);
    if (parsed.itemId && currentState.lastScrapedItemId && parsed.itemId !== currentState.lastScrapedItemId) {
      currentState.realRateVerified = false;
      currentState.realRateItemId = '';
      currentState.offerPrice = 0;
      currentState.liveExtraRate = 0;
      currentState.liveBaseRate = 0;
      currentState.realRateError = '';
      currentState.realRateSecurityCheck = false;
    }
    if (parsed.itemId) {
      currentState.lastScrapedItemId = parsed.itemId;
    }
    currentState.shopId = parsed.shopId;
    currentState.itemId = parsed.itemId;
    currentState.cleanUrl = parsed.cleanUrl;

    // 1. Product Title
    const titleSelectors = [
      'div[class*="attM6y"] span',
      'h1',
      'div[class*="WBVL_7"]',
      'meta[property="og:title"]'
    ];
    let foundTitle = '';
    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        foundTitle = el.tagName === 'META' ? el.getAttribute('content') : el.textContent;
        if (foundTitle && foundTitle.trim().length > 3) break;
      }
    }
    currentState.title = (foundTitle || document.title || 'Shopee Product').replace(/\| Shopee Thailand/i, '').trim();

    // Auto-estimate Category Commission (A - F) only if real Social Media rate is not yet verified for this itemId
    const hasVerifiedRealRate = Boolean(currentState.realRateVerified && currentState.itemId && currentState.realRateItemId === currentState.itemId);
    if (!hasVerifiedRealRate && ns.estimateCategoryCommission && currentState.title) {
      const catEst = ns.estimateCategoryCommission(currentState.title, true, 'auto');
      currentState.categoryLabel = catEst.catLabel;
      currentState.baseRate = catEst.baseRate;
      currentState.extraRate = catEst.extraRate;
    }

    // 2. Product Price & Original Price
    const priceCandidates = [];
    document.querySelectorAll('div, span').forEach((el) => {
      if (el.children.length === 0 && !el.closest('#drb-aff-hud-root')) {
        const txt = (el.textContent || '').trim();
        if (/^฿\s?[0-9,]+(\.[0-9]{1,2})?$/.test(txt)) {
          const val = ns.parsePriceNumber(txt);
          if (val > 0 && val < 1000000) priceCandidates.push(val);
        }
      }
    });

    if (priceCandidates.length > 0) {
      currentState.price = priceCandidates[0];
      currentState.originalPrice = priceCandidates.length > 1 ? Math.max(...priceCandidates.slice(0, 3)) : priceCandidates[0];
      currentState.priceMax = currentState.originalPrice;
    } else if (!currentState.price) {
      currentState.price = 299;
      currentState.originalPrice = 299;
      currentState.priceMax = 299;
    }

    // 3. Sold Count & Star Rating & Shipping Origin (Strict Field-Specific Extraction)
    let foundSoldText = '';
    let foundSoldNum = 0;
    let foundRating = 0;
    let overseasDetected = false;
    let shipLocationText = 'ส่งในไทย';

    document.querySelectorAll('div, span, a').forEach((el) => {
      if (el.children.length === 0 && !el.closest('#drb-aff-hud-root')) {
        const txt = (el.textContent || '').trim();
        if (!txt || txt.length > 80) return;

        // Strict Sold Regex Group Extraction
        if (!foundSoldNum) {
          const m1 = txt.match(/ขายแล้ว\s*([0-9.,]+\s*(?:พัน|หมื่น|แสน|ล้าน|k|m)?)/i);
          const m2 = txt.match(/^([0-9.,]+\s*(?:พัน|หมื่น|แสน|ล้าน|k|m)?)\s*ขายแล้ว$/i);
          const rawMatch = (m1 && m1[1]) || (m2 && m2[1]);
          if (rawMatch) {
            foundSoldText = rawMatch.trim().slice(0, 14);
            foundSoldNum = ns.parseSoldCount(foundSoldText);
          }
        }

        // Strict Star Rating (4.0 - 5.0)
        if (!foundRating && /^[345]\.[0-9]$/.test(txt)) {
          const rVal = parseFloat(txt);
          if (rVal >= 1.0 && rVal <= 5.0) foundRating = rVal;
        }
      }
    });

    // Fallback scan on body text if Sold Count is split across sibling spans
    const bodyText = document.body ? document.body.innerText : '';
    if (!foundSoldNum && bodyText) {
      const mSold =
        bodyText.match(/([0-9.,]+\s*(?:พัน|หมื่น|แสน|k)?)\s*(?:ชิ้น\s*)?ขายแล้ว/i) ||
        bodyText.match(/ขายแล้ว\s*([0-9.,]+\s*(?:พัน|หมื่น|แสน|k)?)/i);
      if (mSold && mSold[1]) {
        foundSoldText = mSold[1].trim().slice(0, 14);
        foundSoldNum = ns.parseSoldCount(foundSoldText);
      }
    }

    // Strict Shipping Origin Extraction: ตรวจเฉพาะช่อง "ส่งจาก" / "จัดส่งจาก" เท่านั้น
    // ป้องกันความเข้าใจผิดกับ "ประเทศต้นกำเนิดสินค้า" เช่น เครื่องใช้ไฟฟ้าผลิตจีน แต่สต็อกและส่งจากอยุธยา/ไทย
    let foundExplicitShipFrom = '';
    const mShip =
      bodyText.match(/ส่งจาก\s*([^\n\r]+)/i) ||
      bodyText.match(/จัดส่งจาก\s*([^\n\r]+)/i);
    if (mShip && mShip[1]) {
      foundExplicitShipFrom = mShip[1].trim().slice(0, 40);
    }

    if (foundExplicitShipFrom) {
      if (/ต่างประเทศ|overseas|mainland china|จีน|เซินเจิ้น|กวางโจว/i.test(foundExplicitShipFrom)) {
        overseasDetected = true;
        shipLocationText = 'ส่งจากจีน/ตปท.';
      } else {
        // เช่น "จังหวัดพระนครศรีอยุธยา", "กรุงเทพมหานคร", "สมุทรปราการ"
        overseasDetected = false;
        shipLocationText = foundExplicitShipFrom.replace(/^จังหวัด/i, '').trim();
      }
    } else {
      // Fallback: หากไม่เจอช่องส่งจากโดยตรง
      if (/ส่งจากต่างประเทศ|ส่งจาก\s*ต่างประเทศ/i.test(bodyText)) {
        overseasDetected = true;
        shipLocationText = 'ส่งจากจีน/ตปท.';
      } else {
        overseasDetected = false;
        shipLocationText = 'ส่งในไทย';
      }
    }

    if (foundSoldNum > 0) {
      currentState.soldCount = foundSoldNum;
      currentState.soldText = foundSoldText || foundSoldNum.toLocaleString();
    }
    if (foundRating > 0) {
      currentState.rating = foundRating;
    }
    currentState.isOverseas = overseasDetected;
    currentState.shipFrom = shipLocationText;

    // 4. Extract Product Description & Spec Text (for the 5-Line Scrollable Spec Box)
    let extractedSpec = '';
    const specRoot =
      document.querySelector('div.product-detail') ||
      document.querySelector('section[class*="product"]') ||
      null;

    if (specRoot && !specRoot.closest('#drb-aff-hud-root')) {
      extractedSpec = (specRoot.innerText || '').trim();
    } else if (bodyText) {
      const idxSpec = bodyText.indexOf('ข้อมูลจำเพาะของสินค้า');
      const idxDesc = bodyText.indexOf('รายละเอียดสินค้า');
      const startIdx = idxSpec !== -1 ? idxSpec : idxDesc;
      if (startIdx !== -1) {
        extractedSpec = bodyText.slice(startIdx, startIdx + 1800).trim();
      }
    }

    if (extractedSpec) {
      // Clean excessive blank lines
      currentState.specText = extractedSpec
        .replace(/\n{3,}/g, '\n\n')
        .slice(0, 1500);
    } else {
      currentState.specText = `ชื่อสินค้า: ${currentState.title}\nราคาขาย: ฿${currentState.price} | แหล่งส่ง: ${currentState.shipFrom}`;
    }

    if (hasVerifiedRealRate) {
      const baseNote =
        currentState.offerPrice > 0 && currentState.offerPrice !== currentState.price
          ? ` | ราคาฐาน AFF: ฿${currentState.offerPrice.toLocaleString()}`
          : '';
      const rateHeader =
        `[เรทจริงช่องทางโซเชียลมีเดีย: EXTRACOMM ${currentState.extraRate}% + ช้อปปี้ ${currentState.baseRate}%${baseNote}]\n` +
        `*คอมจริงคิดจากยอดจ่ายสุทธิหลังหักโค้ดส่วนลด และอาจติด Cap ค่าคอมช้อปปี้ 250฿\n\n`;
      currentState.specText = `${rateHeader}${currentState.specText}`.slice(0, 1700);
    }

    // 5. Extract HD Product Images
    const imgSet = new Set();
    document.querySelectorAll('img[src*="susercontent.com"], div[style*="susercontent.com"]').forEach((el) => {
      let rawUrl = el.tagName === 'IMG' ? el.getAttribute('src') : '';
      if (!rawUrl) {
        const bg = el.getAttribute('style') || '';
        const m = bg.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/i);
        if (m) rawUrl = m[1];
      }
      if (rawUrl && /susercontent\.com\/file\//i.test(rawUrl)) {
        const hdUrl = rawUrl.replace(/_tn$/i, '');
        imgSet.add(hdUrl);
      }
    });
    currentState.imagesHD = Array.from(imgSet).slice(0, 8);

    // 6. Variants / SKU Buttons
    const variantSet = new Set();
    document.querySelectorAll('button.product-variation, button[aria-label]').forEach((btn) => {
      const label = (btn.textContent || '').trim();
      if (label && label.length >= 1 && label.length <= 36 && !/หยิบใส่ตะกร้า|ซื้อสินค้า|แชร์/i.test(label)) {
        variantSet.add(label);
      }
    });
    currentState.variants = Array.from(variantSet).slice(0, 16);
  }

  function renderHUD() {
    if (document.getElementById('drb-aff-hud-root')) return;

    const root = document.createElement('div');
    root.id = 'drb-aff-hud-root';
    if (currentState.settings.hudMinimized) {
      root.classList.add('drb-aff-hud--minimized');
    }

    root.innerHTML = `
      <div class="drb-aff-header" id="drb-aff-drag-handle">
        <div class="drb-aff-brand">
          <span>⚡ DrBank AFF</span>
          <span class="drb-aff-version">v${ns.getVersion()}</span>
          <span class="drb-aff-badge-platform">Scout</span>
        </div>
        <div class="drb-aff-header-actions">
          <button class="drb-aff-icon-btn" id="drb-btn-theme" title="สลับโหมด สว่าง/มืด">🌙</button>
          <button class="drb-aff-icon-btn" id="drb-btn-switch-sidepanel" title="สลับไปใช้ Chrome Side Panel (แถบข้าง)">📑</button>
          <button class="drb-aff-icon-btn" id="drb-btn-rescan" title="ดึงราคาและสเปกใหม่">↻</button>
          <button class="drb-aff-icon-btn" id="drb-btn-minimize" title="ย่อ/ขยาย">_</button>
        </div>
      </div>

      <div class="drb-aff-body">
        <!-- 1. แถบป้ายไฟจราจรสีสดทึบบนสุด: จุดคุ้มทุนแอด 100฿ สแกน 0.5 วิ รู้ทันที! -->
        <div class="drb-aff-breakeven-box" id="drb-breakeven-box" data-tier="warning">
          <span id="drb-breakeven-text">⚠️ [ไฟเหลือง] แอด 100฿ ต้องขายตรงปก: 0.0 ชิ้น ถึงคุ้มทุน</span>
        </div>

        <!-- 2. ชื่อสินค้า -->
        <div class="drb-aff-product-title" id="drb-hud-title">กำลังอ่านข้อมูลสินค้า...</div>

        <!-- 3. แถบ 3 ตัวกรองคุณเบล (Single-Line High-Contrast Signal Pills) -->
        <div class="drb-aff-checklist-bar" id="drb-checklist-bar">
          <span class="drb-aff-check-pill drb-aff-check-pill--green" id="drb-badge-sold">🟢🔥 ขายดี -</span>
          <span class="drb-aff-check-pill drb-aff-check-pill--green" id="drb-badge-extra">🟢✅ Extra 10%</span>
          <span class="drb-aff-check-pill drb-aff-check-pill--green" id="drb-badge-rating">🟢⭐ 4.9 (ส่งไทย)</span>
        </div>

        <!-- 4. ไฟจราจร 4 สีของการ์ดค่าคอม (High-Contrast Left Accent + Solid Badge) -->
        <div class="drb-aff-kpi-grid">
          <div class="drb-aff-kpi-card">
            <div class="drb-aff-kpi-label">ราคาขายจริง (THB)</div>
            <div class="drb-aff-kpi-val" id="drb-hud-price">฿0.00</div>
            <div class="drb-aff-kpi-sub" id="drb-hud-ids">Shop: - | Item: -</div>
          </div>
          <div class="drb-aff-kpi-card" id="drb-comm-card" data-tier="warning">
            <div class="drb-aff-kpi-label">ค่าคอม / ชิ้น (ตรง AFF)</div>
            <div class="drb-aff-kpi-val" id="drb-hud-net-comm">⚠️ ฿0.00</div>
            <div class="drb-aff-tier-badge" id="drb-hud-tier-badge">⚠️ คำนวณความคุ้มแอด...</div>
            <div class="drb-aff-kpi-sub" id="drb-hud-eff-rate">รวมเรท 0.0% (ตรงตามหน้า AFF)</div>
          </div>
        </div>

        <!-- 5. กล่องสเปก & รายละเอียดสินค้า (Default: Collapsed พับไว้แต่แรก) -->
        <div class="drb-aff-spec-box is-collapsed" id="drb-spec-box">
          <div class="drb-aff-spec-header" id="drb-spec-header">
            <span>📋 สเปก & รายละเอียดสินค้า</span>
            <div class="drb-aff-spec-actions">
              <button type="button" class="drb-aff-spec-toggle-btn" id="drb-btn-spec-expand" title="กางดูสเปกยาวขึ้น">▼ ยืด</button>
              <button type="button" class="drb-aff-spec-toggle-btn" id="drb-btn-spec-fold" title="พับเก็บ/เปิดกล่องสเปก">▼ เปิดสเปก</button>
            </div>
          </div>
          <div class="drb-aff-spec-body" id="drb-spec-body">กำลังดึงรายละเอียดสเปกสินค้า...</div>
        </div>

        <!-- ตัวเลือก SKU -->
        <div class="drb-aff-variants-wrap" id="drb-variants-section">
          <div class="drb-aff-variants-label">
            <span>ตัวเลือก SKU (คลิกเพื่อซิงก์ราคาหน้าเว็บ)</span>
            <span id="drb-variants-count">0 รายการ</span>
          </div>
          <div class="drb-aff-variants-list" id="drb-variants-list"></div>
        </div>

        <!-- ช่องจำลองราคาและเรทค่าคอม -->
        <div class="drb-aff-row">
          <div class="drb-aff-field">
            <label>ราคาคำนวณ (฿)</label>
            <input type="number" step="1" class="drb-aff-input" id="drb-inp-price" value="${currentState.price}">
          </div>
          <div class="drb-aff-field">
            <label>เพดาน Base Cap (฿)</label>
            <input type="number" step="10" class="drb-aff-input" id="drb-inp-cap" value="${currentState.capTHB}">
          </div>
        </div>

        <div class="drb-aff-row">
          <div class="drb-aff-field">
            <label>ค่าคอมพื้นฐาน (%)</label>
            <input type="number" step="0.1" class="drb-aff-input" id="drb-inp-base-rate" value="${currentState.baseRate}">
          </div>
          <div class="drb-aff-field">
            <label>ค่าคอม Extra / ร้าน (%)</label>
            <input type="number" step="0.5" class="drb-aff-input" id="drb-inp-extra-rate" value="${currentState.extraRate}">
          </div>
        </div>

        <table class="drb-aff-mini-table">
          <tbody>
            <tr>
              <td>ค่าคอมพื้นฐาน (Base) + พิเศษ (Extra):</td>
              <td id="drb-tbl-breakdown">฿0.00 + ฿0.00</td>
            </tr>
            <tr>
              <td>จุดคุ้มทุนแอด 100฿ (ต้องขายตรงปก):</td>
              <td id="drb-tbl-100" style="color:var(--drb-accent);font-weight:700;">0 ชิ้น/วัน</td>
            </tr>
          </tbody>
        </table>

        <!-- 5. ปุ่ม Action หลักปุ่มเดียว: ส่งเข้าคลัง Web UI & เตรียมปั้นโพสต์ -->
        <div class="drb-aff-btn-group">
          <button class="drb-aff-btn drb-aff-btn--primary drb-aff-btn--full" id="drb-btn-push-webui" style="padding:9px 12px;font-size:12.5px;">
            ⚡ ส่งเข้าคลัง Web UI & เตรียมปั้นโพสต์
          </button>
          <button class="drb-aff-btn drb-aff-btn--ghost" id="drb-btn-clean-url">✂️ ก๊อปลิงก์คลีน</button>
          <button class="drb-aff-btn drb-aff-btn--ghost" id="drb-btn-open-webui">🖥️ เปิดหน้า Web UI</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    ns.makeDraggable(root, document.getElementById('drb-aff-drag-handle'));
    bindHUDEvents(root);
    updateHUDValues();
  }

  function applyDisplayMode() {
    const root = document.getElementById('drb-aff-hud-root');
    if (!root) return;
    if (currentState.displayMode === 'sidepanel') {
      root.style.display = 'none';
    } else {
      root.style.display = '';
    }
  }

  function bindHUDEvents(root) {
    const themeBtn = document.getElementById('drb-btn-theme');
    ns.applyTheme(root, currentState.theme, themeBtn);
    themeBtn.addEventListener('click', async () => {
      currentState.theme = await ns.toggleTheme(root, currentState.theme, themeBtn);
    });

    document.getElementById('drb-btn-minimize').addEventListener('click', () => {
      root.classList.toggle('drb-aff-hud--minimized');
    });

    // Switch to Side Panel mode
    const spBtn = document.getElementById('drb-btn-switch-sidepanel');
    if (spBtn) {
      spBtn.addEventListener('click', async () => {
        currentState.displayMode = 'sidepanel';
        await ns.sendMessage('UPDATE_SETTINGS', { displayMode: 'sidepanel' });
        applyDisplayMode();
        ns.showToast('สลับเป็นโหมด Side Panel แล้ว (คลิกไอคอน Extension เพื่อเปิดแถบข้าง)');
      });
    }

    document.getElementById('drb-btn-rescan').addEventListener('click', () => {
      scrapeShopeeProductDOM();
      fetchRealSocialCommissionForCurrentProduct(true);
      updateHUDValues();
      ns.showToast('อัปเดตราคา, เรทจริง Social Media, สเปก และรูป HD ล่าสุดแล้ว');
    });

    // Collapsible 5-Line Spec Box Controls
    const specBox = document.getElementById('drb-spec-box');
    const expandBtn = document.getElementById('drb-btn-spec-expand');
    const foldBtn = document.getElementById('drb-btn-spec-fold');

    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      specBox.classList.remove('is-collapsed');
      const expanded = specBox.classList.toggle('is-expanded');
      expandBtn.textContent = expanded ? '▲ หด 5 บรรทัด' : '▼ ยืด';
      foldBtn.textContent = '▲ พับ';
    });

    foldBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      specBox.classList.remove('is-expanded');
      const collapsed = specBox.classList.toggle('is-collapsed');
      foldBtn.textContent = collapsed ? '▼ เปิดสเปก' : '▲ พับ';
      expandBtn.textContent = '▼ ยืด';
    });

    ['drb-inp-price', 'drb-inp-cap', 'drb-inp-base-rate', 'drb-inp-extra-rate'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          currentState.price = Number(document.getElementById('drb-inp-price').value) || 0;
          currentState.capTHB = Number(document.getElementById('drb-inp-cap').value) || 250;
          currentState.baseRate = Number(document.getElementById('drb-inp-base-rate').value) || 0;
          currentState.extraRate = Number(document.getElementById('drb-inp-extra-rate').value) || 0;
          recalculateDisplayOnly();
        });
      }
    });

    // Hero CTA: Push Winning SKU to Web UI Command Center
    document.getElementById('drb-btn-push-webui').addEventListener('click', async () => {
      scrapeShopeeProductDOM();
      const comm = ns.calculateCommission(currentState);
      const skuPayload = {
        id: `shopee_${currentState.shopId}_${currentState.itemId || Date.now()}`,
        platform: 'shopee',
        title: currentState.title,
        specText: currentState.specText,
        originalPrice: currentState.originalPrice || currentState.price,
        price: currentState.price,
        priceMax: currentState.priceMax,
        baseRate: currentState.baseRate,
        extraRate: currentState.extraRate,
        estimatedCommission: Number(comm.netComm.toFixed(2)),
        realDailyAdCostTHB: 100,
        breakEvenUnits: comm.breakEvenUnits,
        breakEvenOrders: comm.breakEvenOrders,
        viabilityTier: comm.tier,
        soldCount: currentState.soldCount,
        soldText: currentState.soldText,
        rating: currentState.rating,
        shipFrom: currentState.shipFrom,
        isOverseas: currentState.isOverseas,
        url: currentState.cleanUrl || location.href,
        shopId: currentState.shopId,
        itemId: currentState.itemId,
        imagesHD: currentState.imagesHD,
        variants: currentState.variants
      };

      const res = await ns.sendMessage('PUSH_SKU_TO_WEBUI', skuPayload);
      await navigator.clipboard.writeText(JSON.stringify(skuPayload, null, 2)).catch(() => {});
      const syncMsg = res?.syncedToServer
        ? '⚡ ส่งเข้าเซิร์ฟเวอร์ Web UI สำเร็จ!'
        : `⚡ เก็บลงคิว Web UI (${res?.totalQueued || 1} รายการ) + ก๊อป JSON แล้ว!`;
      ns.showToast(syncMsg);
    });

    document.getElementById('drb-btn-clean-url').addEventListener('click', async () => {
      await ns.copyText(currentState.cleanUrl || location.href, '✂️ คัดลอกลิงก์สินค้าแบบคลีนแล้ว!');
    });

    document.getElementById('drb-btn-open-webui').addEventListener('click', () => {
      const baseUrl = currentState.settings?.webUiBaseUrl || 'https://aff.doctorbankonline.com';
      window.open(baseUrl, '_blank', 'noopener');
    });
  }

  function updateHUDValues() {
    const titleEl = document.getElementById('drb-hud-title');
    if (!titleEl) return;
    titleEl.textContent = currentState.title;

    const specBody = document.getElementById('drb-spec-body');
    if (specBody) {
      specBody.textContent = currentState.specText || 'ไม่พบรายละเอียดสเปกเพิ่มเติม';
    }

    const priceInp = document.getElementById('drb-inp-price');
    if (priceInp) priceInp.value = currentState.price;
    const baseInp = document.getElementById('drb-inp-base-rate');
    if (baseInp) baseInp.value = currentState.baseRate;
    const extraInp = document.getElementById('drb-inp-extra-rate');
    if (extraInp) extraInp.value = currentState.extraRate;

    const idsEl = document.getElementById('drb-hud-ids');
    if (idsEl) {
      idsEl.textContent = `Shop: ${currentState.shopId || '-'} | Item: ${currentState.itemId || '-'} (${currentState.imagesHD.length} รูป HD)`;
    }

    const listEl = document.getElementById('drb-variants-list');
    const countEl = document.getElementById('drb-variants-count');
    if (listEl && countEl) {
      countEl.textContent = `${currentState.variants.length} รายการ`;
      listEl.innerHTML = '';
      currentState.variants.forEach((vName) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'drb-aff-variant-pill';
        pill.textContent = vName;
        pill.addEventListener('click', () => {
          document.querySelectorAll('.drb-aff-variant-pill').forEach((p) => p.classList.remove('active'));
          pill.classList.add('active');
          document.querySelectorAll('button').forEach((pageBtn) => {
            if ((pageBtn.textContent || '').trim() === vName) {
              pageBtn.click();
            }
          });
          setTimeout(() => {
            scrapeShopeeProductDOM();
            const inp = document.getElementById('drb-inp-price');
            if (inp) inp.value = currentState.price;
            recalculateDisplayOnly();
          }, 350);
        });
        listEl.appendChild(pill);
      });
    }

    recalculateDisplayOnly();
  }

  function renderChecklistBadges() {
    const soldBadge = document.getElementById('drb-badge-sold');
    if (soldBadge) {
      const sc = currentState.soldCount || 0;
      const sLabel = (currentState.soldText || sc.toLocaleString()).slice(0, 14);
      if (sc >= 1000) {
        soldBadge.className = 'drb-aff-check-pill drb-aff-check-pill--green';
        soldBadge.textContent = `🔥 ขายดี ${sLabel}`;
      } else if (sc >= 300) {
        soldBadge.className = 'drb-aff-check-pill drb-aff-check-pill--yellow';
        soldBadge.textContent = `⚠️ ยอดขาย ${sLabel}`;
      } else {
        soldBadge.className = 'drb-aff-check-pill drb-aff-check-pill--red';
        soldBadge.textContent = sc > 0 ? `❌ ขายต่ำ (${sLabel})` : `❌ ยอดขาย <300`;
      }
    }

    const extraBadge = document.getElementById('drb-badge-extra');
    if (extraBadge) {
      const ex = Number(currentState.extraRate) || 0;
      if (ex > 0) {
        extraBadge.className = 'drb-aff-check-pill drb-aff-check-pill--green';
        extraBadge.textContent = `✅ Extra ${ex}%`;
      } else {
        extraBadge.className = 'drb-aff-check-pill drb-aff-check-pill--red';
        extraBadge.textContent = `❌ ไร้ Extra 0%`;
      }
    }

    const ratingBadge = document.getElementById('drb-badge-rating');
    if (ratingBadge) {
      const r = Number(currentState.rating) || 4.9;
      const shipLoc = currentState.shipFrom || (currentState.isOverseas ? 'ส่งจากจีน' : 'ส่งในไทย');
      if (currentState.isOverseas) {
        ratingBadge.className = 'drb-aff-check-pill drb-aff-check-pill--yellow';
        ratingBadge.textContent = `⚠️ ส่งจากจีน (⭐${r.toFixed(1)})`;
      } else if (r >= 4.8) {
        ratingBadge.className = 'drb-aff-check-pill drb-aff-check-pill--green';
        ratingBadge.textContent = `⭐ ${r.toFixed(1)} (${shipLoc})`;
      } else if (r >= 4.6) {
        ratingBadge.className = 'drb-aff-check-pill drb-aff-check-pill--yellow';
        ratingBadge.textContent = `⚠️ ⭐${r.toFixed(1)} (${shipLoc})`;
      } else {
        ratingBadge.className = 'drb-aff-check-pill drb-aff-check-pill--red';
        ratingBadge.textContent = `❌ ดาวต่ำ ⭐${r.toFixed(1)}`;
      }
    }
  }

  function recalculateDisplayOnly() {
    renderChecklistBadges();

    const comm = ns.calculateCommission(currentState);
    const priceEl = document.getElementById('drb-hud-price');
    const commCard = document.getElementById('drb-comm-card');
    const netEl = document.getElementById('drb-hud-net-comm');
    const tierBadgeEl = document.getElementById('drb-hud-tier-badge');
    const effEl = document.getElementById('drb-hud-eff-rate');
    const breakEvenBox = document.getElementById('drb-breakeven-box');
    const breakEvenText = document.getElementById('drb-breakeven-text');
    const tblBreakdown = document.getElementById('drb-tbl-breakdown');
    const tbl100 = document.getElementById('drb-tbl-100');

    if (priceEl) priceEl.textContent = ns.formatTHB(currentState.price);
    if (commCard) commCard.setAttribute('data-tier', comm.tier);
    if (netEl) netEl.textContent = `${comm.tierEmoji || ''} ${ns.formatTHB(comm.netComm)}`;
    if (tierBadgeEl) tierBadgeEl.textContent = comm.tierLabel;
    if (effEl) {
      const srcTag = currentState.realRateVerified ? 'เรทจริง Social' : 'ประเมินหมวด';
      effEl.textContent = `${srcTag} ${comm.effectiveRate.toFixed(1)}%${comm.isCapped ? ' (ติด Cap)' : ''}`;
    }

    if (breakEvenBox && breakEvenText) {
      breakEvenBox.setAttribute('data-tier', comm.tier);
      breakEvenText.textContent = comm.bannerText;
    }

    if (tblBreakdown) {
      tblBreakdown.textContent = `${ns.formatTHB(comm.baseComm)}${comm.isCapped ? '(Cap)' : ''} + ${ns.formatTHB(comm.extraComm)}`;
    }
    if (tbl100) tbl100.textContent = `${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)`;
  }

  initShopeeHUD();
})();
