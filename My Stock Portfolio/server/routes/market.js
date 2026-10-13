import { Hono } from 'hono';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YahooFinance from 'yahoo-finance2';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export const marketRoutes = new Hono();

// Require auth
marketRoutes.use('*', authMiddleware);

// In-memory cache for heatmap data
const heatmapCaches = new Map();

// Scope-specific TTLs
const SCOPE_TTLS = {
  sp100: 120 * 1000,     // 2 minutes
  sp500: 180 * 1000,     // 3 minutes
  nasdaq100: 60 * 1000,  // 1 minute
  watchlist: 30 * 1000,  // 30 seconds
  default: 60 * 1000
};

/**
 * Load constituents based on scope
 */
function getConstituentsForScope(scope) {
  let filename = 'sp500_top100.json';
  if (scope === 'sp500') {
    filename = 'sp500_full.json';
  } else if (scope === 'nasdaq100') {
    filename = 'nasdaq100.json';
  } else if (scope === 'sp100' || scope === 'top50') {
    filename = 'sp500_top100.json';
  }

  const jsonPath = path.join(__dirname, `../data/${filename}`);
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[marketRoutes] Failed to parse ${filename}:`, err);
    }
  }

  // Fallback to top50 legacy if top100 not found
  const legacyPath = path.join(__dirname, '../data/sp500_top50.json');
  if (fs.existsSync(legacyPath)) {
    try {
      return JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    } catch {}
  }
  return [];
}

/**
 * Known watchlist metadata with real industry sectors (Tech / Semi / Industrials / Consumer)
 */
const WATCHLIST_PRESET_META = {
  NVDA: { name: 'NVIDIA Corporation', sector: 'Semiconductors', domain: 'nvidia.com' },
  TSM: { name: 'Taiwan Semiconductor Manufacturing', sector: 'Semiconductors', domain: 'tsmc.com' },
  AVGO: { name: 'Broadcom Inc.', sector: 'Semiconductors', domain: 'broadcom.com' },
  KLAC: { name: 'KLA Corporation', sector: 'Semiconductors', domain: 'kla.com' },
  ALAB: { name: 'Astera Labs Inc.', sector: 'Semiconductors', domain: 'asteralabs.com' },
  ANET: { name: 'Arista Networks Inc.', sector: 'Technology', domain: 'arista.com' },
  APH: { name: 'Amphenol Corporation', sector: 'Technology', domain: 'amphenol.com' },
  CRWD: { name: 'CrowdStrike Holdings Inc.', sector: 'Technology', domain: 'crowdstrike.com' },
  PLTR: { name: 'Palantir Technologies Inc.', sector: 'Technology', domain: 'palantir.com' },
  RBRK: { name: 'Rubrik Inc.', sector: 'Technology', domain: 'rubrik.com' },
  VRT: { name: 'Vertiv Holdings Co.', sector: 'Industrials', domain: 'vertiv.com' },
  STRL: { name: 'Sterling Infrastructure Inc.', sector: 'Industrials', domain: 'strl.com' },
  MELI: { name: 'MercadoLibre Inc.', sector: 'Consumer Cyclical', domain: 'mercadolibre.com' }
};

// Explicitly excluded tickers (per user directive: CLS, RKLB, SCHG removed)
const WATCHLIST_EXCLUDED = new Set(['CLS', 'RKLB', 'SCHG', 'QQQM', 'CASH']);

/**
 * Get Watchlist constituents combining:
 * 1. Base 3-Year 100% Target Stocks (Project 2X / Core & Moonshot Doublers)
 * 2. Active Portfolio Holdings (from transactions where net quantity > 0)
 * 3. Blueprints / Share Quotas from DB
 * Filtered by user exclusions (CLS, RKLB, SCHG)
 * Classified by true industry sectors (Tech / Semi / Industrials / Consumer)
 */
function getWatchlistConstituents() {
  const symbols = new Set(Object.keys(WATCHLIST_PRESET_META));

  // 1. Fetch from project2x_share_quotas
  try {
    const quotaRows = db.prepare("SELECT DISTINCT symbol FROM project2x_share_quotas WHERE status != 'inactive'").all();
    for (const r of quotaRows) {
      if (r.symbol && !WATCHLIST_EXCLUDED.has(r.symbol.toUpperCase()) && !r.symbol.includes('=') && !r.symbol.includes('^')) {
        symbols.add(r.symbol.toUpperCase());
      }
    }
  } catch (e) {
    console.warn('[marketRoutes] Could not fetch project2x_share_quotas:', e.message);
  }

  // 2. Fetch from portfolio_blueprints
  try {
    const bpRows = db.prepare('SELECT DISTINCT symbol FROM portfolio_blueprints').all();
    for (const r of bpRows) {
      if (r.symbol && !WATCHLIST_EXCLUDED.has(r.symbol.toUpperCase()) && !r.symbol.includes('=') && !r.symbol.includes('^')) {
        symbols.add(r.symbol.toUpperCase());
      }
    }
  } catch (e) {
    console.warn('[marketRoutes] Could not fetch portfolio_blueprints:', e.message);
  }

  // 3. Fetch active holdings from transactions
  try {
    const txRows = db.prepare(`
      SELECT symbol, SUM(CASE WHEN type = 'BUY' THEN amount WHEN type = 'SELL' THEN -amount ELSE 0 END) as net_qty
      FROM transactions
      WHERE symbol != 'CASH'
      GROUP BY symbol
      HAVING net_qty > 0.0001
    `).all();
    for (const r of txRows) {
      if (r.symbol && !WATCHLIST_EXCLUDED.has(r.symbol.toUpperCase()) && !r.symbol.includes('=') && !r.symbol.includes('^')) {
        symbols.add(r.symbol.toUpperCase());
      }
    }
  } catch (e) {
    console.warn('[marketRoutes] Could not fetch transactions holdings:', e.message);
  }

  // Enforce exclusions
  for (const ex of WATCHLIST_EXCLUDED) {
    symbols.delete(ex);
  }

  const constituents = [];
  for (const sym of symbols) {
    if (WATCHLIST_PRESET_META[sym]) {
      const p = WATCHLIST_PRESET_META[sym];
      constituents.push({
        symbol: sym,
        name: p.name,
        sector: p.sector,
        domain: p.domain
      });
    } else {
      // Dynamic fallback for any newly added symbol
      let name = sym;
      let sector = 'Technology';
      let domain = `${sym.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

      try {
        const sf = db.prepare('SELECT sector, industry FROM symbol_fundamentals WHERE symbol = ?').get(sym);
        if (sf) {
          if (sf.industry && sf.industry.toLowerCase().includes('semiconductor')) {
            sector = 'Semiconductors';
          } else if (sf.sector === 'Technology' || sf.sector === 'Technology services') {
            sector = 'Technology';
          } else if (sf.sector === 'Industrials' || sf.sector === 'Producer manufacturing') {
            sector = 'Industrials';
          } else if (sf.sector === 'Consumer Cyclical' || sf.sector === 'Retail trade') {
            sector = 'Consumer Cyclical';
          } else if (sf.sector) {
            sector = sf.sector;
          }
        }
        const meta = db.prepare('SELECT name FROM stock_metadata WHERE symbol = ?').get(sym);
        if (meta && meta.name) {
          name = meta.name;
        }
      } catch {}

      constituents.push({
        symbol: sym,
        name,
        sector,
        domain
      });
    }
  }

  return constituents;
}

/**
 * Normalize market state to standard 4 states
 */
function normalizeMarketState(state) {
  if (!state) return 'CLOSED';
  const s = String(state).toUpperCase();
  if (s.includes('REGULAR')) return 'REGULAR';
  if (s.includes('PRE')) return 'PRE';
  if (s.includes('POST')) return 'POST';
  return 'CLOSED';
}

/**
 * Determine US market state (REGULAR, PRE, POST, CLOSED)
 */
function determineMarketState(sampleQuote) {
  if (sampleQuote?.marketState) {
    return normalizeMarketState(sampleQuote.marketState);
  }
  // Calculate from current ET time
  const now = new Date();
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etStr);
  const day = etDate.getDay(); // 0 = Sun, 6 = Sat
  if (day === 0 || day === 6) return 'CLOSED';

  const hours = etDate.getHours();
  const minutes = etDate.getMinutes();
  const totalMins = hours * 60 + minutes;

  if (totalMins >= 4 * 60 && totalMins < 9 * 60 + 30) return 'PRE';
  if (totalMins >= 9 * 60 + 30 && totalMins < 16 * 60) return 'REGULAR';
  if (totalMins >= 16 * 60 && totalMins < 20 * 60) return 'POST';
  return 'CLOSED';
}

/**
 * Split array into chunks
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * GET /api/market/heatmap?scope=sp100|sp500|nasdaq100|watchlist
 */
marketRoutes.get('/heatmap', async (c) => {
  let scope = (c.req.query('scope') || 'watchlist').toLowerCase();
  // Normalize legacy scope 'top50' to 'sp100'
  if (scope === 'top50') scope = 'sp100';

  const forceRefresh = c.req.query('refresh') === 'true';
  const now = Date.now();
  const ttl = SCOPE_TTLS[scope] || SCOPE_TTLS.default;

  const cached = heatmapCaches.get(scope);
  if (!forceRefresh && cached && now - cached.timestamp < ttl) {
    return c.json({
      scope,
      cached: true,
      cacheAgeSeconds: Math.floor((now - cached.timestamp) / 1000),
      lastUpdated: new Date(cached.timestamp).toISOString(),
      marketState: cached.marketState || 'CLOSED',
      items: cached.data
    });
  }

  try {
    const constituentMap = new Map();
    let symbols = [];

    if (scope === 'watchlist') {
      const list = getWatchlistConstituents();
      for (const item of list) {
        constituentMap.set(item.symbol, item);
        symbols.push(item.symbol);
      }
    } else {
      const list = getConstituentsForScope(scope);
      for (const item of list) {
        constituentMap.set(item.symbol, item);
        symbols.push(item.symbol);
      }
    }

    if (symbols.length === 0) {
      return c.json({ scope, cached: false, marketState: 'CLOSED', items: [] });
    }

    // Chunk symbols into batches of 100 to avoid API timeouts
    const chunks = chunkArray(symbols, 100);
    const allQuotes = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const quotes = await yahooFinance.quote(chunk);
        const quoteArray = Array.isArray(quotes) ? quotes : [quotes];
        allQuotes.push(...quoteArray);
      } catch (chunkErr) {
        console.warn(`[marketRoutes] Error fetching chunk ${i + 1}/${chunks.length} for ${scope}:`, chunkErr.message);
      }
      // Small delay between chunks if multiple chunks
      if (i < chunks.length - 1) {
        await sleep(200);
      }
    }

    const items = [];
    let detectedMarketState = null;

    for (const q of allQuotes) {
      if (!q || !q.symbol) continue;
      if (!detectedMarketState && q.marketState) {
        detectedMarketState = q.marketState;
      }
      const meta = constituentMap.get(q.symbol) || {
        name: q.shortName || q.symbol,
        sector: 'Other',
        domain: `${q.symbol.toLowerCase()}.com`
      };
      const price = q.regularMarketPrice ?? 0;
      const change = q.regularMarketChange ?? 0;
      const percentChange = q.regularMarketChangePercent ?? 0;
      const marketCap = q.marketCap || 1000000000;

      items.push({
        symbol: q.symbol,
        name: meta.name || q.shortName || q.symbol,
        sector: meta.sector || 'Other',
        domain: meta.domain || `${q.symbol.toLowerCase()}.com`,
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        percentChange: Number(percentChange.toFixed(2)),
        marketCap
      });
    }

    // Sort items by marketCap descending
    items.sort((a, b) => b.marketCap - a.marketCap);

    const finalMarketState = normalizeMarketState(detectedMarketState || determineMarketState(allQuotes[0]));

    // Save to in-memory cache
    heatmapCaches.set(scope, {
      timestamp: now,
      marketState: finalMarketState,
      data: items
    });

    return c.json({
      scope,
      cached: false,
      cacheAgeSeconds: 0,
      lastUpdated: new Date(now).toISOString(),
      marketState: finalMarketState,
      items
    });
  } catch (error) {
    console.error(`[marketRoutes] Error generating heatmap for ${scope}:`, error);
    // If cache exists even if expired, fallback gracefully
    if (cached) {
      return c.json({
        scope,
        cached: true,
        stale: true,
        cacheAgeSeconds: Math.floor((now - cached.timestamp) / 1000),
        lastUpdated: new Date(cached.timestamp).toISOString(),
        marketState: cached.marketState || 'CLOSED',
        items: cached.data
      });
    }
    return c.json({ error: 'Failed to load heatmap data', details: error.message }, 500);
  }
});
