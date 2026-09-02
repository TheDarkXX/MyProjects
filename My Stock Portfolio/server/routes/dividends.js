import { Hono } from 'hono';
import { syncDividendsForPortfolio } from '../services/dividendSync.js';

const dividendsRoutes = new Hono();

// POST /api/dividends/sync/:portfolioId
dividendsRoutes.post('/sync/:portfolioId', async (c) => {
    try {
        const portfolioId = c.req.param('portfolioId');
        if (!portfolioId) {
            return c.json({ error: 'portfolioId is required' }, 400);
        }

        const result = await syncDividendsForPortfolio(portfolioId);
        return c.json({ success: true, result });
    } catch (error) {
        console.error('Dividend sync API error:', error);
        return c.json({ error: 'Failed to sync dividends', details: error.message }, 500);
    }
});

export { dividendsRoutes };
