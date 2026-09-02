import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';

const metadataRoutes = new Hono();
metadataRoutes.use('*', authMiddleware);

metadataRoutes.get('/', (c) => {
  const symbols = c.req.query('symbols')?.split(',') || [];
  if (symbols.length === 0) return c.json({});

  try {
    const placeholders = symbols.map(() => '?').join(',');
    const results = db.prepare(`SELECT * FROM stock_metadata WHERE symbol IN (${placeholders})`).all(...symbols);
    
    const map = {};
    for (const r of results) {
      map[r.symbol] = r;
    }
    return c.json(map);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch metadata' }, 500);
  }
});

export { metadataRoutes };
