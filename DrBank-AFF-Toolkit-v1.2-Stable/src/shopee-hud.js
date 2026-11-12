/**
 * DrBank AFF Studio v1.2.0 — Shopee Product & Storefront HUD (Bell 238M Strategy Edition)
 * Implements all 5 Core Specs:
 *  1. 4-Slot Alphanumeric Sub_ID (Zero _ bug + Lock AdBoost + Quick Page P01-P04 + YYYYMMDD + ItemID)
 *  2. 4-Tier Dynamic Viability Highlight on Net Commission Card (God / Pass / Warning / Danger)
 *  3. Break-Even 100฿/Day Orders Banner
 *  4. 3 Product Checklist Badges (Sold >= 1,000 | Extra Comm > 0% | Rating >= 4.8 & Thai vs China Ship)
 *  5. Full JSON / Webhook Product Export on Save
 */

(function () {
  const ns = window.DrBankAFF;
  if (!ns) return;

  let currentState = {
    settings: {},
    title: '',
    originalPrice: 0,
    price: 0,
    priceMax: 0,
    baseRate: 3.5,
    extraRate: 10.0,
    capTHB: 250,
    whtRate: 3.0,
    sub1: '16NOV26FBSPCAD',
    sub2: 'P01POST01',
    sub3: ns.getTodayYYYYMMDD(),
    sub4: '',
    soldCount: 0,
    soldText: '',
    rating: 4.9,
    shipFrom: 'ภายในประเทศ',
    isOverseas: false,
    imagesHD: [],
    theme: 'light',
    variants: [],
    shopId: '',
    itemId: '',
    cleanUrl: ''
  };

  async function initShopeeHUD() {
    try {
      const store = await ns.sendMessage('GET_STATE');
      const s = store.settings || {};
      currentState.settings = s;
      currentState.baseRate = Number(s.shopeeBaseRate) || 3.5;
      currentState.extraRate = Number(s.shopeeExtraRate) ?? 10.0;
      currentState.capTHB = Number(s.shopeeCapTHB) || 250;
      currentState.whtRate = Number(s.withholdingTaxRate) || 3.0;
      currentState.sub1 = ns.sanitizeSubId(s.defaultSubId1 || '16NOV26FBSPCAD').clean || '16NOV26FBSPCAD';
      currentState.sub2 = ns.sanitizeSubId(s.defaultSubId2 || 'P01POST01').clean || 'P01POST01';
      currentState.sub3 = ns.getTodayYYYYMMDD();
      currentState.theme = s.theme || 'light';
    } catch (_e) {
      // Fallback to defaults
    }

    scrapeShopeeProductDOM();
    renderHUD();

    // SPA Route & DOM Mutation Watcher for Shopee React transitions
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => {
          scrapeShopeeProductDOM();
          updateHUDValues();
        }, 900);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      scrapeShopeeProductDOM();
      updateHUDValues();
    }, 1800);
  }

  function scrapeShopeeProductDOM() {
    const parsed = ns.parseShopeeIds(location.href);
    currentState.shopId = parsed.shopId;
    currentState.itemId = parsed.itemId;
    currentState.cleanUrl = parsed.cleanUrl;

    // Auto-fill Sub_ID 4 with ItemID (Alphanumeric)
    if (currentState.itemId) {
      currentState.sub4 = ns.sanitizeSubId(currentState.itemId).clean;
    } else if (!currentState.sub4) {
      currentState.sub4 = 'ITEM01';
    }

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

    // 3. Sold Count & Star Rating & Shipping Origin (Spec 4: 3 ตัวกรองคุณเบล)
    let foundSoldText = '';
    let foundSoldNum = 0;
    let foundRating = 0;
    let overseasDetected = false;
    let shipLocationText = 'ส่งในไทย';

    document.querySelectorAll('div, span, a').forEach((el) => {
      if (el.children.length <= 2 && !el.closest('#drb-aff-hud-root')) {
        const txt = (el.textContent || '').trim();

        // Check Sold count patterns on Shopee Thailand
        if (!foundSoldNum && (/ขายแล้ว\s*[0-9.,]+\s*(พัน|หมื่น|แสน|k|ชิ้น)?/i.test(txt) || /^[0-9.,]+\s*(พัน|หมื่น|k)\s*ขายแล้ว$/i.test(txt))) {
          foundSoldText = txt.replace(/ขายแล้ว/gi, '').replace(/ชิ้น/gi, '').trim();
          foundSoldNum = ns.parseSoldCount(foundSoldText);
        }

        // Check Rating (4.0 - 5.0)
        if (!foundRating && /^[45]\.[0-9]$/.test(txt)) {
          const rVal = parseFloat(txt);
          if (rVal >= 1.0 && rVal <= 5.0) foundRating = rVal;
        }

        // Check Shipping Origin (China / Overseas check)
        if (/ต่างประเทศ|จีน|mainland china|overseas|เซินเจิ้น|กวางโจว/i.test(txt)) {
          overseasDetected = true;
          shipLocationText = 'ส่งจากจีน/ตปท.';
        }
      }
    });

    if (foundSoldNum > 0) {
      currentState.soldCount = foundSoldNum;
      currentState.soldText = foundSoldText || foundSoldNum.toLocaleString();
    } else if (!currentState.soldCount) {
      // Fallback scan for numeric sibling of "ขายแล้ว"
      const allText = document.body ? document.body.innerText : '';
      const mSold = allText.match(/([0-9.,]+\s*(?:พัน|หมื่น|k)?)\s*ขายแล้ว/i) || allText.match(/ขายแล้ว\s*([0-9.,]+\s*(?:พัน|หมื่น|k)?)/i);
      if (mSold) {
        currentState.soldText = mSold[1].trim();
        currentState.soldCount = ns.parseSoldCount(currentState.soldText);
      }
    }

    if (foundRating > 0) {
      currentState.rating = foundRating;
    }
    currentState.isOverseas = overseasDetected;
    currentState.shipFrom = shipLocationText;

    // 4. Extract HD Product Images
    const imgSet = new Set();
    document.querySelectorAll('img[src*="susercontent.com"], div[style*="susercontent.com"]').forEach((el) => {
      let rawUrl = el.tagName === 'IMG' ? el.getAttribute('src') : '';
      if (!rawUrl) {
        const bg = el.getAttribute('style') || '';
        const m = bg.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/i);
        if (m) rawUrl = m[1];
      }
      if (rawUrl && /susercontent\.com\/file\//i.test(rawUrl)) {
        // Strip thumbnail resize suffix (_tn) to get full HD image
        const hdUrl = rawUrl.replace(/_tn$/i, '');
        imgSet.add(hdUrl);
      }
    });
    currentState.imagesHD = Array.from(imgSet).slice(0, 8);

    // 5. Variants / SKU Buttons
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
          <span class="drb-aff-badge-platform">Shopee</span>
        </div>
        <div class="drb-aff-header-actions">
          <button class="drb-aff-icon-btn" id="drb-btn-theme" title="สลับโหมด สว่าง/มืด">🌙</button>
          <button class="drb-aff-icon-btn" id="drb-btn-rescan" title="ดึงราคาและ SKU ใหม่">↻</button>
          <button class="drb-aff-icon-btn" id="drb-btn-minimize" title="ย่อ/ขยาย">_</button>
        </div>
      </div>

      <div class="drb-aff-body">
        <div class="drb-aff-product-title" id="drb-hud-title">กำลังอ่านข้อมูลสินค้า...</div>

        <!-- Spec 4: 3 Product Checklist Badges (ตัวกรองคุณเบล) -->
        <div class="drb-aff-checklist-bar" id="drb-checklist-bar">
          <span class="drb-aff-check-pill drb-aff-check-pill--green" id="drb-badge-sold">🔥 ยอดขาย -</span>
          <span class="drb-aff-check-pill drb-aff-check-pill--green" id="drb-badge-extra">✅ Extra 10%</span>
          <span class="drb-aff-check-pill drb-aff-check-pill--green" id="drb-badge-rating">⭐ 4.9 (ส่งไทย)</span>
        </div>

        <!-- Spec 2: 4-Tier Dynamic Highlight KPI Cards -->
        <div class="drb-aff-kpi-grid">
          <div class="drb-aff-kpi-card">
            <div class="drb-aff-kpi-label">ราคาสินค้า (THB)</div>
            <div class="drb-aff-kpi-val" id="drb-hud-price">฿0.00</div>
            <div class="drb-aff-kpi-sub" id="drb-hud-ids">Shop: - | Item: -</div>
          </div>
          <div class="drb-aff-kpi-card" id="drb-comm-card" data-tier="warning">
            <div class="drb-aff-kpi-label">ค่าคอมสุทธิ / ชิ้น</div>
            <div class="drb-aff-kpi-val" id="drb-hud-net-comm">฿0.00</div>
            <div class="drb-aff-tier-badge" id="drb-hud-tier-badge">⚠️ คำนวณความคุ้มแอด...</div>
            <div class="drb-aff-kpi-sub" id="drb-hud-eff-rate">รวมเรท 0.0% (หักภาษี 3%)</div>
          </div>
        </div>

        <!-- Spec 3: Break-Even 100฿/Day Banner -->
        <div class="drb-aff-breakeven-box" id="drb-breakeven-box" data-tier="warning">
          <span id="drb-breakeven-text">🎯 ยิงแอด 100฿/วัน ต้องขายตรงปก: 0.0 ชิ้น (0 ออเดอร์) ถึงคุ้มทุน</span>
        </div>

        <div class="drb-aff-variants-wrap" id="drb-variants-section">
          <div class="drb-aff-variants-label">
            <span>ตัวเลือก SKU (คลิกเพื่อซิงก์ราคาหน้าเว็บ)</span>
            <span id="drb-variants-count">0 รายการ</span>
          </div>
          <div class="drb-aff-variants-list" id="drb-variants-list"></div>
        </div>

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
              <td>ค่าคอมพื้นฐาน (Base):</td>
              <td id="drb-tbl-base">฿0.00</td>
            </tr>
            <tr>
              <td>ค่าคอมพิเศษ (Extra):</td>
              <td id="drb-tbl-extra">฿0.00</td>
            </tr>
            <tr>
              <td>เป้าขาย 100 บ้าน ได้กำไรสุทธิ:</td>
              <td id="drb-tbl-100" style="color:var(--drb-accent);">฿0.00</td>
            </tr>
          </tbody>
        </table>

        <div class="drb-aff-divider"></div>

        <!-- Spec 1: 4-Slot Alphanumeric Sub_ID Grid (No _ allowed!) -->
        <div class="drb-aff-subid-grid">
          <div class="drb-aff-field">
            <label>
              <span>Sub_ID 1 (AdBoost)</span>
              <span style="font-size:9.5px;color:var(--drb-accent);">A-Z0-9</span>
            </label>
            <div class="drb-aff-input-group">
              <input type="text" class="drb-aff-input" id="drb-inp-sub1" placeholder="16NOV26FBSPCAD" value="${currentState.sub1}">
              <button type="button" class="drb-aff-pin-btn" id="drb-btn-lock-sub1" title="ล็อก/จำค่า Sub_ID 1 ลงเครื่อง">📌</button>
            </div>
          </div>

          <div class="drb-aff-field">
            <label>
              <span>Sub_ID 2 (เพจ+โพสต์)</span>
              <span class="drb-aff-page-chips">
                <button type="button" class="drb-aff-page-chip" data-page="P01">P01</button>
                <button type="button" class="drb-aff-page-chip" data-page="P02">P02</button>
                <button type="button" class="drb-aff-page-chip" data-page="P03">P03</button>
                <button type="button" class="drb-aff-page-chip" data-page="P04">P04</button>
              </span>
            </label>
            <input type="text" class="drb-aff-input" id="drb-inp-sub2" placeholder="P01POST01" value="${currentState.sub2}">
          </div>

          <div class="drb-aff-field">
            <label>
              <span>Sub_ID 3 (วันที่ยิงแอด)</span>
              <span style="font-size:9.5px;">YYYYMMDD</span>
            </label>
            <input type="text" class="drb-aff-input" id="drb-inp-sub3" placeholder="20261112" value="${currentState.sub3}">
          </div>

          <div class="drb-aff-field">
            <label>
              <span>Sub_ID 4 (รหัสสินค้า)</span>
              <span style="font-size:9.5px;">ItemID</span>
            </label>
            <input type="text" class="drb-aff-input" id="drb-inp-sub4" placeholder="ItemID" value="${currentState.sub4}">
          </div>
        </div>

        <div class="drb-aff-btn-group">
          <button class="drb-aff-btn drb-aff-btn--primary" id="drb-btn-copy-link">🔗 คัดลอกลิงก์ AFF</button>
          <button class="drb-aff-btn drb-aff-btn--emerald" id="drb-btn-copy-caption">📝 ก๊อปแคปชั่น+ลิงก์</button>
          <button class="drb-aff-btn drb-aff-btn--ghost" id="drb-btn-save-prod" title="เซฟลงคลัง + คัดลอก JSON ส่งต่อระบบเจนภาพ/คุมแอด">⭐ เก็บเข้าคลัง + JSON</button>
          <button class="drb-aff-btn drb-aff-btn--ghost" id="drb-btn-clean-url">✂️ ก๊อปลิงก์คลีน</button>
        </div>

        <div class="drb-aff-divider"></div>

        <div class="drb-aff-btn-group">
          <a class="drb-aff-btn drb-aff-btn--ghost" href="https://affiliate.shopee.co.th/offer/custom_link" target="_blank" rel="noopener">⚡ Custom Link</a>
          <a class="drb-aff-btn drb-aff-btn--ghost" href="https://affiliate.shopee.co.th/report/conversion_report" target="_blank" rel="noopener">📊 รายงานค่าคอม</a>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    ns.makeDraggable(root, document.getElementById('drb-aff-drag-handle'));
    bindHUDEvents(root);
    updateHUDValues();
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

    document.getElementById('drb-btn-rescan').addEventListener('click', () => {
      scrapeShopeeProductDOM();
      updateHUDValues();
      ns.showToast('อัปเดตราคา, ยอดขาย และตัวเลือก SKU ล่าสุดแล้ว');
    });

    // Numeric calculation inputs
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

    // Spec 1: Strict Alphanumeric Sanitizers on all 4 Sub_ID inputs
    ns.bindSubIdSanitizer(document.getElementById('drb-inp-sub1'), (val) => {
      currentState.sub1 = val;
    });
    ns.bindSubIdSanitizer(document.getElementById('drb-inp-sub2'), (val) => {
      currentState.sub2 = val;
    });
    ns.bindSubIdSanitizer(document.getElementById('drb-inp-sub3'), (val) => {
      currentState.sub3 = val;
    });
    ns.bindSubIdSanitizer(document.getElementById('drb-inp-sub4'), (val) => {
      currentState.sub4 = val;
    });

    // Lock / Save Sub_ID 1 (AdBoost code) to chrome.storage.local
    document.getElementById('drb-btn-lock-sub1').addEventListener('click', async () => {
      const cleanSub1 = ns.sanitizeSubId(document.getElementById('drb-inp-sub1').value).clean;
      currentState.sub1 = cleanSub1;
      await ns.sendMessage('UPDATE_SETTINGS', { defaultSubId1: cleanSub1 });
      ns.showToast(`📌 ล็อกโค้ด AdBoost "${cleanSub1}" เป็นค่าเริ่มต้นแล้ว!`);
    });

    // Quick Page Selector Chips [P01] [P02] [P03] [P04] for Sub_ID 2
    root.querySelectorAll('.drb-aff-page-chip').forEach((chip) => {
      chip.addEventListener('click', async () => {
        const pagePrefix = chip.getAttribute('data-page') || 'P01';
        const sub2Inp = document.getElementById('drb-inp-sub2');
        const currentVal = ns.sanitizeSubId(sub2Inp.value).clean;
        // Replace leading P01..P99 if present, otherwise prepend
        const suffix = currentVal.replace(/^P\d{2}/i, '') || 'POST01';
        const nextSub2 = `${pagePrefix}${suffix}`;
        sub2Inp.value = nextSub2;
        currentState.sub2 = nextSub2;
        await ns.sendMessage('UPDATE_SETTINGS', { defaultSubId2: nextSub2 });
        ns.showToast(`⚡ สลับรหัสเพจเป็น "${nextSub2}" เรียบร้อย!`);
      });
    });

    document.getElementById('drb-btn-copy-link').addEventListener('click', async () => {
      const affLink = buildCurrentAffiliateLink();
      await ns.copyText(affLink, '🔗 คัดลอกลิงก์ Affiliate (4 Sub-ID ไร้ขีด _) แล้ว!');
      await ns.sendMessage('ADD_LINK_HISTORY', {
        platform: 'shopee',
        title: currentState.title,
        originalUrl: currentState.cleanUrl,
        affiliateUrl: affLink,
        subIds: getCleanSubIdsArray()
      });
    });

    document.getElementById('drb-btn-copy-caption').addEventListener('click', async () => {
      const affLink = buildCurrentAffiliateLink();
      const caption = `🔥 ${currentState.title}\n💰 พิกัดโปรโมชั่นเพียง ${ns.formatTHB(currentState.price, 0)}\n👉 สั่งซื้อที่ Shopee: ${affLink}`;
      await ns.copyText(caption, '📝 คัดลอกแคปชั่นพร้อมลิงก์แล้ว!');
    });

    document.getElementById('drb-btn-clean-url').addEventListener('click', async () => {
      await ns.copyText(currentState.cleanUrl || location.href, '✂️ คัดลอกลิงก์สินค้าแบบคลีนแล้ว!');
    });

    // Spec 5: Save to Watchlist + Export Full JSON Payload (Clipboard + Optional Webhook)
    document.getElementById('drb-btn-save-prod').addEventListener('click', async () => {
      const comm = ns.calculateCommission(currentState);
      const affLink = buildCurrentAffiliateLink();
      const subObj = {
        subId1: ns.sanitizeSubId(currentState.sub1).clean,
        subId2: ns.sanitizeSubId(currentState.sub2).clean,
        subId3: ns.sanitizeSubId(currentState.sub3).clean,
        subId4: ns.sanitizeSubId(currentState.sub4).clean
      };

      const productPayload = {
        id: `shopee_${currentState.shopId}_${currentState.itemId || Date.now()}`,
        platform: 'shopee',
        title: currentState.title,
        originalPrice: currentState.originalPrice || currentState.price,
        price: currentState.price,
        priceMax: currentState.priceMax,
        baseRate: currentState.baseRate,
        extraRate: currentState.extraRate,
        estimatedCommission: Number(comm.netComm.toFixed(2)),
        breakEvenUnits: comm.breakEvenUnits,
        breakEvenOrders: comm.breakEvenOrders,
        viabilityTier: comm.tier,
        soldCount: currentState.soldCount,
        soldText: currentState.soldText,
        rating: currentState.rating,
        shipFrom: currentState.shipFrom,
        isOverseas: currentState.isOverseas,
        url: currentState.cleanUrl || location.href,
        affiliateUrl: affLink,
        shopId: currentState.shopId,
        itemId: currentState.itemId,
        imagesHD: currentState.imagesHD,
        variants: currentState.variants,
        subIds: subObj
      };

      const res = await ns.sendMessage('SAVE_PRODUCT', productPayload);
      await navigator.clipboard.writeText(JSON.stringify(productPayload, null, 2)).catch(() => {});
      const hookNote = res?.webhookSent ? ' + ยิง Webhook แล้ว!' : ' + คัดลอก JSON ลงคลิปบอร์ดแล้ว!';
      ns.showToast(`⭐ บันทึกเข้าคลังสินค้า${hookNote}`);
    });
  }

  function getCleanSubIdsArray() {
    return [
      ns.sanitizeSubId(currentState.sub1).clean,
      ns.sanitizeSubId(currentState.sub2).clean,
      ns.sanitizeSubId(currentState.sub3).clean,
      ns.sanitizeSubId(currentState.sub4).clean
    ].filter(Boolean);
  }

  function buildCurrentAffiliateLink() {
    return ns.buildAffiliateLink({
      platform: 'shopee',
      cleanUrl: currentState.cleanUrl || location.href,
      affiliateId: currentState.settings.shopeeAffiliateId || '',
      subIds: getCleanSubIdsArray()
    });
  }

  function updateHUDValues() {
    const titleEl = document.getElementById('drb-hud-title');
    if (!titleEl) return;
    titleEl.textContent = currentState.title;

    const priceInp = document.getElementById('drb-inp-price');
    if (priceInp) priceInp.value = currentState.price;

    const sub4Inp = document.getElementById('drb-inp-sub4');
    if (sub4Inp && currentState.sub4) sub4Inp.value = currentState.sub4;

    const idsEl = document.getElementById('drb-hud-ids');
    if (idsEl) {
      idsEl.textContent = `Shop: ${currentState.shopId || '-'} | Item: ${currentState.itemId || '-'}`;
    }

    // Render SKU variant pills
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
    // Badge 1: Sold Count (>= 1,000 Green | 300-999 Yellow | < 300 Red)
    const soldBadge = document.getElementById('drb-badge-sold');
    if (soldBadge) {
      const sc = currentState.soldCount || 0;
      const sLabel = currentState.soldText || sc.toLocaleString();
      if (sc >= 1000) {
        soldBadge.className = 'drb-aff-check-pill drb-aff-check-pill--green';
        soldBadge.textContent = `🔥 ขายดี ${sLabel}`;
      } else if (sc >= 300) {
        soldBadge.className = 'drb-aff-check-pill drb-aff-check-pill--yellow';
        soldBadge.textContent = `⚠️ ยอดขาย ${sLabel}`;
      } else {
        soldBadge.className = 'drb-aff-check-pill drb-aff-check-pill--red';
        soldBadge.textContent = sc > 0 ? `❌ ยอดขายต่ำ (${sLabel})` : `❌ ยอดขาย <300`;
      }
    }

    // Badge 2: Extra Commission (> 0% Green | 0% Red)
    const extraBadge = document.getElementById('drb-badge-extra');
    if (extraBadge) {
      const ex = Number(currentState.extraRate) || 0;
      if (ex > 0) {
        extraBadge.className = 'drb-aff-check-pill drb-aff-check-pill--green';
        extraBadge.textContent = `✅ มี Extra ${ex}%`;
      } else {
        extraBadge.className = 'drb-aff-check-pill drb-aff-check-pill--red';
        extraBadge.textContent = `❌ ไม่มี Extra Comm`;
      }
    }

    // Badge 3: Rating & Overseas/China Origin
    const ratingBadge = document.getElementById('drb-badge-rating');
    if (ratingBadge) {
      const r = Number(currentState.rating) || 4.9;
      if (currentState.isOverseas) {
        ratingBadge.className = 'drb-aff-check-pill drb-aff-check-pill--yellow';
        ratingBadge.textContent = `⚠️ ร้านส่งจากจีน (⭐${r.toFixed(1)})`;
      } else if (r >= 4.8) {
        ratingBadge.className = 'drb-aff-check-pill drb-aff-check-pill--green';
        ratingBadge.textContent = `⭐ ${r.toFixed(1)} (ส่งไทย)`;
      } else if (r >= 4.6) {
        ratingBadge.className = 'drb-aff-check-pill drb-aff-check-pill--yellow';
        ratingBadge.textContent = `⚠️ ⭐ ${r.toFixed(1)} (ส่งไทย)`;
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
    const tblBase = document.getElementById('drb-tbl-base');
    const tblExtra = document.getElementById('drb-tbl-extra');
    const tbl100 = document.getElementById('drb-tbl-100');

    if (priceEl) priceEl.textContent = ns.formatTHB(currentState.price);
    if (commCard) commCard.setAttribute('data-tier', comm.tier);
    if (netEl) netEl.textContent = ns.formatTHB(comm.netComm);
    if (tierBadgeEl) tierBadgeEl.textContent = comm.tierLabel;
    if (effEl) {
      effEl.textContent = `เรทรวม ${comm.effectiveRate.toFixed(1)}%${comm.isCapped ? ' (ติด Cap)' : ''}`;
    }

    if (breakEvenBox && breakEvenText) {
      breakEvenBox.setAttribute('data-tier', comm.tier);
      if (comm.netComm > 0) {
        breakEvenText.textContent = `🎯 ยิงแอด 100฿/วัน ต้องขายตรงปก: ${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์) ถึงคุ้มทุน`;
      } else {
        breakEvenText.textContent = `🎯 ยิงแอด 100฿/วัน: ❌ ค่าคอม 0฿ ไม่สามารถทำกำไรได้`;
      }
    }

    if (tblBase) tblBase.textContent = `${ns.formatTHB(comm.baseComm)}${comm.isCapped ? ' (Cap)' : ''}`;
    if (tblExtra) tblExtra.textContent = ns.formatTHB(comm.extraComm);
    if (tbl100) tbl100.textContent = ns.formatTHB(comm.netComm * 100, 0);
  }

  initShopeeHUD();
})();
