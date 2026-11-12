/**
 * DrBank AFF Scout v2.4.0 — Dual-Tab Chrome Side Panel Controller
 * Architecture:
 *  - Tab 1 (shopee): 100% isolated state & DOM for normal shopee.co.th product pages
 *  - Tab 2 (aff):    100% isolated state & DOM for affiliate.shopee.co.th offer & report pages
 *  - Auto-Detect & Auto-Switch Tab based on active tab URL
 */

const ns = window.DrBankAFF;

let currentTabId = null;
let activePanelTab = 'shopee'; // 'shopee' | 'aff'

// Separate State Objects so Tab 1 and Tab 2 never overwrite or corrupt each other
let shopeeProduct = null;
let affProduct = null;

let currentSettings = {
  theme: 'light',
  displayMode: 'sidepanel',
  webUiBaseUrl: 'http://localhost:3000'
};

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('drb-sp-ver').textContent = `v${ns.getVersion()}`;

  // Load Settings
  const store = await chrome.storage.local.get(['settings']);
  currentSettings = { ...currentSettings, ...(store.settings || {}) };

  const themeBtn = document.getElementById('drb-sp-theme-btn');
  const rootEl = document.getElementById('drb-sidepanel-root');
  ns.applyTheme(rootEl, currentSettings.theme, themeBtn);
  ns.applyTheme(document.body, currentSettings.theme, null);

  themeBtn.addEventListener('click', async () => {
    currentSettings.theme = await ns.toggleTheme(rootEl, currentSettings.theme, themeBtn);
    ns.applyTheme(document.body, currentSettings.theme, null);
    await chrome.storage.local.set({ settings: currentSettings });
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, { action: 'SET_THEME', theme: currentSettings.theme }).catch(() => {});
    }
  });

  // Manual Tab Switching
  document.getElementById('drb-tab-btn-shopee').addEventListener('click', () => {
    switchPanelTab('shopee');
  });
  document.getElementById('drb-tab-btn-aff').addEventListener('click', () => {
    switchPanelTab('aff');
  });

  // Switch to Floating HUD Button
  document.getElementById('drb-sp-btn-switch-hud').addEventListener('click', async () => {
    currentSettings.displayMode = 'float';
    await chrome.storage.local.set({ settings: currentSettings });
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, { action: 'SET_DISPLAY_MODE', mode: 'float' }).catch(() => {});
    }
    ns.showToast('สลับเป็นโหมดกล่องลอย (Floating HUD) บนหน้าเว็บแล้ว');
  });

  // Rescan / Refresh Button
  document.getElementById('drb-sp-rescan-btn').addEventListener('click', () => {
    queryActiveTabAndScrape(true);
  });

  // =========================================================================
  // TAB 1 EVENTS: 🛒 หน้าสินค้า Shopee (shopee.co.th)
  // =========================================================================
  const specBox = document.getElementById('drb-sp-spec-box');
  const expandBtn = document.getElementById('drb-sp-btn-spec-expand');
  const foldBtn = document.getElementById('drb-sp-btn-spec-fold');

  expandBtn.addEventListener('click', () => {
    specBox.classList.remove('is-collapsed');
    const expanded = specBox.classList.toggle('is-expanded');
    expandBtn.textContent = expanded ? '▲ หด 5 บรรทัด' : '▼ ยืด';
    foldBtn.textContent = '▲ พับ';
  });

  foldBtn.addEventListener('click', () => {
    specBox.classList.remove('is-expanded');
    const collapsed = specBox.classList.toggle('is-collapsed');
    foldBtn.textContent = collapsed ? '▼ เปิดสเปก' : '▲ พับ';
    expandBtn.textContent = '▼ ยืด';
  });

  ['drb-sp-inp-price', 'drb-sp-inp-cap', 'drb-sp-inp-base-rate', 'drb-sp-inp-extra-rate'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (!shopeeProduct) shopeeProduct = {};
        shopeeProduct.price = Number(document.getElementById('drb-sp-inp-price').value) || 0;
        shopeeProduct.capTHB = Number(document.getElementById('drb-sp-inp-cap').value) || 250;
        shopeeProduct.baseRate = Number(document.getElementById('drb-sp-inp-base-rate').value) || 0;
        shopeeProduct.extraRate = Number(document.getElementById('drb-sp-inp-extra-rate').value) || 0;
        recalculateShopeeTab();
      });
    }
  });

  document.getElementById('drb-sp-btn-push-webui').addEventListener('click', async () => {
    await pushProductToWebUI(shopeeProduct, 'Shopee');
  });

  const checkAffBtn = document.getElementById('drb-sp-btn-check-aff');
  if (checkAffBtn) {
    checkAffBtn.addEventListener('click', () => {
      const itemId = shopeeProduct?.itemId || '';
      const targetUrl = itemId
        ? `https://affiliate.shopee.co.th/offer/product_offer/${itemId}`
        : `https://affiliate.shopee.co.th/offer/product_offer`;
      chrome.tabs.create({ url: targetUrl });
    });
  }

  document.getElementById('drb-sp-btn-clean-url').addEventListener('click', () => {
    if (shopeeProduct && shopeeProduct.cleanUrl) {
      navigator.clipboard.writeText(shopeeProduct.cleanUrl);
      ns.showToast('✂️ ก๊อปลิงก์คลีนเรียบร้อย');
    } else {
      ns.showToast('ไม่พบลิงก์สินค้า');
    }
  });

  document.getElementById('drb-sp-btn-open-webui').addEventListener('click', openWebUI);

  // =========================================================================
  // TAB 2 EVENTS: 📊 หน้าข้อเสนอ Affiliate (affiliate.shopee.co.th)
  // =========================================================================
  ['drb-aff-inp-price', 'drb-aff-inp-cap', 'drb-aff-inp-base-rate', 'drb-aff-inp-extra-rate'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (!affProduct) affProduct = {};
        affProduct.price = Number(document.getElementById('drb-aff-inp-price').value) || 0;
        affProduct.capTHB = Number(document.getElementById('drb-aff-inp-cap').value) || 250;
        affProduct.baseRate = Number(document.getElementById('drb-aff-inp-base-rate').value) || 0;
        affProduct.extraRate = Number(document.getElementById('drb-aff-inp-extra-rate').value) || 0;
        recalculateAffTab();
      });
    }
  });

  document.getElementById('drb-aff-btn-push-webui').addEventListener('click', async () => {
    await pushProductToWebUI(affProduct, 'Affiliate Offer');
  });

  const openV1Btn = document.getElementById('drb-aff-btn-open-v1');
  if (openV1Btn) {
    openV1Btn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('affiliate.shopee.co.th')) {
        chrome.tabs.sendMessage(tab.id, { action: 'OPEN_V1_SCANNER' }).catch(() => {
          chrome.tabs.update(tab.id, { url: 'https://affiliate.shopee.co.th/offer/product_offer#drb-action=v1_scanner' });
        });
      } else {
        chrome.tabs.create({ url: 'https://affiliate.shopee.co.th/offer/product_offer#drb-action=v1_scanner' });
      }
    });
  }

  document.getElementById('drb-aff-btn-sync-report').addEventListener('click', async () => {
    if (!currentTabId) return;
    try {
      const resp = await chrome.tabs.sendMessage(currentTabId, { action: 'SCAN_AFFILIATE_REPORT' });
      const rep = resp?.report;
      if (rep && rep.orderCount > 0) {
        await ns.sendMessage('PUSH_REPORT_TO_WEBUI', rep);
        ns.showToast(`📥 ดูดตาราง Report (${rep.orderCount} แถว) ส่งเข้า Web UI สำเร็จ!`);
      } else {
        ns.showToast('ไม่พบตาราง Conversion Report ในหน้านี้');
      }
    } catch (_e) {
      ns.showToast('กรุณาเปิดหน้า Conversion Report บน affiliate.shopee.co.th');
    }
  });

  document.getElementById('drb-aff-btn-open-webui').addEventListener('click', openWebUI);

  // Listen to browser tab switches & URL changes for Auto-Detect
  chrome.tabs.onActivated.addListener(() => {
    queryActiveTabAndScrape(false);
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === currentTabId && changeInfo.status === 'complete') {
      queryActiveTabAndScrape(false);
    }
  });

  // Listen to Grid Card "[⚡ เลือก]" clicks from both affiliate.shopee.co.th and shopee.co.th
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.activeAffOfferProduct?.newValue) {
      affProduct = changes.activeAffOfferProduct.newValue;
      switchPanelTab('aff');
      renderAffiliateTabData(affProduct);
    }
    if (areaName === 'local' && changes.activeShopeeGridProduct?.newValue) {
      shopeeProduct = changes.activeShopeeGridProduct.newValue;
      switchPanelTab('shopee');
      renderShopeeTabData(shopeeProduct);
    }
  });

  // Initial scrape
  queryActiveTabAndScrape(false);
});

function switchPanelTab(tabName) {
  activePanelTab = tabName === 'aff' ? 'aff' : 'shopee';

  const btnShopee = document.getElementById('drb-tab-btn-shopee');
  const btnAff = document.getElementById('drb-tab-btn-aff');
  const paneShopee = document.getElementById('drb-pane-shopee');
  const paneAff = document.getElementById('drb-pane-aff');
  const badge = document.getElementById('drb-sp-mode-badge');

  if (activePanelTab === 'aff') {
    btnShopee.classList.remove('active');
    btnAff.classList.add('active');
    paneShopee.classList.remove('active');
    paneAff.classList.add('active');
    if (badge) {
      badge.textContent = 'AFF Offer';
      badge.style.background = 'rgba(2, 132, 199, 0.16)';
      badge.style.color = '#0284c7';
      badge.style.borderColor = 'rgba(2, 132, 199, 0.35)';
    }
  } else {
    btnAff.classList.remove('active');
    btnShopee.classList.add('active');
    paneAff.classList.remove('active');
    paneShopee.classList.add('active');
    if (badge) {
      badge.textContent = 'Shopee';
      badge.style.background = 'rgba(22, 163, 74, 0.15)';
      badge.style.color = '#16a34a';
      badge.style.borderColor = 'rgba(22, 163, 74, 0.3)';
    }
  }
}

async function queryActiveTabAndScrape(showToastOnDone = false) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  currentTabId = tab.id;

  const url = tab.url || '';
  const isAffiliateUrl = url.includes('affiliate.shopee.co.th');
  const isShopeeMallUrl = url.includes('shopee.co.th') && !isAffiliateUrl;

  // 1. AUTO-DETECT & AUTO-SWITCH TAB BY URL
  if (isAffiliateUrl) {
    switchPanelTab('aff');
    await scrapeAffiliateTab(tab.id, showToastOnDone);
    // Second pass after 800ms in case React table just mounted
    setTimeout(() => scrapeAffiliateTab(tab.id, false), 850);
    return;
  }

  if (isShopeeMallUrl) {
    switchPanelTab('shopee');
    await scrapeShopeeTab(tab.id, showToastOnDone);
    return;
  }
}

async function scrapeShopeeTab(tabId, showToastOnDone) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_SCRAPED_PRODUCT' });
    if (response && response.ok) {
      if (response.isGridPage) {
        if (response.data && response.data.title) {
          shopeeProduct = response.data;
          renderShopeeTabData(shopeeProduct);
        } else if (!shopeeProduct) {
          const gc = response.gridCounts || { total: 0, win: 0 };
          document.getElementById('drb-sp-title').textContent =
            `⚡ สแกนหน้าค้นหา Shopee พบ ${gc.total || 0} ชิ้น (น่าลุย ${gc.win || 0} ชิ้น) — ชี้หรือคลิกป้ายมุมขวาบนการ์ดเพื่อดึงเข้า Side Panel!`;
        }
        if (showToastOnDone) ns.showToast('↻ สแกนป้ายประเมินค่าคอมตามหมวด A-F ครบทุกใบแล้ว!');
      } else if (response.data) {
        shopeeProduct = response.data;
        renderShopeeTabData(shopeeProduct);
        if (showToastOnDone) ns.showToast('↻ อัปเดตข้อมูลหน้าสินค้า Shopee แล้ว');
      }
    }
  } catch (_e) {
    // Keep existing shopeeProduct if already loaded, otherwise show hint
    if (!shopeeProduct) {
      document.getElementById('drb-sp-title').textContent = 'ไม่พบข้อมูลสินค้า (กด F5 รีเฟรชหน้าเว็บ Shopee 1 ครั้ง)';
    }
  }
}

async function scrapeAffiliateTab(tabId, showToastOnDone) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_AFFILIATE_OFFER' });
    if (response && response.ok && response.mode === 'offer' && response.data) {
      affProduct = response.data;
      renderAffiliateTabData(affProduct);
      if (showToastOnDone) ns.showToast('↻ ดึงเรทจริงจากตารางข้อเสนอ Affiliate แล้ว!');
    } else if (response && response.ok && response.mode === 'grid') {
      if (response.data && response.data.title) {
        affProduct = response.data;
        renderAffiliateTabData(affProduct);
      } else if (!affProduct) {
        const gc = response.gridCounts || { total: 0, win: 0 };
        document.getElementById('drb-aff-title').textContent =
          `⚡ สแกนการ์ดแล้ว ${gc.total || 0} ชิ้น (น่าลุย ${gc.win || 0} ชิ้น) — กดปุ่ม [⚡ เลือก] บนการ์ดที่ต้องการได้เลย!`;
      }
      if (showToastOnDone) ns.showToast('↻ สแกนป้ายไฟจราจรบนการ์ดสินค้าครบทุกใบแล้ว!');
    } else if (response && response.ok && response.mode === 'report') {
      document.getElementById('drb-aff-title').textContent =
        'หน้านี้คือหน้า Conversion Report — กดปุ่ม [📥 ดูดตาราง Report] ด้านล่างได้เลย';
    }
  } catch (_e) {
    if (!affProduct) {
      document.getElementById('drb-aff-title').textContent =
        'กรุณากด F5 รีเฟรชหน้า affiliate.shopee.co.th 1 ครั้งเพื่อเริ่มดึงตารางข้อเสนอ';
    }
  }
}

// ============================================================================
// RENDER TAB 1: 🛒 หน้าสินค้า Shopee (shopee.co.th)
// ============================================================================
function renderShopeeTabData(p) {
  document.getElementById('drb-sp-title').textContent = p.title || 'Shopee Product';
  document.getElementById('drb-sp-spec-body').textContent = p.specText || 'ไม่มีข้อมูลสเปกเพิ่มเติม';
  document.getElementById('drb-sp-inp-price').value = p.price || 0;
  if (p.baseRate !== undefined) {
    document.getElementById('drb-sp-inp-base-rate').value = p.baseRate;
  }
  if (p.extraRate !== undefined) {
    document.getElementById('drb-sp-inp-extra-rate').value = p.extraRate;
  }
  document.getElementById('drb-sp-ids').textContent = `Shop: ${p.shopId || '-'} | Item: ${p.itemId || '-'} (${(p.imagesHD || []).length} รูป HD)`;

  const sc = p.soldCount || 0;
  const sLabel = (p.soldText || sc.toLocaleString()).slice(0, 14);
  const soldEl = document.getElementById('drb-sp-badge-sold');
  if (sc >= 1000) {
    soldEl.className = 'drb-aff-check-pill drb-aff-check-pill--green';
    soldEl.textContent = `🔥 ขายดี ${sLabel}`;
  } else if (sc >= 300) {
    soldEl.className = 'drb-aff-check-pill drb-aff-check-pill--yellow';
    soldEl.textContent = `⚠️ ยอดขาย ${sLabel}`;
  } else {
    soldEl.className = 'drb-aff-check-pill drb-aff-check-pill--red';
    soldEl.textContent = sc > 0 ? `❌ ขายต่ำ (${sLabel})` : `❌ ยอดขาย <300`;
  }

  const extraEl = document.getElementById('drb-sp-badge-extra');
  const ex = Number(p.extraRate) || 0;
  const catSuffix = p.categoryLabel ? ` (${p.categoryLabel})` : '';
  if (ex > 0) {
    extraEl.className = 'drb-aff-check-pill drb-aff-check-pill--green';
    extraEl.textContent = `✅ Extra ~${ex}%${catSuffix}`;
  } else {
    extraEl.className = 'drb-aff-check-pill drb-aff-check-pill--red';
    extraEl.textContent = `❌ ไร้ Extra 0%`;
  }

  const ratingEl = document.getElementById('drb-sp-badge-rating');
  const r = Number(p.rating) || 4.9;
  const shipLoc = p.shipFrom || (p.isOverseas ? 'ส่งจากจีน' : 'ส่งในไทย');
  if (p.isOverseas) {
    ratingEl.className = 'drb-aff-check-pill drb-aff-check-pill--yellow';
    ratingEl.textContent = `⚠️ ส่งจากจีน (⭐${r.toFixed(1)})`;
  } else if (r >= 4.8) {
    ratingEl.className = 'drb-aff-check-pill drb-aff-check-pill--green';
    ratingEl.textContent = `⭐ ${r.toFixed(1)} (${shipLoc})`;
  } else {
    ratingEl.className = 'drb-aff-check-pill drb-aff-check-pill--yellow';
    ratingEl.textContent = `⚠️ ⭐${r.toFixed(1)} (${shipLoc})`;
  }

  // Variants
  const listEl = document.getElementById('drb-sp-variants-list');
  const countEl = document.getElementById('drb-sp-variants-count');
  const vars = p.variants || [];
  countEl.textContent = `${vars.length} รายการ`;
  listEl.innerHTML = '';
  vars.forEach((vName) => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'drb-aff-variant-pill';
    pill.textContent = vName;
    pill.addEventListener('click', () => {
      document.querySelectorAll('#drb-sp-variants-list .drb-aff-variant-pill').forEach((x) => x.classList.remove('active'));
      pill.classList.add('active');
      if (currentTabId) {
        chrome.tabs.sendMessage(currentTabId, { action: 'SELECT_VARIANT', variantName: vName }).then((res) => {
          if (res && res.data) {
            shopeeProduct = res.data;
            renderShopeeTabData(shopeeProduct);
          }
        }).catch(() => {});
      }
    });
    listEl.appendChild(pill);
  });

  recalculateShopeeTab();
}

function recalculateShopeeTab() {
  if (!shopeeProduct) return;
  const comm = ns.calculateCommission(shopeeProduct);

  document.getElementById('drb-sp-price').textContent = ns.formatTHB(shopeeProduct.price);

  const commCard = document.getElementById('drb-sp-comm-card');
  commCard.setAttribute('data-tier', comm.tier);

  document.getElementById('drb-sp-net-comm').textContent = `${comm.tierEmoji || ''} ${ns.formatTHB(comm.netComm)}`;
  document.getElementById('drb-sp-tier-badge').textContent = comm.tierLabel;
  document.getElementById('drb-sp-eff-rate').textContent = `เรทรวม ${comm.effectiveRate.toFixed(1)}%${comm.isCapped ? ' (ติด Cap)' : ''}`;

  const breakEvenBox = document.getElementById('drb-sp-breakeven-box');
  breakEvenBox.setAttribute('data-tier', comm.tier);
  document.getElementById('drb-sp-breakeven-text').textContent = comm.bannerText;

  document.getElementById('drb-sp-tbl-breakdown').textContent = `${ns.formatTHB(comm.baseComm)} + ${ns.formatTHB(comm.extraComm)}`;
  document.getElementById('drb-sp-tbl-100').textContent = `${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)`;
}

// ============================================================================
// RENDER TAB 2: 📊 หน้าข้อเสนอ Affiliate (affiliate.shopee.co.th)
// ============================================================================
function renderAffiliateTabData(p) {
  document.getElementById('drb-aff-title').textContent = p.title || 'Shopee Affiliate Offer';
  document.getElementById('drb-aff-inp-price').value = p.price || 0;
  document.getElementById('drb-aff-inp-base-rate').value = p.baseRate ?? 2.0;
  document.getElementById('drb-aff-inp-extra-rate').value = p.extraRate ?? 0.0;
  document.getElementById('drb-aff-ids').textContent = `Item ID: ${p.itemId || '-'} | รูป HD: ${(p.imagesHD || []).length}`;

  // Checklist Badges for Affiliate Offer
  const sc = p.soldCount || 0;
  const sLabel = (p.soldText || sc.toLocaleString()).slice(0, 14);
  const soldEl = document.getElementById('drb-aff-badge-sold');
  if (sc >= 1000) {
    soldEl.className = 'drb-aff-check-pill drb-aff-check-pill--green';
    soldEl.textContent = `🔥 ขายได้ ${sLabel}`;
  } else if (sc >= 300) {
    soldEl.className = 'drb-aff-check-pill drb-aff-check-pill--yellow';
    soldEl.textContent = `⚠️ ขายได้ ${sLabel}`;
  } else {
    soldEl.className = 'drb-aff-check-pill drb-aff-check-pill--red';
    soldEl.textContent = sc > 0 ? `❌ ขายต่ำ (${sLabel})` : `❌ ยอดขาย <300`;
  }

  const extraEl = document.getElementById('drb-aff-badge-extra');
  const ex = Number(p.extraRate) || 0;
  if (ex > 0) {
    extraEl.className = 'drb-aff-check-pill drb-aff-check-pill--green';
    extraEl.textContent = `✅ EXTRACOMM ${ex}%`;
  } else {
    extraEl.className = 'drb-aff-check-pill drb-aff-check-pill--red';
    extraEl.textContent = `❌ ไม่มี EXTRACOMM`;
  }

  const ratingEl = document.getElementById('drb-aff-badge-rating');
  const r = Number(p.rating) || 4.9;
  ratingEl.className = r >= 4.8 ? 'drb-aff-check-pill drb-aff-check-pill--green' : 'drb-aff-check-pill drb-aff-check-pill--yellow';
  ratingEl.textContent = `⭐ ${r.toFixed(1)}`;

  recalculateAffTab();
}

function recalculateAffTab() {
  if (!affProduct) return;
  const comm = ns.calculateCommission(affProduct);

  document.getElementById('drb-aff-price').textContent = ns.formatTHB(affProduct.price);

  const commCard = document.getElementById('drb-aff-comm-card');
  commCard.setAttribute('data-tier', comm.tier);

  document.getElementById('drb-aff-net-comm').textContent = `${comm.tierEmoji || ''} ${ns.formatTHB(comm.netComm)}`;
  document.getElementById('drb-aff-tier-badge').textContent = comm.tierLabel;
  document.getElementById('drb-aff-eff-rate').textContent = `เรทรวมจริง ${comm.effectiveRate.toFixed(1)}% (หักภาษี 3%)`;

  const breakEvenBox = document.getElementById('drb-aff-breakeven-box');
  breakEvenBox.setAttribute('data-tier', comm.tier);
  document.getElementById('drb-aff-breakeven-text').textContent = comm.bannerText;

  // Real Offer Breakdown Table
  document.getElementById('drb-aff-real-extra').textContent = `${affProduct.extraRate || 0}% (${ns.formatTHB(comm.extraComm)})`;
  document.getElementById('drb-aff-real-base').textContent = `${affProduct.baseRate || 0}% (${ns.formatTHB(comm.baseComm)})`;
  document.getElementById('drb-aff-real-gross').textContent = ns.formatTHB(comm.grossComm);
  document.getElementById('drb-aff-real-breakeven').textContent = `${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)`;
}

async function pushProductToWebUI(prod, label) {
  if (!prod || !prod.title) {
    ns.showToast('ยังไม่มีข้อมูลสินค้า กรุณาเปิดหน้าสินค้าก่อน');
    return;
  }
  const comm = ns.calculateCommission(prod);
  const skuPayload = {
    id: `shopee_${prod.shopId || 'aff'}_${prod.itemId || Date.now()}`,
    platform: 'shopee',
    sourceTab: label,
    title: prod.title,
    specText: prod.specText || '',
    originalPrice: prod.originalPrice || prod.price,
    price: prod.price,
    priceMax: prod.priceMax || prod.price,
    baseRate: prod.baseRate,
    extraRate: prod.extraRate,
    estimatedCommission: Number(comm.netComm.toFixed(2)),
    realDailyAdCostTHB: 107,
    breakEvenUnits: comm.breakEvenUnits,
    breakEvenOrders: comm.breakEvenOrders,
    adViabilityTier: comm.tier,
    tierEmoji: comm.tierEmoji,
    cleanUrl: prod.cleanUrl,
    imagesHD: prod.imagesHD || [],
    selectedVariants: prod.variants || [],
    scrapedAt: new Date().toISOString()
  };

  try {
    const res = await ns.sendMessage('PUSH_SKU_TO_WEBUI', skuPayload);
    await navigator.clipboard.writeText(JSON.stringify(skuPayload, null, 2)).catch(() => {});
    const msg = res?.syncedToServer
      ? `🚀 ส่งสินค้า (${label}) เข้า Web UI เรียบร้อย!`
      : `⚡ เก็บลงคิว Web UI (${res?.totalQueued || 1} รายการ) + ก๊อป JSON แล้ว!`;
    ns.showToast(msg);
  } catch (_e) {
    ns.showToast('บันทึกในเครื่องแล้ว');
  }
}

function openWebUI() {
  const baseUrl = currentSettings.webUiBaseUrl || 'http://localhost:3000';
  window.open(baseUrl, '_blank', 'noopener');
}
