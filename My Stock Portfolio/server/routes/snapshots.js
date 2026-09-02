import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';

const snapshotsRoutes = new Hono();
snapshotsRoutes.use('*', authMiddleware);

snapshotsRoutes.get('/:portfolio_id', (c) => {
  const portfolioId = c.req.param('portfolio_id');
  try {
    const snapshots = db.prepare(`SELECT * FROM portfolio_snapshots WHERE portfolio_id = ? ORDER BY date ASC`).all(portfolioId);
    return c.json(snapshots);
  } catch (error) {
    return c.json({ error: 'Failed to fetch snapshots' }, 500);
  }
});

snapshotsRoutes.post('/backfill', async (c) => {
  try {
    const { portfolio_id, snapshots } = await c.req.json();
    if (!portfolio_id || !Array.isArray(snapshots)) {
      return c.json({ error: 'portfolio_id and snapshots array required' }, 400);
    }

    const insertTx = db.transaction((snaps) => {
      // Clear old for this portfolio
      db.prepare(`DELETE FROM portfolio_snapshots WHERE portfolio_id = ?`).run(portfolio_id);
      
      const insert = db.prepare(`INSERT INTO portfolio_snapshots (portfolio_id, date, value) VALUES (?, ?, ?)`);
      for (const s of snaps) {
        insert.run(portfolio_id, s.date, s.value);
      }
    });
    
    insertTx(snapshots);
    return c.json({ success: true, count: snapshots.length });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to backfill snapshots' }, 500);
  }
});

export { snapshotsRoutes };
