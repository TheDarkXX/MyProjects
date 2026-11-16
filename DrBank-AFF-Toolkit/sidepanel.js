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
  webUiBaseUrl: 'https://aff.doctorbankonline.com'
};

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('drb-sp-ver').textContent = `v${ns.getVersion()}`;

  // Load Settings & Cached Offer State
  const store = await chrome.storage.local.get(['settings', 'activeAffOfferProduct']);
  currentSettings = { ...currentSettings, ...(store.settings || {}) };
  if (store.activeAffOfferProduct) {
    affProduct = store.activeAffOfferProduct;
    renderAffiliateTabData(affProduct);
  }

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

  const refreshRealRateBtn = document.getElementById('drb-sp-btn-refresh-realrate');
  if (refreshRealRateBtn) {
    refreshRealRateBtn.addEventListener('click', async () => {
      ns.showToast('⏳ กำลังดึงเรทจริง Social Media จากบัญชี Affiliate...');
      if (currentTabId) {
        await scrapeShopeeTab(currentTabId, false, true);
      }
      if (shopeeProduct && shopeeProduct.itemId) {
        await syncOrFetchRealSocialRateInSidePanel(shopeeProduct, true);
      }
    });
  }

  bindShortLinkGenerator('sp', () => shopeeProduct);
  bindShortLinkGenerator('aff', () => affProduct);

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

  const poolBridgeBtn = document.getElementById('drb-aff-btn-pool-bridge');
  if (poolBridgeBtn) {
    poolBridgeBtn.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('affiliate.shopee.co.th')) {
        ns.showToast('🚀 เริ่มดึง Pool รายการมาแปลงลิงก์ s.shopee.co.th...');
        chrome.tabs.sendMessage(tab.id, { action: 'RUN_POOL_BRIDGE' }).catch(() => {
          chrome.tabs.update(tab.id, { url: 'https://affiliate.shopee.co.th/offer/custom_link#drb-action=pool_bridge' });
        });
      } else {
        chrome.tabs.create({ url: 'https://affiliate.shopee.co.th/offer/custom_link#drb-action=pool_bridge' });
      }
    });
  }

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
    if (tabId === currentTabId && (changeInfo.url || changeInfo.status === 'complete')) {
      queryActiveTabAndScrape(false);
    }
  });

  // Listen to Grid Card "[⚡ เลือก]" & Background Real-Rate updates
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'local') return;
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
    const activeUrl = activeTab?.url || '';
    const onAffDomain = activeUrl.includes('affiliate.shopee.co.th');
    const onShopeeDomain = activeUrl.includes('shopee.co.th') && !onAffDomain;

    if (changes.activeAffOfferProduct?.newValue) {
      affProduct = changes.activeAffOfferProduct.newValue;
      if (onAffDomain) switchPanelTab('aff');
      renderAffiliateTabData(affProduct);
      if (
        shopeeProduct &&
        affProduct.itemId &&
        String(shopeeProduct.itemId) === String(affProduct.itemId) &&
        (Number(affProduct.baseRate) > 0 || Number(affProduct.extraRate) > 0)
      ) {
        applyRealOfferToShopeeProduct(shopeeProduct, affProduct);
        renderShopeeTabData(shopeeProduct);
      }
    }
    if (changes.activeShopeeGridProduct?.newValue) {
      const incoming = changes.activeShopeeGridProduct.newValue;
      const keepVerified =
        shopeeProduct &&
        shopeeProduct.realRateVerified &&
        incoming.itemId &&
        String(shopeeProduct.itemId) === String(incoming.itemId) &&
        !incoming.realRateVerified;
      shopeeProduct = keepVerified
        ? {
            ...incoming,
            baseRate: shopeeProduct.baseRate,
            extraRate: shopeeProduct.extraRate,
            offerPrice: shopeeProduct.offerPrice,
            realRateVerified: true,
            realRateItemId: shopeeProduct.realRateItemId,
            categoryLabel: 'เรทจริง Social Media'
          }
        : incoming;
      if (onShopeeDomain) switchPanelTab('shopee');
      renderShopeeTabData(shopeeProduct);
      if (!shopeeProduct.realRateVerified && shopeeProduct.itemId) {
        syncOrFetchRealSocialRateInSidePanel(shopeeProduct, false);
      }
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
    setTimeout(() => scrapeShopeeTab(tab.id, false), 750);
    setTimeout(() => scrapeShopeeTab(tab.id, false), 1650);
    return;
  }
}

async function scrapeShopeeTab(tabId, showToastOnDone, forceRefresh = false) {
  let tabObj = null;
  try {
    tabObj = await chrome.tabs.get(tabId);
  } catch (_e) {}

  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_SCRAPED_PRODUCT', forceRefresh });
    if (response && response.ok) {
      if (response.isGridPage) {
        if (response.data && response.data.title) {
          shopeeProduct = response.data;
          renderShopeeTabData(shopeeProduct);
          await syncOrFetchRealSocialRateInSidePanel(shopeeProduct, forceRefresh);
        } else if (!shopeeProduct) {
          const gc = response.gridCounts || { total: 0, win: 0 };
          document.getElementById('drb-sp-title').textContent =
            `⚡ สแกนหน้าค้นหา Shopee พบ ${gc.total || 0} ชิ้น (น่าลุย ${gc.win || 0} ชิ้น) — ชี้หรือคลิกป้ายมุมขวาบนการ์ดเพื่อดึงเข้า Side Panel!`;
        }
        if (showToastOnDone) ns.showToast('↻ สแกนป้ายประเมินค่าคอมตามหมวด A-F ครบทุกใบแล้ว!');
      } else if (response.data) {
        const incoming = response.data;
        const preserveVerified =
          !forceRefresh &&
          shopeeProduct &&
          shopeeProduct.realRateVerified &&
          incoming.itemId &&
          String(shopeeProduct.itemId) === String(incoming.itemId) &&
          !incoming.realRateVerified;

        shopeeProduct = preserveVerified
          ? {
              ...incoming,
              baseRate: shopeeProduct.baseRate,
              extraRate: shopeeProduct.extraRate,
              offerPrice: shopeeProduct.offerPrice,
              realRateVerified: true,
              realRateItemId: shopeeProduct.realRateItemId,
              categoryLabel: 'เรทจริง Social Media'
            }
          : incoming;
        renderShopeeTabData(shopeeProduct);
        await syncOrFetchRealSocialRateInSidePanel(shopeeProduct, forceRefresh);
        if (showToastOnDone) ns.showToast('↻ อัปเดตข้อมูลหน้าสินค้า Shopee แล้ว');
      }
      return;
    }
  } catch (_e) {
    // Fallback if content script in shopee.co.th tab was not reloaded after extension update
    if (tabObj && tabObj.url) {
      const parsed = ns.parseShopeeIds(tabObj.url);
      if (parsed.itemId) {
        if (!shopeeProduct || String(shopeeProduct.itemId) !== String(parsed.itemId)) {
          const rawTitle = (tabObj.title || 'Shopee Product').replace(/\| Shopee Thailand/i, '').trim();
          const catEst = ns.estimateCategoryCommission(rawTitle, true, 'auto');
          shopeeProduct = {
            title: rawTitle,
            price: shopeeProduct?.price || Number(document.getElementById('drb-sp-inp-price')?.value) || 0,
            capTHB: 250,
            whtRate: 3.0,
            baseRate: catEst.baseRate,
            extraRate: catEst.extraRate,
            categoryLabel: catEst.catLabel,
            shopId: parsed.shopId,
            itemId: parsed.itemId,
            cleanUrl: parsed.cleanUrl,
            imagesHD: [],
            variants: []
          };
        }
        renderShopeeTabData(shopeeProduct);
        await syncOrFetchRealSocialRateInSidePanel(shopeeProduct, forceRefresh);
        return;
      }
    }
    if (!shopeeProduct) {
      document.getElementById('drb-sp-title').textContent = 'ไม่พบข้อมูลสินค้า (กด F5 รีเฟรชหน้าเว็บ Shopee 1 ครั้ง)';
    }
  }
}

function applyRealOfferToShopeeProduct(targetProd, realOffer) {
  if (!targetProd || !realOffer) return;
  targetProd.baseRate = Number(realOffer.baseRate) || 0;
  targetProd.extraRate = Number(realOffer.extraRate) || 0;
  targetProd.offerPrice = Number(realOffer.offerPrice || realOffer.price) || 0;
  if (!targetProd.price || targetProd.price <= 0) {
    targetProd.price = targetProd.offerPrice;
  }
  targetProd.liveExtraRate = Number(realOffer.liveExtraRate) || 0;
  targetProd.liveBaseRate = Number(realOffer.liveBaseRate) || 0;
  targetProd.realRateVerified = true;
  targetProd.realRateItemId = String(targetProd.itemId || realOffer.itemId || '');
  targetProd.realRateLoading = false;
  targetProd.realRateError = '';
  targetProd.realRateSecurityCheck = false;
  targetProd.categoryLabel = 'เรทจริง Social Media';
}

let sidePanelFetchingItemId = '';
async function syncOrFetchRealSocialRateInSidePanel(p, forceRefresh = false) {
  if (!p || !p.itemId) return;
  const itemId = String(p.itemId).replace(/[^0-9]/g, '');
  if (!itemId) return;

  // 1. Instant 0ms sync if Tab 2 (affProduct) already has this exact itemId
  if (
    !forceRefresh &&
    affProduct &&
    String(affProduct.itemId) === itemId &&
    (Number(affProduct.baseRate) > 0 || Number(affProduct.extraRate) > 0)
  ) {
    applyRealOfferToShopeeProduct(p, affProduct);
    renderShopeeTabData(p);
    return;
  }

  // 2. Skip if already verified for this itemId and not forcing refresh
  if (!forceRefresh && p.realRateVerified && String(p.realRateItemId) === itemId) {
    renderShopeeTabData(p);
    return;
  }

  if (!forceRefresh && sidePanelFetchingItemId === itemId) {
    return;
  }

  sidePanelFetchingItemId = itemId;
  p.realRateLoading = true;
  p.realRateError = '';
  p.realRateSecurityCheck = false;
  renderShopeeRealRateBox(p);

  try {
    let res = await ns.sendMessage('GET_REAL_AFF_OFFER', {
      itemId,
      shopId: p.shopId,
      title: p.title,
      forceRefresh
    });

    // Automatic 1-shot retry if first background pass timed out while Shopee SPA was still mounting
    if (
      (!res || !res.ok || (!Number(res.data?.baseRate) && !Number(res.data?.extraRate))) &&
      !res?.securityCheck &&
      shopeeProduct &&
      String(shopeeProduct.itemId) === itemId
    ) {
      await new Promise((r) => setTimeout(r, 1100));
      res = await ns.sendMessage('GET_REAL_AFF_OFFER', {
        itemId,
        shopId: p.shopId,
        title: p.title,
        forceRefresh: true
      });
    }

    if (!shopeeProduct || String(shopeeProduct.itemId) !== itemId) return;

    if (res?.ok && res.data && (Number(res.data.baseRate) > 0 || Number(res.data.extraRate) > 0)) {
      applyRealOfferToShopeeProduct(shopeeProduct, res.data);
      renderShopeeTabData(shopeeProduct);
      if (forceRefresh) {
        ns.showToast(`✅ ดึงเรทจริง Social Media: Extra ${shopeeProduct.extraRate}% + Base ${shopeeProduct.baseRate}% สำเร็จ!`);
      }
    } else {
      shopeeProduct.realRateLoading = false;
      shopeeProduct.realRateSecurityCheck = Boolean(res?.securityCheck);
      shopeeProduct.realRateError = res?.error || 'ยังดึงเรทจริงจากหน้า AFF ไม่ได้';
      renderShopeeRealRateBox(shopeeProduct);
    }
  } catch (err) {
    if (shopeeProduct && String(shopeeProduct.itemId) === itemId) {
      shopeeProduct.realRateLoading = false;
      shopeeProduct.realRateError = err?.message || String(err);
      renderShopeeRealRateBox(shopeeProduct);
    }
  } finally {
    if (sidePanelFetchingItemId === itemId) {
      sidePanelFetchingItemId = '';
    }
  }
}

async function scrapeAffiliateTab(tabId, showToastOnDone) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'GET_AFFILIATE_OFFER' });
    if (response && response.ok && response.mode === 'offer' && response.data) {
      affProduct = response.data;
      renderAffiliateTabData(affProduct);
      if (affProduct.itemId && (Number(affProduct.baseRate) > 0 || Number(affProduct.extraRate) > 0)) {
        ns.sendMessage('CACHE_REAL_AFF_OFFER', affProduct).catch(() => {});
        chrome.storage.local.set({ activeAffOfferProduct: affProduct }).catch(() => {});
        if (shopeeProduct && String(shopeeProduct.itemId) === String(affProduct.itemId)) {
          applyRealOfferToShopeeProduct(shopeeProduct, affProduct);
          renderShopeeTabData(shopeeProduct);
        }
      }
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
    extraEl.textContent = p.realRateVerified
      ? `✅ EXTRACOMM จริง ${ex}% (Social)`
      : `✅ Extra ~${ex}%${catSuffix}`;
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
  const ratePrefix = shopeeProduct.realRateVerified ? 'เรทจริง Social' : 'เรทรวมประเมิน';
  document.getElementById('drb-sp-eff-rate').textContent = `${ratePrefix} ${comm.effectiveRate.toFixed(1)}%${comm.isCapped ? ' (ติด Cap)' : ' (หักภาษี 3%)'}`;

  const breakEvenBox = document.getElementById('drb-sp-breakeven-box');
  breakEvenBox.setAttribute('data-tier', comm.tier);
  document.getElementById('drb-sp-breakeven-text').textContent = comm.bannerText;

  document.getElementById('drb-sp-tbl-breakdown').textContent = `${ns.formatTHB(comm.baseComm)} + ${ns.formatTHB(comm.extraComm)}`;
  document.getElementById('drb-sp-tbl-100').textContent = `${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)`;
  renderShopeeRealRateBox(shopeeProduct);
  syncSubIdSkuField('sp', shopeeProduct);
}

function syncSubIdSkuField(prefix, prod) {
  const sub4El = document.getElementById(`drb-${prefix}-sub4`);
  if (sub4El && prod?.itemId) {
    const nextSku = `SP${String(prod.itemId).slice(-6)}`;
    if (!sub4El.value || /^SP\d{6}$/.test(sub4El.value)) {
      sub4El.value = nextSku;
    }
  }
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderShopeeRealRateBox(p) {
  const stEl = document.getElementById('drb-sp-real-status');
  const cmpEl = document.getElementById('drb-sp-real-compare');
  if (!stEl) return;

  if (!p || !p.itemId) {
    stEl.textContent = 'เปิดหน้าสินค้าเดี่ยวบน shopee.co.th เพื่อเช็กเรทจริงโซเชียลมีเดียอัตโนมัติ';
    if (cmpEl) cmpEl.style.display = 'none';
    return;
  }

  if (p.realRateSecurityCheck || p.realRateError) {
    const cleanId = String(p.itemId || '').replace(/[^0-9]/g, '');
    const affUrl = `https://affiliate.shopee.co.th/offer/product_offer/${cleanId}`;
    stEl.innerHTML = `<span style="color:#dc2626;font-weight:600;">⚠️ ${escHtml(p.realRateError || 'ดึงเรทจริงไม่สำเร็จ')}</span> · <a href="${affUrl}" target="_blank" rel="noopener" style="color:#0284c7;font-weight:700;">เปิดหน้า Affiliate ผ่านด่านตรวจ ↗</a>`;
    if (cmpEl) cmpEl.style.display = 'none';
    return;
  }

  if (p.realRateVerified) {
    const commSell = ns.calculateCommission({
      price: p.price,
      baseRate: p.baseRate,
      extraRate: p.extraRate,
      capTHB: p.capTHB || 250,
      whtRate: p.whtRate || 3.0,
      realDailyAdCostTHB: 107
    });
    stEl.innerHTML = `<span style="color:#16a34a;font-weight:700;">✅ เรทจริง Social Media:</span> EXTRACOMM <b>${p.extraRate}%</b> + ช้อปปี้ <b>${p.baseRate}%</b> = <b>${(Number(p.extraRate) + Number(p.baseRate)).toFixed(1)}%</b>`;
    if (cmpEl) {
      const offerBase = Number(p.offerPrice) || 0;
      if (offerBase > 0 && Math.abs(offerBase - Number(p.price || 0)) >= 1) {
        const commOffer = ns.calculateCommission({
          price: offerBase,
          baseRate: p.baseRate,
          extraRate: p.extraRate,
          capTHB: p.capTHB || 250,
          whtRate: p.whtRate || 3.0,
          realDailyAdCostTHB: 107
        });
        cmpEl.style.display = 'block';
        cmpEl.innerHTML =
          `• ฐานตั้งต้น AFF (<b>${ns.formatTHB(offerBase)}</b>): <b>${ns.formatTHB(commOffer.grossComm)}</b> (สุทธิ ${ns.formatTHB(commOffer.netComm)})<br>` +
          `• ฐานราคาหลังโค้ด (<b>${ns.formatTHB(p.price)}</b>): <b>${ns.formatTHB(commSell.grossComm)}</b> (สุทธิ ${ns.formatTHB(commSell.netComm)})`;
      } else {
        cmpEl.style.display = 'block';
        cmpEl.innerHTML = `• ก่อนภาษี <b>${ns.formatTHB(commSell.grossComm)}</b> (สุทธิหลัง WHT 3% = <b>${ns.formatTHB(commSell.netComm)}</b>)`;
      }
    }
    return;
  }

  stEl.textContent = p.realRateLoading
    ? '⏳ กำลังดึงเรทจริงโซเชียลมีเดียจากบัญชี affiliate.shopee.co.th...'
    : 'ℹ️ กำลังใช้ค่าประเมินตามหมวดหมู่ชั่วคราว (กด ↻ ดึงเรท เพื่อรีเช็ก)';
  if (cmpEl) cmpEl.style.display = 'none';
}

function bindShortLinkGenerator(prefix, getProd) {
  const btn = document.getElementById(`drb-${prefix}-btn-gen-shortlink`);
  const outEl = document.getElementById(`drb-${prefix}-shortlink-out`);
  if (!btn) return;

  if (outEl) {
    outEl.addEventListener('click', () => {
      const linkTxt = outEl.getAttribute('data-link');
      if (linkTxt) ns.copyText(linkTxt, `🔗 ก๊อปลิงก์ ${linkTxt} แล้ว!`);
    });
  }

  btn.addEventListener('click', async () => {
    const prod = getProd();
    const targetUrl =
      prod?.shopId && prod?.itemId
        ? `https://shopee.co.th/product/${prod.shopId}/${prod.itemId}`
        : prod?.cleanUrl || '';
    if (!targetUrl) {
      ns.showToast('ไม่พบลิงก์สินค้า กรุณาเปิดหน้าสินค้าก่อน');
      return;
    }

    const subIds = [1, 2, 3, 4, 5].map((i) => (document.getElementById(`drb-${prefix}-sub${i}`)?.value || '').trim());
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳...';
    try {
      const res = await ns.sendMessage('GENERATE_AFF_SHORTLINK', {
        originalLink: targetUrl,
        subIds
      });
      if (res?.ok && (res.shortLink || res.longLink)) {
        const finalLink = res.shortLink || res.longLink;
        prod.shortLink = finalLink;
        prod.subId1 = subIds[0];
        prod.subId2 = subIds[1];
        if (outEl) {
          outEl.style.display = 'block';
          outEl.setAttribute('data-link', finalLink);
          outEl.textContent = `✅ ${finalLink} (คลิกเพื่อก๊อปซ้ำ)`;
        }
        await ns.copyText(finalLink, `🔗 สร้าง & ก๊อปลิงก์ ${finalLink} เรียบร้อย!`);
      } else {
        const errMsg = res?.error || 'สร้างลิงก์ไม่สำเร็จ';
        if (outEl) {
          outEl.style.display = 'block';
          outEl.removeAttribute('data-link');
          outEl.innerHTML = `<span style="color:#dc2626;">❌ ${escHtml(errMsg)}</span>`;
        }
        ns.showToast(`❌ ${errMsg}`, 'error');
      }
    } catch (err) {
      ns.showToast(`❌ ${err?.message || String(err)}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  });
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
  syncSubIdSkuField('aff', affProduct);
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
    shortLink: prod.shortLink || '',
    subId1: prod.subId1 || '16NOV26FBRAD',
    subId2: prod.subId2 || '',
    shopId: prod.shopId || '',
    itemId: prod.itemId || '',
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
