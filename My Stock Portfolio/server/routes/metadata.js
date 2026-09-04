import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';

const metadataRoutes = new Hono();
metadataRoutes.use('*', authMiddleware);

metadataRoutes.get('/', async (c) => {
  const rawSymbols = c.req.query('symbols')?.split(',') || [];
  const symbols = rawSymbols.map(s => s.trim().toUpperCase()).filter(Boolean);
  if (symbols.length === 0) return c.json({});

  try {
    const placeholders = symbols.map(() => '?').join(',');
    const results = db.prepare(`SELECT * FROM stock_metadata WHERE symbol IN (${placeholders})`).all(...symbols);
    
    const map = {};
    for (const r of results) {
      map[r.symbol] = r;
    }

    // Check if any symbols are missing or lack dividend data
    const missingOrEmpty = symbols.filter(sym => !map[sym] || (map[sym].annual_dividend === 0 && map[sym].dividend_yield === 0));

    if (missingOrEmpty.length > 0) {
      const { fetchYahooDividend } = await import('../services/yahoo.js');
      const upsertStmt = db.prepare(`
        INSERT INTO stock_metadata (symbol, dividend_yield, annual_dividend, updated_at) 
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(symbol) DO UPDATE SET 
          dividend_yield = excluded.dividend_yield, 
          annual_dividend = excluded.annual_dividend,
          updated_at = datetime('now')
      `);

      await Promise.all(missingOrEmpty.map(async (sym) => {
        try {
          const divInfo = await fetchYahooDividend(sym);
          if (divInfo && (divInfo.dividendYield > 0 || divInfo.annualDividend > 0)) {
            upsertStmt.run(sym, divInfo.dividendYield, divInfo.annualDividend);
            if (!map[sym]) {
              map[sym] = { symbol: sym, dividend_yield: divInfo.dividendYield, annual_dividend: divInfo.annualDividend };
            } else {
              map[sym].dividend_yield = divInfo.dividendYield;
              map[sym].annual_dividend = divInfo.annualDividend;
            }
          }
        } catch (e) {
          console.error(`[Metadata] Error fetching dividend for ${sym}:`, e.message);
        }
      }));
    }

    return c.json(map);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Failed to fetch metadata' }, 500);
  }
});

export { metadataRoutes };
