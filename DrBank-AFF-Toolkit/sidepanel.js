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

  // Load Settings, Cached AFF Offer, Saved Sub_ids & Last Spy Collect Session
  const store = await chrome.storage.local.get(['settings', 'activeAffOfferProduct', 'savedSubIds', 'drbLastSpyCollectSession']);
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
  if (Array.isArray(store.drbLastSpyCollectSession) && store.drbLastSpyCollectSession.length > 0) {
    lastSpyEnrichedItems = store.drbLastSpyCollectSession;
    renderSpyCollectorResults(lastSpyEnrichedItems);
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
  document.getElementById('drb-tab-btn-sync')?.addEventListener('click', () => switchPanelTab('sync'));
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

  // Reload Extension Buttons (Header + Tools Grid)
  document.getElementById('drb-sp-btn-reload-ext')?.addEventListener('click', triggerExtensionReload);
  document.getElementById('drb-sp-btn-reload-ext-tool')?.addEventListener('click', triggerExtensionReload);

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

  document.getElementById('drb-sp-btn-refresh-pool')?.addEventListener('click', refreshPoolPendingFromSidePanel);

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

  async function refreshAutoPullUI(fetchServer = true) {
    const badgeEl = document.getElementById('drb-autopull-badge');
    const statusEl = document.getElementById('drb-autopull-status');
    const healthEl = document.getElementById('drb-autopull-campaign-health');
    const toggleEl = document.getElementById('drb-autopull-toggle');
    const accEl = document.getElementById('drb-autopull-account');
    const daysEl = document.getElementById('drb-autopull-days');
    if (!statusEl) return;
    try {
      const res = await ns.sendMessage('GET_REPORT_SYNC_STATE', { fetchServer });
      const cfg = res?.autoPullSettings || { enabled: true, accountLabel: 'DRB', days: 30 };
      const last = res?.lastReportSync || null;
      const db = res?.dbStatus || null;
      const camp = res?.campaignReport || null;
      if (toggleEl) toggleEl.checked = cfg.enabled !== false;
      if (accEl && cfg.accountLabel) accEl.value = cfg.accountLabel;
      if (daysEl && cfg.days) daysEl.value = String(cfg.days);

      const lines = [];
      if (last && last.at) {
        const t = new Date(last.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        if (last.syncedToServer) {
          if (badgeEl) {
            badgeEl.textContent = `🟢 ${t} (+${last.conversions || 0})`;
            badgeEl.style.color = '#16a34a';
          }
          lines.push(`ล่าสุด ${t} [${last.accountLabel || 'DRB'}]: ${last.conversions || 0} ออเดอร์ · ${last.clicks || 0} คลิก · ฿${Number(last.totalNetComm || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
        } else {
          if (badgeEl) {
            badgeEl.textContent = `⚠️ ${t} (Offline)`;
            badgeEl.style.color = '#d97706';
          }
          lines.push(`ล่าสุด ${t}: ซิงก์เข้า aff.db ไม่สำเร็จ (${last.error || 'server offline'})`);
        }
      } else if (badgeEl) {
        badgeEl.textContent = cfg.enabled !== false ? '🟢 Auto ON' : '⏸️ Pause';
        badgeEl.style.color = cfg.enabled !== false ? '#16a34a' : '#6b7280';
      }

      if (db?.ok && db.conversions) {
        const c = db.conversions;
        lines.push(`aff.db รวม: ${Number(c.active_orders || 0).toLocaleString()} ออเดอร์ · ${Number(db.clicks?.total_clicks || 0).toLocaleString()} คลิก · คอม ฿${Number(c.total_comm || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      } else if (!lines.length) {
        lines.push('เปิดหน้า affiliate.shopee.co.th แล้วกดปุ่มด้านบน หรือปล่อยให้ดูดอัตโนมัติ');
      }
      statusEl.innerHTML = lines.join('<br>');

      if (healthEl) {
        if (camp?.ok && camp.by_account) {
          const drb = camp.by_account.drb || {};
          const nam = camp.by_account.nam || {};
          const zeroCnt = Number(camp.diagnostics?.zero_comm_active_orders || 0);
          const drbRange = drb.date_min && drb.date_max ? `${drb.date_min.slice(5)}..${drb.date_max.slice(5)}` : '-';
          const namRange = nam.date_min && nam.date_max ? `${nam.date_min.slice(5)}..${nam.date_max.slice(5)}` : '-';
          const hLines = [
            `• <b>DRB</b>: ${Number(drb.clicks || 0).toLocaleString()} คลิก · ${drb.orders || 0} ออเดอร์ · ฿${Number(drb.comm || 0).toFixed(2)} (${drbRange})`,
            `• <b>Namcha</b>: ${Number(nam.clicks || 0).toLocaleString()} คลิก · ${nam.orders || 0} ออเดอร์ · ฿${Number(nam.comm || 0).toFixed(2)} (${namRange})`,
            `• รวมแคมเปญ: <b>฿${Number(camp.total_comm || 0).toFixed(2)}</b> · GMV ฿${Number(camp.total_gmv || 0).toLocaleString()} · CR ${Number(camp.cr_pct || 0).toFixed(2)}%`
          ];
          if (zeroCnt > 0) {
            hLines.push(`<span style="color:#d97706;">⚠️ มี ${zeroCnt} ออเดอร์ที่คอมยัง 0 (เปิด Conversion Report แล้วกดดูดเพื่อเติม)</span>`);
          }
          healthEl.innerHTML = hLines.join('<br>');
        } else if (fetchServer) {
          healthEl.textContent = 'ยังดึงสรุปแคมเปญจาก VPS ไม่สำเร็จ (เช็กอินเทอร์เน็ต/Token)';
        }
      }
    } catch (_e) {
      statusEl.textContent = 'พร้อมใช้งาน — เปิดหน้า affiliate.shopee.co.th เพื่อดูดยอดคอมเข้า aff.db';
    }
  }

  async function triggerAutoPullNow() {
    const btn = document.getElementById('drb-autopull-btn-now');
    const accEl = document.getElementById('drb-autopull-account');
    const daysEl = document.getElementById('drb-autopull-days');
    const accountLabel = accEl?.value || 'DRB';
    const days = Math.max(1, Math.min(90, Number(daysEl?.value || 30)));
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ กำลังดูดยอดคอม ➔ aff.db...';
    }
    try {
      const res = await ns.sendMessage('AUTO_PULL_COMMISSION_NOW', { accountLabel, days });
      if (res?.ok && !res.empty && res.syncedToServer) {
        const skipped = Number(res?.serverRes?.skippedExisting || 0);
        const updated = Number(res?.serverRes?.updatedExisting || 0);
        const inserted = Number(res?.serverRes?.conversions ?? res.conversions ?? 0);
        const notes = [];
        if (updated > 0) notes.push(`เติมข้อมูล ${updated} แถว`);
        if (skipped > 0) notes.push(`ข้ามของเดิม ${skipped} แถว ไม่ทับ`);
        const skipTxt = notes.length ? ` (${notes.join(', ')})` : '';
        ns.showToast(`💰 ซิงก์เข้า aff.db สำเร็จ! +${inserted} ใหม่${skipTxt} · ${res.clicks} คลิก`);
      } else if (res?.ok && res.empty) {
        ns.showToast(res.message || 'เปิดหน้า Conversion Report บน affiliate.shopee.co.th แล้วกดอีกครั้ง');
      } else if (res?.ok && !res.syncedToServer) {
        ns.showToast(`⚠️ ดูดได้ ${res.conversions} ออเดอร์ แต่ส่งขึ้น aff.db ไม่สำเร็จ (${res.serverError || 'เช็ก Web UI'})`);
      } else {
        ns.showToast(`⚠️ ${res?.error || 'ดึงรายงานไม่สำเร็จ'}`);
      }
      await refreshAutoPullUI(true);
    } catch (err) {
      ns.showToast(`❌ ${err?.message || 'เกิดข้อผิดพลาดขณะดูดยอดคอม'}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ ดูดยอดคอม + คลิก ➔ aff.db ตอนนี้';
      }
    }
  }

  document.getElementById('drb-autopull-btn-now')?.addEventListener('click', triggerAutoPullNow);
  document.getElementById('drb-aff-btn-sync-report')?.addEventListener('click', triggerAutoPullNow);
  document.getElementById('drb-autopull-btn-open-report')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://affiliate.shopee.co.th/report/conversion_report' });
  });
  document.getElementById('drb-autopull-btn-open-click-report')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://affiliate.shopee.co.th/report/click_report' });
  });
  document.getElementById('drb-autopull-btn-refresh')?.addEventListener('click', () => refreshAutoPullUI(true));
  document.getElementById('drb-autopull-toggle')?.addEventListener('change', async (e) => {
    const enabled = Boolean(e.target?.checked);
    await ns.sendMessage('SET_AUTO_PULL_SETTINGS', { enabled });
    ns.showToast(enabled ? '🟢 เปิด Auto-Pull ยอดคอมอัตโนมัติแล้ว' : '⏸️ พัก Auto-Pull ชั่วคราวแล้ว');
    refreshAutoPullUI(false);
  });
  document.getElementById('drb-autopull-account')?.addEventListener('change', async (e) => {
    const accountLabel = String(e.target?.value || 'DRB');
    await ns.sendMessage('SET_AUTO_PULL_SETTINGS', { accountLabel });
    ns.showToast(`สลับบัญชี Auto-Pull เป็น ${accountLabel}`);
  });
  document.getElementById('drb-autopull-days')?.addEventListener('change', async (e) => {
    const days = Math.max(1, Math.min(90, Number(e.target?.value || 30)));
    await ns.sendMessage('SET_AUTO_PULL_SETTINGS', { days });
    ns.showToast(`ตั้งช่วงดึงย้อนหลังเป็น ${days} วัน`);
  });
  refreshAutoPullUI(true);

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
  activePanelTab =
    tabName === 'aff' ? 'aff' : tabName === 'spy' ? 'spy' : tabName === 'sync' ? 'sync' : 'shopee';

  const btnShopee = document.getElementById('drb-tab-btn-shopee');
  const btnAff = document.getElementById('drb-tab-btn-aff');
  const btnSpy = document.getElementById('drb-tab-btn-spy');
  const btnSync = document.getElementById('drb-tab-btn-sync');
  const paneShopee = document.getElementById('drb-pane-shopee');
  const paneAff = document.getElementById('drb-pane-aff');
  const paneSpy = document.getElementById('drb-pane-spy');
  const paneSync = document.getElementById('drb-pane-sync');
  const linkCard = document.getElementById('sp-link-card');
  const badge = document.getElementById('drb-sp-mode-badge');

  btnShopee?.classList.toggle('active', activePanelTab === 'shopee');
  btnAff?.classList.toggle('active', activePanelTab === 'aff');
  btnSpy?.classList.toggle('active', activePanelTab === 'spy');
  btnSync?.classList.toggle('active', activePanelTab === 'sync');
  paneShopee?.classList.toggle('active', activePanelTab === 'shopee');
  paneAff?.classList.toggle('active', activePanelTab === 'aff');
  paneSpy?.classList.toggle('active', activePanelTab === 'spy');
  paneSync?.classList.toggle('active', activePanelTab === 'sync');
  if (linkCard) linkCard.hidden = activePanelTab === 'sync';

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
  } else if (activePanelTab === 'sync') {
    if (badge) {
      badge.textContent = 'Auto-Pull';
      badge.style.background = 'rgba(5, 150, 105, 0.14)';
      badge.style.color = '#059669';
      badge.style.borderColor = 'rgba(5, 150, 105, 0.32)';
    }
    refreshAutoPullUI(true);
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
    if (/\/report\//i.test(url)) {
      switchPanelTab('sync');
      return;
    }
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

async function triggerExtensionReload() {
  if (spyCollectRunning || spyBatchRetryRunning) {
    ns.showToast('⏳ กำลัง Collect/รีเช็ก Spy Pool อยู่ รอให้เสร็จก่อนค่อย Reload Extension', 'error');
    return;
  }
  try {
    const res = await ns.sendMessage('RELOAD_EXTENSION');
    if (res && res.reloaded === false && res.busy) {
      ns.showToast(`⏳ ${res.error || 'กำลังดึงข้อมูลอยู่ รอสักครู่แล้วกดใหม่'}`, 'error');
      return;
    }
    ns.showToast('♻️ กำลัง Reload Extension... (หากเปิดหน้า Shopee/AFF ค้างไว้ กด F5 เพื่อเชื่อมใหม่)');
  } catch (_err) {
    try {
      chrome.runtime.reload();
    } catch (_e2) {}
  }
}

async function refreshPoolPendingFromSidePanel() {
  const btn = document.getElementById('drb-sp-btn-refresh-pool');
  const origTxt = btn?.textContent || '🔄 เช็กคิว Pool ใหม่';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ กำลังเช็กคิว...';
  }
  try {
    const res = await ns.sendMessage('FETCH_POOL_PENDING', { force: false });
    const affTabs = await chrome.tabs.query({ url: 'https://affiliate.shopee.co.th/*' }).catch(() => []);
    for (const tab of affTabs) {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'REFRESH_POOL_BRIDGE_STATUS' }).catch(() => {});
      }
    }
    const total = res?.totalPool || 0;
    const pend = res?.pendingCount || 0;
    const items = Array.isArray(res?.items) ? res.items : [];
    const pendSpy = items.filter((x) => x.pool_source === 'spy').length;
    const pendMaster = Math.max(0, pend - pendSpy);
    if (pend === 0 && total > 0) {
      ns.showToast(`✅ คิว Pool ครบทั้ง ${total}/${total} รายการแล้ว!`);
    } else {
      ns.showToast(`🔄 คิวล่าสุด: รอ ${pend} ตัว (Master ${pendMaster} · Spy ${pendSpy}) / รวม ${total}`);
    }
  } catch (err) {
    ns.showToast(`⚠️ เช็กคิวไม่สำเร็จ: ${err?.message || String(err)}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origTxt;
    }
  }
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
      fb_views: Number(savedMeta.fb_views) || 0,
      duration_sec: Number(savedMeta.duration_sec) || 0,
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
  const syncUnsentBtn = document.getElementById('drb-spy-btn-sync-unsent');
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

  syncUnsentBtn?.addEventListener('click', () => {
    syncUnsentSpyRowsToServer();
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
            (👁️ ${(res.fb_views || 0).toLocaleString()} · 👍 ${(res.fb_reactions || 0).toLocaleString()} · 💬 ${(res.fb_comments || 0).toLocaleString()} · ↗ ${escHtml(res.fb_shares || '0')})
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

function persistLastSpySession() {
  try {
    chrome.storage.local.set({ drbLastSpyCollectSession: lastSpyEnrichedItems.slice(0, 50) }).catch(() => {});
  } catch (_e) {}
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

  const activeItemId = String(row.target_item_id || row.item_id || '').replace(/[^0-9]/g, '');
  const cleanItemId = activeItemId;
  if (!cleanItemId) {
    row.rateChecked = true;
    row.rateError = row.competitor_short_url
      ? `พบลิงก์ตะกร้า (${row.competitor_short_url}) แต่แกะรหัสสินค้าไม่ได้`
      : 'ไม่พบป้ายตะกร้า Shopee ในคลิปนี้';
    const g = ns.evaluateSpyGate(row);
    row.gatePass = g.pass;
    row.gateDecision = g.decision;
    row.gateReason = row.rateError;
    row.confirmedNoExtra = false;
    return { ok: false, securityCheck: false, error: row.rateError };
  }

  try {
    const offerRes = await ns.sendMessage('GET_REAL_AFF_OFFER', {
      itemId: cleanItemId,
      shopId: row.target_shop_id || row.shop_id || '',
      titleHint: row.product_tag_title || '',
      forceRefresh: Boolean(forceRefresh)
    });
    if (offerRes?.securityCheck) {
      row.rateChecked = true;
      row.rateError =
        offerRes.error || 'Shopee ขอตรวจสอบความปลอดภัย — กรุณาเปิด affiliate.shopee.co.th ผ่านด่านตรวจก่อน';
      row.confirmedNoExtra = false;
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
      if (d.soldCount !== null && d.soldCount !== undefined) {
        row.soldCount = Number(d.soldCount) || 0;
        row.soldSource = d.soldSource || 'affiliate_offer_api';
        row.sold_known = true;
      } else if (row.soldCount === undefined) {
        row.soldCount = null;
        row.soldSource = row.soldSource || 'unknown';
        row.sold_known = false;
      }
      row.rateSource = d.rateSource || row.rateSource || 'unknown';
      row.realRateVerified = Boolean(d.realRateVerified);
      if (!row.clean_product_url && (d.cleanUrl || (row.shop_id && cleanItemId))) {
        row.clean_product_url = d.cleanUrl || `https://shopee.co.th/product/${row.shop_id}/${cleanItemId}`;
      }
      row.rateChecked = !d.rateError;
      row.rateError = d.rateError ? (d.error || 'Shopee API Rate Error') : '';
      const g = ns.evaluateSpyGate(row);
      row.gatePass = g.pass;
      row.gateDecision = g.decision;
      row.gateReason = g.reason;
      row.gateGrade = g.grade;
      row.gateWarnings = g.warnings || [];
      row.confirmedNoExtra = !d.rateError && extraRate <= 0;
      return { ok: !d.rateError, securityCheck: false, error: row.rateError };
    }
    row.rateChecked = true;
    row.rateError = offerRes?.error || 'ดึงเรทไม่สำเร็จ';
    row.confirmedNoExtra = false;
    return { ok: false, securityCheck: false, error: row.rateError };
  } catch (offerErr) {
    row.rateChecked = true;
    row.rateError = offerErr?.message || String(offerErr);
    row.confirmedNoExtra = false;
    return { ok: false, securityCheck: false, error: row.rateError };
  }
}

function buildSpyLinkPayloadForSave(r) {
  const activeSub1 = document.getElementById('drb-sp-sub1')?.value.trim() || r.sub_id1 || '16NOV26FBRAD';
  return {
    sub_id1: activeSub1,
    sub_id2: r.spy_sub_id2 || '',
    spy_sub_id2: r.spy_sub_id2 || '',
    sku_code: r.sku_code || '',
    item_id: String(r.item_id || ''),
    shop_id: String(r.shop_id || ''),
    source_reel_url: r.source_reel_url || '',
    competitor_page: r.competitor_page || '',
    competitor_short_url: r.competitor_short_url || '',
    fb_views: Number(r.fb_views) || 0,
    fb_reactions: Number(r.fb_reactions) || 0,
    fb_comments: Number(r.fb_comments) || 0,
    fb_shares: String(r.fb_shares || '0'),
    caption_full: r.caption_full || '',
    duration_sec: Number(r.duration_sec) || 10.0,
    title: r.product_tag_title || '',
    product_tag_title: r.product_tag_title || '',
    short_link: r.shortLink || '',
    long_link: r.longLink || r.clean_product_url || '',
    clean_product_url: r.clean_product_url || '',
    aff_offer_url: r.aff_offer_url || '',
    price: Number(r.price) || 0,
    baseRate: Number(r.baseRate) || 0,
    extraRate: Number(r.extraRate) || 0,
    base_comm_pct: Number(r.baseRate) || 0,
    extra_comm_pct: Number(r.extraRate) || 0,
    estimatedCommission: Number(r.netComm) || 0,
    net_comm_baht: Number(r.netComm) || 0,
    soldCount: r.soldCount !== null && r.soldCount !== undefined ? Number(r.soldCount) || 0 : null,
    sold_monthly: r.soldCount !== null && r.soldCount !== undefined ? Number(r.soldCount) || 0 : null,
    soldSource: r.soldSource || 'unknown',
    sold_source: r.soldSource || 'unknown',
    sold_known: Boolean(
      r.sold_known ||
        (r.soldCount !== null &&
          r.soldCount !== undefined &&
          (Number(r.soldCount) > 0 || (r.soldSource && r.soldSource !== 'unknown')))
    ),
    rate_source: r.rateSource || '',
    real_rate_verified: Boolean(r.realRateVerified),
    rate_checked: Boolean(r.rateChecked),
    imagesHD: Array.isArray(r.imagesHD) ? r.imagesHD.slice(0, 8) : []
  };
}

async function ensureSpyRowsShortLinksAndSave(targetRows = []) {
  const activeSub1 = document.getElementById('drb-sp-sub1')?.value.trim() || '16NOV26FBRAD';
  const todaySub3 = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const passingRows = targetRows.filter((r) => {
    const g = ns.evaluateSpyGate(r);
    r.gatePass = g.pass;
    r.gateDecision = g.decision;
    r.gateReason = g.reason;
    return g.pass;
  });

  const needLinkRows = passingRows.filter((r) => {
    const prodUrl =
      r.clean_product_url ||
      (r.shop_id && r.item_id ? `https://shopee.co.th/product/${r.shop_id}/${r.item_id}` : '');
    return Boolean(prodUrl) && !r.shortLink;
  });

  if (needLinkRows.length > 0) {
    const batchPayload = needLinkRows.map((r) => ({
      shopee_url: r.clean_product_url || `https://shopee.co.th/product/${r.shop_id}/${r.item_id}`,
      sub_id1: activeSub1,
      sub_id2: r.spy_sub_id2 || '',
      sub_id3: todaySub3,
      sub_id4: r.sku_code || '',
      sub_id5: `P01SPY${String(r.spy_seq || 1).padStart(3, '0')}`,
      sku_code: r.sku_code || '',
      item_id: String(r.item_id || ''),
      title: r.product_tag_title || ''
    }));

    let batchErr = '';
    const batchRes = await ns.sendMessage('BATCH_GENERATE_AFF_SHORTLINKS', { items: batchPayload }).catch((err) => {
      batchErr = err?.message || String(err);
      return null;
    });
    if (batchErr) {
      ns.showToast(`⚠️ เจนลิงก์ s.shopee ไม่สำเร็จ: ${batchErr}`, 'error');
    }
    const genItems = Array.isArray(batchRes?.items) ? batchRes.items : [];
    const linkBySub2 = new Map();
    const linkByItemId = new Map();
    genItems.forEach((g) => {
      if (g.short_link) {
        if (g.sub_id2) linkBySub2.set(g.sub_id2, g);
        if (g.item_id) linkByItemId.set(String(g.item_id), g);
      }
    });

    for (const r of needLinkRows) {
      const hit = linkBySub2.get(r.spy_sub_id2) || linkByItemId.get(String(r.item_id || ''));
      if (hit?.short_link) {
        r.shortLink = hit.short_link;
        r.longLink = hit.long_link || r.clean_product_url || '';
      }
    }
  }

  const commitPayload = targetRows.map(buildSpyLinkPayloadForSave);
  let commitRes = null;
  if (commitPayload.length > 0) {
    try {
      commitRes = await ns.sendMessage('SPY_COMMIT_REELS', { items: commitPayload });
      if (!commitRes || commitRes.ok === false) {
        throw new Error(commitRes?.error || 'ส่งข้อมูลเข้า Spy Pool บนเซิร์ฟเวอร์ไม่สำเร็จ');
      }
      const committedItems = Array.isArray(commitRes?.items) ? commitRes.items : [];
      const localMap = commitRes?.localImagesMap;

      for (let i = 0; i < targetRows.length; i++) {
        const r = targetRows[i];
        const serverIt = committedItems[i] || committedItems.find((x) =>
          (r.source_reel_url && x.source_reel_url === r.source_reel_url) ||
          (r.item_id && String(x.item_id) === String(r.item_id))
        );
        if (serverIt) {
          if (serverIt.spy_sub_id2) r.spy_sub_id2 = serverIt.spy_sub_id2;
          if (serverIt.spy_seq) r.spy_seq = serverIt.spy_seq;
          if (serverIt.sku_code) r.sku_code = serverIt.sku_code;
          if (serverIt.our_short_link) r.shortLink = serverIt.our_short_link;
          r.gatePass = Boolean(serverIt.gatePass);
          if (serverIt.decision) r.gateDecision = serverIt.decision;
          if (serverIt.reason) r.gateReason = serverIt.reason;
        }
        if (localMap && r.spy_sub_id2 && Array.isArray(localMap[r.spy_sub_id2]) && localMap[r.spy_sub_id2].length > 0) {
          r.localImages = localMap[r.spy_sub_id2];
        }
        r.serverSynced = true;
        r.serverSyncError = '';
        r.serverSyncedAt = new Date().toISOString();
      }
    } catch (err) {
      const errMsg = err?.message || String(err);
      for (const r of targetRows) {
        r.serverSynced = false;
        r.serverSyncError = errMsg;
      }
      persistLastSpySession();
      throw err;
    }
  }
  persistLastSpySession();
  return commitRes;
}

function isSpyRowReadyToSync(r) {
  return Boolean(r) && !r.serverSynced && (Boolean(r.rateChecked) || Number(r.price) > 0 || !r.item_id);
}

async function syncSingleSpyRowToServer(idx) {
  if (spyCollectRunning || spyBatchRetryRunning || spyRerunningIndices.has(idx)) {
    ns.showToast('⏳ กำลังดำเนินการอยู่...');
    return;
  }
  const row = lastSpyEnrichedItems[idx];
  if (!row) return;

  spyRerunningIndices.add(idx);
  renderSpyCollectorResults(lastSpyEnrichedItems);

  try {
    await ensureSpyRowsShortLinksAndSave([row]);
    if (ns.evaluateSpyGate(row).pass) {
      ns.showToast(`☁️ ส่งขึ้นเว็บ Spy Pool สำเร็จ (${row.spy_sub_id2 || row.item_id})!`);
    } else {
      ns.showToast(`🗂️ บันทึกลง Reject Log บนเว็บแล้ว (${row.spy_sub_id2 || row.item_id})`);
    }
  } catch (err) {
    ns.showToast(`❌ ส่งขึ้นเว็บไม่สำเร็จ: ${err?.message || String(err)}`, 'error');
  } finally {
    spyRerunningIndices.delete(idx);
    persistLastSpySession();
    renderSpyCollectorResults(lastSpyEnrichedItems);
  }
}

async function syncUnsentSpyRowsToServer() {
  if (spyCollectRunning || spyBatchRetryRunning) {
    ns.showToast('⏳ กำลังดำเนินการอยู่...');
    return;
  }
  const unsentRows = lastSpyEnrichedItems.filter(isSpyRowReadyToSync);
  if (!unsentRows.length) {
    ns.showToast('☁️ ทุกรายการซิงก์ขึ้นเว็บครบแล้ว!');
    return;
  }

  const progWrap = document.getElementById('drb-spy-progress-wrap');
  const progBar = document.getElementById('drb-spy-progress-bar');
  const progTxt = document.getElementById('drb-spy-progress-text');

  spyBatchRetryRunning = true;
  if (progWrap) progWrap.hidden = false;
  if (progBar) progBar.style.width = '35%';
  if (progTxt) {
    progTxt.textContent = `⏳ กำลังส่ง ${unsentRows.length} รายการขึ้นเว็บ aff.doctorbankonline.com...`;
  }
  renderSpyCollectorResults(lastSpyEnrichedItems);

  try {
    const commitRes = await ensureSpyRowsShortLinksAndSave(unsentRows);
    const srvPassed = Number(commitRes?.passedCount ?? 0);
    const srvRejected = Number(commitRes?.rejectedCount ?? 0);
    if (progBar) progBar.style.width = '100%';
    if (progTxt) {
      progTxt.innerHTML = `<span style="color:#15803d;font-weight:800;">☁️ ซิงก์ขึ้นเว็บสำเร็จ ${unsentRows.length} รายการ (ขึ้น Spy Pool ${srvPassed} · Reject Log ${srvRejected})!</span>`;
    }
    ns.showToast(`☁️ ซิงก์ขึ้นเว็บสำเร็จ ${unsentRows.length} รายการ!`);
  } catch (err) {
    const msg = err?.message || String(err);
    if (progTxt) {
      progTxt.innerHTML = `<span style="color:#dc2626;font-weight:700;">❌ ส่งขึ้นเว็บไม่สำเร็จ: ${escHtml(msg)}</span>`;
    }
    ns.showToast(`❌ ส่งขึ้นเว็บไม่สำเร็จ: ${msg}`, 'error');
  } finally {
    spyBatchRetryRunning = false;
    persistLastSpySession();
    renderSpyCollectorResults(lastSpyEnrichedItems);
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
    let commitErr = '';
    if (row.item_id) {
      try {
        await ensureSpyRowsShortLinksAndSave([row]);
      } catch (saveErr) {
        commitErr = saveErr?.message || String(saveErr);
      }
    }
    const g = ns.evaluateSpyGate(row);
    if (commitErr) {
      ns.showToast(`⚠️ เช็กเรทได้ แต่ส่งขึ้นเว็บไม่สำเร็จ: ${commitErr}`, 'error');
    } else if (g.pass) {
      ns.showToast(
        `✅ ผ่านเกณฑ์ ${row.spy_sub_id2 || row.item_id}: Extra ${row.extraRate}% · ค่าคอม ${ns.formatTHB(row.netComm)} (ขึ้นเว็บแล้ว)`
      );
    } else if (Number(row.price) > 0) {
      ns.showToast(`🔴 ${g.reason} (บันทึก Reject Log แล้ว)`, 'error');
    } else {
      ns.showToast(`⚠️ ${row.rateError || 'ยังดึง EXTRACOMM ไม่สำเร็จ (ลองเปิด 🔍 หน้า AFF ↗)'}`, 'error');
    }
  } finally {
    spyRerunningIndices.delete(idx);
    persistLastSpySession();
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
    .filter(({ r }) => !r.confirmedNoExtra && (!r.item_id || !r.rateChecked || Boolean(r.rateError) || Number(r.price) <= 0))
    .map(({ i }) => i);

  if (!targetIndices.length) {
    ns.showToast('✅ ทุกรายการตรวจเรทเรียบร้อยแล้ว!');
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

    let commitFailedCount = 0;
    let lastCommitErr = '';
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
        try {
          await ensureSpyRowsShortLinksAndSave([row]);
          if (ns.evaluateSpyGate(row).pass) updatedCount++;
        } catch (saveErr) {
          commitFailedCount++;
          lastCommitErr = saveErr?.message || String(saveErr);
        }
      }
      spyRerunningIndices.delete(idx);
      renderSpyCollectorResults(lastSpyEnrichedItems);
    }

    if (!stoppedBySec) {
      if (progBar) progBar.style.width = '100%';
      if (commitFailedCount > 0) {
        if (progTxt) {
          progTxt.innerHTML = `<span style="color:#dc2626;font-weight:800;">⚠️ เช็กเรทแล้ว แต่ส่งขึ้นเว็บพลาด ${commitFailedCount} ตัว: ${escHtml(lastCommitErr)}</span>`;
        }
        ns.showToast(`⚠️ ส่งขึ้นเว็บไม่สำเร็จ ${commitFailedCount} ตัว: ${lastCommitErr}`, 'error');
      } else {
        if (progTxt) {
          progTxt.innerHTML = `<span style="color:#15803d;font-weight:800;">✅ รีเช็กเสร็จสิ้น — ผ่านเกณฑ์ ${updatedCount}/${targetIndices.length} ตัว (ซิงก์เว็บแล้ว)</span>`;
        }
        ns.showToast(`✅ รีเช็กเสร็จสิ้น (ผ่านเกณฑ์ ${updatedCount}/${targetIndices.length} ตัว)`);
      }
    }
  } finally {
    spyBatchRetryRunning = false;
    spyRerunningIndices.clear();
    persistLastSpySession();
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
    // Stage 1: POST /api/shopee-aff/spy-collect (resolve_only: true — ยังไม่เขียนลง Spy Pool จนกว่าจะเช็กค่าคอมผ่าน Gate)
    const collectRes = await ns.sendMessage('SPY_COLLECT_REELS', { reels, resolveOnly: true });
    const items = Array.isArray(collectRes?.items) ? collectRes.items : [];
    if (!items.length) {
      throw new Error(collectRes?.error || 'เซิร์ฟเวอร์ไม่คืนรายการสินค้ากลับมา');
    }

    // Prepare display models
    const enrichedItems = items.map((it) => {
      const hasKnownSold =
        it.sold_monthly !== null &&
        it.sold_monthly !== undefined &&
        (Number(it.sold_monthly) > 0 || it.sold_known === true || (it.sold_source && it.sold_source !== 'unknown'));
      return {
        ...it,
        price: Number(it.price) || 0,
        baseRate: Number(it.base_comm_pct) || 0,
        extraRate: Number(it.extra_comm_pct) || 0,
        netComm: Number(it.net_comm_baht) || 0,
        soldCount: hasKnownSold ? Number(it.sold_monthly) || 0 : null,
        soldSource: it.sold_source || (hasKnownSold ? 'server_pool' : 'unknown'),
        sold_known: hasKnownSold,
        shortLink: it.our_short_link || '',
        imagesHD: Array.isArray(it.images_hd)
          ? it.images_hd
          : it.product_image_url && /^https?:\/\//i.test(it.product_image_url)
            ? [it.product_image_url]
            : [],
        localImages: Array.isArray(it.local_images) ? it.local_images : [],
        rateChecked: false,
        rateError: '',
        confirmedNoExtra: false,
        gatePass: false,
        gateDecision: '',
        gateReason: '',
        serverSynced: false,
        serverSyncError: '',
        swapLoading: false,
        swapError: '',
        swapCandidates: null
      };
    });
    lastSpyEnrichedItems = enrichedItems;
    persistLastSpySession();
    renderSpyCollectorResults(enrichedItems);

    if (enrichedItems.some((r) => r.item_id || r.competitor_short_url)) {
      if (collectBtn) collectBtn.textContent = '⏳ เตรียม/ปลุกแท็บ AFF...';
      const bridgeRes = await ensureSpyAffBridgeReadyWithFeedback({ progTxtEl: progTxt });
      if (!bridgeRes.ok && bridgeRes.securityCheck) {
        throw new Error(bridgeRes.error);
      }
    }

    // Stage 2 + Per-Card Instant Sync: Check rate & immediately commit each card to Spy Pool / Reject Log
    let securityBlockedErr = '';
    for (let idx = 0; idx < enrichedItems.length; idx++) {
      const row = enrichedItems[idx];
      const cleanItemId = String(row.item_id || '').replace(/[^0-9]/g, '');
      const basePct = 15 + Math.round((idx / enrichedItems.length) * 80);
      if (progBar) progBar.style.width = `${basePct}%`;

      if (cleanItemId) {
        if (progTxt) {
          progTxt.textContent = `⏳ [${idx + 1}/${enrichedItems.length}] เช็กเรท Social Media จริง: ${row.spy_sub_id2 || cleanItemId}...`;
        }
        if (collectBtn) {
          collectBtn.textContent = `⏳ เช็กค่าคอม (${idx + 1}/${enrichedItems.length})...`;
        }
      }

      const needForce = Number(row.price) <= 0 || Number(row.netComm) <= 0 || Number(row.extraRate) <= 0;
      const res = await resolveSpyRowItemAndRate(row, needForce);
      if (res.securityCheck) {
        securityBlockedErr = res.error;
        renderSpyCollectorResults(enrichedItems);
        break;
      }

      const rowLabel = row.spy_sub_id2 || cleanItemId || 'รายการ';
      if (progTxt) {
        progTxt.textContent = `⏳ [${idx + 1}/${enrichedItems.length}] กำลังส่ง ${rowLabel} ขึ้นเว็บทันที...`;
      }
      if (collectBtn) {
        collectBtn.textContent = `☁️ ส่งขึ้นเว็บ (${idx + 1}/${enrichedItems.length})...`;
      }
      try {
        await ensureSpyRowsShortLinksAndSave([row]);
      } catch (commitErr) {
        row.serverSynced = false;
        row.serverSyncError = commitErr?.message || String(commitErr);
      }

      const donePct = 15 + Math.round(((idx + 1) / enrichedItems.length) * 80);
      if (progBar) progBar.style.width = `${donePct}%`;
      persistLastSpySession();
      renderSpyCollectorResults(enrichedItems);
    }

    if (securityBlockedErr) {
      throw new Error(securityBlockedErr);
    }

    const unsentRemaining = enrichedItems.filter((r) => !r.serverSynced && !r.rateError);
    if (unsentRemaining.length > 0) {
      if (progBar) progBar.style.width = '96%';
      if (progTxt) {
        progTxt.textContent = `⏳ กำลังเก็บตกส่งรายการที่เหลือ (${unsentRemaining.length} ตัว) ขึ้นเว็บ...`;
      }
      await ensureSpyRowsShortLinksAndSave(unsentRemaining).catch(() => {});
    }

    spyCollectRunning = false;
    renderSpyCollectorResults(enrichedItems);
    const syncedPassCount = enrichedItems.filter((r) => r.serverSynced && ns.evaluateSpyGate(r).pass).length;
    const syncedRejectCount = enrichedItems.filter((r) => r.serverSynced && !ns.evaluateSpyGate(r).pass).length;
    const unsyncedCount = enrichedItems.filter((r) => !r.serverSynced).length;
    if (progBar) progBar.style.width = '100%';
    if (unsyncedCount > 0) {
      if (progTxt) {
        progTxt.innerHTML = `<span style="color:#d97706;font-weight:800;">⚠️ ขึ้นเว็บแล้ว ${syncedPassCount} ตัว · คัดออก ${syncedRejectCount} ตัว · ยังไม่ขึ้นเว็บ ${unsyncedCount} ตัว (กดปุ่ม ☁️ ส่งขึ้นเว็บทันที)</span>`;
      }
      ns.showToast(`⚠️ ขึ้นเว็บแล้ว ${syncedPassCount} ตัว · ยังค้างส่ง ${unsyncedCount} ตัว`, 'error');
    } else {
      if (progTxt) {
        progTxt.innerHTML = `<span style="color:#15803d;font-weight:800;">✅ ขึ้นเว็บ Spy Pool แล้ว ${syncedPassCount} ตัว · 🗂️ ลง Reject Log บนเว็บแล้ว ${syncedRejectCount} ตัว!</span>`;
      }
      ns.showToast(`🎉 Collect เสร็จ! ขึ้นเว็บ ${syncedPassCount} ตัว (ลง Reject Log ${syncedRejectCount} ตัว)`);
    }
    if (sumStrip) sumStrip.hidden = false;
  } catch (err) {
    if (progTxt) {
      progTxt.innerHTML = `<span style="color:#dc2626;font-weight:700;">❌ ${escHtml(err?.message || String(err))}</span>`;
    }
    ns.showToast(`❌ ${err?.message || String(err)}`, 'error');
  } finally {
    spyCollectRunning = false;
    persistLastSpySession();
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
  const syncUnsentBtn = document.getElementById('drb-spy-btn-sync-unsent');
  const retryFailedBtn = document.getElementById('drb-spy-btn-retry-failed');
  if (!listEl) return;

  let syncedPassCount = 0;
  let localPassUnsyncedCount = 0;
  let failCount = 0;
  let noTagCount = 0;
  let retryNeedCount = 0;
  let unsentCount = 0;

  items.forEach((r) => {
    if (isSpyRowReadyToSync(r)) {
      unsentCount++;
    }
    if (!r.item_id) {
      noTagCount++;
      retryNeedCount++;
    } else {
      if (!r.confirmedNoExtra && (!r.rateChecked || Boolean(r.rateError) || Number(r.price) <= 0)) {
        retryNeedCount++;
      }
      if (ns.evaluateSpyGate(r).pass) {
        if (r.serverSynced) {
          syncedPassCount++;
        } else {
          localPassUnsyncedCount++;
        }
      } else {
        failCount++;
      }
    }
  });

  if (sumStrip) {
    sumStrip.hidden = items.length === 0;
    setText(
      'drb-spy-summary-text',
      `รวม ${items.length} คลิป · ☁️ ขึ้นเว็บแล้ว ${syncedPassCount}${localPassUnsyncedCount > 0 ? ` (⚠️ รอส่งขึ้นเว็บ ${localPassUnsyncedCount})` : ''} · 🗂️ คัดออก ${failCount}${noTagCount > 0 ? ` · ⚠️ ไร้ตะกร้า ${noTagCount}` : ''}`
    );
  }
  if (syncUnsentBtn) {
    syncUnsentBtn.hidden = items.length === 0 || spyCollectRunning || unsentCount === 0;
    syncUnsentBtn.disabled = spyCollectRunning || spyBatchRetryRunning;
    syncUnsentBtn.textContent = spyBatchRetryRunning
      ? '⏳ กำลังซิงก์...'
      : `☁️ ส่งขึ้นเว็บทันที (${unsentCount})`;
  }
  if (retryFailedBtn) {
    retryFailedBtn.hidden = items.length === 0 || spyCollectRunning || retryNeedCount === 0;
    retryFailedBtn.disabled = spyCollectRunning || spyBatchRetryRunning;
    retryFailedBtn.textContent = spyBatchRetryRunning
      ? '⏳ กำลังรีเช็ก...'
      : `🔄 รีเช็กตัวที่ดึงพลาด (${retryNeedCount})`;
  }

  listEl.innerHTML = items
    .map((r, i) => {
      const hasItem = Boolean(r.item_id);
      const gate = ns.evaluateSpyGate(r);
      const isPass = hasItem && gate.pass;
      const isSynced = Boolean(r.serverSynced);
      const gateTier = !hasItem ? 'notag' : isPass ? (isSynced ? 'pass' : 'notag') : 'fail';
      const isRerunning = spyRerunningIndices.has(i);

      let bannerLeft = '⏳ กำลังเช็กค่าคอม...';
      if (isRerunning) {
        bannerLeft = '⏳ กำลังดำเนินการ...';
      } else if (!hasItem) {
        if (isSynced) {
          bannerLeft = r.competitor_short_url
            ? '⚠️ แกะรหัสสินค้าไม่ได้ — 🗂️ ลง Reject Log บนเว็บแล้ว'
            : '⚠️ ไม่พบป้ายตะกร้า — 🗂️ ลง Reject Log บนเว็บแล้ว';
        } else {
          bannerLeft = r.competitor_short_url
            ? '⚠️ พบตะกร้าแต่แกะรหัสสินค้าไม่ได้ (ยังไม่ส่ง Log ขึ้นเว็บ)'
            : '⚠️ ไม่พบป้ายตะกร้า Shopee (ยังไม่ส่ง Log ขึ้นเว็บ)';
        }
      } else if (!r.rateChecked && r.netComm <= 0 && r.extraRate <= 0) {
        bannerLeft = '⏳ กำลังดึงเรท Social Media...';
      } else if (isPass) {
        if (isSynced) {
          bannerLeft = `🟢 ☁️ ขึ้นเว็บ Spy Pool แล้ว! (${r.spy_sub_id2 || 'Synced'})`;
        } else {
          bannerLeft = '🟡 เช็กเรทผ่านเกณฑ์แล้ว — ⚠️ ยังไม่ได้ส่งขึ้นเว็บ (กด ☁️ ส่งขึ้นเว็บ)';
        }
      } else {
        bannerLeft = isSynced
          ? `🔴 ${gate.reason} — 🗂️ บันทึก Reject Log บนเว็บแล้ว`
          : `🔴 ${gate.reason} — ⚠️ ยังไม่ได้ส่ง Log ขึ้นเว็บ`;
      }

      const sub2Badge = escHtml(r.spy_sub_id2 || `SPY#${i + 1}`);
      const totalPct = +((Number(r.baseRate) || 0) + (Number(r.extraRate) || 0)).toFixed(1);
      const shortLinkHtml = r.shortLink
        ? `<button type="button" class="sp-ghost-sm-btn spy-copy-link-btn" data-link="${escHtml(r.shortLink)}" title="คลิกเพื่อคัดลอกลิงก์ s.shopee.co.th ของเรา">🔗 ${escHtml(r.shortLink)}</button>`
        : !hasItem && r.competitor_short_url
          ? `<button type="button" class="sp-ghost-sm-btn spy-open-url-btn" data-url="${escHtml(r.competitor_short_url)}" title="เปิดลิงก์ตะกร้าที่พบในคลิป">🛒 ${escHtml(r.competitor_short_url)} ↗</button>`
          : `<span style="font-size:11px;color:var(--sp-text-3);">${!hasItem ? 'ไม่มีลิงก์สินค้า' : (!isPass && r.rateChecked ? '🚫 ไม่เจนลิงก์ (คัดออก)' : '⏳ รอเจนลิงก์...')}</span>`;

      const activeItemId = r.target_item_id || r.item_id || '';
      const affUrl = activeItemId ? `https://affiliate.shopee.co.th/offer/product_offer/${activeItemId}` : '';
      const disableRowActions = spyCollectRunning || spyBatchRetryRunning || isRerunning;
      const showRowSyncBtn = !isSynced && (Boolean(r.rateChecked) || Number(r.price) > 0 || !hasItem);
      const canFindSwap = hasItem && !r.is_promoted && !r.swap?.locked;
      const baseWebUrl = String(currentSettings.webUiBaseUrl || 'https://aff.doctorbankonline.com').replace(/\/+$/, '');
      const localThumb = Array.isArray(r.localImages) && r.localImages[0]
        ? (r.localImages[0].startsWith('http') ? r.localImages[0] : `${baseWebUrl}${r.localImages[0]}`)
        : '';
      const thumbUrl = (Array.isArray(r.imagesHD) && r.imagesHD[0]) || localThumb || '';
      const thumbHtml = thumbUrl
        ? `<img src="${escHtml(thumbUrl)}" class="sp-spy-item-thumb" alt="" loading="lazy" referrerpolicy="no-referrer">`
        : '';

      const soldKnown = gate.soldKnown;
      const soldVal = gate.soldMonthly;
      const soldBadgeHtml = !soldKnown
        ? `<span style="color:#d97706;font-weight:700;">📦 ยอดขาย: ไม่ทราบ</span>`
        : soldVal === 0
        ? `<span style="color:#dc2626;font-weight:800;">📦 ขาย 0 ชิ้น/ด. (ตัดทิ้ง)</span>`
        : `<span style="color:${soldVal >= 100 ? '#15803d' : '#d97706'};font-weight:700;">📦 ขาย ${soldVal.toLocaleString()}/ด.</span>`;

      const gradeBadgeHtml =
        gate.grade === 'A'
          ? `<span style="background:rgba(16,185,129,0.16);color:#059669;padding:1px 6px;border-radius:999px;font-weight:800;">⭐ Grade A</span>`
          : gate.grade === 'B'
          ? `<span style="background:rgba(59,130,246,0.16);color:#2563eb;padding:1px 6px;border-radius:999px;font-weight:800;">💎 Grade B</span>`
          : gate.grade === 'PASS_WARN'
          ? `<span style="background:rgba(245,158,11,0.16);color:#d97706;padding:1px 6px;border-radius:999px;font-weight:700;">⚠️ WARN</span>`
          : `<span style="background:rgba(220,38,38,0.16);color:#dc2626;padding:1px 6px;border-radius:999px;font-weight:800;">🚫 ตัดทิ้ง</span>`;

      const swapBadgeHtml = r.swap
        ? `<span style="background:rgba(139,92,246,0.16);color:#7c3aed;padding:1px 6px;border-radius:999px;font-weight:700;">🔄 สลับร้านแล้ว</span>`
        : '';

      const swapTrayHtml = renderSpySwapTrayHtml(r, i);

      return `
        <div class="sp-spy-item-card" data-gate="${gateTier}" data-idx="${i}">
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
                <div style="font-size:11.5px;color:var(--sp-text-2);display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:3px;">
                  <span>📺 <b>${escHtml(r.competitor_page || '-')}</b></span>
                  <span>·</span>
                  <span>👁️ ${Number(r.fb_views || 0).toLocaleString()}</span>
                  <span>·</span>
                  <span>SKU: <code>${escHtml(r.sku_code || '-')}</code></span>
                  <span>·</span>
                  ${soldBadgeHtml}
                  ${gradeBadgeHtml}
                  ${swapBadgeHtml}
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
            ${r.serverSyncError ? `<div style="font-size:11.5px;color:#dc2626;font-weight:700;">⚠️ ซิงก์เว็บพลาด: ${escHtml(r.serverSyncError)}</div>` : ''}
            ${swapTrayHtml}
            <div class="sp-spy-item-footer">
              ${shortLinkHtml}
              <div style="display:flex;gap:5px;flex-wrap:wrap;">
                ${canFindSwap ? `<button type="button" class="sp-ghost-sm-btn spy-find-swap-btn" data-idx="${i}" ${disableRowActions || r.swapLoading ? 'disabled' : ''} style="border-color:rgba(139,92,246,0.45);color:#7c3aed;font-weight:700;" title="ค้นหาร้านอื่นที่ขายดีและให้ค่าคอมสูงกว่าแล้วเปลี่ยนลิงก์ทดแทน">🔎 หาร้านขายดีแทน</button>` : ''}
                ${showRowSyncBtn ? `<button type="button" class="sp-ghost-sm-btn spy-sync-row-btn" data-idx="${i}" ${disableRowActions ? 'disabled' : ''} style="border-color:var(--sp-extra-border);color:var(--sp-extra);" title="ส่งข้อมูลการ์ดนี้ขึ้นเว็บ aff.doctorbankonline.com ทันทีโดยไม่ต้องเช็กเรท Shopee ซ้ำ">☁️ ส่งขึ้นเว็บ</button>` : ''}
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

  listEl.querySelectorAll('.spy-find-swap-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (Number.isInteger(idx)) findSwapCandidatesForSpyRow(idx);
    });
  });

  listEl.querySelectorAll('.spy-verify-cand-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rIdx = parseInt(btn.getAttribute('data-row-idx'), 10);
      const cIdx = parseInt(btn.getAttribute('data-cand-idx'), 10);
      if (Number.isInteger(rIdx) && Number.isInteger(cIdx)) verifySwapCandidateTier1(rIdx, cIdx);
    });
  });

  listEl.querySelectorAll('.spy-apply-cand-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rIdx = parseInt(btn.getAttribute('data-row-idx'), 10);
      const cIdx = parseInt(btn.getAttribute('data-cand-idx'), 10);
      if (Number.isInteger(rIdx) && Number.isInteger(cIdx)) applySwapCandidateToSpyRow(rIdx, cIdx);
    });
  });

  listEl.querySelectorAll('.spy-sync-row-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (Number.isInteger(idx)) syncSingleSpyRowToServer(idx);
    });
  });

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

function renderSpySwapTrayHtml(r, rowIdx) {
  if (r.swapLoading) {
    return `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(139,92,246,0.08);border:1px dashed rgba(139,92,246,0.4);font-size:11.5px;color:#6d28d9;font-weight:700;">⏳ กำลังค้นหาร้านขายดี + เช็กช่วงราคา ±25% (รอหน่วง anti-bot)...</div>`;
  }
  if (r.swapError) {
    return `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.3);font-size:11.5px;color:#dc2626;font-weight:700;">❌ ${escHtml(r.swapError)}</div>`;
  }
  if (!Array.isArray(r.swapCandidates)) return '';
  if (r.swapCandidates.length === 0) {
    return `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(245,158,11,0.10);border:1px solid rgba(245,158,11,0.35);font-size:11.5px;color:#b45309;font-weight:700;">⚠️ ไม่พบร้านอื่นที่สเปกตรง + ขาย ≥30/ด. + คอม ≥฿20 ในช่วงราคา ±25%</div>`;
  }

  return `
    <div style="margin-top:8px;padding:8px;border-radius:9px;background:rgba(15,23,42,0.04);border:1px solid rgba(139,92,246,0.32);display:flex;flex-direction:column;gap:7px;">
      <div style="font-size:11px;font-weight:800;color:#6d28d9;display:flex;justify-content:space-between;align-items:center;">
        <span>🔎 Top ${r.swapCandidates.length} ร้านทดแทน (ต้องกด 1️⃣ เช็กเรตจริง Tier 1 ก่อนสลับ)</span>
      </div>
      ${r.swapCandidates
        .map((c, cIdx) => {
          const cGate = ns.evaluateSpyGate({
            itemId: c.itemId,
            price: c.price,
            baseRate: c.baseRate,
            extraRate: c.extraRate,
            netComm: c.netComm,
            soldCount: c.soldMonthly,
            soldSource: c.tier1Verified ? 'affiliate_offer_api' : 'offer_list_xhr',
            fb_views: r.fb_views,
            fb_shares: r.fb_shares
          });
          const canApply = Boolean(c.tier1Verified && cGate.pass && !c.applying);
          return `
            <div style="display:flex;gap:8px;align-items:flex-start;padding:7px;border-radius:7px;background:var(--sp-bg-card,#fff);border:1px solid rgba(148,163,184,0.3);">
              ${c.imageUrl ? `<img src="${escHtml(c.imageUrl)}" referrerpolicy="no-referrer" style="width:42px;height:42px;border-radius:6px;object-fit:cover;flex-shrink:0;" />` : ''}
              <div style="min-width:0;flex:1;">
                <div style="font-size:11.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(c.title)}">${escHtml(c.title)}</div>
                <div style="font-size:11px;color:var(--sp-text-2);display:flex;gap:5px;flex-wrap:wrap;margin-top:2px;">
                  <span>${c.isMall ? '🏬 Mall' : '🏪 ' + escHtml(c.shopName)}</span>
                  <span>· ขาย <b>${Number(c.soldMonthly || 0).toLocaleString()}</b>/ด.</span>
                  <span>· ${ns.formatTHB(c.price || 0, 0)}${c.priceAdjusted ? ' (ตัวหลัก)' : ''}</span>
                  <span>· Ex <b>${Number(c.extraRate || 0)}%</b> · คอม <b style="color:#059669;">${ns.formatTHB(c.netComm || 0)}</b></span>
                  ${c.upliftPct > 0 ? `<span style="color:#7c3aed;font-weight:800;">(+${c.upliftPct}%)</span>` : ''}
                </div>
                <div style="font-size:10.5px;margin-top:3px;display:flex;gap:5px;align-items:center;flex-wrap:wrap;">
                  ${c.tier1Verified
                    ? `<span style="color:${cGate.pass ? '#059669' : '#dc2626'};font-weight:800;">${cGate.pass ? '✅ Tier 1 ยืนยันแล้ว' : '🚫 ไม่ผ่าน Gate: ' + escHtml(cGate.reason)}</span>`
                    : `<span style="color:#d97706;font-weight:700;">⚠️ เรตประมาณจากลิสต์ (ยังไม่ยืนยัน Social Media)</span>`}
                  ${c.verifyError ? `<span style="color:#dc2626;">(${escHtml(c.verifyError)})</span>` : ''}
                </div>
                <div style="display:flex;gap:5px;margin-top:5px;flex-wrap:wrap;">
                  <button type="button" class="sp-ghost-sm-btn spy-verify-cand-btn" data-row-idx="${rowIdx}" data-cand-idx="${cIdx}" ${c.verifying || c.applying ? 'disabled' : ''}>
                    ${c.verifying ? '⏳ เช็ก Tier 1...' : (c.tier1Verified ? '🔁 รีเช็ก Tier 1' : '1️⃣ เช็กเรตจริง Tier 1')}
                  </button>
                  <button type="button" class="sp-ghost-sm-btn spy-apply-cand-btn" data-row-idx="${rowIdx}" data-cand-idx="${cIdx}" ${canApply ? '' : 'disabled'} style="${canApply ? 'background:#7c3aed;color:#fff;border-color:#7c3aed;font-weight:800;' : 'opacity:0.45;cursor:not-allowed;'}" title="ใช้ร้านนี้แทนและสร้างลิงก์ s.shopee.co.th ใหม่">
                    ${c.applying ? '⏳ กำลังสลับร้าน...' : '🔄 ใช้ร้านนี้แทน'}
                  </button>
                </div>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

async function findSwapCandidatesForSpyRow(idx) {
  const row = lastSpyEnrichedItems[idx];
  if (!row || row.swapLoading) return;
  row.swapLoading = true;
  row.swapError = '';
  renderSpyCollectorResults(lastSpyEnrichedItems);

  try {
    const res = await ns.sendMessage('FIND_BETTER_SHOPS_FOR_ITEM', {
      itemId: row.target_item_id || row.item_id || '',
      title: row.product_tag_title || '',
      price: row.price || 0,
      netComm: row.netComm || 0,
      soldCount: row.soldCount || 0
    });
    if (!res?.ok) {
      row.swapError = res?.error || 'ค้นหาร้านทดแทนไม่สำเร็จ';
      row.swapCandidates = null;
    } else {
      row.swapCandidates = Array.isArray(res.candidates) ? res.candidates : [];
    }
  } catch (err) {
    row.swapError = err?.message || String(err);
  } finally {
    row.swapLoading = false;
    persistLastSpySession();
    renderSpyCollectorResults(lastSpyEnrichedItems);
  }
}

async function verifySwapCandidateTier1(rowIdx, candIdx) {
  const row = lastSpyEnrichedItems[rowIdx];
  const cand = row?.swapCandidates?.[candIdx];
  if (!row || !cand || cand.verifying) return;
  cand.verifying = true;
  cand.verifyError = '';
  renderSpyCollectorResults(lastSpyEnrichedItems);

  try {
    const res = await ns.sendMessage('GET_REAL_AFF_OFFER', {
      itemId: cand.itemId,
      shopId: cand.shopId,
      titleHint: cand.title,
      forceRefresh: true,
      mode: 'single'
    });
    if (!res?.ok || !res?.data || res.data.rateError) {
      cand.verifyError = res?.error || res?.data?.error || 'ดึงเรต Tier 1 ไม่สำเร็จ';
      cand.tier1Verified = false;
    } else {
      const d = res.data;
      const p = Number(d.offerPrice || d.price) > 0 ? Number(d.offerPrice || d.price) : cand.price;
      const bRate = Number(d.baseRate) || 0;
      const xRate = Number(d.extraRate) || 0;
      const comm = ns.calculateCommission({
        price: p,
        baseRate: bRate,
        extraRate: xRate,
        capTHB: 250,
        whtRate: 0.0,
        realDailyAdCostTHB: 100
      });
      cand.price = p;
      cand.baseRate = bRate;
      cand.extraRate = xRate;
      cand.totalRate = +(bRate + xRate).toFixed(2);
      cand.netComm = +comm.netComm.toFixed(2);
      if (d.soldCount !== null && d.soldCount !== undefined) {
        cand.soldMonthly = Number(d.soldCount) || 0;
      }
      if (Array.isArray(d.imagesHD) && d.imagesHD.length > 0) {
        cand.imagesHD = d.imagesHD.slice(0, 8);
      }
      cand.tier1Verified = Boolean(d.realRateVerified || d.domTableVerified);
      cand.rateSource = d.rateSource || 'social_media_detail_api';
      if (!cand.tier1Verified) {
        cand.verifyError = 'API ยืนยันเฉพาะเรตประมาณ ยังไม่ยืนยัน Social Media Tier 1';
      }
    }
  } catch (err) {
    cand.verifyError = err?.message || String(err);
    cand.tier1Verified = false;
  } finally {
    cand.verifying = false;
    persistLastSpySession();
    renderSpyCollectorResults(lastSpyEnrichedItems);
  }
}

async function applySwapCandidateToSpyRow(rowIdx, candIdx) {
  const row = lastSpyEnrichedItems[rowIdx];
  const cand = row?.swapCandidates?.[candIdx];
  if (!row || !cand || !cand.tier1Verified || cand.applying) return;
  cand.applying = true;
  cand.verifyError = '';
  renderSpyCollectorResults(lastSpyCollectorItemsSafe(lastSpyEnrichedItems));

  try {
    const activeSub1 = document.getElementById('drb-sp-sub1')?.value.trim() || row.sub_id1 || '16NOV26FBRAD';
    const todaySub3 = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const nextSkuCode = `SP${String(cand.itemId).slice(-6)}`;

    // Build tracking link for swapped store with existing spy_sub_id2
    let newShortLink = '';
    const linkRes = await ns
      .sendMessage('GENERATE_AFF_SHORTLINK', {
        originalLink: cand.cleanUrl,
        subIds: [
          activeSub1,
          row.spy_sub_id2 || '',
          todaySub3,
          nextSkuCode,
          `P01SPY${String(row.spy_seq || 1).padStart(3, '0')}`
        ]
      })
      .catch(() => null);
    if (linkRes?.shortLink || linkRes?.short_link) {
      newShortLink = linkRes.shortLink || linkRes.short_link;
    }

    const swapRes = await ns.sendMessage('SPY_SWAP_SHOP', {
      spy_sub_id2: row.spy_sub_id2 || '',
      orig_item_id: row.item_id || '',
      source_reel_url: row.source_reel_url || '',
      competitor_page: row.competitor_page || '',
      fb_views: row.fb_views || 0,
      fb_reactions: row.fb_reactions || 0,
      fb_comments: row.fb_comments || 0,
      fb_shares: row.fb_shares || '0',
      caption_full: row.caption_full || '',
      duration_sec: row.duration_sec || 10,
      chosen: {
        item_id: cand.itemId,
        shop_id: cand.shopId,
        shop_name: cand.shopName,
        title: cand.title,
        price: cand.price,
        base_comm_pct: cand.baseRate,
        extra_comm_pct: cand.extraRate,
        net_comm_baht: cand.netComm,
        sold_monthly: cand.soldMonthly,
        clean_product_url: cand.cleanUrl,
        aff_offer_url: cand.offerUrl,
        our_short_link: newShortLink,
        images_hd: cand.imagesHD || (cand.imageUrl ? [cand.imageUrl] : []),
        tier1_verified: true
      },
      reason: 'best_shop_swap_sidepanel'
    });

    if (!swapRes?.ok) {
      throw new Error(swapRes?.error || 'เซิร์ฟเวอร์ปฏิเสธการสลับร้าน');
    }

    row.orig_item_id = row.item_id;
    row.target_item_id = String(cand.itemId);
    row.target_shop_id = String(cand.shopId);
    row.sku_code = swapRes.item?.sku_code || nextSkuCode;
    row.product_tag_title = cand.title || row.product_tag_title;
    row.price = cand.price;
    row.baseRate = cand.baseRate;
    row.extraRate = cand.extraRate;
    row.netComm = cand.netComm;
    row.soldCount = cand.soldMonthly;
    row.soldSource = 'affiliate_offer_api';
    row.sold_known = true;
    row.clean_product_url = cand.cleanUrl;
    row.aff_offer_url = cand.offerUrl;
    if (newShortLink) row.shortLink = newShortLink;
    if (Array.isArray(cand.imagesHD) && cand.imagesHD.length > 0) row.imagesHD = cand.imagesHD;
    if (Array.isArray(swapRes.item?.local_images)) row.localImages = swapRes.item.local_images;
    if (swapRes.item?.spy_sub_id2) row.spy_sub_id2 = swapRes.item.spy_sub_id2;
    row.swap = swapRes.item?.swap || {
      orig_item_id: row.item_id,
      chosen_item_id: cand.itemId,
      chosen_shop_id: cand.shopId,
      verified_at: new Date().toISOString()
    };
    row.rateChecked = true;
    row.realRateVerified = true;
    row.serverSynced = true;
    row.serverSyncError = '';
    row.swapCandidates = null;
    ns.showToast(`🔄 สลับร้านเป็น ${cand.shopName} (ขาย ${cand.soldMonthly}/ด. · คอม ${ns.formatTHB(cand.netComm)}) สำเร็จ!`);
  } catch (err) {
    cand.verifyError = err?.message || String(err);
    ns.showToast(`❌ สลับร้านไม่สำเร็จ: ${cand.verifyError}`, 'error');
  } finally {
    cand.applying = false;
    persistLastSpySession();
    renderSpyCollectorResults(lastSpyEnrichedItems);
  }
}

function lastSpyCollectorItemsSafe(arr) {
  return Array.isArray(arr) ? arr : [];
}
