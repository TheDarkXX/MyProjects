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
 * Get Watchlist symbols from project2x_quotas
 */
function getWatchlistSymbols() {
  try {
    const rows = db.prepare('SELECT DISTINCT symbol FROM project2x_quotas WHERE status != "inactive"').all();
    if (rows && rows.length > 0) {
      return rows.map((r) => r.symbol);
    }
  } catch (e) {
    console.warn('[marketRoutes] Could not fetch project2x_quotas:', e.message);
  }
  // Fallback to stock_metadata or holdings
  try {
    const rows = db.prepare('SELECT DISTINCT symbol FROM stock_metadata LIMIT 20').all();
    return rows.map((r) => r.symbol);
  } catch {
    return ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA'];
  }
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
  let scope = (c.req.query('scope') || 'sp100').toLowerCase();
  // Normalize legacy scope 'top50' to 'sp100'
  if (scope === 'top50') scope = 'sp100';

  const now = Date.now();
  const ttl = SCOPE_TTLS[scope] || SCOPE_TTLS.default;

  const cached = heatmapCaches.get(scope);
  if (cached && now - cached.timestamp < ttl) {
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
      symbols = getWatchlistSymbols();
      for (const s of symbols) {
        constituentMap.set(s, {
          symbol: s,
          name: s,
          sector: 'Watchlist',
          domain: `${s.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
        });
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
