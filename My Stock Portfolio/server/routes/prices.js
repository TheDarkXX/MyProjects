import { Hono } from 'hono';
import { db } from '../db/init.js';
import { updatePricesInCache } from '../services/finnhub.js';
import { authMiddleware } from './auth.js';

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

export { pricesRoutes };
