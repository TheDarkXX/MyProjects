import { Hono } from 'hono';
import { fetchYahooExchangeRate } from '../services/yahoo.js';
import { fetchPolygonExchangeRate } from '../services/polygon.js';
import { authMiddleware } from './auth.js';

const exchangeRoutes = new Hono();

exchangeRoutes.use('*', authMiddleware);

exchangeRoutes.get('/', async (c) => {
  const from = c.req.query('from') || 'USD';
  const to = c.req.query('to') || 'THB';
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];

  try {
    // 1. Prioritize Yahoo Finance (real-time, free, reliable)
    const yahooData = await fetchYahooExchangeRate(from, to);
    if (yahooData && yahooData.rate) {
      return c.json(yahooData);
    }

    // 2. Fallback to Polygon
    const data = await fetchPolygonExchangeRate(from, to, date);
    if (data && data.converted) {
      return c.json({ rate: data.converted, from, to, date, source: 'polygon' });
    }

    return c.json({ rate: 34.5, from, to, date, source: 'default' });
  } catch (error) {
    return c.json({ rate: 34.5, from, to, date, source: 'default', error: error.message });
  }
});

export { exchangeRoutes };
