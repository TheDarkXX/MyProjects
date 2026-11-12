/**
 * DrBank AFF Scout v2.5.0 — Shopee Affiliate Offer Detail, Grid Signal Radar & Report Engine
 * Works on https://affiliate.shopee.co.th/*
 * Features:
 *  1. Product Offer Grid Signal Overlay (แปะป้ายไฟจราจร + คำนวณคอมสุทธิ & จุดคุ้มทุน 107฿ บนการ์ดทุกใบ)
 *  2. Interactive Filter Toolbar above Grid (กรองเฉพาะไฟเขียว/ม่วง, ดรอปแสง/ซ่อนการ์ดไฟแดง)
 *  3. Product Offer Detail Page Real Commission Table Scraper
 *  4. Conversion Report Table Bridge
 */

(function () {
  const ns = window.DrBankAFF;
  if (!ns) return;

  let offerProduct = {
    sourceType: 'affiliate_offer',
    title: '',
    price: 0,
    originalPrice: 0,
    baseRate: 2.0,
    extraRate: 0.0,
    baseCommTHB: 0,
    extraCommTHB: 0,
    grossCommTHB: 0,
    capTHB: 250,
    whtRate: 3.0,
    shopId: '',
    itemId: '',
    cleanUrl: '',
    imagesHD: [],
    variants: [],
    soldCount: 0,
    soldText: '',
    rating: 4.9,
    shipFrom: 'ส่งในไทย',
    isOverseas: false,
    specText: '',
    channelRows: []
  };

  let gridFilterState = {
    enabled: true,
    mode: 'all', // 'all' | 'win' | 'warn'
    dimDanger: false, // Default: show ONLY Signal Pill, leave cards 100% normal
    hideDanger: false,
    counts: { total: 0, win: 0, warn: 0, danger: 0 }
  };

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['radarEnabled']).then((res) => {
      if (typeof res.radarEnabled === 'boolean') {
        gridFilterState.enabled = res.radarEnabled;
        document.body?.classList.toggle('drb-aff-radar-off', !gridFilterState.enabled);
      }
    }).catch(() => {});
  }

  let reportStats = {
    totalCommission: 0,
    netCommission: 0,
    orderCount: 0,
    rows: [],
    dateLabel: new Date().toISOString().slice(0, 10)
  };

  function isOfferDetailUrl(url = location.href) {
    return /\/offer\/product_offer\/\d+/i.test(url);
  }

  function isOfferGridUrl(url = location.href) {
    return /\/offer\//i.test(url) && !isOfferDetailUrl(url);
  }

  // ==========================================================================
  // 1. PRODUCT OFFER GRID — SIGNAL OVERLAY & FILTER RADAR
  // ==========================================================================
  function scanAndOverlayOfferGrid() {
    if (isOfferDetailUrl()) return 0;

    const rateLeafNodes = [];
    document.querySelectorAll('div, span, p').forEach((el) => {
      if (el.children.length <= 1 && !el.closest('.drb-aff-card-overlay, #drb-aff-grid-toolbar')) {
        const txt = (el.textContent || '').trim();
        if (txt.length <= 45 && /อัตราค่าคอมมิชชั[น่น]\s*[0-9]+(?:\.[0-9]+)?\s*%/i.test(txt)) {
          rateLeafNodes.push(el);
        }
      }
    });

    if (rateLeafNodes.length === 0) return 0;

    const cardElements = new Set();
    rateLeafNodes.forEach((leaf) => {
      let curr = leaf.parentElement;
      let bestCard = null;
      for (let depth = 0; depth < 8 && curr && curr !== document.body; depth++) {
        // Count how many commission labels exist inside this ancestor (works even when display:none)
        const cloneTxt = curr.textContent || '';
        const matches = cloneTxt.match(/อัตราค่าคอมมิชชั[น่น]/g) || [];
        if (matches.length === 1) {
          bestCard = curr;
        } else if (matches.length > 1) {
          break;
        }
        curr = curr.parentElement;
      }
      if (bestCard) cardElements.add(bestCard);
    });

    if (cardElements.size === 0) return 0;

    let countTotal = 0;
    let countWin = 0;
    let countWarn = 0;
    let countDanger = 0;
    let firstCardParentGrid = null;

    cardElements.forEach((cardEl) => {
      if (!firstCardParentGrid && cardEl.parentElement) {
        firstCardParentGrid = cardEl.parentElement;
      }

      // Extract leaf lines ignoring our overlay and crossed-out prices (100% immune to display:none!)
      const leafLines = [];
      cardEl.querySelectorAll('*').forEach((el) => {
        if (el.closest('.drb-aff-card-overlay, del, s, [class*="line-through"]')) return;
        if (el.children.length === 0) {
          const t = (el.textContent || '').trim();
          if (t) leafLines.push(t);
        }
      });
      const rawText = leafLines.join('\n');

      // 1. Commission Rate (%)
      const mRate = rawText.match(/อัตราค่าคอมมิชชั[น่น]\s*([0-9]+(?:\.[0-9]+)?)\s*%/i);
      const totalRate = mRate ? parseFloat(mRate[1]) || 0 : 0;

      // 2. Price (฿)
      const mPrice = rawText.match(/฿\s*\n?\s*([0-9,]+(?:\.[0-9]{2})?)(?!\.[0-9])/);
      const price = mPrice ? ns.parsePriceNumber(mPrice[1]) : 0;

      // 3. Sold Count ("ขายได้ 4หมื่น+ ชิ้น")
      const mSold = rawText.match(/ขาย(?:ได้|แล้ว)\s*([0-9.,]+\s*(?:พัน|หมื่น|แสน|ล้าน|k|m)?\+?)/i);
      const soldText = mSold ? mSold[1].trim().slice(0, 14) : '0';
      const soldCount = mSold ? ns.parseSoldCount(soldText) : 0;

      // 4. Title
      const lines = leafLines.filter(
        (l) => l.length >= 8 && !/^ลด\s*\d+%|อัตราค่าคอมมิชชั|ขายได้|เอา\s*ลิงก์|^฿|^Mall$|^ร้านแนะนำ$/i.test(l)
      );
      const title = lines[0] || 'Shopee Offer Product';

      // 5. Split totalRate into Shopee Base (~2%) + EXTRACOMM
      const baseRate = totalRate > 3.5 ? 2.0 : totalRate;
      const extraRate = totalRate > 3.5 ? +(totalRate - 2.0).toFixed(2) : 0;

      const comm = ns.calculateCommission({
        price,
        baseRate,
        extraRate,
        capTHB: 250,
        whtRate: 3.0,
        realDailyAdCostTHB: 107
      });

      // 6. Determine Card Signal Tier by Net Commission Viability (Ad 107฿/day)
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

      const shortNet = comm.netComm >= 100 ? Math.round(comm.netComm) : comm.netComm.toFixed(1);
      const pillLabel = `${pillEmoji} ฿${shortNet}`;
      const soldStatusLabel =
        soldCount >= 1000
          ? `🔥 ขายดี ${soldText} ชิ้น`
          : soldCount > 0
          ? `⚠️ ขายได้ ${soldText} ชิ้น (<1พัน)`
          : `ℹ️ หน้าการ์ดไม่ระบุยอดขาย`;

      // Extract image & link if present
      const imgEl = cardEl.querySelector('img[src*="susercontent.com"]');
      const imgUrl = imgEl ? (imgEl.getAttribute('src') || '').replace(/_tn$/i, '') : '';
      const linkEl = cardEl.querySelector('a[href]');
      const cardHref = linkEl ? linkEl.href : location.href;
      const itemMatch = cardHref.match(/product_offer\/(\d+)/);
      const itemId = itemMatch ? itemMatch[1] : '';

      const cardProductPayload = {
        sourceType: 'affiliate_grid_card',
        title,
        price,
        originalPrice: price,
        baseRate,
        extraRate,
        baseCommTHB: comm.baseComm,
        extraCommTHB: comm.extraComm,
        grossCommTHB: comm.grossComm,
        capTHB: 250,
        whtRate: 3.0,
        shopId: '',
        itemId,
        cleanUrl: cardHref,
        imagesHD: imgUrl ? [imgUrl] : [],
        variants: [],
        soldCount,
        soldText,
        rating: 4.9,
        shipFrom: 'ส่งในไทย',
        isOverseas: false,
        specText:
          `[เลือกจากการ์ดข้อเสนอ Shopee Affiliate]\n` +
          `• สินค้า: ${title}\n` +
          `• ราคาขายจริง: ฿${price.toLocaleString()}\n` +
          `• อัตราค่าคอมรวม: ${totalRate}% (สุทธิ ฿${comm.netComm.toFixed(2)}/ชิ้น)\n` +
          `• จุดคุ้มทุนแอด 107฿: ${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)\n` +
          `• ยอดขายสะสม: ${soldText} ชิ้น`
      };

      // Style Card Container
      cardEl.classList.add('drb-aff-grid-card');
      cardEl.setAttribute('data-drb-tier', cardTier);

      const scanSig = `${itemId || title.slice(0, 18)}_${price}_${totalRate}`;
      const existingOverlay = cardEl.querySelector('.drb-aff-card-overlay');
      if (existingOverlay && cardEl.getAttribute('data-drb-sig') === scanSig) {
        return;
      }
      if (existingOverlay) existingOverlay.remove();
      cardEl.setAttribute('data-drb-sig', scanSig);

      // Build Compact Corner Signal Pill + Hover Popover Tooltip
      const ov = document.createElement('div');
      ov.className = 'drb-aff-card-overlay';
      ov.setAttribute('data-tier', cardTier);
      ov.innerHTML = `
        <div class="drb-aff-card-pill" title="เอาเมาส์ชี้เพื่อดูจุดคุ้มทุนแอด 107฿ หรือคลิกเพื่อดึงเข้า Side Panel">
          <span>${pillLabel}</span>
        </div>
        <div class="drb-aff-card-tooltip">
          <div class="drb-aff-card-tooltip-inner">
            <div class="drb-aff-tt-title">${tierTitle}</div>
            <div class="drb-aff-tt-row">
              <span>💰 คอมสุทธิ:</span>
              <strong>${ns.formatTHB(comm.netComm)} / ชิ้น (${totalRate}%)</strong>
            </div>
            <div class="drb-aff-tt-row">
              <span>🎯 คุ้มแอด 107฿:</span>
              <strong>${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)</strong>
            </div>
            <div class="drb-aff-tt-row">
              <span>📦 ยอดขาย:</span>
              <span>${soldStatusLabel}</span>
            </div>
            <button type="button" class="drb-aff-card-pick-btn">⚡ ดึงเข้า Side Panel & Web UI</button>
          </div>
        </div>
      `;

      const handlePickCard = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        offerProduct = cardProductPayload;
        try {
          await chrome.storage.local.set({ activeAffOfferProduct: cardProductPayload });
          await ns.sendMessage('PUSH_SKU_TO_WEBUI', {
            id: `shopee_aff_${itemId || Date.now()}`,
            platform: 'shopee',
            sourceTab: 'Affiliate Grid',
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
        ns.showToast(`⚡ ดึง "${title.slice(0, 26)}..." (สุทธิ ${ns.formatTHB(comm.netComm)}) เข้า Side Panel แล้ว!`);
      };

      const pickBtn = ov.querySelector('.drb-aff-card-pick-btn');
      const pillEl = ov.querySelector('.drb-aff-card-pill');
      if (pickBtn) pickBtn.addEventListener('click', handlePickCard);
      if (pillEl) pillEl.addEventListener('click', handlePickCard);

      cardEl.appendChild(ov);
    });

    gridFilterState.counts = {
      total: countTotal,
      win: countWin,
      warn: countWarn,
      danger: countDanger
    };

    renderOrUpdateGridToolbar(firstCardParentGrid);
    applyGridFilterClasses();
    return countTotal;
  }

  function renderOrUpdateGridToolbar(gridParentEl) {
    let tb = document.getElementById('drb-aff-grid-toolbar');
    if (!tb && gridParentEl && gridParentEl.parentElement) {
      tb = document.createElement('div');
      tb.id = 'drb-aff-grid-toolbar';
      gridParentEl.parentElement.insertBefore(tb, gridParentEl);
    }
    if (!tb) return;

    const c = gridFilterState.counts;
    const isOn = gridFilterState.enabled;
    document.body.classList.toggle('drb-aff-radar-off', !isOn);

    tb.innerHTML = `
      <div class="drb-grid-tb-left">
        <button type="button" class="drb-grid-v1-launch-btn" id="drb-btn-open-v1-scanner" title="เปิดตารางค้นหาสินค้า V1 Realtime (ดูดรวดเดียว 500 ชิ้น + คำนวณ Signal จุดคุ้มทุนแอด 107฿)">
          🚀 เปิดตารางค้นหา V1 Realtime (500 ชิ้น + Signal 107฿)
        </button>
        <button type="button" class="drb-grid-power-btn ${isOn ? '' : 'is-off'}" id="drb-btn-toggle-radar" title="เปิด/ปิด การแสดงป้าย Signal บนการ์ดทั้งหมด">
          ${isOn ? '🟢 เรดาร์: เปิด' : '⚪ เรดาร์: ปิด'}
        </button>
        <span class="drb-grid-tb-title">⚡ DrBank Signal Radar (แอด 107฿/วัน)</span>
        <span class="drb-grid-tb-summary" style="${isOn ? '' : 'opacity:0.5;'}">
          สแกนพบ <strong>${c.total}</strong> ชิ้น:
          🔥✅ น่าลุย <strong>${c.win}</strong> |
          ⚠️ พอไหว <strong>${c.warn}</strong> |
          ⛔ ไม่คุ้มแอด <strong>${c.danger}</strong>
        </span>
      </div>
      <div class="drb-grid-tb-actions" style="${isOn ? '' : 'display:none;'}">
        <button type="button" class="drb-grid-filter-btn ${gridFilterState.mode === 'all' && !gridFilterState.dimDanger && !gridFilterState.hideDanger ? 'active' : ''}" id="drb-btn-reset-default" title="ค่าเริ่มต้น: โชว์เฉพาะป้าย Signal มุมขวา ไม่ดรอปแสง ไม่ซ่อนการ์ด">
          🔄 ค่าเริ่มต้น: โชว์เฉพาะป้าย (${c.total})
        </button>
        <button type="button" class="drb-grid-filter-btn drb-grid-filter-btn--green ${gridFilterState.mode === 'win' ? 'active' : ''}" data-mode="win">
          🔥✅ เฉพาะตัวน่าลุย (${c.win})
        </button>
        <button type="button" class="drb-grid-filter-btn ${gridFilterState.mode === 'warn' ? 'active' : ''}" data-mode="warn">
          ⚠️ พอไหว >=฿20 (${c.win + c.warn})
        </button>
        <button type="button" class="drb-grid-filter-btn ${gridFilterState.dimDanger ? 'active' : ''}" id="drb-btn-toggle-dim">
          💡 ดรอปแสงไฟแดง: ${gridFilterState.dimDanger ? 'เปิด' : 'ปิด'}
        </button>
        <button type="button" class="drb-grid-filter-btn ${gridFilterState.hideDanger ? 'active' : ''}" id="drb-btn-toggle-hide">
          ⛔ ซ่อนไฟแดง (${c.danger})
        </button>
      </div>
    `;

    const v1Btn = tb.querySelector('#drb-btn-open-v1-scanner');
    if (v1Btn) {
      v1Btn.addEventListener('click', () => {
        openV1ScannerModal();
      });
    }

    const powerBtn = tb.querySelector('#drb-btn-toggle-radar');
    if (powerBtn) {
      powerBtn.addEventListener('click', async () => {
        gridFilterState.enabled = !gridFilterState.enabled;
        document.body.classList.toggle('drb-aff-radar-off', !gridFilterState.enabled);
        try {
          await chrome.storage.local.set({ radarEnabled: gridFilterState.enabled });
        } catch (_e) {}
        renderOrUpdateGridToolbar(gridParentEl);
        applyGridFilterClasses();
      });
    }

    const resetBtn = tb.querySelector('#drb-btn-reset-default');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        gridFilterState.mode = 'all';
        gridFilterState.dimDanger = false;
        gridFilterState.hideDanger = false;
        renderOrUpdateGridToolbar(gridParentEl);
        applyGridFilterClasses();
      });
    }

    tb.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const clickedMode = btn.getAttribute('data-mode');
        gridFilterState.mode = gridFilterState.mode === clickedMode ? 'all' : clickedMode;
        renderOrUpdateGridToolbar(gridParentEl);
        applyGridFilterClasses();
      });
    });

    const dimBtn = tb.querySelector('#drb-btn-toggle-dim');
    if (dimBtn) {
      dimBtn.addEventListener('click', () => {
        gridFilterState.dimDanger = !gridFilterState.dimDanger;
        renderOrUpdateGridToolbar(gridParentEl);
        applyGridFilterClasses();
      });
    }

    const hideBtn = tb.querySelector('#drb-btn-toggle-hide');
    if (hideBtn) {
      hideBtn.addEventListener('click', () => {
        gridFilterState.hideDanger = !gridFilterState.hideDanger;
        renderOrUpdateGridToolbar(gridParentEl);
        applyGridFilterClasses();
      });
    }
  }

  function applyGridFilterClasses() {
    document.querySelectorAll('.drb-aff-grid-card').forEach((cardEl) => {
      const tier = cardEl.getAttribute('data-drb-tier');
      cardEl.classList.remove('drb-aff-grid-card--dim', 'drb-aff-grid-card--hidden');
      if (!gridFilterState.enabled) return;

      if (tier === 'danger' && gridFilterState.dimDanger) {
        cardEl.classList.add('drb-aff-grid-card--dim');
      }

      if (gridFilterState.hideDanger && tier === 'danger') {
        cardEl.classList.add('drb-aff-grid-card--hidden');
        return;
      }

      if (gridFilterState.mode === 'win' && tier !== 'god' && tier !== 'pass') {
        cardEl.classList.add('drb-aff-grid-card--hidden');
      } else if (gridFilterState.mode === 'warn' && tier === 'danger') {
        cardEl.classList.add('drb-aff-grid-card--hidden');
      }
    });
  }

  // ==========================================================================
  // 2. PRODUCT OFFER DETAIL PAGE SCRAPER (affiliate.shopee.co.th/offer/product_offer/<id>)
  // ==========================================================================
  function scrapeOfferDetailPage() {
    const bodyText = document.body ? document.body.innerText || '' : '';

    let foundTitle = '';
    let foundPrice = 0;
    let foundSoldText = '';
    let foundSoldNum = 0;
    let foundRating = 0;
    let foundShopId = '';
    let foundItemId = '';
    let foundCleanUrl = location.href;

    const urlIdMatch = location.href.match(/product_offer\/(\d+)/);
    if (urlIdMatch) {
      foundItemId = urlIdMatch[1];
    }

    document.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (/shopee\.co\.th/i.test(href) && !/affiliate\.shopee\.co\.th/i.test(href)) {
        const parsed = ns.parseShopeeIds(href);
        if (parsed.shopId) foundShopId = parsed.shopId;
        if (parsed.itemId) foundItemId = parsed.itemId;
        if (parsed.cleanUrl) foundCleanUrl = parsed.cleanUrl;
      }
    });

    let cardSection = bodyText;
    const idxCardStart = bodyText.indexOf('รายละเอียดข้อเสนอสินค้า');
    const idxTableStart = bodyText.indexOf('รายละเอียดข้อเสนอ', idxCardStart >= 0 ? idxCardStart + 20 : 0);
    if (idxCardStart !== -1 && idxTableStart !== -1 && idxTableStart > idxCardStart) {
      cardSection = bodyText.slice(idxCardStart, idxTableStart);
    } else if (idxCardStart !== -1) {
      cardSection = bodyText.slice(idxCardStart, idxCardStart + 900);
    }

    const cardLines = cardSection
      .split(/[\r\n]+/)
      .map((l) => l.replace(/\s*ดูสินค้า\s*$/i, '').trim())
      .filter((l) => l.length > 0);

    for (const line of cardLines) {
      if (
        line.length >= 10 &&
        !/^รายละเอียดข้อเสนอ|^หน้าหลัก|^ข้อเสนอ|^เอา\s*ลิงก์|^ขายได้|^฿/i.test(line) &&
        !/^[0-5]\.[0-9]\s*\|/.test(line)
      ) {
        foundTitle = line;
        break;
      }
    }

    const mSold =
      cardSection.match(/ขาย(?:ได้|แล้ว)\s*([0-9.,]+\s*(?:พัน|หมื่น|แสน|ล้าน|k|m)?\+?)/i) ||
      bodyText.match(/ขาย(?:ได้|แล้ว)\s*([0-9.,]+\s*(?:พัน|หมื่น|แสน|ล้าน|k|m)?\+?)/i);
    if (mSold && mSold[1]) {
      foundSoldText = mSold[1].trim().slice(0, 14);
      foundSoldNum = ns.parseSoldCount(foundSoldText);
    }

    const mRating =
      cardSection.match(/([1-5]\.[0-9])\s*(?:\||ขายได้|ขายแล้ว)/i) ||
      cardSection.match(/(?:^|\s)([345]\.[0-9])(?:\s|$)/m);
    if (mRating && mRating[1]) {
      foundRating = parseFloat(mRating[1]) || 4.9;
    }

    const mPrice = cardSection.match(/฿\s*([0-9,]+(?:\.[0-9]{1,2})?)/);
    if (mPrice && mPrice[1]) {
      foundPrice = ns.parsePriceNumber(mPrice[1]);
    }

    let foundExtraRate = 0;
    let foundBaseRate = 0;
    let foundExtraTHB = 0;
    let foundBaseTHB = 0;
    let foundGrossTHB = 0;

    let socialSlice = '';
    const idxSocial = bodyText.indexOf('โซเชียลมีเดีย');
    if (idxSocial !== -1) {
      const afterSocial = bodyText.slice(idxSocial, idxSocial + 320);
      const endMatch = afterSocial.search(/ช้อปปี้ไลฟ์|ช้อปปี้วีดีโอ|เงื่อนไข|รายละเอียดสินค้า/);
      socialSlice = endMatch !== -1 ? afterSocial.slice(0, endMatch) : afterSocial.slice(0, 180);
    }

    if (socialSlice) {
      const pctRegex = /([0-9]+(?:\.[0-9]+)?)\s*%\s*(?:\(\s*฿\s*([0-9.,]+)\s*\))?/g;
      const pctMatches = Array.from(socialSlice.matchAll(pctRegex));

      if (pctMatches.length >= 2) {
        foundExtraRate = parseFloat(pctMatches[0][1]) || 0;
        foundExtraTHB = pctMatches[0][2] ? ns.parsePriceNumber(pctMatches[0][2]) : 0;
        foundBaseRate = parseFloat(pctMatches[1][1]) || 0;
        foundBaseTHB = pctMatches[1][2] ? ns.parsePriceNumber(pctMatches[1][2]) : 0;
      } else if (pctMatches.length === 1) {
        foundExtraRate = 0;
        foundExtraTHB = 0;
        foundBaseRate = parseFloat(pctMatches[0][1]) || 0;
        foundBaseTHB = pctMatches[0][2] ? ns.parsePriceNumber(pctMatches[0][2]) : 0;
      }

      const allMoney = Array.from(socialSlice.matchAll(/฿\s*([0-9,]+(?:\.[0-9]{1,2})?)/g));
      if (allMoney.length > 0) {
        foundGrossTHB = ns.parsePriceNumber(allMoney[allMoney.length - 1][1]);
      }
    }

    if (!foundPrice || foundPrice <= 0) {
      if (foundExtraRate > 0 && foundExtraTHB > 0) {
        foundPrice = Math.round((foundExtraTHB / (foundExtraRate / 100)) * 100) / 100;
      } else if (foundBaseRate > 0 && foundBaseTHB > 0) {
        foundPrice = Math.round((foundBaseTHB / (foundBaseRate / 100)) * 100) / 100;
      }
    }

    const imgSet = new Set();
    document.querySelectorAll('img[src*="susercontent.com"]').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src && !/avatar|logo|icon|extracomm/i.test(src)) {
        imgSet.add(src.replace(/_tn$/i, ''));
      }
    });

    offerProduct = {
      ...offerProduct,
      sourceType: 'affiliate_offer',
      title: foundTitle || document.title.replace(/\| Shopee.*/i, '').trim() || 'Shopee Affiliate Offer',
      price: foundPrice,
      originalPrice: foundPrice,
      baseRate: foundBaseRate,
      extraRate: foundExtraRate,
      baseCommTHB: foundBaseTHB,
      extraCommTHB: foundExtraTHB,
      grossCommTHB: foundGrossTHB || foundBaseTHB + foundExtraTHB,
      shopId: foundShopId,
      itemId: foundItemId,
      cleanUrl: foundCleanUrl,
      imagesHD: Array.from(imgSet).slice(0, 8),
      soldCount: foundSoldNum,
      soldText: foundSoldText || (foundSoldNum > 0 ? foundSoldNum.toLocaleString() : '0'),
      rating: foundRating || 4.9,
      specText:
        `[ข้อมูลจริงจากหน้าข้อเสนอ Shopee Affiliate]\n` +
        `• สินค้า: ${foundTitle || '-'}\n` +
        `• ราคาขายจริง: ฿${foundPrice.toLocaleString()}\n` +
        `• ยอดขายสะสม: ${foundSoldText || '0'} ชิ้น (⭐ ${foundRating || 4.9})\n` +
        `• EXTRACOMM (โซเชียลมีเดีย): ${foundExtraRate}% (฿${foundExtraTHB.toFixed(2)})\n` +
        `• ค่าคอมช้อปปี้ (โซเชียลมีเดีย): ${foundBaseRate}% (฿${foundBaseTHB.toFixed(2)})\n` +
        `• ค่าคอมรวมก่อนหักภาษี: ฿${(foundGrossTHB || foundBaseTHB + foundExtraTHB).toFixed(2)} / ชิ้น`
    };

    return offerProduct;
  }

  // ==========================================================================
  // 3. CONVERSION REPORT SCANNER
  // ==========================================================================
  function scanReportDOM() {
    const currencyValues = [];
    const extractedRows = [];

    document.querySelectorAll('tr').forEach((tr) => {
      if (tr.closest('#drb-aff-hud-root')) return;
      const cells = Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent || '').trim());
      if (cells.length >= 3) {
        const rowText = cells.join(' | ');
        const moneyMatch = rowText.match(/฿\s?([0-9,]+(?:\.[0-9]{1,2})?)/);
        if (moneyMatch) {
          const commVal = ns.parsePriceNumber(moneyMatch[1]);
          extractedRows.push({
            rawCells: cells.slice(0, 8),
            commission: commVal
          });
        }
      }
    });

    document.querySelectorAll('td, span, div').forEach((el) => {
      if (el.children.length === 0 && !el.closest('#drb-aff-hud-root')) {
        const txt = (el.textContent || '').trim();
        if (/^฿\s?[0-9,]+(\.[0-9]{1,2})?$/.test(txt)) {
          const val = ns.parsePriceNumber(txt);
          if (val > 0) currencyValues.push(val);
        }
      }
    });

    reportStats.rows = extractedRows;
    if (currencyValues.length > 0) {
      const maxVal = Math.max(...currencyValues);
      reportStats.totalCommission = maxVal;
      reportStats.netCommission = maxVal * 0.97;
      reportStats.orderCount = extractedRows.length || currencyValues.length;
    }
    return reportStats;
  }

  // Listen to requests from Side Panel
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
      if (req.action === 'GET_AFFILIATE_OFFER') {
        if (isOfferDetailUrl()) {
          const data = scrapeOfferDetailPage();
          sendResponse({ ok: true, mode: 'offer', data });
        } else if (isOfferGridUrl()) {
          const scanned = scanAndOverlayOfferGrid();
          sendResponse({
            ok: true,
            mode: 'grid',
            gridCounts: gridFilterState.counts,
            scannedCount: scanned,
            data: offerProduct.title ? offerProduct : null
          });
        } else {
          const rep = scanReportDOM();
          sendResponse({ ok: true, mode: 'report', report: rep });
        }
        return true;
      }
      if (req.action === 'SCAN_AFFILIATE_REPORT') {
        const rep = scanReportDOM();
        sendResponse({ ok: true, report: rep });
        return true;
      }
      if (req.action === 'OPEN_V1_SCANNER') {
        openV1ScannerModal();
        sendResponse({ ok: true });
        return true;
      }
    });
  }

  // ==========================================================================
  // 4. V1 REALTIME 500-ITEM SCANNER & DRBANK 107฿ SIGNAL RADAR WRAPPER
  //    Direct Shopee Internal API: GET /api/v3/offer/product/list
  //    + GraphQL Shortlink Generator: POST /api/v3/gql?q=batchCustomLink
  // ==========================================================================
  const V1_STORAGE_KEY = 'drbV1ScannerLastResult';
  let v1State = {
    isOpen: false,
    isLoading: false,
    cancelRequested: false,
    rows: [],
    signalFilter: 'all',      // 'all' | 'win' | 'god' | 'pass' | 'warning' | 'danger'
    minSoldFilter: 0,         // 0 | 50 | 100 | 300 | 1000
    textFilter: '',
    sortCol: 'signalScore',   // 'signalScore' | 'netComm' | 'breakEvenNum' | 'name' | 'price' | 'sold' | 'historical_sold' | 'extraRate' | 'extraComm' | 'stock'
    sortDir: 'desc'           // 'asc' | 'desc'
  };

  function ensurePageMainBridge() {
    if (document.getElementById('drb-main-world-bridge-script')) return;
    try {
      const s = document.createElement('script');
      s.id = 'drb-main-world-bridge-script';
      s.src = chrome.runtime.getURL('src/page-main-bridge.js');
      s.onload = function () {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(s);
    } catch (_e) {}
  }
  ensurePageMainBridge();

  function pageMainRequest({ url, method = 'GET', headers = {}, body = null, useFetch = false, attachCsrf = false }) {
    ensurePageMainBridge();
    return new Promise((resolve) => {
      const reqId = `drb_req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const timer = setTimeout(() => {
        window.removeEventListener('message', onMsg);
        resolve({ ok: false, status: 408, error: 'Request Timeout (12s)', data: null });
      }, 12000);

      function onMsg(event) {
        if (event.source !== window) return;
        const msg = event.data;
        if (!msg || msg.type !== 'DRB_MAIN_WORLD_RES' || msg.reqId !== reqId) return;
        clearTimeout(timer);
        window.removeEventListener('message', onMsg);
        resolve(msg);
      }

      window.addEventListener('message', onMsg);
      window.postMessage(
        {
          type: 'DRB_MAIN_WORLD_REQ',
          reqId,
          url,
          method,
          headers,
          body,
          useFetch,
          attachCsrf
        },
        '*'
      );
    });
  }

  async function generateShopeeShortLink(originalLink, subIds = []) {
    const body = {
      operationName: 'batchGetCustomLink',
      query: `
        query batchGetCustomLink($linkParams: [CustomLinkParam!], $sourceCaller: SourceCaller){
          batchCustomLink(linkParams: $linkParams, sourceCaller: $sourceCaller){
            shortLink
            longLink
            failCode
          }
        }
      `,
      variables: {
        linkParams: [
          {
            originalLink,
            advancedLinkParams: {
              subId1: subIds[0] || '',
              subId2: subIds[1] || '',
              subId3: subIds[2] || '',
              subId4: subIds[3] || '',
              subId5: subIds[4] || ''
            }
          }
        ],
        sourceCaller: 'CUSTOM_LINK_CALLER'
      }
    };

    const res = await pageMainRequest({
      url: 'https://affiliate.shopee.co.th/api/v3/gql?q=batchCustomLink',
      method: 'POST',
      useFetch: true,
      attachCsrf: true,
      headers: {
        'content-type': 'application/json; charset=UTF-8',
        'affiliate-program-type': '1'
      },
      body
    });
    const first = res?.data?.data?.batchCustomLink?.[0];
    return first?.shortLink || first?.longLink || '';
  }

  function mapRawOfferItemToRow(raw) {
    const a = raw?.batch_item_for_item_card_full || {};
    const itemid = String(a.itemid || raw?.item_id || '');
    const shopid = String(a.shopid || '');
    const name = a.name || 'สินค้า Shopee Affiliate';
    const price = (Number(a.price) || 0) / 1e5;
    const priceMax = (Number(a.price_max) || Number(a.price) || 0) / 1e5;
    const stock = Number(a.stock) || 0;
    const sold = Number(a.sold) || 0; // ขาย/เดือน (ชิ้น) จริงจาก API!
    const historical_sold = Number(a.historical_sold) || 0; // ขายทั้งหมด (ชิ้น) จริง!
    const isMall = Boolean(a.is_official_shop);
    const isFreeSample = Boolean(raw?.is_free_sample);
    const imageHash = a.image || (Array.isArray(a.images) && a.images[0]) || '';
    const imageUrl = imageHash ? `https://down-th.img.susercontent.com/file/${imageHash}` : '';
    const imagesHD = Array.isArray(a.images)
      ? a.images.slice(0, 8).map((h) => `https://down-th.img.susercontent.com/file/${h}`)
      : imageUrl
      ? [imageUrl]
      : [];

    const extraRate = parseFloat(raw?.seller_commission_rate) || 0;
    // Check if Shopee provides default_commission_rate (e.g. "2.0%" or number), else fallback to smart category baseRate
    const rawDefaultRate = parseFloat(raw?.default_commission_rate);
    const catEst = ns.estimateCategoryCommission(name, isMall, 'auto', '');
    const baseRate = Number.isFinite(rawDefaultRate) && rawDefaultRate > 0 ? rawDefaultRate : catEst.baseRate || 2.0;

    const extraComm = +((price * extraRate) / 100).toFixed(2);
    const extraCommMax = +((priceMax * extraRate) / 100).toFixed(2);

    // คำนวณ DrBank Signal (งบแอดจริง 100฿ + VAT 7% = 107฿/วัน, หักภาษี ณ ที่จ่าย 3%, เพดาน Base 250฿)
    const commMin = ns.calculateCommission({
      price,
      baseRate,
      extraRate,
      capTHB: 250,
      whtRate: 3.0,
      realDailyAdCostTHB: 107
    });
    const commMax = ns.calculateCommission({
      price: priceMax,
      baseRate,
      extraRate,
      capTHB: 250,
      whtRate: 3.0,
      realDailyAdCostTHB: 107
    });

    const productLink = raw?.product_link || (shopid && itemid ? `https://shopee.co.th/product/${shopid}/${itemid}` : '');
    const affUrl = itemid ? `https://affiliate.shopee.co.th/offer/product_offer/${itemid}` : '';
    const breakEvenNum = commMin.netComm > 0 ? +(107 / commMin.netComm).toFixed(1) : 999;

    const tierRankMap = { god: 4, pass: 3, warning: 2, danger: 1 };
    const tierRank = tierRankMap[commMin.tier] || 1;
    const signalScore = +(tierRank * 100000 + commMin.netComm).toFixed(2);

    return {
      itemid,
      shopid,
      name,
      imageUrl,
      imagesHD,
      price,
      priceMax,
      stock,
      sold,
      historical_sold,
      isMall,
      isFreeSample,
      baseRate,
      extraRate,
      extraComm,
      extraCommMax,
      netComm: +commMin.netComm.toFixed(2),
      netCommMax: +commMax.netComm.toFixed(2),
      grossComm: +commMin.grossComm.toFixed(2),
      effectiveRate: +commMin.effectiveRate.toFixed(1),
      tier: commMin.tier, // 'god' | 'pass' | 'warning' | 'danger'
      tierRank,
      signalScore,
      tierEmoji: commMin.tierEmoji,
      tierLabel: commMin.tierLabel,
      breakEvenUnits: commMin.breakEvenUnits,
      breakEvenOrders: commMin.breakEvenOrders,
      breakEvenNum,
      productLink,
      affUrl
    };
  }

  function buildV1ScannerDOM() {
    let wrap = document.getElementById('drb-v1-scanner-overlay');
    if (wrap) return wrap;

    wrap = document.createElement('div');
    wrap.id = 'drb-v1-scanner-overlay';
    wrap.innerHTML = `
      <!-- Row 1: Unified Single-Line Command Cockpit (Ultra-Compact 40px) -->
      <div class="drb-v1-controls">
        <span class="drb-v1-badge-live" title="Shopee Affiliate V1 Realtime API + DrBank 107฿/Day Signal Radar">⚡ V1 RADAR</span>

        <div class="drb-v1-control-group drb-v1-control-group--search">
          <input type="text" id="drb-v1-inp-keyword" class="drb-v1-input" placeholder="พิมพ์ชื่อสินค้า เช่น กล่องถนอมอาหาร, โปรตีน, เซรั่ม...">
          <button type="button" class="drb-v1-btn drb-v1-btn--primary" id="drb-v1-btn-search">
            🔍 ค้นหา
          </button>
        </div>

        <div class="drb-v1-control-group">
          <select id="drb-v1-sel-sort" class="drb-v1-select" title="ลำดับการดึงจาก Shopee API">
            <option value="2" selected>🔥 ขายดี</option>
            <option value="5">🎁 คอม % สูง</option>
            <option value="1">🎯 เกี่ยวข้อง</option>
            <option value="3">💵 ราคาสูง➔ต่ำ</option>
          </select>
        </div>

        <div class="drb-v1-control-group">
          <label class="drb-v1-chk-label" title="กรองเฉพาะสินค้าที่มีค่าคอมพิเศษ Extra">
            <input type="checkbox" id="drb-v1-chk-extra" value="2" checked>
            <span>🎁 Extra</span>
          </label>
          <label class="drb-v1-chk-label" title="กรองเฉพาะสินค้ารีวิวฟรี">
            <input type="checkbox" id="drb-v1-chk-free" value="5">
            <span>🆓 รีวิวฟรี</span>
          </label>
        </div>

        <div class="drb-v1-control-group">
          <select id="drb-v1-sel-extra-cat" class="drb-v1-select drb-v1-select--cat" title="เลือกดึงตามหมวดหมู่สินค้า">
            <option value="0">💯 ข้อเสนอพิเศษทั้งหมด</option>
            <option value="7">🔥 ค่าคอมพิเศษ (Extra Comm)</option>
            <option value="9">😍 รับสินค้ารีวิวฟรี</option>
            <option value="2">❤️ สินค้าขายดี</option>
            <option disabled>👇 --- แบ่งตามหมวดหมู่ --- 👇</option>
            <option value="100630">ความงามและของใช้ส่วนตัว</option>
            <option value="100001">กลุ่มผลิตภัณฑ์เพื่อสุขภาพ</option>
            <option value="100636">เครื่องใช้ในบ้าน</option>
            <option value="100010">เครื่องใช้ไฟฟ้าในบ้าน</option>
            <option value="100629">อาหารและเครื่องดื่ม</option>
            <option value="100632">ของเล่น แม่และเด็ก</option>
            <option value="100011">เสื้อผ้าแฟชั่นผู้ชาย</option>
            <option value="100017">เสื้อผ้าแฟชั่นผู้หญิง</option>
            <option value="100016">กระเป๋า</option>
            <option value="100012">รองเท้าผู้ชาย</option>
            <option value="100532">รองเท้าผู้หญิง</option>
            <option value="100009">เครื่องประดับ</option>
            <option value="100534">นาฬิกาและแว่นตา</option>
            <option value="100013">มือถือและอิเล็กทรอนิกส์</option>
            <option value="100535">คอมพิวเตอร์และแล็ปท็อป</option>
            <option value="100635">กล้องและอุปกรณ์ถ่ายภาพ</option>
            <option value="100637">กีฬาและกิจกรรมกลางแจ้ง</option>
            <option value="100631">สัตว์เลี้ยง</option>
            <option value="100634">เกมและอุปกรณ์เสริม</option>
            <option value="100640">ยานยนต์</option>
            <option value="100639">เครื่องเขียนและหนังสือ</option>
            <option value="100642">ตั๋วและบัตรกำนัล</option>
          </select>
          <button type="button" class="drb-v1-btn drb-v1-btn--blue" id="drb-v1-btn-fetch-cat">
            👁️ ดูหมวดนี้
          </button>
        </div>

        <div class="drb-v1-control-group">
          <select id="drb-v1-sel-limit" class="drb-v1-select" title="จำนวนสินค้าสูงสุดที่จะดึง">
            <option value="60">ดึง 60 ชิ้น (3 หน้า)</option>
            <option value="100" selected>ดึง 100 ชิ้น (5 หน้า)</option>
            <option value="200">ดึง 200 ชิ้น (10 หน้า)</option>
            <option value="300">ดึง 300 ชิ้น (15 หน้า)</option>
            <option value="500">ดึง 500 ชิ้น (25 หน้า)</option>
          </select>
          <select id="drb-v1-sel-delay" class="drb-v1-select" title="หน่วงเวลาต่อหน้า (20 ชิ้น) เพื่อป้องกัน Shopee เตะออก">
            <option value="5000" selected>🛡️ หน่วง 5วิ+Jitter</option>
            <option value="3500">⚖️ หน่วง 3.5วิ+Jitter</option>
            <option value="2000">⚡ หน่วง 2วิ+Jitter</option>
          </select>
        </div>

        <div class="drb-v1-header-right">
          <button type="button" class="drb-v1-btn drb-v1-btn--ghost" id="drb-v1-btn-restore" style="display:none;" title="กู้คืนรายการที่ดึงไว้ล่าสุด">
            🕒 ล่าสุด
          </button>
          <button type="button" class="drb-v1-btn drb-v1-btn--green" id="drb-v1-btn-export-xlsx" disabled title="ส่งออกไฟล์ Excel .xlsx แท้ (แยกสีตาม Signal + ตัวเลขคำนวณต่อได้ทันที)">
            📗 Excel (.xlsx)
          </button>
          <button type="button" class="drb-v1-btn drb-v1-btn--ghost" id="drb-v1-btn-export-csv" disabled title="ส่งออกไฟล์ .csv มาตรฐาน">
            📥 CSV
          </button>
          <button type="button" class="drb-v1-btn drb-v1-btn--close" id="drb-v1-btn-close" title="ปิดตารางกลับหน้าปกติ">
            ✕ ปิด
          </button>
        </div>
      </div>

      <!-- Progress Bar Banner (Shown while fetching pages) -->
      <div class="drb-v1-progress-wrap" id="drb-v1-progress-wrap" style="display:none;">
        <div class="drb-v1-progress-info">
          <span id="drb-v1-progress-text">⏳ กำลังดึงข้อมูลจาก Shopee API...</span>
          <button type="button" class="drb-v1-btn drb-v1-btn--danger-sm" id="drb-v1-btn-cancel">
            ⏹ หยุดและแสดงข้อมูลที่โหลดแล้ว
          </button>
        </div>
        <div class="drb-v1-progress-track">
          <div class="drb-v1-progress-bar" id="drb-v1-progress-bar" style="width:0%;"></div>
        </div>
      </div>

      <!-- Row 2: Ultra-Compact Signal Radar Filter Bar (34px) -->
      <div class="drb-v1-signal-bar">
        <div class="drb-v1-signal-pills" id="drb-v1-signal-pills">
          <button type="button" class="drb-v1-pill active" data-sig="all">
            ทั้งหมด (<span id="drb-v1-cnt-all">0</span>)
          </button>
          <button type="button" class="drb-v1-pill drb-v1-pill--win" data-sig="win">
            🔥✅ น่าลุยแอด ≥฿45 (<span id="drb-v1-cnt-win">0</span>)
          </button>
          <button type="button" class="drb-v1-pill drb-v1-pill--god" data-sig="god">
            🔥 GOD ≥฿80 (<span id="drb-v1-cnt-god">0</span>)
          </button>
          <button type="button" class="drb-v1-pill drb-v1-pill--pass" data-sig="pass">
            ✅ เขียว ฿45–79 (<span id="drb-v1-cnt-pass">0</span>)
          </button>
          <button type="button" class="drb-v1-pill drb-v1-pill--warn" data-sig="warning">
            ⚠️ เหลือง ฿20–44 (<span id="drb-v1-cnt-warn">0</span>)
          </button>
          <button type="button" class="drb-v1-pill drb-v1-pill--danger" data-sig="danger">
            ⛔ แดง &lt;฿20/ไร้Extra (<span id="drb-v1-cnt-danger">0</span>)
          </button>
        </div>

        <div class="drb-v1-subfilters">
          <span class="drb-v1-ctrl-label">ขาย/ด.:</span>
          <select id="drb-v1-sel-minsold" class="drb-v1-select">
            <option value="0" selected>ทุกยอดขาย</option>
            <option value="50">≥ 50/ด.</option>
            <option value="100">≥ 100/ด.</option>
            <option value="300">🔥 ≥ 300/ด.</option>
            <option value="1000">🚀 ≥ 1,000/ด.</option>
          </select>

          <input type="text" id="drb-v1-inp-table-filter" class="drb-v1-input drb-v1-input--sm" placeholder="🔎 กรองชื่อ/ID ในตาราง...">
          <span class="drb-v1-showing-label" id="drb-v1-showing-label">แสดง 0 รายการ</span>
        </div>
      </div>

      <!-- Row 3: High-Density Sortable Signal Table (15-18 rows visible per screen) -->
      <div class="drb-v1-table-container">
        <table class="drb-v1-table">
          <thead>
            <tr>
              <th style="width:34px; text-align:center;">#</th>
              <th style="width:36px; text-align:center;">รูป</th>
              <th class="drb-v1-sortable is-sorted" data-sort="signalScore" data-label="🚦 SIGNAL (107฿)" style="width:142px;" title="คลิกเพื่อเรียงตามเกรดความน่าลุยแอด (GOD ➔ เขียว ➔ เหลือง ➔ แดง)">🚦 SIGNAL (107฿) ▼</th>
              <th class="drb-v1-sortable" data-sort="netComm" data-label="💰 คอมสุทธิ/ชิ้น" style="width:138px; text-align:right;" title="คลิกเพื่อเรียงตามค่าคอมสุทธิหลังหักภาษี ณ ที่จ่าย 3%">💰 คอมสุทธิ/ชิ้น ⇅</th>
              <th class="drb-v1-sortable" data-sort="breakEvenNum" data-label="🎯 คุ้มแอด 107฿" style="width:120px; text-align:center;" title="คลิกเพื่อเรียงตามจำนวนชิ้นที่ต้องขายให้คุ้มค่าแอด 107฿/วัน">🎯 คุ้มแอด 107฿ ⇅</th>
              <th class="drb-v1-sortable" data-sort="name" data-label="สินค้า (คลิกเปิด Shopee / เรท AFF)" title="คลิกเพื่อเรียงตามชื่อสินค้า ก-ฮ / A-Z">สินค้า (คลิกเปิด Shopee / เรท AFF) ⇅</th>
              <th class="drb-v1-sortable" data-sort="price" data-label="💵 ราคาจริง" style="width:110px; text-align:right;" title="คลิกเพื่อเรียงตามราคาขายจริง">💵 ราคาจริง ⇅</th>
              <th class="drb-v1-sortable" data-sort="sold" data-label="📈 ขาย/เดือน" style="width:92px; text-align:right;" title="คลิกเพื่อเรียงตามยอดขายต่อเดือน (ชิ้น)">📈 ขาย/เดือน ⇅</th>
              <th class="drb-v1-sortable" data-sort="historical_sold" data-label="📦 ขายรวม" style="width:88px; text-align:right;" title="คลิกเพื่อเรียงตามยอดขายสะสมทั้งหมด">📦 ขายรวม ⇅</th>
              <th class="drb-v1-sortable" data-sort="extraRate" data-label="🎁 Extra %" style="width:78px; text-align:right;" title="คลิกเพื่อเรียงตามเปอร์เซ็นต์ค่าคอมพิเศษ Extra %">🎁 Extra % ⇅</th>
              <th class="drb-v1-sortable" data-sort="extraComm" data-label="🎁 คอม Extra" style="width:105px; text-align:right;" title="คลิกเพื่อเรียงตามจำนวนเงินค่าคอมพิเศษ Extra (฿)">🎁 คอม Extra ⇅</th>
              <th class="drb-v1-sortable" data-sort="stock" data-label="สต๊อก" style="width:72px; text-align:right;" title="คลิกเพื่อเรียงตามจำนวนสต๊อกคงเหลือ">สต๊อก ⇅</th>
              <th style="width:128px; text-align:center;">⚡ ACTION</th>
            </tr>
          </thead>
          <tbody id="drb-v1-tbody">
            <tr>
              <td colspan="13" class="drb-v1-empty">
                💡 พิมพ์คำค้นหาด้านบน หรือเลือกหมวดหมู่แล้วกด <strong>[👁️ ดูหมวดนี้]</strong> เพื่อดึงข้อมูล Realtime จาก Shopee API พร้อมคำนวณจุดคุ้มทุนแอด 107฿ ทันที!
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    document.body.appendChild(wrap);
    bindV1ScannerEvents(wrap);
    checkAndOfferLastResultRestore(wrap);
    return wrap;
  }

  function bindV1ScannerEvents(wrap) {
    wrap.querySelector('#drb-v1-btn-close').addEventListener('click', () => {
      closeV1ScannerModal();
    });

    const kwInput = wrap.querySelector('#drb-v1-inp-keyword');
    kwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runV1Search('keyword');
      }
    });

    wrap.querySelector('#drb-v1-btn-search').addEventListener('click', () => {
      runV1Search('keyword');
    });

    wrap.querySelector('#drb-v1-btn-fetch-cat').addEventListener('click', () => {
      runV1Search('extra');
    });

    wrap.querySelector('#drb-v1-btn-cancel').addEventListener('click', () => {
      v1State.cancelRequested = true;
    });

    wrap.querySelector('#drb-v1-btn-export-xlsx').addEventListener('click', () => {
      exportV1TableToXlsx();
    });

    wrap.querySelector('#drb-v1-btn-export-csv').addEventListener('click', () => {
      exportV1TableToCsv();
    });

    wrap.querySelector('#drb-v1-btn-restore').addEventListener('click', async () => {
      try {
        const res = await chrome.storage.local.get([V1_STORAGE_KEY]);
        const saved = res?.[V1_STORAGE_KEY];
        if (saved && Array.isArray(saved.rows) && saved.rows.length > 0) {
          v1State.rows = saved.rows;
          renderV1TableRows();
          ns.showToast(`🕒 กู้คืนรายการล่าสุด ${saved.rows.length} ชิ้นเรียบร้อย!`);
        }
      } catch (_e) {}
    });

    // Signal filter pills
    wrap.querySelectorAll('#drb-v1-signal-pills .drb-v1-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        wrap.querySelectorAll('#drb-v1-signal-pills .drb-v1-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        v1State.signalFilter = btn.getAttribute('data-sig') || 'all';
        renderV1TableRows();
      });
    });

    // Min monthly sold filter
    wrap.querySelector('#drb-v1-sel-minsold').addEventListener('change', (e) => {
      v1State.minSoldFilter = parseInt(e.target.value, 10) || 0;
      renderV1TableRows();
    });

    // Instant text filter inside loaded rows
    wrap.querySelector('#drb-v1-inp-table-filter').addEventListener('input', (e) => {
      v1State.textFilter = (e.target.value || '').trim().toLowerCase();
      renderV1TableRows();
    });

    // Column sorting (supports all 10 sortable columns, asc & desc)
    wrap.querySelectorAll('.drb-v1-sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (!col) return;
        if (v1State.sortCol === col) {
          v1State.sortDir = v1State.sortDir === 'desc' ? 'asc' : 'desc';
        } else {
          v1State.sortCol = col;
          v1State.sortDir = col === 'breakEvenNum' || col === 'name' ? 'asc' : 'desc';
        }
        wrap.querySelectorAll('.drb-v1-sortable').forEach((el) => {
          el.classList.remove('is-sorted');
          const baseLbl = el.getAttribute('data-label') || el.textContent.replace(/\s*[▲▼⇅]$/, '');
          el.textContent = `${baseLbl} ⇅`;
        });
        th.classList.add('is-sorted');
        const activeLbl = th.getAttribute('data-label') || th.textContent.replace(/\s*[▲▼⇅]$/, '');
        th.textContent = `${activeLbl} ${v1State.sortDir === 'desc' ? '▼' : '▲'}`;
        renderV1TableRows();
      });
    });
  }

  async function checkAndOfferLastResultRestore(wrap) {
    try {
      const res = await chrome.storage.local.get([V1_STORAGE_KEY]);
      const saved = res?.[V1_STORAGE_KEY];
      const restoreBtn = wrap.querySelector('#drb-v1-btn-restore');
      if (saved && Array.isArray(saved.rows) && saved.rows.length > 0 && restoreBtn) {
        const timeStr = new Date(saved.savedAt || Date.now()).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit'
        });
        restoreBtn.style.display = 'inline-flex';
        restoreBtn.textContent = `🕒 ล่าสุด (${saved.rows.length} ชิ้น · ${timeStr})`;
      }
    } catch (_e) {}
  }

  function openV1ScannerModal() {
    const wrap = buildV1ScannerDOM();
    wrap.classList.add('is-open');
    document.body.classList.add('drb-v1-body-locked');
    v1State.isOpen = true;
  }

  function closeV1ScannerModal() {
    const wrap = document.getElementById('drb-v1-scanner-overlay');
    if (wrap) wrap.classList.remove('is-open');
    document.body.classList.remove('drb-v1-body-locked');
    v1State.isOpen = false;
    if (location.hash.includes('v1_scanner') || location.hash.includes('get_items')) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  async function runV1Search(mode = 'keyword') {
    if (v1State.isLoading) return;
    const wrap = buildV1ScannerDOM();

    const keyword = (wrap.querySelector('#drb-v1-inp-keyword').value || '').trim();
    const sortType = wrap.querySelector('#drb-v1-sel-sort').value || '2';
    const extraCat = wrap.querySelector('#drb-v1-sel-extra-cat').value || '0';
    const maxItems = parseInt(wrap.querySelector('#drb-v1-sel-limit').value, 10) || 100;
    const baseDelayMs = parseInt(wrap.querySelector('#drb-v1-sel-delay')?.value, 10) || 5000;

    const filterTypes = [];
    if (wrap.querySelector('#drb-v1-chk-extra').checked) filterTypes.push('2');
    if (wrap.querySelector('#drb-v1-chk-free').checked) filterTypes.push('5');

    // Build exact Shopee Affiliate V1 query parameters
    const baseParams = {
      client_type: '1',
      list_type: '0',
      sort_type: sortType
    };

    if (mode === 'extra') {
      const catNum = parseInt(extraCat, 10);
      if (catNum < 100) {
        baseParams.list_type = String(catNum);
      } else {
        baseParams.list_type = '3';
        baseParams.match_type = '2';
        baseParams.match_id = String(catNum);
      }
      baseParams.sort_type = '1';
    } else {
      baseParams.keyword = keyword;
      if (filterTypes.length > 0) {
        baseParams.filter_types = filterTypes.join(',');
      }
    }

    v1State.isLoading = true;
    v1State.cancelRequested = false;
    v1State.rows = [];
    renderV1TableRows();

    const progWrap = wrap.querySelector('#drb-v1-progress-wrap');
    const progText = wrap.querySelector('#drb-v1-progress-text');
    const progBar = wrap.querySelector('#drb-v1-progress-bar');
    const btnSearch = wrap.querySelector('#drb-v1-btn-search');
    const btnCat = wrap.querySelector('#drb-v1-btn-fetch-cat');

    progWrap.style.display = 'block';
    progBar.style.width = '5%';
    progText.textContent = '⏳ กำลังเริ่มดึงข้อมูล Realtime จาก Shopee Affiliate API...';
    btnSearch.disabled = true;
    btnCat.disabled = true;

    const seenIds = new Set();
    let page = 0;
    let totalAvailable = maxItems;
    let partialStoppedReason = '';

    // Helper: sleep with 250ms ticks so user Cancel button reacts immediately
    const cancellableJitterSleep = async (ms, currentLoaded, targetCount, nextPage) => {
      const start = Date.now();
      while (Date.now() - start < ms) {
        if (v1State.cancelRequested) return;
        const remainSec = Math.max(0.1, ((ms - (Date.now() - start)) / 1000)).toFixed(1);
        progText.textContent = `🛡️ โหลดแล้ว ${currentLoaded.toLocaleString()}/${targetCount.toLocaleString()} ชิ้น — พักหน่วงเวลาเนียนเป็นคนจริง ${remainSec}s ก่อนดึงหน้า ${nextPage}...`;
        await new Promise((r) => setTimeout(r, 250));
      }
    };

    try {
      while (!v1State.cancelRequested) {
        // Security / Anti-Bot URL guard (identical to Shop Tool captcha/login watcher)
        const href = window.location.href;
        if (href.includes('verify/captcha') || href.includes('verify/traffic') || href.includes('buyer/login')) {
          partialStoppedReason = 'ตรวจพบหน้าตรวจสอบความปลอดภัย/ล็อกอินของ Shopee ระบบจึงหยุดดึงอัตโนมัติเพื่อเซฟบัญชี';
          break;
        }

        const q = new URLSearchParams({
          ...baseParams,
          page_offset: String(page * 20),
          page_limit: '20'
        });

        const url = `https://affiliate.shopee.co.th/api/v3/offer/product/list?${q.toString()}`;
        const resp = await pageMainRequest({
          url,
          method: 'GET',
          useFetch: false // Uses page MAIN world window.XMLHttpRequest (identical to Shop Tool stRequest)
        });

        if (!resp.ok || !resp.data) {
          if (v1State.rows.length > 0) {
            partialStoppedReason = `Shopee จำกัดความถี่ที่หน้า ${page + 1} (HTTP ${resp.status || 'Rate Limit'}) — ระบบล็อกข้อมูล ${v1State.rows.length} ชิ้นที่ดึงมาแล้วไว้ให้ครบ!`;
            break;
          }
          throw new Error(`HTTP ${resp.status || 'Error'} — กรุณารีเฟรชหน้าเว็บ Shopee Affiliate (F5) 1 ครั้งแล้วลองใหม่`);
        }

        const json = resp.data;
        if (typeof json?.error === 'number' && json.error !== 0) {
          if (v1State.rows.length > 0) {
            partialStoppedReason = `Shopee แจ้งเตือน Rate Limit ที่หน้า ${page + 1} (code ${json.error}) — ระบบเซฟข้อมูล ${v1State.rows.length} ชิ้นที่ดูดมาแล้วไว้ให้เรียบร้อย`;
            break;
          }
          throw new Error(`Shopee API Error (${json.error}): ${json.msg || 'กรุณาเว้นระยะสักครู่แล้วลองใหม่'}`);
        }

        const list = json?.data?.list;
        if (!Array.isArray(list) || list.length === 0) {
          break;
        }

        if (typeof json?.data?.total_count === 'number' && json.data.total_count > 0) {
          totalAvailable = json.data.total_count;
        }

        for (const rawItem of list) {
          const row = mapRawOfferItemToRow(rawItem);
          if (row.itemid && !seenIds.has(row.itemid)) {
            seenIds.add(row.itemid);
            v1State.rows.push(row);
          }
        }

        page++;
        const targetCount = Math.min(totalAvailable, maxItems);
        const pct = targetCount > 0 ? Math.min(100, Math.round((v1State.rows.length / targetCount) * 100)) : 100;
        progBar.style.width = `${pct}%`;
        progText.textContent = `⚡ ดึงข้อมูลแล้ว ${v1State.rows.length.toLocaleString()} / ${targetCount.toLocaleString()} รายการ (หน้า ${page}) — เซฟลงแคชอัตโนมัติ...`;

        renderV1TableRows();

        // Save partial result on EVERY page (Shop Tool onProgress pattern) so zero data is ever lost
        if (v1State.rows.length > 0) {
          chrome.storage.local
            .set({
              [V1_STORAGE_KEY]: {
                savedAt: Date.now(),
                rows: v1State.rows
              }
            })
            .catch(() => {});
        }

        if (v1State.rows.length >= maxItems || v1State.rows.length >= totalAvailable || list.length < 20) {
          break;
        }

        // Human Jittered Delay (Shop Tool default = 5,000ms + random 350..1450ms jitter)
        const jitterMs = Math.floor(Math.random() * 1100) + 350;
        await cancellableJitterSleep(baseDelayMs + jitterMs, v1State.rows.length, targetCount, page + 1);
      }

      if (v1State.rows.length > 0) {
        await checkAndOfferLastResultRestore(wrap);
      }

      if (partialStoppedReason) {
        ns.showToast(`⚠️ ${partialStoppedReason}`);
      } else {
        ns.showToast(
          v1State.cancelRequested
            ? `⏹ หยุดดึงข้อมูล — แสดงผลและเซฟไว้ ${v1State.rows.length} รายการ`
            : `✅ ดึงข้อมูล Realtime สำเร็จ ${v1State.rows.length} รายการ!`
        );
      }
    } catch (err) {
      ns.showToast(`❌ ดึงข้อมูลไม่สำเร็จ: ${err.message || err}`);
    } finally {
      v1State.isLoading = false;
      progWrap.style.display = 'none';
      btnSearch.disabled = false;
      btnCat.disabled = false;
      renderV1TableRows();
    }
  }

  function getFilteredAndSortedV1Rows() {
    const all = v1State.rows || [];
    const tierRankMap = { god: 4, pass: 3, warning: 2, danger: 1 };

    // Update top Signal counters & ensure tierRank/signalScore exist even on restored rows
    let cntGod = 0;
    let cntPass = 0;
    let cntWarn = 0;
    let cntDanger = 0;
    for (const r of all) {
      if (r.tier === 'god') cntGod++;
      else if (r.tier === 'pass') cntPass++;
      else if (r.tier === 'warning') cntWarn++;
      else cntDanger++;

      if (typeof r.signalScore !== 'number') {
        const tr = tierRankMap[r.tier] || 1;
        r.tierRank = tr;
        r.signalScore = +(tr * 100000 + (Number(r.netComm) || 0)).toFixed(2);
      }
    }

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val.toLocaleString();
    };
    setTxt('drb-v1-cnt-all', all.length);
    setTxt('drb-v1-cnt-win', cntGod + cntPass);
    setTxt('drb-v1-cnt-god', cntGod);
    setTxt('drb-v1-cnt-pass', cntPass);
    setTxt('drb-v1-cnt-warn', cntWarn);
    setTxt('drb-v1-cnt-danger', cntDanger);

    const exportCsvBtn = document.getElementById('drb-v1-btn-export-csv');
    if (exportCsvBtn) exportCsvBtn.disabled = all.length === 0;
    const exportXlsxBtn = document.getElementById('drb-v1-btn-export-xlsx');
    if (exportXlsxBtn) exportXlsxBtn.disabled = all.length === 0;

    // Filter rows
    const filtered = all.filter((r) => {
      if (v1State.signalFilter === 'win' && r.tier !== 'god' && r.tier !== 'pass') return false;
      if (v1State.signalFilter === 'god' && r.tier !== 'god') return false;
      if (v1State.signalFilter === 'pass' && r.tier !== 'pass') return false;
      if (v1State.signalFilter === 'warning' && r.tier !== 'warning') return false;
      if (v1State.signalFilter === 'danger' && r.tier !== 'danger') return false;
      if (v1State.minSoldFilter > 0 && r.sold < v1State.minSoldFilter) return false;
      if (v1State.textFilter && !r.name.toLowerCase().includes(v1State.textFilter) && !r.itemid.includes(v1State.textFilter)) {
        return false;
      }
      return true;
    });

    // Sort rows (supports all 10 columns: signalScore, netComm, breakEvenNum, name, price, sold, historical_sold, extraRate, extraComm, stock)
    const col = v1State.sortCol || 'signalScore';
    const dir = v1State.sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      if (col === 'name') {
        const cmp = String(a.name || '').localeCompare(String(b.name || ''), 'th');
        return cmp !== 0 ? cmp * dir : (b.sold || 0) - (a.sold || 0);
      }
      if (col === 'breakEvenNum') {
        // Put items without Extra (tier === 'danger') behind viable items when sorting ascending by break-even
        const aDangerPenalty = a.extraRate <= 0 ? 10000 : 0;
        const bDangerPenalty = b.extraRate <= 0 ? 10000 : 0;
        const va = (Number(a.breakEvenNum) || 999) + (dir === 1 ? aDangerPenalty : 0);
        const vb = (Number(b.breakEvenNum) || 999) + (dir === 1 ? bDangerPenalty : 0);
        if (va === vb) return (b.sold || 0) - (a.sold || 0);
        return (va - vb) * dir;
      }
      const va = Number(a[col]) || 0;
      const vb = Number(b[col]) || 0;
      if (va === vb) return (b.sold || 0) - (a.sold || 0);
      return (va - vb) * dir;
    });

    const showingEl = document.getElementById('drb-v1-showing-label');
    if (showingEl) {
      showingEl.textContent = `แสดง ${filtered.length.toLocaleString()} / ${all.length.toLocaleString()} รายการ`;
    }

    return filtered;
  }

  function getCompactSignalBadgeText(r) {
    if (r.tier === 'god') return '🔥 GOD (1 ชิ้นคุ้ม!)';
    if (r.tier === 'pass') return '✅ ไฟเขียว (1.5-2 ชิ้น)';
    if (r.tier === 'warning') return '⚠️ ไฟเหลือง (3-5 ชิ้น)';
    return r.extraRate <= 0 ? '⛔ ห้ามยิง (ไร้ Extra)' : '⛔ ไฟแดง (คอมต่ำ)';
  }

  function renderV1TableRows() {
    const tbody = document.getElementById('drb-v1-tbody');
    if (!tbody) return;

    const rows = getFilteredAndSortedV1Rows();
    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="13" class="drb-v1-empty">
            ${
              v1State.isLoading
                ? '⏳ กำลังดึงข้อมูลจาก Shopee API...'
                : v1State.rows.length > 0
                ? 'ไม่พบสินค้าที่ตรงกับตัวกรอง Signal / ยอดขายขั้นต่ำที่เลือก (ลองปรับตัวกรองด้านบน)'
                : '💡 พิมพ์คำค้นหาด้านบน หรือเลือกหมวดหมู่แล้วกด <strong>[👁️ ดูหมวดนี้]</strong> เพื่อดึงข้อมูล Realtime พร้อมคำนวณจุดคุ้มทุนแอด 107฿'
            }
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows
      .map((r, idx) => {
        const priceLabel =
          r.priceMax > r.price
            ? `฿${r.price.toLocaleString()}–${r.priceMax.toLocaleString()}`
            : `฿${r.price.toLocaleString()}`;

        const netCommLabel =
          r.netCommMax > r.netComm
            ? `฿${r.netComm.toFixed(2)}<span class="drb-v1-inline-range">~${r.netCommMax.toFixed(0)}</span>`
            : `฿${r.netComm.toFixed(2)}`;

        const extraCommLabel =
          r.extraCommMax > r.extraComm
            ? `฿${r.extraComm.toFixed(1)}–${r.extraCommMax.toFixed(0)}`
            : `฿${r.extraComm.toFixed(2)}`;

        const soldBadgeClass =
          r.sold >= 1000
            ? 'drb-v1-sold--hot'
            : r.sold >= 300
            ? 'drb-v1-sold--good'
            : r.sold > 0
            ? 'drb-v1-sold--low'
            : '';

        const compactSig = getCompactSignalBadgeText(r);

        return `
          <tr class="drb-v1-row" data-tier="${r.tier}" data-itemid="${r.itemid}">
            <td class="drb-v1-td-center drb-v1-muted">${idx + 1}</td>
            <td class="drb-v1-td-center">
              ${
                r.imageUrl
                  ? `<img src="${r.imageUrl}_tn" class="drb-v1-thumb" loading="lazy" alt="">`
                  : '<span class="drb-v1-muted">-</span>'
              }
            </td>
            <td class="drb-v1-nowrap">
              <span class="drb-v1-sig-badge" data-tier="${r.tier}" title="${r.tierLabel}">
                ${compactSig}
              </span>
            </td>
            <td class="drb-v1-td-right drb-v1-nowrap" title="รวม ${r.effectiveRate}% (Base ${r.baseRate}% + Extra ${r.extraRate}%) หักภาษี ณ ที่จ่าย 3% แล้ว">
              <span class="drb-v1-netcomm" data-tier="${r.tier}">${r.tierEmoji} ${netCommLabel}</span>
              <span class="drb-v1-rate-chip">${r.effectiveRate}%</span>
            </td>
            <td class="drb-v1-td-center drb-v1-nowrap" title="ต้องขาย ${r.breakEvenUnits} ชิ้น (${r.breakEvenOrders} ออเดอร์) เพื่อคืนทุนค่าแอด 107฿/วัน">
              <span class="drb-v1-breakeven" data-tier="${r.tier}">${r.breakEvenUnits} ชิ้น</span>
              <span class="drb-v1-inline-sub">(${r.breakEvenOrders} ออเดอร์)</span>
            </td>
            <td class="drb-v1-td-product">
              <div class="drb-v1-title-wrap">
                ${r.isMall ? '<span class="drb-v1-tag drb-v1-tag--mall">Mall</span>' : ''}
                ${r.isFreeSample ? '<span class="drb-v1-tag drb-v1-tag--free">🆓ฟรี</span>' : ''}
                <a href="${r.productLink}" target="_blank" rel="noopener" class="drb-v1-prod-link" title="${String(r.name || '').replace(/"/g, '&quot;')} (ID: ${r.itemid})">${r.name}</a>
                <a href="${r.affUrl}" target="_blank" rel="noopener" class="drb-v1-mini-link" title="เปิดหน้าข้อเสนอ Shopee Affiliate (ID: ${r.itemid})">📊AFF</a>
              </div>
            </td>
            <td class="drb-v1-td-right drb-v1-bold drb-v1-nowrap">${priceLabel}</td>
            <td class="drb-v1-td-right drb-v1-nowrap">
              <span class="drb-v1-sold ${soldBadgeClass}">${r.sold.toLocaleString()}</span>
            </td>
            <td class="drb-v1-td-right drb-v1-muted drb-v1-nowrap">${r.historical_sold.toLocaleString()}</td>
            <td class="drb-v1-td-right drb-v1-nowrap">
              <span class="${r.extraRate > 0 ? 'drb-v1-extra-pct' : 'drb-v1-muted'}">${r.extraRate > 0 ? `+${r.extraRate}%` : '0%'}</span>
            </td>
            <td class="drb-v1-td-right drb-v1-nowrap">${extraCommLabel}</td>
            <td class="drb-v1-td-right drb-v1-nowrap ${r.stock < 20 ? 'drb-v1-low-stock' : 'drb-v1-muted'}">${r.stock.toLocaleString()}</td>
            <td class="drb-v1-td-actions">
              <button type="button" class="drb-v1-act-btn drb-v1-act-btn--pick" data-idx="${idx}" title="ดึงเข้า Side Panel & ส่งไปเว็บ aff.doctorbankonline.com">
                ⚡ เลือก
              </button>
              <button type="button" class="drb-v1-act-btn drb-v1-act-btn--link" data-idx="${idx}" title="เจนลิงก์ s.shopee.co.th อัตโนมัติผ่าน GraphQL พร้อมก๊อปลง Clipboard">
                🔗 ลิงก์
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    // Bind row action buttons
    tbody.querySelectorAll('.drb-v1-act-btn--pick').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const r = rows[idx];
        if (!r) return;
        await pickV1RowToSidePanelAndWebUI(r, btn);
      });
    });

    tbody.querySelectorAll('.drb-v1-act-btn--link').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const r = rows[idx];
        if (!r) return;
        const origTxt = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳..';
        try {
          const shortLink = await generateShopeeShortLink(r.productLink, ['v1scanner', r.itemid]);
          if (shortLink) {
            await navigator.clipboard.writeText(shortLink);
            btn.textContent = '✅ก๊อป!';
            ns.showToast(`🔗 ก๊อปลิงก์สั้น ${shortLink} เรียบร้อย!`);
          } else {
            throw new Error('ไม่ได้รับ shortLink');
          }
        } catch (_e) {
          await navigator.clipboard.writeText(r.productLink).catch(() => {});
          btn.textContent = '📋ปกติ';
          ns.showToast('📋 ก๊อปลิงก์สินค้าปกติแล้ว');
        } finally {
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = origTxt;
          }, 1800);
        }
      });
    });
  }

  async function pickV1RowToSidePanelAndWebUI(r, btnEl) {
    const specText =
      `[ดึงจากตาราง V1 Realtime API]\n` +
      `• สินค้า: ${r.name}\n` +
      `• ราคาขายจริง: ฿${r.price.toLocaleString()}${r.priceMax > r.price ? ` - ฿${r.priceMax.toLocaleString()}` : ''}\n` +
      `• ยอดขาย/เดือนจริง: ${r.sold.toLocaleString()} ชิ้น/เดือน (สะสม ${r.historical_sold.toLocaleString()} ชิ้น)\n` +
      `• สต๊อกคงเหลือจริง: ${r.stock.toLocaleString()} ชิ้น\n` +
      `• เรทค่าคอม: Extra ${r.extraRate}% + Base ${r.baseRate}% = สุทธิ ฿${r.netComm.toFixed(2)}/ชิ้น\n` +
      `• จุดคุ้มทุนแอด 107฿/วัน: ขาย ${r.breakEvenUnits} ชิ้น (${r.breakEvenOrders} ออเดอร์) [${r.tierLabel}]`;

    const payload = {
      sourceType: 'v1_realtime_api',
      title: r.name,
      price: r.price,
      priceMax: r.priceMax,
      originalPrice: r.price,
      baseRate: r.baseRate,
      extraRate: r.extraRate,
      baseCommTHB: +(r.grossComm - r.extraComm).toFixed(2),
      extraCommTHB: r.extraComm,
      grossCommTHB: r.grossComm,
      capTHB: 250,
      whtRate: 3.0,
      shopId: r.shopid,
      itemId: r.itemid,
      cleanUrl: r.productLink,
      imagesHD: r.imagesHD,
      variants: [],
      soldCount: r.sold,
      soldText: `${r.sold.toLocaleString()}/เดือน`,
      rating: 4.9,
      shipFrom: r.isMall ? 'Shopee Mall' : 'ส่งในไทย',
      isOverseas: false,
      specText
    };

    offerProduct = payload;
    try {
      await chrome.storage.local.set({ activeAffOfferProduct: payload });
      await ns.sendMessage('PUSH_SKU_TO_WEBUI', {
        id: `shopee_v1_${r.itemid}`,
        platform: 'shopee',
        sourceTab: 'V1 Realtime Scanner',
        title: r.name,
        specText,
        price: r.price,
        priceMax: r.priceMax,
        baseRate: r.baseRate,
        extraRate: r.extraRate,
        estimatedCommission: r.netComm,
        realDailyAdCostTHB: 107,
        breakEvenUnits: r.breakEvenUnits,
        breakEvenOrders: r.breakEvenOrders,
        adViabilityTier: r.tier,
        soldCount: r.sold,
        historicalSold: r.historical_sold,
        stock: r.stock,
        cleanUrl: r.productLink,
        imagesHD: r.imagesHD,
        scrapedAt: new Date().toISOString()
      });
      if (btnEl) {
        const orig = btnEl.textContent;
        btnEl.textContent = '✅ส่งแล้ว';
        setTimeout(() => {
          btnEl.textContent = orig;
        }, 1500);
      }
      ns.showToast(`⚡ ส่ง "${r.name.slice(0, 28)}..." (สุทธิ ฿${r.netComm.toFixed(2)} | ขาย ${r.sold}/ด.) เข้า Side Panel & Web UI แล้ว!`);
    } catch (_e) {
      ns.showToast('⚡ บันทึกลง Side Panel เรียบร้อย!');
    }
  }

  // ==========================================================================
  // Native OpenXML (.xlsx) Binary Builder (Zero External Dependencies)
  // Generates a real ZIP-packaged .xlsx workbook with:
  // - Frozen top header row + AutoFilter on all columns
  // - Row color-coding by Signal Tier (GOD / PASS / WARNING / DANGER)
  // - True numeric cells for currency, percentages, sold counts, and stock
  // ==========================================================================
  function createZipArchive(files) {
    const encoder = new TextEncoder();
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c >>> 0;
    }
    const crc32 = (bytes) => {
      let crc = 0xffffffff;
      for (let i = 0; i < bytes.length; i++) {
        crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
      }
      return (crc ^ 0xffffffff) >>> 0;
    };

    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of files) {
      const nameBytes = encoder.encode(file.name);
      const dataBytes = typeof file.content === 'string' ? encoder.encode(file.content) : file.content;
      const crc = crc32(dataBytes);
      const size = dataBytes.length;

      // Local file header (30 bytes + name)
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lView = new DataView(localHeader.buffer);
      lView.setUint32(0, 0x04034b50, true);
      lView.setUint16(4, 20, true); // version needed
      lView.setUint16(6, 0x0800, true); // UTF-8 flag
      lView.setUint16(8, 0, true); // store (no compression)
      lView.setUint16(10, 0, true);
      lView.setUint16(12, 0, true);
      lView.setUint32(14, crc, true);
      lView.setUint32(18, size, true);
      lView.setUint32(22, size, true);
      lView.setUint16(26, nameBytes.length, true);
      lView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      localParts.push(localHeader, dataBytes);

      // Central directory header (46 bytes + name)
      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const cView = new DataView(centralHeader.buffer);
      cView.setUint32(0, 0x02014b50, true);
      cView.setUint16(4, 20, true);
      cView.setUint16(6, 20, true);
      cView.setUint16(8, 0x0800, true);
      cView.setUint16(10, 0, true);
      cView.setUint16(12, 0, true);
      cView.setUint16(14, 0, true);
      cView.setUint32(16, crc, true);
      cView.setUint32(20, size, true);
      cView.setUint32(24, size, true);
      cView.setUint16(28, nameBytes.length, true);
      cView.setUint16(30, 0, true);
      cView.setUint16(32, 0, true);
      cView.setUint16(34, 0, true);
      cView.setUint16(36, 0, true);
      cView.setUint32(38, 0, true);
      cView.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);

      centralParts.push(centralHeader);
      offset += localHeader.length + size;
    }

    let centralSize = 0;
    for (const p of centralParts) centralSize += p.length;

    const eocd = new Uint8Array(22);
    const eView = new DataView(eocd.buffer);
    eView.setUint32(0, 0x06054b50, true);
    eView.setUint16(4, 0, true);
    eView.setUint16(6, 0, true);
    eView.setUint16(8, files.length, true);
    eView.setUint16(10, files.length, true);
    eView.setUint32(12, centralSize, true);
    eView.setUint32(16, offset, true);
    eView.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, eocd], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  function exportV1TableToXlsx() {
    const rows = getFilteredAndSortedV1Rows();
    if (!rows.length) return;

    const xmlEsc = (val) =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    const colLetter = (idx) => {
      let s = '';
      let n = idx + 1;
      while (n > 0) {
        const m = (n - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        n = Math.floor((n - 1) / 26);
      }
      return s;
    };

    const headers = [
      'ลำดับ',
      'Signal (แอด 107฿)',
      'คอมสุทธิ/ชิ้น (฿)',
      'จุดคุ้มทุนแอด 107฿ (ชิ้น)',
      'สินค้า',
      'ราคาเริ่มต้น (฿)',
      'ราคาสูงสุด (฿)',
      'ขาย/เดือน (ชิ้น)',
      'ขายทั้งหมด (ชิ้น)',
      'Extra (%)',
      'คอม Extra เริ่มต้น (฿)',
      'คอม Extra สูงสุด (฿)',
      'เรทคอมรวม (%)',
      'สต๊อก',
      'ร้าน Mall',
      'รีวิวฟรี',
      'ลิงก์สินค้า Shopee',
      'ลิงก์หน้า Affiliate',
      'Item ID'
    ];

    const colWidths = [7, 22, 16, 18, 48, 14, 14, 15, 15, 11, 16, 16, 13, 11, 10, 10, 42, 45, 16];

    // Style index mapping in styles.xml:
    // 0: default
    // 1: Header (Dark Navy #181B26, White Bold Text)
    // 2: GOD TIER text/general (#F3E8FF)
    // 3: GOD TIER number (#F3E8FF)
    // 4: PASS text/general (#DCFCE7)
    // 5: PASS number (#DCFCE7)
    // 6: WARNING text/general (#FFEDD5)
    // 7: WARNING number (#FFEDD5)
    // 8: DANGER text/general (#FEE2E2)
    // 9: DANGER number (#FEE2E2)
    const getStylePair = (tier) => {
      if (tier === 'god') return [2, 3];
      if (tier === 'pass') return [4, 5];
      if (tier === 'warning') return [6, 7];
      return [8, 9];
    };

    const xmlRows = [];
    // Row 1: Header
    const headerCells = headers
      .map((h, cIdx) => `<c r="${colLetter(cIdx)}1" t="inlineStr" s="1"><is><t>${xmlEsc(h)}</t></is></c>`)
      .join('');
    xmlRows.push(`<row r="1" ht="24" customHeight="1">${headerCells}</row>`);

    // Data Rows
    rows.forEach((r, rIdx) => {
      const rowNum = rIdx + 2;
      const [sTxt, sNum] = getStylePair(r.tier);
      const rowValues = [
        { t: 'n', v: rIdx + 1, s: sTxt },
        { t: 's', v: r.tierLabel, s: sTxt },
        { t: 'n', v: r.netComm, s: sNum },
        { t: 'n', v: r.breakEvenNum, s: sNum },
        { t: 's', v: r.name, s: sTxt },
        { t: 'n', v: r.price, s: sNum },
        { t: 'n', v: r.priceMax, s: sNum },
        { t: 'n', v: r.sold, s: sTxt },
        { t: 'n', v: r.historical_sold, s: sTxt },
        { t: 'n', v: r.extraRate, s: sNum },
        { t: 'n', v: r.extraComm, s: sNum },
        { t: 'n', v: r.extraCommMax, s: sNum },
        { t: 'n', v: r.effectiveRate, s: sNum },
        { t: 'n', v: r.stock, s: sTxt },
        { t: 's', v: r.isMall ? 'Mall' : 'ทั่วไป', s: sTxt },
        { t: 's', v: r.isFreeSample ? 'ฟรี' : '-', s: sTxt },
        { t: 's', v: r.productLink, s: sTxt },
        { t: 's', v: r.affUrl, s: sTxt },
        { t: 's', v: r.itemid, s: sTxt }
      ];

      const cellsXml = rowValues
        .map((cell, cIdx) => {
          const ref = `${colLetter(cIdx)}${rowNum}`;
          if (cell.t === 'n' && Number.isFinite(Number(cell.v))) {
            return `<c r="${ref}" t="n" s="${cell.s}"><v>${Number(cell.v)}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr" s="${cell.s}"><is><t>${xmlEsc(cell.v)}</t></is></c>`;
        })
        .join('');

      xmlRows.push(`<row r="${rowNum}" ht="19" customHeight="1">${cellsXml}</row>`);
    });

    const lastColLetter = colLetter(headers.length - 1);
    const lastRowNum = rows.length + 1;
    const colsXml = colWidths
      .map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`)
      .join('');

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>${xmlRows.join('')}</sheetData>
  <autoFilter ref="A1:${lastColLetter}${lastRowNum}"/>
</worksheet>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="#,##0.00"/>
  </numFmts>
  <fonts count="3">
    <font><sz val="10"/><color rgb="FF111827"/><name val="Tahoma"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Tahoma"/></font>
    <font><b/><sz val="10"/><color rgb="FF111827"/><name val="Tahoma"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF181B26"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF3E8FF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFEDD5"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFEE2E2"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD1D5DB"/></left>
      <right style="thin"><color rgb="FFD1D5DB"/></right>
      <top style="thin"><color rgb="FFD1D5DB"/></top>
      <bottom style="thin"><color rgb="FFD1D5DB"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="DrBank V1 Signal" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

    const blob = createZipArchive([
      { name: '[Content_Types].xml', content: contentTypesXml },
      { name: '_rels/.rels', content: rootRelsXml },
      { name: 'xl/workbook.xml', content: workbookXml },
      { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
      { name: 'xl/styles.xml', content: stylesXml },
      { name: 'xl/worksheets/sheet1.xml', content: sheetXml }
    ]);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    a.href = url;
    a.download = `${dateStr}_DrBank_V1_Signal_${rows.length}items.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    ns.showToast(`📗 ส่งออกไฟล์ Excel แท้ (.xlsx) ${rows.length} รายการ (แยกสีตาม Signal + Freeze Header) เรียบร้อย!`);
  }

  function exportV1TableToCsv() {
    const rows = getFilteredAndSortedV1Rows();
    if (!rows.length) return;

    const headers = [
      'ลำดับ',
      'Signal (แอด 107฿)',
      'คอมสุทธิ/ชิ้น (฿)',
      'จุดคุ้มทุนแอด 107฿ (ชิ้น)',
      'สินค้า',
      'ราคาเริ่มต้น (฿)',
      'ราคาสูงสุด (฿)',
      'ขาย/เดือน (ชิ้น)',
      'ขายทั้งหมด (ชิ้น)',
      'ค่าคอม Extra (%)',
      'ค่าคอม Extra เริ่มต้น (฿)',
      'ค่าคอม Extra สูงสุด (฿)',
      'สต๊อก',
      'ร้าน Mall',
      'รีวิวฟรี',
      'ลิงก์สินค้า',
      'ลิงก์หน้า Affiliate',
      'Shop ID',
      'Item ID'
    ];

    const esc = (val) => {
      const s = val === null || val === undefined ? '' : String(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csvLines = [
      headers.map(esc).join(','),
      ...rows.map((r, i) =>
        [
          i + 1,
          r.tierLabel,
          r.netComm.toFixed(2),
          r.breakEvenUnits,
          r.name,
          r.price,
          r.priceMax,
          r.sold,
          r.historical_sold,
          r.extraRate,
          r.extraComm.toFixed(2),
          r.extraCommMax.toFixed(2),
          r.stock,
          r.isMall ? 'ใช่' : 'ไม่ใช่',
          r.isFreeSample ? 'ใช่' : 'ไม่ใช่',
          r.productLink,
          r.affUrl,
          r.shopid,
          r.itemid
        ]
          .map(esc)
          .join(',')
      )
    ];

    // Prepend UTF-8 BOM (\uFEFF) so Microsoft Excel opens Thai characters cleanly
    const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    a.href = url;
    a.download = `${dateStr}_DrBank_V1_Signal_${rows.length}items.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    ns.showToast(`📥 ดาวน์โหลด CSV (${rows.length} รายการ) เรียบร้อย!`);
  }

  function checkHashForV1Scanner() {
    if (location.hash.includes('v1_scanner') || location.hash.includes('st-action=get_items')) {
      setTimeout(() => openV1ScannerModal(), 350);
    }
  }
  window.addEventListener('hashchange', checkHashForV1Scanner);
  checkHashForV1Scanner();

  // Debounced Auto-Scanner for Offer Grid & Offer Detail
  let scanTimer = null;
  function scheduleScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      if (isOfferDetailUrl()) {
        scrapeOfferDetailPage();
      } else {
        scanAndOverlayOfferGrid();
      }
    }, 650);
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (
        m.target &&
        m.target.nodeType === 1 &&
        !m.target.closest?.('.drb-aff-card-overlay, #drb-aff-grid-toolbar')
      ) {
        scheduleScan();
        break;
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
  setTimeout(scheduleScan, 900);
  setTimeout(scheduleScan, 2200);
})();
