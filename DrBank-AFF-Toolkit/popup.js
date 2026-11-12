/**
 * DrBank AFF Scout v2.0.0 — Mini Launcher & Web UI Bridge Controller
 */

(function () {
  const ns = window.DrBankAFF;
  let appState = {
    settings: {},
    savedProducts: []
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const verEl = document.getElementById('popup-version-badge');
    if (verEl && ns?.getVersion) verEl.textContent = `v${ns.getVersion()}`;
    await loadAllState();
    bindActions();
  });

  async function loadAllState() {
    appState = await ns.sendMessage('GET_STATE');
    const s = appState.settings || {};
    const themeBtn = document.getElementById('popup-theme-btn');
    ns.applyTheme(document.body, s.theme || 'light', themeBtn);

    const count = (appState.savedProducts || []).length;
    document.getElementById('stat-sku-count').textContent = `${count} รายการ`;
    document.getElementById('btn-sku-count').textContent = count;

    document.getElementById('set-webui-url').value = s.webUiBaseUrl || 'http://localhost:3000';
    document.getElementById('set-shopee-base').value = s.shopeeBaseRate ?? 3.5;
    document.getElementById('set-shopee-extra').value = s.shopeeExtraRate ?? 10.0;
    document.getElementById('set-shopee-cap').value = s.shopeeCapTHB ?? 250;

    checkWebUiConnection(s.webUiBaseUrl || 'http://localhost:3000');
  }

  async function checkWebUiConnection(url) {
    const dotEl = document.getElementById('webui-status-dot');
    const textEl = document.getElementById('webui-status-text');
    try {
      const res = await ns.sendMessage('PING_WEBUI', { webUiBaseUrl: url });
      if (res && res.online) {
        dotEl.classList.add('online');
        textEl.textContent = `🟢 เชื่อมต่อ Web UI พร้อมใช้งาน (${res.baseUrl})`;
      } else {
        dotEl.classList.remove('online');
        textEl.textContent = `🟡 โหมด Local Queue (เซฟลงเครื่องพร้อมซิงก์ Web UI)`;
      }
    } catch (_e) {
      dotEl.classList.remove('online');
      textEl.textContent = `🟡 โหมด Local Queue (พร้อมใช้งาน)`;
    }
  }

  function bindActions() {
    const themeBtn = document.getElementById('popup-theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', async () => {
        const cur = appState.settings?.theme || 'light';
        const next = await ns.toggleTheme(document.body, cur, themeBtn);
        appState.settings.theme = next;
      });
    }

    // 1. Launch Full-Screen Web UI Command Center
    document.getElementById('btn-launch-webui').addEventListener('click', () => {
      const targetUrl = document.getElementById('set-webui-url').value.trim() || appState.settings?.webUiBaseUrl || 'http://localhost:3000';
      chrome.tabs.create({ url: targetUrl });
    });

    // 2. Copy All Queued SKU JSON
    document.getElementById('btn-copy-all-json').addEventListener('click', () => {
      const list = appState.savedProducts || [];
      ns.copyText(JSON.stringify(list, null, 2), `📋 คัดลอก JSON สินค้าทั้ง ${list.length} รายการแล้ว!`);
    });

    // 3. Clear Local Queue
    document.getElementById('btn-clear-queue').addEventListener('click', async () => {
      appState.savedProducts = await ns.sendMessage('CLEAR_SAVED_PRODUCTS');
      document.getElementById('stat-sku-count').textContent = '0 รายการ';
      document.getElementById('btn-sku-count').textContent = '0';
      ns.showToast('🗑️ ล้างคิวแคชเรียบร้อยแล้ว');
    });

    // 4. Save Settings
    document.getElementById('btn-save-settings').addEventListener('click', async () => {
      const nextUrl = document.getElementById('set-webui-url').value.trim() || 'http://localhost:3000';
      const payload = {
        webUiBaseUrl: nextUrl,
        shopeeBaseRate: Number(document.getElementById('set-shopee-base').value) || 3.5,
        shopeeExtraRate: Number(document.getElementById('set-shopee-extra').value) ?? 10.0,
        shopeeCapTHB: Number(document.getElementById('set-shopee-cap').value) || 250
      };
      appState.settings = await ns.sendMessage('UPDATE_SETTINGS', payload);
      await checkWebUiConnection(nextUrl);

      const msgEl = document.getElementById('settings-saved-msg');
      msgEl.style.display = 'block';
      setTimeout(() => {
        msgEl.style.display = 'none';
      }, 2200);
    });
  }
})();
