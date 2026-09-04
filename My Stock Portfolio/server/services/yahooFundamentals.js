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
      if (Date.now() - fetchedAt < SQLITE_TTL) {
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
      'assetProfile'
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
      fetched_at: new Date().toISOString()
    };

    // Save to Tier 2 (SQLite)
    try {
      const insertStmt = db.prepare(`
        INSERT INTO symbol_fundamentals (
          symbol, sector, industry, current_price, pe_trailing, pe_forward, pb_ratio, 
          roe, revenue_growth, profit_margin, debt_to_equity, beta, div_yield, 
          annual_dividend, fifty_two_week_high, fifty_two_week_low, sma50, sma200, 
          market_cap, short_percent, fetched_at
        ) VALUES (
          @symbol, @sector, @industry, @current_price, @pe_trailing, @pe_forward, @pb_ratio, 
          @roe, @revenue_growth, @profit_margin, @debt_to_equity, @beta, @div_yield, 
          @annual_dividend, @fifty_two_week_high, @fifty_two_week_low, @sma50, @sma200, 
          @market_cap, @short_percent, @fetched_at
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
