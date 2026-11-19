/**
 * DrBank AFF Scout v2.0.0 — Lean Scout & Web UI Bridge Utilities
 * Features:
 *  - Shopee Commission & 4-Tier Ad Viability Engine (100฿/Day Real Ad Cost, Direct AFF Match)
 *  - Strict Alphanumeric Sub_ID Sanitizer (Zero _ or special chars)
 *  - Shopee DOM Helpers & Light/Dark Theme Controller
 */

window.DrBankAFF = window.DrBankAFF || {};

(function (ns) {
  ns.getVersion = function () {
    try {
      return chrome?.runtime?.getManifest?.()?.version || '2.13.1';
    } catch (_e) {
      return '2.13.1';
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
   * Calculate Shopee Commission Breakdown + 4-Tier 100฿/Day Ad Viability (Zero Tax Deduction, Direct AFF Parity)
   */
  ns.calculateCommission = function ({
    price,
    baseRate = 3.5,
    extraRate = 10.0,
    capTHB = 250,
    whtRate = 0.0,
    realDailyAdCostTHB = 100
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
    const whtAmount = 0;
    const netComm = grossComm;
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
   * Evaluate 4-Tier Ad Viability against Daily Ad Spend (100 THB/day)
   * - GOD TIER: netComm >= 80 THB & extraRate > 0
   * - PASS:     netComm 45 - 79.99 THB & extraRate > 0
   * - WARNING:  netComm 20 - 44.99 THB & extraRate > 0 (e.g. ฿23.57)
   * - DANGER:   netComm < 20 THB OR extraRate <= 0
   */
  ns.evaluateAdViability = function (netComm, extraRate, realDailyAdCostTHB = 100) {
    const net = Number(netComm) || 0;
    const extra = Number(extraRate) || 0;
    const adCost = Number(realDailyAdCostTHB) || 100;
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
            ? `⛔ [ไฟแดง ห้ามยิงแอด!] ต้องขายถึง ${breakEvenUnits} ชิ้น (${breakEvenOrders} ออเดอร์) ไม่คุ้มทุนแอด 100฿`
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
        bannerText: `⚠️ [ไฟเหลือง ระวังเหนื่อย!] แอด 100฿ ต้องขายตรงปก ${breakEvenUnits} ชิ้น (${breakEvenOrders} ออเดอร์) ถึงคุ้มทุน`,
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
        bannerText: `✅ [ไฟเขียว ลุยยิงแอด!] แอด 100฿ ขายตรงปกแค่ ${breakEvenUnits} ชิ้น (${breakEvenOrders} ออเดอร์) คืนทุนทันที!`,
        breakEvenUnits,
        breakEvenOrders,
        realDailyAdCostTHB: adCost
      };
    }
    return {
      tier: 'god',
      tierEmoji: '🔥',
      tierLabel: '🔥 GOD TIER! 1 ชิ้นกำไรทันที',
      bannerText: `🔥 [GOD TIER!] ขายแค่ ${breakEvenUnits} ชิ้น (1 ออเดอร์) กำไรทะลุค่าแอด 100฿ ทันที!`,
      breakEvenUnits,
      breakEvenOrders,
      realDailyAdCostTHB: adCost
    };
  };

  ns.GATE_CONFIG = {
    gateVersion: 'v2.14.0',
    minExtraPct: 0.01,
    minNetCommBaht: 20.0,
    baseCapTHB: 250.0,
    dailyAdCostTHB: 100.0,
    minSoldMonthly: 30,
    gradeASoldMonthly: 100,
    highPriceThreshold: 2000,
    gradeBMaxPrice: 3000,
    gradeBMinNetComm: 100,
    hookMinViews: 100000,
    hookMinShares: 1000
  };

  /**
   * 2-Stage Decision Rule & Grade Classification matching server lib/gate.js:
   *  - Stage 1 (Hard Reject): missing item_id, extra <= 0, netComm < 20, confirmed sold === 0, or (sold < 30 && price > 2000)
   *  - Stage 2 (Yellow Warnings + Grade A / B / PASS_WARN): Hook + Sales Velocity + Price guard
   */
  ns.evaluateSpyGate = function (row = {}, customAdCost = 100) {
    const itemId = String(row.item_id || row.itemId || '').replace(/[^0-9]/g, '');
    const price = Math.max(0, Number(row.price) || 0);
    const baseRate = Math.max(0, Number(row.baseRate ?? row.base_comm_pct) || 0);
    const extraRate = Math.max(0, Number(row.extraRate ?? row.extra_comm_pct) || 0);
    const adCost = Number(customAdCost) || ns.GATE_CONFIG.dailyAdCostTHB;
    const comm = ns.calculateCommission({
      price,
      baseRate,
      extraRate,
      capTHB: ns.GATE_CONFIG.baseCapTHB,
      whtRate: 0.0,
      realDailyAdCostTHB: adCost
    });
    const explicit = Number(row.netComm ?? row.net_comm_baht ?? row.estimatedCommission);
    const effectiveNet = (Number.isFinite(explicit) && explicit > 0 && (extraRate > 0 || baseRate > 0))
      ? Math.round(explicit * 100) / 100
      : Math.round(comm.netComm * 100) / 100;
    const totalPct = Math.round((baseRate + extraRate) * 100) / 100;

    const soldRaw = row.soldCount !== undefined ? row.soldCount : row.sold_monthly;
    const soldSource = String(row.soldSource || row.sold_source || '');
    const soldKnown =
      soldRaw !== null &&
      soldRaw !== undefined &&
      soldRaw !== '' &&
      Number.isFinite(Number(soldRaw)) &&
      (Number(soldRaw) > 0 || (Boolean(soldSource) && soldSource !== 'unknown') || row.sold_known === true);
    const soldVal = soldKnown ? Math.max(0, Number(soldRaw) || 0) : null;

    const views = Number(row.fb_views ?? row.fbViews) || 0;
    const shares = Number(row.fb_shares_num ?? row.fb_shares ?? row.fbShares) || 0;
    const hasHook = views >= ns.GATE_CONFIG.hookMinViews || shares >= ns.GATE_CONFIG.hookMinShares;
    const beUnits = effectiveNet > 0 ? Math.ceil(adCost / effectiveNet) : 0;

    if (!itemId) {
      return {
        pass: false,
        decision: 'REJECT_NO_TAG',
        reason: 'ไม่พบป้ายตะกร้า Shopee / item_id',
        reasonTh: 'ไม่พบป้ายตะกร้า Shopee / item_id',
        tier: 'danger',
        grade: 'REJECT',
        warnings: [],
        soldKnown,
        soldMonthly: soldVal,
        effectiveNet: 0,
        totalPct: 0,
        netComm: 0,
        breakEvenUnits: 0
      };
    }
    if (extraRate <= 0) {
      return {
        pass: false,
        decision: 'REJECT_NO_EXTRA',
        reason: `ไม่มี Extra Comm (Base ${baseRate}% · คอม ฿${effectiveNet.toFixed(2)})`,
        reasonTh: `ไม่มี Extra Comm (Base ${baseRate}% · คอม ฿${effectiveNet.toFixed(2)})`,
        tier: 'danger',
        grade: 'REJECT',
        warnings: [],
        soldKnown,
        soldMonthly: soldVal,
        effectiveNet,
        totalPct,
        netComm: effectiveNet,
        breakEvenUnits: beUnits
      };
    }
    if (effectiveNet < ns.GATE_CONFIG.minNetCommBaht) {
      return {
        pass: false,
        decision: 'REJECT_LOW_COMM',
        reason: `ค่าคอม ฿${effectiveNet.toFixed(2)} ต่ำกว่าเกณฑ์ขั้นต่ำ ฿${ns.GATE_CONFIG.minNetCommBaht}`,
        reasonTh: `ค่าคอม ฿${effectiveNet.toFixed(2)} ต่ำกว่าเกณฑ์ขั้นต่ำ ฿${ns.GATE_CONFIG.minNetCommBaht}`,
        tier: 'danger',
        grade: 'REJECT',
        warnings: [],
        soldKnown,
        soldMonthly: soldVal,
        effectiveNet,
        totalPct,
        netComm: effectiveNet,
        breakEvenUnits: beUnits
      };
    }
    if (soldKnown && soldVal === 0) {
      return {
        pass: false,
        decision: 'REJECT_ZERO_SOLD',
        reason: 'ยอดขาย 0 ชิ้น/เดือน (เสี่ยงคลิกฟรี CR ตก)',
        reasonTh: 'ยอดขาย 0 ชิ้น/เดือน (เสี่ยงคลิกฟรี CR ตก)',
        tier: 'danger',
        grade: 'REJECT',
        warnings: [],
        soldKnown,
        soldMonthly: 0,
        effectiveNet,
        totalPct,
        netComm: effectiveNet,
        breakEvenUnits: beUnits
      };
    }
    if (soldKnown && soldVal < ns.GATE_CONFIG.minSoldMonthly && price > ns.GATE_CONFIG.highPriceThreshold) {
      return {
        pass: false,
        decision: 'REJECT_HIGH_PRICE_LOW_SOLD',
        reason: `ของแพง (>฿${ns.GATE_CONFIG.highPriceThreshold.toLocaleString()}) แต่ยอดขายต่ำ (${soldVal} < ${ns.GATE_CONFIG.minSoldMonthly} ชิ้น/ด.)`,
        reasonTh: `ของแพง (>฿${ns.GATE_CONFIG.highPriceThreshold.toLocaleString()}) แต่ยอดขายต่ำ (${soldVal} < ${ns.GATE_CONFIG.minSoldMonthly} ชิ้น/ด.)`,
        tier: 'danger',
        grade: 'REJECT',
        warnings: [],
        soldKnown,
        soldMonthly: soldVal,
        effectiveNet,
        totalPct,
        netComm: effectiveNet,
        breakEvenUnits: beUnits
      };
    }

    const warnings = [];
    if (!soldKnown) warnings.push('WARN_SOLD_UNKNOWN');
    else if (soldVal > 0 && soldVal < ns.GATE_CONFIG.minSoldMonthly) warnings.push('WARN_LOW_SOLD');
    if (price > ns.GATE_CONFIG.highPriceThreshold) warnings.push('WARN_HIGH_PRICE');
    if (!hasHook && (views > 0 || shares > 0)) warnings.push('WARN_NO_HOOK');

    let grade = 'PASS_WARN';
    if (soldKnown && soldVal >= ns.GATE_CONFIG.gradeASoldMonthly && effectiveNet >= ns.GATE_CONFIG.minNetCommBaht) {
      grade = 'A';
    } else if (
      effectiveNet >= ns.GATE_CONFIG.gradeBMinNetComm &&
      price <= ns.GATE_CONFIG.gradeBMaxPrice &&
      (!soldKnown || soldVal >= ns.GATE_CONFIG.minSoldMonthly)
    ) {
      grade = 'B';
    }

    const tier = effectiveNet >= 80 ? 'god' : (effectiveNet >= 45 ? 'pass' : 'warning');
    const warnSuffix = warnings.length > 0 ? ` · เตือน ${warnings.length} จุด` : '';
    const passReason = `ผ่านเกณฑ์ Grade ${grade} (Extra ${extraRate}% · คอม ฿${effectiveNet.toFixed(2)}${warnSuffix})`;
    return {
      pass: true,
      decision: 'PASS',
      reason: passReason,
      reasonTh: passReason,
      tier,
      grade,
      warnings,
      soldKnown,
      soldMonthly: soldVal,
      effectiveNet,
      totalPct,
      netComm: effectiveNet,
      breakEvenUnits: beUnits
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

  /**
   * Parse Shopee API commission rate in any format ("8%", "10.4%", 8000, 0.08, 8) to percentage (0-100)
   */
  ns.parseShopeeRateToPct = function (rawVal) {
    if (rawVal === null || rawVal === undefined || rawVal === '') return 0;
    if (typeof rawVal === 'string') {
      const trimmed = rawVal.trim();
      if (!trimmed) return 0;
      if (trimmed.includes('%')) {
        const p = parseFloat(trimmed);
        return Number.isFinite(p) && p > 0 ? +p.toFixed(2) : 0;
      }
    }
    const num = Number(rawVal);
    if (!Number.isFinite(num) || num <= 0) return 0;
    if (num >= 100) return +(num / 1000).toFixed(2);
    if (num < 1) return +(num * 100).toFixed(2);
    return +num.toFixed(2);
  };

  /**
   * Return the first positive percentage (> 0) from an array of raw candidate values.
   * Unlike `??`, this skips 0, "0%", "", null, and undefined.
   */
  ns.pickFirstPositiveRate = function (candidates = []) {
    if (!Array.isArray(candidates)) return 0;
    for (const c of candidates) {
      const pct = ns.parseShopeeRateToPct(c);
      if (pct > 0) return pct;
    }
    return 0;
  };

  /**
   * Recursively scan an object for any commission rate fields (> 0%).
   */
  ns.scanNestedCommissionRates = function (obj, prefix = '', out = []) {
    if (!obj || typeof obj !== 'object') return out;
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        ns.scanNestedCommissionRates(v, path, out);
      } else if (/commission_rate|comm_rate|_rate$/i.test(k) && !/tax|wht|discount|cancel|return/i.test(k)) {
        const pct = ns.parseShopeeRateToPct(v);
        if (pct > 0) {
          out.push({ key: path, value: pct });
        }
      }
    }
    return out;
  };

  /**
   * Extract STRICT Social Media channel commission from api/v3/offer/product response.
   * Never mixes Shopee Live / Shopee Video rates (live_streaming_default_exist_commission_rate) into Social Media.
   */
  ns.extractSocialMediaCommission = function (rawPayload) {
    const data = rawPayload?.data || rawPayload || {};
    const card = data.batch_item_for_item_card_full || data.item_card_full || {};
    const detail = data.commission_rate_detail || data.commission_detail || {};
    const sellerDetail = detail.seller_commission_detail || data.seller_commission_detail || {};
    const shopeeDetail = detail.shopee_commission_detail || data.shopee_commission_detail || {};
    const isMall = Boolean(card.is_official_shop ?? data.is_official_shop);

    let extraRate = ns.pickFirstPositiveRate([
      sellerDetail.default_exist_commission_rate,
      sellerDetail.social_media_default_exist_commission_rate,
      sellerDetail.social_media_exist_commission_rate,
      sellerDetail.social_media_commission_rate,
      sellerDetail.default_commission_rate,
      sellerDetail.exist_commission_rate,
      sellerDetail.new_commission_rate,
      sellerDetail.commission_rate,
      sellerDetail.max_commission_rate,
      detail.seller_commission_rate
    ]);

    let baseRate = ns.pickFirstPositiveRate([
      shopeeDetail.default_exist_commission_rate,
      shopeeDetail.social_media_default_exist_commission_rate,
      shopeeDetail.social_media_exist_commission_rate,
      shopeeDetail.social_media_commission_rate,
      shopeeDetail.default_commission_rate,
      shopeeDetail.exist_commission_rate,
      shopeeDetail.new_commission_rate,
      shopeeDetail.commission_rate,
      shopeeDetail.max_commission_rate,
      detail.shopee_commission_rate,
      data.shopee_commission_rate
    ]);

    if (extraRate === 0) {
      const scannedSeller = ns.scanNestedCommissionRates(sellerDetail);
      const nonLiveExist = scannedSeller.find((x) => !/live|video/i.test(x.key) && /exist|social|default/i.test(x.key));
      const nonLiveAny = scannedSeller.find((x) => !/live|video/i.test(x.key));
      if (nonLiveExist) extraRate = nonLiveExist.value;
      else if (nonLiveAny) extraRate = nonLiveAny.value;
    }

    if (baseRate === 0) {
      const scannedShopee = ns.scanNestedCommissionRates(shopeeDetail);
      const nonLiveExist = scannedShopee.find((x) => !/live|video/i.test(x.key) && /exist|social|default/i.test(x.key));
      const nonLiveAny = scannedShopee.find((x) => !/live|video/i.test(x.key));
      if (nonLiveExist) baseRate = nonLiveExist.value;
      else if (nonLiveAny) baseRate = nonLiveAny.value;
    }

    const liveExtraRate = ns.pickFirstPositiveRate([
      sellerDetail.live_streaming_default_exist_commission_rate,
      sellerDetail.live_streaming_commission_rate
    ]);
    const liveBaseRate = ns.pickFirstPositiveRate([
      shopeeDetail.live_streaming_default_exist_commission_rate,
      shopeeDetail.live_streaming_commission_rate
    ]);
    const totalDetailRate = ns.pickFirstPositiveRate([
      detail.total_commission_rate,
      detail.default_exist_commission_rate,
      detail.social_media_commission_rate,
      detail.default_commission_rate,
      detail.commission_rate
    ]);

    if (baseRate === 0 && totalDetailRate > extraRate && extraRate > 0) {
      baseRate = +(totalDetailRate - extraRate).toFixed(2);
    } else if (extraRate === 0 && totalDetailRate > baseRate && baseRate > 0) {
      extraRate = +(totalDetailRate - baseRate).toFixed(2);
    }

    let usedListApprox = false;
    if (
      baseRate === 0 &&
      extraRate === 0 &&
      (data.default_commission_rate !== undefined ||
        data.max_commission_rate !== undefined ||
        data.seller_commission_rate !== undefined)
    ) {
      const listFb = ns.extractListCommissionFallback(
        {
          item_id: card.itemid || data.item_id,
          default_commission_rate: data.default_commission_rate,
          max_commission_rate: data.max_commission_rate,
          seller_commission_rate: data.seller_commission_rate
        },
        isMall,
        card.name || data.product_name || ''
      );
      if (Number(listFb?.extraRate) > 0 || Number(listFb?.baseRate) > 0) {
        extraRate = Number(listFb?.extraRate) || 0;
        baseRate = Number(listFb?.baseRate) || 0;
        if (listFb?.isListApprox) usedListApprox = true;
      }
    }

    const hasDetailNode = Boolean(
      data.commission_rate_detail ||
      data.commission_detail ||
      data.seller_commission_detail ||
      data.shopee_commission_detail ||
      totalDetailRate > 0
    );
    const hasRealCommission = Boolean(!usedListApprox && (extraRate > 0 || baseRate > 0 || totalDetailRate > 0));
    const realRateVerified = Boolean(hasDetailNode && hasRealCommission);
    const rateSource = realRateVerified ? 'social_media_detail_api' : (usedListApprox ? 'list_approx' : 'unknown');

    if (extraRate > 0 && baseRate === 0) {
      baseRate = 2.0;
    } else if (baseRate === 0 && extraRate === 0 && (card.itemid || data.item_id)) {
      baseRate = isMall ? 2.0 : 0.6;
    }

    const totalRate = +(extraRate + baseRate).toFixed(2) || totalDetailRate;
    const rawPrice = Number(card.price ?? data.price) || 0;
    const offerPrice = rawPrice > 100000 ? +(rawPrice / 100000).toFixed(2) : rawPrice;
    const rawPriceMax = Number(card.price_max ?? data.price_max) || rawPrice;
    const offerPriceMax = rawPriceMax > 100000 ? +(rawPriceMax / 100000).toFixed(2) : rawPriceMax;

    const rawSoldMonthly = card.sold !== undefined && card.sold !== null ? card.sold : data.sold;
    const rawSoldTotal = card.historical_sold !== undefined && card.historical_sold !== null ? card.historical_sold : data.historical_sold;
    const soldMonthly =
      rawSoldMonthly !== undefined && rawSoldMonthly !== null && rawSoldMonthly !== '' && Number.isFinite(Number(rawSoldMonthly))
        ? Math.max(0, Number(rawSoldMonthly))
        : null;
    const soldTotal =
      rawSoldTotal !== undefined && rawSoldTotal !== null && rawSoldTotal !== '' && Number.isFinite(Number(rawSoldTotal))
        ? Math.max(0, Number(rawSoldTotal))
        : null;

    const imagesHD = Array.isArray(card.images)
      ? card.images.slice(0, 8).map((h) => `https://down-th.img.susercontent.com/file/${h}`)
      : card.image
      ? [`https://down-th.img.susercontent.com/file/${card.image}`]
      : [];

    return {
      hasDetail: Boolean(data.commission_rate_detail || card.itemid || data.item_id || data.product_name),
      hasRealCommission,
      realRateVerified,
      rateSource,
      itemId: String(card.itemid || data.item_id || ''),
      shopId: String(card.shopid || data.shop_id || ''),
      title: card.name || data.product_name || '',
      offerPrice,
      offerPriceMax,
      extraRate,
      baseRate,
      totalRate,
      liveExtraRate,
      liveBaseRate,
      soldMonthly,
      soldTotal,
      soldSource: soldMonthly !== null ? 'affiliate_offer_api' : 'unknown',
      stock: Number(card.stock ?? data.stock) || 0,
      rating: Number(card?.item_rating?.rating_star) || 0,
      isMall,
      imagesHD
    };
  };

  /**
   * Safe fallback extractor for /api/v3/offer/product/list where commission_rate_detail is absent or partial.
   * Marks list-only approximations as realRateVerified: false so Live/Video rates never poison Social Media cache.
   */
  ns.extractListCommissionFallback = function (rawItem, isMall = false, title = '') {
    const channelDetail =
      rawItem?.commission_rate_detail ||
      rawItem?.data?.commission_rate_detail ||
      rawItem?.channel_commission_rate;
    const card = rawItem?.batch_item_for_item_card_full || rawItem?.item_card_full || {};
    const rawListSold = card.sold !== undefined && card.sold !== null ? card.sold : rawItem?.sold;
    const rawListHist = card.historical_sold !== undefined && card.historical_sold !== null ? card.historical_sold : rawItem?.historical_sold;
    const soldMonthly =
      rawListSold !== undefined && rawListSold !== null && rawListSold !== '' && Number.isFinite(Number(rawListSold))
        ? Math.max(0, Number(rawListSold))
        : null;
    const soldTotal =
      rawListHist !== undefined && rawListHist !== null && rawListHist !== '' && Number.isFinite(Number(rawListHist))
        ? Math.max(0, Number(rawListHist))
        : null;
    const soldSource = soldMonthly !== null ? 'offer_list_xhr' : 'unknown';

    if (channelDetail) {
      const exact = ns.extractSocialMediaCommission(rawItem);
      if (exact.realRateVerified && (exact.extraRate > 0 || exact.baseRate > 0)) {
        return {
          extraRate: exact.extraRate,
          baseRate: exact.baseRate,
          totalRate: exact.totalRate,
          hasRealCommission: true,
          realRateVerified: true,
          isListApprox: false,
          rateSource: 'offer_list_channel_detail',
          soldMonthly: soldMonthly !== null ? soldMonthly : exact.soldMonthly,
          soldTotal: soldTotal !== null ? soldTotal : exact.soldTotal,
          soldSource: soldMonthly !== null ? soldSource : exact.soldSource
        };
      }
    }

    const defaultTotal = ns.pickFirstPositiveRate([
      rawItem?.default_commission_rate,
      rawItem?.max_commission_rate,
      rawItem?.commission_rate,
      rawItem?.commission_rate_detail?.total_commission_rate
    ]);
    const sellerRate = ns.pickFirstPositiveRate([
      rawItem?.seller_commission_rate,
      rawItem?.commission_rate_detail?.seller_commission_detail?.default_exist_commission_rate,
      rawItem?.commission_rate_detail?.seller_commission_detail?.social_media_commission_rate,
      rawItem?.commission_rate_detail?.seller_commission_detail?.commission_rate
    ]);
    let extraRate = 0;
    let baseRate = 0;
    let hasListRate = false;

    if (defaultTotal > 0) {
      hasListRate = true;
      if (sellerRate > 0 && defaultTotal > sellerRate) {
        extraRate = sellerRate;
        baseRate = +(defaultTotal - sellerRate).toFixed(2);
      } else if (sellerRate > 0 && sellerRate >= defaultTotal) {
        baseRate = defaultTotal > 2.0 ? 2.0 : 0;
        extraRate = +(defaultTotal - baseRate).toFixed(2);
      } else {
        extraRate = 0;
        baseRate = defaultTotal;
      }
    } else if (sellerRate > 0) {
      hasListRate = true;
      extraRate = sellerRate;
      baseRate = 2.0;
    } else {
      const catEst = ns.estimateCategoryCommission(title, isMall, 'auto', '');
      baseRate = catEst.baseRate || 2.0;
      extraRate = 0;
    }

    return {
      extraRate,
      baseRate,
      totalRate: +(extraRate + baseRate).toFixed(2),
      hasRealCommission: false,
      realRateVerified: false,
      isListApprox: true,
      rateSource: hasListRate ? 'list_approx' : 'category_estimate',
      soldMonthly,
      soldTotal,
      soldSource
    };
  };
})(window.DrBankAFF);
