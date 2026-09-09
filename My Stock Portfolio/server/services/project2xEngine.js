import { db } from '../db/init.js';
import { fetchYahooExchangeRate, fetchYahooLatest } from './yahoo.js';
import { calcEMA, calcEMASeries, calcBankerMCDX, calcBankerSeries, calcRSI, syncCandleDelta } from './technicalAnalysis.js';

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
  { symbol: 'RKLB', name: 'Rocket Lab', target_percent: 2.0, category: 'Moonshot' }
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
 * Calculate current holdings from transactions
 */
export function getPortfolioHoldings(portfolioId) {
  const txs = db.prepare(`
    SELECT symbol, type, amount, price, fee FROM transactions WHERE portfolio_id = ?
  `).all(portfolioId);

  const holdings = {};
  for (const t of txs) {
    const sym = t.symbol.toUpperCase();
    if (!holdings[sym]) {
      holdings[sym] = { shares: 0, totalCost: 0 };
    }
    if (t.type === 'BUY' || t.type === 'DEPOSIT' || t.type === 'DIVIDEND' || t.type === 'INTEREST') {
      holdings[sym].shares += Number(t.amount);
      holdings[sym].totalCost += (Number(t.amount) * Number(t.price)) + (Number(t.fee) || 0);
    } else if (t.type === 'SELL' || t.type === 'WITHDRAW') {
      holdings[sym].shares -= Number(t.amount);
      holdings[sym].totalCost -= (Number(t.amount) * Number(t.price));
    }
  }

  // Cleanup dust
  for (const sym in holdings) {
    if (Math.abs(holdings[sym].shares) < 0.0001) {
      holdings[sym].shares = 0;
    }
  }
  return holdings;
}

/**
 * Sync / Initialize Share Quotas for the portfolio
 */
export async function syncShareQuotas(portfolioId, forceDefault = false) {
  const config = getOrCreateConfig(portfolioId);
  const fxObj = await fetchYahooExchangeRate('USD', 'THB');
  const fxRate = fxObj?.rate || 35.0;

  const targetUsdTotal = config.goal_amount_thb / fxRate;

  // Check existing quotas
  const existing = db.prepare('SELECT * FROM project2x_share_quotas WHERE portfolio_id = ?').all(portfolioId);

  if (existing.length === 0 || forceDefault) {
    // Seed with DEFAULT_2X_STOCKS
    const insert = db.prepare(`
      INSERT OR REPLACE INTO project2x_share_quotas (
        portfolio_id, symbol, category, target_percent, base_price, split_factor, target_shares, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const stock of DEFAULT_2X_STOCKS) {
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
  const holdings = getPortfolioHoldings(portfolioId);

  const enriched = [];
  for (const q of quotas) {
    const ownedShares = holdings[q.symbol]?.shares || 0;
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
 * 5-Scenario Technical Classifier
 */
export function classifyScenario({ currentPrice, ema50, ema150, ema200, banker, rsi14 }) {
  if (!currentPrice || !ema150 || !ema200) {
    return {
      scenario: 2,
      traffic_light: 'WAIT',
      badge: 'Evaluating',
      reason: 'Insufficient technical indicators',
      reason_th: 'กำลังรอประมวลผลข้อมูลกราฟ'
    };
  }

  const distEma150 = Number((((currentPrice - ema150) / ema150) * 100).toFixed(2));
  const distEma200 = Number((((currentPrice - ema200) / ema200) * 100).toFixed(2));

  // 1. Falling Knife: Plunged below EMA 200 by > 4% with 0 Banker
  if (distEma200 < -4 && banker === 0) {
    return {
      scenario: 3,
      traffic_light: 'DANGER',
      badge: 'Falling Knife',
      distEma150,
      distEma200,
      reason: `Plunged below EMA 200 (${distEma200}%) with 0 Banker. Stand aside, do not catch falling knife!`,
      reason_th: `ราคาหลุดเส้น EMA 200 ลึก (${distEma200}%) + ไร้แรงสถาบัน (Banker = 0) — ห้ามรับมีดเด็ดขาด นั่งทับมือรอมีดปักพื้น`
    };
  }

  // 2. Dead Cat Bounce: Deep below EMA 200 (> -8%) trying a weak bounce
  if (distEma200 < -8 && banker > 0 && banker <= 6) {
    return {
      scenario: 5,
      traffic_light: 'DANGER',
      badge: 'Dead Cat Bounce',
      distEma150,
      distEma200,
      reason: `Submerged deep below EMA 200 (${distEma200}%). High risk of secondary dump.`,
      reason_th: `ราคาจมใต้เส้น EMA 200 ลึก (${distEma200}%) เด้งสั้นๆ ใต้บาดาล — อย่าผลีผลาม รอให้กลับมายืนเหนือเส้น 200 ก่อน`
    };
  }

  // 3. Golden Setup: Price touching or holding EMA 150/200 (-3% to +3%) AND Banker emerging (1 to 10)
  const isNearEma = (distEma200 >= -3 && distEma200 <= 3) || (distEma150 >= -2 && distEma150 <= 3);
  if (isNearEma && banker > 0 && banker <= 12) {
    return {
      scenario: 1,
      traffic_light: 'BUY_ZONE',
      badge: 'Golden Setup',
      distEma150,
      distEma200,
      reason: `Price at EMA 150/200 + Institutional Banker emerging (${banker}/20). Prime buy zone (Deploy 100%).`,
      reason_th: `ราคาแตะแนวรับเส้น EMA 150/200 + สถาบันเริ่มเข้าสะสม (Banker = ${banker}) — จุดช้อนซื้อที่ดีที่สุดในรอบ จัดเต็ม 100%!`
    };
  }

  // 4. Early Bird: Kissing EMA 150/200 (-4% to +3%) but Banker still at 0 (or very low), RSI oversold (< 42)
  if (isNearEma && banker === 0) {
    return {
      scenario: 2,
      traffic_light: 'BUY_ZONE',
      badge: 'Early Bird',
      distEma150,
      distEma200,
      reason: `Kissing EMA 150/200 support bottom with 0 Banker. Nibble first tranche (25%).`,
      reason_th: `ราคาจูบเส้น EMA 150/200 พอดีแต่สถาบันยังไม่คอนเฟิร์ม (Banker = 0) — กดไม้หยั่งเชิง 25% ดักราคาถูก`
    };
  }

  // 5. Overbought: Skyrocketing far above EMA 150 (> +15%) with Banker saturated (>= 15)
  if (distEma150 > 15 && banker >= 15) {
    return {
      scenario: 4,
      traffic_light: 'WAIT',
      badge: 'Overbought',
      distEma150,
      distEma200,
      reason: `Skyrocketing +${distEma150}% above EMA 150, Banker saturated (${banker}/20). Do not chase, park inflow in FCD/MMF.`,
      reason_th: `ราคาลอยฟ้าเหนือ EMA 150 (${distEma150}%) + สถาบันชนเพดาน (${banker}/20) — ห้ามไล่ราคาเด็ดขาด พักเงินใน Dime FCD กินดอกเบี้ย`
    };
  }

  // Default: In Trend / Consolidating
  return {
    scenario: distEma150 > 0 ? 4 : 2,
    traffic_light: 'WAIT',
    badge: distEma150 > 0 ? 'Consolidating' : 'Pullback',
    distEma150,
    distEma200,
    reason: `Price healthy (${distEma150 > 0 ? '+' : ''}${distEma150}% vs EMA150). Waiting for EMA pullback.`,
    reason_th: `ราคาวิ่งตามเทรนด์ปกติ (${distEma150 > 0 ? '+' : ''}${distEma150}% เทียบ EMA150) รอจังหวะย่อตัวลงมาแตะแนวรับ`
  };
}

/**
 * Scan all Project 2X stocks and generate Radar Matrix + Sell Alerts
 */
export async function scanRadarMatrix(portfolioId) {
  const config = getOrCreateConfig(portfolioId);
  const quotas = await syncShareQuotas(portfolioId);
  const holdings = getPortfolioHoldings(portfolioId);

  // Total portfolio market value in USD
  let totalPortfolioUsd = 0;
  const stockMarketValues = {};

  const radarRows = [];
  const sellAlerts = [];

  for (const q of quotas) {
    const symbol = q.symbol;
    const candles = await syncCandleDelta(symbol, 400);

    if (candles.length < 50) {
      continue;
    }

    const closes = candles.map(c => c.price);
    const currentPrice = closes[closes.length - 1];

    const ema50 = calcEMA(closes, 50);
    const ema150 = calcEMA(closes, 150);
    const ema200 = calcEMA(closes, 200);
    const banker = calcBankerMCDX(closes);
    const rsi14 = calcRSI(closes, 14);

    const distEma150 = ema150 ? Number((((currentPrice - ema150) / ema150) * 100).toFixed(2)) : 0;
    const distEma200 = ema200 ? Number((((currentPrice - ema200) / ema200) * 100).toFixed(2)) : 0;

    const classification = classifyScenario({
      currentPrice,
      ema50,
      ema150,
      ema200,
      banker,
      rsi14
    });

    // 30-day sparkline data
    const sparklineDays = 30;
    const sparkCloses = closes.slice(-sparklineDays);
    const ema150Series = calcEMASeries(closes, 150).slice(-sparklineDays);
    const ema200Series = calcEMASeries(closes, 200).slice(-sparklineDays);

    const ownedShares = q.owned_shares || 0;
    const marketValueUsd = ownedShares * currentPrice;
    stockMarketValues[symbol] = marketValueUsd;
    totalPortfolioUsd += marketValueUsd;

    radarRows.push({
      symbol,
      category: q.category,
      target_percent: q.target_percent,
      currentPrice,
      ema50,
      ema150,
      ema200,
      distEma150,
      distEma200,
      banker,
      rsi14,
      scenario: classification.scenario,
      traffic_light: classification.traffic_light,
      badge: classification.badge,
      reason: classification.reason,
      reason_th: classification.reason_th,
      sparkline: {
        closes: sparkCloses,
        ema150: ema150Series,
        ema200: ema200Series
      },
      owned_shares: ownedShares,
      target_shares: q.target_shares,
      progress_percent: q.progress_percent,
      status: q.status
    });
  }

  // Include CASH in portfolio value
  const cashShares = holdings['CASH']?.shares || 0;
  totalPortfolioUsd += cashShares;

  // 3-Layer Sell Signal Detection
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
  }

  // Layer 3: Orphan Holdings Detection (Held stocks not in Quota)
  const quotaSymbols = new Set(radarRows.map(r => r.symbol));
  quotaSymbols.add('CASH');

  for (const sym in holdings) {
    if (!quotaSymbols.has(sym) && holdings[sym].shares > 0.0001) {
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
    totalPortfolioUsd: Number(totalPortfolioUsd.toFixed(2)),
    cashUsd: Number(cashShares.toFixed(2))
  };
}

/**
 * Dynamic ETA Calculator with 3 CAGR Confidence Bands
 */
export function calculateDynamicETA({ currentValThb, goalValThb, monthlyInflowThb, targetCagr }) {
  const bands = [
    { name: 'Conservative', cagr: 0.20 },
    { name: 'Base', cagr: targetCagr || 0.26 },
    { name: 'Bull', cagr: 0.32 }
  ];

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
  const eta = calculateDynamicETA({
    currentValThb: totalValThb,
    goalValThb: goalThb,
    monthlyInflowThb: config.monthly_inflow_thb,
    targetCagr: config.target_cagr
  });

  return {
    portfolio_id: portfolioId,
    total_val_thb: Number(totalValThb.toFixed(0)),
    total_val_usd: Number(totalValUsd.toFixed(2)),
    goal_val_thb: goalThb,
    progress_percent: progressPercent,
    fx_rate: fxRate,
    monthly_inflow_thb: config.monthly_inflow_thb,
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
