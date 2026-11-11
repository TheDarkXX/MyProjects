/**
 * DrBank AFF Studio — Shopee Product & Storefront Neon HUD (Clean-Room)
 */

(function () {
  const ns = window.DrBankAFF;
  if (!ns) return;

  let currentState = {
    settings: {},
    title: '',
    price: 0,
    priceMax: 0,
    baseRate: 3.5,
    extraRate: 10.0,
    capTHB: 250,
    whtRate: 3.0,
    sub1: 'fb_ads',
    sub2: 'camp_main',
    sub3: '',
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
      currentState.extraRate = Number(s.shopeeExtraRate) || 10.0;
      currentState.capTHB = Number(s.shopeeCapTHB) || 250;
      currentState.whtRate = Number(s.withholdingTaxRate) || 3.0;
      currentState.sub1 = s.defaultSubId1 || 'fb_ads';
      currentState.sub2 = s.defaultSubId2 || 'camp_main';
      currentState.sub3 = s.defaultSubId3 || '';
    } catch (_e) {
      // Fallback to defaults if runtime is busy
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

    // Re-scrape after initial hydration
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

    // 2. Product Price
    const priceCandidates = [];
    document.querySelectorAll('div, span').forEach((el) => {
      if (el.children.length === 0) {
        const txt = (el.textContent || '').trim();
        if (/^฿\s?[0-9,]+(\.[0-9]{1,2})?$/.test(txt)) {
          const val = ns.parsePriceNumber(txt);
          if (val > 0 && val < 1000000) priceCandidates.push(val);
        }
      }
    });

    if (priceCandidates.length > 0) {
      currentState.price = priceCandidates[0];
      currentState.priceMax = priceCandidates.length > 1 ? Math.max(...priceCandidates.slice(0, 3)) : priceCandidates[0];
    } else if (!currentState.price) {
      currentState.price = 299;
      currentState.priceMax = 299;
    }

    // 3. Variants / SKU Buttons
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
          <span class="drb-aff-badge-platform">Shopee</span>
        </div>
        <div class="drb-aff-header-actions">
          <button class="drb-aff-icon-btn" id="drb-btn-rescan" title="ดึงราคาและ SKU ใหม่">↻</button>
          <button class="drb-aff-icon-btn" id="drb-btn-minimize" title="ย่อ/ขยาย">_</button>
        </div>
      </div>

      <div class="drb-aff-body">
        <div class="drb-aff-product-title" id="drb-hud-title">กำลังอ่านข้อมูลสินค้า...</div>

        <div class="drb-aff-kpi-grid">
          <div class="drb-aff-kpi-card">
            <div class="drb-aff-kpi-label">ราคาสินค้า (THB)</div>
            <div class="drb-aff-kpi-val" id="drb-hud-price">฿0.00</div>
            <div class="drb-aff-kpi-sub" id="drb-hud-ids">Shop: - | Item: -</div>
          </div>
          <div class="drb-aff-kpi-card drb-aff-kpi-card--highlight">
            <div class="drb-aff-kpi-label">ค่าคอมสุทธิ / ชิ้น</div>
            <div class="drb-aff-kpi-val drb-aff-kpi-val--green" id="drb-hud-net-comm">฿0.00</div>
            <div class="drb-aff-kpi-sub" id="drb-hud-eff-rate">รวมเรท 0.0% (หักภาษี 3%)</div>
          </div>
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
              <td>เป้าขาย 100 บ้าน ได้กำไร:</td>
              <td id="drb-tbl-100" style="color:#38bdf8;">฿0.00</td>
            </tr>
          </tbody>
        </table>

        <div class="drb-aff-divider"></div>

        <div class="drb-aff-row-3">
          <div class="drb-aff-field">
            <label>Sub_ID 1</label>
            <input type="text" class="drb-aff-input" id="drb-inp-sub1" placeholder="fb_ads" value="${currentState.sub1}">
          </div>
          <div class="drb-aff-field">
            <label>Sub_ID 2</label>
            <input type="text" class="drb-aff-input" id="drb-inp-sub2" placeholder="camp01" value="${currentState.sub2}">
          </div>
          <div class="drb-aff-field">
            <label>Sub_ID 3</label>
            <input type="text" class="drb-aff-input" id="drb-inp-sub3" placeholder="sku_a" value="${currentState.sub3}">
          </div>
        </div>

        <div class="drb-aff-btn-group">
          <button class="drb-aff-btn drb-aff-btn--primary" id="drb-btn-copy-link">🔗 คัดลอกลิงก์ AFF</button>
          <button class="drb-aff-btn drb-aff-btn--emerald" id="drb-btn-copy-caption">📝 ก๊อปแคปชั่น+ลิงก์</button>
          <button class="drb-aff-btn drb-aff-btn--ghost" id="drb-btn-save-prod">⭐ เก็บเข้าคลังสินค้า</button>
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
    document.getElementById('drb-btn-minimize').addEventListener('click', () => {
      root.classList.toggle('drb-aff-hud--minimized');
    });

    document.getElementById('drb-btn-rescan').addEventListener('click', () => {
      scrapeShopeeProductDOM();
      updateHUDValues();
      ns.showToast('อัปเดตราคาและตัวเลือก SKU ล่าสุดแล้ว');
    });

    ['drb-inp-price', 'drb-inp-cap', 'drb-inp-base-rate', 'drb-inp-extra-rate', 'drb-inp-sub1', 'drb-inp-sub2', 'drb-inp-sub3'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          currentState.price = Number(document.getElementById('drb-inp-price').value) || 0;
          currentState.capTHB = Number(document.getElementById('drb-inp-cap').value) || 250;
          currentState.baseRate = Number(document.getElementById('drb-inp-base-rate').value) || 0;
          currentState.extraRate = Number(document.getElementById('drb-inp-extra-rate').value) || 0;
          currentState.sub1 = document.getElementById('drb-inp-sub1').value.trim();
          currentState.sub2 = document.getElementById('drb-inp-sub2').value.trim();
          currentState.sub3 = document.getElementById('drb-inp-sub3').value.trim();
          recalculateDisplayOnly();
        });
      }
    });

    document.getElementById('drb-btn-copy-link').addEventListener('click', async () => {
      const affLink = buildCurrentAffiliateLink();
      await ns.copyText(affLink, '🔗 คัดลอกลิงก์ Affiliate พร้อม Sub-ID แล้ว!');
      await ns.sendMessage('ADD_LINK_HISTORY', {
        platform: 'shopee',
        title: currentState.title,
        originalUrl: currentState.cleanUrl,
        affiliateUrl: affLink,
        subIds: [currentState.sub1, currentState.sub2, currentState.sub3].filter(Boolean)
      });
    });

    document.getElementById('drb-btn-copy-caption').addEventListener('click', async () => {
      const affLink = buildCurrentAffiliateLink();
      const caption = `🔥 ${currentState.title}\n💰 ราคาเพียง ${ns.formatTHB(currentState.price, 0)}\n👉 พิกัดสั่งซื้อ: ${affLink}`;
      await ns.copyText(caption, '📝 คัดลอกแคปชั่นพร้อมลิงก์แล้ว!');
    });

    document.getElementById('drb-btn-clean-url').addEventListener('click', async () => {
      await ns.copyText(currentState.cleanUrl || location.href, '✂️ คัดลอกลิงก์สินค้าแบบคลีนแล้ว!');
    });

    document.getElementById('drb-btn-save-prod').addEventListener('click', async () => {
      const comm = ns.calculateCommission(currentState);
      const affLink = buildCurrentAffiliateLink();
      await ns.sendMessage('SAVE_PRODUCT', {
        id: `shopee_${currentState.shopId}_${currentState.itemId || Date.now()}`,
        platform: 'shopee',
        title: currentState.title,
        price: currentState.price,
        priceMax: currentState.priceMax,
        baseRate: currentState.baseRate,
        extraRate: currentState.extraRate,
        estimatedCommission: comm.netComm,
        url: currentState.cleanUrl || location.href,
        affiliateUrl: affLink,
        shopId: currentState.shopId,
        itemId: currentState.itemId,
        variants: currentState.variants
      });
      ns.showToast('⭐ บันทึกสินค้าเข้าคลังทำเงินเรียบร้อย!');
    });
  }

  function buildCurrentAffiliateLink() {
    return ns.buildAffiliateLink({
      platform: 'shopee',
      cleanUrl: currentState.cleanUrl || location.href,
      affiliateId: currentState.settings.shopeeAffiliateId || '',
      subIds: [currentState.sub1, currentState.sub2, currentState.sub3]
    });
  }

  function updateHUDValues() {
    const titleEl = document.getElementById('drb-hud-title');
    if (!titleEl) return;
    titleEl.textContent = currentState.title;

    const priceInp = document.getElementById('drb-inp-price');
    if (priceInp) priceInp.value = currentState.price;

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
          // Click matching button on Shopee page so Shopee updates the displayed SKU price
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

  function recalculateDisplayOnly() {
    const comm = ns.calculateCommission(currentState);
    const priceEl = document.getElementById('drb-hud-price');
    const netEl = document.getElementById('drb-hud-net-comm');
    const effEl = document.getElementById('drb-hud-eff-rate');
    const tblBase = document.getElementById('drb-tbl-base');
    const tblExtra = document.getElementById('drb-tbl-extra');
    const tbl100 = document.getElementById('drb-tbl-100');

    if (priceEl) priceEl.textContent = ns.formatTHB(currentState.price);
    if (netEl) netEl.textContent = ns.formatTHB(comm.netComm);
    if (effEl) {
      effEl.textContent = `เรทรวม ${comm.effectiveRate.toFixed(1)}%${comm.isCapped ? ' (ติดเพดาน Cap)' : ''}`;
    }
    if (tblBase) tblBase.textContent = `${ns.formatTHB(comm.baseComm)}${comm.isCapped ? ' (Cap)' : ''}`;
    if (tblExtra) tblExtra.textContent = ns.formatTHB(comm.extraComm);
    if (tbl100) tbl100.textContent = ns.formatTHB(comm.netComm * 100, 0);
  }

  initShopeeHUD();
})();

