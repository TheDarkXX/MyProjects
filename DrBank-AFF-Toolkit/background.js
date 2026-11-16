/**
 * DrBank AFF Scout v2.0.0 — Lean Background Service Worker & Web UI Bridge
 * Separation of Concerns:
 *  - Receives Winning SKU payloads from Shopee Product HUD -> Queues locally & POSTs to Web UI
 *  - Receives Conversion Report tables from Shopee Affiliate Console -> POSTs to Web UI
 */

const DEFAULT_SETTINGS = {
  webUiBaseUrl: 'https://aff.doctorbankonline.com', // URL ของหน้าเว็บ Shopee × Meta Command Center (XBrain Live)
  shopeeBaseRate: 0.6,                              // % ค่าคอมพื้นฐาน Shopee จริงตาม Ground Truth 11.11
  shopeeExtraRate: 10.0,                            // % ค่าคอม Extra เริ่มต้น (เกณฑ์ อ.เอสเธอร์ >= 7%)
  shopeeCapTHB: 250,                                // เพดานค่าคอมพื้นฐานต่อชิ้น (บาท)
  withholdingTaxRate: 3.0,                          // หัก ณ ที่จ่าย 3% จากยอดคอมมิชชั่น
  dailyAdBudgetTHB: 100,                            // งบแอดต่อโพสต์ (100 บาท/วัน)
  fbVatRate: 7.0,                                   // VAT 7% ของค่าแอด FB (รวมเป็น 107 บาท/วัน)
  theme: 'light',
  displayMode: 'sidepanel',                         // 'sidepanel' (Default) | 'float'
  hudMinimized: false
};

// Configure Side Panel behavior: open on action click by default
chrome.sidePanel
  ?.setPanelBehavior?.({ openPanelOnActionClick: true })
  ?.catch?.(() => {});

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['settings', 'savedProducts', 'syncedReports']);
  const prev = data.settings || {};
  if (prev.webUiBaseUrl === 'http://localhost:3000') delete prev.webUiBaseUrl;
  if (prev.shopeeBaseRate === 3.5) delete prev.shopeeBaseRate;
  const merged = { ...DEFAULT_SETTINGS, ...prev };
  await chrome.storage.local.set({ settings: merged });

  if (!Array.isArray(data.savedProducts)) {
    await chrome.storage.local.set({ savedProducts: [] });
  }
  if (!Array.isArray(data.syncedReports)) {
    await chrome.storage.local.set({ syncedReports: [] });
  }
});

const REAL_OFFER_TTL_MS = 30 * 60 * 1000;
const AFF_RATE_LIMIT_GAP_MS = 650;
const realOfferCache = new Map();
const pendingOfferWaiters = new Map();
const inFlightOfferFetches = new Map();
let lastAffApiCallAt = 0;

function isSecurityOrLoginUrl(url = '') {
  return /verify\/captcha|verify\/traffic|buyer\/login/i.test(String(url || ''));
}

async function waitAffRateLimit() {
  const now = Date.now();
  const waitMs = AFF_RATE_LIMIT_GAP_MS - (now - lastAffApiCallAt);
  if (waitMs > 0) {
    await new Promise((r) => setTimeout(r, waitMs));
  }
  lastAffApiCallAt = Date.now();
}

async function findOpenAffTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://affiliate.shopee.co.th/*' });
    return Array.isArray(tabs) ? tabs : [];
  } catch (_e) {
    return [];
  }
}

function resolvePendingOfferWaiter(itemId, result) {
  const key = String(itemId || '').trim();
  const waiters = pendingOfferWaiters.get(key);
  if (!waiters || !waiters.length) return;
  pendingOfferWaiters.delete(key);
  waiters.forEach((w) => {
    clearTimeout(w.timer);
    w.resolve(result);
  });
}

function waitForCachedOffer(itemId, timeoutMs = 8000) {
  const key = String(itemId || '').trim();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const list = pendingOfferWaiters.get(key) || [];
      pendingOfferWaiters.set(
        key,
        list.filter((w) => w.resolve !== resolve)
      );
      resolve(null);
    }, timeoutMs);
    const list = pendingOfferWaiters.get(key) || [];
    list.push({ resolve, timer });
    pendingOfferWaiters.set(key, list);
  });
}

function waitForTabComplete(tabId, timeoutMs = 7000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (info) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(info);
    };
    const timer = setTimeout(() => finish({ timedOut: true }), timeoutMs);
    const onUpdated = (updatedId, changeInfo, tab) => {
      if (updatedId !== tabId) return;
      if (isSecurityOrLoginUrl(changeInfo.url || tab?.url || '')) {
        finish({ securityCheck: true, url: changeInfo.url || tab?.url });
        return;
      }
      if (changeInfo.status === 'complete') {
        finish({ complete: true, url: tab?.url || '' });
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function fetchRealAffOfferImpl(rawItemId, forceRefresh = false) {
  const itemId = String(rawItemId || '').replace(/[^0-9]/g, '');
  if (!itemId) {
    return { ok: false, error: 'ไม่พบ itemId ของสินค้า' };
  }

  if (!forceRefresh) {
    const hit = realOfferCache.get(itemId);
    if (hit && Date.now() - hit.cachedAt < REAL_OFFER_TTL_MS) {
      return { ok: true, cached: true, data: hit.data };
    }
    try {
      const store = await chrome.storage.local.get(['activeAffOfferProduct']);
      const storedAff = store?.activeAffOfferProduct;
      if (
        storedAff &&
        String(storedAff.itemId || '') === itemId &&
        (Number(storedAff.baseRate) > 0 || Number(storedAff.extraRate) > 0)
      ) {
        realOfferCache.set(itemId, { data: storedAff, cachedAt: Date.now() });
        return { ok: true, cached: true, data: storedAff };
      }
    } catch (_e) {}
  }

  if (inFlightOfferFetches.has(itemId)) {
    return await inFlightOfferFetches.get(itemId);
  }

  const runPromise = (async () => {
    await waitAffRateLimit();

    // Tier 1: Check if any already-open affiliate.shopee.co.th tab is ALREADY on product_offer/<itemId>
    const openTabs = await findOpenAffTabs();
    for (const tab of openTabs) {
      if (isSecurityOrLoginUrl(tab.url)) {
        return {
          ok: false,
          securityCheck: true,
          error: 'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
        };
      }
      if (!String(tab.url || '').includes(itemId)) {
        continue;
      }
      try {
        const resp = await chrome.tabs.sendMessage(tab.id, {
          action: 'FETCH_REAL_OFFER_IN_AFF_TAB',
          itemId
        });
        if (resp?.securityCheck) {
          return { ok: false, securityCheck: true, error: resp.error };
        }
        if (resp?.ok && resp.data && (resp.data.baseRate > 0 || resp.data.extraRate > 0)) {
          realOfferCache.set(itemId, { data: resp.data, cachedAt: Date.now() });
          return { ok: true, cached: false, data: resp.data };
        }
      } catch (_err) {}
    }

    // Tier 2: Open inactive background tab to /offer/product_offer/<itemId> & poll until React table renders
    let bgTab = null;
    try {
      const waiterPromise = waitForCachedOffer(itemId, 9500);
      bgTab = await chrome.tabs.create({
        url: `https://affiliate.shopee.co.th/offer/product_offer/${itemId}`,
        active: false
      });

      const loadPromise = waitForTabComplete(bgTab.id, 8500).then(async (loadRes) => {
        if (loadRes?.securityCheck) {
          return {
            securityCheck: true,
            error: 'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
          };
        }
        for (let attempt = 0; attempt < 16; attempt++) {
          await new Promise((r) => setTimeout(r, 400));
          try {
            const currentTab = await chrome.tabs.get(bgTab.id).catch(() => null);
            if (!currentTab) break;
            if (isSecurityOrLoginUrl(currentTab.url)) {
              return {
                securityCheck: true,
                error: 'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
              };
            }
            const scrapedResp = await chrome.tabs.sendMessage(bgTab.id, { action: 'GET_AFFILIATE_OFFER' });
            if (scrapedResp?.ok && scrapedResp.data && (scrapedResp.data.baseRate > 0 || scrapedResp.data.extraRate > 0)) {
              resolvePendingOfferWaiter(itemId, scrapedResp.data);
              return scrapedResp.data;
            }
          } catch (_e) {}
        }
        return null;
      });

      const firstResult = await Promise.race([
        waiterPromise.then((d) => (d ? { fromWaiter: true, payload: d } : null)),
        loadPromise.then((d) => (d ? { fromWaiter: false, payload: d } : null))
      ]);

      let finalPayload = firstResult?.payload || null;
      if (!finalPayload) {
        const [wRes, lRes] = await Promise.all([waiterPromise, loadPromise]);
        finalPayload = wRes || lRes || null;
      }

      if (finalPayload?.securityCheck) {
        return { ok: false, securityCheck: true, error: finalPayload.error };
      }
      if (finalPayload && (finalPayload.baseRate > 0 || finalPayload.extraRate > 0)) {
        realOfferCache.set(itemId, { data: finalPayload, cachedAt: Date.now() });
        return { ok: true, cached: false, data: finalPayload };
      }
      return {
        ok: false,
        error: 'ไม่พบข้อมูลคอมมิชชันในหน้า affiliate.shopee.co.th (ตรวจสอบการล็อกอินหรือลองใหม่อีกครั้ง)'
      };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    } finally {
      if (bgTab?.id) {
        chrome.tabs.remove(bgTab.id).catch(() => {});
      }
    }
  })();

  inFlightOfferFetches.set(itemId, runPromise);
  try {
    return await runPromise;
  } finally {
    inFlightOfferFetches.delete(itemId);
  }
}

async function generateAffShortLinkImpl(originalLink, subIds = []) {
  const targetUrl = String(originalLink || '').trim();
  if (!targetUrl) {
    return { ok: false, error: 'ไม่มี URL สินค้าสำหรับสร้าง Short Link' };
  }

  await waitAffRateLimit();

  const openTabs = await findOpenAffTabs();
  for (const tab of openTabs) {
    if (isSecurityOrLoginUrl(tab.url)) {
      return {
        ok: false,
        securityCheck: true,
        error: 'Shopee ขอตรวจสอบความปลอดภัย — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
      };
    }
    try {
      const resp = await chrome.tabs.sendMessage(tab.id, {
        action: 'GENERATE_SHORTLINK_IN_AFF_TAB',
        originalLink: targetUrl,
        subIds
      });
      if (resp) return resp;
    } catch (_err) {}
  }

  let bgTab = null;
  try {
    bgTab = await chrome.tabs.create({
      url: 'https://affiliate.shopee.co.th/offer/custom_link',
      active: false
    });
    const loadRes = await waitForTabComplete(bgTab.id, 7500);
    if (loadRes?.securityCheck) {
      return {
        ok: false,
        securityCheck: true,
        error: 'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
      };
    }
    await new Promise((r) => setTimeout(r, 700));
    const resp = await chrome.tabs.sendMessage(bgTab.id, {
      action: 'GENERATE_SHORTLINK_IN_AFF_TAB',
      originalLink: targetUrl,
      subIds
    });
    return resp || { ok: false, error: 'ไม่สามารถสื่อสารกับหน้า Custom Link ได้' };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  } finally {
    if (bgTab?.id) {
      chrome.tabs.remove(bgTab.id).catch(() => {});
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((res) => sendResponse({ ok: true, data: res }))
    .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
  return true;
});

async function handleMessage(msg, _sender) {
  const { action, payload } = msg || {};

  switch (action) {
    case 'GET_STATE': {
      const store = await chrome.storage.local.get(['settings', 'savedProducts', 'syncedReports']);
      return {
        settings: { ...DEFAULT_SETTINGS, ...(store.settings || {}) },
        savedProducts: store.savedProducts || [],
        syncedReports: store.syncedReports || []
      };
    }

    case 'UPDATE_SETTINGS': {
      const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
      const next = { ...DEFAULT_SETTINGS, ...settings, ...(payload || {}) };
      await chrome.storage.local.set({ settings: next });
      return next;
    }

    case 'PING_WEBUI': {
      const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
      const baseUrl = String(payload?.webUiBaseUrl || settings.webUiBaseUrl || 'https://aff.doctorbankonline.com').replace(/\/+$/, '');
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch(`${baseUrl}/api/health`, {
          method: 'GET',
          credentials: 'include',
          signal: ctrl.signal
        }).catch(() => fetch(baseUrl, { method: 'HEAD', credentials: 'include', signal: ctrl.signal }));
        clearTimeout(timer);
        return { online: Boolean(res && (res.ok || res.status < 500)), baseUrl };
      } catch (_e) {
        return { online: false, baseUrl };
      }
    }

    case 'PUSH_SKU_TO_WEBUI':
    case 'SAVE_PRODUCT': {
      const { savedProducts = [], settings = DEFAULT_SETTINGS } = await chrome.storage.local.get([
        'savedProducts',
        'settings'
      ]);

      const item = {
        id: payload.id || `shopee_${payload.shopId || '0'}_${payload.itemId || Date.now()}`,
        platform: 'shopee',
        title: payload.title || 'สินค้าไม่ระบุชื่อ',
        originalPrice: Number(payload.originalPrice) || Number(payload.price) || 0,
        price: Number(payload.price) || 0,
        priceMax: Number(payload.priceMax) || Number(payload.price) || 0,
        baseRate: Number(payload.baseRate) || 0,
        extraRate: Number(payload.extraRate) || 0,
        estimatedCommission: Number(payload.estimatedCommission) || 0,
        realDailyAdCostTHB: Number(payload.realDailyAdCostTHB) || 107,
        breakEvenUnits: payload.breakEvenUnits || '0.0',
        breakEvenOrders: Number(payload.breakEvenOrders) || 0,
        viabilityTier: payload.viabilityTier || 'warning',
        soldCount: Number(payload.soldCount) || 0,
        soldText: payload.soldText || '',
        rating: Number(payload.rating) || 0,
        shipFrom: payload.shipFrom || '',
        isOverseas: Boolean(payload.isOverseas),
        url: payload.url || payload.cleanUrl || '',
        shortLink: payload.shortLink || payload.short_link || '',
        subId1: payload.subId1 || payload.sub_id1 || '16NOV26FBRAD',
        subId2: payload.subId2 || payload.sub_id2 || '',
        shopId: payload.shopId || '',
        itemId: payload.itemId || '',
        imagesHD: Array.isArray(payload.imagesHD) ? payload.imagesHD : [],
        variants: Array.isArray(payload.variants) ? payload.variants : [],
        savedAt: new Date().toISOString()
      };

      const filtered = savedProducts.filter((p) => p.id !== item.id && p.url !== item.url);
      const updated = [item, ...filtered].slice(0, 300);
      await chrome.storage.local.set({ savedProducts: updated });

      // Attempt HTTP POST to Web UI Command Center
      let syncedToServer = false;
      const baseUrl = String(settings?.webUiBaseUrl || 'https://aff.doctorbankonline.com').replace(/\/+$/, '');
      const affToken = String(settings?.affToken || 'doctorbank2026');
      if (baseUrl && /^https?:\/\//i.test(baseUrl)) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 5000);
          const resp = await fetch(`${baseUrl}/api/shopee-aff/sku-ingest`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Aff-Token': affToken
            },
            body: JSON.stringify(item),
            signal: ctrl.signal
          });
          clearTimeout(timer);
          syncedToServer = Boolean(resp && resp.ok);
        } catch (_err) {
          syncedToServer = false;
        }
      }

      return { products: updated, item, syncedToServer, totalQueued: updated.length };
    }

    case 'FETCH_POOL_PENDING': {
      const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
      const baseUrl = String(payload?.webUiBaseUrl || settings?.webUiBaseUrl || 'https://aff.doctorbankonline.com').replace(/\/+$/, '');
      const affToken = String(settings?.affToken || 'doctorbank2026');
      const forceParam = payload?.force ? '?force=1' : '';
      const resp = await fetch(`${baseUrl}/api/shopee-aff/pool-pending${forceParam}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'X-Aff-Token': affToken
        }
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} from ${baseUrl}/api/shopee-aff/pool-pending`);
      }
      return await resp.json();
    }

    case 'SAVE_POOL_SHORTLINKS': {
      const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
      const baseUrl = String(payload?.webUiBaseUrl || settings?.webUiBaseUrl || 'https://aff.doctorbankonline.com').replace(/\/+$/, '');
      const affToken = String(settings?.affToken || 'doctorbank2026');
      const links = Array.isArray(payload?.links) ? payload.links : [];
      const resp = await fetch(`${baseUrl}/api/shopee-aff/pool-shortlinks`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Aff-Token': affToken
        },
        body: JSON.stringify({ links })
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} from ${baseUrl}/api/shopee-aff/pool-shortlinks`);
      }
      return await resp.json();
    }

    case 'PUSH_REPORT_TO_WEBUI': {
      const { syncedReports = [], settings = DEFAULT_SETTINGS } = await chrome.storage.local.get([
        'syncedReports',
        'settings'
      ]);

      const reportBatch = {
        id: `rep_${Date.now()}`,
        date: payload.date || new Date().toISOString().slice(0, 10),
        totalCommission: Number(payload.totalCommission) || 0,
        netCommission: Number(payload.netCommission) || 0,
        orderCount: Number(payload.orderCount) || 0,
        rows: Array.isArray(payload.rows) ? payload.rows : [],
        syncedAt: new Date().toISOString()
      };

      const updatedReports = [reportBatch, ...syncedReports].slice(0, 100);
      await chrome.storage.local.set({ syncedReports: updatedReports });

      let syncedToServer = false;
      const baseUrl = String(settings?.webUiBaseUrl || 'https://aff.doctorbankonline.com').replace(/\/+$/, '');
      const affToken = String(settings?.affToken || 'doctorbank2026');
      if (baseUrl && /^https?:\/\//i.test(baseUrl)) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 5000);
          const resp = await fetch(`${baseUrl}/api/shopee-aff/report-ingest`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Aff-Token': affToken
            },
            body: JSON.stringify(reportBatch),
            signal: ctrl.signal
          });
          clearTimeout(timer);
          syncedToServer = Boolean(resp && resp.ok);
        } catch (_err) {
          syncedToServer = false;
        }
      }

      return { reports: updatedReports, reportBatch, syncedToServer };
    }

    case 'CLEAR_SAVED_PRODUCTS': {
      await chrome.storage.local.set({ savedProducts: [] });
      return [];
    }

    case 'CACHE_REAL_AFF_OFFER': {
      const itemId = String(payload?.itemId || '').replace(/[^0-9]/g, '');
      if (itemId && (Number(payload?.baseRate) > 0 || Number(payload?.extraRate) > 0)) {
        realOfferCache.set(itemId, { data: payload, cachedAt: Date.now() });
        resolvePendingOfferWaiter(itemId, payload);
      }
      return { cached: Boolean(itemId) };
    }

    case 'GET_REAL_AFF_OFFER': {
      return await fetchRealAffOfferImpl(payload?.itemId, Boolean(payload?.forceRefresh));
    }

    case 'GENERATE_AFF_SHORTLINK': {
      return await generateAffShortLinkImpl(payload?.originalLink, payload?.subIds || []);
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
