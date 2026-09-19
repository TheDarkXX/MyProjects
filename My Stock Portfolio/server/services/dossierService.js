import { db } from '../db/init.js';
import { fetchYahooRealtimeQuote, fetchYahooLatest } from './yahoo.js';
import { getPortfolioHoldings, getOrCreateConfig, calculateStockRadarSignal } from './project2xEngine.js';
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
  let actualPortfolioId = portfolioId;
  if (!actualPortfolioId || actualPortfolioId === 'default') {
    const portWithTx = db.prepare(`
      SELECT portfolio_id FROM transactions 
      GROUP BY portfolio_id ORDER BY count(*) DESC LIMIT 1
    `).get();
    actualPortfolioId = portWithTx?.portfolio_id || db.prepare('SELECT id FROM portfolios LIMIT 1').get()?.id || portfolioId;
  }

  const { holdings } = getPortfolioHoldings(actualPortfolioId);
  const rawHolding = holdings[upper] || { shares: 0, totalCost: 0 };
  const holdingShares = rawHolding.shares || 0;
  const holdingTotalCost = rawHolding.totalCost || 0;
  let avgCost = holdingShares > 0 ? Number((holdingTotalCost / holdingShares).toFixed(2)) : 0;

  // Fallback: If shares > 0 but avgCost === 0, reverse calculate from BUY transactions
  if (holdingShares > 0 && avgCost === 0) {
    const buyTxs = db.prepare(`
      SELECT amount, price, fee FROM transactions 
      WHERE portfolio_id = ? AND symbol = ? AND type = 'BUY'
    `).all(actualPortfolioId, upper);
    if (buyTxs.length > 0) {
      let totalB = 0;
      let totalAmt = 0;
      for (const b of buyTxs) {
        totalB += (b.amount * b.price) + (b.fee || 0);
        totalAmt += b.amount;
      }
      if (totalAmt > 0) {
        avgCost = Number((totalB / totalAmt).toFixed(2));
      }
    }
  }

  const marketValue = Number((holdingShares * currentPrice).toFixed(2));
  const totalInvested = Number(holdingTotalCost.toFixed(2));
  const unrealizedPnl = holdingShares > 0 ? Number((marketValue - totalInvested).toFixed(2)) : 0;
  const unrealizedPnlPct = (totalInvested > 0 && holdingShares > 0)
    ? Number(((unrealizedPnl / totalInvested) * 100).toFixed(2))
    : 0;

  // Total Portfolio Market Value for Portfolio Weight %
  let totalPortValue = 0;
  for (const [sym, h] of Object.entries(holdings)) {
    if (h.shares > 0) {
      const price = (sym === upper) ? currentPrice : (h.totalCost / h.shares);
      totalPortValue += (h.shares * price);
    }
  }
  const portfolioWeightPct = (totalPortValue > 0 && marketValue > 0)
    ? Number(((marketValue / totalPortValue) * 100).toFixed(1))
    : 0;

  const quota = db.prepare(`
    SELECT * FROM project2x_share_quotas 
    WHERE portfolio_id = ? AND symbol = ?
  `).get(actualPortfolioId, upper) || {
    target_shares: 0,
    target_percent: 10.0,
    base_price: currentPrice || 100,
    category: 'Core',
    status: 'COLLECTING'
  };

  // Target 1-Doubler Price: Prioritize avgCost if owned, else quota.base_price, else currentPrice
  const basePrice = (avgCost > 0)
    ? avgCost
    : (quota.base_price > 0 ? quota.base_price : (currentPrice || 100));
  const targetPrice3Y = Number((basePrice * 2).toFixed(2));
  const doublerProgressPct = targetPrice3Y > 0 
    ? Number(Math.min(100, Math.max(0, (currentPrice / targetPrice3Y) * 100)).toFixed(1))
    : 0;

  const quotaSharesRemaining = Math.max(0, (quota.target_shares || 0) - holdingShares);
  const quotaProgressPct = quota.target_shares > 0
    ? Number(Math.min(100, (holdingShares / quota.target_shares) * 100).toFixed(1))
    : 0;

  // Lots history for execution slip
  const lots = db.prepare(`
    SELECT id, date, type, amount as shares, price, fee, note
    FROM transactions
    WHERE portfolio_id = ? AND symbol = ? AND type IN ('BUY', 'SELL')
    ORDER BY date DESC LIMIT 10
  `).all(actualPortfolioId, upper);

  // First Buy Date for Time Dimension Telemetry
  const firstTx = db.prepare(`
    SELECT MIN(date) as first_buy_date
    FROM transactions
    WHERE portfolio_id = ? AND symbol = ? AND type = 'BUY'
  `).get(actualPortfolioId, upper);
  const firstBuyDate = firstTx?.first_buy_date || (lots.length > 0 ? lots[lots.length - 1]?.date : null);

  // 3. Real-time Technical Signals & Radar Calculation (with live intraday price)
  const signalRadar = await calculateStockRadarSignal(upper, {
    portfolioId: actualPortfolioId,
    ownedShares: holdingShares,
    category: quota.category || 'Core',
    livePrice: currentPrice,
    liveQuote
  });

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
  let fundRow = db.prepare(`
    SELECT pe_trailing, pe_forward, revenue_growth, profit_margin, 
           target_mean_price, target_high_price, target_low_price,
           recommendation_key, recommendation_mean, num_analyst_opinions,
           eps_growth_next_year, revenue_growth_estimate, earnings_beat_streak,
           market_cap, free_cash_flow, operating_cash_flow, operating_margin,
           shares_outstanding, shares_dilution_pct, sbc_revenue_pct, earnings_date
    FROM symbol_fundamentals
    WHERE symbol = ?
  `).get(upper);

  // If fundRow is missing or missing forward targets, auto-fetch from Yahoo
  if (!fundRow || !fundRow.target_mean_price) {
    try {
      const { fetchFundamentals } = await import('./yahooFundamentals.js');
      const fetched = await fetchFundamentals(upper);
      if (fetched) {
        fundRow = db.prepare(`
          SELECT pe_trailing, pe_forward, revenue_growth, profit_margin, 
                 target_mean_price, target_high_price, target_low_price,
                 recommendation_key, recommendation_mean, num_analyst_opinions,
                 eps_growth_next_year, revenue_growth_estimate, earnings_beat_streak,
                 market_cap, free_cash_flow, operating_cash_flow, operating_margin,
                 shares_outstanding, shares_dilution_pct, sbc_revenue_pct, earnings_date
          FROM symbol_fundamentals
          WHERE symbol = ?
        `).get(upper) || fetched;
      }
    } catch (fErr) {
      console.warn(`[DossierService] fetchFundamentals fallback error for ${upper}:`, fErr.message);
    }
  }
  fundRow = fundRow || {};

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
  let verdictReason = signalRadar?.reason_th || 'ราคาอยู่ในกรอบปกติ นั่งทับมือถือตามแผน ไม่ต้องเทรดพร่ำเพรื่อ';

  const isFreeRideEligible = (unrealizedPnlPct || 0) >= 100.0;
  const isEma200Broken = signalRadar?.ema200 && currentPrice < signalRadar.ema200;
  const isDangerTraffic = signalRadar?.traffic_light === 'DANGER' || signalRadar?.traffic_light === 'MAYDAY_EXIT' || signalRadar?.traffic_light === 'SLOW_BLEED';

  if (isFreeRideEligible) {
    verdict = 'TRIM_SELL';
    verdictReason = `กำไรครบ 100% (+${unrealizedPnlPct.toFixed(1)}%) — แนะนำกดปุ่ม Free-Ride 50% ดึงทุนคืน เล่นด้วยกำไรฟรี!`;
  } else if (grossMarginDeclining3Q) {
    verdict = 'TRIM_SELL';
    verdictReason = 'Moat Breaker Alert: Gross Margin ลดลง 3 ไตรมาสติดต่อกัน ส่อแววโดนตัดราคา แนะนำพิจารณาตัดลดความเสี่ยง';
  } else if (isEma200Broken || isDangerTraffic) {
    verdict = 'TRIM_SELL';
    verdictReason = signalRadar?.reason_th || 'สัญญาณเทคนิคเข้าเขตอันตราย แนะนำพิจารณาตัดลดความเสี่ยง';
  } else if (signalRadar?.traffic_light === 'TO_THE_MOON') {
    verdict = 'HOLD_RIDE';
    verdictReason = signalRadar?.reason_th || 'หุ้นติดเทอร์โบขาขึ้นลอยฟ้า (TO THE MOON 🚀) สถาบันเกาะแน่น นั่งทับมือปล่อยกำไรวิ่ง';
  } else if ((signalRadar?.traffic_light === 'BUY_NOW' || signalRadar?.traffic_light === 'BUY_ZONE') && quotaSharesRemaining > 0) {
    verdict = 'BUY_ADD';
    verdictReason = signalRadar?.reason_th || `Setup สวย (${signalRadar?.traffic_light === 'BUY_NOW' ? 'BUY NOW!! 🔥 จุดเข้าซื้อคมกริบ' : 'BUY ZONE 💰 สะสมตามแผน'}) และโควตายังขาดอีก ${quotaSharesRemaining.toFixed(0)} หุ้น แนะนำซื้อเติมโควตา`;
  } else if (quotaSharesRemaining === 0) {
    verdict = 'HOLD_RIDE';
    verdictReason = 'โควตาครบ 100% แล้ว นั่งทับมือถือยาว ปล่อยให้พลัง Compound ทำงานสู่เป้า 1 เด้ง';
  } else {
    verdictReason = signalRadar?.reason_th || verdictReason;
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
    portfolioWeightPct,
    holding: {
      shares: holdingShares,
      avgCost,
      totalInvested,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct,
      targetShares: quota.target_shares || 0,
      quotaProgressPct,
      quotaSharesRemaining,
      firstBuyDate,
      lots
    },
    analystConsensus: {
      targetMean: fundRow.target_mean_price || 0,
      targetHigh: fundRow.target_high_price || 0,
      targetLow: fundRow.target_low_price || 0,
      recommendationKey: fundRow.recommendation_key || 'hold',
      recommendationMean: fundRow.recommendation_mean || 2.5,
      analystOpinionsCount: fundRow.num_analyst_opinions || 0,
      epsGrowthNextYear: fundRow.eps_growth_next_year || 0,
      revenueGrowthEstimate: fundRow.revenue_growth_estimate || 0
    },
    financialMetrics: {
      freeCashFlow: fundRow.free_cash_flow || 0,
      operatingCashFlow: fundRow.operating_cash_flow || 0,
      operatingMargin: fundRow.operating_margin || (latestGrossMargin ? Number((latestGrossMargin * 0.7).toFixed(1)) : 0),
      sharesOutstanding: fundRow.shares_outstanding || 0,
      sharesDilutionPct: fundRow.shares_dilution_pct || 0,
      sbcRevenuePct: fundRow.sbc_revenue_pct || 0,
      earningsDate: fundRow.earnings_date || ''
    },
    radar: {
      scenario: signalRadar?.scenario || 16,
      trafficLight: signalRadar?.traffic_light || 'ON_RADAR',
      badge: signalRadar?.badge || 'Evaluating',
      ema9: signalRadar?.ema9 || null,
      ema50: signalRadar?.ema50 || null,
      ema150: signalRadar?.ema150 || null,
      ema200: signalRadar?.ema200 || null,
      distEma9: signalRadar?.distEma9 || 0,
      distEma50: signalRadar?.distEma50 || 0,
      distEma150: signalRadar?.distEma150 || 0,
      distEma200: signalRadar?.distEma200 || 0,
      isAboveEma9: signalRadar?.isAboveEma9 ?? (signalRadar?.ema9 ? currentPrice >= signalRadar.ema9 : true),
      hasRsiDivergence: !!signalRadar?.hasRsiDivergence,
      bankerFlow: signalRadar?.banker || 0,
      volRatio: signalRadar?.volRatio || 1.0,
      regime: signalRadar?.regime || 'NEUTRAL',
      reason: signalRadar?.reason || '',
      reason_th: signalRadar?.reason_th || '',
      signals_checklist: signalRadar?.signals_checklist || [],
      checklist: signalRadar?.checklist || {},
      sellSignal: null,
      actionSuggested: signalRadar?.badge || ''
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
