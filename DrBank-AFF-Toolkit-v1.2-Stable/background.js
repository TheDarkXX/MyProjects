/**
 * DrBank AFF Studio v1.2.0 — Clean-Room Background Service Worker
 * 100% Local-First State Engine (Bell 238M Strategy Edition)
 */

const DEFAULT_SETTINGS = {
  shopeeAffiliateId: '',
  shopeeBaseRate: 3.5,          // % ค่าคอมพื้นฐาน Shopee
  shopeeExtraRate: 10.0,        // % ค่าคอม Extra เริ่มต้น
  shopeeCapTHB: 250,            // เพดานค่าคอมพื้นฐานต่อชิ้น (บาท)
  lazadaAffiliateId: '',
  lazadaBaseRate: 4.0,          // % ค่าคอมพื้นฐาน Lazada
  lazadaExtraRate: 8.0,         // % ค่าคอม Sponsored Lazada
  fbIncludeVat: true,           // บวก VAT 7% ในงบแอด FB อัตโนมัติ
  fbVatRate: 7.0,
  withholdingTaxRate: 3.0,      // หัก ณ ที่จ่าย 3% จากยอดคอมมิชชั่น
  defaultSubId1: '16NOV26FBSPCAD', // โค้ด AdBoost (Alphanumeric ล้วน ห้ามมี _)
  defaultSubId2: 'P01POST01',      // รหัสเพจ+โพสต์ (Alphanumeric ล้วน ห้ามมี _)
  defaultSubId3: '',               // Auto-fill YYYYMMDD
  defaultSubId4: '',               // Auto-fill ItemID
  webhookUrl: '',                  // Optional Webhook URL สำหรับส่ง JSON ไป Dashboard / เจนภาพ
  theme: 'light',
  hudMinimized: false,
  hudPosition: { top: 80, right: 20 }
};

function sanitizeAlphanumeric(val, fallback = '') {
  const clean = String(val || '').replace(/[^a-zA-Z0-9]/g, '');
  return clean || fallback;
}

function normalizeSettings(raw = {}) {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  // Auto-migrate legacy v1.0/v1.1 defaults that contained underscores
  if (!merged.defaultSubId1 || merged.defaultSubId1 === 'fb_ads' || /[^a-zA-Z0-9]/.test(merged.defaultSubId1)) {
    merged.defaultSubId1 = sanitizeAlphanumeric(
      merged.defaultSubId1 === 'fb_ads' ? '' : merged.defaultSubId1,
      DEFAULT_SETTINGS.defaultSubId1
    );
  }
  if (!merged.defaultSubId2 || merged.defaultSubId2 === 'camp_main' || /[^a-zA-Z0-9]/.test(merged.defaultSubId2)) {
    merged.defaultSubId2 = sanitizeAlphanumeric(
      merged.defaultSubId2 === 'camp_main' ? '' : merged.defaultSubId2,
      DEFAULT_SETTINGS.defaultSubId2
    );
  }
  return merged;
}

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['settings', 'savedProducts', 'pnlLedger', 'linkHistory']);
  const nextSettings = normalizeSettings(data.settings || {});
  await chrome.storage.local.set({ settings: nextSettings });

  if (!Array.isArray(data.savedProducts)) {
    await chrome.storage.local.set({ savedProducts: [] });
  }
  if (!Array.isArray(data.pnlLedger)) {
    await chrome.storage.local.set({ pnlLedger: [] });
  }
  if (!Array.isArray(data.linkHistory)) {
    await chrome.storage.local.set({ linkHistory: [] });
  }
});

// Message Bus for Content Scripts & Popup
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
      const store = await chrome.storage.local.get(['settings', 'savedProducts', 'pnlLedger', 'linkHistory']);
      const cleanSettings = normalizeSettings(store.settings || {});
      return {
        settings: cleanSettings,
        savedProducts: store.savedProducts || [],
        pnlLedger: store.pnlLedger || [],
        linkHistory: store.linkHistory || []
      };
    }

    case 'UPDATE_SETTINGS': {
      const { settings = DEFAULT_SETTINGS } = await chrome.storage.local.get('settings');
      const next = normalizeSettings({ ...settings, ...(payload || {}) });
      await chrome.storage.local.set({ settings: next });
      return next;
    }

    case 'SAVE_PRODUCT': {
      const { savedProducts = [], settings = DEFAULT_SETTINGS } = await chrome.storage.local.get([
        'savedProducts',
        'settings'
      ]);
      const item = {
        id: payload.id || `${payload.platform || 'shopee'}_${Date.now()}`,
        platform: payload.platform || 'shopee',
        title: payload.title || 'สินค้าไม่ระบุชื่อ',
        originalPrice: Number(payload.originalPrice) || Number(payload.price) || 0,
        price: Number(payload.price) || 0,
        priceMax: Number(payload.priceMax) || Number(payload.price) || 0,
        baseRate: Number(payload.baseRate) || 0,
        extraRate: Number(payload.extraRate) || 0,
        estimatedCommission: Number(payload.estimatedCommission) || 0,
        breakEvenUnits: payload.breakEvenUnits || '0.0',
        breakEvenOrders: Number(payload.breakEvenOrders) || 0,
        viabilityTier: payload.viabilityTier || 'warning',
        soldCount: Number(payload.soldCount) || 0,
        soldText: payload.soldText || '',
        rating: Number(payload.rating) || 0,
        shipFrom: payload.shipFrom || '',
        isOverseas: Boolean(payload.isOverseas),
        url: payload.url || '',
        affiliateUrl: payload.affiliateUrl || '',
        shopId: payload.shopId || '',
        itemId: payload.itemId || '',
        imagesHD: Array.isArray(payload.imagesHD) ? payload.imagesHD : [],
        variants: Array.isArray(payload.variants) ? payload.variants : [],
        subIds: payload.subIds || {},
        savedAt: new Date().toISOString()
      };

      const filtered = savedProducts.filter((p) => p.id !== item.id && p.url !== item.url);
      const updated = [item, ...filtered].slice(0, 300);
      await chrome.storage.local.set({ savedProducts: updated });

      // Optional Webhook Dispatch if configured in settings
      let webhookSent = false;
      const hookUrl = (settings?.webhookUrl || '').trim();
      if (hookUrl && /^https?:\/\//i.test(hookUrl)) {
        try {
          await fetch(hookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
          webhookSent = true;
        } catch (_err) {
          webhookSent = false;
        }
      }

      return { products: updated, item, webhookSent };
    }

    case 'DELETE_PRODUCT': {
      const { savedProducts = [] } = await chrome.storage.local.get('savedProducts');
      const updated = savedProducts.filter((p) => p.id !== payload.id);
      await chrome.storage.local.set({ savedProducts: updated });
      return updated;
    }

    case 'ADD_LINK_HISTORY': {
      const { linkHistory = [] } = await chrome.storage.local.get('linkHistory');
      const entry = {
        id: `lnk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        platform: payload.platform || 'shopee',
        title: payload.title || payload.originalUrl || '',
        originalUrl: payload.originalUrl || '',
        affiliateUrl: payload.affiliateUrl || '',
        subIds: payload.subIds || [],
        createdAt: new Date().toISOString()
      };
      const updated = [entry, ...linkHistory].slice(0, 200);
      await chrome.storage.local.set({ linkHistory: updated });
      return updated;
    }

    case 'RECORD_PNL_ENTRY': {
      const { pnlLedger = [] } = await chrome.storage.local.get('pnlLedger');
      const dateStr = payload.date || new Date().toISOString().slice(0, 10);
      const entry = {
        id: payload.id || `pnl_${dateStr}_${payload.source || 'manual'}_${Date.now()}`,
        date: dateStr,
        type: payload.type || 'expense',
        source: payload.source || 'fb_ads',
        campaign: payload.campaign || '-',
        subId: payload.subId || '-',
        rawAmount: Number(payload.rawAmount) || 0,
        taxAmount: Number(payload.taxAmount) || 0,
        netAmount: Number(payload.netAmount) || 0,
        orders: Number(payload.orders) || 0,
        note: payload.note || '',
        updatedAt: new Date().toISOString()
      };

      let nextLedger = pnlLedger;
      if (payload.dedupKey) {
        entry.dedupKey = payload.dedupKey;
        nextLedger = pnlLedger.filter((r) => r.dedupKey !== payload.dedupKey);
      }
      const updated = [entry, ...nextLedger].slice(0, 1000);
      await chrome.storage.local.set({ pnlLedger: updated });
      return updated;
    }

    case 'DELETE_PNL_ENTRY': {
      const { pnlLedger = [] } = await chrome.storage.local.get('pnlLedger');
      const updated = pnlLedger.filter((r) => r.id !== payload.id);
      await chrome.storage.local.set({ pnlLedger: updated });
      return updated;
    }

    case 'CLEAR_PNL_LEDGER': {
      await chrome.storage.local.set({ pnlLedger: [] });
      return [];
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
