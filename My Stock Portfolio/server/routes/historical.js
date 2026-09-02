import { Hono } from 'hono';
import { db } from '../db/init.js';
import { fetchPolygonHistorical } from '../services/polygon.js';
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
    const getCached = db.prepare(`SELECT * FROM historical_prices WHERE symbol = ? AND date >= ? AND date <= ?`);
    const insertCache = db.prepare(`INSERT OR REPLACE INTO historical_prices (symbol, date, price) VALUES (?, ?, ?)`);
    
    for (const symbol of symbols) {
      const cached = getCached.all(symbol, from, to);
      
      // If we have enough cached data, return it
      // In a real app we'd verify gapless coverage, but for this MVP:
      if (cached.length > 0) {
        results[symbol] = cached;
      } else {
        // Fetch from polygon
        const data = await fetchPolygonHistorical(symbol, 1, 'day', from, to);
        if (data && data.results) {
          const transformed = data.results.map(r => {
            const date = new Date(r.t).toISOString().split('T')[0];
            return { symbol, date, price: r.c };
          });
          
          // Cache it
          const insertTx = db.transaction((rows) => {
            for (const r of rows) {
              insertCache.run(r.symbol, r.date, r.price);
            }
          });
          insertTx(transformed);
          
          results[symbol] = transformed;
        } else {
          results[symbol] = [];
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
