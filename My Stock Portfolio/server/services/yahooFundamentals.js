import YahooFinance from 'yahoo-finance2';
import { db } from '../db/init.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const IN_MEMORY_TTL = 30 * 60 * 1000; // 30 minutes
const SQLITE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const memoryCache = new Map();

/**
 * Fetch fundamentals data for AI Advisor.
 * Uses 3-tier cache: In-Memory -> SQLite -> Yahoo API
 * @param {string} symbol 
 */
export async function fetchFundamentals(symbol) {
  if (!symbol || symbol === 'CASH') return null;
  const upper = symbol.toUpperCase();
  if (upper.includes('BTC') || upper.includes('ETH')) return null;

  // Tier 1: In-Memory
  const memCached = memoryCache.get(upper);
  if (memCached && (Date.now() - memCached.timestamp < IN_MEMORY_TTL)) {
    return memCached.data;
  }

  // Tier 2: SQLite
  try {
    const stmt = db.prepare('SELECT * FROM symbol_fundamentals WHERE symbol = ?');
    const row = stmt.get(upper);
    if (row) {
      const fetchedAt = new Date(row.fetched_at).getTime();
      const hasForwardData = row.target_mean_price !== undefined && row.target_mean_price !== null && row.num_analyst_opinions !== undefined;
      if (hasForwardData && (Date.now() - fetchedAt < SQLITE_TTL)) {
        // Hydrate memory cache
        memoryCache.set(upper, { timestamp: Date.now(), data: row });
        return row;
      }
    }
  } catch (error) {
    console.error(`[Fundamentals] Error checking SQLite for ${upper}:`, error.message);
  }

  // Tier 3: Yahoo API
  try {
    const modules = [
      'financialData',
      'defaultKeyStatistics',
      'summaryDetail',
      'assetProfile',
      'earningsTrend',
      'earningsHistory',
      'recommendationTrend'
    ];
    
    // Also fetch regular quote for current price
    const [quote, summary] = await Promise.all([
      yahooFinance.quote(upper).catch(err => {
        console.warn(`[Fundamentals] quote error for ${upper}:`, err.message);
        return null;
      }),
      yahooFinance.quoteSummary(upper, { modules }).catch(err => {
        console.warn(`[Fundamentals] quoteSummary error for ${upper}:`, err.message);
        return {};
      })
    ]);

    if (!quote && Object.keys(summary).length === 0) {
      return null;
    }

    const fin = summary.financialData || {};
    const stat = summary.defaultKeyStatistics || {};
    const det = summary.summaryDetail || {};
    const prof = summary.assetProfile || {};
    const eTrend = summary.earningsTrend?.trend || [];
    const eHistory = summary.earningsHistory?.history || [];
    const rTrend = summary.recommendationTrend?.trend?.[0] || {}; // Current month trend

    // Process Earnings Trend (find current year and next year)
    let eps_current = 0, eps_next = 0, eps_growth = 0, rev_growth = 0;
    for (const t of eTrend) {
      if (t.period === '0y' || t.period === '+0y') {
        eps_current = t.earningsEstimate?.avg || 0;
      } else if (t.period === '+1y' || t.period === '1y') {
        eps_next = t.earningsEstimate?.avg || 0;
        eps_growth = t.earningsEstimate?.growth || 0;
        rev_growth = t.revenueEstimate?.growth || 0;
      }
    }

    // Process Earnings History (last 4 quarters, newest quarter first: -1q -> -2q -> -3q -> -4q)
    const reversedHistory = [...eHistory].reverse();
    const surprises = reversedHistory.map(h => (h.surprisePercent !== undefined ? h.surprisePercent : 0));
    const earnings_q1_surprise = surprises[0] || 0; // Most recent reported quarter (-1q)
    const earnings_q2_surprise = surprises[1] || 0;
    const earnings_q3_surprise = surprises[2] || 0;
    const earnings_q4_surprise = surprises[3] || 0;
    let beat_streak = 0;
    for (const s of surprises) {
      if (s > 0) beat_streak++;
      else break;
    }

    const data = {
      symbol: upper,
      sector: prof.sector || 'Other',
      industry: prof.industry || '',
      current_price: quote?.regularMarketPrice || fin.currentPrice || det.previousClose || 0,
      pe_trailing: det.trailingPE || quote?.trailingPE || 0,
      pe_forward: fin.forwardPE || stat.forwardPE || quote?.forwardPE || 0,
      pb_ratio: stat.priceToBook || 0,
      roe: fin.returnOnEquity || 0,
      revenue_growth: fin.revenueGrowth || 0,
      profit_margin: fin.profitMargins || 0,
      debt_to_equity: fin.debtToEquity || 0,
      beta: stat.beta || det.beta || 0,
      div_yield: det.dividendYield || det.trailingAnnualDividendYield || 0,
      annual_dividend: det.dividendRate || det.trailingAnnualDividendRate || 0,
      fifty_two_week_high: det.fiftyTwoWeekHigh || quote?.fiftyTwoWeekHigh || 0,
      fifty_two_week_low: det.fiftyTwoWeekLow || quote?.fiftyTwoWeekLow || 0,
      sma50: det.fiftyDayAverage || quote?.fiftyDayAverage || 0,
      sma200: det.twoHundredDayAverage || quote?.twoHundredDayAverage || 0,
      market_cap: det.marketCap || quote?.marketCap || 0,
      short_percent: stat.shortPercentOfFloat || 0,
      target_mean_price: fin.targetMeanPrice || 0,
      target_high_price: fin.targetHighPrice || 0,
      target_low_price: fin.targetLowPrice || 0,
      recommendation_key: fin.recommendationKey || '',
      recommendation_mean: fin.recommendationMean || 0,
      num_analyst_opinions: fin.numberOfAnalystOpinions || 0,
      eps_current_estimate: eps_current,
      eps_next_year_estimate: eps_next,
      eps_growth_next_year: eps_growth,
      revenue_growth_estimate: rev_growth,
      rec_strong_buy: rTrend.strongBuy || 0,
      rec_buy: rTrend.buy || 0,
      rec_hold: rTrend.hold || 0,
      rec_sell: (rTrend.sell || 0) + (rTrend.strongSell || 0),
      earnings_q1_surprise,
      earnings_q2_surprise,
      earnings_q3_surprise,
      earnings_q4_surprise,
      earnings_beat_streak: beat_streak,
      fetched_at: new Date().toISOString()
    };

    // Save to Tier 2 (SQLite)
    try {
      const insertStmt = db.prepare(`
        INSERT INTO symbol_fundamentals (
          symbol, sector, industry, current_price, pe_trailing, pe_forward, pb_ratio, 
          roe, revenue_growth, profit_margin, debt_to_equity, beta, div_yield, 
          annual_dividend, fifty_two_week_high, fifty_two_week_low, sma50, sma200, 
          market_cap, short_percent, target_mean_price, target_high_price, target_low_price,
          recommendation_key, recommendation_mean, num_analyst_opinions, eps_current_estimate,
          eps_next_year_estimate, eps_growth_next_year, revenue_growth_estimate, rec_strong_buy,
          rec_buy, rec_hold, rec_sell, earnings_q1_surprise, earnings_q2_surprise,
          earnings_q3_surprise, earnings_q4_surprise, earnings_beat_streak, fetched_at
        ) VALUES (
          @symbol, @sector, @industry, @current_price, @pe_trailing, @pe_forward, @pb_ratio, 
          @roe, @revenue_growth, @profit_margin, @debt_to_equity, @beta, @div_yield, 
          @annual_dividend, @fifty_two_week_high, @fifty_two_week_low, @sma50, @sma200, 
          @market_cap, @short_percent, @target_mean_price, @target_high_price, @target_low_price,
          @recommendation_key, @recommendation_mean, @num_analyst_opinions, @eps_current_estimate,
          @eps_next_year_estimate, @eps_growth_next_year, @revenue_growth_estimate, @rec_strong_buy,
          @rec_buy, @rec_hold, @rec_sell, @earnings_q1_surprise, @earnings_q2_surprise,
          @earnings_q3_surprise, @earnings_q4_surprise, @earnings_beat_streak, @fetched_at
        )
        ON CONFLICT(symbol) DO UPDATE SET
          sector = excluded.sector,
          industry = excluded.industry,
          current_price = excluded.current_price,
          pe_trailing = excluded.pe_trailing,
          pe_forward = excluded.pe_forward,
          pb_ratio = excluded.pb_ratio,
          roe = excluded.roe,
          revenue_growth = excluded.revenue_growth,
          profit_margin = excluded.profit_margin,
          debt_to_equity = excluded.debt_to_equity,
          beta = excluded.beta,
          div_yield = excluded.div_yield,
          annual_dividend = excluded.annual_dividend,
          fifty_two_week_high = excluded.fifty_two_week_high,
          fifty_two_week_low = excluded.fifty_two_week_low,
          sma50 = excluded.sma50,
          sma200 = excluded.sma200,
          market_cap = excluded.market_cap,
          short_percent = excluded.short_percent,
          target_mean_price = excluded.target_mean_price,
          target_high_price = excluded.target_high_price,
          target_low_price = excluded.target_low_price,
          recommendation_key = excluded.recommendation_key,
          recommendation_mean = excluded.recommendation_mean,
          num_analyst_opinions = excluded.num_analyst_opinions,
          eps_current_estimate = excluded.eps_current_estimate,
          eps_next_year_estimate = excluded.eps_next_year_estimate,
          eps_growth_next_year = excluded.eps_growth_next_year,
          revenue_growth_estimate = excluded.revenue_growth_estimate,
          rec_strong_buy = excluded.rec_strong_buy,
          rec_buy = excluded.rec_buy,
          rec_hold = excluded.rec_hold,
          rec_sell = excluded.rec_sell,
          earnings_q1_surprise = excluded.earnings_q1_surprise,
          earnings_q2_surprise = excluded.earnings_q2_surprise,
          earnings_q3_surprise = excluded.earnings_q3_surprise,
          earnings_q4_surprise = excluded.earnings_q4_surprise,
          earnings_beat_streak = excluded.earnings_beat_streak,
          fetched_at = excluded.fetched_at
      `);
      insertStmt.run(data);
    } catch (dbErr) {
      console.error(`[Fundamentals] Error saving SQLite for ${upper}:`, dbErr.message);
    }

    // Save to Tier 1 (Memory)
    memoryCache.set(upper, { timestamp: Date.now(), data });
    return data;

  } catch (error) {
    console.error(`[Fundamentals] Error fetching Yahoo API for ${upper}:`, error.message);
    return null;
  }
}
