import { Hono } from 'hono';
import { db } from '../db/init.js';
import { runNewsScan, getPublicationTimingStats } from '../services/newsRadar.js';

const newsRoutes = new Hono();

// GET /api/news — List news articles with smart filters
newsRoutes.get('/', (c) => {
  try {
    const portfolio = c.req.query('portfolio') || 'all'; // all | main | tiger | global
    const priority = c.req.query('priority') || 'all';   // all | the_must | good_to_know | optional
    const unreadOnly = c.req.query('unread_only') === 'true';
    const ticker = c.req.query('ticker');
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);

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

    // Filter by reading priority
    if (priority === 'the_must') {
      query += ` AND reading_priority = 'THE_MUST'`;
    } else if (priority === 'good_to_know') {
      query += ` AND reading_priority = 'GOOD_TO_KNOW'`;
    } else if (priority === 'optional') {
      query += ` AND reading_priority = 'OPTIONAL'`;
    } else if (priority === 'focus') {
      // The Must + Good to Know (hide noise)
      query += ` AND reading_priority IN ('THE_MUST', 'GOOD_TO_KNOW')`;
    }

    // Filter by unread
    if (unreadOnly) {
      query += ` AND is_read = 0`;
    }

    // Filter by specific ticker
    if (ticker) {
      query += ` AND ticker = ?`;
      params.push(ticker.toUpperCase());
    }

    // Priority ordering: THE_MUST (1) > GOOD_TO_KNOW (2) > OPTIONAL (3), then by newest created_at
    query += `
      ORDER BY 
        CASE reading_priority 
          WHEN 'THE_MUST' THEN 1 
          WHEN 'GOOD_TO_KNOW' THEN 2 
          ELSE 3 
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
        SUM(CASE WHEN reading_priority = 'GOOD_TO_KNOW' AND is_read = 0 THEN 1 ELSE 0 END) as goodToKnowUnread,
        SUM(CASE WHEN portfolio_tag IN ('main', 'dual') AND is_read = 0 THEN 1 ELSE 0 END) as mainUnread,
        SUM(CASE WHEN portfolio_tag IN ('tiger', 'dual') AND is_read = 0 THEN 1 ELSE 0 END) as tigerUnread,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as totalUnread,
        COUNT(*) as totalArticles
      FROM news_intelligence
    `).get();

    return c.json({
      theMustUnread: stats?.theMustUnread || 0,
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

export { newsRoutes };
