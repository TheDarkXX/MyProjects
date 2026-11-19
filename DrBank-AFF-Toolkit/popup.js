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

    document.getElementById('set-webui-url').value = s.webUiBaseUrl || 'https://aff.doctorbankonline.com';
    document.getElementById('set-shopee-base').value = s.shopeeBaseRate ?? 0.6;
    document.getElementById('set-shopee-extra').value = s.shopeeExtraRate ?? 10.0;
    document.getElementById('set-shopee-cap').value = s.shopeeCapTHB ?? 250;

    checkWebUiConnection(s.webUiBaseUrl || 'https://aff.doctorbankonline.com');
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
    const reloadBtn = document.getElementById('popup-reload-ext-btn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', async () => {
        try {
          const res = await ns.sendMessage('RELOAD_EXTENSION');
          if (res && res.reloaded === false && res.busy) {
            ns.showToast(`⏳ ${res.error || 'กำลังดึงข้อมูลอยู่ รอสักครู่'}`, 'error');
            return;
          }
          ns.showToast('♻️ กำลัง Reload Extension...');
        } catch (_err) {
          try {
            chrome.runtime.reload();
          } catch (_e2) {}
        }
      });
    }

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
      const targetUrl = document.getElementById('set-webui-url').value.trim() || appState.settings?.webUiBaseUrl || 'https://aff.doctorbankonline.com';
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
      const nextUrl = document.getElementById('set-webui-url').value.trim() || 'https://aff.doctorbankonline.com';
      const payload = {
        webUiBaseUrl: nextUrl,
        shopeeBaseRate: Number(document.getElementById('set-shopee-base').value) || 0.6,
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
