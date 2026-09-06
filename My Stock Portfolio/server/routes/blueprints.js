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

// ==========================================
// Custom Templates (Persistent in SQLite)
// ==========================================

// GET /api/blueprints/:portfolioId/templates - Get custom templates (specific to portfolio + shared/global)
blueprintsRoutes.get('/:portfolioId/templates', async (c) => {
    try {
        const portfolioId = c.req.param('portfolioId');
        const rows = db.prepare(`
            SELECT * FROM custom_templates 
            WHERE portfolio_id = ? OR portfolio_id IS NULL OR portfolio_id = ''
            ORDER BY updated_at DESC
        `).all(portfolioId);

        const templates = rows.map(r => ({
            id: r.id,
            portfolio_id: r.portfolio_id,
            name: r.name,
            description: r.description || '',
            created_at: r.created_at,
            updated_at: r.updated_at,
            entries: JSON.parse(r.entries_json || '[]')
        }));

        return c.json(templates);
    } catch (err) {
        console.error('Error fetching custom templates:', err);
        return c.json({ error: err.message }, 500);
    }
});

// POST /api/blueprints/:portfolioId/templates - Save or update a custom template
blueprintsRoutes.post('/:portfolioId/templates', async (c) => {
    try {
        const portfolioId = c.req.param('portfolioId');
        const body = await c.req.json();
        const { id, name, description, entries, is_global } = body;

        if (!name || !entries || !Array.isArray(entries)) {
            return c.json({ error: 'Name and entries array are required' }, 400);
        }

        const templateId = id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const targetPortId = is_global ? null : (body.portfolio_id || portfolioId);
        const entriesJson = JSON.stringify(entries);

        const stmt = db.prepare(`
            INSERT INTO custom_templates (id, portfolio_id, name, description, entries_json, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                portfolio_id = excluded.portfolio_id,
                name = excluded.name,
                description = excluded.description,
                entries_json = excluded.entries_json,
                updated_at = datetime('now')
        `);

        stmt.run(templateId, targetPortId, name.trim(), description || '', entriesJson);

        const row = db.prepare('SELECT * FROM custom_templates WHERE id = ?').get(templateId);
        return c.json({
            id: row.id,
            portfolio_id: row.portfolio_id,
            name: row.name,
            description: row.description,
            created_at: row.created_at,
            updated_at: row.updated_at,
            entries: JSON.parse(row.entries_json)
        }, 201);
    } catch (err) {
        console.error('Error saving custom template:', err);
        return c.json({ error: err.message }, 500);
    }
});

// DELETE /api/blueprints/:portfolioId/templates/:templateId - Delete a custom template
blueprintsRoutes.delete('/:portfolioId/templates/:templateId', async (c) => {
    try {
        const templateId = c.req.param('templateId');
        db.prepare('DELETE FROM custom_templates WHERE id = ?').run(templateId);
        return c.json({ success: true, message: `Deleted template ${templateId}` });
    } catch (err) {
        console.error('Error deleting template:', err);
        return c.json({ error: err.message }, 500);
    }
});

// ==========================================
// Blueprint Snapshots (Undo / History)
// ==========================================

// GET /api/blueprints/:portfolioId/snapshots/latest - Get latest snapshot for undo/restore
blueprintsRoutes.get('/:portfolioId/snapshots/latest', async (c) => {
    try {
        const portfolioId = c.req.param('portfolioId');
        const source = c.req.query('source'); // optional filter e.g. 'ai_advisor' or 'template_apply'

        let query = 'SELECT * FROM blueprint_snapshots WHERE portfolio_id = ?';
        const params = [portfolioId];
        if (source) {
            query += ' AND source = ?';
            params.push(source);
        }
        query += ' ORDER BY created_at DESC LIMIT 1';

        const row = db.prepare(query).get(...params);
        if (!row) {
            return c.json({ found: false });
        }

        return c.json({
            found: true,
            id: row.id,
            portfolio_id: row.portfolio_id,
            source: row.source,
            name: row.name,
            created_at: row.created_at,
            entries: JSON.parse(row.entries_json || '[]')
        });
    } catch (err) {
        console.error('Error fetching latest snapshot:', err);
        return c.json({ error: err.message }, 500);
    }
});

// POST /api/blueprints/:portfolioId/snapshots - Create a snapshot
blueprintsRoutes.post('/:portfolioId/snapshots', async (c) => {
    try {
        const portfolioId = c.req.param('portfolioId');
        const body = await c.req.json();
        const { source, name, entries } = body;

        if (!entries || !Array.isArray(entries)) {
            return c.json({ error: 'Entries array is required' }, 400);
        }

        const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const stmt = db.prepare(`
            INSERT INTO blueprint_snapshots (id, portfolio_id, source, name, entries_json, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);

        stmt.run(snapshotId, portfolioId, source || 'manual', name || '', JSON.stringify(entries));

        return c.json({
            success: true,
            id: snapshotId,
            portfolio_id: portfolioId,
            source: source || 'manual',
            name: name || ''
        }, 201);
    } catch (err) {
        console.error('Error saving blueprint snapshot:', err);
        return c.json({ error: err.message }, 500);
    }
});

export { blueprintsRoutes };

