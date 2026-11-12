/**
 * DrBank AFF Scout v2.0.0 — Lean Background Service Worker & Web UI Bridge
 * Separation of Concerns:
 *  - Receives Winning SKU payloads from Shopee Product HUD -> Queues locally & POSTs to Web UI
 *  - Receives Conversion Report tables from Shopee Affiliate Console -> POSTs to Web UI
 */

const DEFAULT_SETTINGS = {
  webUiBaseUrl: 'http://localhost:3000', // URL ของหน้าเว็บ Shopee × Meta Command Center
  shopeeBaseRate: 3.5,                   // % ค่าคอมพื้นฐาน Shopee
  shopeeExtraRate: 10.0,                 // % ค่าคอม Extra เริ่มต้น
  shopeeCapTHB: 250,                     // เพดานค่าคอมพื้นฐานต่อชิ้น (บาท)
  withholdingTaxRate: 3.0,               // หัก ณ ที่จ่าย 3% จากยอดคอมมิชชั่น
  dailyAdBudgetTHB: 100,                 // งบแอดต่อโพสต์ (100 บาท/วัน)
  fbVatRate: 7.0,                        // VAT 7% ของค่าแอด FB (รวมเป็น 107 บาท/วัน)
  theme: 'light',
  displayMode: 'sidepanel',              // 'sidepanel' (Default) | 'float'
  hudMinimized: false
};

// Configure Side Panel behavior: open on action click by default
chrome.sidePanel
  ?.setPanelBehavior?.({ openPanelOnActionClick: true })
  ?.catch?.(() => {});

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['settings', 'savedProducts', 'syncedReports']);
  const merged = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  await chrome.storage.local.set({ settings: merged });

  if (!Array.isArray(data.savedProducts)) {
    await chrome.storage.local.set({ savedProducts: [] });
  }
  if (!Array.isArray(data.syncedReports)) {
    await chrome.storage.local.set({ syncedReports: [] });
  }
});

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
      const baseUrl = String(payload?.webUiBaseUrl || settings.webUiBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 1800);
        const res = await fetch(`${baseUrl}/api/health`, {
          method: 'GET',
          signal: ctrl.signal
        }).catch(() => fetch(baseUrl, { method: 'HEAD', signal: ctrl.signal }));
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
        url: payload.url || '',
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
      const baseUrl = String(settings?.webUiBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');
      if (baseUrl && /^https?:\/\//i.test(baseUrl)) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 2500);
          const resp = await fetch(`${baseUrl}/api/shopee-aff/sku-ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
      const baseUrl = String(settings?.webUiBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');
      if (baseUrl && /^https?:\/\//i.test(baseUrl)) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 2500);
          const resp = await fetch(`${baseUrl}/api/shopee-aff/report-ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
