import { Hono } from 'hono';
import { authMiddleware } from './auth.js';
import {
  getOrCreateConfig,
  updateProject2xConfig,
  syncShareQuotas,
  scanRadarMatrix,
  recommendInflowAllocation,
  getDashboardData
} from '../services/project2xEngine.js';

const project2xRoutes = new Hono();

// Require auth
project2xRoutes.use('*', authMiddleware);

/**
 * GET /api/project-2x/dashboard/:pid
 * Master HUD data: Current value (THB/USD), Progress ring %, ETA 3 bands, FX rate, Dime Cash
 */
project2xRoutes.get('/dashboard/:pid', async (c) => {
  const pid = c.req.param('pid');
  try {
    const data = await getDashboardData(pid);
    return c.json(data);
  } catch (error) {
    console.error('[Project2X API] Dashboard error:', error);
    return c.json({ error: error.message || 'Failed to fetch Project 2X dashboard' }, 500);
  }
});

/**
 * GET /api/project-2x/quotas/:pid
 * 12 toy cards quota data + owned shares + progress + status
 */
project2xRoutes.get('/quotas/:pid', async (c) => {
  const pid = c.req.param('pid');
  try {
    const quotas = await syncShareQuotas(pid);
    return c.json(quotas);
  } catch (error) {
    console.error('[Project2X API] Quotas error:', error);
    return c.json({ error: error.message || 'Failed to fetch quotas' }, 500);
  }
});

/**
 * POST /api/project-2x/quotas/:pid/reset
 * Force reset quotas to Project 2X default 12 stocks
 */
project2xRoutes.post('/quotas/:pid/reset', async (c) => {
  const pid = c.req.param('pid');
  try {
    const quotas = await syncShareQuotas(pid, true);
    return c.json(quotas);
  } catch (error) {
    console.error('[Project2X API] Quotas reset error:', error);
    return c.json({ error: error.message || 'Failed to reset quotas' }, 500);
  }
});

/**
 * GET /api/project-2x/scan/:pid
 * Full technical radar scan: EMA 150/200, Banker MCDX, 5 Scenarios, Traffic lights, Sell alerts, Sparklines
 */
project2xRoutes.get('/scan/:pid', async (c) => {
  const pid = c.req.param('pid');
  try {
    const matrix = await scanRadarMatrix(pid);
    return c.json(matrix);
  } catch (error) {
    console.error('[Project2X API] Scan error:', error);
    return c.json({ error: error.message || 'Failed to scan radar matrix' }, 500);
  }
});

/**
 * POST /api/project-2x/recommend/:pid
 * Inflow allocation slip: { amount_thb } -> Mission Card or Dime FCD Cash Sweep
 */
project2xRoutes.post('/recommend/:pid', async (c) => {
  const pid = c.req.param('pid');
  try {
    const body = await c.req.json();
    const amountThb = Number(body.amount_thb) || 35000;
    const recommendation = await recommendInflowAllocation(pid, amountThb);
    return c.json(recommendation);
  } catch (error) {
    console.error('[Project2X API] Recommendation error:', error);
    return c.json({ error: error.message || 'Failed to calculate recommendation' }, 500);
  }
});

/**
 * GET /api/project-2x/config/:pid
 * Read config
 */
project2xRoutes.get('/config/:pid', (c) => {
  const pid = c.req.param('pid');
  try {
    const config = getOrCreateConfig(pid);
    return c.json(config);
  } catch (error) {
    console.error('[Project2X API] Config get error:', error);
    return c.json({ error: error.message || 'Failed to fetch config' }, 500);
  }
});

/**
 * POST /api/project-2x/config/:pid
 * Update config
 */
project2xRoutes.post('/config/:pid', async (c) => {
  const pid = c.req.param('pid');
  try {
    const body = await c.req.json();
    const updated = updateProject2xConfig(pid, body);
    return c.json(updated);
  } catch (error) {
    console.error('[Project2X API] Config update error:', error);
    return c.json({ error: error.message || 'Failed to update config' }, 500);
  }
});

export { project2xRoutes };
