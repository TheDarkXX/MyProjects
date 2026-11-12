/**
 * DrBank AFF Scout v2.1.0 — Shopee Winning SKU Hunter HUD (High-Contrast Traffic Light Edition)
 * Features:
 *  - High-Contrast 3 Checklist Badges (Single-Line Locked: Sold | Extra Comm | Rating & Origin)
 *  - Collapsible 5-Line Product Spec & Description Box with Scrollbar + Expand/Fold buttons
 *  - Vivid 4-Tier Traffic-Light Net Commission Card & Solid Break-Even Banner (100฿ + VAT 7% = 107฿)
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
    whtRate: 3.0,
    realDailyAdCostTHB: 107,
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
    cleanUrl: ''
  };

  let shopeeGridState = {
    enabled: true,
    mode: 'all', // 'all' | 'win' | 'warn'
    rateMode: 'auto', // 'auto' | '15' | '10' | '20' | 'base_only'
    dimDanger: false, // Default: show ONLY Signal Pill, leave cards 100% normal
    hideDanger: false,
    counts: { total: 0, win: 0, warn: 0, danger: 0 }
  };

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
      currentState.whtRate = Number(s.withholdingTaxRate) || 3.0;
      currentState.theme = s.theme || 'light';
      currentState.displayMode = s.displayMode || 'sidepanel';
      const localRadar = await chrome.storage.local.get(['radarEnabled']);
      if (typeof localRadar.radarEnabled === 'boolean') {
        shopeeGridState.enabled = localRadar.radarEnabled;
      }
      document.body.classList.toggle('drb-aff-radar-off', !shopeeGridState.enabled);
    } catch (_e) {}

    if (isSingleProductUrl()) {
      scrapeShopeeProductDOM();
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
          } else {
            scanAndOverlayShopeeGrid();
          }
          sendResponse({
            ok: true,
            isGridPage: !isSingleProductUrl(),
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
    let gridTimer = null;
    const scheduleShopeeScan = () => {
      if (gridTimer) clearTimeout(gridTimer);
      gridTimer = setTimeout(() => {
        if (isSingleProductUrl()) {
          const oldTb = document.getElementById('drb-aff-grid-toolbar');
          if (oldTb) oldTb.remove();
          scrapeShopeeProductDOM();
          updateHUDValues();
        }
        scanAndOverlayShopeeGrid();
      }, 700);
    };

    const observer = new MutationObserver((mutations) => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        scheduleShopeeScan();
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

  function scanAndOverlayShopeeGrid() {
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
    let countTotal = 0;
    let countWin = 0;
    let countWarn = 0;
    let countDanger = 0;
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
        cardEl.setAttribute('data-drb-locked-price', String(price));
      }
      if (!price || price <= 0) return;

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

      // 5. Estimate Category Commission (A - F) — Match product title first, fallback to page searchContext
      const catEst = ns.estimateCategoryCommission(
        title,
        isMallOrPreferred,
        shopeeGridState.rateMode,
        searchContext
      );

      const comm = ns.calculateCommission({
        price,
        baseRate: catEst.baseRate,
        extraRate: catEst.extraRate,
        capTHB: 250,
        whtRate: 3.0,
        realDailyAdCostTHB: 107
      });

      // 6. Determine Card Tier (Net Commission Viability)
      let cardTier = 'danger';
      let pillEmoji = '⛔';
      let tierTitle = '⛔ ไฟแดง! ไม่คุ้มแอด 107฿';

      if (comm.netComm >= 80) {
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

      // Lock Card Signature: If already rendered with the exact same itemId + price + rateMode, DO NOT rebuild DOM!
      const scanSig = `${itemId || title.slice(0, 18)}_${price}_${catEst.catId}_${shopeeGridState.rateMode}`;
      const existingOv = cardEl.querySelector('.drb-aff-card-overlay');
      if (existingOv && cardEl.getAttribute('data-drb-sig') === scanSig) {
        cardEl.setAttribute('data-drb-tier', cardTier);
        return;
      }
      if (existingOv) existingOv.remove();
      cardEl.setAttribute('data-drb-sig', scanSig);

      const shortNet = comm.netComm >= 100 ? Math.round(comm.netComm) : comm.netComm.toFixed(1);
      const pillLabel = `${pillEmoji} ~฿${shortNet}`;
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
        baseRate: catEst.baseRate,
        extraRate: catEst.extraRate,
        categoryLabel: catEst.catLabel,
        soldCount,
        soldText,
        rating: 4.9,
        shipFrom: isOverseas ? 'ส่งจากจีน' : 'ส่งในไทย',
        isOverseas,
        shopId,
        itemId,
        cleanUrl,
        imagesHD: imgUrl ? [imgUrl] : [],
        specText:
          `[ประเมินจากหน้าค้นหา Shopee — ${catEst.catLabel}]\n` +
          `• สินค้า: ${title}\n` +
          `• ราคาขายจริง: ฿${price.toLocaleString()}\n` +
          `• หมวดหมู่ประเมิน: ${catEst.catLabel} (Base ${catEst.baseRate}% + Extra ${catEst.extraRate}% = ~${catEst.totalRate}%)\n` +
          `• คอมสุทธิประเมิน: ~฿${comm.netComm.toFixed(2)} / ชิ้น\n` +
          `• จุดคุ้มทุนแอด 107฿: ~${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)\n` +
          `• ยอดขายจริงบนการ์ด: ${soldText} ชิ้น (${isOverseas ? 'ส่งจากต่างประเทศ' : 'ส่งในไทย'})`
      };

      cardEl.classList.add('drb-aff-grid-card');
      cardEl.setAttribute('data-drb-tier', cardTier);

      const affOfferUrl = itemId
        ? `https://affiliate.shopee.co.th/offer/product_offer/${itemId}`
        : `https://affiliate.shopee.co.th/offer/product_offer`;

      const ov = document.createElement('div');
      ov.className = 'drb-aff-card-overlay';
      ov.setAttribute('data-tier', cardTier);
      ov.innerHTML = `
        <div class="drb-aff-card-pill" title="ค่าคอมประเมินตามหมวด (${catEst.catLabel}) — ชี้เพื่อดูรายละเอียด หรือคลิกเพื่อดึงเข้า Side Panel">
          <span>${pillLabel}</span>
        </div>
        <div class="drb-aff-card-tooltip">
          <div class="drb-aff-card-tooltip-inner">
            <div class="drb-aff-tt-title">${tierTitle}</div>
            <div class="drb-aff-tt-row">
              <span>🏷️ หมวด:</span>
              <strong>${catEst.catLabel} (~${catEst.totalRate}%)</strong>
            </div>
            <div class="drb-aff-tt-row">
              <span>💰 คอมประเมิน:</span>
              <strong>~${ns.formatTHB(comm.netComm)} / ชิ้น</strong>
            </div>
            <div class="drb-aff-tt-row">
              <span>🎯 คุ้มแอด 107฿:</span>
              <strong>~${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)</strong>
            </div>
            <div class="drb-aff-tt-row">
              <span>📦 ยอดขาย:</span>
              <span>${soldStatusLabel}${isOverseas ? ' ⚠️จีน' : ''}</span>
            </div>
            <div class="drb-aff-card-btn-group">
              <button type="button" class="drb-aff-card-pick-btn">⚡ ดึงเข้า Side Panel & Web UI</button>
              <button type="button" class="drb-aff-card-aff-btn">🔍 เช็คเรทจริงหน้า AFF (1-Click)</button>
            </div>
          </div>
        </div>
      `;

      const handlePickShopeeCard = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentState = { ...currentState, ...cardProductPayload };
        updateHUDValues();
        try {
          await chrome.storage.local.set({ activeShopeeGridProduct: cardProductPayload });
          await ns.sendMessage('PUSH_SKU_TO_WEBUI', {
            id: `shopee_${shopId}_${itemId || Date.now()}`,
            platform: 'shopee',
            sourceTab: `Shopee Grid (${catEst.catLabel})`,
            title: cardProductPayload.title,
            specText: cardProductPayload.specText,
            price: cardProductPayload.price,
            baseRate: cardProductPayload.baseRate,
            extraRate: cardProductPayload.extraRate,
            estimatedCommission: Number(comm.netComm.toFixed(2)),
            realDailyAdCostTHB: 107,
            breakEvenUnits: comm.breakEvenUnits,
            breakEvenOrders: comm.breakEvenOrders,
            adViabilityTier: comm.tier,
            cleanUrl: cardProductPayload.cleanUrl,
            imagesHD: cardProductPayload.imagesHD,
            scrapedAt: new Date().toISOString()
          });
        } catch (_err) {}
        ns.showToast(`⚡ ดึง "${title.slice(0, 24)}..." (~${ns.formatTHB(comm.netComm)}) เข้า Side Panel แล้ว!`);
      };

      const pickBtn = ov.querySelector('.drb-aff-card-pick-btn');
      const pillEl = ov.querySelector('.drb-aff-card-pill');
      const affBtn = ov.querySelector('.drb-aff-card-aff-btn');

      if (pickBtn) pickBtn.addEventListener('click', handlePickShopeeCard);
      if (pillEl) pillEl.addEventListener('click', handlePickShopeeCard);
      if (affBtn) {
        affBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(affOfferUrl, '_blank', 'noopener');
        });
      }

      cardEl.appendChild(ov);
    });

    shopeeGridState.counts = {
      total: countTotal,
      win: countWin,
      warn: countWarn,
      danger: countDanger
    };

    if (!isSingleProductUrl() && countTotal > 0) {
      renderOrUpdateShopeeGridToolbar(firstGridContainer);
      applyShopeeGridFilterClasses();
    }

    return countTotal;
  }

  function renderOrUpdateShopeeGridToolbar(gridContainerEl) {
    let tb = document.getElementById('drb-aff-grid-toolbar');
    if (!tb) {
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
    document.body.classList.toggle('drb-aff-radar-off', !isOn);

    const tbSig = `${isOn}_${c.total}_${c.win}_${c.warn}_${c.danger}_${shopeeGridState.mode}_${shopeeGridState.rateMode}_${shopeeGridState.dimDanger}_${shopeeGridState.hideDanger}`;
    if (tb.getAttribute('data-tb-sig') === tbSig) return;
    tb.setAttribute('data-tb-sig', tbSig);

    tb.innerHTML = `
      <div class="drb-grid-tb-left">
        <button type="button" class="drb-grid-power-btn ${isOn ? '' : 'is-off'}" id="drb-btn-toggle-radar" title="เปิด/ปิด การแสดงป้าย Signal บนการ์ดทั้งหมด">
          ${isOn ? '🟢 เรดาร์: เปิด' : '⚪ เรดาร์: ปิด'}
        </button>
        <span class="drb-grid-tb-title">⚡ DrBank Category Radar (แอด 107฿/วัน)</span>
        <span class="drb-grid-tb-summary" style="${isOn ? '' : 'opacity:0.5;'}">
          สแกนพบ <strong>${c.total}</strong> ชิ้น:
          🔥✅ น่าลุย <strong>${c.win}</strong> |
          ⚠️ พอไหว <strong>${c.warn}</strong> |
          ⛔ ไม่คุ้มแอด <strong>${c.danger}</strong>
        </span>
        <select class="drb-grid-rate-select" id="drb-shopee-rate-mode" title="เลือกโหมดประเมินเรทค่าคอมมิชชั่น" ${isOn ? '' : 'disabled'}>
          <option value="auto" ${shopeeGridState.rateMode === 'auto' ? 'selected' : ''}>🤖 Auto แยกตามหมวด A-F</option>
          <option value="15" ${shopeeGridState.rateMode === '15' ? 'selected' : ''}>🎯 ล็อกเรทรวม 15%</option>
          <option value="10" ${shopeeGridState.rateMode === '10' ? 'selected' : ''}>🎯 ล็อกเรทรวม 10%</option>
          <option value="20" ${shopeeGridState.rateMode === '20' ? 'selected' : ''}>🔥 ล็อกเรทรวม 20%</option>
          <option value="base_only" ${shopeeGridState.rateMode === 'base_only' ? 'selected' : ''}>⚠️ เฉพาะ Base 2.5% (ไร้ Extra)</option>
        </select>
      </div>
      <div class="drb-grid-tb-actions" style="${isOn ? '' : 'display:none;'}">
        <button type="button" class="drb-grid-filter-btn ${shopeeGridState.mode === 'all' && !shopeeGridState.dimDanger && !shopeeGridState.hideDanger ? 'active' : ''}" id="drb-btn-reset-default" title="ค่าเริ่มต้น: โชว์เฉพาะป้าย Signal มุมขวา ไม่ดรอปแสง ไม่ซ่อนการ์ด">
          🔄 ค่าเริ่มต้น: โชว์เฉพาะป้าย (${c.total})
        </button>
        <button type="button" class="drb-grid-filter-btn drb-grid-filter-btn--green ${shopeeGridState.mode === 'win' ? 'active' : ''}" data-mode="win">
          🔥✅ เฉพาะตัวน่าลุย (${c.win})
        </button>
        <button type="button" class="drb-grid-filter-btn ${shopeeGridState.mode === 'warn' ? 'active' : ''}" data-mode="warn">
          ⚠️ พอไหว >=฿20 (${c.win + c.warn})
        </button>
        <button type="button" class="drb-grid-filter-btn ${shopeeGridState.dimDanger ? 'active' : ''}" id="drb-btn-toggle-dim">
          💡 ดรอปแสงไฟแดง: ${shopeeGridState.dimDanger ? 'เปิด' : 'ปิด'}
        </button>
        <button type="button" class="drb-grid-filter-btn ${shopeeGridState.hideDanger ? 'active' : ''}" id="drb-btn-toggle-hide">
          ⛔ ซ่อนไฟแดง (${c.danger})
        </button>
      </div>
    `;

    const powerBtn = tb.querySelector('#drb-btn-toggle-radar');
    if (powerBtn) {
      powerBtn.addEventListener('click', async () => {
        shopeeGridState.enabled = !shopeeGridState.enabled;
        document.body.classList.toggle('drb-aff-radar-off', !shopeeGridState.enabled);
        try {
          await chrome.storage.local.set({ radarEnabled: shopeeGridState.enabled });
        } catch (_e) {}
        renderOrUpdateShopeeGridToolbar(gridContainerEl);
        applyShopeeGridFilterClasses();
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

  function scrapeShopeeProductDOM() {
    const parsed = ns.parseShopeeIds(location.href);
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

    // Auto-estimate Category Commission (A - F) from title
    if (ns.estimateCategoryCommission && currentState.title) {
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
        <!-- 1. แถบป้ายไฟจราจรสีสดทึบบนสุด: จุดคุ้มทุนแอด 100฿ (+VAT 7% = 107฿) สแกน 0.5 วิ รู้ทันที! -->
        <div class="drb-aff-breakeven-box" id="drb-breakeven-box" data-tier="warning">
          <span id="drb-breakeven-text">⚠️ [ไฟเหลือง] แอด 107฿ ต้องขายตรงปก: 0.0 ชิ้น ถึงคุ้มทุน</span>
        </div>

        <!-- 2. ชื่อสินค้า -->
        <div class="drb-aff-product-title" id="drb-hud-title">กำลังอ่านข้อมูลสินค้า...</div>

        <!-- 3. แถบ 3 ตัวกรองคุณเบล (Single-Line High-Contrast Signal Pills) -->
        <div class="drb-aff-checklist-bar" id="drb-checklist-bar">
          <span class="drb-aff-check-pill drb-aff-check-pill--green" id="drb-badge-sold">🟢🔥 ขายดี -</span>
          <span class="drb-aff-check-pill drb-aff-check-pill--green" id="drb-badge-extra">🟢✅ Extra 10%</span>
          <span class="drb-aff-check-pill drb-aff-check-pill--green" id="drb-badge-rating">🟢⭐ 4.9 (ส่งไทย)</span>
        </div>

        <!-- 4. ไฟจราจร 4 สีของการ์ดค่าคอมสุทธิ (High-Contrast Left Accent + Solid Badge) -->
        <div class="drb-aff-kpi-grid">
          <div class="drb-aff-kpi-card">
            <div class="drb-aff-kpi-label">ราคาขายจริง (THB)</div>
            <div class="drb-aff-kpi-val" id="drb-hud-price">฿0.00</div>
            <div class="drb-aff-kpi-sub" id="drb-hud-ids">Shop: - | Item: -</div>
          </div>
          <div class="drb-aff-kpi-card" id="drb-comm-card" data-tier="warning">
            <div class="drb-aff-kpi-label">ค่าคอมสุทธิ / ชิ้น</div>
            <div class="drb-aff-kpi-val" id="drb-hud-net-comm">⚠️ ฿0.00</div>
            <div class="drb-aff-tier-badge" id="drb-hud-tier-badge">⚠️ คำนวณความคุ้มแอด...</div>
            <div class="drb-aff-kpi-sub" id="drb-hud-eff-rate">รวมเรท 0.0% (หักภาษี 3%)</div>
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
              <td>จุดคุ้มทุนแอด 107฿ (ต้องขายตรงปก):</td>
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
      updateHUDValues();
      ns.showToast('อัปเดตราคา, ยอดขาย, สเปก และรูป HD ล่าสุดแล้ว');
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
        realDailyAdCostTHB: 107,
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
      const baseUrl = currentState.settings?.webUiBaseUrl || 'http://localhost:3000';
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
      effEl.textContent = `เรทรวม ${comm.effectiveRate.toFixed(1)}%${comm.isCapped ? ' (ติด Cap)' : ''}`;
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
