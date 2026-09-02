import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';

const portfoliosRoutes = new Hono();

// Use auth middleware for all routes
portfoliosRoutes.use('*', authMiddleware);

portfoliosRoutes.get('/', (c) => {
  try {
    const portfolios = db.prepare(`SELECT * FROM portfolios ORDER BY created_at DESC`).all();
    return c.json(portfolios);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch portfolios' }, 500);
  }
});

portfoliosRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, description, icon, color_hex, initial_cash, base_currency, goal_amount, goal_currency } = body;
    
    if (!name) return c.json({ error: 'Name is required' }, 400);

    const insert = db.prepare(`
      INSERT INTO portfolios (name, description, icon, color_hex, initial_cash, base_currency, goal_amount, goal_currency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = insert.run(
      name, 
      description || '', 
      icon || '📁', 
      color_hex || '#64748B', 
      initial_cash || 0, 
      base_currency || 'USD', 
      goal_amount || 0, 
      goal_currency || 'USD'
    );
    
    const newPortfolio = db.prepare(`SELECT * FROM portfolios WHERE rowid = ?`).get(info.lastInsertRowid);
    return c.json(newPortfolio, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to create portfolio' }, 500);
  }
});

portfoliosRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const existing = db.prepare(`SELECT * FROM portfolios WHERE id = ?`).get(id);
    
    if (!existing) return c.json({ error: 'Portfolio not found' }, 404);

    const update = db.prepare(`
      UPDATE portfolios 
      SET name = ?, description = ?, icon = ?, color_hex = ?, initial_cash = ?, base_currency = ?, goal_amount = ?, goal_currency = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    update.run(
      body.name !== undefined ? body.name : existing.name,
      body.description !== undefined ? body.description : existing.description,
      body.icon !== undefined ? body.icon : existing.icon,
      body.color_hex !== undefined ? body.color_hex : existing.color_hex,
      body.initial_cash !== undefined ? body.initial_cash : existing.initial_cash,
      body.base_currency !== undefined ? body.base_currency : existing.base_currency,
      body.goal_amount !== undefined ? body.goal_amount : existing.goal_amount,
      body.goal_currency !== undefined ? body.goal_currency : existing.goal_currency,
      id
    );
    
    const updatedPortfolio = db.prepare(`SELECT * FROM portfolios WHERE id = ?`).get(id);
    return c.json(updatedPortfolio);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to update portfolio' }, 500);
  }
});

portfoliosRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  try {
    const deleteTx = db.transaction(() => {
      // Delete associated transactions first
      db.prepare(`DELETE FROM transactions WHERE portfolio_id = ?`).run(id);
      db.prepare(`DELETE FROM portfolio_snapshots WHERE portfolio_id = ?`).run(id);
      db.prepare(`DELETE FROM portfolios WHERE id = ?`).run(id);
    });
    
    deleteTx();
    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to delete portfolio' }, 500);
  }
});

export { portfoliosRoutes };
