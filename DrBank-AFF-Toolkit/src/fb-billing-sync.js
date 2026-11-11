/**
 * DrBank AFF Studio — Facebook Ads Manager & Billing P&L Collector (Clean-Room)
 */

(function () {
  const ns = window.DrBankAFF;
  if (!ns) return;

  let fbState = {
    rawSpend: 0,
    includeVat: true,
    vatRate: 7.0,
    dateStr: new Date().toISOString().slice(0, 10),
    campaignName: 'FB Ads Traffic',
    subId: 'fb_ads',
    rowsFound: 0
  };

  async function initFBAdsHUD() {
    try {
      const store = await ns.sendMessage('GET_STATE');
      const s = store.settings || {};
      fbState.includeVat = s.fbIncludeVat !== false;
      fbState.vatRate = Number(s.fbVatRate) || 7.0;
      fbState.subId = s.defaultSubId1 || 'fb_ads';
    } catch (_e) {}

    renderFBHUD();
    setTimeout(scanFBAdsDOM, 2200);
  }

  function scanFBAdsDOM() {
    const foundAmounts = [];
    document.querySelectorAll('span, div, td').forEach((el) => {
      if (el.children.length === 0 && !el.closest('#drb-aff-hud-root')) {
        const txt = (el.textContent || '').trim();
        if (/^฿[0-9,]+(\.[0-9]{2})?$/.test(txt) || /^THB\s?[0-9,]+(\.[0-9]{2})?$/i.test(txt)) {
          const val = ns.parsePriceNumber(txt);
          if (val > 0 && val < 5000000) foundAmounts.push(val);
        }
      }
    });

    fbState.rowsFound = foundAmounts.length;
    if (foundAmounts.length > 0) {
      // Pick the largest summary cell (typically the "Total Spent" row in Ads Manager / Billing)
      const total = Math.max(...foundAmounts);
      fbState.rawSpend = total;
      const inp = document.getElementById('drb-fb-inp-spend');
      if (inp) inp.value = total.toFixed(2);
      updateFBDisplay();
      ns.showToast(`🔍 ดึงยอดแอด Facebook พบ ${ns.formatTHB(total)}`);
    } else {
      updateFBDisplay();
    }
  }

  function renderFBHUD() {
    if (document.getElementById('drb-aff-hud-root')) return;

    const root = document.createElement('div');
    root.id = 'drb-aff-hud-root';

    root.innerHTML = `
      <div class="drb-aff-header" id="drb-aff-drag-handle">
        <div class="drb-aff-brand">
          <span>💸 DrBank FB Billing</span>
          <span class="drb-aff-badge-platform drb-aff-badge-platform--fb">FB Ads P&L</span>
        </div>
        <div class="drb-aff-header-actions">
          <button class="drb-aff-icon-btn" id="drb-fb-rescan" title="สแกนยอดแอดใหม่">↻</button>
          <button class="drb-aff-icon-btn" id="drb-fb-min" title="ย่อ/ขยาย">_</button>
        </div>
      </div>

      <div class="drb-aff-body">
        <div class="drb-aff-product-title">ดึงงบโฆษณา & บิล Facebook เข้าตารางกำไร-ขาดทุน (P&L)</div>

        <div class="drb-aff-kpi-grid">
          <div class="drb-aff-kpi-card">
            <div class="drb-aff-kpi-label">ยอดแอดก่อน VAT</div>
            <div class="drb-aff-kpi-val" id="drb-fb-raw">฿0.00</div>
            <div class="drb-aff-kpi-sub" id="drb-fb-rows">สแกนพบ 0 รายการ</div>
          </div>
          <div class="drb-aff-kpi-card drb-aff-kpi-card--highlight">
            <div class="drb-aff-kpi-label">ต้นทุนแอดสุทธิ (+VAT)</div>
            <div class="drb-aff-kpi-val drb-aff-kpi-val--green" id="drb-fb-net" style="color:#f87171;">฿0.00</div>
            <div class="drb-aff-kpi-sub" id="drb-fb-vat-sub">VAT 7%: ฿0.00</div>
          </div>
        </div>

        <div class="drb-aff-row">
          <div class="drb-aff-field">
            <label>วันที่ใช้งบแอด</label>
            <input type="date" class="drb-aff-input" id="drb-fb-date" value="${fbState.dateStr}">
          </div>
          <div class="drb-aff-field">
            <label>ยอดแอดก่อน VAT (฿)</label>
            <input type="number" step="0.01" class="drb-aff-input" id="drb-fb-inp-spend" value="${fbState.rawSpend}">
          </div>
        </div>

        <div class="drb-aff-row">
          <div class="drb-aff-field">
            <label>ชื่อแคมเปญ / เพจ</label>
            <input type="text" class="drb-aff-input" id="drb-fb-camp" value="${fbState.campaignName}">
          </div>
          <div class="drb-aff-field">
            <label>ผูก Sub_ID</label>
            <input type="text" class="drb-aff-input" id="drb-fb-subid" value="${fbState.subId}">
          </div>
        </div>

        <div style="margin-bottom:10px;display:flex;align-items:center;gap:6px;font-size:11px;color:#cbd5e1;">
          <input type="checkbox" id="drb-fb-chk-vat" ${fbState.includeVat ? 'checked' : ''}>
          <label for="drb-fb-chk-vat" style="cursor:pointer;">คิดภาษีมูลค่าเพิ่ม (VAT 7%) อัตโนมัติ</label>
        </div>

        <div class="drb-aff-btn-group">
          <button class="drb-aff-btn drb-aff-btn--ghost" id="drb-fb-btn-scan">🔍 ดึงยอดจากตาราง</button>
          <button class="drb-aff-btn drb-aff-btn--primary" id="drb-fb-btn-sync">📥 บันทึกงบเข้า P&L</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    ns.makeDraggable(root, document.getElementById('drb-aff-drag-handle'));

    document.getElementById('drb-fb-min').addEventListener('click', () => {
      root.classList.toggle('drb-aff-hud--minimized');
    });

    document.getElementById('drb-fb-rescan').addEventListener('click', scanFBAdsDOM);
    document.getElementById('drb-fb-btn-scan').addEventListener('click', scanFBAdsDOM);

    document.getElementById('drb-fb-inp-spend').addEventListener('input', (e) => {
      fbState.rawSpend = Number(e.target.value) || 0;
      updateFBDisplay();
    });

    document.getElementById('drb-fb-chk-vat').addEventListener('change', (e) => {
      fbState.includeVat = e.target.checked;
      updateFBDisplay();
    });

    document.getElementById('drb-fb-btn-sync').addEventListener('click', async () => {
      const raw = Number(document.getElementById('drb-fb-inp-spend').value) || 0;
      if (raw <= 0) {
        ns.showToast('กรุณาสแกนหรือระบุยอดแอดมากกว่า 0 บาท');
        return;
      }
      const dateStr = document.getElementById('drb-fb-date').value || fbState.dateStr;
      const campaign = document.getElementById('drb-fb-camp').value.trim() || 'FB Ads';
      const subId = document.getElementById('drb-fb-subid').value.trim() || 'fb_ads';
      const vat = fbState.includeVat ? raw * (fbState.vatRate / 100) : 0;
      const net = raw + vat;

      await ns.sendMessage('RECORD_PNL_ENTRY', {
        date: dateStr,
        type: 'expense',
        source: 'fb_ads',
        campaign,
        subId,
        rawAmount: raw,
        taxAmount: vat,
        netAmount: net,
        dedupKey: `fb_ads_${dateStr}_${campaign}_${subId}`
      });

      ns.showToast(`📥 บันทึกงบแอด ${ns.formatTHB(net)} เข้าบัญชี P&L แล้ว!`);
    });

    updateFBDisplay();
  }

  function updateFBDisplay() {
    const raw = Number(fbState.rawSpend) || 0;
    const vat = fbState.includeVat ? raw * (fbState.vatRate / 100) : 0;
    const net = raw + vat;

    const rawEl = document.getElementById('drb-fb-raw');
    const netEl = document.getElementById('drb-fb-net');
    const vatEl = document.getElementById('drb-fb-vat-sub');
    const rowsEl = document.getElementById('drb-fb-rows');

    if (rawEl) rawEl.textContent = ns.formatTHB(raw);
    if (netEl) netEl.textContent = ns.formatTHB(net);
    if (vatEl) vatEl.textContent = `VAT 7%: ${ns.formatTHB(vat)}`;
    if (rowsEl) rowsEl.textContent = `สแกนพบ ${fbState.rowsFound} รายการ`;
  }

  initFBAdsHUD();
})();

