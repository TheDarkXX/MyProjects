import { Hono } from 'hono';
import YahooFinance from 'yahoo-finance2';
import { db } from '../db/init.js';
import { updatePricesInCache } from '../services/finnhub.js';
import { authMiddleware } from './auth.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const quoteCache = new Map();
const QUOTE_CACHE_TTL = 30 * 1000;

const pricesRoutes = new Hono();

pricesRoutes.use('*', authMiddleware);

pricesRoutes.post('/latest', async (c) => {
  try {
    const body = await c.req.json();
    const symbols = body.symbols || [];
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return c.json({ error: 'Array of symbols is required' }, 400);
    }
    
    const results = {};
    const symbolsToFetch = [];
    
    // Check cache first (age < 5 minutes)
    const getCached = db.prepare(`
      SELECT * FROM latest_prices 
      WHERE symbol = ? AND updated_at > datetime('now', '-5 minutes')
    `);
    
    for (const symbol of symbols) {
      const cached = getCached.get(symbol);
      if (cached) {
        results[symbol] = {
          price: cached.price,
          change: cached.change,
          percent_change: cached.percent_change,
          updated_at: cached.updated_at
        };
      } else {
        symbolsToFetch.push(symbol);
      }
    }
    
    // Fetch missing from Finnhub
    if (symbolsToFetch.length > 0) {
      const fetched = await updatePricesInCache(symbolsToFetch);
      Object.assign(results, fetched);
      
      // Also fetch dividend info from Yahoo Finance in the background and update metadata
      const { fetchYahooDividend } = await import('../services/yahoo.js');
      const updateMetadata = db.prepare(`
        INSERT INTO stock_metadata (symbol, dividend_yield, annual_dividend, updated_at) 
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(symbol) DO UPDATE SET 
          dividend_yield = excluded.dividend_yield, 
          annual_dividend = excluded.annual_dividend,
          updated_at = datetime('now')
      `);
      
      // Fire and forget dividend fetch
      Promise.all(symbolsToFetch.map(async (sym) => {
        const divInfo = await fetchYahooDividend(sym);
        if (divInfo && (divInfo.dividendYield > 0 || divInfo.annualDividend > 0)) {
          updateMetadata.run(sym, divInfo.dividendYield, divInfo.annualDividend);
        }
      })).catch(err => console.error('Error fetching dividends:', err));
    }
    
    return c.json(results);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch prices' }, 500);
  }
});

// Search ticker symbols using Yahoo Finance
pricesRoutes.get('/search', async (c) => {
  const q = c.req.query('q');
  if (!q || q.trim().length === 0) return c.json([]);
  try {
    const { fetchYahooSearch } = await import('../services/yahoo.js');
    const results = await fetchYahooSearch(q);
    return c.json(results);
  } catch (error) {
    console.error('[Search] Error:', error);
    return c.json([]);
  }
});

// Fetch technical indicators (EMA150, SMA50, SMA200, Current Price, Sector)
pricesRoutes.get('/technicals/:symbol', async (c) => {
  const symbol = c.req.param('symbol');
  if (!symbol) return c.json({ error: 'Symbol is required' }, 400);
  try {
    const { fetchYahooTechnicals } = await import('../services/yahoo.js');
    const data = await fetchYahooTechnicals(symbol);
    if (!data) return c.json({ error: 'Failed to fetch technicals' }, 404);
    return c.json(data);
  } catch (error) {
    console.error('[Technicals] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Fetch company profile / sector from Yahoo
pricesRoutes.get('/profile/:symbol', async (c) => {
  const symbol = c.req.param('symbol');
  if (!symbol) return c.json({ error: 'Symbol is required' }, 400);
  try {
    const { fetchYahooProfile } = await import('../services/yahoo.js');
    const data = await fetchYahooProfile(symbol);
    return c.json(data);
  } catch (error) {
    console.error('[Profile] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Fetch fundamentals for a single symbol
pricesRoutes.get('/fundamentals/:symbol', async (c) => {
  const symbol = c.req.param('symbol');
  if (!symbol) return c.json({ error: 'Symbol is required' }, 400);
  try {
    const { fetchFundamentals } = await import('../services/yahooFundamentals.js');
    const data = await fetchFundamentals(symbol);
    if (!data) return c.json({ error: 'Failed to fetch fundamentals' }, 404);
    return c.json(data);
  } catch (error) {
    console.error('[Fundamentals] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Fetch fundamentals for multiple symbols
pricesRoutes.get('/fundamentals-batch', async (c) => {
  const symbolsStr = c.req.query('symbols');
  if (!symbolsStr) return c.json({ error: 'Symbols query parameter is required' }, 400);
  const symbols = symbolsStr.split(',').map(s => s.trim()).filter(Boolean);
  if (symbols.length === 0) return c.json({ error: 'Valid symbols required' }, 400);
  
  try {
    const { fetchFundamentals } = await import('../services/yahooFundamentals.js');
    const results = {};
    
    // Batch process with concurrency limit of 3
    const batchSize = 3;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      await Promise.all(batch.map(async (sym) => {
        const data = await fetchFundamentals(sym);
        if (data) {
          results[sym] = data;
          results[sym.toUpperCase()] = data;
        }
      }));
      // Delay 200ms between batches to avoid rate limit if there are more batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return c.json(results);
  } catch (error) {
    console.error('[Fundamentals Batch] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Batch fetch real-time quotes + high/low + 52w range for TradingView Pro Watchlist
pricesRoutes.post('/quote-batch', async (c) => {
  try {
    const body = await c.req.json();
    const rawSymbols = body.symbols || [];
    if (!Array.isArray(rawSymbols) || rawSymbols.length === 0) {
      return c.json({ error: 'Array of symbols is required' }, 400);
    }
    const symbols = [...new Set(rawSymbols.map(s => String(s).trim().toUpperCase()))].filter(Boolean);
    const now = Date.now();
    const results = {};
    const missingSymbols = [];

    for (const sym of symbols) {
      const cached = quoteCache.get(sym);
      if (cached && (now - cached.timestamp < QUOTE_CACHE_TTL)) {
        results[sym] = cached.data;
      } else {
        missingSymbols.push(sym);
      }
    }

    if (missingSymbols.length > 0) {
      try {
        const quotes = await yahooFinance.quote(missingSymbols);
        const quoteArray = Array.isArray(quotes) ? quotes : (quotes ? [quotes] : []);
        for (const q of quoteArray) {
          if (!q || !q.symbol) continue;
          const symKey = q.symbol.toUpperCase();
          const item = {
            symbol: symKey,
            price: Number((q.regularMarketPrice ?? 0).toFixed(4)),
            change: Number((q.regularMarketChange ?? 0).toFixed(4)),
            percentChange: Number((q.regularMarketChangePercent ?? 0).toFixed(2)),
            dayHigh: q.regularMarketDayHigh != null ? Number(q.regularMarketDayHigh.toFixed(4)) : (q.dayHigh != null ? Number(q.dayHigh.toFixed(4)) : null),
            dayLow: q.regularMarketDayLow != null ? Number(q.regularMarketDayLow.toFixed(4)) : (q.dayLow != null ? Number(q.dayLow.toFixed(4)) : null),
            fiftyTwoWeekHigh: q.fiftyTwoWeekHigh != null ? Number(q.fiftyTwoWeekHigh.toFixed(4)) : null,
            fiftyTwoWeekLow: q.fiftyTwoWeekLow != null ? Number(q.fiftyTwoWeekLow.toFixed(4)) : null,
            shortName: q.shortName || q.longName || symKey,
            exchange: q.exchange || q.fullExchangeName || '',
            marketState: q.marketState || 'REGULAR'
          };
          quoteCache.set(symKey, { timestamp: now, data: item });
          results[symKey] = item;
        }
      } catch (err) {
        console.error('[quote-batch] Yahoo quote error:', err.message);
      }
    }

    // Fallback for any symbols still missing using latest_prices table
    for (const sym of symbols) {
      if (!results[sym]) {
        const cachedFallback = quoteCache.get(sym);
        if (cachedFallback) {
          results[sym] = cachedFallback.data;
          continue;
        }
        try {
          const row = db.prepare('SELECT price, change, percent_change FROM latest_prices WHERE symbol = ?').get(sym);
          if (row) {
            results[sym] = {
              symbol: sym,
              price: Number(row.price.toFixed(4)),
              change: Number((row.change ?? 0).toFixed(4)),
              percentChange: Number((row.percent_change ?? 0).toFixed(2)),
              dayHigh: null,
              dayLow: null,
              fiftyTwoWeekHigh: null,
              fiftyTwoWeekLow: null,
              shortName: sym,
              exchange: '',
              marketState: 'CLOSED'
            };
          }
        } catch {}
      }
    }

    return c.json(results);
  } catch (error) {
    console.error('[quote-batch] Error:', error);
    return c.json({ error: 'Failed to fetch batch quotes' }, 500);
  }
});

export { pricesRoutes };
