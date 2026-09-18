import { db } from '../db/init.js';
import { fetchYahooExchangeRate, fetchYahooLatest, fetchYahooHistorical, fetchYahooFundamentals } from './yahoo.js';
import { calcEMA, calcEMASeries, calcBankerMCDX, calcBankerSeries, calcMcdxSeries, calcRSI, syncCandleDelta } from './technicalAnalysis.js';

export const DEFAULT_2X_STOCKS = [
  // Core Commanders (83%)
  { symbol: 'NVDA', name: 'NVIDIA', target_percent: 15.0, category: 'Core' },
  { symbol: 'TSM', name: 'TSMC', target_percent: 10.0, category: 'Core' },
  { symbol: 'AVGO', name: 'Broadcom', target_percent: 10.0, category: 'Core' },
  { symbol: 'VRT', name: 'Vertiv', target_percent: 10.0, category: 'Core' },
  { symbol: 'MELI', name: 'MercadoLibre', target_percent: 10.0, category: 'Core' },
  { symbol: 'APH', name: 'Amphenol', target_percent: 10.0, category: 'Core' },
  { symbol: 'KLAC', name: 'KLA Corp', target_percent: 7.0, category: 'Core' },
  { symbol: 'ANET', name: 'Arista Networks', target_percent: 7.0, category: 'Core' },
  { symbol: 'CRWD', name: 'CrowdStrike', target_percent: 4.0, category: 'Core' },
  // Moonshot Strikes (11%)
  { symbol: 'STRL', name: 'Sterling Infra', target_percent: 3.0, category: 'Moonshot' },
  { symbol: 'ALAB', name: 'Astera Labs', target_percent: 3.0, category: 'Moonshot' },
  { symbol: 'PLTR', name: 'Palantir', target_percent: 3.0, category: 'Moonshot' },
  { symbol: 'CLS', name: 'Celestica', target_percent: 2.0, category: 'Moonshot' }
];

export const DEFAULT_TIGER_2X_STOCKS = [
  { symbol: 'QQQM', name: 'Invesco NASDAQ 100 ETF', target_percent: 30.0, category: 'Core' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', target_percent: 20.0, category: 'Core' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor', target_percent: 20.0, category: 'Core' },
  { symbol: 'AVGO', name: 'Broadcom Inc', target_percent: 15.0, category: 'Core' },
  { symbol: 'VRT', name: 'Vertiv Holdings', target_percent: 15.0, category: 'Core' }
];

export const DEFAULT_CONFIG = {
  goal_amount_thb: 10000000,
  target_cagr: 0.26,
  target_years: 5,
  max_stock_ceiling_pct: 30,
  monthly_inflow_thb: 35000,
  fcd_yield_pct: 4.5
};

/**
 * Get or create Project 2X config for a portfolio
 */
export function getOrCreateConfig(portfolioId) {
  let row = db.prepare('SELECT * FROM project2x_config WHERE portfolio_id = ?').get(portfolioId);
  if (!row) {
    db.prepare(`
      INSERT INTO project2x_config (
        portfolio_id, goal_amount_thb, target_cagr, target_years, max_stock_ceiling_pct, monthly_inflow_thb, fcd_yield_pct
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      portfolioId,
      DEFAULT_CONFIG.goal_amount_thb,
      DEFAULT_CONFIG.target_cagr,
      DEFAULT_CONFIG.target_years,
      DEFAULT_CONFIG.max_stock_ceiling_pct,
      DEFAULT_CONFIG.monthly_inflow_thb,
      DEFAULT_CONFIG.fcd_yield_pct
    );
    row = db.prepare('SELECT * FROM project2x_config WHERE portfolio_id = ?').get(portfolioId);
  }
  return row;
}

/**
 * Update Project 2X config
 */
export function updateProject2xConfig(portfolioId, updates) {
  getOrCreateConfig(portfolioId);
  const fields = [];
  const values = [];

  const allowed = [
    'goal_amount_thb', 'target_cagr', 'target_years', 'max_stock_ceiling_pct', 'monthly_inflow_thb', 'fcd_yield_pct'
  ];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(Number(updates[key]));
    }
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(portfolioId);
    db.prepare(`UPDATE project2x_config SET ${fields.join(', ')} WHERE portfolio_id = ?`).run(...values);
  }

  return db.prepare('SELECT * FROM project2x_config WHERE portfolio_id = ?').get(portfolioId);
}

/**
 * Calculate current holdings and cash balance from transactions
 */
export function getPortfolioHoldings(portfolioId) {
  const port = db.prepare('SELECT initial_cash FROM portfolios WHERE id = ?').get(portfolioId);
  let cash = port?.initial_cash || 0;

  const txs = db.prepare(`
    SELECT symbol, type, asset, amount, price, fee, status FROM transactions 
    WHERE portfolio_id = ? AND (status IS NULL OR status != 'CANCELLED')
    ORDER BY date ASC
  `).all(portfolioId);

  const holdings = {};
  for (const t of txs) {
    const sym = (t.symbol || '').toUpperCase();
    const amount = Number(t.amount) || 0;
    const price = Number(t.price) || 0;
    const fee = Number(t.fee) || 0;
    const isCash = t.asset === 'Cash' || sym === 'CASH';

    if (t.type === 'BUY') {
      if (isCash) {
        cash += amount;
      } else {
        cash -= (amount * price) + fee;
        if (!holdings[sym]) holdings[sym] = { shares: 0, totalCost: 0 };
        holdings[sym].shares += amount;
        holdings[sym].totalCost += (amount * price) + fee;
      }
    } else if (t.type === 'SELL') {
      if (isCash) {
        cash -= amount;
      } else {
        cash += (amount * price) - fee;
        if (!holdings[sym]) holdings[sym] = { shares: 0, totalCost: 0 };
        if (holdings[sym].shares > 0) {
          const avgCost = holdings[sym].totalCost / holdings[sym].shares;
          holdings[sym].shares -= amount;
          holdings[sym].totalCost = Math.max(0, holdings[sym].shares * avgCost);
        } else {
          holdings[sym].shares -= amount;
        }
      }
    } else if (t.type === 'DEPOSIT') {
      cash += amount;
    } else if (t.type === 'WITHDRAW') {
      cash -= amount;
    } else if (t.type === 'DIVIDEND' || t.type === 'INTEREST') {
      cash += (amount - fee);
    }
  }

  // Cleanup dust (< 0.001 shares)
  for (const sym in holdings) {
    if (Math.abs(holdings[sym].shares) < 0.001) {
      holdings[sym].shares = 0;
      holdings[sym].totalCost = 0;
    }
  }

  return { holdings, cash: Math.max(0, Number(cash.toFixed(2))) };
}

/**
 * Sync / Initialize Share Quotas for the portfolio
 */
export async function syncShareQuotas(portfolioId, forceDefault = false) {
  const config = getOrCreateConfig(portfolioId);
  const fxObj = await fetchYahooExchangeRate('USD', 'THB');
  const fxRate = fxObj?.rate || 35.0;

  const targetUsdTotal = config.goal_amount_thb / fxRate;

  // Check if portfolio is Tiger
  const port = db.prepare('SELECT id, name FROM portfolios WHERE id = ?').get(portfolioId);
  const isTiger = port && /tiger/i.test(port.name);
  const targetStockList = isTiger ? DEFAULT_TIGER_2X_STOCKS : DEFAULT_2X_STOCKS;

  // Check existing quotas
  const existing = db.prepare('SELECT * FROM project2x_share_quotas WHERE portfolio_id = ?').all(portfolioId);

  if (existing.length === 0 || forceDefault) {
    // If resetting or seeding, clear existing quotas for this portfolio
    db.prepare('DELETE FROM project2x_share_quotas WHERE portfolio_id = ?').run(portfolioId);

    const insert = db.prepare(`
      INSERT OR REPLACE INTO project2x_share_quotas (
        portfolio_id, symbol, category, target_percent, base_price, split_factor, target_shares, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const stock of targetStockList) {
      // Get current price or last close to anchor base_price
      let basePrice = 100;
      try {
        const latest = await fetchYahooLatest(stock.symbol);
        if (latest && latest.price) {
          basePrice = latest.price;
        } else {
          const candles = await syncCandleDelta(stock.symbol, 100);
          if (candles.length > 0) basePrice = candles[candles.length - 1].price;
        }
      } catch (e) {
        // fallback
      }

      const allocUsd = targetUsdTotal * (stock.target_percent / 100);
      const targetShares = Number((allocUsd / basePrice).toFixed(4));

      insert.run(
        portfolioId,
        stock.symbol,
        stock.category,
        stock.target_percent,
        basePrice,
        1.0,
        targetShares,
        'COLLECTING'
      );
    }
  }

  // Return full quotas with current holding progress
  const quotas = db.prepare('SELECT * FROM project2x_share_quotas WHERE portfolio_id = ?').all(portfolioId);
  const { holdings } = getPortfolioHoldings(portfolioId);

  const enriched = [];
  for (const q of quotas) {
    let ownedShares = holdings[q.symbol]?.shares || 0;

    // In Tiger portfolio, if QQQM is not yet bought, check SCHG (proxy from playbook)
    if (isTiger && q.symbol === 'QQQM' && ownedShares === 0 && holdings['SCHG']?.shares > 0) {
      const schgShares = holdings['SCHG'].shares;
      const schgPrice = holdings['SCHG'].currentPrice || 35.0;
      const qqqmPrice = q.base_price || 520.0;
      ownedShares = Number(((schgShares * schgPrice) / qqqmPrice).toFixed(4));
    }

    const progress = q.target_shares > 0 ? Number(((ownedShares / q.target_shares) * 100).toFixed(1)) : 0;
    
    let status = 'COLLECTING';
    if (ownedShares <= 0.0001) status = 'EMPTY';
    else if (progress >= 100) status = 'LOCKED';

    // Update status in DB if changed
    if (status !== q.status) {
      db.prepare('UPDATE project2x_share_quotas SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, q.id);
    }

    enriched.push({
      ...q,
      owned_shares: Number(ownedShares.toFixed(4)),
      progress_percent: progress,
      status
    });
  }

  return enriched;
}

/**
 * 8-Scenario Technical Classifier with Risk-First Hierarchical Evaluation
 */
export function classifyScenario({
  currentPrice,
  ema50,
  ema150,
  ema200,
  distEma50,
  distEma150,
  distEma200,
  banker,
  rsi14,
  isLatestBullish = true,
  consecutiveRedBars = 0,
  volRatio = 1.0,
  regime = 'NEUTRAL',
  daysNearEma200 = 0,
  daysBelowEma200 = 0,
  daysBankerZero = 0,
  isBearTrapReclaimed = false,
  isDoubleBottomConfirmed = false,
  isBaseBreakout = false,
  isRegimeFlip = false,
  category = 'Core'
}) {
  if (!currentPrice || !ema150 || !ema200) {
    return {
      scenario: 13,
      traffic_light: 'WAIT',
      badge: 'Evaluating',
      distEma50: 0,
      distEma150: 0,
      distEma200: 0,
      regime: 'NEUTRAL',
      volRatio: 1.0,
      reason: 'Insufficient technical indicators',
      reason_th: 'กำลังรอประมวลผลข้อมูลกราฟ',
      checklist: { regimePass: false, distPass: false, bankerPass: false, rsiPass: false, candlePass: false, volumePass: false },
      signals_checklist: []
    };
  }

  const d50 = distEma50 !== undefined ? distEma50 : (ema50 ? Number((((currentPrice - ema50) / ema50) * 100).toFixed(2)) : 0);
  const d150 = distEma150 !== undefined ? distEma150 : Number((((currentPrice - ema150) / ema150) * 100).toFixed(2));
  const d200 = distEma200 !== undefined ? distEma200 : Number((((currentPrice - ema200) / ema200) * 100).toFixed(2));

  // TIER 0: DANGER VETO GUARDS (Stop loss & high-risk falling knives)
  // 1. Falling Knife: Plunged below EMA 200 by > 4% with 0 Banker
  if (d200 < -4 && banker === 0) {
    return {
      scenario: 5,
      traffic_light: 'DANGER',
      badge: 'Falling Knife',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `Plunged below EMA 200 (${d200}%) with 0 Banker. Stand aside, do not catch falling knife!`,
      reason_th: `ราคาหลุดเส้น EMA 200 ลึก (${d200}%) + ไร้แรงสถาบัน (Banker = 0) — ห้ามรับมีดเด็ดขาด นั่งทับมือรอมีดปักพื้น`,
      checklist: { regimePass: false, distPass: false, bankerPass: false, rsiPass: false, candlePass: false, volumePass: false },
      signals_checklist: [
        { label: 'EMA Regime', pass: false, value: regime },
        { label: 'Dist EMA 200', pass: false, value: `${d200}% (< -4%)` },
        { label: 'Banker MCDX', pass: false, value: `${banker}/20 (Zero)` },
        { label: 'Safety VETO', pass: false, value: 'CRITICAL DANGER' }
      ]
    };
  }

  // 2. Dead Cat Bounce: Plunged below EMA 200 (> -4%) trying a weak bounce under water with weak banker (1-6)
  if (d200 < -4 && banker > 0 && banker <= 6) {
    return {
      scenario: 6,
      traffic_light: 'DANGER',
      badge: 'Dead Cat Bounce',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `Submerged below EMA 200 (${d200}%) with weak institutional presence (${banker}/20). High risk of secondary dump.`,
      reason_th: `ราคาจมใต้เส้น EMA 200 (${d200}%) เด้งสั้นๆ ใต้บาดาลสถาบันบางตา (${banker}/20) — อย่าผลีผลาม รอให้กลับมายืนเหนือเส้น 200 ก่อน`,
      checklist: { regimePass: false, distPass: false, bankerPass: false, rsiPass: false, candlePass: false, volumePass: false },
      signals_checklist: [
        { label: 'EMA Regime', pass: false, value: regime },
        { label: 'Dist EMA 200', pass: false, value: `${d200}% (< -4%)` },
        { label: 'Banker MCDX', pass: false, value: `${banker}/20 (Weak)` },
        { label: 'Bounce Quality', pass: false, value: 'Underwater Bounce' }
      ]
    };
  }

  // 3. Slow Bleed / Death Drift: Persistent decay without bounce
  if (regime === 'BEAR' && d200 < 0 && daysBankerZero >= 8) {
    return {
      scenario: 7,
      traffic_light: 'WAIT',
      badge: 'Slow Bleed',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `In BEAR regime with persistent 0 Banker for ${daysBankerZero} days. Slow bleed without institutional bid. Stand by.`,
      reason_th: `เทรนด์ใหญ่ขาลง (BEAR) + สถาบันทิ้งหายต่อเนื่อง ${daysBankerZero} วัน — หุ้นไหลซึมไร้แรงซื้อ ทับมือ 100% รอโครงสร้างฟื้น`,
      checklist: { regimePass: false, distPass: false, bankerPass: false, rsiPass: false, candlePass: false, volumePass: false },
      signals_checklist: [
        { label: 'EMA Regime', pass: false, value: regime },
        { label: 'Dist EMA 200', pass: false, value: `${d200}%` },
        { label: 'Banker Zero Days', pass: false, value: `${daysBankerZero} Days` },
        { label: 'Strategy', pass: true, value: 'Standby / Cash' }
      ]
    };
  }

  // TIER 1: HIGH CONVICTION REVERSAL (100% Size)
  // 4. Double Bottom Confirmed: Retest of EMA 200 with higher low & banker present
  if (isDoubleBottomConfirmed && regime !== 'BEAR') {
    return {
      scenario: 1,
      traffic_light: 'BUY_ZONE',
      badge: 'Double Bottom',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `Double Bottom confirmed at EMA 200 (${d200}%) with higher low + Banker (${banker}/20). Highest conviction reversal (Deploy 100%).`,
      reason_th: `ทดสอบแนวรับเส้น EMA 200 ซ้ำรอบที่ 2 สำเร็จ (Double Bottom) ฐานยกสูง + สถาบันสะสม (${banker}/20) — สัญญาณกลับตัวความมั่นใจสูงสุด จัดเต็ม 100%!`,
      checklist: { regimePass: true, distPass: true, bankerPass: true, rsiPass: true, candlePass: true, volumePass: true },
      signals_checklist: [
        { label: 'EMA Regime', pass: true, value: regime },
        { label: 'Dist EMA 200', pass: true, value: `${d200}%` },
        { label: 'Retest Structure', pass: true, value: 'Double Bottom (Higher Low)' },
        { label: 'Banker MCDX', pass: true, value: `${banker}/20` },
        { label: 'Candle Rebound', pass: true, value: isLatestBullish ? 'Bullish Green' : 'Consolidating' },
        { label: 'Deploy Tranche', pass: true, value: '100% Size' }
      ]
    };
  }

  // TIER 2: CONFIRMED RECLAIM / BREAKOUT (75-100% Size)
  // 5. Bear Trap Reclaim: Deep dip below EMA 200 reclaimed with volume
  if (isBearTrapReclaimed && regime !== 'BEAR' && banker >= 1 && isLatestBullish) {
    return {
      scenario: 2,
      traffic_light: 'BUY_ZONE',
      badge: 'Bear Trap Reclaim',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `False breakdown reclaimed! Surpassed EMA 200 with institutional accumulation (${banker}/20, Vol ${volRatio}x). Deploy 75-100%.`,
      reason_th: `กับดักหมีสำเร็จ! ทะลวงกลับมายืนเหนือ EMA 200 ได้มั่นคง 2 วันติด + วอลุ่มสถาบันดัน (${volRatio}x) — สัญญาณหลอกกิน Stop loss สถาบันพาพุ่ง จัด 75-100%!`,
      checklist: { regimePass: true, distPass: true, bankerPass: true, rsiPass: true, candlePass: true, volumePass: volRatio >= 1.2 },
      signals_checklist: [
        { label: 'EMA Regime', pass: true, value: regime },
        { label: 'Dist EMA 200', pass: true, value: `${d200}% (Reclaimed)` },
        { label: 'Trap Reclaim', pass: true, value: 'Held > EMA200 (2 Days)' },
        { label: 'Banker MCDX', pass: true, value: `${banker}/20` },
        { label: 'Volume Surge', pass: volRatio >= 1.2, value: `${volRatio}x 20D SMA` },
        { label: 'Deploy Tranche', pass: true, value: '75 - 100%' }
      ]
    };
  }

  // 6. Breakout from Base: Breakout from tight base near EMA with volume
  if (isBaseBreakout && regime !== 'BEAR') {
    return {
      scenario: 3,
      traffic_light: 'BUY_ZONE',
      badge: 'Base Breakout',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `Explosive breakout from tight EMA base with Volume surge (${volRatio}x) and Banker (${banker}/20). Deploy 100%.`,
      reason_th: `ระเบิดออกจากกรอบสะสมแนวรับ วอลุ่มพุ่ง (${volRatio}x) + สถาบันเกาะหนาแน่น (${banker}/20) — Breakout คอนเฟิร์ม เติมไม้เต็ม 100%!`,
      checklist: { regimePass: true, distPass: true, bankerPass: true, rsiPass: true, candlePass: true, volumePass: true },
      signals_checklist: [
        { label: 'EMA Regime', pass: true, value: regime },
        { label: 'Base Range', pass: true, value: 'Tight Consolidation Broken' },
        { label: 'Banker MCDX', pass: true, value: `${banker}/20` },
        { label: 'Volume Surge', pass: true, value: `${volRatio}x (Explosive)` },
        { label: 'RSI Momentum', pass: true, value: `${rsi14 || '—'}` },
        { label: 'Deploy Tranche', pass: true, value: '100% Size' }
      ]
    };
  }

  // TIER 3: STANDARD DIP BUY (50-100% Size)
  const isNearEma200 = (d200 >= -3.0 && d200 <= 1.5);
  const isNearEma150 = (d150 >= -2.0 && d150 <= 1.5);
  const isNearMajorEma = isNearEma200 || isNearEma150;

  // 7. V-Shape Quick Dip Rebound or Support Testing
  if (isNearMajorEma && banker >= 1 && banker <= 14) {
    if (!isLatestBullish && consecutiveRedBars >= 2) {
      return {
        scenario: 8,
        traffic_light: 'WAIT',
        badge: 'Testing Support',
        distEma50: d50,
        distEma150: d150,
        distEma200: d200,
        regime,
        volRatio,
        reason: `Pulling back to EMA 150/200 support (${d200}%) with Banker (${banker}/20), but red selling pressure persists (${consecutiveRedBars} red bars). Wait for a green rebound candle.`,
        reason_th: `ราคากำลังย่อลงมาหาแนวรับ EMA 150/200 (${d200}%) สถาบันมี (${banker}/20) แต่ยังโดนเทขายแท่งแดง (${consecutiveRedBars} แท่งติด) — รอแท่งเขียวเด้งคอนเฟิร์มก่อนเข้า!`,
        checklist: { regimePass: regime === 'BULL', distPass: true, bankerPass: true, rsiPass: true, candlePass: false, volumePass: true },
        signals_checklist: [
          { label: 'EMA Regime', pass: regime === 'BULL', value: regime },
          { label: 'Dist EMA 200', pass: true, value: `${d200}%` },
          { label: 'Banker MCDX', pass: true, value: `${banker}/20` },
          { label: 'Candle Action', pass: false, value: `${consecutiveRedBars} Red Bars (Wait for Green)` }
        ]
      };
    }

    if (isLatestBullish && regime === 'BULL') {
      return {
        scenario: 4,
        traffic_light: 'BUY_ZONE',
        badge: 'V-Shape Rebound',
        distEma50: d50,
        distEma150: d150,
        distEma200: d200,
        regime,
        volRatio,
        reason: `V-Shape rebound at EMA 150/200 support + Banker active (${banker}/20) + Bull Regime confirmed. Prime Buy Zone (Deploy 100%).`,
        reason_th: `ราคาแตะแนวรับเส้น EMA 150/200 แล้วแท่งเขียวเด้งสวนทันที + สถาบันหนุน (${banker}/20) ในเทรนด์ขาขึ้น — จุดช้อนซื้อชั้นยอด จัดเต็ม 100%!`,
        checklist: { regimePass: true, distPass: true, bankerPass: true, rsiPass: (rsi14 ? rsi14 < 50 : true), candlePass: true, volumePass: volRatio >= 0.8 },
        signals_checklist: [
          { label: 'EMA Regime', pass: true, value: regime },
          { label: 'Dist Major EMA', pass: true, value: isNearEma200 ? `EMA200 ${d200}%` : `EMA150 ${d150}%` },
          { label: 'Banker MCDX', pass: true, value: `${banker}/20` },
          { label: 'Candle Rebound', pass: true, value: 'Bullish Green' },
          { label: 'RSI 14', pass: (rsi14 ? rsi14 < 50 : true), value: `${rsi14 || '—'} (< 50)` },
          { label: 'Deploy Tranche', pass: true, value: '100% Size' }
        ]
      };
    }
  }

  // 8. Shallow Dip — EMA 50 Bounce
  const isNearEma50 = (d50 >= -2.0 && d50 <= 1.5);
  if (isNearEma50 && d150 > 4.0 && regime === 'BULL' && banker >= 6 && isLatestBullish) {
    return {
      scenario: 8,
      traffic_light: 'BUY_ZONE',
      badge: 'Shallow Dip (EMA50)',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `Shallow pullback to EMA 50 in super-bull trend (far above EMA 150 +${d150}%) with strong Banker (${banker}/20). Deploy 50% tranche.`,
      reason_th: `ย่อตื้นแตะแนวรับแรกเส้น EMA 50 ในหุ้นเทรนด์แกร่งพิเศษ (ลอยเหนือเส้น 150 ถึง +${d150}%) สถาบันคุมเข้ม (${banker}/20) — จัดไม้ตามเทรนด์ 50%!`,
      checklist: { regimePass: true, distPass: true, bankerPass: true, rsiPass: true, candlePass: true, volumePass: true },
      signals_checklist: [
        { label: 'EMA Regime', pass: true, value: 'Super BULL (Perfect Order)' },
        { label: 'Dist EMA 50', pass: true, value: `${d50}% (Kiss Support)` },
        { label: 'Dist EMA 150', pass: true, value: `+${d150}% (Strong Altitude)` },
        { label: 'Banker MCDX', pass: true, value: `${banker}/20 (High)` },
        { label: 'Deploy Tranche', pass: true, value: '50% Size' }
      ]
    };
  }

  // TIER 4: ACCUMULATION & WATCH
  // 9. Regime Flip Recovery: Golden Cross of EMA 50 > EMA 200
  if (isRegimeFlip && banker >= 4 && isLatestBullish) {
    return {
      scenario: 9,
      traffic_light: 'BUY_ZONE',
      badge: 'Regime Flip',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `EMA 50 crossed above EMA 200 (Golden Cross) with institutional inflow (${banker}/20). Trend reversal beginning. Nibble 25%.`,
      reason_th: `เส้น EMA 50 ตัดข้าม EMA 200 (Golden Cross) ฟื้นตัวจากขาลง + สถาบันเริ่มสะสม (${banker}/20) — เริ่มสะสมไม้แรก 25%!`,
      checklist: { regimePass: true, distPass: true, bankerPass: true, rsiPass: true, candlePass: true, volumePass: true },
      signals_checklist: [
        { label: 'EMA Regime', pass: true, value: 'Golden Cross (50 > 200)' },
        { label: 'Price Level', pass: true, value: 'Above EMA 50 & 200' },
        { label: 'Banker MCDX', pass: true, value: `${banker}/20` },
        { label: 'Deploy Tranche', pass: true, value: '25% Starter Tranche' }
      ]
    };
  }

  // 10. Sideway Base Building: Consolidating near EMA 200
  if (daysNearEma200 >= 5 && regime !== 'BEAR' && banker >= 2 && (rsi14 >= 35 && rsi14 <= 60) && volRatio <= 1.1) {
    return {
      scenario: 10,
      traffic_light: 'BUY_ZONE',
      badge: 'Sideway Base',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `Consolidating tightly around EMA 200 for ${daysNearEma200} days with dry volume (${volRatio}x) and steady Banker (${banker}/20). Accumulate DCA 25% tranches.`,
      reason_th: `ราคาสร้างฐานกอดเส้น EMA 200 นิ่งๆ นาน ${daysNearEma200} วันทำการ วอลุ่มแห้งบีบตัว (${volRatio}x) สถาบันเลี้ยงตัว (${banker}/20) — ทยอย DCA สะสมไม้ละ 25%`,
      checklist: { regimePass: true, distPass: true, bankerPass: true, rsiPass: true, candlePass: true, volumePass: true },
      signals_checklist: [
        { label: 'EMA Regime', pass: true, value: regime },
        { label: 'Base Duration', pass: true, value: `${daysNearEma200} Days near EMA200` },
        { label: 'Banker MCDX', pass: true, value: `${banker}/20` },
        { label: 'Volume Squeeze', pass: true, value: `${volRatio}x (Dry Volume)` },
        { label: 'Deploy Strategy', pass: true, value: 'DCA 25% per Tranche' }
      ]
    };
  }

  // 11. Early Bird Watch: Kissing support but banker 0 or still red
  if (isNearMajorEma && (banker === 0 || !isLatestBullish)) {
    return {
      scenario: 11,
      traffic_light: 'WAIT',
      badge: 'Early Bird Watch',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `Hovering at major EMA support bottom (${d200}%), but Banker is zero (${banker}/20). Keep on tight watch, wait for green reversal candle.`,
      reason_th: `ราคาลงมาแตะแนวรับใหญ่ (${d200}%) แต่สถาบันยังไม่ส่งสัญญาณ (Banker = 0) — เฝ้าจอเตรียมพร้อม รอแท่งเขียวยืนยัน`,
      checklist: { regimePass: regime !== 'BEAR', distPass: true, bankerPass: false, rsiPass: (rsi14 ? rsi14 < 45 : true), candlePass: isLatestBullish, volumePass: true },
      signals_checklist: [
        { label: 'EMA Support', pass: true, value: `${d200}%` },
        { label: 'Banker MCDX', pass: false, value: `${banker}/20 (Zero / Dormant)` },
        { label: 'Status', pass: true, value: 'WATCHLIST / PREPARE' }
      ]
    };
  }

  // TIER 5: OVERBOUGHT & DEFAULT FALLBACKS
  // 12. Overbought
  const obThreshold = category === 'Moonshot' ? 25 : 14;
  if (d150 > obThreshold && banker >= 15) {
    return {
      scenario: 12,
      traffic_light: 'WAIT',
      badge: 'Overbought',
      distEma50: d50,
      distEma150: d150,
      distEma200: d200,
      regime,
      volRatio,
      reason: `Overextended +${d150}% above EMA 150 with saturated Banker (${banker}/20). High pullback risk. Do not chase.`,
      reason_th: `ราคาลอยฟ้าเหนือ EMA 150 (+${d150}%) สถาบันชนเพดาน (${banker}/20) — เสี่ยงโดนเททำกำไร ห้ามไล่ราคาเด็ดขาด`,
      checklist: { regimePass: true, distPass: false, bankerPass: false, rsiPass: false, candlePass: true, volumePass: true },
      signals_checklist: [
        { label: 'Dist EMA 150', pass: false, value: `+${d150}% (> ${obThreshold}%)` },
        { label: 'Banker MCDX', pass: false, value: `${banker}/20 (Saturated)` },
        { label: 'Action', pass: true, value: 'Park cash in Dime FCD' }
      ]
    };
  }

  // 13. Default: Consolidating / Pullback with high granularity
  let defaultBadge = 'Consolidating';
  let defaultTh = 'ราคาวิ่งตามเทรนด์ปกติ รอจังหวะย่อตัวลงมาแตะแนวรับ';
  if (d150 < 0 && d150 >= -3) {
    defaultBadge = 'Healthy Dip';
    defaultTh = 'ราคาย่อตัวตามปกติในกรอบ -1% ถึง -3% กำลังจับตาแนวรับ';
  } else if (d150 < -3 && d150 >= -6) {
    defaultBadge = 'Deep Pullback';
    defaultTh = 'ราคาย่อตัวลึก -3% ถึง -6% ใกล้โซนแนวรับใหญ่';
  } else if (d150 < -6) {
    defaultBadge = 'Approaching Bedrock';
    defaultTh = 'ราคากำลังทิ้งตัวลงหาแนวรับหินผา EMA 200';
  }

  return {
    scenario: 13,
    traffic_light: 'WAIT',
    badge: defaultBadge,
    distEma50: d50,
    distEma150: d150,
    distEma200: d200,
    regime,
    volRatio,
    reason: `Price healthy (${d150 > 0 ? '+' : ''}${d150}% vs EMA150, Regime: ${regime}). Waiting for high-probability setup.`,
    reason_th: defaultTh,
    checklist: { regimePass: regime !== 'BEAR', distPass: true, bankerPass: banker > 0, rsiPass: true, candlePass: isLatestBullish, volumePass: true },
    signals_checklist: [
      { label: 'EMA Regime', pass: regime !== 'BEAR', value: regime },
      { label: 'Dist EMA 150', pass: true, value: `${d150 >= 0 ? '+' : ''}${d150}%` },
      { label: 'Dist EMA 200', pass: true, value: `${d200 >= 0 ? '+' : ''}${d200}%` },
      { label: 'Banker MCDX', pass: banker > 0, value: `${banker}/20` }
    ]
  };
}

/**
 * Backfill State Tracker
 */
const backfillState = {
  isRunning: false,
  total: 0,
  completed: 0,
  currentSymbol: '',
  errors: [],
  symbolStatus: {}
};

export function getBackfillStatus() {
  return { ...backfillState };
}

/**
 * Backfill historical data for symbols (Staggered Queue: 2 at a time, 3s delay)
 */
export async function backfillHistoricalData(symbols = [], years = 10) {
  if (backfillState.isRunning) {
    return { message: 'Backfill already in progress', status: getBackfillStatus() };
  }

  const targetSymbols = symbols.length > 0 ? symbols : DEFAULT_2X_STOCKS.map(s => s.symbol);
  backfillState.isRunning = true;
  backfillState.total = targetSymbols.length;
  backfillState.completed = 0;
  backfillState.errors = [];
  backfillState.symbolStatus = {};
  targetSymbols.forEach(s => { backfillState.symbolStatus[s] = 'PENDING'; });

  // Run in background
  (async () => {
    const today = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - years * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const batchSize = 2;
    for (let i = 0; i < targetSymbols.length; i += batchSize) {
      const batch = targetSymbols.slice(i, i + batchSize);
      await Promise.all(batch.map(async (sym) => {
        backfillState.currentSymbol = sym;
        backfillState.symbolStatus[sym] = 'FETCHING';
        try {
          const freshData = await fetchYahooHistorical(sym, fromDate, today);
          if (freshData && freshData.length > 0) {
            const insert = db.prepare(`
              INSERT OR REPLACE INTO historical_prices (symbol, date, price, open, high, low, close, volume)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const insertTx = db.transaction((items) => {
              for (const item of items) {
                insert.run(
                  sym,
                  item.date,
                  item.price,
                  item.open ?? item.price,
                  item.high ?? item.price,
                  item.low ?? item.price,
                  item.close ?? item.price,
                  item.volume ?? 0
                );
              }
            });
            insertTx(freshData);
          }
          backfillState.symbolStatus[sym] = 'DONE';
          backfillState.completed++;
        } catch (err) {
          console.error(`[backfill] Error on ${sym}:`, err.message);
          backfillState.symbolStatus[sym] = 'ERROR';
          backfillState.errors.push({ symbol: sym, error: err.message });
          backfillState.completed++;
        }
      }));

      if (i + batchSize < targetSymbols.length) {
        await new Promise(res => setTimeout(res, 3000));
      }
    }
    backfillState.isRunning = false;
    backfillState.currentSymbol = '';
  })().catch(err => {
    console.error('[backfill] Fatal error:', err);
    backfillState.isRunning = false;
  });

  return { message: 'Backfill started', status: getBackfillStatus() };
}

/**
 * Fetch or get cached Fundamentals from SQLite
 */
export async function getOrFetchFundamentals(symbol) {
  if (!symbol || symbol === 'CASH') return null;
  const upper = symbol.toUpperCase();
  const row = db.prepare('SELECT * FROM project2x_fundamentals WHERE symbol = ?').get(upper);

  // If cached within 3 days and has PE, use cache
  if (row && row.updated_at) {
    const ageMs = Date.now() - new Date(row.updated_at).getTime();
    if (ageMs < 3 * 24 * 60 * 60 * 1000 && row.pe_trailing !== null) {
      return row;
    }
  }

  // Fetch live from Yahoo
  try {
    const live = await fetchYahooFundamentals(upper);
    if (live) {
      const existing = row || {};
      const expectedCagr = existing.expected_cagr_3y !== undefined && existing.expected_cagr_3y !== null
        ? existing.expected_cagr_3y
        : 26.0;
      const epsQs = live.consecutive_eps_qs ?? existing.consecutive_eps_qs ?? 0;

      db.prepare(`
        INSERT INTO project2x_fundamentals (
          symbol, pe_trailing, pe_forward, peg_ratio, revenue_cagr_3y, eps_cagr_3y, expected_cagr_3y, consecutive_eps_qs, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(symbol) DO UPDATE SET
          pe_trailing = excluded.pe_trailing,
          pe_forward = excluded.pe_forward,
          peg_ratio = excluded.peg_ratio,
          revenue_cagr_3y = excluded.revenue_cagr_3y,
          eps_cagr_3y = excluded.eps_cagr_3y,
          consecutive_eps_qs = excluded.consecutive_eps_qs,
          updated_at = datetime('now')
      `).run(
        upper,
        live.pe_trailing,
        live.pe_forward,
        live.peg_ratio,
        live.revenue_growth,
        live.earnings_growth,
        expectedCagr,
        epsQs
      );
      return db.prepare('SELECT * FROM project2x_fundamentals WHERE symbol = ?').get(upper);
    }
  } catch (err) {
    console.warn(`[getOrFetchFundamentals] Live fetch error for ${upper}:`, err.message);
  }

  return row;
}

/**
 * Update Manual Overrides for Stock Fundamentals
 */
export function updateFundamentalsOverride(symbol, { expected_cagr_3y, consecutive_eps_qs }) {
  if (!symbol) return null;
  const upper = symbol.toUpperCase();
  const existing = db.prepare('SELECT * FROM project2x_fundamentals WHERE symbol = ?').get(upper);

  const expectedCagr = expected_cagr_3y !== undefined ? Number(expected_cagr_3y) : (existing?.expected_cagr_3y ?? 26.0);
  const epsQs = consecutive_eps_qs !== undefined ? Number(consecutive_eps_qs) : (existing?.consecutive_eps_qs ?? 0);

  db.prepare(`
    INSERT INTO project2x_fundamentals (symbol, expected_cagr_3y, consecutive_eps_qs, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(symbol) DO UPDATE SET
      expected_cagr_3y = excluded.expected_cagr_3y,
      consecutive_eps_qs = excluded.consecutive_eps_qs,
      updated_at = datetime('now')
  `).run(upper, expectedCagr, epsQs);

  return db.prepare('SELECT * FROM project2x_fundamentals WHERE symbol = ?').get(upper);
}

export function getAllFundamentals() {
  return db.prepare('SELECT * FROM project2x_fundamentals ORDER BY symbol ASC').all();
}

/**
 * Scan all Project 2X stocks and generate Radar Matrix + Sell Alerts
 */
export async function scanRadarMatrix(portfolioId) {
  const config = getOrCreateConfig(portfolioId);
  const quotas = await syncShareQuotas(portfolioId);
  const { holdings, cash } = getPortfolioHoldings(portfolioId);

  const stockMarketValues = {};
  const radarRows = [];
  const sellAlerts = [];

  for (const q of quotas) {
    const symbol = q.symbol;
    const candles = await syncCandleDelta(symbol, 400);

    // Fetch all cached historical candles from DB to support full timeframe zoom & accurate EMA convergence (up to 10Y)
    const dbCandles = db.prepare(`
      SELECT date, price, open, high, low, close, volume 
      FROM historical_prices 
      WHERE symbol = ? 
      ORDER BY date ASC
    `).all(symbol);

    const candleSeries = dbCandles.length >= 50 ? dbCandles : candles;
    if (candleSeries.length < 50) {
      continue;
    }

    const sparkCloses = candleSeries.map(c => c.price);
    const sparkDates = candleSeries.map(c => c.date);
    const sparkOpens = candleSeries.map(c => c.open ?? c.price);
    const sparkHighs = candleSeries.map(c => c.high ?? c.price);
    const sparkLows = candleSeries.map(c => c.low ?? c.price);
    const sparkVolumes = candleSeries.map(c => c.volume ?? 0);

    const currentPrice = sparkCloses[sparkCloses.length - 1];

    // Compute EMAs on the full historical series (2,500+ bars) for mathematical convergence identical to chart
    const ema50Series = calcEMASeries(sparkCloses, 50);
    const ema150Series = calcEMASeries(sparkCloses, 150);
    const ema200Series = calcEMASeries(sparkCloses, 200);

    const ema50 = ema50Series[ema50Series.length - 1] !== null ? Number(ema50Series[ema50Series.length - 1].toFixed(2)) : null;
    const ema150 = ema150Series[ema150Series.length - 1] !== null ? Number(ema150Series[ema150Series.length - 1].toFixed(2)) : null;
    const ema200 = ema200Series[ema200Series.length - 1] !== null ? Number(ema200Series[ema200Series.length - 1].toFixed(2)) : null;

    const banker = calcBankerMCDX(sparkCloses);
    const rsi14 = calcRSI(sparkCloses, 14);

    const distEma50 = ema50 ? Number((((currentPrice - ema50) / ema50) * 100).toFixed(2)) : 0;
    const distEma150 = ema150 ? Number((((currentPrice - ema150) / ema150) * 100).toFixed(2)) : 0;
    const distEma200 = ema200 ? Number((((currentPrice - ema200) / ema200) * 100).toFixed(2)) : 0;

    // Detect EMA alignment regime
    const isBullRegime = (ema50 && ema150 && ema200 && ema50 > ema150 && ema150 > ema200);
    const isNeutralRegime = (ema50 && ema200 && ema50 > ema200 && !isBullRegime);
    const regime = isBullRegime ? 'BULL' : (isNeutralRegime ? 'NEUTRAL' : 'BEAR');

    // Calculate 20-Day SMA Volume Ratio
    const volLookback = Math.min(20, sparkVolumes.length - 1);
    let avg20dVol = 0;
    if (volLookback > 0) {
      let volSum = 0;
      for (let i = sparkVolumes.length - 1 - volLookback; i < sparkVolumes.length - 1; i++) {
        volSum += sparkVolumes[i] || 0;
      }
      avg20dVol = volSum / volLookback;
    }
    const lastVol = sparkVolumes[sparkVolumes.length - 1] || 0;
    const volRatio = avg20dVol > 0 ? Number((lastVol / avg20dVol).toFixed(2)) : 1.0;

    // Detect latest price action & consecutive red bars
    const lastBar = candleSeries[candleSeries.length - 1];
    const isLatestBullish = (lastBar.close >= (lastBar.open ?? lastBar.close));
    let consecutiveRedBars = 0;
    for (let i = candleSeries.length - 1; i >= 0; i--) {
      const bar = candleSeries[i];
      const barOpen = bar.open ?? bar.close;
      if (bar.close < barOpen) {
        consecutiveRedBars++;
      } else {
        break;
      }
    }

    // Calculate MCDX on full series for 100% historical depth
    const mcdxData = calcMcdxSeries(sparkCloses);

    // Lookback Metrics
    const n = sparkCloses.length;

    // 1. Days near EMA 200 (-3.5% to +3.5%)
    let daysNearEma200 = 0;
    for (let i = n - 1; i >= 0; i--) {
      const e200 = ema200Series[i];
      if (!e200) break;
      const d = ((sparkCloses[i] - e200) / e200) * 100;
      if (d >= -3.5 && d <= 3.5) {
        daysNearEma200++;
      } else {
        break;
      }
    }

    // 2. Days below EMA 200
    let daysBelowEma200 = 0;
    for (let i = n - 1; i >= 0; i--) {
      const e200 = ema200Series[i];
      if (!e200) break;
      if (sparkCloses[i] < e200) {
        daysBelowEma200++;
      } else {
        break;
      }
    }

    // 3. Days Banker is 0
    let daysBankerZero = 0;
    const bankerArr = mcdxData.banker || [];
    for (let i = bankerArr.length - 1; i >= 0; i--) {
      if (bankerArr[i] === 0) {
        daysBankerZero++;
      } else {
        break;
      }
    }

    // 4. Bear Trap Reclaim: plunged < -4% in past 2-8 bars, and closed > EMA200 for 2 consecutive bars
    let hadBearTrapDip = false;
    for (let i = Math.max(0, n - 8); i < n - 2; i++) {
      const e200 = ema200Series[i];
      if (e200 && ((sparkCloses[i] - e200) / e200) * 100 < -4) {
        hadBearTrapDip = true;
        break;
      }
    }
    const isNowAboveEma200_2Days = n >= 2 && 
      sparkCloses[n - 1] >= (ema200Series[n - 1] || 0) && 
      sparkCloses[n - 2] >= (ema200Series[n - 2] || 0);
    const isBearTrapReclaimed = hadBearTrapDip && isNowAboveEma200_2Days;

    // 5. Double Bottom Confirmed: Retest of EMA 200 in 15-45 bars
    let isDoubleBottomConfirmed = false;
    let prevDipLow = null;
    let hadBounceBetween = false;
    const isCurrentAtEma200 = distEma200 >= -3.5 && distEma200 <= 2.0;

    if (isCurrentAtEma200 && n >= 45) {
      for (let i = n - 45; i <= n - 12; i++) {
        const e200_i = ema200Series[i];
        if (!e200_i) continue;
        const dist_i = ((sparkCloses[i] - e200_i) / e200_i) * 100;
        if (dist_i >= -4.0 && dist_i <= 2.0) {
          const firstBottomLow = sparkLows[i];
          for (let j = i + 1; j < n - 3; j++) {
            const e200_j = ema200Series[j];
            if (e200_j && ((sparkCloses[j] - e200_j) / e200_j) * 100 >= 3.0) {
              hadBounceBetween = true;
              break;
            }
          }
          if (hadBounceBetween) {
            prevDipLow = firstBottomLow;
            break;
          }
        }
      }

      if (hadBounceBetween && prevDipLow !== null) {
        const currentRecentLow = Math.min(...sparkLows.slice(-3));
        if (currentRecentLow >= prevDipLow * 0.985 && isLatestBullish && banker >= 1) {
          isDoubleBottomConfirmed = true;
        }
      }
    }

    // 6. Base Breakout
    let isBaseBreakout = false;
    if (n >= 12 && isLatestBullish && volRatio >= 1.4) {
      const baseHighs = sparkHighs.slice(n - 10, n - 2);
      const baseLows = sparkLows.slice(n - 10, n - 2);
      const maxBaseHigh = Math.max(...baseHighs);
      const minBaseLow = Math.min(...baseLows);
      const baseSpread = minBaseLow > 0 ? (maxBaseHigh - minBaseLow) / minBaseLow : 1;

      if (baseSpread < 0.08 && currentPrice > maxBaseHigh && banker >= 3 && (rsi14 ? rsi14 >= 50 && rsi14 <= 74 : true)) {
        isBaseBreakout = true;
      }
    }

    // 7. Regime Flip (Golden Cross EMA 50 > EMA 200 in last 5 bars)
    let isRegimeFlip = false;
    if (n >= 10 && ema50Series[n - 1] && ema200Series[n - 1]) {
      const isNowAbove = ema50Series[n - 1] >= ema200Series[n - 1];
      const wasBelow = (ema50Series[n - 5] || 0) < (ema200Series[n - 5] || 0);
      if (isNowAbove && wasBelow && currentPrice > ema50 && currentPrice > ema200) {
        isRegimeFlip = true;
      }
    }

    // 8. 52-Week High & Drawdown
    const past252Closes = sparkCloses.slice(-252);
    const high52W = past252Closes.length > 0 ? Math.max(...past252Closes) : currentPrice;
    const drawdownFrom52W = high52W > 0 ? Number((((currentPrice - high52W) / high52W) * 100).toFixed(1)) : 0;

    const classification = classifyScenario({
      currentPrice,
      ema50,
      ema150,
      ema200,
      distEma50,
      distEma150,
      distEma200,
      banker,
      rsi14,
      isLatestBullish,
      consecutiveRedBars,
      volRatio,
      regime,
      daysNearEma200,
      daysBelowEma200,
      daysBankerZero,
      isBearTrapReclaimed,
      isDoubleBottomConfirmed,
      isBaseBreakout,
      isRegimeFlip,
      category: q.category
    });

    const ownedShares = q.owned_shares || 0;
    const marketValueUsd = ownedShares * currentPrice;
    stockMarketValues[symbol] = marketValueUsd;

    radarRows.push({
      symbol,
      category: q.category,
      target_percent: q.target_percent,
      currentPrice,
      ema50,
      ema150,
      ema200,
      distEma50,
      distEma150,
      distEma200,
      banker,
      rsi14,
      regime,
      volRatio,
      high52W,
      drawdownFrom52W,
      scenario: classification.scenario,
      traffic_light: classification.traffic_light,
      badge: classification.badge,
      reason: classification.reason,
      reason_th: classification.reason_th,
      checklist: classification.checklist,
      signals_checklist: classification.signals_checklist,
      sparkline: {
        dates: sparkDates,
        closes: sparkCloses,
        opens: sparkOpens,
        highs: sparkHighs,
        lows: sparkLows,
        volumes: sparkVolumes,
        ema50: ema50Series,
        ema150: ema150Series,
        ema200: ema200Series,
        bankerSeries: mcdxData.banker,
        hotMoneySeries: mcdxData.hotMoney,
        retailSeries: mcdxData.retail,
        bankerMaSeries: mcdxData.bankerMa
      },
      owned_shares: ownedShares,
      target_shares: q.target_shares,
      progress_percent: q.progress_percent,
      status: q.status
    });
  }

  // Calculate true total portfolio market value (ALL held securities + actual cash)
  // FIX: stockMarketValues[sym] is already (shares * price). Do NOT multiply shares again!
  let totalSecuritiesUsd = 0;
  for (const sym in holdings) {
    if (holdings[sym].shares > 0.001) {
      if (stockMarketValues[sym] !== undefined) {
        totalSecuritiesUsd += stockMarketValues[sym];
      } else {
        try {
          const latest = await fetchYahooLatest(sym);
          const curPrice = latest?.price || 0;
          const val = holdings[sym].shares * curPrice;
          stockMarketValues[sym] = val;
          totalSecuritiesUsd += val;
        } catch (e) {}
      }
    }
  }
  const totalPortfolioUsd = Number((totalSecuritiesUsd + cash).toFixed(2));

  // Attach weights and fundamentals to each row
  for (const row of radarRows) {
    const val = stockMarketValues[row.symbol] || 0;
    row.market_value_usd = Number(val.toFixed(2));
    row.weight_pct = totalPortfolioUsd > 0 ? Number(((val / totalPortfolioUsd) * 100).toFixed(1)) : 0;

    try {
      const fund = await getOrFetchFundamentals(row.symbol);
      row.pe_trailing = fund?.pe_trailing ?? null;
      row.pe_forward = fund?.pe_forward ?? null;
      row.peg_ratio = fund?.peg_ratio ?? null;
      row.expected_cagr = fund?.expected_cagr_3y ?? 26.0;
      row.consecutive_eps_qs = fund?.consecutive_eps_qs ?? 0;
    } catch (e) {
      row.pe_trailing = null;
      row.pe_forward = null;
      row.peg_ratio = null;
      row.expected_cagr = 26.0;
      row.consecutive_eps_qs = 0;
    }
  }

  // 5-Layer Sell Signal Detection
  const ceilingPct = config.max_stock_ceiling_pct || 30;

  for (const row of radarRows) {
    const val = stockMarketValues[row.symbol] || 0;
    const weightInPort = totalPortfolioUsd > 0 ? (val / totalPortfolioUsd) * 100 : 0;

    // Layer 1: Core Ceiling Breach
    if (weightInPort > ceilingPct && row.owned_shares > 0) {
      const excessUsd = val - (totalPortfolioUsd * 0.25);
      const excessShares = Number((excessUsd / row.currentPrice).toFixed(4));
      sellAlerts.push({
        symbol: row.symbol,
        layer: 'Core Ceiling Breach',
        severity: 'HIGH',
        message: `${row.symbol} weight is ${weightInPort.toFixed(1)}% (exceeds ${ceilingPct}% limit). Trim ${excessShares} shares (~$${excessUsd.toFixed(2)}) back to 25%.`,
        message_th: `${row.symbol} บวมเกินเพดาน ${weightInPort.toFixed(1)}% (เกินลิมิต ${ceilingPct}%) — แนะนำทยอยขายทำกำไร ${excessShares} หุ้น (~$${excessUsd.toFixed(2)}) เพื่อดึงสัดส่วนกลับมาที่ 25%`
      });
    }

    // Layer 2: Moonshot Rules (Free-ride or Breakdown)
    if (row.category === 'Moonshot' && row.owned_shares > 0) {
      const avgCost = holdings[row.symbol]?.totalCost ? holdings[row.symbol].totalCost / row.owned_shares : row.currentPrice;
      const gainPct = avgCost > 0 ? ((row.currentPrice - avgCost) / avgCost) * 100 : 0;

      if (gainPct >= 100) {
        const halfShares = Number((row.owned_shares / 2).toFixed(4));
        sellAlerts.push({
          symbol: row.symbol,
          layer: 'Moonshot Free-Ride',
          severity: 'PROFIT_TAKE',
          message: `${row.symbol} has gained +${gainPct.toFixed(1)}%! Sell ${halfShares} shares (50%) to lock in your initial capital and ride 100% free money!`,
          message_th: `${row.symbol} ฟันกำไร +${gainPct.toFixed(1)}% (เด้งแล้ว!) — ขาย 50% (${halfShares} หุ้น) ดึงทุนคืน ปล่อยกำไรวิ่งกินฟรีไร้ความเสี่ยง!`
        });
      } else if (row.distEma150 < -5 && row.banker === 0) {
        sellAlerts.push({
          symbol: row.symbol,
          layer: 'Moonshot Trend Breakdown',
          severity: 'STOP_LOSS',
          message: `${row.symbol} broke down below EMA 150 (${row.distEma150}%) with 0 Banker. Cut loss / Protect capital.`,
          message_th: `${row.symbol} หลุดเส้น EMA 150 (${row.distEma150}%) สถาบันทิ้งไพ่หนีตาย — ตัดขาดทุนรักษาเงินต้นทันที`
        });
      }
    }

    // Layer 4: [NEW] Core Trend Breakdown Alert (Stop Loss for Core Commanders)
    if (row.category === 'Core' && row.owned_shares > 0) {
      if (row.distEma200 < -8 && row.banker === 0) {
        sellAlerts.push({
          symbol: row.symbol,
          layer: 'Core Trend Breakdown',
          severity: 'STOP_LOSS',
          message: `Core Commander ${row.symbol} broke down below EMA 200 (${row.distEma200}%) with 0 Banker. Cut loss or hedge immediately!`,
          message_th: `แม่ทัพหลัก ${row.symbol} หลุดแนวรับเส้น EMA 200 ลึก (${row.distEma200}%) สถาบันหนีตายหมด (Banker = 0) — พิจารณาลดพอร์ตหรือตัดขาดทุนรักษาเงินต้นทันที!`
        });
      }
    }

    // Layer 5: [NEW] Trailing Drawdown Warning (> -25% from 52W High)
    if (row.owned_shares > 0 && row.drawdownFrom52W !== undefined && row.drawdownFrom52W <= -25) {
      sellAlerts.push({
        symbol: row.symbol,
        layer: 'Trailing Drawdown',
        severity: 'WARNING',
        message: `${row.symbol} has dropped ${row.drawdownFrom52W}% from its 52W High ($${row.high52W}). Monitor long-term structural trend.`,
        message_th: `${row.symbol} ย่อตัวลงมาลึก (${row.drawdownFrom52W}% จากจุดสูงสุด 52W $${row.high52W}) — เฝ้าระวังโครงสร้างเทรนด์ใหญ่`
      });
    }
  }

  // Layer 3: Orphan Holdings Detection (Held stocks not in Quota with real shares > 0.001)
  const quotaSymbols = new Set(radarRows.map(r => r.symbol));
  quotaSymbols.add('CASH');

  for (const sym in holdings) {
    if (!quotaSymbols.has(sym) && holdings[sym].shares > 0.001) {
      let curPrice = 1;
      try {
        const latest = await fetchYahooLatest(sym);
        if (latest?.price) curPrice = latest.price;
      } catch (e) {}

      const val = holdings[sym].shares * curPrice;
      sellAlerts.push({
        symbol: sym,
        layer: 'Orphan Harvest',
        severity: 'CLEANUP',
        message: `Orphan holding: ${holdings[sym].shares.toFixed(4)} shares of ${sym} (~$${val.toFixed(2)}). Harvest and reallocate to Core Commanders.`,
        message_th: `หุ้นนอกแผนแม่ทัพ: ${sym} จำนวน ${holdings[sym].shares.toFixed(4)} หุ้น (~$${val.toFixed(2)}) — ทยอยขายทำกำไรดึงเงินสดกลับมาเติมทัพหลวง 12 ตัว`
      });
    }
  }

  return {
    rows: radarRows,
    sellAlerts,
    totalPortfolioUsd,
    cashUsd: cash
  };
}

/**
 * Dynamic ETA Calculator with Confidence Bands (Conservative, Base, Bull, Auto)
 */
export function calculateDynamicETA({ currentValThb, goalValThb, monthlyInflowThb, targetCagr, autoCagr }) {
  const bands = [
    { name: 'Conservative', cagr: 0.20 },
    { name: 'Base', cagr: targetCagr || 0.26 },
    { name: 'Bull', cagr: 0.32 }
  ];

  if (autoCagr !== undefined && autoCagr !== null && !isNaN(autoCagr)) {
    const safeAutoCagr = Math.max(0.05, Math.min(2.0, autoCagr));
    bands.unshift({ name: 'Auto', cagr: safeAutoCagr });
  }

  const results = {};

  for (const band of bands) {
    if (currentValThb >= goalValThb) {
      results[band.name] = {
        months: 0,
        years: 0,
        targetDate: 'GOAL ACHIEVED! 🏆',
        cagr: band.cagr
      };
      continue;
    }

    const r = band.cagr / 12;
    const pmt = monthlyInflowThb || 35000;
    const fv = goalValThb || 10000000;
    const pv = currentValThb || 0;

    // Formula: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
    // => (1+r)^n * (PV + PMT/r) = FV + PMT/r
    // => n = ln((FV + PMT/r) / (PV + PMT/r)) / ln(1+r)
    const numerator = fv + (pmt / r);
    const denominator = pv + (pmt / r);
    const n = Math.log(numerator / denominator) / Math.log(1 + r);

    const totalMonths = Math.max(1, Math.round(n));
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + totalMonths);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${monthNames[futureDate.getMonth()]} ${futureDate.getFullYear()}`;

    results[band.name] = {
      months: totalMonths,
      years: Number((totalMonths / 12).toFixed(1)),
      targetDate: dateStr,
      cagr: band.cagr
    };
  }

  return results;
}

/**
 * Auto-detect actual monthly inflow from deposit/withdraw transactions
 */
export function detectActualMonthlyInflow(portfolioId) {
  try {
    const txs = db.prepare(`
      SELECT date, type, amount FROM transactions 
      WHERE portfolio_id = ? AND type IN ('DEPOSIT', 'WITHDRAW')
      ORDER BY date ASC
    `).all(portfolioId);

    if (!txs || txs.length === 0) {
      return { avg_monthly_usd: null, months_counted: 0 };
    }

    const monthTotals = {};
    for (const t of txs) {
      if (!t.date) continue;
      const ym = String(t.date).substring(0, 7);
      const net = (t.type === 'DEPOSIT' ? 1 : -1) * (Number(t.amount) || 0);
      monthTotals[ym] = (monthTotals[ym] || 0) + net;
    }

    const months = Object.keys(monthTotals);
    if (months.length === 0) {
      return { avg_monthly_usd: null, months_counted: 0 };
    }

    const recentMonths = months.slice(-6);
    const sumUsd = recentMonths.reduce((acc, m) => acc + monthTotals[m], 0);
    const avgMonthlyUsd = Math.max(0, sumUsd / recentMonths.length);

    return {
      avg_monthly_usd: Number(avgMonthlyUsd.toFixed(2)),
      months_counted: recentMonths.length,
      sample_months: recentMonths
    };
  } catch (err) {
    console.error('[project2x] Error detecting monthly inflow:', err.message);
    return { avg_monthly_usd: null, months_counted: 0 };
  }
}

/**
 * Dual-Engine Auto CAGR (Historical MWRR + Safety Guard + Forward Holdings CAGR)
 */
export function calculatePortfolioRealizedCAGR(portfolioId, currentValUsd, radarRows = []) {
  try {
    const txs = db.prepare(`
      SELECT date, type, amount, price, fee FROM transactions 
      WHERE portfolio_id = ?
      ORDER BY date ASC
    `).all(portfolioId);

    if (!txs || txs.length === 0 || !currentValUsd || currentValUsd <= 0) {
      return null;
    }

    const firstDateStr = txs[0].date;
    if (!firstDateStr) return null;

    const startDate = new Date(firstDateStr);
    const now = new Date();
    const diffDays = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const diffYears = Math.max(0.08, diffDays / 365.25);

    let netDeposits = 0;
    for (const t of txs) {
      if (t.type === 'DEPOSIT') {
        netDeposits += Number(t.amount) || 0;
      } else if (t.type === 'WITHDRAW') {
        netDeposits -= Number(t.amount) || 0;
      }
    }

    if (netDeposits <= 10) {
      let totalCost = 0;
      for (const t of txs) {
        if (t.type === 'BUY') {
          totalCost += (Number(t.amount) * Number(t.price)) + (Number(t.fee) || 0);
        } else if (t.type === 'SELL') {
          totalCost -= (Number(t.amount) * Number(t.price));
        }
      }
      netDeposits = Math.max(10, totalCost);
    }

    // 6-Month Safety Guard
    const isYoung = diffDays < 180;
    const rawReturnMultiple = currentValUsd / netDeposits;
    const rawReturnPct = Number(((rawReturnMultiple - 1) * 100).toFixed(1));

    let cagr = 0;
    let cagr_pct = 0;
    let label = '';

    if (isYoung) {
      // Show raw return without aggressive compounding
      cagr = rawReturnPct / 100;
      cagr_pct = rawReturnPct;
      label = `Auto CAGR: ${rawReturnPct >= 0 ? '+' : ''}${rawReturnPct}% (raw return • ${Math.round(diffDays / 30 * 10) / 10} mo)`;
    } else {
      // Annualized MWRR
      if (rawReturnMultiple > 0) {
        cagr = Math.pow(rawReturnMultiple, 1 / diffYears) - 1;
        cagr = Math.max(-0.9, Math.min(3.0, cagr));
        cagr_pct = Number((cagr * 100).toFixed(1));
        label = `Auto CAGR: ${cagr_pct}% (annualized • ${diffYears.toFixed(1)} yrs)`;
      }
    }

    // Dimension 2: Forward CAGR of current holdings
    let forwardWeightedCagr = 0;
    let totalWeight = 0;
    if (radarRows && radarRows.length > 0) {
      for (const row of radarRows) {
        const wt = row.weight_pct || 0;
        const exp = row.expected_cagr || 26.0;
        forwardWeightedCagr += (wt * exp);
        totalWeight += wt;
      }
      if (totalWeight > 0) {
        forwardWeightedCagr = Number((forwardWeightedCagr / totalWeight).toFixed(1));
      } else {
        forwardWeightedCagr = 26.0;
      }
    } else {
      forwardWeightedCagr = 26.0;
    }

    return {
      cagr: Number(cagr.toFixed(4)),
      cagr_pct,
      years_investing: Number(diffYears.toFixed(1)),
      days_investing: Math.round(diffDays),
      net_invested_usd: Number(netDeposits.toFixed(2)),
      is_young: isYoung,
      display_label: label,
      forward_holdings_cagr: forwardWeightedCagr
    };
  } catch (err) {
    console.error('[project2x] Error calculating realized CAGR:', err.message);
    return null;
  }
}

/**
 * Dynamic Yearly Milestones (Level 1 to Level 5) with RPG Progression Details
 */
export function calculateYearlyMilestones({ currentValThb, goalValThb, monthlyInflowThb, targetCagr, targetYears = 5, fxRate = 35.0 }) {
  const r = (targetCagr || 0.26) / 12;
  const pmt = monthlyInflowThb || 35000;
  const pv = currentValThb || 0;
  const years = Math.max(1, targetYears || 5);

  const levels = [
    { level: 1, icon: '🥚', name: 'Baby Sprout', thTitle: 'เมล็ดพันธุ์ก้าวแรก' },
    { level: 2, icon: '🐣', name: 'Sky Falcon', thTitle: 'เหยี่ยวเวหาติดปีก' },
    { level: 3, icon: '🦊', name: 'Cyber Fox', thTitle: 'จิ้งจอกสายฟ้าทบต้น' },
    { level: 4, icon: '🐉', name: 'Star Dragon', thTitle: 'มังกรทะยานฟ้า' },
    { level: 5, icon: '👑', name: 'Titan King', thTitle: 'ราชาพอร์ตสิบล้าน' },
  ];

  const milestones = [];
  let prevTargetThb = 0;
  let prevTargetUsd = 0;

  for (let year = 1; year <= years; year++) {
    const n = year * 12;
    const fv = pv * Math.pow(1 + r, n) + pmt * (Math.pow(1 + r, n) - 1) / r;
    const targetThb = year === years ? goalValThb : Math.round(Math.min(fv, goalValThb));
    const targetUsd = Math.round(targetThb / fxRate);

    const info = levels[year - 1] || { level: year, icon: '⭐', name: `Level ${year}`, thTitle: `ด่านที่ ${year}` };

    const isUnlocked = currentValThb >= targetThb;
    const spanThb = Math.max(1, targetThb - prevTargetThb);
    const progressInLevel = isUnlocked
      ? 100
      : Math.max(0, Math.min(100, ((currentValThb - prevTargetThb) / spanThb) * 100));

    const remainingToEvolveThb = Math.max(0, targetThb - currentValThb);
    const remainingToEvolveUsd = Math.round(remainingToEvolveThb / fxRate);

    milestones.push({
      year,
      ...info,
      target_thb: targetThb,
      target_usd: targetUsd,
      prev_target_thb: prevTargetThb,
      prev_target_usd: prevTargetUsd,
      progress_in_level: Number(progressInLevel.toFixed(1)),
      remaining_to_evolve_thb: remainingToEvolveThb,
      remaining_to_evolve_usd: remainingToEvolveUsd,
      is_unlocked: isUnlocked,
      is_current: false
    });

    prevTargetThb = targetThb;
    prevTargetUsd = targetUsd;
  }

  let foundCurrent = false;
  for (let i = 0; i < milestones.length; i++) {
    if (!milestones[i].is_unlocked && !foundCurrent) {
      milestones[i].is_current = true;
      foundCurrent = true;
    }
  }
  if (!foundCurrent && milestones.length > 0) {
    milestones[milestones.length - 1].is_current = true;
  }

  return milestones;
}

/**
 * Master HUD Aggregator
 */
export async function getDashboardData(portfolioId) {
  const config = getOrCreateConfig(portfolioId);
  const fxObj = await fetchYahooExchangeRate('USD', 'THB');
  const fxRate = fxObj?.rate || 35.0;

  const radar = await scanRadarMatrix(portfolioId);
  const totalValUsd = radar.totalPortfolioUsd;
  const totalValThb = totalValUsd * fxRate;
  const goalThb = config.goal_amount_thb || 10000000;

  const progressPercent = Number(Math.min(100, (totalValThb / goalThb) * 100).toFixed(1));

  const autoInflow = detectActualMonthlyInflow(portfolioId);
  const autoInflowThb = autoInflow.avg_monthly_usd ? Math.round(autoInflow.avg_monthly_usd * fxRate) : null;
  const realizedCagr = calculatePortfolioRealizedCAGR(portfolioId, totalValUsd, radar.rows);

  const autoCagrVal = realizedCagr?.cagr_pct ? (realizedCagr.cagr_pct / 100) : config.target_cagr;
  const eta = calculateDynamicETA({
    currentValThb: totalValThb,
    goalValThb: goalThb,
    monthlyInflowThb: config.monthly_inflow_thb,
    targetCagr: config.target_cagr,
    autoCagr: autoCagrVal
  });

  const effectiveCagr = config.target_cagr || 0.26;
  const milestones = calculateYearlyMilestones({
    currentValThb: totalValThb,
    goalValThb: goalThb,
    monthlyInflowThb: config.monthly_inflow_thb,
    targetCagr: effectiveCagr,
    targetYears: config.target_years || 5,
    fxRate
  });

  return {
    portfolio_id: portfolioId,
    total_val_thb: Number(totalValThb.toFixed(0)),
    total_val_usd: Number(totalValUsd.toFixed(2)),
    goal_val_thb: goalThb,
    progress_percent: progressPercent,
    fx_rate: fxRate,
    monthly_inflow_thb: config.monthly_inflow_thb,
    auto_inflow_thb: autoInflowThb,
    auto_inflow_usd: autoInflow.avg_monthly_usd,
    realized_cagr: realizedCagr,
    milestones,
    dime_cash_usd: radar.cashUsd,
    eta,
    active_sell_alerts_count: radar.sellAlerts.length,
    updated_at: new Date().toISOString()
  };
}

/**
 * Dime Fractional Inflow Allocator
 */
export async function recommendInflowAllocation(portfolioId, amountThb) {
  const config = getOrCreateConfig(portfolioId);
  const fxObj = await fetchYahooExchangeRate('USD', 'THB');
  const fxRate = fxObj?.rate || 35.0;

  const amountUsd = Number((amountThb / fxRate).toFixed(2));
  const radar = await scanRadarMatrix(portfolioId);

  // Filter quota stocks that have NOT locked
  const unlocked = radar.rows.filter(r => r.status !== 'LOCKED');

  // Priority 1: Golden Setup (Scenario 1)
  const goldenCandidates = unlocked.filter(r => r.scenario === 1);

  // Priority 2: Early Bird (Scenario 2)
  const earlyCandidates = unlocked.filter(r => r.scenario === 2 && r.traffic_light === 'BUY_ZONE');

  if (goldenCandidates.length > 0) {
    // Sort by emptiest card first (lowest progress)
    goldenCandidates.sort((a, b) => a.progress_percent - b.progress_percent);
    const pick = goldenCandidates[0];

    const sharesToBuy = Number((amountUsd / pick.currentPrice).toFixed(4));
    const newOwned = Number((pick.owned_shares + sharesToBuy).toFixed(4));
    const newProgress = Number(((newOwned / pick.target_shares) * 100).toFixed(1));

    return {
      type: 'GOLDEN_SETUP',
      symbol: pick.symbol,
      shares_to_buy: sharesToBuy,
      price_per_share: pick.currentPrice,
      total_usd: amountUsd,
      total_thb: amountThb,
      current_owned_shares: pick.owned_shares,
      target_shares: pick.target_shares,
      current_progress: pick.progress_percent,
      projected_progress: newProgress,
      scenario: 1,
      reason: `Golden Setup — Price is bouncing on EMA with Institutional Banker (${pick.banker}/20). Deploy 100% of inflow!`,
      reason_th: `ราคาชนเส้นแนวรับ EMA + สถาบันเริ่มเข้าซื้อ (Banker = ${pick.banker}) — จังหวะที่ดีที่สุดในรอบ สับไก 100% เต็มวงเงิน!`
    };
  }

  if (earlyCandidates.length > 0) {
    earlyCandidates.sort((a, b) => a.progress_percent - b.progress_percent);
    const pick = earlyCandidates[0];

    // 25% nibble, 75% FCD
    const buyUsd = Number((amountUsd * 0.25).toFixed(2));
    const fcdUsd = Number((amountUsd * 0.75).toFixed(2));
    const sharesToBuy = Number((buyUsd / pick.currentPrice).toFixed(4));
    const newOwned = Number((pick.owned_shares + sharesToBuy).toFixed(4));
    const newProgress = Number(((newOwned / pick.target_shares) * 100).toFixed(1));

    return {
      type: 'EARLY_BIRD',
      symbol: pick.symbol,
      shares_to_buy: sharesToBuy,
      price_per_share: pick.currentPrice,
      buy_usd: buyUsd,
      park_fcd_usd: fcdUsd,
      total_thb: amountThb,
      current_owned_shares: pick.owned_shares,
      target_shares: pick.target_shares,
      current_progress: pick.progress_percent,
      projected_progress: newProgress,
      scenario: 2,
      fcd_yield_pct: config.fcd_yield_pct,
      reason: `Early Bird — Kissing EMA support. Nibble 25% ($${buyUsd}) to lock low price, park 75% ($${fcdUsd}) in Dime! FCD.`,
      reason_th: `จูบเส้นแนวรับ EMA พอดี — กดไม้หยั่งเชิง 25% ($${buyUsd}) ดักราคาถูก และพักเงิน 75% ($${fcdUsd}) ใน Dime FCD กินดอกเบี้ย ~${config.fcd_yield_pct}%`
    };
  }

  // No Buy Zone -> Cash Sweep
  return {
    type: 'CASH_SWEEP',
    total_usd: amountUsd,
    total_thb: amountThb,
    fcd_yield_pct: config.fcd_yield_pct,
    reason: `No stocks in Buy Zone today. Park $${amountUsd} in Dime! FCD to earn ~${config.fcd_yield_pct}% APY while waiting for EMA pullback.`,
    reason_th: `ยังไม่มีหุ้นเข้าโซนช้อนซื้อวันนี้ แนะนำพักเงิน $${amountUsd} (฿${amountThb.toLocaleString()}) ใน Dime FCD กินดอกเบี้ย ~${config.fcd_yield_pct}% ต่อปี รอจังหวะย่อตัว`
  };
}
