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
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * Load S&P Top 50 constituents from JSON
 */
function getTop50Constituents() {
  const jsonPath = path.join(__dirname, '../data/sp500_top50.json');
  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(raw);
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
 * GET /api/market/heatmap?scope=top50|watchlist
 */
marketRoutes.get('/heatmap', async (c) => {
  const scope = (c.req.query('scope') || 'top50').toLowerCase();
  const now = Date.now();

  const cached = heatmapCaches.get(scope);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return c.json({
      scope,
      cached: true,
      cacheAgeSeconds: Math.floor((now - cached.timestamp) / 1000),
      lastUpdated: new Date(cached.timestamp).toISOString(),
      items: cached.data
    });
  }

  try {
    let constituentMap = new Map();
    let symbols = [];

    if (scope === 'watchlist') {
      symbols = getWatchlistSymbols();
      for (const s of symbols) {
        constituentMap.set(s, { symbol: s, name: s, sector: 'Watchlist' });
      }
    } else {
      // Default top 50
      const list = getTop50Constituents();
      for (const item of list) {
        constituentMap.set(item.symbol, item);
        symbols.push(item.symbol);
      }
    }

    if (symbols.length === 0) {
      return c.json({ scope, cached: false, items: [] });
    }

    // Single batch quote call to Yahoo Finance (up to 100 symbols per request)
    const quotes = await yahooFinance.quote(symbols);
    const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

    const items = [];
    for (const q of quoteArray) {
      if (!q || !q.symbol) continue;
      const meta = constituentMap.get(q.symbol) || { name: q.shortName || q.symbol, sector: 'Other' };
      const price = q.regularMarketPrice ?? 0;
      const change = q.regularMarketChange ?? 0;
      const percentChange = q.regularMarketChangePercent ?? 0;
      const marketCap = q.marketCap || 1000000000;

      items.push({
        symbol: q.symbol,
        name: meta.name || q.shortName || q.symbol,
        sector: meta.sector || 'Other',
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        percentChange: Number(percentChange.toFixed(2)),
        marketCap
      });
    }

    // Sort items by marketCap descending
    items.sort((a, b) => b.marketCap - a.marketCap);

    // Save to in-memory cache
    heatmapCaches.set(scope, {
      timestamp: now,
      data: items
    });

    return c.json({
      scope,
      cached: false,
      cacheAgeSeconds: 0,
      lastUpdated: new Date(now).toISOString(),
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
        items: cached.data
      });
    }
    return c.json({ error: 'Failed to load heatmap data', details: error.message }, 500);
  }
});
