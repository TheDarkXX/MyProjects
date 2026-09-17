import { db } from '../db/init.js';
import { fetchYahooRealtimeQuote, fetchYahooLatest } from './yahoo.js';
import { getPortfolioHoldings, getOrCreateConfig } from './project2xEngine.js';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/**
 * Get comprehensive single-payload Dossier data for a specific stock
 * @param {string} portfolioId
 * @param {string} symbol
 */
export async function getDossierData(portfolioId, symbol) {
  if (!symbol) throw new Error('Symbol is required');
  const upper = symbol.toUpperCase().trim();

  // 1. Live Quote (5s in-memory cache)
  let liveQuote = await fetchYahooRealtimeQuote(upper);
  if (!liveQuote || !liveQuote.price) {
    const fallback = await fetchYahooLatest(upper);
    liveQuote = {
      symbol: upper,
      price: fallback?.price || 0,
      change: fallback?.change || 0,
      percent_change: fallback?.percent_change || 0,
      dayHigh: fallback?.price || 0,
      dayLow: fallback?.price || 0,
      volume: 0,
      updatedAt: new Date().toISOString()
    };
  }

  const currentPrice = liveQuote.price || 0;

  // 2. Holdings & Quota from internal DB ledger
  const { holdings } = getPortfolioHoldings(portfolioId);
  const holding = holdings[upper] || {
    shares: 0,
    avgCost: 0,
    totalInvested: 0,
    marketValue: 0,
    unrealizedPnl: 0,
    unrealizedPnlPct: 0
  };

  const quota = db.prepare(`
    SELECT * FROM project2x_share_quotas 
    WHERE portfolio_id = ? AND symbol = ?
  `).get(portfolioId, upper) || {
    target_shares: 0,
    target_percent: 10.0,
    base_price: currentPrice || 100,
    category: 'Core',
    status: 'COLLECTING'
  };

  // Target 1-Doubler Price (Base Price * 2)
  const basePrice = quota.base_price > 0 ? quota.base_price : (holding.avgCost > 0 ? holding.avgCost : currentPrice);
  const targetPrice3Y = Number((basePrice * 2).toFixed(2));
  const doublerProgressPct = targetPrice3Y > 0 
    ? Number(Math.min(100, Math.max(0, (currentPrice / targetPrice3Y) * 100)).toFixed(1))
    : 0;

  const quotaSharesRemaining = Math.max(0, (quota.target_shares || 0) - (holding.shares || 0));
  const quotaProgressPct = quota.target_shares > 0
    ? Number(Math.min(100, ((holding.shares || 0) / quota.target_shares) * 100).toFixed(1))
    : 0;

  // Lots history for execution slip
  const lots = db.prepare(`
    SELECT id, date, type, amount as shares, price, fee, note
    FROM transactions
    WHERE portfolio_id = ? AND symbol = ? AND type IN ('BUY', 'SELL')
    ORDER BY date DESC LIMIT 10
  `).all(portfolioId, upper);

  // 3. Technical Signals & Radar Row
  const signalRow = db.prepare(`
    SELECT * FROM project2x_signals
    WHERE portfolio_id = ? AND symbol = ?
    ORDER BY date DESC LIMIT 1
  `).get(portfolioId, upper) || {};

  // 4. Quarterly Financials (8-12 quarters)
  let quarterlyFinancials = db.prepare(`
    SELECT fiscal_quarter, report_date, revenue_usd, yoy_revenue_growth_pct,
           eps_actual, eps_estimate, eps_surprise_pct, gross_margin_pct
    FROM quarterly_financials
    WHERE symbol = ?
    ORDER BY fiscal_quarter DESC LIMIT 12
  `).all(upper);

  // If empty, auto-sync from Yahoo once
  if (quarterlyFinancials.length === 0) {
    try {
      await syncQuarterlyFinancials(upper);
      quarterlyFinancials = db.prepare(`
        SELECT fiscal_quarter, report_date, revenue_usd, yoy_revenue_growth_pct,
               eps_actual, eps_estimate, eps_surprise_pct, gross_margin_pct
        FROM quarterly_financials
        WHERE symbol = ?
        ORDER BY fiscal_quarter DESC LIMIT 12
      `).all(upper);
    } catch (syncErr) {
      console.warn(`[DossierService] Auto-sync quarterly error for ${upper}:`, syncErr.message);
    }
  }

  // 5. Fundamentals History (Valuation Band 3Y)
  const peHistory = db.prepare(`
    SELECT snapshot_date as date, price_at_snapshot as price, pe_trailing as pe, pe_forward, peg_ratio
    FROM fundamentals_history
    WHERE symbol = ?
    ORDER BY snapshot_date ASC LIMIT 36
  `).all(upper);

  // 6. Specific Driver for the stock
  const specificDriver = db.prepare(`
    SELECT metric_key, metric_label, metric_value, metric_unit, safe_threshold, danger_threshold
    FROM project2x_specific_drivers
    WHERE symbol = ?
  `).get(upper) || null;

  // 7. General Fundamentals (from symbol_fundamentals and project2x_fundamentals)
  const fundRow = db.prepare(`
    SELECT pe_trailing, pe_forward, revenue_growth, profit_margin, 
           target_mean_price, target_high_price, target_low_price,
           eps_growth_next_year, revenue_growth_estimate, earnings_beat_streak,
           market_cap
    FROM symbol_fundamentals
    WHERE symbol = ?
  `).get(upper) || {};

  const p2xFund = db.prepare(`
    SELECT peg_ratio, expected_cagr_3y, consecutive_eps_qs
    FROM project2x_fundamentals
    WHERE symbol = ?
  `).get(upper) || {};

  const pegRatio = p2xFund.peg_ratio || (
    (fundRow.pe_forward > 0 && fundRow.eps_growth_next_year > 0)
      ? Number((fundRow.pe_forward / (fundRow.eps_growth_next_year * 100)).toFixed(2))
      : null
  );

  // 8. Compute Moat Auto Flags
  // Check if gross margin declined for 3 consecutive quarters
  let grossMarginDeclining3Q = false;
  if (quarterlyFinancials.length >= 4) {
    const q0 = quarterlyFinancials[0]?.gross_margin_pct;
    const q1 = quarterlyFinancials[1]?.gross_margin_pct;
    const q2 = quarterlyFinancials[2]?.gross_margin_pct;
    const q3 = quarterlyFinancials[3]?.gross_margin_pct;
    if (q0 != null && q1 != null && q2 != null && q3 != null) {
      if (q0 < q1 && q1 < q2 && q2 < q3) {
        grossMarginDeclining3Q = true;
      }
    }
  }

  // Compute EPS beat streak from quarterly history
  let epsBeatStreak = 0;
  for (const q of quarterlyFinancials) {
    if (q.eps_surprise_pct != null && q.eps_surprise_pct > 0) {
      epsBeatStreak++;
    } else {
      break;
    }
  }
  if (epsBeatStreak === 0 && fundRow.earnings_beat_streak) {
    epsBeatStreak = fundRow.earnings_beat_streak;
  }

  // Latest Revenue YoY Growth
  const latestRevGrowth = quarterlyFinancials[0]?.yoy_revenue_growth_pct ?? fundRow.revenue_growth ?? 0;
  const latestGrossMargin = quarterlyFinancials[0]?.gross_margin_pct ?? (fundRow.profit_margin ? fundRow.profit_margin * 100 : 0);

  // 9. Compute Executive Verdict (BUY_ADD / HOLD_RIDE / TRIM_SELL)
  let verdict = 'HOLD_RIDE';
  let verdictReason = 'ราคาอยู่ในกรอบปกติ นั่งทับมือถือตามแผน ไม่ต้องเทรดพร่ำเพรื่อ';

  const isFreeRideEligible = (holding.unrealizedPnlPct || 0) >= 100.0;
  const isEma200Broken = signalRow.ema200 && currentPrice < signalRow.ema200;
  const isDangerTraffic = signalRow.traffic_light === 'DANGER';

  if (isFreeRideEligible) {
    verdict = 'TRIM_SELL';
    verdictReason = `กำไรครบ 100% (+${holding.unrealizedPnlPct.toFixed(1)}%) — แนะนำกดปุ่ม Free-Ride 50% ดึงทุนคืน เล่นด้วยกำไรฟรี!`;
  } else if (grossMarginDeclining3Q) {
    verdict = 'TRIM_SELL';
    verdictReason = 'Moat Breaker Alert: Gross Margin ลดลง 3 ไตรมาสติดต่อกัน ส่อแววโดนตัดราคา แนะนำพิจารณาตัดลดความเสี่ยง';
  } else if (isEma200Broken || isDangerTraffic) {
    verdict = 'TRIM_SELL';
    verdictReason = 'สัญญาณเทคนิคเข้าเขต DANGER (หลุด EMA 200) หลุดเกณฑ์ปลอดภัยเสาที่ 3 แนะนำพิจารณาหยุดขาดทุน';
  } else if ((signalRow.traffic_light === 'BUY_ZONE' || signalRow.scenario === 1 || signalRow.scenario === 2) && quotaSharesRemaining > 0) {
    verdict = 'BUY_ADD';
    verdictReason = `Setup สวย (แตะเส้นรับ EMA + เงินเจ้ามือเข้า) และโควตายังขาดอีก ${quotaSharesRemaining.toFixed(0)} หุ้น แนะนำซื้อเติมโควตา`;
  } else if (quotaSharesRemaining === 0) {
    verdict = 'HOLD_RIDE';
    verdictReason = 'โควตาครบ 100% แล้ว นั่งทับมือถือยาว ปล่อยให้พลัง Compound ทำงานสู่เป้า 1 เด้ง';
  }

  return {
    symbol: upper,
    name: upper,
    category: quota.category || 'Core',
    marketCap: fundRow.market_cap || null,
    liveQuote,
    currentPrice,
    basePrice,
    targetPrice3Y,
    doublerProgressPct,
    verdict,
    verdictReason,
    holding: {
      shares: holding.shares || 0,
      avgCost: holding.avgCost || 0,
      totalInvested: holding.totalInvested || 0,
      marketValue: holding.marketValue || 0,
      unrealizedPnl: holding.unrealizedPnl || 0,
      unrealizedPnlPct: holding.unrealizedPnlPct || 0,
      targetShares: quota.target_shares || 0,
      quotaProgressPct,
      quotaSharesRemaining,
      lots
    },
    radar: {
      scenario: signalRow.scenario || 1,
      trafficLight: signalRow.traffic_light || 'BUY_ZONE',
      ema50: signalRow.ema50 || null,
      ema150: signalRow.ema150 || null,
      ema200: signalRow.ema200 || null,
      bankerFlow: signalRow.banker_flow || 0,
      sellSignal: signalRow.sell_signal || null,
      actionSuggested: signalRow.action_suggested || ''
    },
    vitalSigns: {
      revenueGrowthYoY: Number(latestRevGrowth.toFixed(1)),
      revenueGrowthStatus: latestRevGrowth >= 30 ? 'HYPER_GROWTH' : (latestRevGrowth >= 15 ? 'STEADY' : 'DECELERATING'),
      epsBeatStreak,
      grossMarginPct: Number(latestGrossMargin.toFixed(1)),
      grossMarginStatus: grossMarginDeclining3Q ? 'MOAT_BREAKER' : 'STRONG',
      peForward: fundRow.pe_forward || 0,
      pegRatio: pegRatio || 0,
      valuationStatus: (pegRatio && pegRatio < 1.5) ? 'UNDERVALUED' : ((pegRatio && pegRatio > 2.5) ? 'STRETCHED' : 'FAIR')
    },
    quarterlyFinancials,
    peHistory,
    specificDriver,
    moatAutoFlags: {
      grossMarginDeclining3Q,
      epsBeatStreak
    }
  };
}

/**
 * Save or update stock-specific driver metric
 */
export function saveSpecificDriver(symbol, { metric_key, metric_label, metric_value, metric_unit, safe_threshold, danger_threshold }) {
  if (!symbol || !metric_key) throw new Error('Symbol and metric_key are required');
  const upper = symbol.toUpperCase().trim();

  const stmt = db.prepare(`
    INSERT INTO project2x_specific_drivers (
      symbol, metric_key, metric_label, metric_value, metric_unit, safe_threshold, danger_threshold, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(symbol, metric_key) DO UPDATE SET
      metric_label = excluded.metric_label,
      metric_value = excluded.metric_value,
      metric_unit = excluded.metric_unit,
      safe_threshold = excluded.safe_threshold,
      danger_threshold = excluded.danger_threshold,
      updated_at = datetime('now')
  `);

  stmt.run(
    upper,
    metric_key,
    metric_label || metric_key,
    Number(metric_value) || 0,
    metric_unit || '',
    safe_threshold != null ? Number(safe_threshold) : null,
    danger_threshold != null ? Number(danger_threshold) : null
  );

  return db.prepare('SELECT * FROM project2x_specific_drivers WHERE symbol = ? AND metric_key = ?').get(upper, metric_key);
}

/**
 * Sync quarterly financials from Yahoo Finance into SQLite
 */
export async function syncQuarterlyFinancials(symbol) {
  if (!symbol) return;
  const upper = symbol.toUpperCase().trim();

  try {
    const summary = await yahooFinance.quoteSummary(upper, {
      modules: ['earningsHistory', 'incomeStatementHistoryQuarterly', 'financialData']
    });

    const earningsHistory = summary?.earningsHistory?.history || [];
    const incomeHistory = summary?.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];

    // Map income statements by date (YYYY-MM)
    const incomeMap = {};
    for (const inc of incomeHistory) {
      if (inc.endDate) {
        const d = new Date(inc.endDate).toISOString().split('T')[0];
        incomeMap[d.substring(0, 7)] = inc; // YYYY-MM
      }
    }

    const insertStmt = db.prepare(`
      INSERT INTO quarterly_financials (
        symbol, fiscal_quarter, report_date, revenue_usd, yoy_revenue_growth_pct,
        eps_actual, eps_estimate, eps_surprise_pct, gross_margin_pct, source, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'yahoo', datetime('now'))
      ON CONFLICT(symbol, fiscal_quarter) DO UPDATE SET
        report_date = excluded.report_date,
        revenue_usd = excluded.revenue_usd,
        yoy_revenue_growth_pct = excluded.yoy_revenue_growth_pct,
        eps_actual = excluded.eps_actual,
        eps_estimate = excluded.eps_estimate,
        eps_surprise_pct = excluded.eps_surprise_pct,
        gross_margin_pct = excluded.gross_margin_pct,
        source = 'yahoo',
        updated_at = datetime('now')
    `);

    // Process earningsHistory (usually has last 4 quarters)
    for (const eh of earningsHistory) {
      if (!eh.quarter) continue;
      const qDate = new Date(eh.quarter);
      const year = qDate.getFullYear();
      const month = qDate.getMonth() + 1;
      const quarterNum = Math.ceil(month / 3);
      const fiscalQuarter = `${year}-Q${quarterNum}`;
      const reportDate = qDate.toISOString().split('T')[0];

      // Match income statement by month
      const yyyymm = reportDate.substring(0, 7);
      const inc = incomeMap[yyyymm] || incomeHistory[0] || {};

      const revenue = inc.totalRevenue || 0;
      const grossProfit = inc.grossProfit || 0;
      const grossMarginPct = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(1)) : null;

      const epsActual = eh.epsActual != null ? Number(eh.epsActual) : null;
      const epsEstimate = eh.epsEstimate != null ? Number(eh.epsEstimate) : null;
      const surprisePct = eh.surprisePercent != null ? Number((eh.surprisePercent * 100).toFixed(2)) : null;

      insertStmt.run(
        upper,
        fiscalQuarter,
        reportDate,
        revenue,
        null, // YoY calculated later if multiple quarters exist
        epsActual,
        epsEstimate,
        surprisePct,
        grossMarginPct
      );
    }

    console.log(`[DossierService] Successfully synced quarterly financials for ${upper}`);
    return true;
  } catch (error) {
    console.error(`[DossierService] Error syncing quarterly financials for ${upper}:`, error.message);
    return false;
  }
}
