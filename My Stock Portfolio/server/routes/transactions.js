import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';

const transactionsRoutes = new Hono();

transactionsRoutes.use('*', authMiddleware);

transactionsRoutes.get('/', (c) => {
  const portfolioId = c.req.query('portfolio_id');
  
  try {
    let txs;
    if (portfolioId) {
      txs = db.prepare(`SELECT * FROM transactions WHERE portfolio_id = ? ORDER BY date DESC, created_at DESC`).all(portfolioId);
    } else {
      txs = db.prepare(`SELECT * FROM transactions ORDER BY date DESC, created_at DESC`).all();
    }
    return c.json(txs);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch transactions' }, 500);
  }
});

transactionsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { portfolio_id, date, symbol, type, asset, amount, price, fee, stock_type, note, status } = body;
    
    if (!portfolio_id || !date || !symbol || !type || amount === undefined || price === undefined) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const insert = db.prepare(`
      INSERT INTO transactions (portfolio_id, date, symbol, type, asset, amount, price, fee, stock_type, note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = insert.run(
      portfolio_id, date, symbol, type, asset || 'Stock', amount, price, fee || 0, stock_type || null, note || '', status || 'CONFIRMED'
    );
    
    const newTx = db.prepare(`SELECT * FROM transactions WHERE rowid = ?`).get(info.lastInsertRowid);
    return c.json(newTx, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to create transaction' }, 500);
  }
});

transactionsRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json();
    const existing = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(id);
    
    if (!existing) return c.json({ error: 'Transaction not found' }, 404);

    const update = db.prepare(`
      UPDATE transactions 
      SET date = ?, symbol = ?, type = ?, asset = ?, amount = ?, price = ?, fee = ?, stock_type = ?, note = ?, status = ?
      WHERE id = ?
    `);
    
    update.run(
      body.date !== undefined ? body.date : existing.date,
      body.symbol !== undefined ? body.symbol : existing.symbol,
      body.type !== undefined ? body.type : existing.type,
      body.asset !== undefined ? body.asset : existing.asset,
      body.amount !== undefined ? body.amount : existing.amount,
      body.price !== undefined ? body.price : existing.price,
      body.fee !== undefined ? body.fee : existing.fee,
      body.stock_type !== undefined ? body.stock_type : existing.stock_type,
      body.note !== undefined ? body.note : existing.note,
      body.status !== undefined ? body.status : existing.status,
      id
    );
    
    const updatedTx = db.prepare(`SELECT * FROM transactions WHERE id = ?`).get(id);
    return c.json(updatedTx);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to update transaction' }, 500);
  }
});

transactionsRoutes.delete('/:id', (c) => {
  const id = c.req.param('id');
  try {
    db.prepare(`DELETE FROM transactions WHERE id = ?`).run(id);
    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to delete transaction' }, 500);
  }
});

// Bulk endpoints
transactionsRoutes.post('/bulk', async (c) => {
  try {
    const { action, transactions, ids } = await c.req.json();
    
    if (action === 'delete') {
      if (!Array.isArray(ids)) return c.json({ error: 'ids array required' }, 400);
      
      const deleteTx = db.transaction((txIds) => {
        const stmt = db.prepare(`DELETE FROM transactions WHERE id = ?`);
        for (const txId of txIds) {
          stmt.run(txId);
        }
      });
      
      deleteTx(ids);
      return c.json({ success: true, count: ids.length });
    } 
    else if (action === 'create') {
      if (!Array.isArray(transactions)) return c.json({ error: 'transactions array required' }, 400);
      
      const insertTx = db.transaction((txs) => {
        const stmt = db.prepare(`
          INSERT INTO transactions (portfolio_id, date, symbol, type, asset, amount, price, fee, stock_type, note, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const tx of txs) {
          stmt.run(
            tx.portfolio_id, tx.date, tx.symbol, tx.type, tx.asset || 'Stock', 
            tx.amount, tx.price, tx.fee || 0, tx.stock_type || null, tx.note || '', tx.status || 'CONFIRMED'
          );
        }
      });
      
      insertTx(transactions);
      return c.json({ success: true, count: transactions.length });
    }
    
    return c.json({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Bulk operation failed' }, 500);
  }
});

export { transactionsRoutes };
