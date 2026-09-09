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
  const { holdings } = getPortfolioHoldings(portfolioId);

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
export function classifyScenario({ currentPrice, ema50, ema150, ema200, banker, rsi14, isLatestBullish = true, consecutiveRedBars = 0 }) {
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

  // 3. Golden Setup: Price touching or holding EMA 150/200 (-3% to +3%) AND Banker emerging (1 to 12)
  const isNearEma = (distEma200 >= -3 && distEma200 <= 3) || (distEma150 >= -2 && distEma150 <= 3);
  if (isNearEma && banker > 0 && banker <= 12) {
    // Bullish Reversal Confirmation Guard:
    // If the stock is currently in heavy downward selloff (consecutive red bars without bounce),
    // do NOT blindly trigger Golden Setup BUY_ZONE! Instead, mark as Testing Support (WAIT).
    if (!isLatestBullish && consecutiveRedBars >= 2) {
      return {
        scenario: 2,
        traffic_light: 'WAIT',
        badge: 'Testing Support',
        distEma150,
        distEma200,
        reason: `Price is pulling back to EMA 150/200 (${distEma200 >= 0 ? '+' : ''}${distEma200}%) with Banker (${banker}/20), but red selling pressure persists (${consecutiveRedBars} red bars). Wait for a green rebound candle.`,
        reason_th: `ราคากำลังย่อลงมาหาแนวรับ EMA 150/200 (${distEma200 >= 0 ? '+' : ''}${distEma200}%) สถาบันมี (${banker}/20) แต่ยังโดนเทขายแท่งแดง (${consecutiveRedBars} แท่งติด) — รอแท่งเขียวเด้งคอนเฟิร์มก่อนเข้า!`
      };
    }

    return {
      scenario: 1,
      traffic_light: 'BUY_ZONE',
      badge: 'Golden Setup',
      distEma150,
      distEma200,
      reason: `Price at EMA 150/200 + Institutional Banker emerging (${banker}/20) + Support Holding. Prime buy zone (Deploy 100%).`,
      reason_th: `ราคายืนแนวรับเส้น EMA 150/200 + สถาบันเริ่มเข้าสะสม (Banker = ${banker}) — จุดช้อนซื้อที่ดีที่สุดในรอบ จัดเต็ม 100%!`
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

    const distEma150 = ema150 ? Number((((currentPrice - ema150) / ema150) * 100).toFixed(2)) : 0;
    const distEma200 = ema200 ? Number((((currentPrice - ema200) / ema200) * 100).toFixed(2)) : 0;

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

    const classification = classifyScenario({
      currentPrice,
      ema50,
      ema150,
      ema200,
      banker,
      rsi14,
      isLatestBullish,
      consecutiveRedBars
    });

    // Calculate MCDX on full series for 100% historical depth
    const mcdxData = calcMcdxSeries(sparkCloses);

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
