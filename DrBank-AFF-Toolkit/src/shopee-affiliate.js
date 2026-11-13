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
        <button type="button" class="drb-grid-power-btn ${isOn ? 'is-on' : 'is-off'}" id="drb-btn-toggle-radar" title="คลิกเพื่อเปิด/ปิด การแสดงป้าย Signal บนการ์ดสินค้าทั้งหมด">
          <span class="drb-grid-power-dot"></span>
          <span>${isOn ? 'RADAR ON' : 'RADAR OFF'}</span>
        </button>
        <button type="button" class="drb-grid-v1-launch-btn" id="drb-btn-open-v1-scanner" title="เปิดตารางค้นหาสินค้า V1 Realtime (ดูดรวดเดียว 500 ชิ้น + คำนวณ Signal จุดคุ้มทุนแอด 107฿)">
          เปิดตาราง V1 Scanner ↗
        </button>
      </div>
      <div class="drb-grid-tb-actions" style="${isOn ? '' : 'display:none;'}">
        <button type="button" class="drb-grid-filter-btn ${gridFilterState.mode === 'all' && !gridFilterState.dimDanger && !gridFilterState.hideDanger ? 'active' : ''}" id="drb-btn-reset-default" title="ค่าเริ่มต้น: แสดงการ์ดทั้งหมดตามปกติ">
          ทั้งหมด <span class="drb-grid-cnt">${c.total}</span>
        </button>
        <button type="button" class="drb-grid-filter-btn drb-grid-filter-btn--win ${gridFilterState.mode === 'win' ? 'active' : ''}" data-mode="win" title="แสดงเฉพาะสินค้าที่น่าลุยแอด (คอมสุทธิ ≥฿45/ชิ้น)">
          <span class="drb-v1-dot drb-v1-dot--pass"></span>น่าลุย ≥฿45 <span class="drb-grid-cnt">${c.win}</span>
        </button>
        <button type="button" class="drb-grid-filter-btn drb-grid-filter-btn--warn ${gridFilterState.mode === 'warn' ? 'active' : ''}" data-mode="warn" title="แสดงสินค้าที่ได้คอมสุทธิ ≥฿20/ชิ้น ขึ้นไป">
          <span class="drb-v1-dot drb-v1-dot--warn"></span>พอไหว ≥฿20 <span class="drb-grid-cnt">${c.win + c.warn}</span>
        </button>
        <span class="drb-grid-tb-sep"></span>
        <button type="button" class="drb-grid-filter-btn drb-grid-filter-btn--sub ${gridFilterState.dimDanger ? 'active' : ''}" id="drb-btn-toggle-dim" title="ดรอปแสงการ์ดที่ได้คอม <฿20 ให้จางลง">
          ดรอปแสง &lt;฿20
        </button>
        <button type="button" class="drb-grid-filter-btn drb-grid-filter-btn--danger ${gridFilterState.hideDanger ? 'active' : ''}" id="drb-btn-toggle-hide" title="ซ่อนการ์ดที่ได้คอม <฿20 ออกจากหน้าจอ">
          <span class="drb-v1-dot drb-v1-dot--danger"></span>ซ่อน &lt;฿20 <span class="drb-grid-cnt">${c.danger}</span>
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
  const V1_CUSTOM_PRESETS_KEY = 'drbV1CustomPresets';
  let v1CustomPresets = [];
  let v1State = {
    isOpen: false,
    isLoading: false,
    cancelRequested: false,
    rows: [],
    showAdvFilters: false,    // ซ่อนเมนู Advanced Filter เป็นค่าเริ่มต้น (กดเปิดเมื่อต้องการตั้งค่า)
    activePreset: '',         // '' | 'ad107' | 'impulse' | 'mallhot' | 'bigcomm'
    signalFilter: 'all',      // 'all' | 'win' | 'god' | 'pass' | 'warning' | 'danger'
    minNetComm: 0,            // คอมสุทธิ/ชิ้น ต่ำสุด (฿)
    maxNetComm: 0,            // คอมสุทธิ/ชิ้น สูงสุด (฿)
    minBreakEven: 0,          // คุ้มแอด 107฿ ต่ำสุด (ชิ้น)
    maxBreakEven: 0,          // คุ้มแอด 107฿ สูงสุด (ชิ้น)
    textFilter: '',           // ค้นชื่อสินค้า / ID (รองรับ -คำ เพื่อตัดคำออก)
    onlyMall: false,          // เฉพาะร้าน Shopee Mall
    onlyExtra: false,         // เฉพาะที่มี Extra (>0%)
    onlyFreeSample: false,    // เฉพาะแจกตัวอย่างฟรี
    minPrice: 0,              // ราคาจริง ต่ำสุด (฿)
    maxPrice: 0,              // ราคาจริง สูงสุด (฿)
    minSoldFilter: 0,         // ขาย/เดือน ต่ำสุด (ชิ้น)
    maxSoldFilter: 0,         // ขาย/เดือน สูงสุด (ชิ้น)
    minHistSold: 0,           // ขายรวมสะสม ต่ำสุด (ชิ้น)
    maxHistSold: 0,           // ขายรวมสะสม สูงสุด (ชิ้น)
    minExtraRate: 0,          // Extra % ต่ำสุด
    maxExtraRate: 0,          // Extra % สูงสุด
    minExtraComm: 0,          // คอม Extra ต่ำสุด (฿)
    maxExtraComm: 0,          // คอม Extra สูงสุด (฿)
    minStock: 0,              // สต๊อก ต่ำสุด (ชิ้น)
    maxStock: 0,              // สต๊อก สูงสุด (ชิ้น)
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
      <!-- Row 1: Unified Single-Line Command Cockpit (Clean Minimal 40px) -->
      <div class="drb-v1-controls">
        <span class="drb-v1-badge-live" title="Shopee Affiliate V1 Realtime API + DrBank 107฿/Day Signal Radar">
          <span class="drb-v1-live-dot"></span>V1 RADAR
        </span>

        <div class="drb-v1-control-group drb-v1-control-group--search">
          <input type="text" id="drb-v1-inp-keyword" class="drb-v1-input" placeholder="ค้นหาสินค้า เช่น กล่องถนอมอาหาร, โปรตีน, เซรั่ม...">
          <button type="button" class="drb-v1-btn drb-v1-btn--primary" id="drb-v1-btn-search" disabled title="พิมพ์คำค้นหาในช่องด้านซ้ายก่อนกดค้นหา">
            ค้นหา
          </button>
        </div>

        <div class="drb-v1-control-group">
          <select id="drb-v1-sel-sort" class="drb-v1-select" title="ลำดับการดึงเมื่อค้นหาด้วยคำค้น">
            <option value="2" selected>เรียง: ขายดีสุด</option>
            <option value="5">เรียง: คอม % สูง</option>
            <option value="1">เรียง: เกี่ยวข้อง</option>
            <option value="3">เรียง: ราคาสูง➔ต่ำ</option>
          </select>
        </div>

        <div class="drb-v1-control-group">
          <label class="drb-v1-chk-label" title="กรองเฉพาะสินค้าที่มีค่าคอมพิเศษ Extra">
            <input type="checkbox" id="drb-v1-chk-extra" value="2" checked>
            <span>Extra</span>
          </label>
          <label class="drb-v1-chk-label" title="กรองเฉพาะสินค้ารีวิวฟรี">
            <input type="checkbox" id="drb-v1-chk-free" value="5">
            <span>รีวิวฟรี</span>
          </label>
        </div>

        <span class="drb-v1-ctrl-divider" aria-hidden="true"></span>

        <div class="drb-v1-control-group">
          <select id="drb-v1-sel-extra-cat" class="drb-v1-select drb-v1-select--cat" title="เลือกดึงตามหมวดหมู่สินค้า">
            <option value="0">หมวด: ข้อเสนอพิเศษทั้งหมด</option>
            <option value="7">หมวด: ค่าคอมพิเศษ (Extra)</option>
            <option value="9">หมวด: สินค้ารีวิวฟรี</option>
            <option value="2">หมวด: สินค้าขายดี</option>
            <option disabled>── แบ่งตามหมวดหมู่ ──</option>
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
          <button type="button" class="drb-v1-btn drb-v1-btn--deep-blue" id="drb-v1-btn-fetch-cat" title="ดึงสินค้าตามหมวดหมู่ที่เลือกทันที (ไม่ต้องพิมพ์คำค้นหา)">
            ⚡ ดึงหมวดนี้
          </button>
        </div>

        <div class="drb-v1-control-group">
          <select id="drb-v1-sel-limit" class="drb-v1-select" title="จำนวนสินค้าสูงสุดที่จะดึง">
            <option value="60">60 ชิ้น (3 หน้า)</option>
            <option value="100" selected>100 ชิ้น (5 หน้า)</option>
            <option value="200">200 ชิ้น (10 หน้า)</option>
            <option value="300">300 ชิ้น (15 หน้า)</option>
            <option value="500">500 ชิ้น (25 หน้า)</option>
          </select>
          <select id="drb-v1-sel-delay" class="drb-v1-select" title="หน่วงเวลาต่อหน้า (20 ชิ้น) เพื่อป้องกัน Shopee เตะออก">
            <option value="5000" selected>หน่วง 5s+Jitter</option>
            <option value="3500">หน่วง 3.5s+Jitter</option>
            <option value="2000">หน่วง 2s+Jitter</option>
          </select>
        </div>

        <div class="drb-v1-header-right">
          <button type="button" class="drb-v1-btn drb-v1-btn--ghost" id="drb-v1-btn-restore" style="display:none;" title="กู้คืนรายการที่ดึงไว้ล่าสุด">
            ล่าสุด
          </button>
          <button type="button" class="drb-v1-btn drb-v1-btn--ghost-emerald" id="drb-v1-btn-export-xlsx" disabled title="ส่งออกไฟล์ Excel .xlsx แท้ (แยกสีตาม Signal + ตัวเลขคำนวณต่อได้ทันที)">
            Excel (.xlsx)
          </button>
          <button type="button" class="drb-v1-btn drb-v1-btn--ghost" id="drb-v1-btn-export-csv" disabled title="ส่งออกไฟล์ .csv มาตรฐาน">
            CSV
          </button>
          <button type="button" class="drb-v1-btn drb-v1-btn--close" id="drb-v1-btn-close" aria-label="ปิดตาราง" title="ปิดตารางกลับหน้าปกติ">
            ✕
          </button>
        </div>
      </div>

      <!-- Progress Bar Banner (Shown while fetching pages) -->
      <div class="drb-v1-progress-wrap" id="drb-v1-progress-wrap" style="display:none;">
        <div class="drb-v1-progress-info">
          <span id="drb-v1-progress-text">กำลังดึงข้อมูลจาก Shopee API...</span>
          <button type="button" class="drb-v1-btn drb-v1-btn--danger-sm" id="drb-v1-btn-cancel">
            หยุดและแสดงข้อมูลที่โหลดแล้ว
          </button>
        </div>
        <div class="drb-v1-progress-track">
          <div class="drb-v1-progress-bar" id="drb-v1-progress-bar" style="width:0%;"></div>
        </div>
      </div>

      <!-- Row 2: Clean Signal Radar Bar (Advanced Filter Drawer Hidden by Default) -->
      <div class="drb-v1-signal-bar">
        <div class="drb-v1-signal-pills" id="drb-v1-signal-pills">
          <button type="button" class="drb-v1-pill active" data-sig="all">
            ทั้งหมด <span class="drb-v1-pill-cnt" id="drb-v1-cnt-all">0</span>
          </button>
          <button type="button" class="drb-v1-pill drb-v1-pill--win" data-sig="win">
            <span class="drb-v1-dot drb-v1-dot--pass"></span>น่าลุย ≥฿45 <span class="drb-v1-pill-cnt" id="drb-v1-cnt-win">0</span>
          </button>
          <button type="button" class="drb-v1-pill drb-v1-pill--god" data-sig="god">
            <span class="drb-v1-dot drb-v1-dot--god"></span>GOD ≥฿80 <span class="drb-v1-pill-cnt" id="drb-v1-cnt-god">0</span>
          </button>
          <button type="button" class="drb-v1-pill drb-v1-pill--pass" data-sig="pass">
            <span class="drb-v1-dot drb-v1-dot--pass"></span>คุ้ม ฿45–79 <span class="drb-v1-pill-cnt" id="drb-v1-cnt-pass">0</span>
          </button>
          <button type="button" class="drb-v1-pill drb-v1-pill--warn" data-sig="warning">
            <span class="drb-v1-dot drb-v1-dot--warn"></span>พอไหว ฿20–44 <span class="drb-v1-pill-cnt" id="drb-v1-cnt-warn">0</span>
          </button>
          <button type="button" class="drb-v1-pill drb-v1-pill--danger" data-sig="danger">
            <span class="drb-v1-dot drb-v1-dot--danger"></span>ห้ามยิง &lt;฿20 <span class="drb-v1-pill-cnt" id="drb-v1-cnt-danger">0</span>
          </button>
        </div>

        <div class="drb-v1-subfilters">
          <button type="button" class="drb-v1-btn drb-v1-btn--colfilter" id="drb-v1-btn-toggle-adv" title="เปิด/ซ่อนเมนู Advanced Filter (Min–Max ทุกคอลัมน์ + สูตรลัด)">
            ⚙️ Advanced Filter <span class="drb-v1-filter-count-badge" id="drb-v1-filter-count" style="display:none;">0</span>
          </button>
          <button type="button" class="drb-v1-btn drb-v1-btn--ghost" id="drb-v1-btn-reset-filters" style="display:none;" title="ล้างตัวกรองทั้งหมดกลับเป็นค่าเริ่มต้น">
            ↺ ล้างกรอง
          </button>
          <span class="drb-v1-showing-label drb-v1-mono" id="drb-v1-showing-label">0 / 0 รายการ</span>
        </div>
      </div>

      <!-- Collapsible Advanced Filter Menu Drawer (Hidden by Default) -->
      <div class="drb-v1-adv-panel" id="drb-v1-adv-panel">
        <div class="drb-adv-top-row">
          <div class="drb-v1-preset-group" id="drb-v1-preset-group">
            <span class="drb-v1-ctrl-label">Presets</span>
            <button type="button" class="drb-v1-preset-btn" data-preset="ad107" title="คอม ≥฿45 + คืนทุน 1–2 ชิ้น + มี Extra + ขาย ≥100/ด. + สต๊อก ≥50">
              สูตรเทพ 107฿
            </button>
            <button type="button" class="drb-v1-preset-btn" data-preset="impulse" title="ราคา ฿150–500 + Extra ≥8% + ขาย ≥50/ด. + สต๊อก ≥30">
              Impulse 150–500฿
            </button>
            <button type="button" class="drb-v1-preset-btn" data-preset="mallhot" title="เฉพาะร้านทางการ Shopee Mall + มี Extra + ขาย ≥100/ด. + สต๊อก ≥50">
              Mall ขายดี
            </button>
            <button type="button" class="drb-v1-preset-btn" data-preset="bigcomm" title="คอมสุทธิ ≥฿100/ชิ้น + ขาย ≥20/ด. + สต๊อก ≥20">
              คอมโหด ≥฿100
            </button>
            <span class="drb-v1-custom-presets" id="drb-v1-custom-presets"></span>
            <button type="button" class="drb-v1-preset-btn drb-v1-preset-btn--save" id="drb-v1-btn-save-preset" title="บันทึกค่า Filter ปัจจุบันเก็บไว้เป็นปุ่ม Preset ส่วนตัว">
              + Save Preset
            </button>
            <span class="drb-v1-save-preset-form" id="drb-v1-save-preset-form" style="display:none;">
              <input type="text" id="drb-v1-inp-preset-name" class="drb-v1-preset-name-inp" placeholder="Preset name..." maxlength="24">
              <button type="button" class="drb-v1-preset-confirm-btn" id="drb-v1-btn-confirm-preset">Save</button>
            </span>
          </div>

          <div class="drb-adv-kw-toggles">
            <input type="text" id="drb-af-keyword" class="drb-adv-kw-input" placeholder="Search product / Item ID (type -word to exclude)...">
            <label class="drb-cf-tag-chk" title="กรองเฉพาะร้านค้าทางการ Shopee Mall">
              <input type="checkbox" id="drb-af-mall">
              <span>Shopee Mall Only</span>
            </label>
          </div>

          <div class="drb-adv-actions">
            <button type="button" class="drb-v1-btn drb-v1-btn--ghost" id="drb-af-btn-clear" title="ล้างค่าตัวกรองทั้งหมด">
              ↺ Reset
            </button>
            <button type="button" class="drb-v1-btn drb-v1-btn--primary" id="drb-af-btn-hide" title="พับเก็บหน้าต่าง Advanced Filter (ตัวกรองยังทำงานต่อเนื่อง)">
              ✓ Hide
            </button>
          </div>
        </div>

        <div class="drb-adv-grid">
          <div class="drb-adv-field">
            <label class="drb-adv-label" title="ค่าคอมมิชชั่นสุทธิต่อชิ้น (บาท) หลังหักภาษี ณ ที่จ่าย 3% แล้ว">Net Comm (฿)</label>
            <div class="drb-adv-minmax">
              <input type="number" id="drb-af-min-netcomm" class="drb-adv-num drb-v1-mono" placeholder="Min" min="0" step="5">
              <span class="drb-adv-sep">–</span>
              <input type="number" id="drb-af-max-netcomm" class="drb-adv-num drb-v1-mono" placeholder="Max" min="0" step="5">
            </div>
          </div>

          <div class="drb-adv-field">
            <label class="drb-adv-label drb-adv-label--tip" data-tip="Break-Even Point (จุดคุ้มทุนแอด 107฿/วัน) = ต้องขายกี่ชิ้นต่อวันถึงคืนทุนค่าแอด 100฿ + VAT 7% (คำนวณจาก 107 ÷ Net Comm) • ยิ่งตัวเลขน้อย ยิ่งคืนทุนไว (แนะนำ 1–2 ชิ้น)" title="Break-Even Point (จุดคุ้มทุนแอด 107฿/วัน) = ต้องขายกี่ชิ้นต่อวันถึงคืนทุนค่าแอด 100฿ + VAT 7% (คำนวณจาก 107 ÷ Net Comm) • ยิ่งตัวเลขน้อย ยิ่งคืนทุนไว">
              BE Point (Units) <span class="drb-v1-help-icon">?</span>
            </label>
            <div class="drb-adv-minmax">
              <input type="number" id="drb-af-min-breakeven" class="drb-adv-num drb-v1-mono" placeholder="Min" min="0" step="0.5">
              <span class="drb-adv-sep">–</span>
              <input type="number" id="drb-af-max-breakeven" class="drb-adv-num drb-v1-mono" placeholder="Max" min="0" step="0.5">
            </div>
          </div>

          <div class="drb-adv-field">
            <label class="drb-adv-label" title="ราคาขายจริงหน้าเว็บ Shopee (บาท)">Price (฿)</label>
            <div class="drb-adv-minmax">
              <input type="number" id="drb-af-min-price" class="drb-adv-num drb-v1-mono" placeholder="Min" min="0" step="10">
              <span class="drb-adv-sep">–</span>
              <input type="number" id="drb-af-max-price" class="drb-adv-num drb-v1-mono" placeholder="Max" min="0" step="50">
            </div>
          </div>

          <div class="drb-adv-field">
            <label class="drb-adv-label" title="ยอดขายต่อเดือน (ชิ้น/เดือน)">Monthly Sold</label>
            <div class="drb-adv-minmax">
              <input type="number" id="drb-af-min-sold" class="drb-adv-num drb-v1-mono" placeholder="Min" min="0" step="50">
              <span class="drb-adv-sep">–</span>
              <input type="number" id="drb-af-max-sold" class="drb-adv-num drb-v1-mono" placeholder="Max" min="0" step="100">
            </div>
          </div>

          <div class="drb-adv-field">
            <label class="drb-adv-label" title="ยอดขายรวมสะสมทั้งหมด (ชิ้น)">Total Sold</label>
            <div class="drb-adv-minmax">
              <input type="number" id="drb-af-min-histsold" class="drb-adv-num drb-v1-mono" placeholder="Min" min="0" step="100">
              <span class="drb-adv-sep">–</span>
              <input type="number" id="drb-af-max-histsold" class="drb-adv-num drb-v1-mono" placeholder="Max" min="0" step="500">
            </div>
          </div>

          <div class="drb-adv-field">
            <label class="drb-adv-label" title="เปอร์เซ็นต์ค่าคอมพิเศษ Extra จากร้านค้า (%)">Extra Rate (%)</label>
            <div class="drb-adv-minmax">
              <input type="number" id="drb-af-min-extrarate" class="drb-adv-num drb-v1-mono" placeholder="Min" min="0" step="1">
              <span class="drb-adv-sep">–</span>
              <input type="number" id="drb-af-max-extrarate" class="drb-adv-num drb-v1-mono" placeholder="Max" min="0" step="1">
            </div>
          </div>

          <div class="drb-adv-field">
            <label class="drb-adv-label" title="จำนวนเงินค่าคอมพิเศษ Extra ต่อชิ้น (บาท)">Extra Comm (฿)</label>
            <div class="drb-adv-minmax">
              <input type="number" id="drb-af-min-extracomm" class="drb-adv-num drb-v1-mono" placeholder="Min" min="0" step="10">
              <span class="drb-adv-sep">–</span>
              <input type="number" id="drb-af-max-extracomm" class="drb-adv-num drb-v1-mono" placeholder="Max" min="0" step="10">
            </div>
          </div>

          <div class="drb-adv-field">
            <label class="drb-adv-label" title="จำนวนสต๊อกคงเหลือในคลัง (ชิ้น)">Stock</label>
            <div class="drb-adv-minmax">
              <input type="number" id="drb-af-min-stock" class="drb-adv-num drb-v1-mono" placeholder="Min" min="0" step="20">
              <span class="drb-adv-sep">–</span>
              <input type="number" id="drb-af-max-stock" class="drb-adv-num drb-v1-mono" placeholder="Max" min="0" step="50">
            </div>
          </div>
        </div>
      </div>

      <!-- Row 3: Clean Single-Header High-Density Sortable Signal Table -->
      <div class="drb-v1-table-container">
        <table class="drb-v1-table">
          <thead>
            <tr class="drb-v1-header-row">
              <th style="width:34px; text-align:center;">#</th>
              <th style="width:38px; text-align:center;">IMG</th>
              <th class="drb-v1-sortable is-sorted" data-sort="signalScore" data-label="SIGNAL" style="width:132px;" title="คลิกเพื่อเรียงตามเกรดความน่าลุยแอด (GOD ➔ คุ้ม ➔ พอไหว ➔ ห้ามยิง)">SIGNAL ▼</th>
              <th class="drb-v1-sortable" data-sort="netComm" data-label="NET COMM" style="width:130px; text-align:right;" title="คลิกเพื่อเรียงตามค่าคอมสุทธิต่อชิ้น หลังหักภาษี ณ ที่จ่าย 3%">NET COMM ⇅</th>
              <th class="drb-v1-sortable drb-v1-th-tip" data-sort="breakEvenNum" data-label="BE POINT" style="width:112px; text-align:center;" data-tip="Break-Even Point = ต้องขายกี่ชิ้น/วัน ถึงจะคุ้มค่าแอด 107฿ (100฿ + VAT 7%) • ยิ่งน้อยยิ่งคืนทุนไว" title="Break-Even Point (จุดคุ้มทุนแอด 107฿/วัน) = ต้องขายกี่ชิ้นต่อวันถึงจะคุ้มค่าแอด 107฿ (คำนวณจาก 107 ÷ Net Comm)">BE POINT ⇅</th>
              <th class="drb-v1-sortable" data-sort="name" data-label="PRODUCT / SHOP" title="คลิกเพื่อเรียงตามชื่อสินค้า ก-ฮ / A-Z">PRODUCT / SHOP ⇅</th>
              <th class="drb-v1-sortable" data-sort="price" data-label="PRICE" style="width:112px; text-align:right;" title="คลิกเพื่อเรียงตามราคาขายจริง">PRICE ⇅</th>
              <th class="drb-v1-sortable" data-sort="sold" data-label="SOLD / MO" style="width:94px; text-align:right;" title="คลิกเพื่อเรียงตามยอดขายต่อเดือน (ชิ้น)">SOLD / MO ⇅</th>
              <th class="drb-v1-sortable" data-sort="historical_sold" data-label="TOTAL SOLD" style="width:96px; text-align:right;" title="คลิกเพื่อเรียงตามยอดขายสะสมทั้งหมด">TOTAL SOLD ⇅</th>
              <th class="drb-v1-sortable" data-sort="extraRate" data-label="EXTRA %" style="width:82px; text-align:right;" title="คลิกเพื่อเรียงตามเปอร์เซ็นต์ค่าคอมพิเศษ Extra %">EXTRA % ⇅</th>
              <th class="drb-v1-sortable" data-sort="extraComm" data-label="EXTRA ฿" style="width:96px; text-align:right;" title="คลิกเพื่อเรียงตามจำนวนเงินค่าคอมพิเศษ Extra (฿)">EXTRA ฿ ⇅</th>
              <th class="drb-v1-sortable" data-sort="stock" data-label="STOCK" style="width:78px; text-align:right;" title="คลิกเพื่อเรียงตามจำนวนสต๊อกคงเหลือ">STOCK ⇅</th>
              <th style="width:118px; text-align:center;">ACTION</th>
            </tr>
          </thead>
          <tbody id="drb-v1-tbody">
            <tr>
              <td colspan="13" class="drb-v1-empty">
                พิมพ์คำค้นหาด้านบนแล้วกด <strong>[ค้นหา]</strong> หรือเลือกหมวดหมู่แล้วกดปุ่มสีน้ำเงิน <strong class="drb-v1-empty-cta-blue">[⚡ ดึงหมวดนี้]</strong> เพื่อสแกนข้อมูล Realtime พร้อมคำนวณจุดคุ้มทุนแอด 107฿
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    document.body.appendChild(wrap);
    bindV1ScannerEvents(wrap);
    loadAndRenderCustomPresets(wrap);
    checkAndOfferLastResultRestore(wrap);
    return wrap;
  }

  function hasAnyActiveV1Filter() {
    if (v1State.signalFilter !== 'all') return true;
    if (v1State.textFilter) return true;
    if (v1State.onlyMall) return true;
    for (const f of V1_NUMERIC_FILTER_FIELDS) {
      if ((Number(v1State[f.key]) || 0) > 0) return true;
    }
    return false;
  }

  async function loadAndRenderCustomPresets(wrap) {
    try {
      const res = await chrome.storage.local.get([V1_CUSTOM_PRESETS_KEY]);
      if (Array.isArray(res?.[V1_CUSTOM_PRESETS_KEY])) {
        v1CustomPresets = res[V1_CUSTOM_PRESETS_KEY];
      }
    } catch (_e) {}
    renderCustomPresetButtons(wrap);
  }

  function renderCustomPresetButtons(wrap) {
    if (!wrap) wrap = document.getElementById('drb-v1-scanner-overlay');
    if (!wrap) return;
    const holder = wrap.querySelector('#drb-v1-custom-presets');
    if (!holder) return;

    holder.innerHTML = v1CustomPresets
      .map(
        (p) => `
          <button type="button" class="drb-v1-preset-btn drb-v1-preset-btn--custom ${v1State.activePreset === p.id ? 'active' : ''}" data-preset="${ns.escapeHtml(p.id)}" title="Custom Preset: ${ns.escapeHtml(p.name)}">
            <span>${ns.escapeHtml(p.name)}</span>
            <span class="drb-v1-preset-del" data-del-preset="${ns.escapeHtml(p.id)}" title="ลบ Preset นี้">×</span>
          </button>
        `
      )
      .join('');
  }

  const V1_NUMERIC_FILTER_FIELDS = [
    { id: '#drb-af-min-netcomm', key: 'minNetComm', isInt: false },
    { id: '#drb-af-max-netcomm', key: 'maxNetComm', isInt: false },
    { id: '#drb-af-min-breakeven', key: 'minBreakEven', isInt: false },
    { id: '#drb-af-max-breakeven', key: 'maxBreakEven', isInt: false },
    { id: '#drb-af-min-price', key: 'minPrice', isInt: false },
    { id: '#drb-af-max-price', key: 'maxPrice', isInt: false },
    { id: '#drb-af-min-sold', key: 'minSoldFilter', isInt: true },
    { id: '#drb-af-max-sold', key: 'maxSoldFilter', isInt: true },
    { id: '#drb-af-min-histsold', key: 'minHistSold', isInt: true },
    { id: '#drb-af-max-histsold', key: 'maxHistSold', isInt: true },
    { id: '#drb-af-min-extrarate', key: 'minExtraRate', isInt: false },
    { id: '#drb-af-max-extrarate', key: 'maxExtraRate', isInt: false },
    { id: '#drb-af-min-extracomm', key: 'minExtraComm', isInt: false },
    { id: '#drb-af-max-extracomm', key: 'maxExtraComm', isInt: false },
    { id: '#drb-af-min-stock', key: 'minStock', isInt: true },
    { id: '#drb-af-max-stock', key: 'maxStock', isInt: true }
  ];

  function clearNumericAndTagFilters() {
    for (const f of V1_NUMERIC_FILTER_FIELDS) {
      v1State[f.key] = 0;
    }
    v1State.onlyMall = false;
    v1State.onlyExtra = false;
    v1State.onlyFreeSample = false;
  }

  function resetAllV1ColumnFilters(wrap) {
    v1State.activePreset = '';
    v1State.signalFilter = 'all';
    v1State.textFilter = '';
    clearNumericAndTagFilters();
    syncV1FilterUIFromState(wrap);
    renderV1TableRows();
  }

  function applyV1FormulaPreset(presetKey, wrap) {
    if (v1State.activePreset === presetKey) {
      resetAllV1ColumnFilters(wrap);
      return;
    }

    v1State.signalFilter = 'all';
    clearNumericAndTagFilters();
    v1State.activePreset = presetKey;

    if (presetKey === 'ad107') {
      v1State.signalFilter = 'win';
      v1State.minNetComm = 45;
      v1State.maxBreakEven = 2;
      v1State.minSoldFilter = 100;
      v1State.minExtraRate = 1;
      v1State.minStock = 50;
    } else if (presetKey === 'impulse') {
      v1State.minPrice = 150;
      v1State.maxPrice = 500;
      v1State.minExtraRate = 8;
      v1State.minSoldFilter = 50;
      v1State.minStock = 30;
    } else if (presetKey === 'mallhot') {
      v1State.onlyMall = true;
      v1State.minExtraRate = 1;
      v1State.minSoldFilter = 100;
      v1State.minStock = 50;
    } else if (presetKey === 'bigcomm') {
      v1State.signalFilter = 'god';
      v1State.minNetComm = 100;
      v1State.minSoldFilter = 20;
      v1State.minStock = 20;
    } else {
      const custom = v1CustomPresets.find((p) => p.id === presetKey);
      if (custom && custom.filters) {
        v1State.signalFilter = custom.filters.signalFilter || 'all';
        v1State.textFilter = custom.filters.textFilter || '';
        v1State.onlyMall = Boolean(custom.filters.onlyMall);
        for (const f of V1_NUMERIC_FILTER_FIELDS) {
          v1State[f.key] = Number(custom.filters[f.key]) || 0;
        }
      }
    }

    syncV1FilterUIFromState(wrap);
    renderV1TableRows();
  }

  function syncV1FilterUIFromState(wrap) {
    if (!wrap) wrap = document.getElementById('drb-v1-scanner-overlay');
    if (!wrap) return;

    // 1. Signal pills
    wrap.querySelectorAll('#drb-v1-signal-pills .drb-v1-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-sig') === v1State.signalFilter);
    });

    // 2. Preset buttons
    wrap.querySelectorAll('#drb-v1-preset-group .drb-v1-preset-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-preset') === v1State.activePreset);
    });

    // 3. Numeric Min-Max inputs
    for (const f of V1_NUMERIC_FILTER_FIELDS) {
      const el = wrap.querySelector(f.id);
      if (!el) continue;
      const val = Number(v1State[f.key]) || 0;
      el.value = val > 0 ? String(val) : '';
      el.classList.toggle('is-active', val > 0);
    }

    // 4. Keyword & Tag checkboxes
    const kwEl = wrap.querySelector('#drb-af-keyword');
    if (kwEl) {
      kwEl.value = v1State.textFilter || '';
      kwEl.classList.toggle('is-active', Boolean(v1State.textFilter));
    }

    const bindTagState = (sel, val) => {
      const chk = wrap.querySelector(sel);
      if (!chk) return;
      chk.checked = Boolean(val);
      chk.parentElement?.classList.toggle('is-active', Boolean(val));
    };
    bindTagState('#drb-af-mall', v1State.onlyMall);

    // 5. Count active filters (each dimension counts once)
    let activeCount = 0;
    if (v1State.signalFilter !== 'all') activeCount++;
    if (v1State.minNetComm > 0 || v1State.maxNetComm > 0) activeCount++;
    if (v1State.minBreakEven > 0 || v1State.maxBreakEven > 0) activeCount++;
    if (v1State.textFilter) activeCount++;
    if (v1State.onlyMall) activeCount++;
    if (v1State.minPrice > 0 || v1State.maxPrice > 0) activeCount++;
    if (v1State.minSoldFilter > 0 || v1State.maxSoldFilter > 0) activeCount++;
    if (v1State.minHistSold > 0 || v1State.maxHistSold > 0) activeCount++;
    if (v1State.minExtraRate > 0 || v1State.maxExtraRate > 0) activeCount++;
    if (v1State.minExtraComm > 0 || v1State.maxExtraComm > 0) activeCount++;
    if (v1State.minStock > 0 || v1State.maxStock > 0) activeCount++;

    const badgeEl = wrap.querySelector('#drb-v1-filter-count');
    if (badgeEl) {
      badgeEl.style.display = activeCount > 0 ? 'inline-flex' : 'none';
      badgeEl.textContent = String(activeCount);
    }

    const toggleAdvBtn = wrap.querySelector('#drb-v1-btn-toggle-adv');
    if (toggleAdvBtn) {
      toggleAdvBtn.classList.toggle('has-filters', activeCount > 0);
    }

    const resetBtn = wrap.querySelector('#drb-v1-btn-reset-filters');
    if (resetBtn) {
      resetBtn.style.display = activeCount > 0 ? 'inline-flex' : 'none';
    }
  }

  function bindV1ScannerEvents(wrap) {
    wrap.querySelector('#drb-v1-btn-close').addEventListener('click', () => {
      closeV1ScannerModal();
    });

    const kwInput = wrap.querySelector('#drb-v1-inp-keyword');
    const searchBtn = wrap.querySelector('#drb-v1-btn-search');
    const syncKeywordSearchBtnState = () => {
      const hasKw = Boolean((kwInput.value || '').trim());
      searchBtn.disabled = v1State.isLoading || !hasKw;
      searchBtn.classList.toggle('is-ready', hasKw);
      searchBtn.title = hasKw
        ? 'ค้นหาสินค้าตามคำค้นหาที่พิมพ์'
        : 'พิมพ์คำค้นหาในช่องด้านซ้ายก่อนกดค้นหา (หรือกดปุ่มสีน้ำเงิน "⚡ ดึงหมวดนี้" เพื่อดึงทั้งหมวด)';
    };
    syncKeywordSearchBtnState();
    kwInput.addEventListener('input', syncKeywordSearchBtnState);

    kwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if ((kwInput.value || '').trim()) {
          runV1Search('keyword');
        }
      }
    });

    searchBtn.addEventListener('click', () => {
      if ((kwInput.value || '').trim()) {
        runV1Search('keyword');
      }
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
        v1State.activePreset = '';
        v1State.signalFilter = btn.getAttribute('data-sig') || 'all';
        syncV1FilterUIFromState(wrap);
        renderV1TableRows();
      });
    });

    // Toggle Advanced Filter Drawer (Hidden by default)
    const toggleAdvBtn = wrap.querySelector('#drb-v1-btn-toggle-adv');
    const advPanel = wrap.querySelector('#drb-v1-adv-panel');
    const setAdvOpen = (open) => {
      v1State.showAdvFilters = Boolean(open);
      advPanel.classList.toggle('is-open', v1State.showAdvFilters);
      toggleAdvBtn.classList.toggle('is-open', v1State.showAdvFilters);
    };
    toggleAdvBtn.addEventListener('click', () => setAdvOpen(!v1State.showAdvFilters));
    wrap.querySelector('#drb-af-btn-hide').addEventListener('click', () => setAdvOpen(false));

    // Quick Formula Preset buttons + Custom Presets (delegated inside #drb-v1-preset-group)
    const presetGroup = wrap.querySelector('#drb-v1-preset-group');
    presetGroup.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('[data-del-preset]');
      if (delBtn) {
        e.stopPropagation();
        const delId = delBtn.getAttribute('data-del-preset');
        v1CustomPresets = v1CustomPresets.filter((p) => p.id !== delId);
        if (v1State.activePreset === delId) v1State.activePreset = '';
        try {
          await chrome.storage.local.set({ [V1_CUSTOM_PRESETS_KEY]: v1CustomPresets });
        } catch (_err) {}
        renderCustomPresetButtons(wrap);
        syncV1FilterUIFromState(wrap);
        ns.showToast('🗑 ลบ Preset เรียบร้อย');
        return;
      }

      const btn = e.target.closest('.drb-v1-preset-btn[data-preset]');
      if (!btn) return;
      const presetKey = btn.getAttribute('data-preset') || '';
      applyV1FormulaPreset(presetKey, wrap);
    });

    // Save Custom Preset UI
    const savePresetBtn = wrap.querySelector('#drb-v1-btn-save-preset');
    const savePresetForm = wrap.querySelector('#drb-v1-save-preset-form');
    const presetNameInp = wrap.querySelector('#drb-v1-inp-preset-name');
    const confirmPresetBtn = wrap.querySelector('#drb-v1-btn-confirm-preset');

    const commitSavePreset = async () => {
      const name = (presetNameInp.value || '').trim();
      if (!name) {
        ns.showToast('⚠️ กรุณาตั้งชื่อ Preset ก่อนบันทึก');
        presetNameInp.focus();
        return;
      }
      if (!hasAnyActiveV1Filter()) {
        ns.showToast('⚠️ ตั้งค่าตัวกรองอย่างน้อย 1 ช่องก่อนกด Save Preset');
        return;
      }
      const snapshot = {
        signalFilter: v1State.signalFilter,
        textFilter: v1State.textFilter,
        onlyMall: v1State.onlyMall
      };
      for (const f of V1_NUMERIC_FILTER_FIELDS) {
        snapshot[f.key] = Number(v1State[f.key]) || 0;
      }
      const newPreset = {
        id: `custom_${Date.now()}`,
        name,
        filters: snapshot
      };
      v1CustomPresets.push(newPreset);
      v1State.activePreset = newPreset.id;
      try {
        await chrome.storage.local.set({ [V1_CUSTOM_PRESETS_KEY]: v1CustomPresets });
      } catch (_err) {}
      presetNameInp.value = '';
      savePresetForm.style.display = 'none';
      savePresetBtn.style.display = 'inline-flex';
      renderCustomPresetButtons(wrap);
      syncV1FilterUIFromState(wrap);
      ns.showToast(`💾 บันทึก Preset "${name}" เรียบร้อย!`);
    };

    savePresetBtn.addEventListener('click', () => {
      if (!hasAnyActiveV1Filter()) {
        ns.showToast('⚠️ กรอกตัวเลข Min–Max หรือเลือกตัวกรองอย่างน้อย 1 ช่องก่อนกด Save Preset');
        return;
      }
      savePresetBtn.style.display = 'none';
      savePresetForm.style.display = 'inline-flex';
      presetNameInp.focus();
    });

    confirmPresetBtn.addEventListener('click', commitSavePreset);
    presetNameInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitSavePreset();
      } else if (e.key === 'Escape') {
        savePresetForm.style.display = 'none';
        savePresetBtn.style.display = 'inline-flex';
      }
    });

    // Reset All Filters buttons
    wrap.querySelector('#drb-v1-btn-reset-filters').addEventListener('click', () => {
      resetAllV1ColumnFilters(wrap);
    });
    wrap.querySelector('#drb-af-btn-clear').addEventListener('click', () => {
      resetAllV1ColumnFilters(wrap);
    });

    const onManualFilterChange = () => {
      v1State.activePreset = '';
      syncV1FilterUIFromState(wrap);
      renderV1TableRows();
    };

    // Bind all 16 Min-Max numeric inputs uniformly
    for (const f of V1_NUMERIC_FILTER_FIELDS) {
      const el = wrap.querySelector(f.id);
      if (!el) continue;
      el.addEventListener('input', (e) => {
        const raw = f.isInt ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
        v1State[f.key] = Number.isFinite(raw) && raw > 0 ? raw : 0;
        onManualFilterChange();
      });
    }

    // Bind Keyword & Shopee Mall toggle
    wrap.querySelector('#drb-af-keyword').addEventListener('input', (e) => {
      v1State.textFilter = e.target.value || '';
      onManualFilterChange();
    });
    wrap.querySelector('#drb-af-mall').addEventListener('change', (e) => {
      v1State.onlyMall = Boolean(e.target.checked);
      onManualFilterChange();
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
        restoreBtn.textContent = `ล่าสุด (${saved.rows.length} · ${timeStr})`;
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

    // If user clicks "ค้นหา" without typing a keyword, automatically use Category/Offer Feed mode
    // (Shopee API caps empty keyword="" + filter_types at 1 page / 20 items, whereas feed mode paginates 500+ items)
    const effectiveMode = mode === 'keyword' && !keyword ? 'extra' : mode;

    // Build exact Shopee Affiliate V1 query parameters
    const baseParams = {
      client_type: '1',
      list_type: '0',
      sort_type: sortType
    };

    if (effectiveMode === 'extra') {
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
    let emptyNewPages = 0;
    const isFilterHunting = hasAnyActiveV1Filter();
    const maxRawCeiling = isFilterHunting ? Math.min(600, maxItems * 3) : maxItems;
    let totalAvailable = maxRawCeiling;
    let partialStoppedReason = '';

    // Helper: sleep with 250ms ticks so user Cancel button reacts immediately
    const cancellableJitterSleep = async (ms, currentLoaded, matchedCount, targetCount, nextPage) => {
      const start = Date.now();
      while (Date.now() - start < ms) {
        if (v1State.cancelRequested) return;
        const remainSec = Math.max(0.1, ((ms - (Date.now() - start)) / 1000)).toFixed(1);
        const matchTxt = isFilterHunting ? ` (ตรง Filter ${matchedCount} ชิ้น)` : '';
        progText.textContent = `🛡️ โหลดแล้ว ${currentLoaded.toLocaleString()}${matchTxt} — พักหน่วงเวลาเนียนเป็นคนจริง ${remainSec}s ก่อนดึงหน้า ${nextPage}...`;
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

        const apiTotal = Number(json?.data?.total_count) || 0;
        if (apiTotal > 20) {
          totalAvailable = apiTotal;
        }

        let addedThisPage = 0;
        for (const rawItem of list) {
          const row = mapRawOfferItemToRow(rawItem);
          if (row.itemid && !seenIds.has(row.itemid)) {
            seenIds.add(row.itemid);
            v1State.rows.push(row);
            addedThisPage++;
          }
        }
        emptyNewPages = addedThisPage === 0 ? emptyNewPages + 1 : 0;

        page++;
        renderV1TableRows();

        const matchedNow = getFilteredAndSortedV1Rows().length;
        const targetCount = Math.min(totalAvailable, maxRawCeiling);
        const pct = isFilterHunting
          ? Math.min(100, Math.round((Math.max(matchedNow / maxItems, v1State.rows.length / targetCount)) * 100))
          : targetCount > 0
          ? Math.min(100, Math.round((v1State.rows.length / targetCount) * 100))
          : 100;
        progBar.style.width = `${pct}%`;
        progText.textContent = isFilterHunting
          ? `⚡ สแกนสะสม ${v1State.rows.length.toLocaleString()} ชิ้น ➔ ตรงเงื่อนไข Filter ${matchedNow.toLocaleString()} ชิ้น (หน้า ${page})...`
          : `⚡ ดึงข้อมูลแล้ว ${v1State.rows.length.toLocaleString()} / ${targetCount.toLocaleString()} รายการ (หน้า ${page}) — เซฟลงแคชอัตโนมัติ...`;

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

        const reachedTarget = isFilterHunting
          ? matchedNow >= maxItems || v1State.rows.length >= maxRawCeiling
          : v1State.rows.length >= maxItems;

        if (reachedTarget || emptyNewPages >= 2 || page >= 50) {
          break;
        }

        // Human Jittered Delay (Shop Tool default = 5,000ms + random 350..1450ms jitter)
        const jitterMs = Math.floor(Math.random() * 1100) + 350;
        await cancellableJitterSleep(baseDelayMs + jitterMs, v1State.rows.length, matchedNow, targetCount, page + 1);
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
      const hasKwNow = Boolean((wrap.querySelector('#drb-v1-inp-keyword')?.value || '').trim());
      btnSearch.disabled = !hasKwNow;
      btnSearch.classList.toggle('is-ready', hasKwNow);
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

    // Parse positive and negative tokens from v1State.textFilter (e.g. "เซรั่ม -ซอง -เคส")
    const rawKw = (v1State.textFilter || '').trim().toLowerCase();
    const kwTokens = rawKw ? rawKw.split(/\s+/).filter(Boolean) : [];
    const posTokens = kwTokens.filter((t) => !t.startsWith('-') || t.length === 1);
    const negTokens = kwTokens.filter((t) => t.startsWith('-') && t.length > 1).map((t) => t.slice(1));

    // Shared range checker for all 8 Min-Max numeric filters
    const inRange = (val, minVal, maxVal) => {
      const n = Number(val) || 0;
      if (minVal > 0 && n < minVal) return false;
      if (maxVal > 0 && n > maxVal) return false;
      return true;
    };

    // Filter rows across all Signal, Tag, Keyword, and 8 Min-Max numeric criteria
    const filtered = all.filter((r) => {
      // 1. Signal Tier Filter
      if (v1State.signalFilter === 'win' && r.tier !== 'god' && r.tier !== 'pass') return false;
      if (v1State.signalFilter === 'god' && r.tier !== 'god') return false;
      if (v1State.signalFilter === 'pass' && r.tier !== 'pass') return false;
      if (v1State.signalFilter === 'warning' && r.tier !== 'warning') return false;
      if (v1State.signalFilter === 'danger' && r.tier !== 'danger') return false;

      // 2. Store & Program Toggles + Keyword / Negative Keywords
      if (v1State.onlyMall && !r.isMall) return false;
      if (v1State.onlyExtra && (Number(r.extraRate) || 0) <= 0) return false;
      if (v1State.onlyFreeSample && !r.isFreeSample) return false;
      if (posTokens.length > 0 || negTokens.length > 0) {
        const hay = `${String(r.name || '').toLowerCase()} ${String(r.itemid || '').toLowerCase()}`;
        for (const pt of posTokens) {
          if (!hay.includes(pt)) return false;
        }
        for (const nt of negTokens) {
          if (hay.includes(nt)) return false;
        }
      }

      // 3. All 8 Numeric Min-Max Ranges
      if (!inRange(r.netComm, v1State.minNetComm, v1State.maxNetComm)) return false;
      if (v1State.minBreakEven > 0 || v1State.maxBreakEven > 0) {
        if ((Number(r.extraRate) || 0) <= 0) return false;
        if (!inRange(r.breakEvenNum, v1State.minBreakEven, v1State.maxBreakEven)) return false;
      }
      if (!inRange(r.price, v1State.minPrice, v1State.maxPrice)) return false;
      if (!inRange(r.sold, v1State.minSoldFilter, v1State.maxSoldFilter)) return false;
      if (!inRange(r.historical_sold, v1State.minHistSold, v1State.maxHistSold)) return false;
      if (!inRange(r.extraRate, v1State.minExtraRate, v1State.maxExtraRate)) return false;
      if (!inRange(r.extraComm, v1State.minExtraComm, v1State.maxExtraComm)) return false;
      if (!inRange(r.stock, v1State.minStock, v1State.maxStock)) return false;

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
      showingEl.textContent = `${filtered.length.toLocaleString()} / ${all.length.toLocaleString()} รายการ`;
    }

    return filtered;
  }

  function getCompactSignalBadgeText(r) {
    if (r.tier === 'god') return '<span class="drb-v1-sig-dot"></span>GOD · 1 ชิ้น';
    if (r.tier === 'pass') return '<span class="drb-v1-sig-dot"></span>คุ้ม · 1.5–2 ชิ้น';
    if (r.tier === 'warning') return '<span class="drb-v1-sig-dot"></span>พอไหว · 3–5 ชิ้น';
    return r.extraRate <= 0
      ? '<span class="drb-v1-sig-dot"></span>ไร้ Extra'
      : '<span class="drb-v1-sig-dot"></span>คอมต่ำ';
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
                ? 'กำลังดึงข้อมูลจาก Shopee API...'
                : v1State.rows.length > 0
                ? 'ไม่พบสินค้าที่ตรงกับตัวกรองที่เลือก — กด [↺ ล้างกรอง] เพื่อดูรายการทั้งหมด'
                : 'พิมพ์คำค้นหาด้านบนแล้วกด <strong>[ค้นหา]</strong> หรือเลือกหมวดหมู่แล้วกดปุ่มสีน้ำเงิน <strong class="drb-v1-empty-cta-blue">[⚡ ดึงหมวดนี้]</strong> เพื่อสแกนข้อมูล Realtime พร้อมคำนวณจุดคุ้มทุนแอด 107฿'
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
            <td class="drb-v1-td-center drb-v1-muted drb-v1-mono">${idx + 1}</td>
            <td class="drb-v1-td-center drb-v1-td-thumb">
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
              <span class="drb-v1-netcomm drb-v1-mono" data-tier="${r.tier}">${netCommLabel}</span>
              <span class="drb-v1-rate-chip drb-v1-mono">${r.effectiveRate}%</span>
            </td>
            <td class="drb-v1-td-center drb-v1-nowrap" title="ต้องขาย ${r.breakEvenUnits} ชิ้น (${r.breakEvenOrders} ออเดอร์) เพื่อคืนทุนค่าแอด 107฿/วัน">
              <span class="drb-v1-breakeven drb-v1-mono" data-tier="${r.tier}">${r.breakEvenUnits} ชิ้น</span>
              <span class="drb-v1-inline-sub drb-v1-mono">(${r.breakEvenOrders} ออเดอร์)</span>
            </td>
            <td class="drb-v1-td-product">
              <div class="drb-v1-title-wrap">
                ${r.isMall ? '<span class="drb-v1-tag drb-v1-tag--mall">Mall</span>' : ''}
                ${r.isFreeSample ? '<span class="drb-v1-tag drb-v1-tag--free">ฟรี</span>' : ''}
                <a href="${r.productLink}" target="_blank" rel="noopener" class="drb-v1-prod-link" title="${String(r.name || '').replace(/"/g, '&quot;')} (ID: ${r.itemid})">${r.name}</a>
                <a href="${r.affUrl}" target="_blank" rel="noopener" class="drb-v1-mini-link" title="เปิดหน้าข้อเสนอ Shopee Affiliate (ID: ${r.itemid})">AFF ↗</a>
              </div>
            </td>
            <td class="drb-v1-td-right drb-v1-bold drb-v1-nowrap drb-v1-mono">${priceLabel}</td>
            <td class="drb-v1-td-right drb-v1-nowrap drb-v1-mono">
              <span class="drb-v1-sold ${soldBadgeClass}">${r.sold.toLocaleString()}</span>
            </td>
            <td class="drb-v1-td-right drb-v1-muted drb-v1-nowrap drb-v1-mono">${r.historical_sold.toLocaleString()}</td>
            <td class="drb-v1-td-right drb-v1-nowrap drb-v1-mono">
              <span class="${r.extraRate > 0 ? 'drb-v1-extra-pct' : 'drb-v1-muted'}">${r.extraRate > 0 ? `+${r.extraRate}%` : '0%'}</span>
            </td>
            <td class="drb-v1-td-right drb-v1-nowrap drb-v1-mono">${extraCommLabel}</td>
            <td class="drb-v1-td-right drb-v1-nowrap drb-v1-mono ${r.stock < 20 ? 'drb-v1-low-stock' : 'drb-v1-muted'}">${r.stock.toLocaleString()}</td>
            <td class="drb-v1-td-actions">
              <button type="button" class="drb-v1-act-btn drb-v1-act-btn--pick" data-idx="${idx}" title="ดึงเข้า Side Panel & ส่งไปเว็บ aff.doctorbankonline.com">
                เลือก
              </button>
              <button type="button" class="drb-v1-act-btn drb-v1-act-btn--link" data-idx="${idx}" title="เจนลิงก์ s.shopee.co.th อัตโนมัติผ่าน GraphQL พร้อมก๊อปลง Clipboard">
                ลิงก์
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
