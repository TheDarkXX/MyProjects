/**
 * DrBank AFF Studio v1.2.0 — Popup Command Center Controller (Bell 238M Strategy Edition)
 */

(function () {
  const ns = window.DrBankAFF;
  let appState = {
    settings: {},
    savedProducts: [],
    pnlLedger: [],
    linkHistory: []
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const verEl = document.getElementById('popup-version-badge');
    if (verEl && ns?.getVersion) verEl.textContent = `v${ns.getVersion()}`;
    bindTabs();
    document.getElementById('add-pnl-date').value = new Date().toISOString().slice(0, 10);
    await loadAllState();
    bindActions();
  });

  function bindTabs() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.getAttribute('data-tab'));
        if (target) target.classList.add('active');
      });
    });
  }

  async function loadAllState() {
    appState = await ns.sendMessage('GET_STATE');
    const themeBtn = document.getElementById('popup-theme-btn');
    const currentTheme = appState.settings?.theme || 'light';
    ns.applyTheme(document.body, currentTheme, themeBtn);
    renderPnL();
    renderSavedProducts();
    renderSettingsForm();
  }

  function renderPnL() {
    const ledger = appState.pnlLedger || [];
    let totalIncome = 0;
    let totalExpense = 0;

    const tbody = document.getElementById('pnl-tbody');
    tbody.innerHTML = '';

    const sourceLabelMap = {
      shopee_comm: '🟢 คอม Shopee',
      lazada_comm: '🔵 คอม Lazada',
      fb_ads: '🔴 แอด Facebook',
      shopee_ads: '🟠 แอด Shopee'
    };

    ledger.forEach((row) => {
      const net = Number(row.netAmount) || 0;
      if (row.type === 'income') {
        totalIncome += net;
      } else {
        totalExpense += net;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.date || '-'}</td>
        <td>${sourceLabelMap[row.source] || row.source}</td>
        <td>${row.subId || row.campaign || '-'}</td>
        <td class="text-right ${row.type === 'income' ? 'text-green' : 'text-red'}">
          ${row.type === 'income' ? '+' : '-'}${ns.formatTHB(net)}
        </td>
        <td class="text-right">
          <button class="mini-del-btn" data-del-pnl="${row.id}" title="ลบรายการ">✕</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (ledger.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--p-text-muted);padding:18px;">ยังไม่มีรายการบันทึก — สามารถเพิ่มด้านบน หรือกดซิงก์จากหน้า FB Ads / Shopee Affiliate ได้ทันที</td></tr>`;
    }

    tbody.querySelectorAll('[data-del-pnl]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-pnl');
        appState.pnlLedger = await ns.sendMessage('DELETE_PNL_ENTRY', { id });
        renderPnL();
      });
    });

    const netProfit = totalIncome - totalExpense;
    const roi = totalExpense > 0 ? (netProfit / totalExpense) * 100 : 0;

    document.getElementById('pnl-total-income').textContent = ns.formatTHB(totalIncome);
    document.getElementById('pnl-total-expense').textContent = ns.formatTHB(totalExpense);
    const profitEl = document.getElementById('pnl-net-profit');
    profitEl.textContent = (netProfit >= 0 ? '+' : '') + ns.formatTHB(netProfit);
    profitEl.className = `kpi-val ${netProfit >= 0 ? 'text-green' : 'text-red'}`;
    document.getElementById('pnl-roi').textContent = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
  }

  function renderSavedProducts() {
    const items = appState.savedProducts || [];
    document.getElementById('count-products').textContent = items.length;
    const tbody = document.getElementById('saved-products-tbody');
    tbody.innerHTML = '';

    const tierColorMap = {
      god: '#6d28d9',
      pass: '#15803d',
      warning: '#b45309',
      danger: '#dc2626'
    };

    items.forEach((item, idx) => {
      const comm = Number(item.estimatedCommission) || 0;
      const beUnits = item.breakEvenUnits || (comm > 0 ? (100 / comm).toFixed(1) : '∞');
      const tierColor = tierColorMap[item.viabilityTier] || '#b45309';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="max-width:230px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${item.title}">
          <span style="font-size:10px;text-transform:uppercase;font-weight:600;color:${item.platform === 'lazada' ? '#0f62fe' : '#ee4d2d'};margin-right:4px;">[${item.platform}]</span>
          <a href="${item.url}" target="_blank" style="color:var(--p-text-main);text-decoration:none;">${item.title}</a>
        </td>
        <td class="text-right">${ns.formatTHB(item.price)}</td>
        <td class="text-right" style="font-weight:600;color:${tierColor};">${ns.formatTHB(comm)}</td>
        <td class="text-right" style="font-weight:500;color:${tierColor};">${beUnits} ชิ้น/วัน</td>
        <td class="text-right">
          <button class="mini-del-btn" data-copy-prod="${item.affiliateUrl || item.url}" title="ก๊อปลิงก์ AFF">🔗</button>
          <button class="mini-del-btn" data-json-idx="${idx}" title="ก๊อป JSON สินค้านี้ (ส่งต่อระบบเจนภาพ/คุมแอด)">📋</button>
          <button class="mini-del-btn" data-del-prod="${item.id}" title="ลบ">✕</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--p-text-muted);padding:24px;">ยังไม่มีสินค้าในคลัง — กดปุ่ม ⭐ เก็บเข้าคลัง + JSON บนหน้าเว็บ Shopee / Lazada ได้เลย</td></tr>`;
    }

    tbody.querySelectorAll('[data-copy-prod]').forEach((btn) => {
      btn.addEventListener('click', () => {
        ns.copyText(btn.getAttribute('data-copy-prod'), '🔗 คัดลอกลิงก์ AFF แล้ว!');
      });
    });

    tbody.querySelectorAll('[data-json-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-json-idx'));
        const targetItem = items[i];
        if (targetItem) {
          ns.copyText(JSON.stringify(targetItem, null, 2), '📋 คัดลอก JSON สินค้าเข้าคลิปบอร์ดแล้ว!');
        }
      });
    });

    tbody.querySelectorAll('[data-del-prod]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        appState.savedProducts = await ns.sendMessage('DELETE_PRODUCT', {
          id: btn.getAttribute('data-del-prod')
        });
        renderSavedProducts();
      });
    });
  }

  function renderSettingsForm() {
    const s = appState.settings || {};
    const cleanSub1 = ns.sanitizeSubId(s.defaultSubId1 || '16NOV26FBSPCAD').clean || '16NOV26FBSPCAD';
    const cleanSub2 = ns.sanitizeSubId(s.defaultSubId2 || 'P01POST01').clean || 'P01POST01';

    document.getElementById('set-shopee-id').value = s.shopeeAffiliateId || '';
    document.getElementById('set-lazada-id').value = s.lazadaAffiliateId || '';
    document.getElementById('set-shopee-base').value = s.shopeeBaseRate ?? 3.5;
    document.getElementById('set-shopee-extra').value = s.shopeeExtraRate ?? 10.0;
    document.getElementById('set-shopee-cap').value = s.shopeeCapTHB ?? 250;
    document.getElementById('set-wht-rate').value = s.withholdingTaxRate ?? 3.0;
    document.getElementById('set-sub1').value = cleanSub1;
    document.getElementById('set-sub2').value = cleanSub2;
    document.getElementById('set-webhook-url').value = s.webhookUrl || '';

    document.getElementById('batch-sub1').value = cleanSub1;
    document.getElementById('batch-sub2').value = cleanSub2;
    document.getElementById('batch-sub3').value = ns.getTodayYYYYMMDD();
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

    // Bind Alphanumeric Sanitizers to all Sub_ID inputs in Popup
    ['batch-sub1', 'batch-sub2', 'batch-sub3', 'batch-sub4', 'set-sub1', 'set-sub2', 'add-pnl-subid'].forEach((id) => {
      ns.bindSubIdSanitizer(document.getElementById(id));
    });

    // 1. Add P&L Entry
    document.getElementById('btn-add-pnl').addEventListener('click', async () => {
      const date = document.getElementById('add-pnl-date').value;
      const source = document.getElementById('add-pnl-source').value;
      const rawAmount = Number(document.getElementById('add-pnl-amount').value) || 0;
      const subId = ns.sanitizeSubId(document.getElementById('add-pnl-subid').value).clean || '-';

      if (rawAmount <= 0) return;

      const isIncome = source === 'shopee_comm' || source === 'lazada_comm';
      const whtRate = Number(appState.settings.withholdingTaxRate) || 3.0;
      const vatRate = Number(appState.settings.fbVatRate) || 7.0;

      const taxAmount = isIncome ? rawAmount * (whtRate / 100) : rawAmount * (vatRate / 100);
      const netAmount = isIncome ? rawAmount - taxAmount : rawAmount + taxAmount;

      appState.pnlLedger = await ns.sendMessage('RECORD_PNL_ENTRY', {
        date,
        type: isIncome ? 'income' : 'expense',
        source,
        subId,
        campaign: subId,
        rawAmount,
        taxAmount,
        netAmount
      });

      document.getElementById('add-pnl-amount').value = '';
      renderPnL();
    });

    // 2. Export CSV
    document.getElementById('btn-export-csv').addEventListener('click', () => {
      const rows = [
        ['Date', 'Type', 'Source', 'Sub_ID', 'Raw_THB', 'Tax_THB', 'Net_THB']
      ];
      (appState.pnlLedger || []).forEach((r) => {
        rows.push([
          r.date,
          r.type,
          r.source,
          `"${(r.subId || '').replace(/"/g, '""')}"`,
          r.rawAmount,
          r.taxAmount,
          r.netAmount
        ]);
      });
      const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DrBank_AFF_PnL_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    });

    // 3. Clear P&L
    document.getElementById('btn-clear-pnl').addEventListener('click', async () => {
      appState.pnlLedger = await ns.sendMessage('CLEAR_PNL_LEDGER');
      renderPnL();
    });

    // 4. Batch Link Builder (4 Sub-IDs with Auto-ItemID fallback for Slot 4)
    document.getElementById('btn-batch-convert').addEventListener('click', () => {
      const lines = document
        .getElementById('batch-input-urls')
        .value.split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const s1 = ns.sanitizeSubId(document.getElementById('batch-sub1').value).clean;
      const s2 = ns.sanitizeSubId(document.getElementById('batch-sub2').value).clean;
      const s3 = ns.sanitizeSubId(document.getElementById('batch-sub3').value).clean;
      const s4Manual = ns.sanitizeSubId(document.getElementById('batch-sub4').value).clean;

      const results = lines.map((line) => {
        const isLazada = /lazada\.co\.th/i.test(line);
        if (isLazada) {
          const parsed = ns.parseLazadaIds(line);
          const s4 = s4Manual || ns.sanitizeSubId(parsed.itemId).clean;
          return ns.buildAffiliateLink({
            platform: 'lazada',
            cleanUrl: parsed.cleanUrl,
            affiliateId: appState.settings.lazadaAffiliateId || '',
            subIds: [s1, s2, s3, s4].filter(Boolean)
          });
        } else {
          const parsed = ns.parseShopeeIds(line);
          const s4 = s4Manual || ns.sanitizeSubId(parsed.itemId).clean;
          return ns.buildAffiliateLink({
            platform: 'shopee',
            cleanUrl: parsed.cleanUrl,
            affiliateId: appState.settings.shopeeAffiliateId || '',
            subIds: [s1, s2, s3, s4].filter(Boolean)
          });
        }
      });

      document.getElementById('batch-output-urls').value = results.join('\n');
    });

    document.getElementById('btn-batch-copy').addEventListener('click', () => {
      const out = document.getElementById('batch-output-urls').value.trim();
      if (out) ns.copyText(out, '📋 คัดลอกลิงก์ทั้งหมดแล้ว!');
    });

    // 5. Export All Saved Products JSON
    document.getElementById('btn-export-products-json').addEventListener('click', () => {
      const jsonStr = JSON.stringify(appState.savedProducts || [], null, 2);
      ns.copyText(jsonStr, '📤 คัดลอก JSON สินค้าทั้งคลังแล้ว!');
    });

    // 6. Save Settings
    document.getElementById('btn-save-settings').addEventListener('click', async () => {
      const payload = {
        shopeeAffiliateId: document.getElementById('set-shopee-id').value.trim(),
        lazadaAffiliateId: document.getElementById('set-lazada-id').value.trim(),
        shopeeBaseRate: Number(document.getElementById('set-shopee-base').value) || 3.5,
        shopeeExtraRate: Number(document.getElementById('set-shopee-extra').value) ?? 10.0,
        shopeeCapTHB: Number(document.getElementById('set-shopee-cap').value) || 250,
        withholdingTaxRate: Number(document.getElementById('set-wht-rate').value) || 3.0,
        defaultSubId1: ns.sanitizeSubId(document.getElementById('set-sub1').value).clean || '16NOV26FBSPCAD',
        defaultSubId2: ns.sanitizeSubId(document.getElementById('set-sub2').value).clean || 'P01POST01',
        webhookUrl: document.getElementById('set-webhook-url').value.trim()
      };
      appState.settings = await ns.sendMessage('UPDATE_SETTINGS', payload);
      renderSettingsForm();
      const msgEl = document.getElementById('settings-saved-msg');
      msgEl.style.display = 'inline';
      setTimeout(() => {
        msgEl.style.display = 'none';
      }, 2000);
    });
  }
})();
