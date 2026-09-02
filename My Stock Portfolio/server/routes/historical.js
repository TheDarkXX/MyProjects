import { Hono } from 'hono';
import { db } from '../db/init.js';
import { fetchYahooHistorical } from '../services/yahoo.js';
import { authMiddleware } from './auth.js';

const historicalRoutes = new Hono();

historicalRoutes.use('*', authMiddleware);

historicalRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { symbols, from, to } = body;
    
    if (!Array.isArray(symbols) || !from || !to) {
      return c.json({ error: 'symbols, from, and to are required' }, 400);
    }
    
    const results = {};
    
    // For local MVP, we check cache first or fetch.
    const getCached = db.prepare(`SELECT * FROM historical_prices WHERE symbol = ? AND date >= ? AND date <= ? ORDER BY date ASC`);
    const insertCache = db.prepare(`INSERT OR REPLACE INTO historical_prices (symbol, date, price) VALUES (?, ?, ?)`);
    
    for (const symbol of symbols) {
      const cached = getCached.all(symbol, from, to);
      
      // Check if cache exists and starts near the requested 'from' date (within 7 days)
      const coversFrom = cached.length > 0 && new Date(cached[0].date).getTime() <= (new Date(from).getTime() + 7 * 24 * 60 * 60 * 1000);
      
      if (coversFrom) {
        results[symbol] = cached;
      } else {
        // Fetch from Yahoo
        const data = await fetchYahooHistorical(symbol, from, to);
        if (data && data.length > 0) {
          // Cache it
          const insertTx = db.transaction((rows) => {
            for (const r of rows) {
              insertCache.run(r.symbol, r.date, r.price);
            }
          });
          insertTx(data);
          
          results[symbol] = data;
        } else {
          results[symbol] = cached;
        }
      }
    }
    
    return c.json(results);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch historical data' }, 500);
  }
});

export { historicalRoutes };
