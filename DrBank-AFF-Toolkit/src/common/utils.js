/**
 * DrBank AFF Scout v2.0.0 — Lean Scout & Web UI Bridge Utilities
 * Features:
 *  - Shopee Commission & 4-Tier Ad Viability Engine (100฿ + VAT 7% = 107฿ Real Ad Cost)
 *  - Strict Alphanumeric Sub_ID Sanitizer (Zero _ or special chars)
 *  - Shopee DOM Helpers & Light/Dark Theme Controller
 */

window.DrBankAFF = window.DrBankAFF || {};

(function (ns) {
  ns.getVersion = function () {
    try {
      return chrome?.runtime?.getManifest?.()?.version || '2.5.0';
    } catch (_e) {
      return '2.5.0';
    }
  };

  /**
   * Strict Shopee Sub_ID Sanitizer: ONLY A-Z, a-z, 0-9 allowed (No _ or -)
   */
  ns.sanitizeSubId = function (raw) {
    const str = String(raw || '');
    const clean = str.replace(/[^a-zA-Z0-9]/g, '');
    return { clean, hadInvalid: clean !== str };
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
   * Smart Category Commission Matrix (2026 Thailand Shopee Affiliate Benchmark)
   * Maps product title & search keywords into 6 standard commission tiers (A - F)
   */
  ns.CATEGORY_COMM_DB = [
    {
      id: 'D',
      code: 'small_appliance_tools',
      label: 'หมวด D: เครื่องใช้ไฟฟ้าเล็ก กล้อง & ช่าง',
      shortLabel: 'ไฟฟ้าเล็ก/กล้อง/ช่าง',
      baseRate: 2.5,
      extraRateMall: 7.0,
      extraRateNormal: 4.0,
      regex:
        /กล้องวงจรปิด|กล้องสองเลนส์|กล้องหน้าจอคู่|กล้องติดรถยนต์|กล้องแอคชั่น|กล้องดิจิตอล|กล้องถ่ายภาพ|เลนส์|ขาตั้งกล้อง|insta360|gopro|dji|เมมโมรี่การ์ด|memory\s*card|micro\s*sd|sd\s*card|sandisk|kingston|lexar|yoosee|usee|cam720|imou|ezviz|tapo|vstarcam|xiaomi\s*smart\s*camera|ไมโครโฟน|ถ่านชาร์จ|เครื่องต้มไข่|พัดลม|หม้อทอด|หม้อหุงข้าว|เตารีด|เครื่องปั่น|ไดร์เป่าผม|เครื่องหนีบผม|เครื่องดูดฝุ่น|กาต้มน้ำ|เตาแม่เหล็ก|เตาปิ้งย่าง|บล็อกไฟฟ้า|บล็อกแบต|สว่าน|เลื่อย|เจียร|ประแจ|ไขควง|โซล่าเซลล์|ไฟโซล่า|กรรไกรตัดกิ่ง|ปั๊มน้ำ|เครื่องฉีดน้ำ|พาวเวอร์แบงค์|power\s*station|สายชาร์จ|หัวชาร์จ|หูฟัง|ลำโพงบลูทูธ/i
    },
    {
      id: 'E',
      code: 'it_electronics',
      label: 'หมวด E: ไอที มือถือ & ไฟฟ้าใหญ่',
      shortLabel: 'ไอที/มือถือ (คอมต่ำ)',
      baseRate: 1.2,
      extraRateMall: 1.8,
      extraRateNormal: 0.8,
      regex:
        /iphone|ipad|macbook|samsung\s*galaxy|สมาร์ทโฟน|โทรศัพท์มือถือ|แท็บเล็ต|โน้ตบุ๊ค|notebook|laptop|การ์ดจอ|ซีพียู|เมนบอร์ด|จอมอนิเตอร์|จอคอม|ปริ้นเตอร์|ตู้เย็น|เครื่องซักผ้า|แอร์บ้าน|เครื่องปรับอากาศ|สมาร์ททีวี|smart\s*tv|playstation|ps5|nintendo\s*switch|ทองคำแท่ง|ทองรูปพรรณ/i
    },
    {
      id: 'A',
      code: 'beauty_health',
      label: 'หมวด A: ความงาม & สุขภาพ',
      shortLabel: 'ความงาม/สุขภาพ',
      baseRate: 3.5,
      extraRateMall: 12.0,
      extraRateNormal: 6.5,
      regex:
        /เซรั่ม|ครีมทา|ครีมบำรุง|กันแดด|วิตามิน|คอลลาเจน|ลูทีน|สบู่|แชมพู|ครีมนวด|น้ำหอม|โลชั่น|มาส์กหน้า|โฟมล้างหน้า|ลดสิว|แต้มสิว|เจลสิว|รักษาสิว|แผ่นแปะสิว|ลดฝ้า|ทาฝ้า|ครีมฝ้า|เซรั่มฝ้า|ฝ้า\s*กระ|บำรุงผิว|ผิวขาว|ผิวใส|ผิวกาย|ผิวหน้า|กลูต้า|โปรตีน|เวย์|ไฟเบอร์|ดีท็อกซ์|โพรไบโอติก|อาหารเสริม|ลิปสติก|ลิปแมท|ลิปกลอส|แป้งพัฟ|คุชชั่น|คลีนซิ่ง|โทนเนอร์|ยาสีฟัน|บำรุงสายตา|บำรุงข้อ|ลดน้ำหนัก|กันผมร่วง|ปลูกผม|dr\.?\s*pong|la\s*roche|cerave|vaseline|eucerin|garnier|loreal|l'oreal|mizumi|anua|skintific|blackmores|vistra|swisse/i
    },
    {
      id: 'B',
      code: 'fashion',
      label: 'หมวด B: แฟชั่น & แต่งกาย',
      shortLabel: 'แฟชั่น/กระเป๋า',
      baseRate: 3.5,
      extraRateMall: 10.0,
      extraRateNormal: 5.5,
      regex:
        /เสื้อ|กางเกง|เดรส|กระโปรง|กระเป๋า|รองเท้า|แว่นตา|ชุดชั้นใน|บรา|หมวก|เข็มขัด|ถุงเท้า|ชุดนอน|เสื้อยืด|เสื้อเชิ้ต|ยีนส์|คาดิแกน|คาร์ดิแกน|ผ้าใบ|สร้อย|ต่างหู|แหวน|จี้|ชุดว่ายน้ำ|สูท|เนคไท/i
    },
    {
      id: 'C',
      code: 'home_living',
      label: 'หมวด C: ของใช้ในบ้าน & แม่เด็ก',
      shortLabel: 'ของใช้ในบ้าน',
      baseRate: 3.0,
      extraRateMall: 8.5,
      extraRateNormal: 5.0,
      regex:
        /ทิชชู่|กระดาษชำระ|กระทะ|หม้อ|จาน|ชาม|มีดครัว|แก้วเก็บความเย็น|กระบอกน้ำ|หมอน|ที่นอน|ผ้าปู|ท็อปเปอร์|ผ้าห่ม|ม่าน|ชั้นวาง|กล่องเก็บ|ไม้ถูพื้น|ถังขยะ|น้ำยาซักผ้า|ปรับผ้านุ่ม|กันมด|กำจัดมด|ปลวก|แมลงสาบ|ก้านไม้หอม|ปรับอากาศ|ผ้าอ้อม|แพมเพิส|นมผง|ขวดนม|ของเล่น|อาหารแมว|อาหารหมา|ทรายแมว|เก้าอี้|โต๊ะ|โซฟา|เตียง|ผ้าเช็ดตัว|ไมโครไฟเบอร์|กระสอบ|ถุงขยะ|สารดูดความชื้น|ถุงดูดความชื้น/i
    }
  ];

  ns.DEFAULT_CATEGORY_COMM = {
    id: 'F',
    code: 'general_default',
    label: 'หมวด F: สินค้าทั่วไป (ค่าเฉลี่ย)',
    shortLabel: 'สินค้าทั่วไป',
    baseRate: 2.5,
    extraRateMall: 8.0,
    extraRateNormal: 4.5
  };

  /**
   * Estimate baseRate & extraRate from product title, search query, and rate mode
   * @param {string} titleText - Product title
   * @param {boolean} isMallOrPreferred - Whether the card has Mall / ร้านแนะนำ / Extra indicators
   * @param {string} rateMode - 'auto' | '10' | '15' | '20' | 'base_only'
   * @param {string} pageContextText - Optional page category / search keyword fallback
   */
  ns.estimateCategoryCommission = function (
    titleText = '',
    isMallOrPreferred = true,
    rateMode = 'auto',
    pageContextText = ''
  ) {
    if (rateMode === '10') {
      return {
        catId: 'LOCK10',
        catLabel: 'ล็อกเรท 10%',
        baseRate: 2.5,
        extraRate: 7.5,
        totalRate: 10.0
      };
    }
    if (rateMode === '15') {
      return {
        catId: 'LOCK15',
        catLabel: 'ล็อกเรท 15%',
        baseRate: 3.0,
        extraRate: 12.0,
        totalRate: 15.0
      };
    }
    if (rateMode === '20') {
      return {
        catId: 'LOCK20',
        catLabel: 'ล็อกเรท 20%',
        baseRate: 3.5,
        extraRate: 16.5,
        totalRate: 20.0
      };
    }
    if (rateMode === 'base_only') {
      return {
        catId: 'BASE',
        catLabel: 'เฉพาะ Base (ไร้ Extra)',
        baseRate: 2.5,
        extraRate: 0.0,
        totalRate: 2.5
      };
    }

    const primarySample = String(titleText || '');
    const fallbackSample = String(pageContextText || '');
    let matchedCat = null;

    // 1. Match product's own title first
    for (const cat of ns.CATEGORY_COMM_DB) {
      if (cat.regex.test(primarySample)) {
        matchedCat = cat;
        break;
      }
    }
    // 2. Fallback to page category / search query if title didn't match
    if (!matchedCat && fallbackSample) {
      for (const cat of ns.CATEGORY_COMM_DB) {
        if (cat.regex.test(fallbackSample)) {
          matchedCat = cat;
          break;
        }
      }
    }
    if (!matchedCat) {
      matchedCat = ns.DEFAULT_CATEGORY_COMM;
    }

    const baseRate = matchedCat.baseRate;
    const extraRate = isMallOrPreferred ? matchedCat.extraRateMall : matchedCat.extraRateNormal;
    const totalRate = +(baseRate + extraRate).toFixed(1);

    return {
      catId: matchedCat.id,
      catLabel: `${matchedCat.id}: ${matchedCat.shortLabel}`,
      fullLabel: matchedCat.label,
      baseRate,
      extraRate,
      totalRate
    };
  };

  /**
   * Calculate Shopee Commission Breakdown + 4-Tier 107฿/Day (100฿ + VAT 7%) Ad Viability
   */
  ns.calculateCommission = function ({
    price,
    baseRate = 3.5,
    extraRate = 10.0,
    capTHB = 250,
    whtRate = 3.0,
    realDailyAdCostTHB = 107
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

    const viability = ns.evaluateAdViability(netComm, xRate, realDailyAdCostTHB);

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
   * Evaluate 4-Tier Ad Viability against Real Daily Ad Spend (100 THB + 7% VAT = 107 THB)
   * - GOD TIER: netComm >= 80 THB & extraRate > 0
   * - PASS:     netComm 45 - 79.99 THB & extraRate > 0
   * - WARNING:  netComm 20 - 44.99 THB & extraRate > 0 (e.g. ฿23.57)
   * - DANGER:   netComm < 20 THB OR extraRate <= 0
   */
  ns.evaluateAdViability = function (netComm, extraRate, realDailyAdCostTHB = 107) {
    const net = Number(netComm) || 0;
    const extra = Number(extraRate) || 0;
    const adCost = Number(realDailyAdCostTHB) || 107;
    const breakEvenNum = net > 0 ? adCost / net : 999;
    const breakEvenUnits = net > 0 ? breakEvenNum.toFixed(1) : '∞';
    const breakEvenOrders = net > 0 ? Math.ceil(breakEvenNum) : 999;

    if (extra <= 0 || net < 20) {
      return {
        tier: 'danger',
        tierEmoji: '⛔',
        tierLabel: '⛔ ห้ามยิง! คอมต่ำ/ไร้ Extra',
        bannerText:
          net > 0
            ? `⛔ [ไฟแดง ห้ามยิงแอด!] ต้องขายถึง ${breakEvenUnits} ชิ้น (${breakEvenOrders} ออเดอร์) ไม่คุ้มทุนแอด 107฿`
            : `⛔ [ไฟแดง ห้ามยิงแอด!] ค่าคอม 0฿ หรือไม่มี Extra Comm`,
        breakEvenUnits,
        breakEvenOrders,
        realDailyAdCostTHB: adCost
      };
    }
    if (net < 45) {
      return {
        tier: 'warning',
        tierEmoji: '⚠️',
        tierLabel: '⚠️ ระวัง! ต้องขาย 3-5 ชิ้น/วัน',
        bannerText: `⚠️ [ไฟเหลือง ระวังเหนื่อย!] แอด 107฿ ต้องขายตรงปก ${breakEvenUnits} ชิ้น (${breakEvenOrders} ออเดอร์) ถึงคุ้มทุน`,
        breakEvenUnits,
        breakEvenOrders,
        realDailyAdCostTHB: adCost
      };
    }
    if (net < 80) {
      return {
        tier: 'pass',
        tierEmoji: '✅',
        tierLabel: '✅ ไฟเขียว! ขาย 1.5-2 ชิ้นคืนทุน',
        bannerText: `✅ [ไฟเขียว ลุยยิงแอด!] แอด 107฿ ขายตรงปกแค่ ${breakEvenUnits} ชิ้น (${breakEvenOrders} ออเดอร์) คืนทุนทันที!`,
        breakEvenUnits,
        breakEvenOrders,
        realDailyAdCostTHB: adCost
      };
    }
    return {
      tier: 'god',
      tierEmoji: '🔥',
      tierLabel: '🔥 GOD TIER! 1 ชิ้นกำไรทันที',
      bannerText: `🔥 [GOD TIER!] ขายแค่ ${breakEvenUnits} ชิ้น (1 ออเดอร์) กำไรทะลุค่าแอด 107฿ ทันที!`,
      breakEvenUnits,
      breakEvenOrders,
      realDailyAdCostTHB: adCost
    };
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
