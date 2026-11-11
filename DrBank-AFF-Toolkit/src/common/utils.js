/**
 * DrBank AFF Studio — Shared Clean-Room Utilities & Commission Engine
 */

window.DrBankAFF = window.DrBankAFF || {};

(function (ns) {
  ns.formatTHB = function (num, decimals = 2) {
    const val = Number(num) || 0;
    return '฿' + val.toLocaleString('th-TH', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  ns.parsePriceNumber = function (rawText) {
    if (!rawText) return 0;
    const cleaned = String(rawText).replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  /**
   * Extract Shopee shopId & itemId from any standard Shopee Thailand product URL
   * Supports:
   *  - https://shopee.co.th/Product-Name-i.123456.7890123
   *  - https://shopee.co.th/product/123456/7890123
   */
  ns.parseShopeeIds = function (urlStr) {
    try {
      const u = new URL(urlStr);
      const path = u.pathname;
      const matchDot = path.match(/-i\.(\d+)\.(\d+)/);
      if (matchDot) {
        return {
          shopId: matchDot[1],
          itemId: matchDot[2],
          cleanUrl: `https://shopee.co.th/product/${matchDot[1]}/${matchDot[2]}`
        };
      }
      const matchSlash = path.match(/\/product\/(\d+)\/(\d+)/);
      if (matchSlash) {
        return {
          shopId: matchSlash[1],
          itemId: matchSlash[2],
          cleanUrl: `https://shopee.co.th/product/${matchSlash[1]}/${matchSlash[2]}`
        };
      }
      return {
        shopId: '',
        itemId: '',
        cleanUrl: `${u.origin}${u.pathname}`
      };
    } catch (_e) {
      return { shopId: '', itemId: '', cleanUrl: urlStr };
    }
  };

  /**
   * Extract Lazada itemId & clean URL
   * Supports:
   *  - https://www.lazada.co.th/products/...-i123456789-s987654321.html
   */
  ns.parseLazadaIds = function (urlStr) {
    try {
      const u = new URL(urlStr);
      const match = u.pathname.match(/-i(\d+)(?:-s(\d+))?\.html/);
      return {
        itemId: match ? match[1] : '',
        skuId: match && match[2] ? match[2] : '',
        cleanUrl: `${u.origin}${u.pathname}`
      };
    } catch (_e) {
      return { itemId: '', skuId: '', cleanUrl: urlStr };
    }
  };

  /**
   * Calculate Shopee / Lazada Commission Breakdown
   * - Base Commission is capped at `capTHB` (e.g. 250 THB on Shopee)
   * - Extra / Brand Commission is uncapped
   * - Deducts Withholding Tax (WHT 3%) if configured
   */
  ns.calculateCommission = function ({
    price,
    baseRate = 3.5,
    extraRate = 10.0,
    capTHB = 250,
    whtRate = 3.0
  }) {
    const p = Math.max(0, Number(price) || 0);
    const bRate = Math.max(0, Number(baseRate) || 0);
    const xRate = Math.max(0, Number(extraRate) || 0);
    const cap = Number(capTHB) > 0 ? Number(capTHB) : Infinity;

    const rawBaseComm = p * (bRate / 100);
    const baseComm = Math.min(rawBaseComm, cap);
    const isCapped = rawBaseComm > cap;
    const extraComm = p * (xRate / 100);
    const grossComm = baseComm + extraComm;
    const whtAmount = grossComm * (Math.max(0, Number(whtRate) || 0) / 100);
    const netComm = grossComm - whtAmount;
    const effectiveRate = p > 0 ? (grossComm / p) * 100 : 0;

    return {
      price: p,
      baseComm,
      extraComm,
      grossComm,
      whtAmount,
      netComm,
      effectiveRate,
      isCapped
    };
  };

  /**
   * Build Affiliate Tracking Link with Sub-IDs
   */
  ns.buildAffiliateLink = function ({
    platform = 'shopee',
    cleanUrl,
    affiliateId = '',
    subIds = []
  }) {
    const validSubs = (subIds || []).map((s) => String(s || '').trim()).filter(Boolean);
    const subJoined = validSubs.join('-');

    if (platform === 'shopee') {
      const encodedOrigin = encodeURIComponent(cleanUrl);
      const affId = String(affiliateId || '').trim();
      const params = new URLSearchParams();
      params.set('origin_link', cleanUrl);
      if (affId) params.set('affiliate_id', affId);
      if (subJoined) params.set('sub_id', subJoined);
      return `https://s.shopee.co.th/an_redir?${params.toString()}`;
    }

    if (platform === 'lazada') {
      try {
        const u = new URL(cleanUrl);
        if (affiliateId) u.searchParams.set('aff_id', String(affiliateId).trim());
        validSubs.forEach((s, idx) => {
          u.searchParams.set(`sub_id${idx + 1}`, s);
        });
        if (subJoined) u.searchParams.set('sub_aff_id', subJoined);
        return u.toString();
      } catch (_e) {
        return cleanUrl;
      }
    }

    return cleanUrl;
  };

  /**
   * Send message to background service worker
   */
  ns.sendMessage = function (action, payload = {}) {
    return new Promise((resolve, reject) => {
      if (!chrome?.runtime?.sendMessage) {
        return reject(new Error('Extension runtime unavailable'));
      }
      chrome.runtime.sendMessage({ action, payload }, (res) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (res && res.ok) {
          resolve(res.data);
        } else {
          reject(new Error(res?.error || 'Unknown background error'));
        }
      });
    });
  };

  /**
   * Copy text to clipboard & show HUD toast
   */
  ns.copyText = async function (text, label = 'คัดลอกสำเร็จ!') {
    try {
      await navigator.clipboard.writeText(text);
      ns.showToast(label, 'success');
      return true;
    } catch (_e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      ns.showToast(label, 'success');
      return true;
    }
  };

  ns.showToast = function (message, variant = 'success') {
    let container = document.getElementById('drb-aff-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'drb-aff-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `drb-aff-toast drb-aff-toast--${variant}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('drb-aff-toast--hide');
      setTimeout(() => toast.remove(), 280);
    }, 2400);
  };

  /**
   * Make any HUD floating element draggable by its header
   */
  ns.makeDraggable = function (panelEl, handleEl) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialRight = 20;
    let initialTop = 80;

    handleEl.style.cursor = 'grab';

    handleEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, input, select, a')) return;
      isDragging = true;
      handleEl.style.cursor = 'grabbing';
      startX = e.clientX;
      startY = e.clientY;
      const rect = panelEl.getBoundingClientRect();
      initialRight = window.innerWidth - rect.right;
      initialTop = rect.top;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const nextRight = Math.max(8, Math.min(window.innerWidth - 120, initialRight - dx));
      const nextTop = Math.max(8, Math.min(window.innerHeight - 80, initialTop + dy));
      panelEl.style.right = `${nextRight}px`;
      panelEl.style.top = `${nextTop}px`;
      panelEl.style.left = 'auto';
    });

    window.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      handleEl.style.cursor = 'grab';
    });
  };
})(window.DrBankAFF);

