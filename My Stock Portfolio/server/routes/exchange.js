import { Hono } from 'hono';
import { fetchPolygonExchangeRate } from '../services/polygon.js';
import { authMiddleware } from './auth.js';

const exchangeRoutes = new Hono();

exchangeRoutes.use('*', authMiddleware);

exchangeRoutes.get('/', async (c) => {
  const from = c.req.query('from') || 'USD';
  const to = c.req.query('to') || 'THB';
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];

  try {
    const data = await fetchPolygonExchangeRate(from, to, date);
    if (data && data.converted) {
      return c.json({ rate: data.converted, from, to, date });
    }
    return c.json({ error: 'Failed to fetch rate' }, 500);
  } catch (error) {
    return c.json({ error: 'Failed to fetch exchange rate' }, 500);
  }
});

export { exchangeRoutes };
