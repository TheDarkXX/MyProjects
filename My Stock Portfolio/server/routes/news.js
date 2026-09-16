import { Hono } from 'hono';
import { db } from '../db/init.js';
import { 
  runNewsScan, 
  getPublicationTimingStats, 
  getTriageStats, 
  getWatchlistTickers,
  rescoreArticle,
  rescoreRecentArticles
} from '../services/newsRadar.js';

const newsRoutes = new Hono();

// GET /api/news — List news articles with smart filters
newsRoutes.get('/', (c) => {
  try {
    const portfolio = c.req.query('portfolio') || 'all'; // all | main | tiger | global
    const priority = c.req.query('priority') || 'all';   // all | the_must | good_to_know | optional
    const unreadOnly = c.req.query('unread_only') === 'true';
    const ticker = c.req.query('ticker');
    const limit = Math.min(parseInt(c.req.query('limit') || '200', 10), 1000);

    let query = 'SELECT * FROM news_intelligence WHERE 1=1';
    const params = [];

    // Filter by portfolio
    if (portfolio === 'main') {
      query += ` AND portfolio_tag IN ('main', 'dual')`;
    } else if (portfolio === 'tiger') {
      query += ` AND portfolio_tag IN ('tiger', 'dual')`;
    } else if (portfolio === 'global') {
      query += ` AND portfolio_tag = 'global'`;
    }

    // Filter by reading priority (4-Tier Support + Legacy compatibility)
    if (priority === 'the_must') {
      query += ` AND reading_priority = 'THE_MUST'`;
    } else if (priority === 'catalyst') {
      query += ` AND reading_priority = 'CATALYST'`;
    } else if (priority === 'watchlist') {
      query += ` AND reading_priority = 'WATCHLIST'`;
    } else if (priority === 'chatter') {
      query += ` AND reading_priority = 'CHATTER'`;
    } else if (priority === 'focus') {
      // The Must + Catalysts (all in-portfolio high-signal news)
      query += ` AND reading_priority IN ('THE_MUST', 'CATALYST')`;
    } else if (priority === 'good_to_know') {
      query += ` AND reading_priority IN ('CATALYST', 'GOOD_TO_KNOW')`;
    } else if (priority === 'optional') {
      query += ` AND reading_priority IN ('CHATTER', 'OPTIONAL')`;
    }

    // Filter by unread
    if (unreadOnly) {
      query += ` AND is_read = 0`;
    }

    // Filter by specific ticker or tag
    const tag = c.req.query('tag');
    if (ticker) {
      query += ` AND (ticker = ? OR triage_tags LIKE ?)`;
      params.push(ticker.toUpperCase(), `%"${ticker.toUpperCase()}"%`);
    }
    if (tag) {
      query += ` AND (triage_tags LIKE ? OR headline LIKE ? OR headline_th LIKE ? OR summary_th LIKE ?)`;
      params.push(`%${tag}%`, `%${tag}%`, `%${tag}%`, `%${tag}%`);
    }

    // Priority ordering: THE_MUST (1) > CATALYST (2) > WATCHLIST (3) > CHATTER (4)
    query += `
      ORDER BY 
        CASE reading_priority 
          WHEN 'THE_MUST' THEN 1 
          WHEN 'CATALYST' THEN 2 
          WHEN 'WATCHLIST' THEN 3 
          WHEN 'CHATTER' THEN 4 
          WHEN 'GOOD_TO_KNOW' THEN 2
          ELSE 5 
        END ASC,
        created_at DESC
      LIMIT ?
    `;
    params.push(limit);

    const items = db.prepare(query).all(...params);
    return c.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('[newsRoutes] Error fetching news:', error.message);
    return c.json({ error: 'Failed to fetch news', details: error.message }, 500);
  }
});

// GET /api/news/stats — Quick badge counters for UI and Dashboard
newsRoutes.get('/stats', (c) => {
  try {
    const stats = db.prepare(`
      SELECT 
        SUM(CASE WHEN reading_priority = 'THE_MUST' AND is_read = 0 THEN 1 ELSE 0 END) as theMustUnread,
        SUM(CASE WHEN reading_priority = 'CATALYST' AND is_read = 0 THEN 1 ELSE 0 END) as catalystUnread,
        SUM(CASE WHEN reading_priority = 'WATCHLIST' AND is_read = 0 THEN 1 ELSE 0 END) as watchlistUnread,
        SUM(CASE WHEN reading_priority = 'CHATTER' AND is_read = 0 THEN 1 ELSE 0 END) as chatterUnread,
        SUM(CASE WHEN reading_priority IN ('CATALYST', 'GOOD_TO_KNOW') AND is_read = 0 THEN 1 ELSE 0 END) as goodToKnowUnread,
        SUM(CASE WHEN portfolio_tag IN ('main', 'dual') AND is_read = 0 THEN 1 ELSE 0 END) as mainUnread,
        SUM(CASE WHEN portfolio_tag IN ('tiger', 'dual') AND is_read = 0 THEN 1 ELSE 0 END) as tigerUnread,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as totalUnread,
        COUNT(*) as totalArticles
      FROM news_intelligence
    `).get();

    return c.json({
      theMustUnread: stats?.theMustUnread || 0,
      catalystUnread: stats?.catalystUnread || 0,
      watchlistUnread: stats?.watchlistUnread || 0,
      chatterUnread: stats?.chatterUnread || 0,
      goodToKnowUnread: stats?.goodToKnowUnread || 0,
      mainUnread: stats?.mainUnread || 0,
      tigerUnread: stats?.tigerUnread || 0,
      totalUnread: stats?.totalUnread || 0,
      totalArticles: stats?.totalArticles || 0
    });
  } catch (error) {
    console.error('[newsRoutes] Error fetching stats:', error.message);
    return c.json({ error: 'Failed to fetch news stats' }, 500);
  }
});

// GET /api/news/ticker-stats — Count of articles and unread status per ticker
newsRoutes.get('/ticker-stats', (c) => {
  try {
    const rows = db.prepare(`
      SELECT 
        ticker,
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN reading_priority = 'THE_MUST' AND is_read = 0 THEN 1 ELSE 0 END) as theMustUnread
      FROM news_intelligence
      GROUP BY ticker
    `).all();

    const stats = {};
    rows.forEach(r => {
      if (r.ticker) {
        stats[r.ticker] = {
          total: r.total,
          unread: r.unread,
          theMustUnread: r.theMustUnread
        };
      }
    });

    return c.json({ success: true, data: stats });
  } catch (error) {
    console.error('[newsRoutes] Error fetching ticker stats:', error.message);
    return c.json({ error: 'Failed to fetch ticker stats' }, 500);
  }
});

// GET /api/news/timing-stats — Beehiiv publication timing profile
newsRoutes.get('/timing-stats', (c) => {
  try {
    const stats = getPublicationTimingStats();
    return c.json(stats);
  } catch (error) {
    console.error('[newsRoutes] Error fetching timing stats:', error.message);
    return c.json({ error: 'Failed to fetch timing stats' }, 500);
  }
});

// POST /api/news/:id/read — Mark single news item as read
newsRoutes.post('/:id/read', (c) => {
  try {
    const id = c.req.param('id');
    db.prepare('UPDATE news_intelligence SET is_read = 1 WHERE id = ?').run(id);
    return c.json({ success: true, id });
  } catch (error) {
    return c.json({ error: 'Failed to mark as read' }, 500);
  }
});

// POST /api/news/mark-all-read — Mark all news items as read
newsRoutes.post('/mark-all-read', (c) => {
  try {
    const portfolio = c.req.query('portfolio');
    if (portfolio === 'main') {
      db.prepare(`UPDATE news_intelligence SET is_read = 1 WHERE portfolio_tag IN ('main', 'dual')`).run();
    } else if (portfolio === 'tiger') {
      db.prepare(`UPDATE news_intelligence SET is_read = 1 WHERE portfolio_tag IN ('tiger', 'dual')`).run();
    } else {
      db.prepare('UPDATE news_intelligence SET is_read = 1').run();
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to mark all as read' }, 500);
  }
});

// POST /api/news/scan — Trigger manual scan on-demand
newsRoutes.post('/scan', async (c) => {
  try {
    const result = await runNewsScan();
    return c.json(result);
  } catch (error) {
    console.error('[newsRoutes] Scan error:', error.message);
    return c.json({ error: 'Scan failed', details: error.message }, 500);
  }
});

// POST /api/news/rescore/:id — Re-score a specific article with 5D matrix
newsRoutes.post('/rescore/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    const result = await rescoreArticle(id);
    return c.json({ success: true, data: result });
  } catch (error) {
    console.error(`[newsRoutes] Rescore error for article ${c.req.param('id')}:`, error.message);
    return c.json({ error: 'Rescore failed', details: error.message }, 500);
  }
});

// POST /api/news/rescore-all — Re-score recent articles in bulk with 5D matrix
newsRoutes.post('/rescore-all', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10), 50);
    const results = await rescoreRecentArticles(limit);
    return c.json({ success: true, count: results.length, data: results });
  } catch (error) {
    console.error('[newsRoutes] Bulk rescore error:', error.message);
    return c.json({ error: 'Bulk rescore failed', details: error.message }, 500);
  }
});

// POST /api/news/gfin-search — Test gfin autonomous hunter on-demand
newsRoutes.post('/gfin-search', async (c) => {
  try {
    const body = await c.req.json();
    const ticker = (body.ticker || 'GLOBAL').trim().toUpperCase();
    const headline = body.headline || '';
    if (!headline) return c.json({ error: 'Headline is required' }, 400);

    const { fetchFullStoryForHeadline } = await import('../services/gfinSearcher.js');
    const result = await fetchFullStoryForHeadline({ ticker, headline, beehiivUrl: body.url || null });
    return c.json({ success: true, ticker, headline, data: result });
  } catch (error) {
    console.error('[newsRoutes] gfin search error:', error.message);
    return c.json({ error: 'gfin search failed', details: error.message }, 500);
  }
});

// POST /api/news/re-enrich/:id — Force gfin to hunt full story & re-score an existing article
newsRoutes.post('/re-enrich/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    // clear full_content to force re-enrichment
    db.prepare('UPDATE news_intelligence SET full_content = NULL WHERE id = ?').run(id);
    const result = await rescoreArticle(id);
    return c.json({ success: true, message: 'Article re-enriched with gfin', data: result });
  } catch (error) {
    console.error(`[newsRoutes] Re-enrich error for article ${c.req.param('id')}:`, error.message);
    return c.json({ error: 'Re-enrich failed', details: error.message }, 500);
  }
});

// GET /api/news/triage-stats — Pre-filter triage funnel stats
newsRoutes.get('/triage-stats', (c) => {
  try {
    const stats = getTriageStats();
    return c.json(stats);
  } catch (error) {
    console.error('[newsRoutes] Error fetching triage stats:', error.message);
    return c.json({ error: 'Failed to fetch triage stats' }, 500);
  }
});

// GET /api/news/triage-log — Recent articles evaluated by triage engine
newsRoutes.get('/triage-log', (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '30', 10), 100);
    const action = c.req.query('action'); // FULL_PIPELINE, TITLE_ONLY, DROPPED
    let query = 'SELECT slug, title, triage_score, triage_action, triage_tags, detected_at FROM seen_articles';
    const params = [];
    if (action) {
      query += ' WHERE triage_action = ?';
      params.push(action);
    }
    query += ' ORDER BY detected_at DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(query).all(...params);
    return c.json({
      success: true,
      count: rows.length,
      data: rows.map(r => ({
        ...r,
        triage_tags: typeof r.triage_tags === 'string' ? JSON.parse(r.triage_tags || '[]') : r.triage_tags
      }))
    });
  } catch (error) {
    console.error('[newsRoutes] Error fetching triage log:', error.message);
    return c.json({ error: 'Failed to fetch triage log' }, 500);
  }
});

// GET /api/news/watchlist — View current watchlist tickers
newsRoutes.get('/watchlist', (c) => {
  try {
    const tickers = Array.from(getWatchlistTickers());
    const rows = db.prepare('SELECT symbol, note, added_at FROM watchlist_tickers ORDER BY symbol ASC').all();
    return c.json({
      success: true,
      allWatchlist: tickers,
      customList: rows
    });
  } catch (error) {
    return c.json({ error: 'Failed to fetch watchlist' }, 500);
  }
});

// POST /api/news/watchlist — Add ticker to watchlist
newsRoutes.post('/watchlist', async (c) => {
  try {
    const body = await c.req.json();
    const symbol = (body.symbol || '').trim().toUpperCase();
    const note = body.note || '';
    if (!symbol) return c.json({ error: 'Symbol is required' }, 400);

    db.prepare(`
      INSERT INTO watchlist_tickers (symbol, note, added_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(symbol) DO UPDATE SET note = excluded.note
    `).run(symbol, note);

    return c.json({ success: true, symbol, note });
  } catch (error) {
    return c.json({ error: 'Failed to add ticker to watchlist' }, 500);
  }
});

// DELETE /api/news/watchlist/:symbol — Remove ticker from watchlist
newsRoutes.delete('/watchlist/:symbol', (c) => {
  try {
    const symbol = c.req.param('symbol').toUpperCase();
    db.prepare('DELETE FROM watchlist_tickers WHERE symbol = ?').run(symbol);
    return c.json({ success: true, symbol });
  } catch (error) {
    return c.json({ error: 'Failed to delete ticker from watchlist' }, 500);
  }
});

export { newsRoutes };
