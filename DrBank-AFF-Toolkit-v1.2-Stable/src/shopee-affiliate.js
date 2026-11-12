/**
 * DrBank AFF Studio — Shopee Affiliate Console & Payout / Ads Sync Engine (Clean-Room)
 */

(function () {
  const ns = window.DrBankAFF;
  if (!ns) return;

  const isSellerCenter = location.hostname.includes('seller.shopee.co.th');

  let reportStats = {
    totalCommission: 0,
    netCommission: 0,
    orderCount: 0,
    adSpend: 0,
    theme: 'light',
    dateLabel: new Date().toISOString().slice(0, 10)
  };

  async function initAffiliateConsoleHUD() {
    if (document.getElementById('drb-aff-hud-root')) return;

    try {
      const store = await ns.sendMessage('GET_STATE');
      reportStats.theme = store?.settings?.theme || 'light';
    } catch (_e) {}

    const root = document.createElement('div');
    root.id = 'drb-aff-hud-root';

    root.innerHTML = `
      <div class="drb-aff-header" id="drb-aff-drag-handle">
        <div class="drb-aff-brand">
          <span>📊 DrBank Report Sync</span>
          <span class="drb-aff-version">v${ns.getVersion()}</span>
          <span class="drb-aff-badge-platform">${isSellerCenter ? 'Shopee Ads' : 'AFF Console'}</span>
        </div>
        <div class="drb-aff-header-actions">
          <button class="drb-aff-icon-btn" id="drb-btn-theme" title="สลับโหมด สว่าง/มืด">🌙</button>
          <button class="drb-aff-icon-btn" id="drb-btn-scan-report" title="สแกนตัวเลขในหน้า">↻</button>
          <button class="drb-aff-icon-btn" id="drb-btn-minimize" title="ย่อ/ขยาย">_</button>
        </div>
      </div>

      <div class="drb-aff-body">
        <div class="drb-aff-product-title">
          ${isSellerCenter ? 'ระบบดึงค่าแอด Shopee Seller เข้าบัญชี P&L' : 'ระบบสแกนรายงานค่าคอม & ยอดโอน Shopee Affiliate'}
        </div>

        <div class="drb-aff-kpi-grid">
          <div class="drb-aff-kpi-card">
            <div class="drb-aff-kpi-label">${isSellerCenter ? 'ค่าแอดที่พบ (฿)' : 'ยอดค่าคอมรวม (฿)'}</div>
            <div class="drb-aff-kpi-val" id="drb-rep-gross">฿0.00</div>
            <div class="drb-aff-kpi-sub" id="drb-rep-orders">จำนวน 0 รายการ</div>
          </div>
          <div class="drb-aff-kpi-card drb-aff-kpi-card--highlight">
            <div class="drb-aff-kpi-label">${isSellerCenter ? 'รวม VAT 7% (฿)' : 'สุทธิหลังหัก 3%'}</div>
            <div class="drb-aff-kpi-val drb-aff-kpi-val--green" id="drb-rep-net">฿0.00</div>
            <div class="drb-aff-kpi-sub">พร้อมซิงก์เข้า P&L</div>
          </div>
        </div>

        <div class="drb-aff-row">
          <div class="drb-aff-field">
            <label>วันที่บันทึก P&L</label>
            <input type="date" class="drb-aff-input" id="drb-rep-date" value="${reportStats.dateLabel}">
          </div>
          <div class="drb-aff-field">
            <label>ยอดเงิน (แก้ไขได้)</label>
            <input type="number" step="0.01" class="drb-aff-input" id="drb-rep-manual-val" value="0">
          </div>
        </div>

        <div class="drb-aff-row">
          <div class="drb-aff-field">
            <label>แคมเปญ / หมายเหตุ</label>
            <input type="text" class="drb-aff-input" id="drb-rep-campaign" value="${isSellerCenter ? 'Shopee Ads' : 'Shopee Conversion'}">
          </div>
          <div class="drb-aff-field">
            <label>Sub_ID หลัก</label>
            <input type="text" class="drb-aff-input" id="drb-rep-subid" value="all">
          </div>
        </div>

        <div class="drb-aff-btn-group">
          <button class="drb-aff-btn drb-aff-btn--ghost" id="drb-btn-read-dom">🔍 สแกนตารางหน้านี้</button>
          <button class="drb-aff-btn drb-aff-btn--emerald" id="drb-btn-sync-pnl">📥 บันทึกเข้า P&L</button>
        </div>

        <div class="drb-aff-divider"></div>

        <div class="drb-aff-btn-group">
          <a class="drb-aff-btn drb-aff-btn--ghost" href="https://affiliate.shopee.co.th/dashboard" target="_blank" rel="noopener">📈 Dashboard</a>
          <a class="drb-aff-btn drb-aff-btn--ghost" href="https://affiliate.shopee.co.th/report/conversion_report" target="_blank" rel="noopener">🧾 Conversion</a>
          <a class="drb-aff-btn drb-aff-btn--ghost" href="https://affiliate.shopee.co.th/payment/billing" target="_blank" rel="noopener">💰 Payment/Payout</a>
          <a class="drb-aff-btn drb-aff-btn--ghost" href="https://affiliate.shopee.co.th/offer/product_offer" target="_blank" rel="noopener">🔥 สินค้าคอมสูง</a>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    ns.makeDraggable(root, document.getElementById('drb-aff-drag-handle'));

    const themeBtn = document.getElementById('drb-btn-theme');
    ns.applyTheme(root, reportStats.theme, themeBtn);
    themeBtn.addEventListener('click', async () => {
      reportStats.theme = await ns.toggleTheme(root, reportStats.theme, themeBtn);
    });

    document.getElementById('drb-btn-minimize').addEventListener('click', () => {
      root.classList.toggle('drb-aff-hud--minimized');
    });

    document.getElementById('drb-btn-scan-report').addEventListener('click', scanReportDOM);
    document.getElementById('drb-btn-read-dom').addEventListener('click', scanReportDOM);

    document.getElementById('drb-rep-manual-val').addEventListener('input', (e) => {
      const v = Number(e.target.value) || 0;
      reportStats.totalCommission = v;
      reportStats.netCommission = isSellerCenter ? v * 1.07 : v * 0.97;
      refreshReportDisplay();
    });

    document.getElementById('drb-btn-sync-pnl').addEventListener('click', async () => {
      const rawVal = Number(document.getElementById('drb-rep-manual-val').value) || reportStats.totalCommission || 0;
      if (rawVal <= 0) {
        ns.showToast('กรุณาสแกนหรือระบุยอดเงินมากกว่า 0 บาท');
        return;
      }
      const dateStr = document.getElementById('drb-rep-date').value || reportStats.dateLabel;
      const campaign = document.getElementById('drb-rep-campaign').value.trim() || 'Shopee';
      const subId = document.getElementById('drb-rep-subid').value.trim() || '-';

      if (isSellerCenter) {
        const tax = rawVal * 0.07;
        await ns.sendMessage('RECORD_PNL_ENTRY', {
          date: dateStr,
          type: 'expense',
          source: 'shopee_ads',
          campaign,
          subId,
          rawAmount: rawVal,
          taxAmount: tax,
          netAmount: rawVal + tax,
          orders: reportStats.orderCount,
          dedupKey: `shopee_ads_${dateStr}_${campaign}`
        });
        ns.showToast('📥 บันทึกค่าแอด Shopee เข้าบัญชี P&L แล้ว!');
      } else {
        const wht = rawVal * 0.03;
        await ns.sendMessage('RECORD_PNL_ENTRY', {
          date: dateStr,
          type: 'income',
          source: 'shopee_comm',
          campaign,
          subId,
          rawAmount: rawVal,
          taxAmount: wht,
          netAmount: rawVal - wht,
          orders: reportStats.orderCount,
          dedupKey: `shopee_comm_${dateStr}_${subId}`
        });
        ns.showToast('📥 บันทึกยอดค่าคอม Shopee เข้าบัญชี P&L แล้ว!');
      }
    });

    setTimeout(scanReportDOM, 1800);
  }

  function scanReportDOM() {
    const currencyValues = [];
    document.querySelectorAll('td, span, div').forEach((el) => {
      if (el.children.length === 0 && !el.closest('#drb-aff-hud-root')) {
        const txt = (el.textContent || '').trim();
        if (/^฿\s?[0-9,]+(\.[0-9]{1,2})?$/.test(txt)) {
          const val = ns.parsePriceNumber(txt);
          if (val > 0) currencyValues.push(val);
        }
      }
    });

    if (currencyValues.length > 0) {
      // Take top summary card value or sum of table cells
      const maxVal = Math.max(...currencyValues);
      reportStats.totalCommission = maxVal;
      reportStats.netCommission = isSellerCenter ? maxVal * 1.07 : maxVal * 0.97;
      reportStats.orderCount = currencyValues.length;
      const inp = document.getElementById('drb-rep-manual-val');
      if (inp) inp.value = maxVal.toFixed(2);
      refreshReportDisplay();
      ns.showToast(`🔍 สแกนพบตัวเลขสูงสุด ${ns.formatTHB(maxVal)}`);
    } else {
      ns.showToast('ไม่พบตัวเลข ฿ บนหน้าจอ สามารถกรอกยอดด้วยตนเองได้');
    }
  }

  function refreshReportDisplay() {
    const grossEl = document.getElementById('drb-rep-gross');
    const netEl = document.getElementById('drb-rep-net');
    const ordEl = document.getElementById('drb-rep-orders');
    if (grossEl) grossEl.textContent = ns.formatTHB(reportStats.totalCommission);
    if (netEl) netEl.textContent = ns.formatTHB(reportStats.netCommission);
    if (ordEl) ordEl.textContent = `พบข้อมูล ${reportStats.orderCount} จุด`;
  }

  initAffiliateConsoleHUD();
})();

