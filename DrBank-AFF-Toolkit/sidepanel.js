/**
 * DrBank AFF Scout v2.12.0 — Clean Modern Side Panel Controller ("0.5-Second Glance")
 * Architecture:
 *  - Unified Hero Profit Card shared across Tab 1 (Shopee) & Tab 2 (AFF Offer)
 *  - Auto-fetches true Social Media channel rates from affiliate.shopee.co.th
 *  - Shared collapsible Sub_id1..5 link builder & Sticky Bottom Action Bar
 */

const ns = window.DrBankAFF;

let currentTabId = null;
let activePanelTab = 'shopee'; // 'shopee' | 'aff'

let shopeeProduct = null;
let affProduct = null;

let currentSettings = {
  theme: 'light',
  displayMode: 'sidepanel',
  webUiBaseUrl: 'https://aff.doctorbankonline.com'
};

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
  return el;
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
  return el;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getActiveProduct() {
  return activePanelTab === 'aff' ? affProduct : shopeeProduct;
}

function flashElement(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('sp-flash-anim');
  void el.offsetWidth;
  el.classList.add('sp-flash-anim');
}

document.addEventListener('DOMContentLoaded', async () => {
  setText('drb-sp-ver', `v${ns.getVersion()}`);

  // Load Settings, Cached AFF Offer & Saved Sub_ids
  const store = await chrome.storage.local.get(['settings', 'activeAffOfferProduct', 'savedSubIds']);
  currentSettings = { ...currentSettings, ...(store.settings || {}) };

  if (store.savedSubIds && typeof store.savedSubIds === 'object') {
    [1, 2, 3, 5].forEach((i) => {
      const inp = document.getElementById(`drb-sp-sub${i}`);
      if (inp && store.savedSubIds[`sub${i}`]) inp.value = store.savedSubIds[`sub${i}`];
    });
  }
  syncSubIdSummary();

  if (store.activeAffOfferProduct) {
    affProduct = store.activeAffOfferProduct;
    renderAffiliateTabData(affProduct);
  }

  const themeBtn = document.getElementById('drb-sp-theme-btn');
  const rootEl = document.getElementById('drb-sidepanel-root');
  ns.applyTheme(rootEl, currentSettings.theme, themeBtn);
  ns.applyTheme(document.body, currentSettings.theme, null);

  if (themeBtn) {
    themeBtn.addEventListener('click', async () => {
      currentSettings.theme = await ns.toggleTheme(rootEl, currentSettings.theme, themeBtn);
      ns.applyTheme(document.body, currentSettings.theme, null);
      await chrome.storage.local.set({ settings: currentSettings });
      if (currentTabId) {
        chrome.tabs.sendMessage(currentTabId, { action: 'SET_THEME', theme: currentSettings.theme }).catch(() => {});
      }
    });
  }

  // Manual Tab Switching
  document.getElementById('drb-tab-btn-shopee')?.addEventListener('click', () => switchPanelTab('shopee'));
  document.getElementById('drb-tab-btn-aff')?.addEventListener('click', () => switchPanelTab('aff'));
  document.getElementById('drb-tab-btn-spy')?.addEventListener('click', () => switchPanelTab('spy'));
  bindSpyCollector();

  // Switch to Floating HUD Button
  document.getElementById('drb-sp-btn-switch-hud')?.addEventListener('click', async () => {
    currentSettings.displayMode = 'float';
    await chrome.storage.local.set({ settings: currentSettings });
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, { action: 'SET_DISPLAY_MODE', mode: 'float' }).catch(() => {});
    }
    ns.showToast('สลับเป็นโหมดกล่องลอย (Floating HUD) บนหน้าเว็บแล้ว');
  });

  // Top Rescan Button
  document.getElementById('drb-sp-rescan-btn')?.addEventListener('click', () => {
    queryActiveTabAndScrape(true);
  });

  // Refresh Real Social Media Rate Button inside Hero Strip
  document.getElementById('drb-sp-btn-refresh-realrate')?.addEventListener('click', async () => {
    ns.showToast('⏳ กำลังดึงเรทจริง Social Media จากบัญชี Affiliate...');
    if (currentTabId) {
      await scrapeShopeeTab(currentTabId, false, true);
    }
    if (shopeeProduct && shopeeProduct.itemId) {
      await syncOrFetchRealSocialRateInSidePanel(shopeeProduct, true);
    }
  });

  // Simulator Inputs: Tab 1 (Shopee)
  ['drb-sp-inp-price', 'drb-sp-inp-cap', 'drb-sp-inp-base-rate', 'drb-sp-inp-extra-rate'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      if (!shopeeProduct) shopeeProduct = {};
      shopeeProduct.price = Number(document.getElementById('drb-sp-inp-price')?.value) || 0;
      shopeeProduct.capTHB = Number(document.getElementById('drb-sp-inp-cap')?.value) || 250;
      shopeeProduct.baseRate = Number(document.getElementById('drb-sp-inp-base-rate')?.value) || 0;
      shopeeProduct.extraRate = Number(document.getElementById('drb-sp-inp-extra-rate')?.value) || 0;
      recalculateShopeeTab(true);
    });
  });

  // Reset Simulator back to verified/scraped values
  document.getElementById('drb-sp-btn-reset-sim')?.addEventListener('click', async () => {
    if (currentTabId) {
      await scrapeShopeeTab(currentTabId, false, true);
      ns.showToast('↺ คืนค่าตัวเลขจริงจากหน้าเว็บแล้ว');
    }
  });

  // Simulator Inputs: Tab 2 (AFF Offer)
  ['drb-aff-inp-price', 'drb-aff-inp-cap', 'drb-aff-inp-base-rate', 'drb-aff-inp-extra-rate'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      if (!affProduct) affProduct = {};
      affProduct.price = Number(document.getElementById('drb-aff-inp-price')?.value) || 0;
      affProduct.capTHB = Number(document.getElementById('drb-aff-inp-cap')?.value) || 250;
      affProduct.baseRate = Number(document.getElementById('drb-aff-inp-base-rate')?.value) || 0;
      affProduct.extraRate = Number(document.getElementById('drb-aff-inp-extra-rate')?.value) || 0;
      recalculateAffTab(true);
    });
  });

  // Shared Sub_id Toggle & Persistence
  const toggleSubBtn = document.getElementById('sp-btn-toggle-subid');
  const subEditor = document.getElementById('sp-subid-editor');
  if (toggleSubBtn && subEditor) {
    toggleSubBtn.addEventListener('click', () => {
      const nextHidden = !subEditor.hidden;
      subEditor.hidden = nextHidden;
      toggleSubBtn.textContent = nextHidden ? '✎ ตั้งค่า Sub_id' : '✓ พับเก็บ';
    });
  }

  [1, 2, 3, 4, 5].forEach((i) => {
    document.getElementById(`drb-sp-sub${i}`)?.addEventListener('input', () => {
      syncSubIdSummary();
      const saved = {
        sub1: (document.getElementById('drb-sp-sub1')?.value || '').trim(),
        sub2: (document.getElementById('drb-sp-sub2')?.value || '').trim(),
        sub3: (document.getElementById('drb-sp-sub3')?.value || '').trim(),
        sub5: (document.getElementById('drb-sp-sub5')?.value || '').trim()
      };
      chrome.storage.local.set({ savedSubIds: saved }).catch(() => {});
    });
  });

  // Shared Sticky Action Bar (Primary: Push to Web UI, Secondary: Generate Shortlink)
  document.getElementById('drb-sp-btn-push-webui')?.addEventListener('click', async () => {
    const label = activePanelTab === 'aff' ? 'Affiliate Offer' : 'Shopee';
    await pushProductToWebUI(getActiveProduct(), label);
  });

  bindShortLinkGenerator();

  // Secondary Tools Grid & Hero Quick-Jump Buttons (Smart Tab Toggle: switch if open, create if not)
  const openAffOfferPage = async (prod) => {
    const itemId = String(prod?.itemId || affProduct?.itemId || shopeeProduct?.itemId || '').replace(/[^0-9]/g, '');
    const targetUrl = itemId
      ? `https://affiliate.shopee.co.th/offer/product_offer/${itemId}`
      : `https://affiliate.shopee.co.th/offer/product_offer`;
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const existing = tabs.find(
        (t) => t.url && t.url.includes('affiliate.shopee.co.th') && (itemId ? t.url.includes(itemId) : true)
      );
      if (existing?.id) {
        await chrome.tabs.update(existing.id, { active: true });
        return;
      }
    } catch (_e) {}
    chrome.tabs.create({ url: targetUrl });
  };

  document.getElementById('drb-sp-btn-check-aff')?.addEventListener('click', () => openAffOfferPage(getActiveProduct()));
  document.getElementById('drb-sp-btn-hero-aff')?.addEventListener('click', () => openAffOfferPage(shopeeProduct || getActiveProduct()));

  document.getElementById('drb-aff-btn-hero-shopee')?.addEventListener('click', async () => {
    const prod = affProduct || getActiveProduct();
    const itemId = String(prod?.itemId || shopeeProduct?.itemId || '').replace(/[^0-9]/g, '');
    const shopId = String(
      prod?.shopId || (shopeeProduct && String(shopeeProduct.itemId) === itemId ? shopeeProduct.shopId : '') || ''
    ).replace(/[^0-9]/g, '');

    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const existing = tabs.find(
        (t) =>
          t.url &&
          t.url.includes('shopee.co.th') &&
          !t.url.includes('affiliate.shopee.co.th') &&
          (itemId ? t.url.includes(itemId) : true)
      );
      if (existing?.id) {
        await chrome.tabs.update(existing.id, { active: true });
        return;
      }
    } catch (_e) {}

    const targetUrl =
      shopId && itemId
        ? `https://shopee.co.th/product/${shopId}/${itemId}`
        : prod?.cleanUrl && !prod.cleanUrl.includes('affiliate.shopee.co.th')
        ? prod.cleanUrl
        : shopeeProduct?.cleanUrl && !shopeeProduct.cleanUrl.includes('affiliate.shopee.co.th')
        ? shopeeProduct.cleanUrl
        : '';
    if (targetUrl) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      ns.showToast('กดลิงก์ "ดูสินค้า" บนหน้าเว็บเพื่อเปิดหน้า Shopee');
    }
  });

  document.getElementById('drb-sp-btn-clean-url')?.addEventListener('click', () => {
    const prod = getActiveProduct();
    if (prod && prod.cleanUrl) {
      ns.copyText(prod.cleanUrl, '✂️ ก๊อปลิงก์คลีนเรียบร้อย');
    } else {
      ns.showToast('ไม่พบลิงก์สินค้า');
    }
  });

  document.getElementById('drb-sp-btn-open-webui')?.addEventListener('click', openWebUI);

  document.getElementById('drb-aff-btn-pool-bridge')?.addEventListener('click', async () => {
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

  document.getElementById('drb-aff-btn-open-v1')?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('affiliate.shopee.co.th')) {
      chrome.tabs.sendMessage(tab.id, { action: 'OPEN_V1_SCANNER' }).catch(() => {
        chrome.tabs.update(tab.id, { url: 'https://affiliate.shopee.co.th/offer/product_offer#drb-action=v1_scanner' });
      });
    } else {
      chrome.tabs.create({ url: 'https://affiliate.shopee.co.th/offer/product_offer#drb-action=v1_scanner' });
    }
  });

  document.getElementById('drb-aff-btn-sync-report')?.addEventListener('click', async () => {
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

  // Listen to browser tab switches & URL changes for Auto-Detect
  chrome.tabs.onActivated.addListener(() => {
    queryActiveTabAndScrape(false);
    if (activePanelTab === 'spy') refreshSpyAffBridgeStatus();
  });
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === currentTabId && (changeInfo.url || changeInfo.status === 'complete')) {
      queryActiveTabAndScrape(false);
    }
    if (
      activePanelTab === 'spy' &&
      (changeInfo.status === 'complete' ||
        typeof changeInfo.discarded === 'boolean' ||
        (tab?.url || '').includes('affiliate.shopee.co.th'))
    ) {
      refreshSpyAffBridgeStatus();
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

  queryActiveTabAndScrape(false);
  refreshSpyAffBridgeStatus();
});

function switchPanelTab(tabName) {
  activePanelTab = tabName === 'aff' ? 'aff' : tabName === 'spy' ? 'spy' : 'shopee';

  const btnShopee = document.getElementById('drb-tab-btn-shopee');
  const btnAff = document.getElementById('drb-tab-btn-aff');
  const btnSpy = document.getElementById('drb-tab-btn-spy');
  const paneShopee = document.getElementById('drb-pane-shopee');
  const paneAff = document.getElementById('drb-pane-aff');
  const paneSpy = document.getElementById('drb-pane-spy');
  const badge = document.getElementById('drb-sp-mode-badge');

  btnShopee?.classList.toggle('active', activePanelTab === 'shopee');
  btnAff?.classList.toggle('active', activePanelTab === 'aff');
  btnSpy?.classList.toggle('active', activePanelTab === 'spy');
  paneShopee?.classList.toggle('active', activePanelTab === 'shopee');
  paneAff?.classList.toggle('active', activePanelTab === 'aff');
  paneSpy?.classList.toggle('active', activePanelTab === 'spy');

  if (activePanelTab === 'aff') {
    if (badge) {
      badge.textContent = 'AFF Offer';
      badge.style.background = 'rgba(2, 132, 199, 0.14)';
      badge.style.color = '#0284c7';
      badge.style.borderColor = 'rgba(2, 132, 199, 0.32)';
    }
    if (affProduct) syncSubIdSkuField(affProduct);
  } else if (activePanelTab === 'spy') {
    if (badge) {
      badge.textContent = 'SPY REEL';
      badge.style.background = 'rgba(124, 58, 237, 0.14)';
      badge.style.color = '#7c3aed';
      badge.style.borderColor = 'rgba(124, 58, 237, 0.32)';
    }
    refreshSpyAffBridgeStatus();
  } else {
    if (badge) {
      badge.textContent = 'Shopee';
      badge.style.background = 'rgba(22, 163, 74, 0.12)';
      badge.style.color = '#16a34a';
      badge.style.borderColor = 'rgba(22, 163, 74, 0.3)';
    }
    if (shopeeProduct) syncSubIdSkuField(shopeeProduct);
  }
}

async function queryActiveTabAndScrape(showToastOnDone = false) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  currentTabId = tab.id;

  const url = tab.url || '';
  const isAffiliateUrl = url.includes('affiliate.shopee.co.th');
  const isShopeeMallUrl = url.includes('shopee.co.th') && !isAffiliateUrl;
  const isFacebookReelUrl = /facebook\.com\/(?:reel|share\/r|watch)|fb\.watch/i.test(url);

  if (isFacebookReelUrl) {
    switchPanelTab('spy');
    if (showToastOnDone) {
      grabActiveFacebookReelTab(true);
    }
    return;
  }

  if (isAffiliateUrl) {
    switchPanelTab('aff');
    const urlItemMatch = url.match(/product_offer\/(\d+)/);
    const urlItemId = urlItemMatch ? urlItemMatch[1] : '';

    // Instant 0ms Pre-fill if shopeeProduct already has verified rates for this exact itemId
    if (
      urlItemId &&
      (!affProduct || String(affProduct.itemId) !== urlItemId || (!affProduct.baseRate && !affProduct.extraRate))
    ) {
      if (
        shopeeProduct &&
        String(shopeeProduct.itemId) === urlItemId &&
        (Number(shopeeProduct.baseRate) > 0 || Number(shopeeProduct.extraRate) > 0)
      ) {
        affProduct = {
          ...shopeeProduct,
          price: Number(shopeeProduct.offerPrice || shopeeProduct.price) || 0,
          realRateVerified: true
        };
        renderAffiliateTabData(affProduct);
      }
    }

    const ready = await scrapeAffiliateTab(tab.id, showToastOnDone);
    if (!ready && urlItemId) {
      // Poll until Shopee Affiliate React table mounts into DOM (up to ~7 seconds)
      for (let attempt = 0; attempt < 14; attempt++) {
        await new Promise((r) => setTimeout(r, 500));
        if (currentTabId !== tab.id) break;
        const okNow = await scrapeAffiliateTab(tab.id, false);
        if (okNow) {
          flashElement('drb-aff-net-comm');
          break;
        }
      }
    }
    return;
  }

  if (isShopeeMallUrl) {
    switchPanelTab('shopee');
    await scrapeShopeeTab(tab.id, showToastOnDone);
    setTimeout(() => scrapeShopeeTab(tab.id, false), 750);
    setTimeout(() => scrapeShopeeTab(tab.id, false), 1650);
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
          if (response.radarEnabled === false) {
            setText(
              'drb-sp-title',
              '⚪ เรดาร์หน้ารวมสินค้าปิดอยู่ (โหมดปลอดภัย) — กดปุ่มเปิดสแกนบนหน้าเว็บ หรือกด ↻ ด้านบนเมื่อต้องการใช้งาน'
            );
          } else {
            setText(
              'drb-sp-title',
              `⚡ หน้าค้นหา Shopee พบ ${gc.total || 0} ชิ้น (น่าลุย ${gc.win || 0}) — คลิกป้ายบนการ์ดเพื่อดึงเข้า Side Panel`
            );
          }
        }
        if (showToastOnDone) ns.showToast('↻ เปิดเรดาร์และสแกนป้ายประเมินค่าคอมครบทุกใบแล้ว!');
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
            whtRate: 0.0,
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
      setText('drb-sp-title', 'ไม่พบข้อมูลสินค้า (กด F5 รีเฟรชหน้าเว็บ Shopee 1 ครั้ง)');
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
  renderShopeeSourcePill(p);

  try {
    let res = await ns.sendMessage('GET_REAL_AFF_OFFER', {
      itemId,
      shopId: p.shopId,
      title: p.title,
      forceRefresh
    });

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
      flashElement('drb-sp-net-comm');
      if (forceRefresh) {
        ns.showToast(`✅ เรทจริง Social Media: Extra ${shopeeProduct.extraRate}% + Base ${shopeeProduct.baseRate}%`);
      }
    } else {
      shopeeProduct.realRateLoading = false;
      shopeeProduct.realRateSecurityCheck = Boolean(res?.securityCheck);
      shopeeProduct.realRateError = res?.error || 'ยังดึงเรทจริงไม่สำเร็จ';
      renderShopeeSourcePill(shopeeProduct);
    }
  } catch (err) {
    if (shopeeProduct && String(shopeeProduct.itemId) === itemId) {
      shopeeProduct.realRateLoading = false;
      shopeeProduct.realRateError = err?.message || String(err);
      renderShopeeSourcePill(shopeeProduct);
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
      const incoming = response.data;
      const hasValidRates =
        (Number(incoming.baseRate) > 0 || Number(incoming.extraRate) > 0) && Number(incoming.price) > 0;
      const badgeEl = document.getElementById('drb-aff-source-badge');

      if (!hasValidRates) {
        // React table hasn't mounted yet — DO NOT overwrite existing valid rates with 0!
        if (!affProduct || (incoming.itemId && String(affProduct.itemId) !== String(incoming.itemId))) {
          affProduct = incoming;
          renderAffiliateTabData(affProduct);
          setText('drb-aff-breakeven-text', '⏳ กำลังโหลดตารางค่าคอมจาก Shopee Affiliate...');
        }
        if (badgeEl) {
          badgeEl.classList.remove('is-verified');
          badgeEl.textContent = '⏳ รอตาราง...';
        }
        return false;
      }

      affProduct = incoming;
      if (badgeEl) {
        badgeEl.classList.add('is-verified');
        badgeEl.textContent = '✓ ตาราง AFF';
      }
      renderAffiliateTabData(affProduct);
      ns.sendMessage('CACHE_REAL_AFF_OFFER', affProduct).catch(() => {});
      chrome.storage.local.set({ activeAffOfferProduct: affProduct }).catch(() => {});
      if (shopeeProduct && String(shopeeProduct.itemId) === String(affProduct.itemId)) {
        applyRealOfferToShopeeProduct(shopeeProduct, affProduct);
        renderShopeeTabData(shopeeProduct);
      }
      if (showToastOnDone) ns.showToast('↻ ดึงเรทจริงจากตารางข้อเสนอ Affiliate แล้ว!');
      return true;
    } else if (response && response.ok && response.mode === 'grid') {
      if (response.data && response.data.title) {
        affProduct = response.data;
        renderAffiliateTabData(affProduct);
      } else if (!affProduct) {
        const gc = response.gridCounts || { total: 0, win: 0 };
        setText(
          'drb-aff-title',
          `⚡ สแกนการ์ดแล้ว ${gc.total || 0} ชิ้น (น่าลุย ${gc.win || 0}) — คลิกป้ายบนการ์ดเพื่อดึงเข้า Side Panel`
        );
      }
      if (showToastOnDone) ns.showToast('↻ สแกนป้ายไฟจราจรบนการ์ดสินค้าครบทุกใบแล้ว!');
      return true;
    } else if (response && response.ok && response.mode === 'report') {
      setText('drb-aff-title', 'หน้า Conversion Report — เปิด 🛠 เครื่องมือ แล้วกด [📥 ดูด Report]');
      return true;
    }
  } catch (_e) {
    if (!affProduct) {
      setText('drb-aff-title', 'กรุณากด F5 รีเฟรชหน้า affiliate.shopee.co.th 1 ครั้งเพื่อเริ่มดึงตารางข้อเสนอ');
    }
  }
  return false;
}

// ============================================================================
// SHARED HERO PROFIT CARD RENDERER (0.5-Second Glance)
// ============================================================================
function renderHero(prefix, prod, comm, animateFlash = false) {
  const cardEl = document.getElementById(`drb-${prefix}-comm-card`);
  const verdictEl = document.getElementById(`drb-${prefix}-breakeven-box`);
  const sigBadgeEl = document.getElementById(`drb-${prefix}-signal-badge`);
  if (cardEl) cardEl.setAttribute('data-tier', comm.tier);
  if (verdictEl) verdictEl.setAttribute('data-tier', comm.tier);
  if (sigBadgeEl) sigBadgeEl.setAttribute('data-tier', comm.tier);

  setText(`drb-${prefix}-net-comm`, ns.formatTHB(comm.netComm));
  if (animateFlash) flashElement(`drb-${prefix}-net-comm`);

  const capText = comm.isCapped ? ' · Base ติด Cap 250฿' : '';
  setText(`drb-${prefix}-gross-sub`, `Extra ${ns.formatTHB(comm.extraComm)} + Base ${ns.formatTHB(comm.baseComm)}${capText}`);

  const baseR = Number(prod.baseRate) || 0;
  const extraR = Number(prod.extraRate) || 0;
  const totalPct = +(baseR + extraR).toFixed(1);
  setText(`drb-${prefix}-total-rate`, `${totalPct}%`);

  // Render Full-Width High-Contrast Action Signal Banner at the top of the Hero Card
  let sigTitle = '⚠️ ลงเพจได้ อย่ายิงแอด';
  let sigSub = `แอดต้อง ${comm.breakEvenOrders} ออเดอร์`;
  if (comm.tier === 'god') {
    sigTitle = '🔥 ลุยแอดด่วน!';
    sigSub = '1 ออเดอร์กำไรทันที';
  } else if (comm.tier === 'pass') {
    sigTitle = '✅ ยิงแอดคุ้ม!';
    sigSub = `ขาย ${comm.breakEvenOrders} ออเดอร์คืนทุน`;
  } else if (comm.tier === 'warning') {
    sigTitle = '⚠️ ลงเพจได้ อย่ายิงแอด';
    sigSub = `แอดต้อง ${comm.breakEvenOrders} ออเดอร์`;
  } else {
    sigTitle = '⛔ ข้าม! ไม่คุ้ม';
    sigSub = extraR <= 0 ? 'ไร้ EXTRACOMM' : `ต้องขาย ${comm.breakEvenOrders} ออเดอร์`;
  }
  setText(`drb-${prefix}-signal-title`, sigTitle);
  setText(`drb-${prefix}-signal-sub`, sigSub);

  const gross = comm.grossComm > 0 ? comm.grossComm : 1;
  const extraPctWidth = comm.grossComm > 0 ? Math.round((comm.extraComm / gross) * 100) : extraR > 0 ? 75 : 0;
  const basePctWidth = comm.grossComm > 0 ? 100 - extraPctWidth : baseR > 0 ? 100 : 0;

  const barExtra = document.getElementById(`drb-${prefix}-bar-extra`);
  const barBase = document.getElementById(`drb-${prefix}-bar-base`);
  if (barExtra) barExtra.style.width = `${extraPctWidth}%`;
  if (barBase) {
    barBase.style.width = `${basePctWidth}%`;
    barBase.classList.toggle('is-capped', Boolean(comm.isCapped));
  }

  setText(`drb-${prefix}-extra-pct`, `${extraR}%`);
  setText(`drb-${prefix}-leg-extra`, ns.formatTHB(comm.extraComm));
  setText(`drb-${prefix}-base-pct`, `${baseR}%`);
  setText(`drb-${prefix}-leg-base`, `${ns.formatTHB(comm.baseComm)}${comm.isCapped ? ' (Cap)' : ''}`);
  setText(`drb-${prefix}-price`, ns.formatTHB(prod.price));

  setText(
    `drb-${prefix}-breakeven-text`,
    `ทุนแอด 100฿: คืนทุนที่ ${comm.breakEvenUnits} ชิ้น (${comm.breakEvenOrders} ออเดอร์)`
  );
}

// ============================================================================
// RENDER TAB 1: 🛒 หน้าสินค้า Shopee (shopee.co.th)
// ============================================================================
function renderShopeeTabData(p) {
  const titleEl = document.getElementById('drb-sp-title');
  if (titleEl) {
    titleEl.textContent = p.title || 'Shopee Product';
    titleEl.title = p.title || '';
  }

  setText('drb-sp-spec-body', p.specText || 'ไม่มีข้อมูลสเปกเพิ่มเติม');
  setText('drb-sp-ids', `Shop: ${p.shopId || '-'} | Item: ${p.itemId || '-'} | ${(p.imagesHD || []).length} รูป HD`);

  const priceInp = document.getElementById('drb-sp-inp-price');
  if (priceInp) priceInp.value = p.price || 0;
  const baseInp = document.getElementById('drb-sp-inp-base-rate');
  if (baseInp && p.baseRate !== undefined) baseInp.value = p.baseRate;
  const extraInp = document.getElementById('drb-sp-inp-extra-rate');
  if (extraInp && p.extraRate !== undefined) extraInp.value = p.extraRate;

  // Compact Meta Line (Sold · Origin/Rating · Extra Pass/Fail)
  const sc = p.soldCount || 0;
  const sLabel = (p.soldText || sc.toLocaleString()).slice(0, 14);
  const soldEl = setText(
    'drb-sp-meta-sold',
    sc >= 1000 ? `🔥 ขาย ${sLabel}` : sc >= 300 ? `✓ ขาย ${sLabel}` : sc > 0 ? `⚠️ ขายต่ำ ${sLabel}` : `⚠️ ยอดขาย <300`
  );
  if (soldEl) soldEl.className = sc >= 300 ? 'sp-meta-ok' : 'sp-meta-bad';

  const r = Number(p.rating) || 4.9;
  const shipLoc = p.shipFrom || (p.isOverseas ? 'ส่งจากจีน' : 'ส่งในไทย');
  const originEl = setText('drb-sp-meta-origin', `${p.isOverseas ? '⚠️ ' : '⭐ '}${r.toFixed(1)} · ${shipLoc}`);
  if (originEl) originEl.className = p.isOverseas ? 'sp-meta-warn' : '';

  const ex = Number(p.extraRate) || 0;
  const extraMetaEl = setText('drb-sp-meta-extra', ex > 0 ? '✓ มี Extra' : '✕ ไร้ Extra');
  if (extraMetaEl) extraMetaEl.className = ex > 0 ? 'sp-meta-ok' : 'sp-meta-bad';

  // Variants SKU Strip (hidden when 0 items)
  const varsSection = document.getElementById('drb-sp-variants-section');
  const listEl = document.getElementById('drb-sp-variants-list');
  const vars = Array.isArray(p.variants) ? p.variants : [];
  if (varsSection && listEl) {
    if (vars.length === 0) {
      varsSection.hidden = true;
      listEl.innerHTML = '';
    } else {
      varsSection.hidden = false;
      setText('drb-sp-variants-count', `${vars.length} SKU:`);
      listEl.innerHTML = '';
      vars.forEach((vName) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'drb-aff-variant-pill';
        pill.textContent = vName;
        pill.addEventListener('click', () => {
          listEl.querySelectorAll('.drb-aff-variant-pill').forEach((x) => x.classList.remove('active'));
          pill.classList.add('active');
          if (currentTabId) {
            chrome.tabs.sendMessage(currentTabId, { action: 'SELECT_VARIANT', variantName: vName }).then((res) => {
              if (res && res.data) {
                const keepRate = shopeeProduct?.realRateVerified
                  ? {
                      baseRate: shopeeProduct.baseRate,
                      extraRate: shopeeProduct.extraRate,
                      offerPrice: shopeeProduct.offerPrice,
                      realRateVerified: true,
                      realRateItemId: shopeeProduct.realRateItemId
                    }
                  : {};
                shopeeProduct = { ...res.data, ...keepRate };
                renderShopeeTabData(shopeeProduct);
                flashElement('drb-sp-net-comm');
              }
            }).catch(() => {});
          }
        });
        listEl.appendChild(pill);
      });
    }
  }

  recalculateShopeeTab(false);
}

function recalculateShopeeTab(animateFlash = false) {
  if (!shopeeProduct) return;
  const comm = ns.calculateCommission(shopeeProduct);
  renderHero('sp', shopeeProduct, comm, animateFlash);
  renderShopeePriceCompare(shopeeProduct);
  renderShopeeSourcePill(shopeeProduct);
  syncSubIdSkuField(shopeeProduct);
}

function renderShopeePriceCompare(p) {
  const cmpEl = document.getElementById('drb-sp-real-compare');
  if (!cmpEl) return;
  const offerBase = Number(p?.offerPrice) || 0;
  const sellPrice = Number(p?.price) || 0;
  if (p?.realRateVerified && offerBase > 0 && sellPrice > 0 && Math.abs(offerBase - sellPrice) >= 1) {
    const diff = sellPrice - offerBase;
    const diffStr = diff < 0 ? `−${ns.formatTHB(Math.abs(diff), 0)}` : `+${ns.formatTHB(diff, 0)}`;
    cmpEl.hidden = false;
    cmpEl.innerHTML = `ฐาน AFF ${ns.formatTHB(offerBase, 0)} → <b>${diffStr}</b> หลังโค้ด`;
  } else {
    cmpEl.hidden = true;
    cmpEl.textContent = '';
  }
}

function renderShopeeSourcePill(p) {
  const pill = document.getElementById('drb-sp-real-status');
  if (!pill) return;

  pill.classList.remove('is-verified', 'is-error');
  if (!p || !p.itemId) {
    pill.textContent = '≈ ประเมิน';
    pill.title = 'เปิดหน้าสินค้าเดี่ยวเพื่อดึงเรทจริง';
    return;
  }
  if (p.realRateSecurityCheck || p.realRateError) {
    const cleanId = String(p.itemId || '').replace(/[^0-9]/g, '');
    const affUrl = `https://affiliate.shopee.co.th/offer/product_offer/${cleanId}`;
    pill.classList.add('is-error');
    pill.innerHTML = `<a href="${affUrl}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">⚠️ ผ่านด่าน ↗</a>`;
    pill.title = p.realRateError || 'Shopee ขอตรวจสอบความปลอดภัย';
    return;
  }
  if (p.realRateVerified) {
    pill.classList.add('is-verified');
    pill.textContent = '✓ เรทจริง';
    pill.title = 'ดึงตรงจากตารางโซเชียลมีเดียใน affiliate.shopee.co.th';
    return;
  }
  if (p.realRateLoading) {
    pill.textContent = '⏳ ดึงเรท...';
    pill.title = 'กำลังดึงเรทจริง Social Media จากบัญชี Affiliate';
    return;
  }
  pill.textContent = '≈ ประเมิน';
  pill.title = 'ค่าประเมินตามหมวดหมู่ (กด ↻ เพื่อดึงเรทจริง)';
}

// ============================================================================
// RENDER TAB 2: 📊 หน้าข้อเสนอ Affiliate (affiliate.shopee.co.th)
// ============================================================================
function renderAffiliateTabData(p) {
  const titleEl = document.getElementById('drb-aff-title');
  if (titleEl) {
    titleEl.textContent = p.title || 'Shopee Affiliate Offer';
    titleEl.title = p.title || '';
  }

  const priceInp = document.getElementById('drb-aff-inp-price');
  if (priceInp) priceInp.value = p.price || 0;
  const baseInp = document.getElementById('drb-aff-inp-base-rate');
  if (baseInp) baseInp.value = p.baseRate ?? 2.0;
  const extraInp = document.getElementById('drb-aff-inp-extra-rate');
  if (extraInp) extraInp.value = p.extraRate ?? 0.0;

  setText('drb-aff-ids', `ID: ${p.itemId || '-'} (${(p.imagesHD || []).length} รูป)`);

  const sc = p.soldCount || 0;
  const sLabel = (p.soldText || sc.toLocaleString()).slice(0, 14);
  const soldEl = setText('drb-aff-meta-sold', sc >= 1000 ? `🔥 ขาย ${sLabel}` : sc >= 300 ? `✓ ขาย ${sLabel}` : `⚠️ ยอดขาย ${sLabel}`);
  if (soldEl) soldEl.className = sc >= 300 ? 'sp-meta-ok' : 'sp-meta-bad';

  const r = Number(p.rating) || 4.9;
  setText('drb-aff-meta-rating', `⭐ ${r.toFixed(1)}`);

  recalculateAffTab(false);
}

function recalculateAffTab(animateFlash = false) {
  if (!affProduct) return;
  const comm = ns.calculateCommission(affProduct);
  renderHero('aff', affProduct, comm, animateFlash);
  if (activePanelTab === 'aff') syncSubIdSkuField(affProduct);
}

// ============================================================================
// SHARED SUB_ID & SHORTLINK GENERATOR
// ============================================================================
function syncSubIdSkuField(prod) {
  const sub4El = document.getElementById('drb-sp-sub4');
  if (sub4El && prod?.itemId) {
    const nextSku = `SP${String(prod.itemId).slice(-6)}`;
    if (!sub4El.value || /^SP\d{6}$/.test(sub4El.value)) {
      sub4El.value = nextSku;
    }
  }
  syncSubIdSummary();
}

function syncSubIdSummary() {
  const s1 = (document.getElementById('drb-sp-sub1')?.value || '').trim();
  const s2 = (document.getElementById('drb-sp-sub2')?.value || '').trim();
  const s4 = (document.getElementById('drb-sp-sub4')?.value || '').trim();
  const s5 = (document.getElementById('drb-sp-sub5')?.value || '').trim();
  const parts = [s1, s2, s4, s5].filter(Boolean);
  setText('sp-subid-summary', parts.join(' · ') || 'ตั้งค่า Sub_id1–5');
}

function bindShortLinkGenerator() {
  const btn = document.getElementById('drb-sp-btn-gen-shortlink');
  const outEl = document.getElementById('drb-sp-shortlink-out');
  if (!btn) return;

  if (outEl) {
    outEl.addEventListener('click', () => {
      const linkTxt = outEl.getAttribute('data-link');
      if (linkTxt) ns.copyText(linkTxt, `🔗 ก๊อปลิงก์ ${linkTxt} แล้ว!`);
    });
  }

  btn.addEventListener('click', async () => {
    const prod = getActiveProduct();
    const targetUrl =
      prod?.shopId && prod?.itemId
        ? `https://shopee.co.th/product/${prod.shopId}/${prod.itemId}`
        : prod?.cleanUrl || '';
    if (!targetUrl) {
      ns.showToast('ไม่พบลิงก์สินค้า กรุณาเปิดหน้าสินค้าก่อน');
      return;
    }

    const subIds = [1, 2, 3, 4, 5].map((i) => (document.getElementById(`drb-sp-sub${i}`)?.value || '').trim());
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
          outEl.hidden = false;
          outEl.setAttribute('data-link', finalLink);
          outEl.textContent = `✅ ${finalLink} (คลิกก๊อปซ้ำ)`;
        }
        await ns.copyText(finalLink, `🔗 สร้าง & ก๊อปลิงก์ ${finalLink} เรียบร้อย!`);
      } else {
        const errMsg = res?.error || 'สร้างลิงก์ไม่สำเร็จ';
        if (outEl) {
          outEl.hidden = false;
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
    realDailyAdCostTHB: 100,
    breakEvenUnits: comm.breakEvenUnits,
    breakEvenOrders: comm.breakEvenOrders,
    adViabilityTier: comm.tier,
    tierEmoji: comm.tierEmoji,
    cleanUrl: prod.cleanUrl,
    shortLink: prod.shortLink || '',
    subId1: prod.subId1 || (document.getElementById('drb-sp-sub1')?.value || '16NOV26FBRAD').trim(),
    subId2: prod.subId2 || (document.getElementById('drb-sp-sub2')?.value || '').trim(),
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
  const baseUrl = currentSettings.webUiBaseUrl || 'https://aff.doctorbankonline.com';
  window.open(baseUrl, '_blank', 'noopener');
}

// ============================================================================
// PANE 3: 🕵️ SPY REEL COLLECTOR (FB Reels -> Exther Gate -> Spy Pool)
// ============================================================================
const spyTabMetaByUrl = new Map();
let spyCollectRunning = false;
let spyBatchRetryRunning = false;
let lastSpyEnrichedItems = [];
const spyRerunningIndices = new Set();

function normalizeReelKey(rawUrl) {
  const s = String(rawUrl || '').trim();
  const m = s.match(/\/(?:reel|r|videos)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : s;
}

function parseSpyTextareaReels() {
  const txt = document.getElementById('drb-spy-urls-input')?.value || '';
  const lines = txt
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out = [];
  const seenKeys = new Set();
  for (const line of lines) {
    const fbMatch = line.match(/https?:\/\/(?:www\.|m\.|web\.)?(?:facebook\.com\/[^\s|,;]+|fb\.watch\/[^\s|,;]+)/i);
    const shMatch = line.match(/https?:\/\/(?:(?:s|th|shp)\.)?shopee\.co\.th\/[^\s|,;]+|https?:\/\/shp\.ee\/[^\s|,;]+/i);
    const reelUrl = fbMatch ? fbMatch[0].replace(/[),.]+$/, '') : /^https?:\/\//i.test(line) ? line.split(/[\s|,;]+/)[0] : '';
    if (!reelUrl) continue;

    const key = normalizeReelKey(reelUrl);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const savedMeta = spyTabMetaByUrl.get(reelUrl) || spyTabMetaByUrl.get(key) || {};
    out.push({
      reel_url: reelUrl,
      competitor_short_url: shMatch ? shMatch[0].replace(/[),.]+$/, '') : savedMeta.competitor_short_url || '',
      product_tag_title: savedMeta.product_tag_title || '',
      competitor_page: savedMeta.competitor_page || '',
      caption_full: savedMeta.caption_full || '',
      fb_reactions: Number(savedMeta.fb_reactions) || 0,
      fb_comments: Number(savedMeta.fb_comments) || 0,
      fb_shares: String(savedMeta.fb_shares || '0')
    });

    if (out.length >= 20) break;
  }
  return out;
}

function syncSpyCountBadge() {
  const list = parseSpyTextareaReels();
  setText('drb-spy-count-badge', `${list.length}/20 ลิงก์`);
  return list;
}

function bindSpyCollector() {
  const inp = document.getElementById('drb-spy-urls-input');
  const grabBtn = document.getElementById('drb-spy-btn-grab-tab');
  const clearBtn = document.getElementById('drb-spy-btn-clear');
  const collectBtn = document.getElementById('drb-spy-btn-collect');
  const retryFailedBtn = document.getElementById('drb-spy-btn-retry-failed');
  const wakeAffBtn = document.getElementById('drb-spy-btn-wake-aff');

  inp?.addEventListener('input', () => {
    syncSpyCountBadge();
  });

  grabBtn?.addEventListener('click', () => {
    grabActiveFacebookReelTab(true);
  });

  clearBtn?.addEventListener('click', () => {
    if (inp) inp.value = '';
    const prevEl = document.getElementById('drb-spy-tab-preview');
    if (prevEl) {
      prevEl.hidden = true;
      prevEl.innerHTML = '';
    }
    syncSpyCountBadge();
  });

  collectBtn?.addEventListener('click', () => {
    runSpyReelCollector();
  });

  retryFailedBtn?.addEventListener('click', () => {
    rerunFailedSpyRows();
  });

  wakeAffBtn?.addEventListener('click', async () => {
    const orig = wakeAffBtn.textContent;
    wakeAffBtn.disabled = true;
    wakeAffBtn.textContent = '⏳...';
    try {
      const res = await ensureSpyAffBridgeReadyWithFeedback({ manualClick: true });
      if (res.ok && !res.wokeUp && !res.openedNew) {
        ns.showToast('🟢 แท็บ Shopee Affiliate พร้อมใช้งานแล้ว!');
      } else if (!res.ok && res.error) {
        ns.showToast(`🚨 ${res.error}`, 'error');
      }
    } finally {
      wakeAffBtn.disabled = false;
      if (wakeAffBtn.textContent === '⏳...') wakeAffBtn.textContent = orig;
      refreshSpyAffBridgeStatus();
    }
  });
}

async function refreshSpyAffBridgeStatus() {
  const box = document.getElementById('drb-spy-aff-bridge');
  const wakeBtn = document.getElementById('drb-spy-btn-wake-aff');
  if (!box) return null;

  try {
    const status = await ns.sendMessage('GET_AFF_BRIDGE_STATUS');
    const st = status?.state || 'missing';
    box.setAttribute('data-state', st);

    if (st === 'ready') {
      setText('drb-spy-aff-bridge-text', '🟢 แท็บ Shopee Affiliate พร้อมดึงค่าคอม');
      if (wakeBtn) wakeBtn.hidden = true;
    } else if (st === 'sleeping') {
      setText('drb-spy-aff-bridge-text', '💤 แท็บ AFF หลับอยู่ — จะปลุกอัตโนมัติตอนกด Collect');
      if (wakeBtn) {
        wakeBtn.hidden = false;
        wakeBtn.textContent = '⚡ ปลุกแท็บ';
      }
    } else if (st === 'security') {
      setText('drb-spy-aff-bridge-text', '🚨 แท็บ AFF ติดด่านตรวจ/ยังไม่ล็อกอิน — กดปุ่มขวาเพื่อผ่านด่านก่อน');
      if (wakeBtn) {
        wakeBtn.hidden = false;
        wakeBtn.textContent = '🔓 เปิดหน้า AFF ↗';
      }
    } else {
      setText('drb-spy-aff-bridge-text', '⚪ ยังไม่เปิดแท็บ AFF — จะเปิดเบื้องหลังให้ตอนกด Collect');
      if (wakeBtn) {
        wakeBtn.hidden = false;
        wakeBtn.textContent = '🌐 เปิดแท็บ AFF';
      }
    }
    return status;
  } catch (_e) {
    return null;
  }
}

async function ensureSpyAffBridgeReadyWithFeedback({ manualClick = false, progTxtEl = null } = {}) {
  const preStatus = await ns.sendMessage('GET_AFF_BRIDGE_STATUS').catch(() => null);
  if (preStatus?.state === 'sleeping') {
    const msg = '💤 พบแท็บ AFF หลับอยู่ — กำลังปลุกให้ตื่นอัตโนมัติ...';
    if (progTxtEl) progTxtEl.textContent = msg;
    ns.showToast(msg);
  } else if (preStatus?.state === 'missing') {
    const msg = '🌐 ยังไม่ได้เปิดหน้า AFF — กำลังเปิดแท็บเบื้องหลังให้อัตโนมัติ...';
    if (progTxtEl) progTxtEl.textContent = msg;
    ns.showToast(msg);
  }

  try {
    const res = await ns.sendMessage('ENSURE_AFF_BRIDGE_READY', { focusIfSecurity: manualClick });
    await refreshSpyAffBridgeStatus();
    if (!res?.ok && res?.securityCheck) {
      return {
        ok: false,
        securityCheck: true,
        error: res.error || 'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิด affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
      };
    }
    if (res?.wokeUp) {
      ns.showToast('⚡ ปลุกแท็บ Shopee Affiliate ตื่นพร้อมใช้งานแล้ว!');
    } else if (res?.openedNew) {
      ns.showToast('🌐 เปิดแท็บ Shopee Affiliate เบื้องหลังพร้อมใช้งานแล้ว!');
    }
    return { ok: true, ...res };
  } catch (err) {
    await refreshSpyAffBridgeStatus();
    return { ok: false, securityCheck: false, error: err?.message || String(err) };
  }
}

async function grabActiveFacebookReelTab(showToast = true) {
  const grabBtn = document.getElementById('drb-spy-btn-grab-tab');
  const inp = document.getElementById('drb-spy-urls-input');
  const prevEl = document.getElementById('drb-spy-tab-preview');
  const origTxt = grabBtn?.textContent || '📥 ดึงจากแท็บ FB ปัจจุบัน';
  if (grabBtn) {
    grabBtn.disabled = true;
    grabBtn.textContent = '⏳ กำลังดึงจากแท็บ FB...';
  }

  try {
    const res = await ns.sendMessage('SCRAPE_ACTIVE_FB_REEL_TAB', { tabId: currentTabId });
    if (!res || !res.reel_url) {
      throw new Error('ไม่พบลิงก์ Facebook Reel ในแท็บปัจจุบัน');
    }

    const key = normalizeReelKey(res.reel_url);
    spyTabMetaByUrl.set(res.reel_url, res);
    spyTabMetaByUrl.set(key, res);

    if (inp) {
      const currentList = parseSpyTextareaReels();
      const exists = currentList.some((x) => normalizeReelKey(x.reel_url) === key);
      if (!exists) {
        const lineToAdd = res.competitor_short_url
          ? `${res.reel_url} | ${res.competitor_short_url}`
          : res.reel_url;
        inp.value = inp.value.trim() ? `${inp.value.trim()}\n${lineToAdd}` : lineToAdd;
      }
      syncSpyCountBadge();
    }

    if (prevEl) {
      prevEl.hidden = false;
      const tagBadge = res.competitor_short_url
        ? `<span style="color:#15803d;font-weight:800;">✓ พบป้ายตะกร้า: ${escHtml(res.competitor_short_url)}</span>`
        : `<span style="color:#d97706;font-weight:700;">⚠️ ไม่พบลิงก์บน DOM (เซิร์ฟเวอร์จะคลายป้ายตะกร้าให้ตอนกด Collect)</span>`;
      prevEl.innerHTML = `
        <div style="font-weight:800;color:var(--sp-text);">
          📺 ${escHtml(res.competitor_page || 'Facebook Reel')}
          <span style="font-weight:600;color:var(--sp-text-3);font-size:11px;">
            (👍 ${(res.fb_reactions || 0).toLocaleString()} · 💬 ${(res.fb_comments || 0).toLocaleString()} · ↗ ${escHtml(res.fb_shares || '0')})
          </span>
        </div>
        <div style="margin-top:2px;">${tagBadge}</div>
        ${res.product_tag_title ? `<div style="margin-top:2px;font-size:11.5px;color:var(--sp-text-2);">🏷️ ${escHtml(res.product_tag_title.slice(0, 75))}</div>` : ''}
      `;
    }

    if (showToast) {
      ns.showToast(
        res.competitor_short_url
          ? `📥 ดึง FB Reel + ป้ายตะกร้า (${res.competitor_short_url}) สำเร็จ!`
          : `📥 ดึงลิงก์ FB Reel เข้าคิวแล้ว!`
      );
    }
  } catch (err) {
    ns.showToast(`❌ ${err?.message || String(err)}`, 'error');
  } finally {
    if (grabBtn) {
      grabBtn.disabled = false;
      grabBtn.textContent = origTxt;
    }
  }
}

async function resolveSpyRowItemAndRate(row, forceRefresh = true) {
  if (!row) return { ok: false, securityCheck: false, error: 'ไม่พบข้อมูลแถวสินค้า' };

  if (!row.item_id && row.competitor_short_url) {
    const resolved = await ns
      .sendMessage('RESOLVE_SHOPEE_SHORT_URL', { shortUrl: row.competitor_short_url })
      .catch(() => null);
    if (resolved?.item_id) {
      row.item_id = String(resolved.item_id).replace(/[^0-9]/g, '');
      if (resolved.shop_id) row.shop_id = String(resolved.shop_id).replace(/[^0-9]/g, '');
      if (resolved.clean_product_url) row.clean_product_url = resolved.clean_product_url;
      if (resolved.aff_offer_url) row.aff_offer_url = resolved.aff_offer_url;
    }
  }

  const cleanItemId = String(row.item_id || '').replace(/[^0-9]/g, '');
  if (!cleanItemId) {
    row.rateChecked = true;
    row.rateError = row.competitor_short_url
      ? `พบลิงก์ตะกร้า (${row.competitor_short_url}) แต่แกะรหัสสินค้าไม่ได้`
      : 'ไม่พบป้ายตะกร้า Shopee ในคลิปนี้';
    return { ok: false, securityCheck: false, error: row.rateError };
  }

  try {
    const offerRes = await ns.sendMessage('GET_REAL_AFF_OFFER', {
      itemId: cleanItemId,
      shopId: row.shop_id || '',
      titleHint: row.product_tag_title || '',
      forceRefresh: Boolean(forceRefresh)
    });
    if (offerRes?.securityCheck) {
      row.rateChecked = true;
      row.rateError =
        offerRes.error || 'Shopee ขอตรวจสอบความปลอดภัย — กรุณาเปิด affiliate.shopee.co.th ผ่านด่านตรวจก่อน';
      return { ok: false, securityCheck: true, error: row.rateError };
    }
    if (offerRes?.ok && offerRes.data) {
      const d = offerRes.data;
      const resolvedPrice = Number(d.offerPrice || d.price) > 0 ? Number(d.offerPrice || d.price) : row.price;
      const baseRate = Number(d.baseRate) || 0;
      const extraRate = Number(d.extraRate) || 0;
      const comm = ns.calculateCommission({
        price: resolvedPrice,
        baseRate,
        extraRate,
        capTHB: 250,
        whtRate: 0.0,
        realDailyAdCostTHB: 100
      });

      row.product_tag_title = d.title || row.product_tag_title || row.sku_code;
      if (d.shopId && !row.shop_id) row.shop_id = String(d.shopId);
      if (Array.isArray(d.imagesHD) && d.imagesHD.length > 0) {
        row.imagesHD = d.imagesHD.slice(0, 8);
      }
      row.price = resolvedPrice;
      row.baseRate = baseRate;
      row.extraRate = extraRate;
      row.netComm = +comm.netComm.toFixed(2);
      row.soldCount = Number(d.soldCount) || row.soldCount || 0;
      if (!row.clean_product_url && (d.cleanUrl || (row.shop_id && cleanItemId))) {
        row.clean_product_url = d.cleanUrl || `https://shopee.co.th/product/${row.shop_id}/${cleanItemId}`;
      }
      row.rateChecked = true;
      row.rateError = '';
      return { ok: true, securityCheck: false };
    }
    row.rateChecked = true;
    row.rateError = offerRes?.error || 'ดึงเรทไม่สำเร็จ';
    return { ok: false, securityCheck: false, error: row.rateError };
  } catch (offerErr) {
    row.rateChecked = true;
    row.rateError = offerErr?.message || String(offerErr);
    return { ok: false, securityCheck: false, error: row.rateError };
  }
}

function buildSpyLinkPayloadForSave(r) {
  return {
    sub_id1: '16NOV26FBRAD',
    sub_id2: r.spy_sub_id2,
    sku_code: r.sku_code || '',
    item_id: String(r.item_id || ''),
    title: r.product_tag_title || '',
    short_link: r.shortLink || '',
    long_link: r.longLink || r.clean_product_url || '',
    price: Number(r.price) || 0,
    baseRate: Number(r.baseRate) || 0,
    extraRate: Number(r.extraRate) || 0,
    base_comm_pct: Number(r.baseRate) || 0,
    extra_comm_pct: Number(r.extraRate) || 0,
    estimatedCommission: Number(r.netComm) || 0,
    net_comm_baht: Number(r.netComm) || 0,
    soldCount: Number(r.soldCount) || 0,
    sold_monthly: Number(r.soldCount) || 0,
    imagesHD: Array.isArray(r.imagesHD) ? r.imagesHD.slice(0, 8) : []
  };
}

async function ensureSpyRowsShortLinksAndSave(targetRows = []) {
  const needLinkRows = targetRows.filter((r) => {
    const prodUrl =
      r.clean_product_url ||
      (r.shop_id && r.item_id ? `https://shopee.co.th/product/${r.shop_id}/${r.item_id}` : '');
    return Boolean(prodUrl) && !r.shortLink;
  });

  if (needLinkRows.length > 0) {
    const batchPayload = needLinkRows.map((r) => ({
      shopee_url: r.clean_product_url || `https://shopee.co.th/product/${r.shop_id}/${r.item_id}`,
      sub_id1: '16NOV26FBRAD',
      sub_id2: r.spy_sub_id2 || '',
      sub_id3: '20261116',
      sub_id4: r.sku_code || '',
      sub_id5: `P01SPY${String(r.spy_seq || 1).padStart(3, '0')}`,
      sku_code: r.sku_code || '',
      item_id: String(r.item_id || ''),
      title: r.product_tag_title || ''
    }));

    const batchRes = await ns.sendMessage('BATCH_GENERATE_AFF_SHORTLINKS', { items: batchPayload }).catch(() => null);
    const genItems = Array.isArray(batchRes?.items) ? batchRes.items : [];
    const linkBySub2 = new Map();
    genItems.forEach((g) => {
      if (g.sub_id2 && g.short_link) {
        linkBySub2.set(g.sub_id2, g);
      }
    });

    for (const r of needLinkRows) {
      const hit = linkBySub2.get(r.spy_sub_id2);
      if (hit?.short_link) {
        r.shortLink = hit.short_link;
        r.longLink = hit.long_link || r.clean_product_url || '';
      }
    }
  }

  const linksToSave = targetRows
    .filter((r) => r.spy_sub_id2 && (r.shortLink || r.netComm > 0 || r.price > 0 || (r.imagesHD && r.imagesHD.length > 0)))
    .map(buildSpyLinkPayloadForSave);

  if (linksToSave.length > 0) {
    const saveRes = await ns.sendMessage('SAVE_POOL_SHORTLINKS', { links: linksToSave });
    const localMap = saveRes?.localImagesMap;
    if (localMap && typeof localMap === 'object') {
      for (const r of targetRows) {
        if (r.spy_sub_id2 && Array.isArray(localMap[r.spy_sub_id2]) && localMap[r.spy_sub_id2].length > 0) {
          r.localImages = localMap[r.spy_sub_id2];
        }
      }
    }
  }
}

async function rerunSingleSpyRow(idx) {
  if (spyCollectRunning || spyBatchRetryRunning || spyRerunningIndices.has(idx)) {
    ns.showToast('⏳ กำลังดึงข้อมูลอยู่...');
    return;
  }
  const row = lastSpyEnrichedItems[idx];
  if (!row) return;

  spyRerunningIndices.add(idx);
  renderSpyCollectorResults(lastSpyEnrichedItems);

  try {
    const bridgeRes = await ensureSpyAffBridgeReadyWithFeedback();
    if (!bridgeRes.ok && bridgeRes.securityCheck) {
      ns.showToast(`🚨 ${bridgeRes.error}`, 'error');
      return;
    }
    const res = await resolveSpyRowItemAndRate(row, true);
    if (res.securityCheck) {
      ns.showToast(`❌ ${res.error}`, 'error');
      return;
    }
    if (row.item_id) {
      await ensureSpyRowsShortLinksAndSave([row]).catch(() => {});
    }
    if (Number(row.extraRate) > 0 || Number(row.netComm) > 0) {
      ns.showToast(
        `✅ อัปเดต ${row.spy_sub_id2 || row.item_id}: Extra ${row.extraRate}% · ค่าคอม ${ns.formatTHB(row.netComm)}`
      );
    } else {
      ns.showToast(`⚠️ ${row.rateError || 'ยังดึง EXTRACOMM ไม่สำเร็จ (ลองเปิด 🔍 หน้า AFF ↗)'}`, 'error');
    }
  } finally {
    spyRerunningIndices.delete(idx);
    renderSpyCollectorResults(lastSpyEnrichedItems);
    const cardEl = document.querySelector(`#drb-spy-results-list .sp-spy-item-card[data-idx="${idx}"]`);
    if (cardEl) {
      cardEl.classList.remove('sp-flash-anim');
      void cardEl.offsetWidth;
      cardEl.classList.add('sp-flash-anim');
    }
  }
}

async function rerunFailedSpyRows() {
  if (spyCollectRunning || spyBatchRetryRunning) {
    ns.showToast('⏳ กำลังดึงข้อมูลอยู่...');
    return;
  }
  const targetIndices = lastSpyEnrichedItems
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !r.item_id || Number(r.extraRate) <= 0 || Number(r.netComm) <= 0)
    .map(({ i }) => i);

  if (!targetIndices.length) {
    ns.showToast('✅ ทุกรายการมีค่าคอมครบแล้ว!');
    return;
  }

  const progWrap = document.getElementById('drb-spy-progress-wrap');
  const progBar = document.getElementById('drb-spy-progress-bar');
  const progTxt = document.getElementById('drb-spy-progress-text');

  spyBatchRetryRunning = true;
  if (progWrap) progWrap.hidden = false;
  if (progBar) progBar.style.width = '5%';
  renderSpyCollectorResults(lastSpyEnrichedItems);

  let updatedCount = 0;
  let stoppedBySec = false;
  try {
    const bridgeRes = await ensureSpyAffBridgeReadyWithFeedback({ progTxtEl: progTxt });
    if (!bridgeRes.ok && bridgeRes.securityCheck) {
      stoppedBySec = true;
      if (progTxt) {
        progTxt.innerHTML = `<span style="color:#dc2626;font-weight:700;">🚨 ${escHtml(bridgeRes.error)}</span>`;
      }
      ns.showToast(`🚨 ${bridgeRes.error}`, 'error');
      return;
    }

    for (let step = 0; step < targetIndices.length; step++) {
      const idx = targetIndices[step];
      const row = lastSpyEnrichedItems[idx];
      if (!row) continue;

      const pct = Math.round(((step + 1) / targetIndices.length) * 100);
      if (progBar) progBar.style.width = `${pct}%`;
      if (progTxt) {
        progTxt.textContent = `🔄 รีเช็กตัวที่ 0% (${step + 1}/${targetIndices.length}): ${row.spy_sub_id2 || row.item_id || 'Reel'}...`;
      }

      spyRerunningIndices.add(idx);
      renderSpyCollectorResults(lastSpyEnrichedItems);

      const res = await resolveSpyRowItemAndRate(row, true);
      if (res.securityCheck) {
        spyRerunningIndices.delete(idx);
        stoppedBySec = true;
        if (progTxt) {
          progTxt.innerHTML = `<span style="color:#dc2626;font-weight:700;">❌ ${escHtml(res.error)}</span>`;
        }
        ns.showToast(`❌ ${res.error}`, 'error');
        break;
      }
      if (row.item_id) {
        await ensureSpyRowsShortLinksAndSave([row]).catch(() => {});
        if (Number(row.extraRate) > 0 || Number(row.netComm) > 0) updatedCount++;
      }
      spyRerunningIndices.delete(idx);
      renderSpyCollectorResults(lastSpyEnrichedItems);
    }

    if (!stoppedBySec) {
      if (progBar) progBar.style.width = '100%';
      if (progTxt) {
        progTxt.innerHTML = `<span style="color:#15803d;font-weight:800;">✅ รีเช็กตัวที่ 0% เสร็จสิ้น — ดึงค่าคอมเพิ่มได้ ${updatedCount}/${targetIndices.length} ตัว</span>`;
      }
      ns.showToast(`✅ รีเช็กเสร็จสิ้น (อัปเดตได้ ${updatedCount}/${targetIndices.length} ตัว)`);
    }
  } finally {
    spyBatchRetryRunning = false;
    spyRerunningIndices.clear();
    renderSpyCollectorResults(lastSpyEnrichedItems);
  }
}

async function runSpyReelCollector() {
  if (spyCollectRunning || spyBatchRetryRunning) {
    ns.showToast('⏳ กำลังรัน Collect & เช็กค่าคอมอยู่...');
    return;
  }

  const reels = parseSpyTextareaReels();
  if (!reels.length) {
    ns.showToast('กรุณาวางลิงก์ Facebook Reel หรือกด "📥 ดึงจากแท็บ FB ปัจจุบัน" ก่อน');
    return;
  }

  const collectBtn = document.getElementById('drb-spy-btn-collect');
  const progWrap = document.getElementById('drb-spy-progress-wrap');
  const progBar = document.getElementById('drb-spy-progress-bar');
  const progTxt = document.getElementById('drb-spy-progress-text');
  const sumStrip = document.getElementById('drb-spy-summary-strip');

  spyCollectRunning = true;
  if (collectBtn) {
    collectBtn.disabled = true;
    collectBtn.textContent = `⏳ กำลังคลายป้ายตะกร้า (${reels.length} คลิป)...`;
  }
  if (progWrap) progWrap.hidden = false;
  if (progBar) progBar.style.width = '10%';
  if (progTxt) progTxt.textContent = `⏳ [1/4] ส่งลิงก์ FB Reels ${reels.length} รายการไปคลายป้ายตะกร้าที่เซิร์ฟเวอร์...`;

  try {
    // Stage 1: POST /api/shopee-aff/spy-collect
    const collectRes = await ns.sendMessage('SPY_COLLECT_REELS', { reels });
    const items = Array.isArray(collectRes?.items) ? collectRes.items : [];
    if (!items.length) {
      throw new Error(collectRes?.error || 'เซิร์ฟเวอร์ไม่คืนรายการสินค้ากลับมา');
    }

    // Prepare display models
    const enrichedItems = items.map((it) => ({
      ...it,
      price: Number(it.price) || 0,
      baseRate: Number(it.base_comm_pct) || 0,
      extraRate: Number(it.extra_comm_pct) || 0,
      netComm: Number(it.net_comm_baht) || 0,
      soldCount: Number(it.sold_monthly) || 0,
      shortLink: it.our_short_link || '',
      imagesHD: Array.isArray(it.images_hd)
        ? it.images_hd
        : it.product_image_url && /^https?:\/\//i.test(it.product_image_url)
          ? [it.product_image_url]
          : [],
      localImages: Array.isArray(it.local_images) ? it.local_images : [],
      rateChecked: false,
      rateError: ''
    }));
    lastSpyEnrichedItems = enrichedItems;
    renderSpyCollectorResults(enrichedItems);

    if (enrichedItems.some((r) => r.item_id || r.competitor_short_url)) {
      if (collectBtn) collectBtn.textContent = '⏳ เตรียม/ปลุกแท็บ AFF...';
      const bridgeRes = await ensureSpyAffBridgeReadyWithFeedback({ progTxtEl: progTxt });
      if (!bridgeRes.ok && bridgeRes.securityCheck) {
        throw new Error(bridgeRes.error);
      }
    }

    // Stage 2: Fetch Real Social Media Commission for each item with item_id
    for (let idx = 0; idx < enrichedItems.length; idx++) {
      const row = enrichedItems[idx];
      const cleanItemId = String(row.item_id || '').replace(/[^0-9]/g, '');
      const pct = 15 + Math.round(((idx + 1) / enrichedItems.length) * 55);
      if (progBar) progBar.style.width = `${pct}%`;

      if (cleanItemId) {
        if (progTxt) {
          progTxt.textContent = `⏳ [2/4] เช็กเรท Social Media จริง (${idx + 1}/${enrichedItems.length}): ${row.spy_sub_id2 || cleanItemId}...`;
        }
        if (collectBtn) {
          collectBtn.textContent = `⏳ เช็กค่าคอม (${idx + 1}/${enrichedItems.length})...`;
        }
      }

      const needForce = Number(row.price) <= 0 || Number(row.netComm) <= 0 || Number(row.extraRate) <= 0;
      const res = await resolveSpyRowItemAndRate(row, needForce);
      if (res.securityCheck) {
        throw new Error(res.error);
      }

      renderSpyCollectorResults(enrichedItems);
    }

    // Stage 3 & 4: Generate our s.shopee.co.th shortlinks & persist rates into Spy Pool
    const needLinkCount = enrichedItems.filter((r) => {
      const prodUrl =
        r.clean_product_url ||
        (r.shop_id && r.item_id ? `https://shopee.co.th/product/${r.shop_id}/${r.item_id}` : '');
      return Boolean(prodUrl) && !r.shortLink;
    }).length;
    if (needLinkCount > 0) {
      if (progBar) progBar.style.width = '82%';
      if (progTxt) {
        progTxt.textContent = `⏳ [3/4] เจนลิงก์ s.shopee.co.th ติดรหัส Sub_id1–5 (${needLinkCount} รายการ)...`;
      }
      if (collectBtn) {
        collectBtn.textContent = `⏳ เจนลิงก์ s.shopee (${needLinkCount} ตัว)...`;
      }
    }

    if (progBar) progBar.style.width = '94%';
    if (progTxt) {
      progTxt.textContent = `⏳ [4/4] บันทึกค่าคอม + ลิงก์ s.shopee.co.th เข้า Spy Pool...`;
    }
    await ensureSpyRowsShortLinksAndSave(enrichedItems);

    spyCollectRunning = false;
    renderSpyCollectorResults(enrichedItems);
    const passCount = enrichedItems.filter((r) => r.item_id && (r.extraRate >= 7 || r.netComm >= 15)).length;
    if (progBar) progBar.style.width = '100%';
    if (progTxt) {
      progTxt.innerHTML = `<span style="color:#15803d;font-weight:800;">✅ ซิงก์เข้า Spy Pool สำเร็จ ${enrichedItems.length} คลิป (🟢 ผ่านเกณฑ์น่าทำคลิป ${passCount} ตัว)!</span>`;
    }
    if (sumStrip) sumStrip.hidden = false;
    ns.showToast(`🎉 Collect สำเร็จ ${enrichedItems.length} คลิป (🟢 ผ่านเกณฑ์ ${passCount} ตัว)!`);
  } catch (err) {
    if (progTxt) {
      progTxt.innerHTML = `<span style="color:#dc2626;font-weight:700;">❌ ${escHtml(err?.message || String(err))}</span>`;
    }
    ns.showToast(`❌ ${err?.message || String(err)}`, 'error');
  } finally {
    spyCollectRunning = false;
    if (collectBtn) {
      collectBtn.disabled = false;
      collectBtn.textContent = '🔍 Collect & เช็กค่าคอมเข้า Spy Pool';
    }
    renderSpyCollectorResults(lastSpyEnrichedItems);
  }
}

function renderSpyCollectorResults(items = []) {
  const listEl = document.getElementById('drb-spy-results-list');
  const sumStrip = document.getElementById('drb-spy-summary-strip');
  const retryFailedBtn = document.getElementById('drb-spy-btn-retry-failed');
  if (!listEl) return;

  let passCount = 0;
  let failCount = 0;
  let noTagCount = 0;
  let retryNeedCount = 0;

  items.forEach((r) => {
    if (!r.item_id) {
      noTagCount++;
      retryNeedCount++;
    } else {
      if (Number(r.extraRate) <= 0 || Number(r.netComm) <= 0) retryNeedCount++;
      if (Number(r.extraRate) >= 7 || Number(r.netComm) >= 15) {
        passCount++;
      } else {
        failCount++;
      }
    }
  });

  if (sumStrip) {
    sumStrip.hidden = items.length === 0;
    setText(
      'drb-spy-summary-text',
      `รวม ${items.length} คลิป · 🟢 ผ่านเกณฑ์ ${passCount} · 🔴 คอมต่ำ ${failCount}${noTagCount > 0 ? ` · ⚠️ ไร้ตะกร้า ${noTagCount}` : ''}`
    );
  }
  if (retryFailedBtn) {
    retryFailedBtn.hidden = items.length === 0 || spyCollectRunning || retryNeedCount === 0;
    retryFailedBtn.disabled = spyCollectRunning || spyBatchRetryRunning;
    retryFailedBtn.textContent = spyBatchRetryRunning
      ? '⏳ กำลังรีเช็ก...'
      : `🔄 รีเช็กตัวที่ 0% (${retryNeedCount})`;
  }

  listEl.innerHTML = items
    .map((r, i) => {
      const hasItem = Boolean(r.item_id);
      const isPass = hasItem && (Number(r.extraRate) >= 7 || Number(r.netComm) >= 15);
      const gate = !hasItem ? 'notag' : isPass ? 'pass' : 'fail';
      const isRerunning = spyRerunningIndices.has(i);

      let bannerLeft = '⏳ กำลังเช็กค่าคอม...';
      if (isRerunning) {
        bannerLeft = '⏳ กำลังดึงเรทใหม่...';
      } else if (!hasItem) {
        bannerLeft = r.competitor_short_url
          ? '⚠️ พบตะกร้าแต่แกะรหัสสินค้าไม่ได้'
          : '⚠️ ไม่พบป้ายตะกร้า Shopee';
      } else if (!r.rateChecked && r.netComm <= 0 && r.extraRate <= 0) {
        bannerLeft = '⏳ กำลังดึงเรท Social Media...';
      } else if (isPass) {
        bannerLeft =
          Number(r.netComm) >= 45
            ? '🟢 ผ่านเกณฑ์! คอมสูงน่าลุยแอด'
            : '🟢 ผ่านเกณฑ์น่าทำคลิป (Exther Gate)';
      } else {
        bannerLeft = '🔴 คอมต่ำไม่คุ้มแอด — ข้ามเลย';
      }

      const sub2Badge = escHtml(r.spy_sub_id2 || `SPY#${i + 1}`);
      const totalPct = +((Number(r.baseRate) || 0) + (Number(r.extraRate) || 0)).toFixed(1);
      const shortLinkHtml = r.shortLink
        ? `<button type="button" class="sp-ghost-sm-btn spy-copy-link-btn" data-link="${escHtml(r.shortLink)}" title="คลิกเพื่อคัดลอกลิงก์ s.shopee.co.th ของเรา">🔗 ${escHtml(r.shortLink)}</button>`
        : !hasItem && r.competitor_short_url
          ? `<button type="button" class="sp-ghost-sm-btn spy-open-url-btn" data-url="${escHtml(r.competitor_short_url)}" title="เปิดลิงก์ตะกร้าที่พบในคลิป">🛒 ${escHtml(r.competitor_short_url)} ↗</button>`
          : `<span style="font-size:11px;color:var(--sp-text-3);">${hasItem ? '⏳ รอเจนลิงก์...' : 'ไม่มีลิงก์สินค้า'}</span>`;

      const affUrl = r.item_id ? `https://affiliate.shopee.co.th/offer/product_offer/${r.item_id}` : '';
      const disableRowActions = spyCollectRunning || spyBatchRetryRunning || isRerunning;
      const baseWebUrl = String(currentSettings.webUiBaseUrl || 'https://aff.doctorbankonline.com').replace(/\/+$/, '');
      const localThumb = Array.isArray(r.localImages) && r.localImages[0]
        ? (r.localImages[0].startsWith('http') ? r.localImages[0] : `${baseWebUrl}${r.localImages[0]}`)
        : '';
      const thumbUrl = (Array.isArray(r.imagesHD) && r.imagesHD[0]) || localThumb || '';
      const thumbHtml = thumbUrl
        ? `<img src="${escHtml(thumbUrl)}" class="sp-spy-item-thumb" alt="" loading="lazy" referrerpolicy="no-referrer">`
        : '';
      return `
        <div class="sp-spy-item-card" data-gate="${gate}" data-idx="${i}">
          <div class="sp-spy-item-banner">
            <span>${bannerLeft}</span>
            <code style="font-size:11px;background:rgba(0,0,0,0.25);padding:2px 7px;border-radius:999px;">${sub2Badge}</code>
          </div>
          <div class="sp-spy-item-body">
            <div class="sp-spy-item-head">
              ${thumbHtml}
              <div style="min-width:0;flex:1;">
                <div class="sp-spy-item-title">
                  ${escHtml(r.product_tag_title || r.slug || 'คลิป Facebook Reel')}
                </div>
                <div style="font-size:11.5px;color:var(--sp-text-2);display:flex;gap:6px;flex-wrap:wrap;margin-top:3px;">
                  <span>📺 <b>${escHtml(r.competitor_page || '-')}</b></span>
                  <span>·</span>
                  <span>SKU: <code>${escHtml(r.sku_code || '-')}</code></span>
                  ${r.soldCount > 0 ? `<span>· ขาย ${Number(r.soldCount).toLocaleString()}/ด.</span>` : ''}
                  ${Array.isArray(r.imagesHD) && r.imagesHD.length ? `<span>· 🖼️ ${r.imagesHD.length} รูป</span>` : ''}
                </div>
              </div>
            </div>
            ${
              hasItem
                ? `
            <div class="sp-spy-item-metrics">
              <div class="sp-spy-metric-box">
                <span class="sp-spy-metric-lbl">ค่าคอม/ชิ้น (ตรง AFF)</span>
                <span class="sp-spy-metric-val" style="color:${isPass ? 'var(--sp-extra)' : '#dc2626'};">${ns.formatTHB(r.netComm || 0)}</span>
              </div>
              <div class="sp-spy-metric-box">
                <span class="sp-spy-metric-lbl">🔥 EXTRACOMM</span>
                <span class="sp-spy-metric-val" style="color:var(--sp-extra);">${Number(r.extraRate || 0)}%</span>
              </div>
              <div class="sp-spy-metric-box">
                <span class="sp-spy-metric-lbl">ราคา · รวม ${totalPct}%</span>
                <span class="sp-spy-metric-val">${ns.formatTHB(r.price || 0, 0)}</span>
              </div>
            </div>
            `
                : `<div style="font-size:12px;color:#b45309;">${escHtml(r.rateError || 'คลิกลิงก์ Reel เพื่อเช็กว่ามีลิงก์ในคอมเมนต์หรือไม่')}</div>`
            }
            <div class="sp-spy-item-footer">
              ${shortLinkHtml}
              <div style="display:flex;gap:5px;flex-wrap:wrap;">
                <button type="button" class="sp-ghost-sm-btn spy-rerun-row-btn" data-idx="${i}" ${disableRowActions ? 'disabled' : ''} title="ดึงเรทค่าคอม EXTRACOMM และราคาของสินค้านี้ใหม่อีกครั้ง">
                  ${isRerunning ? '⏳ กำลังดึง...' : '🔄 ดึงเรทใหม่'}
                </button>
                ${affUrl ? `<button type="button" class="sp-ghost-sm-btn spy-open-url-btn" data-url="${escHtml(affUrl)}">🔍 หน้า AFF ↗</button>` : ''}
                ${r.source_reel_url ? `<button type="button" class="sp-ghost-sm-btn spy-open-url-btn" data-url="${escHtml(r.source_reel_url)}">🎬 คลิป Reel ↗</button>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  listEl.querySelectorAll('.spy-rerun-row-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (Number.isInteger(idx)) rerunSingleSpyRow(idx);
    });
  });

  listEl.querySelectorAll('.spy-copy-link-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const link = btn.getAttribute('data-link');
      if (link) ns.copyText(link, `🔗 ก๊อปลิงก์ ${link} แล้ว!`);
    });
  });

  listEl.querySelectorAll('.spy-open-url-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetUrl = btn.getAttribute('data-url');
      if (targetUrl) chrome.tabs.create({ url: targetUrl });
    });
  });
}
