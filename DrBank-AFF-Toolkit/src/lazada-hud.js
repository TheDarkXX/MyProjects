/**
 * DrBank AFF Studio — Lazada Product & Adsense Affiliate HUD (Clean-Room)
 */

(function () {
  const ns = window.DrBankAFF;
  if (!ns) return;

  let lazState = {
    settings: {},
    title: '',
    price: 0,
    baseRate: 4.0,
    extraRate: 8.0,
    capTHB: 500,
    whtRate: 3.0,
    sub1: 'fb_ads',
    sub2: 'laz_camp',
    sub3: '',
    itemId: '',
    skuId: '',
    cleanUrl: ''
  };

  async function initLazadaHUD() {
    try {
      const store = await ns.sendMessage('GET_STATE');
      const s = store.settings || {};
      lazState.settings = s;
      lazState.baseRate = Number(s.lazadaBaseRate) || 4.0;
      lazState.extraRate = Number(s.lazadaExtraRate) || 8.0;
      lazState.whtRate = Number(s.withholdingTaxRate) || 3.0;
      lazState.sub1 = s.defaultSubId1 || 'fb_ads';
      lazState.sub2 = s.defaultSubId2 || 'laz_camp';
      lazState.sub3 = s.defaultSubId3 || '';
    } catch (_e) { }

    scrapeLazadaDOM();
    renderLazadaHUD();
  }

  function scrapeLazadaDOM() {
    const parsed = ns.parseLazadaIds(location.href);
    lazState.itemId = parsed.itemId;
    lazState.skuId = parsed.skuId;
    lazState.cleanUrl = parsed.cleanUrl;

    const titleEl =
      document.querySelector('h1.pdp-mod-product-badge-title') ||
      document.querySelector('h1') ||
      document.querySelector('meta[property="og:title"]');

    const rawTitle = titleEl
      ? titleEl.tagName === 'META'
        ? titleEl.getAttribute('content')
        : titleEl.textContent
      : document.title;

    lazState.title = (rawTitle || 'Lazada Product').replace(/\| Lazada\.co\.th/i, '').trim();

    const priceEl =
      document.querySelector('.pdp-price_type_normal') ||
      document.querySelector('.pdp-price') ||
      document.querySelector('[class*="price"]');

    const pVal = priceEl ? ns.parsePriceNumber(priceEl.textContent) : 0;
    lazState.price = pVal > 0 ? pVal : 350;
  }

  function renderLazadaHUD() {
    if (document.getElementById('drb-aff-hud-root')) return;

    const root = document.createElement('div');
    root.id = 'drb-aff-hud-root';

    root.innerHTML = `
      <div class="drb-aff-header" id="drb-aff-drag-handle">
        <div class="drb-aff-brand">
          <span>⚡ DrBank AFF</span>
          <span class="drb-aff-badge-platform drb-aff-badge-platform--lazada">Lazada</span>
        </div>
        <div class="drb-aff-header-actions">
          <button class="drb-aff-icon-btn" id="drb-laz-rescan" title="สแกนราคาใหม่">↻</button>
          <button class="drb-aff-icon-btn" id="drb-laz-min" title="ย่อ/ขยาย">_</button>
        </div>
      </div>

      <div class="drb-aff-body">
        <div class="drb-aff-product-title" id="drb-laz-title">${lazState.title}</div>

        <div class="drb-aff-kpi-grid">
          <div class="drb-aff-kpi-card">
            <div class="drb-aff-kpi-label">ราคา Lazada (THB)</div>
            <div class="drb-aff-kpi-val" id="drb-laz-price">฿0.00</div>
            <div class="drb-aff-kpi-sub">Item: ${lazState.itemId || '-'}</div>
          </div>
          <div class="drb-aff-kpi-card drb-aff-kpi-card--highlight">
            <div class="drb-aff-kpi-label">ค่าคอมสุทธิ / ชิ้น</div>
            <div class="drb-aff-kpi-val drb-aff-kpi-val--green" id="drb-laz-net">฿0.00</div>
            <div class="drb-aff-kpi-sub" id="drb-laz-rate">รวมเรท 0%</div>
          </div>
        </div>

        <div class="drb-aff-row">
          <div class="drb-aff-field">
            <label>ราคาคำนวณ (฿)</label>
            <input type="number" class="drb-aff-input" id="drb-laz-inp-price" value="${lazState.price}">
          </div>
          <div class="drb-aff-field">
            <label>Base + Bonus (%)</label>
            <input type="number" step="0.5" class="drb-aff-input" id="drb-laz-inp-rate" value="${lazState.baseRate + lazState.extraRate}">
          </div>
        </div>

        <div class="drb-aff-row-3">
          <div class="drb-aff-field">
            <label>Sub_ID 1</label>
            <input type="text" class="drb-aff-input" id="drb-laz-sub1" value="${lazState.sub1}">
          </div>
          <div class="drb-aff-field">
            <label>Sub_ID 2</label>
            <input type="text" class="drb-aff-input" id="drb-laz-sub2" value="${lazState.sub2}">
          </div>
          <div class="drb-aff-field">
            <label>Sub_ID 3</label>
            <input type="text" class="drb-aff-input" id="drb-laz-sub3" value="${lazState.sub3}">
          </div>
        </div>

        <div class="drb-aff-btn-group">
          <button class="drb-aff-btn drb-aff-btn--primary" id="drb-laz-copy-link">🔗 ก๊อปลิงก์ Lazada AFF</button>
          <button class="drb-aff-btn drb-aff-btn--emerald" id="drb-laz-save">⭐ เก็บเข้าคลังสินค้า</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    ns.makeDraggable(root, document.getElementById('drb-aff-drag-handle'));

    document.getElementById('drb-laz-min').addEventListener('click', () => {
      root.classList.toggle('drb-aff-hud--minimized');
    });

    document.getElementById('drb-laz-rescan').addEventListener('click', () => {
      scrapeLazadaDOM();
      document.getElementById('drb-laz-inp-price').value = lazState.price;
      updateLazadaCalc();
      ns.showToast('อัปเดตข้อมูลสินค้า Lazada แล้ว');
    });

    ['drb-laz-inp-price', 'drb-laz-inp-rate', 'drb-laz-sub1', 'drb-laz-sub2', 'drb-laz-sub3'].forEach((id) => {
      document.getElementById(id).addEventListener('input', updateLazadaCalc);
    });

    document.getElementById('drb-laz-copy-link').addEventListener('click', async () => {
      const link = ns.buildAffiliateLink({
        platform: 'lazada',
        cleanUrl: lazState.cleanUrl || location.href,
        affiliateId: lazState.settings.lazadaAffiliateId || '',
        subIds: [
          document.getElementById('drb-laz-sub1').value,
          document.getElementById('drb-laz-sub2').value,
          document.getElementById('drb-laz-sub3').value
        ]
      });
      await ns.copyText(link, '🔗 คัดลอกลิงก์ Lazada Affiliate แล้ว!');
      await ns.sendMessage('ADD_LINK_HISTORY', {
        platform: 'lazada',
        title: lazState.title,
        originalUrl: lazState.cleanUrl || location.href,
        affiliateUrl: link,
        subIds: [document.getElementById('drb-laz-sub1').value].filter(Boolean)
      });
    });

    document.getElementById('drb-laz-save').addEventListener('click', async () => {
      const totalRate = Number(document.getElementById('drb-laz-inp-rate').value) || 0;
      const comm = ns.calculateCommission({
        price: lazState.price,
        baseRate: totalRate,
        extraRate: 0,
        capTHB: 99999,
        whtRate: lazState.whtRate
      });
      await ns.sendMessage('SAVE_PRODUCT', {
        id: `lazada_${lazState.itemId || Date.now()}`,
        platform: 'lazada',
        title: lazState.title,
        price: lazState.price,
        priceMax: lazState.price,
        baseRate: totalRate,
        extraRate: 0,
        estimatedCommission: comm.netComm,
        url: lazState.cleanUrl || location.href,
        itemId: lazState.itemId
      });
      ns.showToast('⭐ บันทึกสินค้า Lazada เข้าคลังแล้ว!');
    });

    updateLazadaCalc();
  }

  function updateLazadaCalc() {
    lazState.price = Number(document.getElementById('drb-laz-inp-price').value) || 0;
    const totalRate = Number(document.getElementById('drb-laz-inp-rate').value) || 0;
    const comm = ns.calculateCommission({
      price: lazState.price,
      baseRate: totalRate,
      extraRate: 0,
      capTHB: 99999,
      whtRate: lazState.whtRate
    });
    document.getElementById('drb-laz-price').textContent = ns.formatTHB(lazState.price);
    document.getElementById('drb-laz-net').textContent = ns.formatTHB(comm.netComm);
    document.getElementById('drb-laz-rate').textContent = `เรทรวม ${totalRate.toFixed(1)}% (หักภาษี 3%)`;
  }

  initLazadaHUD();
})();

