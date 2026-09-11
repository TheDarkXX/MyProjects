import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';

export const drawingsRoutes = new Hono();

// Require auth for all drawings endpoints
drawingsRoutes.use('*', authMiddleware);

/**
 * GET /api/drawings/:symbol
 * Returns horizontal lines and trendlines for the symbol
 */
drawingsRoutes.get('/:symbol', async (c) => {
  try {
    const rawSymbol = c.req.param('symbol');
    if (!rawSymbol || rawSymbol.trim() === '') {
      return c.json({ error: 'Symbol is required' }, 400);
    }
    const symbol = rawSymbol.trim().toUpperCase();

    const row = db.prepare(`
      SELECT symbol, horizontal_lines, trend_lines, updated_at
      FROM chart_drawings
      WHERE symbol = ?
    `).get(symbol);

    if (!row) {
      return c.json({
        symbol,
        horizontalLines: [],
        trendLines: [],
        updatedAt: null,
      });
    }

    let horizontalLines = [];
    let trendLines = [];

    try {
      horizontalLines = JSON.parse(row.horizontal_lines || '[]');
    } catch (e) {}

    try {
      trendLines = JSON.parse(row.trend_lines || '[]');
    } catch (e) {}

    return c.json({
      symbol,
      horizontalLines,
      trendLines,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error('[Drawings API] GET Error:', err);
    return c.json({ error: 'Failed to fetch drawings', message: err.message }, 500);
  }
});

/**
 * POST /api/drawings/:symbol
 * Saves horizontal lines and trendlines for the symbol (Atomic Upsert)
 */
drawingsRoutes.post('/:symbol', async (c) => {
  try {
    const rawSymbol = c.req.param('symbol');
    if (!rawSymbol || rawSymbol.trim() === '') {
      return c.json({ error: 'Symbol is required' }, 400);
    }
    const symbol = rawSymbol.trim().toUpperCase();

    const body = await c.req.json();
    const horizontalLines = Array.isArray(body.horizontalLines) ? body.horizontalLines : [];
    const trendLines = Array.isArray(body.trendLines) ? body.trendLines : [];

    const stmt = db.prepare(`
      INSERT INTO chart_drawings (symbol, horizontal_lines, trend_lines, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(symbol) DO UPDATE SET
        horizontal_lines = excluded.horizontal_lines,
        trend_lines = excluded.trend_lines,
        updated_at = datetime('now')
    `);

    stmt.run(symbol, JSON.stringify(horizontalLines), JSON.stringify(trendLines));

    return c.json({
      success: true,
      symbol,
      horizontalCount: horizontalLines.length,
      trendLineCount: trendLines.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Drawings API] POST Error:', err);
    return c.json({ error: 'Failed to save drawings', message: err.message }, 500);
  }
});

/**
 * DELETE /api/drawings/:symbol
 * Clears all drawings for the symbol
 */
drawingsRoutes.delete('/:symbol', async (c) => {
  try {
    const rawSymbol = c.req.param('symbol');
    if (!rawSymbol || rawSymbol.trim() === '') {
      return c.json({ error: 'Symbol is required' }, 400);
    }
    const symbol = rawSymbol.trim().toUpperCase();

    db.prepare(`DELETE FROM chart_drawings WHERE symbol = ?`).run(symbol);

    return c.json({ success: true, symbol });
  } catch (err) {
    console.error('[Drawings API] DELETE Error:', err);
    return c.json({ error: 'Failed to delete drawings', message: err.message }, 500);
  }
});
