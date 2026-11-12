/**
 * DrBank AFF Studio v1.2.0 — Shared Clean-Room Utilities & Commission Engine
 * Includes Bell 238M Strategy Logic:
 *  - Strict Alphanumeric Sub_ID Sanitizer (Zero _ or special chars)
 *  - 4-Tier 100฿/Day Ad Viability & Break-Even Calculator
 */

window.DrBankAFF = window.DrBankAFF || {};

(function (ns) {
  ns.getVersion = function () {
    try {
      return chrome?.runtime?.getManifest?.()?.version || '1.2.0';
    } catch (_e) {
      return '1.2.0';
    }
  };

  ns.getTodayYYYYMMDD = function () {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  };

  /**
   * Strict Shopee Sub_ID Sanitizer: ONLY A-Z, a-z, 0-9 allowed!
   * No underscore (_), no hyphen (-), no spaces!
   */
  ns.sanitizeSubId = function (raw) {
    const str = String(raw || '');
    const clean = str.replace(/[^a-zA-Z0-9]/g, '');
    const hadInvalid = clean !== str;
    return { clean, hadInvalid };
  };

  /**
   * Bind real-time Alphanumeric sanitization & red warning flash to a Sub_ID input
   */
  ns.bindSubIdSanitizer = function (inputEl, onValidChange) {
    if (!inputEl) return;
    inputEl.addEventListener('input', () => {
      const { clean, hadInvalid } = ns.sanitizeSubId(inputEl.value);
      if (hadInvalid) {
        inputEl.value = clean;
        inputEl.classList.add('drb-aff-input--invalid');
        ns.showToast('⚠️ Sub_ID ห้ามมี _ ขีด หรือเว้นวรรค! ระบบตัดออกให้อัตโนมัติแล้ว', 'warn');
        setTimeout(() => inputEl.classList.remove('drb-aff-input--invalid'), 900);
      }
      if (typeof onValidChange === 'function') {
        onValidChange(clean);
      }
    });
  };

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
   * Parse Shopee Thai/English Sold Count text (e.g. "1.2พัน", "3.5หมื่น", "450", "2.1k")
   */
  ns.parseSoldCount = function (rawText) {
    if (!rawText) return 0;
    const txt = String(rawText).trim().toLowerCase();
    const numMatch = txt.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (!numMatch) return 0;
    const base = parseFloat(numMatch[1]);
    if (!Number.isFinite(base)) return 0;
    if (txt.includes('หมื่น')) return Math.round(base * 10000);
    if (txt.includes('พัน') || txt.includes('k')) return Math.round(base * 1000);
    if (txt.includes('แสน')) return Math.round(base * 100000);
    if (txt.includes('ล้าน') || txt.includes('m')) return Math.round(base * 1000000);
    return Math.round(base);
  };

  /**
   * Extract Shopee shopId & itemId from any standard Shopee Thailand product URL
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
   * Calculate Shopee / Lazada Commission Breakdown + 4-Tier 100฿/Day Ad Viability
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

    const viability = ns.evaluateAdViability(netComm, xRate);

    return {
      price: p,
      baseComm,
      extraComm,
      grossComm,
      whtAmount,
      netComm,
      effectiveRate,
      isCapped,
      ...viability
    };
  };

  /**
   * Spec 2 & Spec 3: Evaluate 4-Tier Ad Viability against 100 THB/Day Ad Budget
   * - GOD TIER: netComm >= 80 THB & extraRate > 0
   * - PASS:     netComm 45 - 79.99 THB & extraRate > 0
   * - WARNING:  netComm 20 - 44.99 THB & extraRate > 0
   * - DANGER:   netComm < 20 THB OR extraRate <= 0
   */
  ns.evaluateAdViability = function (netComm, extraRate) {
    const net = Number(netComm) || 0;
    const extra = Number(extraRate) || 0;
    const breakEvenNum = net > 0 ? 100 / net : 999;
    const breakEvenUnits = net > 0 ? breakEvenNum.toFixed(1) : '∞';
    const breakEvenOrders = net > 0 ? Math.ceil(breakEvenNum) : 999;

    if (extra <= 0 || net < 20) {
      return {
        tier: 'danger',
        tierLabel: '❌ ห้ามยิงแอด! คอมต่ำ/ไม่มี Extra',
        breakEvenUnits,
        breakEvenOrders
      };
    }
    if (net < 45) {
      return {
        tier: 'warning',
        tierLabel: '⚠️ ต้องขาย 3-5 ชิ้น/วัน ถึงคุ้มแอด',
        breakEvenUnits,
        breakEvenOrders
      };
    }
    if (net < 80) {
      return {
        tier: 'pass',
        tierLabel: '✅ ขาย 1-2 ชิ้น คืนทุนแอด 100฿',
        breakEvenUnits,
        breakEvenOrders
      };
    }
    return {
      tier: 'god',
      tierLabel: '🔥 ขาย 1 ชิ้น กำไรทันที!',
      breakEvenUnits,
      breakEvenOrders
    };
  };

  /**
   * Build Affiliate Tracking Link with Strictly Sanitized Alphanumeric Sub-IDs (4 Slots)
   */
  ns.buildAffiliateLink = function ({
    platform = 'shopee',
    cleanUrl,
    affiliateId = '',
    subIds = []
  }) {
    const validSubs = (subIds || [])
      .map((s) => ns.sanitizeSubId(s).clean)
      .filter(Boolean);
    const subJoined = validSubs.join('-');

    if (platform === 'shopee') {
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
    }, 2600);
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

  /**
   * Apply and toggle Light/Dark Theme (Light is Default)
   */
  ns.applyTheme = function (rootEl, theme = 'light', toggleBtnEl = null) {
    const mode = theme === 'dark' ? 'dark' : 'light';
    if (rootEl) {
      rootEl.setAttribute('data-theme', mode);
    }
    if (toggleBtnEl) {
      toggleBtnEl.textContent = mode === 'dark' ? '☀️' : '🌙';
      toggleBtnEl.title = mode === 'dark' ? 'สลับเป็นโหมดสว่าง (Shopee Light)' : 'สลับเป็นโหมดมืด (Dark Mode)';
    }
    return mode;
  };

  ns.toggleTheme = async function (rootEl, currentTheme = 'light', toggleBtnEl = null) {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    ns.applyTheme(rootEl, nextTheme, toggleBtnEl);
    try {
      await ns.sendMessage('UPDATE_SETTINGS', { theme: nextTheme });
    } catch (_e) {}
    return nextTheme;
  };
})(window.DrBankAFF);
