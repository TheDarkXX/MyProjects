import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';

const blueprintsRoutes = new Hono();

blueprintsRoutes.use('*', authMiddleware);

// GET /api/blueprints/:portfolioId - Get all blueprints for a portfolio
blueprintsRoutes.get('/:portfolioId', async (c) => {
    try {
        const portfolioId = c.req.param('portfolioId');
        const stmt = db.prepare('SELECT * FROM portfolio_blueprints WHERE portfolio_id = ? ORDER BY target_percent DESC');
        const blueprints = stmt.all(portfolioId);
        return c.json(blueprints);
    } catch (err) {
        console.error('Error fetching blueprints:', err);
        return c.json({ error: err.message }, 500);
    }
});

// POST /api/blueprints/:portfolioId - Create or update a blueprint entry (Upsert)
blueprintsRoutes.post('/:portfolioId', async (c) => {
    try {
        const portfolioId = c.req.param('portfolioId');
        const body = await c.req.json();
        const { symbol, target_percent, target_price, status, category, notes } = body;

        if (!symbol) {
            return c.json({ error: 'Symbol is required' }, 400);
        }

        let finalCategory = category;
        if (!finalCategory || finalCategory === 'Custom') {
            finalCategory = symbol.toUpperCase() === 'CASH' ? 'Cash' : 'Compounders';
        }

        const stmt = db.prepare(`
            INSERT INTO portfolio_blueprints 
            (portfolio_id, symbol, target_percent, target_price, status, category, notes, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(portfolio_id, symbol) DO UPDATE SET 
                target_percent = excluded.target_percent,
                target_price = excluded.target_price,
                status = excluded.status,
                category = excluded.category,
                notes = excluded.notes,
                updated_at = datetime('now')
        `);

        stmt.run(portfolioId, symbol, target_percent || 0, target_price || null, status || 'OWNED', finalCategory || 'Core', notes || null);
        
        const updated = db.prepare('SELECT * FROM portfolio_blueprints WHERE portfolio_id = ? AND symbol = ?').get(portfolioId, symbol);
        return c.json(updated, 201);
    } catch (err) {
        console.error('Error upserting blueprint:', err);
        return c.json({ error: err.message }, 500);
    }
});

// PUT /api/blueprints/:portfolioId/:symbol - Update specific blueprint entry
blueprintsRoutes.put('/:portfolioId/:symbol', async (c) => {
    try {
        const portfolioId = c.req.param('portfolioId');
        const symbol = c.req.param('symbol');
        const body = await c.req.json();
        const { symbol: new_symbol, target_percent, target_price, status, category, notes } = body;

        const current = db.prepare('SELECT * FROM portfolio_blueprints WHERE portfolio_id = ? AND symbol = ?').get(portfolioId, symbol);
        if (!current) {
            return c.json({ error: 'Blueprint entry not found' }, 404);
        }

        const nextSymbol = new_symbol ? new_symbol.toUpperCase() : symbol;
        const stmt = db.prepare(`
            UPDATE portfolio_blueprints 
            SET symbol = ?,
                target_percent = COALESCE(?, target_percent),
                target_price = COALESCE(?, target_price),
                status = COALESCE(?, status),
                category = COALESCE(?, category),
                notes = COALESCE(?, notes),
                updated_at = datetime('now')
            WHERE portfolio_id = ? AND symbol = ?
        `);
        
        stmt.run(
            nextSymbol,
            target_percent !== undefined ? target_percent : null, 
            target_price !== undefined ? target_price : null, 
            status !== undefined ? status : null, 
            category !== undefined ? category : null, 
            notes !== undefined ? notes : null, 
            portfolioId, symbol
        );

        const updated = db.prepare('SELECT * FROM portfolio_blueprints WHERE portfolio_id = ? AND symbol = ?').get(portfolioId, nextSymbol);
        return c.json(updated);
    } catch (err) {
        console.error('Error updating blueprint:', err);
        return c.json({ error: err.message }, 500);
    }
});

// DELETE /api/blueprints/:portfolioId/:symbol - Delete a blueprint entry
blueprintsRoutes.delete('/:portfolioId/:symbol', async (c) => {
    try {
        const portfolioId = c.req.param('portfolioId');
        const symbol = c.req.param('symbol');
        db.prepare('DELETE FROM portfolio_blueprints WHERE portfolio_id = ? AND symbol = ?').run(portfolioId, symbol);
        return c.json({ success: true, message: `Deleted ${symbol} from blueprint` });
    } catch (err) {
        console.error('Error deleting blueprint:', err);
        return c.json({ error: err.message }, 500);
    }
});

// POST /api/blueprints/:portfolioId/auto-generate - Auto-generate blueprint from current holdings
blueprintsRoutes.post('/:portfolioId/auto-generate', async (c) => {
    try {
        const portfolioId = c.req.param('portfolioId');
        
        const txs = db.prepare("SELECT symbol, type, amount, price FROM transactions WHERE portfolio_id = ? AND status = 'CONFIRMED'").all(portfolioId);
        
        const holdings = {};
        let totalValue = 0;
        
        txs.forEach(tx => {
            if (!holdings[tx.symbol]) {
                holdings[tx.symbol] = { shares: 0, costBase: 0 };
            }
            if (tx.type === 'BUY') {
                holdings[tx.symbol].shares += tx.amount;
                holdings[tx.symbol].costBase += (tx.amount * tx.price);
            } else if (tx.type === 'SELL') {
                holdings[tx.symbol].shares -= tx.amount;
            }
        });

        const latestPrices = db.prepare("SELECT symbol, price FROM latest_prices").all();
        const priceMap = {};
        latestPrices.forEach(lp => priceMap[lp.symbol] = lp.price);

        const activeHoldings = [];
        for (const [symbol, data] of Object.entries(holdings)) {
            if (data.shares > 0) {
                const currentPrice = priceMap[symbol] || (data.costBase / data.shares);
                const value = data.shares * currentPrice;
                activeHoldings.push({ symbol, value });
                totalValue += value;
            }
        }

        if (totalValue === 0) {
            return c.json({ error: 'No active holdings to generate blueprint from' }, 400);
        }

        const results = [];
        const upsertStmt = db.prepare(`
            INSERT INTO portfolio_blueprints (portfolio_id, symbol, target_percent, status, category, updated_at)
            VALUES (?, ?, ?, 'OWNED', ?, datetime('now'))
            ON CONFLICT(portfolio_id, symbol) DO UPDATE SET 
                target_percent = excluded.target_percent,
                status = 'OWNED',
                category = excluded.category,
                updated_at = datetime('now')
        `);

        db.transaction(() => {
            for (const holding of activeHoldings) {
                const targetPercent = parseFloat(((holding.value / totalValue) * 100).toFixed(2));
                const category = holding.symbol.toUpperCase() === 'CASH' ? 'Cash' : 'Compounders';
                upsertStmt.run(portfolioId, holding.symbol, targetPercent, category);
                results.push({ symbol: holding.symbol, targetPercent, category });
            }
        })();

        return c.json({ success: true, message: 'Blueprint generated successfully', data: results });
    } catch (err) {
        console.error('Error auto-generating blueprint:', err);
        return c.json({ error: err.message }, 500);
    }
});

export { blueprintsRoutes };
