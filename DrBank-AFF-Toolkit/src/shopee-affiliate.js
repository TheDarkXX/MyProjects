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
    });
  }

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
