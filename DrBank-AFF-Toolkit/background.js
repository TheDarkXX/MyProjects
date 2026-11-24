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
  withholdingTaxRate: 0.0,                          // ไม่หักภาษี ณ ที่จ่าย (คำนวณตรงตามหน้า affiliate.shopee.co.th 100%)
  dailyAdBudgetTHB: 100,                            // งบแอดต่อโพสต์ (100 บาท/วัน)
  fbVatRate: 0.0,                                   // คิดทุนแอดกลมๆ 100 บาท/วัน (ไม่บวก VAT)
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

const REAL_OFFER_TTL_MS = 24 * 60 * 60 * 1000;
const REAL_OFFER_STORAGE_KEY = 'drbRealOfferCacheV1';
const REAL_OFFER_MAX_ENTRIES = 1000;
const AFF_RATE_LIMIT_GAP_MS = 350;
const HOURLY_AUTO_LIMIT = 120;
const realOfferCache = new Map();
const pendingOfferWaiters = new Map();
const inFlightOfferFetches = new Map();
const autoFetchTimestamps = [];
let lastAffApiCallAt = 0;
let circuitBreaker = { tripped: false, trippedAt: 0, error: '' };
let cacheHydrated = false;
let cachePersistTimer = null;

function isValidRealOfferData(d) {
  if (!d || typeof d !== 'object') return false;
  if (d.rateSource === 'base_default_fallback' || d.rateSource === 'offer_list_xhr' || d.rateSource === 'list_approx' || d.rateSource === 'error_unknown') return false;
  if (d.realRateVerified === false) return false;
  if (!d.cacheSchemaV2) return false;
  const price = Number(d.offerPrice || d.price || 0);
  const extra = Number(d.extraRate || 0);
  return (price > 0 || extra > 0) && Boolean(extra > 0 || d.hasRealCommission || d.domTableVerified);
}

async function hydrateRealOfferCache() {
  if (cacheHydrated) return;
  cacheHydrated = true;
  try {
    const store = await chrome.storage.local.get([REAL_OFFER_STORAGE_KEY]);
    const saved = store?.[REAL_OFFER_STORAGE_KEY];
    if (saved && typeof saved === 'object') {
      const now = Date.now();
      let droppedInvalid = false;
      Object.entries(saved).forEach(([k, entry]) => {
        if (
          entry &&
          entry.data &&
          isValidRealOfferData(entry.data) &&
          now - Number(entry.cachedAt || 0) < REAL_OFFER_TTL_MS
        ) {
          realOfferCache.set(String(k), {
            data: entry.data,
            cachedAt: Number(entry.cachedAt || now)
          });
        } else {
          droppedInvalid = true;
        }
      });
      if (droppedInvalid) {
        schedulePersistRealOfferCache();
      }
    }
  } catch (_e) {}
}

hydrateRealOfferCache();

function schedulePersistRealOfferCache() {
  if (cachePersistTimer) clearTimeout(cachePersistTimer);
  cachePersistTimer = setTimeout(async () => {
    try {
      const now = Date.now();
      const entries = Array.from(realOfferCache.entries())
        .filter(([, v]) => v && v.data && isValidRealOfferData(v.data) && now - Number(v.cachedAt || 0) < REAL_OFFER_TTL_MS)
        .sort((a, b) => Number(b[1].cachedAt || 0) - Number(a[1].cachedAt || 0))
        .slice(0, REAL_OFFER_MAX_ENTRIES);
      const obj = {};
      entries.forEach(([k, v]) => {
        obj[k] = { data: v.data, cachedAt: v.cachedAt };
      });
      await chrome.storage.local.set({ [REAL_OFFER_STORAGE_KEY]: obj });
    } catch (_e) {}
  }, 450);
}

function persistRealOfferCacheEntry(itemId, data) {
  const cleanId = String(itemId || '').replace(/[^0-9]/g, '');
  if (!cleanId || !isValidRealOfferData(data)) return;
  const cachedAt = Date.now();
  realOfferCache.set(cleanId, { data, cachedAt });
  schedulePersistRealOfferCache();
}

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

function isTabSleeping(tab) {
  return Boolean(tab && (tab.discarded || tab.status === 'unloaded'));
}

async function findOpenAffTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://affiliate.shopee.co.th/*' });
    if (!Array.isArray(tabs)) return [];
    return [...tabs].sort((a, b) => (isTabSleeping(a) ? 1 : 0) - (isTabSleeping(b) ? 1 : 0));
  } catch (_e) {
    return [];
  }
}

async function wakeAffTabIfSleeping(tab) {
  if (!tab || !tab.id) {
    return { tab: null, wokeUp: false, securityCheck: false };
  }
  if (!isTabSleeping(tab)) {
    return {
      tab,
      wokeUp: false,
      securityCheck: isSecurityOrLoginUrl(tab.url),
      error: isSecurityOrLoginUrl(tab.url)
        ? 'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
        : ''
    };
  }

  try {
    await chrome.tabs.reload(tab.id).catch(async () => {
      await chrome.tabs.update(tab.id, {
        url: tab.url || 'https://affiliate.shopee.co.th/offer/product_offer'
      });
    });
    const loadRes = await waitForTabComplete(tab.id, 8500);
    const refreshedTab = await chrome.tabs.get(tab.id).catch(() => tab);
    if (loadRes?.securityCheck || isSecurityOrLoginUrl(refreshedTab?.url)) {
      return {
        tab: refreshedTab,
        wokeUp: true,
        securityCheck: true,
        error: 'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
      };
    }
    await new Promise((r) => setTimeout(r, 750));
    return { tab: refreshedTab, wokeUp: true, securityCheck: false, error: '' };
  } catch (err) {
    return { tab, wokeUp: false, securityCheck: false, error: err?.message || String(err) };
  }
}

async function inspectAffBridgeStatus() {
  const openTabs = await findOpenAffTabs();
  const secTab = openTabs.find((t) => isSecurityOrLoginUrl(t.url));
  const awakeTabs = openTabs.filter((t) => !isTabSleeping(t));
  const sleepingTabs = openTabs.filter((t) => isTabSleeping(t));

  if (secTab || circuitBreaker.tripped) {
    return {
      ok: true,
      state: 'security',
      openCount: openTabs.length,
      awakeCount: awakeTabs.length,
      sleepingCount: sleepingTabs.length,
      securityCheck: true,
      tabId: secTab?.id || awakeTabs[0]?.id || sleepingTabs[0]?.id || null,
      error:
        circuitBreaker.error ||
        'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
    };
  }
  if (awakeTabs.length > 0) {
    return {
      ok: true,
      state: 'ready',
      openCount: openTabs.length,
      awakeCount: awakeTabs.length,
      sleepingCount: sleepingTabs.length,
      securityCheck: false,
      tabId: awakeTabs[0].id,
      error: ''
    };
  }
  if (sleepingTabs.length > 0) {
    return {
      ok: true,
      state: 'sleeping',
      openCount: openTabs.length,
      awakeCount: 0,
      sleepingCount: sleepingTabs.length,
      securityCheck: false,
      tabId: sleepingTabs[0].id,
      error: ''
    };
  }
  return {
    ok: true,
    state: 'missing',
    openCount: 0,
    awakeCount: 0,
    sleepingCount: 0,
    securityCheck: false,
    tabId: null,
    error: ''
  };
}

let inFlightBridgeEnsure = null;
async function ensureAffBridgeReady(options = {}) {
  if (inFlightBridgeEnsure) {
    return await inFlightBridgeEnsure;
  }

  const runPromise = (async () => {
    const openTabs = await findOpenAffTabs();
    const secTab = openTabs.find((t) => isSecurityOrLoginUrl(t.url));
    if (secTab) {
      const msg =
        'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน';
      circuitBreaker = { tripped: true, trippedAt: Date.now(), error: msg };
      if (options.focusIfSecurity && secTab.id) {
        await chrome.tabs.update(secTab.id, { active: true }).catch(() => {});
        if (secTab.windowId) await chrome.windows.update(secTab.windowId, { focused: true }).catch(() => {});
      }
      return {
        ok: false,
        state: 'security',
        securityCheck: true,
        wokeUp: false,
        openedNew: false,
        tabId: secTab.id,
        openAffTabCount: openTabs.length,
        error: msg
      };
    }

    if (circuitBreaker.tripped && options.focusIfSecurity) {
      circuitBreaker = { tripped: false, trippedAt: 0, error: '' };
      const target = openTabs[0];
      if (target?.id) {
        if (isTabSleeping(target)) await wakeAffTabIfSleeping(target);
        await chrome.tabs.update(target.id, { active: true }).catch(() => {});
        if (target.windowId) await chrome.windows.update(target.windowId, { focused: true }).catch(() => {});
      } else {
        const created = await chrome.tabs.create({
          url: 'https://affiliate.shopee.co.th/offer/product_offer',
          active: true
        });
        await waitForTabComplete(created.id, 8500);
        return {
          ok: true,
          state: 'ready',
          securityCheck: false,
          wokeUp: false,
          openedNew: true,
          tabId: created.id,
          openAffTabCount: 1
        };
      }
    }

    const awakeTab = openTabs.find((t) => !isTabSleeping(t));
    if (awakeTab) {
      circuitBreaker = { tripped: false, trippedAt: 0, error: '' };
      return {
        ok: true,
        state: 'ready',
        securityCheck: false,
        wokeUp: false,
        openedNew: false,
        tabId: awakeTab.id,
        openAffTabCount: openTabs.length
      };
    }

    const sleepingTab = openTabs.find((t) => isTabSleeping(t));
    if (sleepingTab) {
      const wakeRes = await wakeAffTabIfSleeping(sleepingTab);
      if (wakeRes?.securityCheck) {
        circuitBreaker = { tripped: true, trippedAt: Date.now(), error: wakeRes.error };
        if (options.focusIfSecurity && sleepingTab.id) {
          await chrome.tabs.update(sleepingTab.id, { active: true }).catch(() => {});
        }
        return {
          ok: false,
          state: 'security',
          securityCheck: true,
          wokeUp: Boolean(wakeRes.wokeUp),
          openedNew: false,
          tabId: sleepingTab.id,
          openAffTabCount: openTabs.length,
          error: wakeRes.error
        };
      }
      circuitBreaker = { tripped: false, trippedAt: 0, error: '' };
      return {
        ok: true,
        state: 'ready',
        securityCheck: false,
        wokeUp: Boolean(wakeRes?.wokeUp),
        openedNew: false,
        tabId: wakeRes?.tab?.id || sleepingTab.id,
        openAffTabCount: openTabs.length
      };
    }

    const created = await chrome.tabs.create({
      url: 'https://affiliate.shopee.co.th/offer/product_offer',
      active: Boolean(options.focusNew)
    });
    const loadRes = await waitForTabComplete(created.id, 8500);
    const createdTab = await chrome.tabs.get(created.id).catch(() => created);
    if (loadRes?.securityCheck || isSecurityOrLoginUrl(createdTab?.url)) {
      const msg = 'กรุณาผ่านด่านตรวจหรือล็อกอิน affiliate.shopee.co.th';
      circuitBreaker = { tripped: true, trippedAt: Date.now(), error: msg };
      if (options.focusIfSecurity) {
        await chrome.tabs.update(created.id, { active: true }).catch(() => {});
      }
      return {
        ok: false,
        state: 'security',
        securityCheck: true,
        wokeUp: false,
        openedNew: true,
        tabId: created.id,
        openAffTabCount: 1,
        error: msg
      };
    }
    await new Promise((r) => setTimeout(r, 750));
    circuitBreaker = { tripped: false, trippedAt: 0, error: '' };
    return {
      ok: true,
      state: 'ready',
      securityCheck: false,
      wokeUp: false,
      openedNew: true,
      tabId: created.id,
      openAffTabCount: 1
    };
  })();

  inFlightBridgeEnsure = runPromise;
  try {
    return await runPromise;
  } finally {
    inFlightBridgeEnsure = null;
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

async function sendToAffTabWithReinject(tabId, messagePayload) {
  try {
    const tabObj = await chrome.tabs.get(tabId).catch(() => null);
    if (!tabObj) return null;
    if (isSecurityOrLoginUrl(tabObj.url)) {
      return {
        ok: false,
        securityCheck: true,
        error: 'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
      };
    }
    if (isTabSleeping(tabObj)) {
      const wakeRes = await wakeAffTabIfSleeping(tabObj);
      if (wakeRes?.securityCheck) {
        return {
          ok: false,
          securityCheck: true,
          error: wakeRes.error
        };
      }
    }
  } catch (_e) {}

  try {
    return await chrome.tabs.sendMessage(tabId, messagePayload);
  } catch (_err) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/common/utils.js', 'src/shopee-affiliate.js']
      });
      await new Promise((r) => setTimeout(r, 180));
      return await chrome.tabs.sendMessage(tabId, messagePayload);
    } catch (_err2) {
      return null;
    }
  }
}

async function scrapeOfferDetailViaBgTab(itemId, partialData = null, existingBgTabId = null) {
  let tabId = existingBgTabId;
  let createdNewTab = false;
  try {
    if (!tabId) {
      const openTabs = await findOpenAffTabs();
      const inactiveTab = openTabs.find((t) => !t.active && !isSecurityOrLoginUrl(t.url));
      if (inactiveTab?.id) {
        tabId = inactiveTab.id;
      }
    }
    const targetUrl = `https://affiliate.shopee.co.th/offer/product_offer/${encodeURIComponent(itemId)}`;
    if (tabId) {
      await chrome.tabs.update(tabId, { url: targetUrl });
    } else {
      const created = await chrome.tabs.create({ url: targetUrl, active: false });
      tabId = created.id;
      createdNewTab = true;
    }

    const loadRes = await waitForTabComplete(tabId, 8000);
    if (loadRes?.securityCheck) {
      return {
        securityCheck: true,
        error: 'Shopee ขอตรวจสอบความปลอดภัย — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
      };
    }

    for (let poll = 0; poll < 8; poll++) {
      await new Promise((r) => setTimeout(r, 450));
      const hit = realOfferCache.get(itemId);
      if (hit?.data && isValidRealOfferData(hit.data) && Number(hit.data.extraRate) > 0) {
        const resolvedSold =
          partialData?.soldCount !== null && partialData?.soldCount !== undefined
            ? partialData.soldCount
            : (hit.data.soldCount !== undefined ? hit.data.soldCount : null);
        return {
          ...(partialData || {}),
          ...hit.data,
          soldCount: resolvedSold,
          soldSource: partialData?.soldSource || hit.data.soldSource || (resolvedSold !== null ? 'affiliate_offer_api' : 'unknown'),
          cacheSchemaV2: true
        };
      }
      const domRes = await sendToAffTabWithReinject(tabId, { action: 'GET_AFFILIATE_OFFER' });
      const d = domRes?.data;
      if (d && String(d.itemId || itemId) === itemId && (d.domTableVerified || Number(d.extraRate) > 0 || Number(d.baseRate) > 0)) {
        const resolvedSold =
          d.soldCount !== null && d.soldCount !== undefined
            ? d.soldCount
            : (partialData?.soldCount !== undefined ? partialData.soldCount : null);
        const merged = {
          ...(partialData || {}),
          ...d,
          itemId,
          shopId: d.shopId || partialData?.shopId || '',
          title: d.title || partialData?.title || '',
          price: Number(d.price || d.offerPrice) || Number(partialData?.price) || 0,
          offerPrice: Number(d.offerPrice || d.price) || Number(partialData?.price) || 0,
          soldCount: resolvedSold,
          soldSource: d.soldSource || partialData?.soldSource || (resolvedSold !== null ? 'dom_card' : 'unknown'),
          domTableVerified: true,
          hasRealCommission: true,
          realRateVerified: true,
          cacheSchemaV2: true
        };
        persistRealOfferCacheEntry(itemId, merged);
        return merged;
      }
    }
    return partialData;
  } catch (_e) {
    return partialData;
  } finally {
    if (createdNewTab && tabId) {
      chrome.tabs.remove(tabId).catch(() => {});
    }
  }
}

async function fetchRealAffOfferImpl(rawItemId, forceRefresh = false, options = {}) {
  await hydrateRealOfferCache();
  const itemId = String(rawItemId || '').replace(/[^0-9]/g, '');
  if (!itemId) {
    return { ok: false, error: 'ไม่พบ itemId ของสินค้า' };
  }
  const mode = options?.mode || 'single'; // 'single' | 'grid_auto' | 'grid_hover'
  const titleHint = String(options?.titleHint || '');
  const shopId = String(options?.shopId || '');

  if (forceRefresh) {
    realOfferCache.delete(itemId);
  } else {
    const hit = realOfferCache.get(itemId);
    if (hit) {
      if (isValidRealOfferData(hit.data) && Date.now() - hit.cachedAt < REAL_OFFER_TTL_MS) {
        return { ok: true, cached: true, cachedAt: hit.cachedAt, data: hit.data };
      }
      realOfferCache.delete(itemId);
      schedulePersistRealOfferCache();
    }
    try {
      const store = await chrome.storage.local.get(['activeAffOfferProduct']);
      const storedAff = store?.activeAffOfferProduct;
      if (
        storedAff &&
        String(storedAff.itemId || '') === itemId &&
        isValidRealOfferData(storedAff)
      ) {
        persistRealOfferCacheEntry(itemId, storedAff);
        return { ok: true, cached: true, cachedAt: Date.now(), data: storedAff };
      }
    } catch (_e) {}
  }

  if (mode === 'grid_auto') {
    if (circuitBreaker.tripped) {
      return {
        ok: false,
        securityCheck: true,
        circuitTripped: true,
        error: circuitBreaker.error || 'Shopee ขอตรวจสอบความปลอดภัย — ระบบเบรกอัตโนมัติชั่วคราว'
      };
    }
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    while (autoFetchTimestamps.length > 0 && autoFetchTimestamps[0] < oneHourAgo) {
      autoFetchTimestamps.shift();
    }
    if (autoFetchTimestamps.length >= HOURLY_AUTO_LIMIT) {
      return {
        ok: false,
        quotaExceeded: true,
        error: `ถึงเพดานเช็กอัตโนมัติ ${HOURLY_AUTO_LIMIT} ชิ้น/ชม. (ชี้หรือคลิกที่ป้ายเพื่อเช็กรายตัวได้)`
      };
    }
  }

  if (inFlightOfferFetches.has(itemId)) {
    return await inFlightOfferFetches.get(itemId);
  }

  const runPromise = (async () => {
    if (mode === 'grid_auto') {
      const jitterMs = 500 + Math.floor(Math.random() * 450);
      await new Promise((r) => setTimeout(r, jitterMs));
      autoFetchTimestamps.push(Date.now());
    }
    await waitAffRateLimit();

    // Tier 1: Query any open affiliate.shopee.co.th tab (prioritizing awake tabs & tabs already on itemId)
    const openTabs = await findOpenAffTabs();
    const sortedTabs = [...openTabs].sort((a, b) => {
      const aSleep = isTabSleeping(a) ? 1 : 0;
      const bSleep = isTabSleeping(b) ? 1 : 0;
      if (aSleep !== bSleep) return aSleep - bSleep;
      const aMatch = String(a.url || '').includes(itemId) ? 0 : 1;
      const bMatch = String(b.url || '').includes(itemId) ? 0 : 1;
      return aMatch - bMatch;
    });

    for (const tab of sortedTabs) {
      if (isSecurityOrLoginUrl(tab.url)) {
        const msg = 'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน';
        circuitBreaker = { tripped: true, trippedAt: Date.now(), error: msg };
        return {
          ok: false,
          securityCheck: true,
          circuitTripped: true,
          error: msg
        };
      }
      const resp = await sendToAffTabWithReinject(tab.id, {
        action: 'FETCH_REAL_OFFER_IN_AFF_TAB',
        itemId,
        titleHint,
        shopId
      });
      if (resp?.securityCheck) {
        circuitBreaker = { tripped: true, trippedAt: Date.now(), error: resp.error };
        return { ok: false, securityCheck: true, circuitTripped: true, error: resp.error };
      }
      if (resp?.ok && resp.data && !resp.data.rateError && (resp.data.realRateVerified || resp.data.baseRate >= 0)) {
        circuitBreaker = { tripped: false, trippedAt: 0, error: '' };
        let finalData = resp.data;
        if (
          mode === 'single' &&
          (forceRefresh || Number(finalData.price || finalData.offerPrice) > 0) &&
          Number(finalData.extraRate) <= 0 &&
          (forceRefresh || !finalData.hasRealCommission) &&
          !finalData.domTableVerified
        ) {
          const domFallback = await scrapeOfferDetailViaBgTab(itemId, finalData, !tab.active ? tab.id : null);
          if (domFallback?.securityCheck) {
            circuitBreaker = { tripped: true, trippedAt: Date.now(), error: domFallback.error };
            return { ok: false, securityCheck: true, circuitTripped: true, error: domFallback.error };
          }
          if (domFallback) finalData = domFallback;
        }
        if (isValidRealOfferData(finalData)) {
          persistRealOfferCacheEntry(itemId, finalData);
        }
        return { ok: true, cached: false, cachedAt: Date.now(), data: finalData };
      }
      if (resp?.ok && resp.data?.rateError && openTabs.length === 1) {
        return { ok: false, rateError: true, error: resp.data.error || 'Shopee API Rate Error' };
      }
    }

    // Rule #4: Never open background tabs repeatedly in grid_auto mode
    if (mode === 'grid_auto') {
      return {
        ok: false,
        needAffTab: openTabs.length === 0,
        error: openTabs.length === 0
          ? 'เปิดแท็บ affiliate.shopee.co.th ทิ้งไว้ 1 แท็บเพื่อดึงเรทจริงอัตโนมัติ'
          : 'ดึงเรทจริงจากแท็บ AFF ไม่สำเร็จชั่วคราว'
      };
    }

    // Tier 2: Open safe root /offer/product_offer (NEVER /product_offer/<itemId> unless Tier 1 confirms product exists!)
    // Keep this single reusable background bridge tab open so subsequent requests finish in ~200ms via Tier 1
    let bgTab = null;
    let shouldCloseBgTab = false;
    try {
      bgTab = await chrome.tabs.create({
        url: 'https://affiliate.shopee.co.th/offer/product_offer',
        active: false
      });

      const loadRes = await waitForTabComplete(bgTab.id, 8500);
      if (loadRes?.securityCheck) {
        shouldCloseBgTab = true;
        circuitBreaker = {
          tripped: true,
          trippedAt: Date.now(),
          error: 'Shopee ขอตรวจสอบความปลอดภัยหรือยังไม่ได้ล็อกอิน — กรุณาเปิดหน้า affiliate.shopee.co.th ผ่านด่านตรวจก่อน'
        };
        return { ok: false, securityCheck: true, circuitTripped: true, error: circuitBreaker.error };
      }

      // Allow content script & MAIN world bridge to initialize on root offer page
      await new Promise((r) => setTimeout(r, 750));

      let resp = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        resp = await sendToAffTabWithReinject(bgTab.id, {
          action: 'FETCH_REAL_OFFER_IN_AFF_TAB',
          itemId,
          titleHint,
          shopId
        });
        if (resp) break;
        await new Promise((r) => setTimeout(r, 450));
      }

      if (resp?.securityCheck) {
        shouldCloseBgTab = true;
        circuitBreaker = { tripped: true, trippedAt: Date.now(), error: resp.error };
        return { ok: false, securityCheck: true, circuitTripped: true, error: resp.error };
      }
      if (resp?.ok && resp.data && !resp.data.rateError && (resp.data.realRateVerified || resp.data.baseRate >= 0)) {
        circuitBreaker = { tripped: false, trippedAt: 0, error: '' };
        let finalData = resp.data;
        if (
          mode === 'single' &&
          (forceRefresh || Number(finalData.price || finalData.offerPrice) > 0) &&
          Number(finalData.extraRate) <= 0 &&
          (forceRefresh || !finalData.hasRealCommission) &&
          !finalData.domTableVerified
        ) {
          const domFallback = await scrapeOfferDetailViaBgTab(itemId, finalData, bgTab.id);
          if (domFallback?.securityCheck) {
            shouldCloseBgTab = true;
            circuitBreaker = { tripped: true, trippedAt: Date.now(), error: domFallback.error };
            return { ok: false, securityCheck: true, circuitTripped: true, error: domFallback.error };
          }
          if (domFallback) finalData = domFallback;
        }
        if (isValidRealOfferData(finalData)) {
          persistRealOfferCacheEntry(itemId, finalData);
        }
        return { ok: true, cached: false, cachedAt: Date.now(), data: finalData };
      }
      if (resp?.ok && resp.data?.rateError) {
        shouldCloseBgTab = true;
        return { ok: false, rateError: true, error: resp.data.error || 'Shopee API Rate Error' };
      }
      shouldCloseBgTab = true;
      return {
        ok: false,
        error: 'ไม่พบข้อมูลคอมมิชชันในหน้า affiliate.shopee.co.th (ตรวจสอบการล็อกอินหรือลองใหม่อีกครั้ง)'
      };
    } catch (err) {
      shouldCloseBgTab = true;
      return { ok: false, error: err?.message || String(err) };
    } finally {
      if (shouldCloseBgTab && bgTab?.id) {
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
    const resp = await sendToAffTabWithReinject(tab.id, {
      action: 'GENERATE_SHORTLINK_IN_AFF_TAB',
      originalLink: targetUrl,
      subIds
    });
    if (resp) return resp;
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
    const resp = await sendToAffTabWithReinject(bgTab.id, {
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

async function batchGenerateAffShortLinksImpl(items = []) {
  if (!Array.isArray(items) || !items.length) {
    return { ok: true, items: [] };
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
    const resp = await sendToAffTabWithReinject(tab.id, {
      action: 'BATCH_GENERATE_SHORTLINKS_IN_AFF_TAB',
      items
    });
    if (resp) return resp;
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
    await new Promise((r) => setTimeout(r, 750));
    const resp = await sendToAffTabWithReinject(bgTab.id, {
      action: 'BATCH_GENERATE_SHORTLINKS_IN_AFF_TAB',
      items
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

function safeDecodeUriComponent(val) {
  const s = String(val || '');
  try {
    return decodeURIComponent(s);
  } catch (_e) {
    return s.replace(/https?%3A%2F%2F[^"'\s<>\\]+/gi, (enc) => {
      try {
        return decodeURIComponent(enc);
      } catch (_e2) {
        return enc;
      }
    });
  }
}

function decodeUnicodeEscapes(s) {
  return String(s || '')
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\\//g, '/');
}

function decodeHtmlEntities(s) {
  return String(s || '')
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '·')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseCompactFbCount(str) {
  const s = String(str || '').replace(/,/g, '').trim();
  const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(พัน|หมื่น|แสน|ล้าน|K|M|B)?/i);
  if (!m) return 0;
  let n = parseFloat(m[1]) || 0;
  const unit = (m[2] || '').toUpperCase();
  if (unit === 'พัน' || unit === 'K') n *= 1000;
  else if (unit === 'หมื่น') n *= 10000;
  else if (unit === 'แสน') n *= 100000;
  else if (unit === 'ล้าน' || unit === 'M') n *= 1000000;
  else if (unit === 'B') n *= 1000000000;
  return Math.round(n);
}

function isInvalidCompetitorPageName(name) {
  const s = String(name || '').trim();
  if (!s || s.length < 2) return true;
  if (/^facebook$/i.test(s)) return true;
  if (/^[\d.,]+\s*(?:K|M|B|พัน|หมื่น|แสน|ล้าน)?$/i.test(s)) return true;
  if (/^(?:reels?|watch|แชร์|ติดตาม|follow|ถูกใจ|ความคิดเห็น|ความรู้สึก|ยอดดู|views?)$/i.test(s)) return true;
  return false;
}

function extractFbReelIdFromUrl(rawUrl) {
  const s = String(rawUrl || '').trim();
  const m = s.match(/\/(?:reel|videos)\/(\d+)/i) || s.match(/[?&]v=(\d+)/i);
  return m ? m[1] : '';
}

function normalizeShopeeShortUrl(rawStr) {
  let candidate = decodeUnicodeEscapes(rawStr).trim().replace(/[),.]+$/, '');
  if (!candidate) return '';
  candidate = safeDecodeUriComponent(candidate);
  if (/l\.facebook\.com\/l\.php|lm\.facebook\.com\/l\.php|facebook\.com\/flx\/warn/i.test(candidate)) {
    try {
      const uObj = new URL(candidate);
      const inner = uObj.searchParams.get('u');
      if (inner) candidate = safeDecodeUriComponent(inner);
    } catch (_e) {
      const um = candidate.match(/[?&]u=([^&\s"'<>\\]+)/i);
      if (um) candidate = safeDecodeUriComponent(um[1]);
    }
  }
  const m = candidate.match(
    /https?:\/\/(?:(?:s|th|shp)\.)?shopee\.co\.th\/[A-Za-z0-9_./?=&%-]+|https?:\/\/shp\.ee\/[A-Za-z0-9_-]+/i
  );
  if (!m) return '';
  let finalUrl = m[0].replace(/[),.]+$/, '');
  try {
    const parsed = new URL(finalUrl);
    if (/^(?:s\.shopee\.co\.th|shp\.ee)$/i.test(parsed.hostname)) {
      const slugMatch = parsed.pathname.match(/^\/([A-Za-z0-9_-]+)/);
      if (slugMatch) {
        finalUrl = `${parsed.protocol}//${parsed.hostname}/${slugMatch[1]}`;
      }
    }
  } catch (_e) {}
  return finalUrl;
}

function extractShopeeShopItemFromUrl(rawUrl) {
  const candidates = [String(rawUrl || '')];
  const dec = safeDecodeUriComponent(candidates[0]);
  if (dec !== candidates[0]) candidates.push(dec);
  for (const u of candidates) {
    const m =
      u.match(/shopee\.co\.th\/(?:opaanlp|product)\/(\d+)\/(\d+)/i) ||
      u.match(/shopee\.co\.th\/universal-link\/product\/(\d+)\/(\d+)/i) ||
      u.match(/shopee\.co\.th\/[^/?#]*-i\.(\d+)\.(\d+)/i);
    if (m) {
      return {
        shop_id: m[1],
        item_id: m[2],
        clean_product_url: `https://shopee.co.th/product/${m[1]}/${m[2]}`,
        aff_offer_url: `https://affiliate.shopee.co.th/offer/product_offer/${m[2]}`
      };
    }
    try {
      const parsed = new URL(u);
      const sId = parsed.searchParams.get('shop_id') || parsed.searchParams.get('shopid') || '';
      const iId = parsed.searchParams.get('item_id') || parsed.searchParams.get('itemid') || '';
      if (/^\d+$/.test(sId) && /^\d+$/.test(iId)) {
        return {
          shop_id: sId,
          item_id: iId,
          clean_product_url: `https://shopee.co.th/product/${sId}/${iId}`,
          aff_offer_url: `https://affiliate.shopee.co.th/offer/product_offer/${iId}`
        };
      }
    } catch (_e) {}
  }
  return null;
}

function extractFbMetricsFromHtml(rawHtml) {
  const raw = String(rawHtml || '');
  const ogMetaM =
    raw.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    raw.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title["']/i) ||
    raw.match(/<meta[^>]+name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
    raw.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:title["']/i);
  const ogTitle = ogMetaM ? decodeHtmlEntities(decodeUnicodeEscapes(ogMetaM[1])) : '';

  // 1) Parse views from og:title (e.g., "839K views · 9.3K reactions" or "ยอดดู 8.3 แสน ครั้ง · 9.3 พัน ความรู้สึก")
  let ogViews = 0;
  if (ogTitle) {
    const enViewM = ogTitle.match(/([\d.,]+\s*(?:[KMB])?)\s*(?:views?|plays?)\b/i);
    const thViewM = ogTitle.match(/(?:ยอดดู|ยอดรับชม|การรับชม|รับชม)\s*([\d.,]+\s*(?:พัน|หมื่น|แสน|ล้าน)?)\s*(?:ครั้ง)?/i);
    if (enViewM) ogViews = parseCompactFbCount(enViewM[1]);
    else if (thViewM) ogViews = parseCompactFbCount(thViewM[1]);
  }

  // 2) Fallback JSON view counts (video_view_count / viewCount belong to main video; avoid sidebar play_count)
  let jsonViews = 0;
  const jsonViewM =
    raw.match(/"video_view_count"\s*:\s*(\d+)/) ||
    raw.match(/\bviewCount\s*:\s*["']([\d,.]+)["']/);
  if (jsonViewM) {
    jsonViews = parseInt(String(jsonViewM[1]).replace(/,/g, ''), 10) || 0;
  }

  // Prefer og:title view count (matches FB UI Reel views), fallback to video_view_count
  const fbViews = ogViews > 0 ? ogViews : jsonViews;

  // 3) Duration in seconds from playable_duration_in_ms
  let durationSec = 0;
  const durM = raw.match(/"playable_duration_in_ms"\s*:\s*(\d+)/);
  if (durM) {
    const ms = parseInt(durM[1], 10) || 0;
    if (ms > 0) durationSec = Math.round((ms / 1000) * 10) / 10;
  }

  // 4) Reliable Competitor Page Name (JSON owner/Page -> og:title tail -> <title>)
  let competitorPage = '';
  const jsonPageM =
    raw.match(/"__typename"\s*:\s*"Page"[^}]{0,300}?"name"\s*:\s*"([^"]+)"/) ||
    raw.match(/"owning_profile"\s*:\s*\{[^}]{0,300}?"name"\s*:\s*"([^"]+)"/) ||
    raw.match(/"owner"\s*:\s*\{[^}]{0,300}?"name"\s*:\s*"([^"]+)"/) ||
    raw.match(/"ownerName"\s*:\s*"([^"]+)"/);
  if (jsonPageM && jsonPageM[1]) {
    const candidate = decodeHtmlEntities(decodeUnicodeEscapes(jsonPageM[1])).trim().slice(0, 80);
    if (!isInvalidCompetitorPageName(candidate)) {
      competitorPage = candidate;
    }
  }
  if (!competitorPage && ogTitle) {
    const parts = ogTitle.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const tail = parts[parts.length - 1].replace(/\s*-\s*Facebook.*$/i, '').trim().slice(0, 80);
      if (!isInvalidCompetitorPageName(tail) && (parts.length >= 3 || /(?:views?|reactions?|ความรู้สึก|ยอดดู|แชร์)/i.test(parts[0]))) {
        competitorPage = tail;
      }
    }
  }
  if (!competitorPage) {
    const titleM = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleM && titleM[1]) {
      const cleanedTitle = decodeHtmlEntities(decodeUnicodeEscapes(titleM[1]))
        .replace(/^\(\d+\)\s*/, '')
        .replace(/\| Facebook.*$/i, '')
        .replace(/-\s*Facebook.*$/i, '')
        .trim()
        .slice(0, 80);
      if (!isInvalidCompetitorPageName(cleanedTitle)) {
        competitorPage = cleanedTitle;
      }
    }
  }

  // Fallback reactions/shares from og:title if JSON unified_reactors is absent (e.g. watch/?v= HTML)
  let ogReactions = 0;
  if (ogTitle) {
    const enReactM = ogTitle.match(/([\d.,]+\s*(?:[KMB])?)\s*reactions?\b/i);
    const thReactM = ogTitle.match(/([\d.,]+\s*(?:พัน|หมื่น|แสน|ล้าน)?)\s*ความรู้สึก/);
    if (enReactM) ogReactions = parseCompactFbCount(enReactM[1]);
    else if (thReactM) ogReactions = parseCompactFbCount(thReactM[1]);
  }

  return {
    fb_views: fbViews,
    fb_views_source: ogViews > 0 ? 'og' : jsonViews > 0 ? 'json' : '',
    og_reactions: ogReactions,
    duration_sec: durationSec,
    competitor_page: competitorPage
  };
}

function extractShopeeTagFromHtml(rawHtml) {
  const raw = String(rawHtml || '');
  const reelBarReactM = raw.match(/"unified_reactors"\s*:\s*\{\s*"count"\s*:\s*(\d+)[\s\S]{0,400}?"__module_operation_FBReelsFeedbackBar_feedback"/);
  const reactM = reelBarReactM || raw.match(/"unified_reactors"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
  const reelBarCommShareM = raw.match(/"total_comment_count"\s*:\s*(\d+)[\s\S]{0,200}?"share_count_reduced"\s*:\s*"([^"]+)"[\s\S]{0,80}?"fb_reel_react_button"/);
  const commM = reelBarCommShareM ? [null, reelBarCommShareM[1]] : raw.match(/"total_comment_count"\s*:\s*(\d+)/);
  const shareM = reelBarCommShareM ? [null, reelBarCommShareM[2]] : raw.match(/"share_count_reduced"\s*:\s*"([^"]+)"/);
  const fbMeta = extractFbMetricsFromHtml(raw);
  const jsonReact = reactM ? parseInt(reactM[1], 10) : 0;
  const bestReactions = fbMeta.og_reactions > 0 && jsonReact < fbMeta.og_reactions * 0.5 ? fbMeta.og_reactions : (jsonReact || fbMeta.og_reactions || 0);

  const allLinks = [];
  const seen = new Set();
  let shortUrl = '';
  let tagTitle = '';

  const pushLink = (url, titleCandidate = '') => {
    if (!url) return;
    if (!seen.has(url)) {
      seen.add(url);
      allLinks.push(url);
    }
    if (!shortUrl) shortUrl = url;
    if (!tagTitle && titleCandidate) tagTitle = titleCandidate.trim().slice(0, 180);
  };

  for (const lm of raw.matchAll(/"(?:link_uri|external_url)"\s*:\s*"([^"]+)"/g)) {
    const cleaned = normalizeShopeeShortUrl(lm[1]);
    if (cleaned) {
      const idx = lm.index || 0;
      const chunk = decodeUnicodeEscapes(raw.slice(Math.max(0, idx - 600), Math.min(raw.length, idx + 2200)));
      const tM = chunk.match(/"title"\s*:\s*"([^"]+)"/);
      pushLink(cleaned, tM ? decodeUnicodeEscapes(tM[1]) : '');
    }
  }

  if (!shortUrl) {
    const norm = decodeUnicodeEscapes(raw);
    for (const m of norm.matchAll(
      /https?:\/\/(?:(?:s|th|shp)\.)?shopee\.co\.th\/[A-Za-z0-9_./?=&%-]+|https?:\/\/shp\.ee\/[A-Za-z0-9_-]+|https?%3A%2F%2F(?:(?:s|th|shp)\.)?shopee\.co\.th%2F[A-Za-z0-9_.%/-]+/gi
    )) {
      const cleaned = normalizeShopeeShortUrl(m[0]);
      if (cleaned) pushLink(cleaned, '');
    }
  }

  const prioritizeShort = allLinks.find((u) => /s\.shopee\.co\.th|shp\.ee/i.test(u)) || shortUrl || '';
  return {
    competitor_short_url: prioritizeShort,
    all_shopee_links: allLinks,
    product_tag_title: tagTitle,
    competitor_page: fbMeta.competitor_page,
    fb_views: fbMeta.fb_views,
    fb_views_source: fbMeta.fb_views_source,
    duration_sec: fbMeta.duration_sec,
    fb_reactions: bestReactions,
    fb_comments: commM ? parseInt(commM[1], 10) : 0,
    fb_shares: shareM ? decodeUnicodeEscapes(shareM[1]) : '0'
  };
}

async function scrapeFbWatchFallback(videoId) {
  if (!videoId) return {};
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const resp = await fetch(`https://www.facebook.com/watch/?v=${videoId}`, {
      credentials: 'omit',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!resp.ok) return {};
    const raw = await resp.text();
    return extractShopeeTagFromHtml(raw);
  } catch (_e) {
    return {};
  }
}

async function scrapeFbReelHtmlAuthenticated(reelUrl) {
  const target = String(reelUrl || '').trim();
  if (!target || !/facebook\.com|fb\.watch/i.test(target)) return {};
  let parsed = {};
  let resolvedUrl = target;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(target, {
      credentials: 'include',
      redirect: 'follow',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8'
      },
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (resp.url) resolvedUrl = resp.url;
    if (resp.ok) {
      const raw = await resp.text();
      parsed = extractShopeeTagFromHtml(raw);
    }
  } catch (_e) {}

  const videoId = extractFbReelIdFromUrl(resolvedUrl) || extractFbReelIdFromUrl(target);
  const needsWatchFallback =
    videoId &&
    !/watch\/?\?v=/i.test(target) &&
    (!parsed.fb_views || !parsed.duration_sec || isInvalidCompetitorPageName(parsed.competitor_page) || !parsed.competitor_short_url);

  if (needsWatchFallback) {
    const watchData = await scrapeFbWatchFallback(videoId);
    if (watchData.fb_views > 0 && (!parsed.fb_views || watchData.fb_views_source === 'og')) {
      parsed.fb_views = Math.max(Number(parsed.fb_views) || 0, Number(watchData.fb_views) || 0);
      parsed.fb_views_source = watchData.fb_views_source || parsed.fb_views_source;
    }
    if (!parsed.duration_sec && watchData.duration_sec) {
      parsed.duration_sec = watchData.duration_sec;
    }
    if (isInvalidCompetitorPageName(parsed.competitor_page) && !isInvalidCompetitorPageName(watchData.competitor_page)) {
      parsed.competitor_page = watchData.competitor_page;
    }
    if (!parsed.competitor_short_url && watchData.competitor_short_url) {
      parsed.competitor_short_url = watchData.competitor_short_url;
      parsed.all_shopee_links = watchData.all_shopee_links || parsed.all_shopee_links || [];
    }
    if (!parsed.product_tag_title && watchData.product_tag_title) {
      parsed.product_tag_title = watchData.product_tag_title;
    }
    if (!parsed.fb_reactions && watchData.fb_reactions) parsed.fb_reactions = watchData.fb_reactions;
    if (!parsed.fb_comments && watchData.fb_comments) parsed.fb_comments = watchData.fb_comments;
    if ((!parsed.fb_shares || parsed.fb_shares === '0') && watchData.fb_shares) parsed.fb_shares = watchData.fb_shares;
  }

  return parsed;
}

async function resolveShopeeShortUrlInExt(shortUrl) {
  const clean = String(shortUrl || '').trim();
  if (!clean || (!clean.includes('shopee.co.th') && !clean.includes('shp.ee'))) return {};
  const direct = extractShopeeShopItemFromUrl(clean);
  if (direct) return direct;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const resp = await fetch(clean, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (resp.url) {
      const hit = extractShopeeShopItemFromUrl(resp.url);
      if (hit) return hit;
    }
    const html = await resp.text().catch(() => '');
    if (html) {
      const urlHit =
        html.match(/https?:\/\/(?:www\.|th\.)?shopee\.co\.th\/(?:opaanlp|product|universal-link\/product)\/\d+\/\d+/i) ||
        html.match(/https?:\/\/(?:www\.|th\.)?shopee\.co\.th\/[^"'\s<>\\]*-i\.\d+\.\d+/i);
      if (urlHit) {
        const hit = extractShopeeShopItemFromUrl(urlHit[0]);
        if (hit) return hit;
      }
    }
  } catch (_e) {}
  return {};
}

async function scrapeActiveFacebookReelTabImpl(explicitTabId) {
  let tab = null;
  if (explicitTabId) {
    tab = await chrome.tabs.get(explicitTabId).catch(() => null);
  }
  if (!tab) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
    tab = activeTab || null;
  }
  if (!tab || !tab.url) {
    throw new Error('ไม่พบแท็บที่เปิดอยู่');
  }
  if (!/facebook\.com|fb\.watch/i.test(tab.url)) {
    throw new Error('แท็บปัจจุบันไม่ใช่หน้า Facebook Reel (กรุณาเปิดหน้าคลิป Facebook Reel ก่อนกดดึง)');
  }

  const cleanFbReelUrl = (rawUrl) => {
    try {
      const u = new URL(rawUrl);
      u.searchParams.delete('fbclid');
      u.searchParams.delete('mibextid');
      u.searchParams.delete('s');
      return u.toString();
    } catch (_e) {
      return rawUrl;
    }
  };

  const cleanTabReelUrl = cleanFbReelUrl(tab.url);
  const isReelOrVideoUrl = /\/(?:reel|share\/r|videos)\/|watch/i.test(cleanTabReelUrl);

  const [domScraped, authScraped] = await Promise.all([
    (async () => {
      if (!chrome.scripting?.executeScript || !tab.id) return null;
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const shopeeLinks = [];
            const seenLinks = new Set();
            let productTagTitle = '';

            const safeDec = (v) => {
              try {
                return decodeURIComponent(v);
              } catch (_e) {
                return String(v || '').replace(/https?%3A%2F%2F[^"'\s<>\\]+/gi, (enc) => {
                  try { return decodeURIComponent(enc); } catch (_e2) { return enc; }
                });
              }
            };

            const decUni = (s) =>
              String(s || '')
                .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
                .replace(/\\\//g, '/');

            const addShopeeUrl = (raw, labelCandidate = '') => {
              if (!raw) return;
              let cleaned = safeDec(decUni(raw).trim().replace(/[),.]+$/, ''));
              if (/l\.facebook\.com\/l\.php|lm\.facebook\.com\/l\.php|facebook\.com\/flx\/warn/i.test(cleaned)) {
                try {
                  const uObj = new URL(cleaned);
                  const inner = uObj.searchParams.get('u');
                  if (inner) cleaned = safeDec(inner);
                } catch (_e) {
                  const um = cleaned.match(/[?&]u=([^&\s"'<>\\]+)/i);
                  if (um) cleaned = safeDec(um[1]);
                }
              }
              const m = cleaned.match(
                /https?:\/\/(?:(?:s|th|shp)\.)?shopee\.co\.th\/[A-Za-z0-9_./?=&%-]+|https?:\/\/shp\.ee\/[A-Za-z0-9_-]+/i
              );
              if (m) {
                let finalUrl = m[0].replace(/[),.]+$/, '');
                try {
                  const parsed = new URL(finalUrl);
                  if (/^(?:s\.shopee\.co\.th|shp\.ee)$/i.test(parsed.hostname)) {
                    const slugMatch = parsed.pathname.match(/^\/([A-Za-z0-9_-]+)/);
                    if (slugMatch) finalUrl = `${parsed.protocol}//${parsed.hostname}/${slugMatch[1]}`;
                  }
                } catch (_e) {}
                if (!seenLinks.has(finalUrl)) {
                  seenLinks.add(finalUrl);
                  shopeeLinks.push(finalUrl);
                }
                if (!productTagTitle && labelCandidate && labelCandidate.length >= 4 && !/https?:\/\//i.test(labelCandidate)) {
                  productTagTitle = decUni(labelCandidate).replace(/\s+/g, ' ').trim().slice(0, 180);
                }
              }
            };

            // 1. Scan anchors & interactive elements (Product Tags on Reels + Pinned Comments)
            document.querySelectorAll('a[href], [role="link"], [role="button"]').forEach((el) => {
              const href = el.getAttribute('href') || el.getAttribute('data-lynx-uri') || '';
              const txt = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim();
              if (/shopee\.co\.th|shp\.ee|l\.facebook\.com\/l\.php|lm\.facebook\.com\/l\.php|flx\/warn/i.test(href)) {
                addShopeeUrl(href, txt);
              }
              // Bounded React Fiber props walk near interactive tags
              for (const k of Object.keys(el)) {
                if (!k.startsWith('__reactProps$') && !k.startsWith('__reactFiber$')) continue;
                try {
                  const seenObjs = new Set();
                  const stack = [{ obj: el[k], depth: 0 }];
                  let visited = 0;
                  while (stack.length && visited < 120) {
                    const { obj, depth } = stack.pop();
                    if (!obj || typeof obj !== 'object' || seenObjs.has(obj) || depth > 5) continue;
                    seenObjs.add(obj);
                    visited++;
                    if (typeof obj.link_uri === 'string' && /shopee\.co\.th|shp\.ee/i.test(obj.link_uri)) {
                      addShopeeUrl(obj.link_uri, obj.title || txt);
                    }
                    if (typeof obj.href === 'string' && /shopee\.co\.th|shp\.ee|l\.facebook\.com\/l\.php/i.test(obj.href)) {
                      addShopeeUrl(obj.href, txt);
                    }
                    for (const pk of Object.keys(obj)) {
                      if (pk === 'return' || pk === '_owner' || pk === 'stateNode') continue;
                      const v = obj[pk];
                      if (v && typeof v === 'object') stack.push({ obj: v, depth: depth + 1 });
                    }
                  }
                } catch (_e) {}
              }
            });

            // 2. Scan visible body text (in case Shopee shortlink is plain text or inside expanded comments)
            const bodyText = document.body ? document.body.innerText || '' : '';
            const regexAll = /https?:\/\/(?:(?:s|th|shp)\.)?shopee\.co\.th\/[A-Za-z0-9_./?=&-]+|https?:\/\/shp\.ee\/[A-Za-z0-9_-]+/gi;
            let match;
            while ((match = regexAll.exec(bodyText)) !== null) {
              addShopeeUrl(match[0], '');
            }

            // 3. Scan ALL inline JSON scripts for "link_uri" / "external_url" (Facebook Reel embedded Product Tag payload!)
            document.querySelectorAll('script').forEach((scr) => {
              const txt = scr.textContent || '';
              if (!txt.includes('shopee.co.th') && !txt.includes('shp.ee')) return;
              for (const lm of txt.matchAll(/"(?:link_uri|external_url)"\s*:\s*"([^"]+)"/g)) {
                const idx = lm.index || 0;
                const chunk = decUni(txt.slice(Math.max(0, idx - 600), Math.min(txt.length, idx + 2200)));
                const tM = chunk.match(/"title"\s*:\s*"([^"]+)"/);
                addShopeeUrl(lm[1], tM ? tM[1] : '');
              }
              const norm = decUni(txt);
              for (const sm of norm.matchAll(/https?:\/\/(?:(?:s|th|shp)\.)?shopee\.co\.th\/[A-Za-z0-9_./?=&%-]+|https?:\/\/shp\.ee\/[A-Za-z0-9_-]+/gi)) {
                addShopeeUrl(sm[0], '');
              }
            });

            // 4. Extract Competitor Page Name (never accept compact metric strings like "10K" or "4.4K")
            const isBadPageName = (val) => {
              const s = String(val || '').trim();
              if (!s || s.length < 2) return true;
              if (/^facebook$/i.test(s)) return true;
              if (/^[\d.,]+\s*(?:K|M|B|พัน|หมื่น|แสน|ล้าน)?$/i.test(s)) return true;
              if (/^(?:reels?|watch|แชร์|ติดตาม|follow|ถูกใจ|ความคิดเห็น|ความรู้สึก|ยอดดู|views?)$/i.test(s)) return true;
              return false;
            };
            let competitorPage = '';
            const headerLinks = document.querySelectorAll('h2 a[role="link"], h3 a[role="link"], a[role="link"] strong, a[aria-label][href*="facebook.com/"]');
            for (const el of headerLinks) {
              const t = (el.innerText || el.textContent || '').split('\n')[0].trim();
              if (t && t.length <= 70 && !isBadPageName(t)) {
                competitorPage = t;
                break;
              }
            }
            if (!competitorPage) {
              const cleanedDocTitle = document.title
                .replace(/^\(\d+\)\s*/, '')
                .replace(/\| Facebook.*$/i, '')
                .replace(/-\s*Facebook.*$/i, '')
                .trim()
                .slice(0, 80);
              if (!isBadPageName(cleanedDocTitle)) competitorPage = cleanedDocTitle;
            }

            // 5. Extract Reel Caption
            let captionFull = '';
            const dirEls = Array.from(document.querySelectorAll('div[dir="auto"], span[dir="auto"]'));
            for (const el of dirEls) {
              const t = (el.innerText || '').trim();
              if (t.length >= 15 && t.length <= 600 && t !== competitorPage && !/เขียนความคิดเห็น|ตอบกลับ|ดูเพิ่มเติม$/i.test(t)) {
                if (t.length > captionFull.length) {
                  captionFull = t;
                }
              }
            }

            // 6. Engagement metrics (Views + Reactions + Comments + Shares + Duration)
            let fbViews = 0;
            let fbReactions = 0;
            let fbComments = 0;
            let fbShares = '0';
            let durationSec = 0;
            const parseCompactCount = (str) => {
              const s = String(str || '').replace(/,/g, '').trim();
              const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(พัน|หมื่น|แสน|ล้าน|K|M|B)?/i);
              if (!m) return 0;
              let n = parseFloat(m[1]) || 0;
              const unit = (m[2] || '').toUpperCase();
              if (unit === 'พัน' || unit === 'K') n *= 1000;
              else if (unit === 'หมื่น') n *= 10000;
              else if (unit === 'แสน') n *= 100000;
              else if (unit === 'ล้าน' || unit === 'M') n *= 1000000;
              else if (unit === 'B') n *= 1000000000;
              return Math.round(n);
            };

            // 6a. Views / duration from inline JSON scripts & video element
            document.querySelectorAll('script').forEach((scr) => {
              const txt = scr.textContent || '';
              if (!fbViews) {
                const vm = txt.match(/"video_view_count"\s*:\s*(\d+)/);
                if (vm) fbViews = parseInt(vm[1], 10) || 0;
              }
              if (!durationSec) {
                const dm = txt.match(/"playable_duration_in_ms"\s*:\s*(\d+)/);
                if (dm) {
                  const ms = parseInt(dm[1], 10) || 0;
                  if (ms > 0) durationSec = Math.round((ms / 1000) * 10) / 10;
                }
              }
            });
            if (!durationSec) {
              const vidEl = document.querySelector('video');
              if (vidEl && Number.isFinite(vidEl.duration) && vidEl.duration > 0 && vidEl.duration < 3600) {
                durationSec = Math.round(vidEl.duration * 10) / 10;
              }
            }

            // 6b. Aria-labels for reactions, comments, shares, views
            document.querySelectorAll('[aria-label]').forEach((el) => {
              const lbl = el.getAttribute('aria-label') || '';
              if (/ถูกใจ|ความรู้สึก|like|reaction/i.test(lbl) && /\d/.test(lbl) && !fbReactions) {
                fbReactions = parseCompactCount(lbl);
              } else if (/ความคิดเห็น|comment/i.test(lbl) && /\d/.test(lbl) && !fbComments) {
                fbComments = parseCompactCount(lbl);
              } else if (/แชร์|share/i.test(lbl) && /\d/.test(lbl) && fbShares === '0') {
                const m = lbl.match(/([0-9.,]+\s*(?:พัน|หมื่น|แสน|ล้าน|K|M)?)/i);
                if (m) fbShares = m[1].trim();
              } else if (/(?:ยอดดู|ยอดรับชม|การรับชม|รับชม|views?|plays?)/i.test(lbl) && /\d/.test(lbl) && !fbViews) {
                const vm =
                  lbl.match(/([\d.,]+\s*(?:[KMB]|พัน|หมื่น|แสน|ล้าน)?)\s*(?:views?|plays?)/i) ||
                  lbl.match(/(?:ยอดดู|ยอดรับชม|การรับชม|รับชม)\s*([\d.,]+\s*(?:พัน|หมื่น|แสน|ล้าน)?)/i);
                if (vm) fbViews = parseCompactCount(vm[1]);
              }
            });

            // 6c. Fallback visible view count badges in Reel UI (only short leaf nodes)
            if (!fbViews) {
              for (const el of document.querySelectorAll('span, div')) {
                if (el.children.length > 0) continue;
                const txt = (el.textContent || '').trim();
                if (!txt || txt.length > 40) continue;
                const vm =
                  txt.match(/^([\d.,]+\s*(?:[KMB]|พัน|หมื่น|แสน|ล้าน)?)\s*(?:views?|plays?)$/i) ||
                  txt.match(/^(?:ยอดดู|ยอดรับชม|การรับชม|รับชม)\s*([\d.,]+\s*(?:พัน|หมื่น|แสน|ล้าน)?)\s*(?:ครั้ง)?$/i);
                if (vm) {
                  fbViews = parseCompactCount(vm[1]);
                  if (fbViews > 0) break;
                }
              }
            }

            const prioritizeShort = shopeeLinks.find((u) => /s\.shopee\.co\.th|shp\.ee/i.test(u)) || shopeeLinks[0] || '';
            return {
              reel_url: location.href,
              competitor_short_url: prioritizeShort,
              all_shopee_links: shopeeLinks,
              product_tag_title: productTagTitle,
              competitor_page: competitorPage,
              caption_full: captionFull,
              fb_views: fbViews,
              duration_sec: durationSec,
              fb_reactions: fbReactions,
              fb_comments: fbComments,
              fb_shares: fbShares
            };
          }
        });
        return results?.[0]?.result || null;
      } catch (_err) {
        return null;
      }
    })(),
    isReelOrVideoUrl ? scrapeFbReelHtmlAuthenticated(cleanTabReelUrl) : Promise.resolve({})
  ]);

  const effectiveUrl = cleanFbReelUrl(domScraped?.reel_url || cleanTabReelUrl);
  const authHasLink = Boolean(authScraped?.competitor_short_url);
  const mergedShortUrl = authHasLink
    ? authScraped.competitor_short_url
    : domScraped?.competitor_short_url || '';
  const mergedLinks = authHasLink
    ? authScraped.all_shopee_links
    : domScraped?.all_shopee_links || [];
  const mergedTitle =
    (authHasLink && authScraped.product_tag_title) ||
    domScraped?.product_tag_title ||
    authScraped?.product_tag_title ||
    '';

  const tabTitlePage = String(tab.title || '')
    .replace(/^\(\d+\)\s*/, '')
    .replace(/\| Facebook.*$/i, '')
    .replace(/-\s*Facebook.*$/i, '')
    .trim()
    .slice(0, 80);
  const mergedPage = [domScraped?.competitor_page, authScraped?.competitor_page, tabTitlePage].find(
    (p) => !isInvalidCompetitorPageName(p)
  ) || '';

  return {
    reel_url: effectiveUrl,
    competitor_short_url: mergedShortUrl,
    all_shopee_links: mergedLinks,
    product_tag_title: mergedTitle,
    competitor_page: mergedPage,
    caption_full: domScraped?.caption_full || '',
    fb_views: Math.max(Number(authScraped?.fb_views) || 0, Number(domScraped?.fb_views) || 0),
    duration_sec: Number(authScraped?.duration_sec) || Number(domScraped?.duration_sec) || 0,
    fb_reactions: Number(authScraped?.fb_reactions) || Number(domScraped?.fb_reactions) || 0,
    fb_comments: Number(authScraped?.fb_comments) || Number(domScraped?.fb_comments) || 0,
    fb_shares:
      authScraped?.fb_shares && authScraped.fb_shares !== '0'
        ? authScraped.fb_shares
        : domScraped?.fb_shares || '0'
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((res) => sendResponse({ ok: true, data: res }))
    .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
  return true;
});

async function postWebUiJson(endpointPath, body, { baseUrlOverride = '', timeoutMs = 15000 } = {}) {
  const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
  const rawBase = String(baseUrlOverride || settings?.webUiBaseUrl || 'https://aff.doctorbankonline.com').trim();
  const baseUrl = (rawBase === 'http://localhost:3000' ? 'https://aff.doctorbankonline.com' : rawBase).replace(/\/+$/, '');
  const affToken = String(settings?.affToken || 'doctorbank2026');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${baseUrl}${endpointPath}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Aff-Token': affToken
      },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(errBody?.error || errBody?.message || `HTTP ${resp.status} from ${baseUrl}${endpointPath}`);
    }
    return await resp.json();
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`หมดเวลาเชื่อมต่อ ${baseUrl}${endpointPath} (${Math.round(timeoutMs / 1000)}s)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

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
        realDailyAdCostTHB: Number(payload.realDailyAdCostTHB) || 100,
        breakEvenUnits: payload.breakEvenUnits || '0.0',
        breakEvenOrders: Number(payload.breakEvenOrders) || 0,
        viabilityTier: payload.viabilityTier || 'warning',
        soldCount:
          payload.soldCount !== null && payload.soldCount !== undefined && payload.soldCount !== ''
            ? Number(payload.soldCount) || 0
            : null,
        soldSource: payload.soldSource || (payload.soldCount !== null && payload.soldCount !== undefined ? 'affiliate_offer_api' : 'unknown'),
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
      const qs = new URLSearchParams();
      if (payload?.force) qs.set('force', '1');
      qs.set('account', String(payload?.account || 'drb').toLowerCase());
      const resp = await fetch(`${baseUrl}/api/shopee-aff/pool-pending?${qs.toString()}`, {
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
      const { syncedReports = [], settings = DEFAULT_SETTINGS, autoPullSettings = {} } = await chrome.storage.local.get([
        'syncedReports',
        'settings',
        'autoPullSettings'
      ]);

      const conversions = Array.isArray(payload.conversions)
        ? payload.conversions
        : (Array.isArray(payload.rows) ? payload.rows : []);
      const clicks = Array.isArray(payload.clicks) ? payload.clicks : [];
      const daily = Array.isArray(payload.daily) ? payload.daily : [];
      const accountLabel = String(payload.accountLabel || autoPullSettings?.accountLabel || 'DRB').trim();

      const reportBatch = {
        id: `rep_${Date.now()}`,
        source: payload.source || 'manual',
        accountLabel,
        date: payload.date || new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10),
        totalCommission: Number(payload.totalCommission) || 0,
        netCommission: Number(payload.netCommission || payload.totalCommission) || 0,
        orderCount: Number(payload.orderCount || conversions.length) || 0,
        conversions,
        rows: conversions,
        clicks,
        daily,
        syncedAt: new Date().toISOString()
      };

      const updatedReports = [
        {
          id: reportBatch.id,
          source: reportBatch.source,
          accountLabel,
          date: reportBatch.date,
          totalCommission: reportBatch.totalCommission,
          orderCount: reportBatch.orderCount,
          clicksCount: clicks.length,
          dailyCount: daily.length,
          syncedAt: reportBatch.syncedAt
        },
        ...syncedReports
      ].slice(0, 50);
      await chrome.storage.local.set({ syncedReports: updatedReports });

      let syncedToServer = false;
      let serverRes = null;
      let serverError = '';
      const baseUrl = String(settings?.webUiBaseUrl || 'https://aff.doctorbankonline.com').replace(/\/+$/, '');
      const affToken = String(settings?.affToken || 'doctorbank2026');
      if (baseUrl && /^https?:\/\//i.test(baseUrl)) {
        try {
          const clickChunkSize = 800;
          const convChunkSize = 300;
          const clickChunks = [];
          for (let i = 0; i < clicks.length; i += clickChunkSize) {
            clickChunks.push(clicks.slice(i, i + clickChunkSize));
          }
          const convChunks = [];
          for (let i = 0; i < conversions.length; i += convChunkSize) {
            convChunks.push(conversions.slice(i, i + convChunkSize));
          }
          const totalBatches = Math.max(1, clickChunks.length, convChunks.length);
          const agg = {
            ok: true,
            inserted: 0,
            conversions: 0,
            updatedExisting: 0,
            skippedExisting: 0,
            cancelled: 0,
            clicks: 0,
            daily: 0,
            autoNormalizedMicro: 0,
            totalNetComm: reportBatch.totalCommission,
            accountLabel
          };

          for (let b = 0; b < totalBatches; b++) {
            const chunkPayload = {
              id: `${reportBatch.id}_b${b}`,
              source: reportBatch.source,
              accountLabel,
              date: reportBatch.date,
              conversions: convChunks[b] || [],
              clicks: clickChunks[b] || [],
              daily: b === 0 ? daily : [],
              totalCommission: reportBatch.totalCommission,
              orderCount: (convChunks[b] || []).length
            };
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 25000);
            const resp = await fetch(`${baseUrl}/api/shopee-aff/report-ingest`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'X-Aff-Token': affToken
              },
              body: JSON.stringify(chunkPayload),
              signal: ctrl.signal
            });
            clearTimeout(timer);
            if (!resp || !resp.ok) {
              serverError = `HTTP ${resp?.status || 0} (batch ${b + 1}/${totalBatches})`;
              syncedToServer = false;
              break;
            }
            const resJson = await resp.json().catch(() => ({ ok: true }));
            if (resJson?.ok === false) {
              serverError = resJson?.error || `Ingest failed (batch ${b + 1}/${totalBatches})`;
              syncedToServer = false;
              break;
            }
            agg.inserted += Number(resJson?.inserted || 0);
            agg.conversions += Number(resJson?.conversions || 0);
            agg.updatedExisting += Number(resJson?.updatedExisting || 0);
            agg.skippedExisting += Number(resJson?.skippedExisting || 0);
            agg.cancelled += Number(resJson?.cancelled || 0);
            agg.clicks += Number(resJson?.clicks || 0);
            agg.daily += Number(resJson?.daily || 0);
            agg.autoNormalizedMicro += Number(resJson?.autoNormalizedMicro || 0);
            syncedToServer = true;
          }
          if (syncedToServer) {
            serverRes = agg;
          }
        } catch (err) {
          syncedToServer = false;
          serverError = err?.message || 'Network error';
        }
      }

      const lastReportSync = {
        at: new Date().toISOString(),
        source: reportBatch.source,
        accountLabel: payload.detectedAccount || accountLabel,
        pulledConversions: conversions.length,
        pulledClicks: clicks.length,
        conversions: Number(serverRes?.conversions ?? conversions.length),
        updatedExisting: Number(serverRes?.updatedExisting ?? 0),
        clicks: Number(serverRes?.clicks ?? clicks.length),
        daily: Number(serverRes?.daily ?? daily.length),
        totalNetComm: Number(serverRes?.totalNetComm ?? reportBatch.totalCommission),
        syncedToServer,
        error: serverError
      };
      await chrome.storage.local.set({ lastReportSync });

      return { reports: updatedReports, reportBatch: lastReportSync, syncedToServer, serverRes, serverError };
    }

    case 'AUTO_PULL_COMMISSION_NOW': {
      return await runAutoPullCommissionNow(payload || {});
    }

    case 'GET_REPORT_SYNC_STATE': {
      const store = await chrome.storage.local.get(['autoPullSettings', 'lastReportSync', 'settings']);
      const autoPullSettings = {
        enabled: true,
        intervalMin: 30,
        accountLabel: 'DRB',
        days: 30,
        ...(store?.autoPullSettings || {})
      };
      let dbStatus = null;
      let campaignReport = null;
      if (payload?.fetchServer !== false) {
        try {
          const baseUrl = String(store?.settings?.webUiBaseUrl || 'https://aff.doctorbankonline.com').replace(/\/+$/, '');
          const affToken = String(store?.settings?.affToken || 'doctorbank2026');
          const fetchJsonWithTimeout = async (pathUrl) => {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 5000);
            try {
              const resp = await fetch(`${baseUrl}${pathUrl}`, {
                method: 'GET',
                credentials: 'include',
                headers: { Accept: 'application/json', 'X-Aff-Token': affToken },
                signal: ctrl.signal
              });
              if (resp && resp.ok) return await resp.json().catch(() => null);
              return null;
            } finally {
              clearTimeout(t);
            }
          };
          const [stRes, campRes] = await Promise.allSettled([
            fetchJsonWithTimeout('/api/shopee-aff/report-sync-status'),
            fetchJsonWithTimeout('/api/shopee-aff/campaign-report?sub_id1=16NOV26FBRAD')
          ]);
          if (stRes.status === 'fulfilled') dbStatus = stRes.value;
          if (campRes.status === 'fulfilled') campaignReport = campRes.value;
        } catch (_e) {}
      }
      return {
        ok: true,
        autoPullSettings,
        lastReportSync: store?.lastReportSync || null,
        dbStatus,
        campaignReport
      };
    }

    case 'SET_AUTO_PULL_SETTINGS': {
      const store = await chrome.storage.local.get(['autoPullSettings']);
      const merged = {
        enabled: true,
        intervalMin: 30,
        accountLabel: 'DRB',
        days: 30,
        ...(store?.autoPullSettings || {}),
        ...(payload || {})
      };
      await chrome.storage.local.set({ autoPullSettings: merged });
      await configureAutoPullAlarm(merged);
      return { ok: true, autoPullSettings: merged };
    }

    case 'CLEAR_SAVED_PRODUCTS': {
      await chrome.storage.local.set({ savedProducts: [] });
      return [];
    }

    case 'CACHE_REAL_AFF_OFFER': {
      await hydrateRealOfferCache();
      const itemId = String(payload?.itemId || '').replace(/[^0-9]/g, '');
      if (itemId && isValidRealOfferData(payload)) {
        circuitBreaker = { tripped: false, trippedAt: 0, error: '' };
        persistRealOfferCacheEntry(itemId, payload);
        resolvePendingOfferWaiter(itemId, payload);
      }
      return { cached: Boolean(itemId && isValidRealOfferData(payload)) };
    }

    case 'GET_CACHED_REAL_OFFERS': {
      await hydrateRealOfferCache();
      const ids = Array.isArray(payload?.itemIds) ? payload.itemIds : [];
      const now = Date.now();
      const cached = {};
      let purged = false;
      ids.forEach((raw) => {
        const id = String(raw || '').replace(/[^0-9]/g, '');
        if (!id) return;
        const hit = realOfferCache.get(id);
        if (hit && hit.data && isValidRealOfferData(hit.data) && now - hit.cachedAt < REAL_OFFER_TTL_MS) {
          cached[id] = { ...hit.data, cachedAt: hit.cachedAt };
        } else if (hit) {
          realOfferCache.delete(id);
          purged = true;
        }
      });
      if (purged) schedulePersistRealOfferCache();
      const openAffTabs = await findOpenAffTabs();
      return {
        cached,
        circuitBreaker,
        openAffTabCount: openAffTabs.length
      };
    }

    case 'RESET_CIRCUIT_BREAKER': {
      circuitBreaker = { tripped: false, trippedAt: 0, error: '' };
      return { ok: true };
    }

    case 'GET_AFF_BRIDGE_STATUS': {
      return await inspectAffBridgeStatus();
    }

    case 'ENSURE_AFF_BRIDGE_READY':
    case 'OPEN_BACKGROUND_AFF_BRIDGE_TAB': {
      const res = await ensureAffBridgeReady(payload || {});
      if (!res?.ok && res?.securityCheck) {
        return res;
      }
      return res;
    }

    case 'GET_REAL_AFF_OFFER': {
      return await fetchRealAffOfferImpl(
        payload?.itemId,
        Boolean(payload?.forceRefresh),
        {
          ...(payload?.options || {}),
          mode: payload?.mode || payload?.options?.mode || 'single',
          shopId: payload?.shopId || payload?.options?.shopId || '',
          titleHint: payload?.titleHint || payload?.options?.titleHint || ''
        }
      );
    }

    case 'GENERATE_AFF_SHORTLINK': {
      return await generateAffShortLinkImpl(payload?.originalLink, payload?.subIds || []);
    }

    case 'BATCH_GENERATE_AFF_SHORTLINKS': {
      return await batchGenerateAffShortLinksImpl(payload?.items || []);
    }

    case 'SCRAPE_ACTIVE_FB_REEL_TAB': {
      return await scrapeActiveFacebookReelTabImpl(payload?.tabId);
    }

    case 'RESOLVE_SHOPEE_SHORT_URL': {
      return await resolveShopeeShortUrlInExt(payload?.shortUrl);
    }

    case 'SPY_COLLECT_REELS': {
      const rawReels = Array.isArray(payload?.reels) ? payload.reels : [];

      const enrichOneReel = async (orig) => {
        const item = { ...orig };
        const reelUrl = String(item.reel_url || item.url || '').trim();
        const needsMeta =
          !item.competitor_short_url ||
          !item.product_tag_title ||
          (!item.fb_reactions && !item.fb_comments) ||
          !Number(item.fb_views) ||
          isInvalidCompetitorPageName(item.competitor_page) ||
          !Number(item.duration_sec);
        if (reelUrl && needsMeta) {
          const fbMeta = await scrapeFbReelHtmlAuthenticated(reelUrl);
          if (!item.competitor_short_url && fbMeta.competitor_short_url) {
            item.competitor_short_url = fbMeta.competitor_short_url;
          }
          if (!item.product_tag_title && fbMeta.product_tag_title) {
            item.product_tag_title = fbMeta.product_tag_title;
          }
          if (isInvalidCompetitorPageName(item.competitor_page) && !isInvalidCompetitorPageName(fbMeta.competitor_page)) {
            item.competitor_page = fbMeta.competitor_page;
          }
          if (fbMeta.fb_views > 0) {
            item.fb_views = Math.max(Number(item.fb_views) || 0, Number(fbMeta.fb_views) || 0);
          }
          if (!Number(item.duration_sec) && fbMeta.duration_sec > 0) {
            item.duration_sec = fbMeta.duration_sec;
          }
          if (!item.fb_reactions && fbMeta.fb_reactions) {
            item.fb_reactions = fbMeta.fb_reactions;
          }
          if (!item.fb_comments && fbMeta.fb_comments) {
            item.fb_comments = fbMeta.fb_comments;
          }
          if ((!item.fb_shares || item.fb_shares === '0') && fbMeta.fb_shares) {
            item.fb_shares = fbMeta.fb_shares;
          }
        }
        if (item.competitor_short_url && (!item.item_id || !item.shop_id)) {
          const resolved = await resolveShopeeShortUrlInExt(item.competitor_short_url);
          if (resolved.shop_id) item.shop_id = resolved.shop_id;
          if (resolved.item_id) item.item_id = resolved.item_id;
          if (resolved.clean_product_url) item.clean_product_url = resolved.clean_product_url;
          if (resolved.aff_offer_url) item.aff_offer_url = resolved.aff_offer_url;
        }
        return item;
      };

      const reels = new Array(rawReels.length);
      let cursor = 0;
      const workerCount = Math.min(4, Math.max(1, rawReels.length));
      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (cursor < rawReels.length) {
            const idx = cursor++;
            reels[idx] = await enrichOneReel(rawReels[idx]);
          }
        })
      );

      return await postWebUiJson(
        '/api/shopee-aff/spy-collect',
        {
          reels,
          resolve_only: payload?.resolveOnly !== false
        },
        { baseUrlOverride: payload?.webUiBaseUrl, timeoutMs: 25000 }
      );
    }

    case 'SPY_COMMIT_REELS': {
      const items = Array.isArray(payload?.items) ? payload.items : [];
      return await postWebUiJson(
        '/api/shopee-aff/spy-commit',
        { items },
        { baseUrlOverride: payload?.webUiBaseUrl, timeoutMs: 20000 }
      );
    }

    case 'FIND_BETTER_SHOPS_FOR_ITEM': {
      const bridgeRes = await ensureAffBridgeReady({ focusIfSecurity: true });
      if (!bridgeRes?.ok || !bridgeRes.tabId) {
        return {
          ok: false,
          securityCheck: Boolean(bridgeRes?.securityCheck),
          error: bridgeRes?.error || 'กรุณาเปิดหน้า affiliate.shopee.co.th ก่อนค้นหาร้านทดแทน'
        };
      }
      const resp = await sendToAffTabWithReinject(bridgeRes.tabId, {
        action: 'FIND_BETTER_SHOPS_FOR_ITEM',
        payload: payload || {}
      });
      if (!resp) {
        return { ok: false, error: 'ไม่สามารถติดต่อแท็บ affiliate.shopee.co.th ได้ ลองรีเฟรชหน้า AFF แล้วลองใหม่' };
      }
      return resp;
    }

    case 'SPY_SWAP_SHOP': {
      return await postWebUiJson(
        '/api/shopee-aff/spy-swap-shop',
        payload || {},
        { baseUrlOverride: payload?.webUiBaseUrl, timeoutMs: 20000 }
      );
    }

    case 'RELOAD_EXTENSION': {
      if (!payload?.force && inFlightOfferFetches.size > 0) {
        return {
          reloaded: false,
          busy: true,
          error: `กำลังดึงเรทค่าคอมอยู่ ${inFlightOfferFetches.size} รายการ รอให้เสร็จก่อนค่อย Reload Extension`
        };
      }
      setTimeout(() => {
        try {
          chrome.runtime.reload();
        } catch (_e) {}
      }, 90);
      return { reloaded: true };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// ============================================================================
// AUTO-PULL SHOPEE COMMISSION & CLICKS -> aff.db (v2.14.0)
// ============================================================================
const AUTO_PULL_ALARM_NAME = 'drb_auto_pull_commission';

async function configureAutoPullAlarm(cfg = null) {
  try {
    if (!chrome.alarms) return;
    let settings = cfg;
    if (!settings) {
      const store = await chrome.storage.local.get(['autoPullSettings']);
      settings = { enabled: true, intervalMin: 30, accountLabel: 'DRB', days: 30, ...(store?.autoPullSettings || {}) };
    }
    await chrome.alarms.clear(AUTO_PULL_ALARM_NAME);
    if (settings.enabled !== false) {
      const periodInMinutes = Math.max(5, Math.min(180, Number(settings.intervalMin || 30)));
      chrome.alarms.create(AUTO_PULL_ALARM_NAME, { periodInMinutes });
    }
  } catch (_e) {}
}

async function runAutoPullCommissionNow(options = {}) {
  const store = await chrome.storage.local.get(['autoPullSettings']);
  const cfg = {
    enabled: true,
    intervalMin: 30,
    accountLabel: 'DRB',
    days: 30,
    ...(store?.autoPullSettings || {}),
    ...(options || {})
  };

  if (options?.silent && cfg.enabled === false) {
    return { ok: false, skipped: true, reason: 'disabled' };
  }

  let targetTabId = null;
  if (options?.preferredTabId) {
    try {
      const prefTab = await chrome.tabs.get(options.preferredTabId);
      if (prefTab?.id && String(prefTab.url || '').includes('affiliate.shopee.co.th') && !isSecurityOrLoginUrl(prefTab.url)) {
        if (isTabSleeping(prefTab)) await wakeAffTabIfSleeping(prefTab);
        targetTabId = prefTab.id;
      }
    } catch (_e) {}
  }

  if (!targetTabId) {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (activeTab?.id && String(activeTab.url || '').includes('affiliate.shopee.co.th') && !isSecurityOrLoginUrl(activeTab.url)) {
        if (isTabSleeping(activeTab)) await wakeAffTabIfSleeping(activeTab);
        targetTabId = activeTab.id;
      }
    } catch (_e) {}
  }

  if (!targetTabId) {
    const bridgeRes = await ensureAffBridgeReady({
      allowCreate: !options?.silent,
      wakeSleeping: true
    });
    if (!bridgeRes?.ok || !bridgeRes.tabId) {
      return {
        ok: false,
        securityCheck: Boolean(bridgeRes?.securityCheck),
        error: bridgeRes?.error || 'ยังไม่ได้เปิดหน้า affiliate.shopee.co.th ใน Chrome'
      };
    }
    targetTabId = bridgeRes.tabId;
  }

  const pullRes = await sendToAffTabWithReinject(targetTabId, {
    action: 'PULL_SHOPEE_REPORTS',
    days: cfg.days || 30
  });

  if (!pullRes || !pullRes.ok) {
    return {
      ok: false,
      securityCheck: Boolean(pullRes?.securityCheck),
      error: pullRes?.error || 'ไม่สามารถดึงรายงานจากแท็บ affiliate.shopee.co.th ได้ ลองเปิดหน้า รายงานการขาย (Conversion Report) แล้วกดดูดอีกครั้ง'
    };
  }

  const convLen = Array.isArray(pullRes.conversions) ? pullRes.conversions.length : 0;
  const clickLen = Array.isArray(pullRes.clicks) ? pullRes.clicks.length : 0;
  const dailyLen = Array.isArray(pullRes.daily) ? pullRes.daily.length : 0;

  if (convLen === 0 && clickLen === 0 && dailyLen === 0) {
    return {
      ok: true,
      empty: true,
      syncedToServer: false,
      source: pullRes.source || 'empty',
      message: 'ยังไม่พบข้อมูลรายงานในแท็บนี้ — ลองเปิดหน้า affiliate.shopee.co.th/report/conversion_report แล้วกดดูดอีกครั้ง (ระบบจะดักจับ JSON อัตโนมัติทันที)'
    };
  }

  const pushRes = await handleMessage({
    action: 'PUSH_REPORT_TO_WEBUI',
    payload: {
      source: options?.silent ? 'auto_alarm' : (pullRes.source || 'manual_pull'),
      accountLabel: pullRes.detectedAccount || cfg.accountLabel || 'DRB',
      detectedAccount: pullRes.detectedAccount || '',
      date: pullRes.date,
      conversions: pullRes.conversions,
      clicks: pullRes.clicks,
      daily: pullRes.daily,
      totalCommission: pullRes.totalCommission,
      orderCount: pullRes.orderCount
    }
  });

  return {
    ok: true,
    empty: false,
    source: pullRes.source,
    accountLabel: cfg.accountLabel || 'DRB',
    conversions: convLen,
    clicks: clickLen,
    daily: dailyLen,
    totalCommission: pullRes.totalCommission || 0,
    syncedToServer: Boolean(pushRes?.syncedToServer),
    serverRes: pushRes?.serverRes || null,
    serverError: pushRes?.serverError || ''
  };
}

chrome.alarms?.onAlarm?.addListener((alarm) => {
  if (alarm?.name === AUTO_PULL_ALARM_NAME) {
    runAutoPullCommissionNow({ silent: true }).catch(() => {});
  }
});

configureAutoPullAlarm();
