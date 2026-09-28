import { Hono } from 'hono';
import { authMiddleware } from './auth.js';
import {
  getOrCreateConfig,
  updateProject2xConfig,
  syncShareQuotas,
  scanRadarMatrix,
  recommendInflowAllocation,
  getDashboardData,
  getBackfillStatus,
  backfillHistoricalData,
  getAllFundamentals,
  updateFundamentalsOverride,
  renewThesisEpoch
} from '../services/project2xEngine.js';
import {
  getDossierData,
  saveSpecificDriver,
  syncQuarterlyFinancials
} from '../services/dossierService.js';
import { getPullbackDna } from '../services/pullbackDnaService.js';
import { db } from '../db/init.js';
import { runProject2xScan } from '../crons/project2xCron.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CARDS_DIR = path.resolve(__dirname, '..', 'data', 'cards');

const project2xRoutes = new Hono();

/**
 * Public Card Image Serving for LINE Messaging API Lightbox
 * GET /api/project-2x/cards/:filename
 */
project2xRoutes.get('/cards/:filename', async (c) => {
  const filename = c.req.param('filename');
  const safeFilename = path.basename(filename);
  const cardPath = path.join(CARDS_DIR, safeFilename);

  if (!fs.existsSync(cardPath)) {
    return c.text('Image not found', 404);
  }

  const imageBuffer = fs.readFileSync(cardPath);
  c.header('Content-Type', 'image/png');
  c.header('Cache-Control', 'public, max-age=86400');
  return c.body(imageBuffer);
});

// Require auth for other API routes
project2xRoutes.use('*', authMiddleware);

/**
 * POST /api/project-2x/run-cron
 * Manual or webhook trigger for Project 2X Autonomous Notification Cron
 * Body: { portfolioId?: string, dryRun?: boolean, force?: boolean }
 */
project2xRoutes.post('/run-cron', async (c) => {
  try {
    let body = {};
    try {
      body = await c.req.json();
    } catch (e) {
      body = {};
    }
    const { portfolioId, dryRun = false, force = false } = body;
    const result = await runProject2xScan({ portfolioId, dryRun, force });
    return c.json(result);
  } catch (error) {
    console.error('[Project2X API] Run cron error:', error);
    return c.json({ error: error.message || 'Failed to run Project 2X cron' }, 500);
  }
});

/**
 * GET /api/project-2x/cron-logs
 * Fetch historical notification logs
 * Query: ?limit=50&portfolioId=...
 */
project2xRoutes.get('/cron-logs', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const portfolioId = c.req.query('portfolioId');

    let query = 'SELECT * FROM project2x_cron_logs';
    const params = [];
    if (portfolioId) {
      query += ' WHERE portfolio_id = ?';
      params.push(portfolioId);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const logs = db.prepare(query).all(...params);
    return c.json({ logs });
  } catch (error) {
    console.error('[Project2X API] Fetch cron logs error:', error);
    return c.json({ error: error.message || 'Failed to fetch cron logs' }, 500);
  }
});

/**
 * GET /api/project-2x/pullback-dna/:symbol
 * Pullback & Bedrock DNA statistics (10-year analysis of bounces on EMA 50/150/200)
 */
project2xRoutes.get('/pullback-dna/:symbol', async (c) => {
  const symbol = c.req.param('symbol');
  try {
    const dna = await getPullbackDna(symbol);
    return c.json(dna);
  } catch (error) {
    console.error('[Project2X API] Pullback DNA error:', error);
    return c.json({ error: error.message || 'Failed to analyze Pullback DNA' }, 500);
  }
});

// Validate portfolioId parameter on all :pid routes
project2xRoutes.use('/:pid/*', async (c, next) => {
  const pid = c.req.param('pid');
  if (!pid || pid === 'undefined' || pid === 'null') {
    return c.json({ error: 'Valid portfolio ID is required' }, 400);
  }
  await next();
});

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
 * POST /api/project-2x/quotas/:pid/renew-epoch
 * Renew or manually adjust Thesis Epoch (start date, price, horizon)
 */
project2xRoutes.post('/quotas/:pid/renew-epoch', async (c) => {
  const pid = c.req.param('pid');
  try {
    const body = await c.req.json();
    const { symbol, anchor_date, start_price, horizon_years } = body;
    if (!symbol) return c.json({ error: 'Symbol is required' }, 400);

    const result = renewThesisEpoch(pid, symbol, {
      anchor_date,
      start_price,
      horizon_years
    });
    return c.json(result);
  } catch (error) {
    console.error('[Project2X API] Renew epoch error:', error);
    return c.json({ error: error.message || 'Failed to renew thesis epoch' }, 500);
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

/**
 * POST /api/project-2x/backfill/:pid
 * Start 10Y historical data backfill
 */
project2xRoutes.post('/backfill/:pid', async (c) => {
  const pid = c.req.param('pid');
  try {
    const body = await c.req.json().catch(() => ({}));
    const years = Number(body.years) || 10;
    const symbols = body.symbols || [];
    const res = await backfillHistoricalData(symbols, years);
    return c.json(res);
  } catch (error) {
    console.error('[Project2X API] Backfill error:', error);
    return c.json({ error: error.message || 'Failed to start backfill' }, 500);
  }
});

/**
 * GET /api/project-2x/backfill-status/:pid
 * Check progress of backfill
 */
project2xRoutes.get('/backfill-status/:pid', (c) => {
  return c.json(getBackfillStatus());
});

/**
 * GET /api/project-2x/fundamentals/:pid
 * Get fundamentals list
 */
project2xRoutes.get('/fundamentals/:pid', (c) => {
  try {
    return c.json(getAllFundamentals());
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/project-2x/fundamentals/:pid
 * Update fundamentals manual override for a symbol
 */
project2xRoutes.post('/fundamentals/:pid', async (c) => {
  try {
    const body = await c.req.json();
    const { symbol, expected_cagr_3y, consecutive_eps_qs } = body;
    if (!symbol) return c.json({ error: 'Symbol required' }, 400);
    const updated = updateFundamentalsOverride(symbol, { expected_cagr_3y, consecutive_eps_qs });
    return c.json(updated);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/project-2x/dossier/:pid/:symbol
 * Single-payload Dossier for a stock
 */
project2xRoutes.get('/dossier/:pid/:symbol', async (c) => {
  const pid = c.req.param('pid');
  const symbol = c.req.param('symbol');
  try {
    const data = await getDossierData(pid, symbol);
    return c.json(data);
  } catch (error) {
    console.error('[Project2X API] Dossier error:', error);
    return c.json({ error: error.message || 'Failed to fetch stock dossier' }, 500);
  }
});

/**
 * POST /api/project-2x/dossier/:pid/:symbol/driver
 * Save specific driver override
 */
project2xRoutes.post('/dossier/:pid/:symbol/driver', async (c) => {
  const symbol = c.req.param('symbol');
  try {
    const body = await c.req.json();
    const updated = saveSpecificDriver(symbol, body);
    return c.json(updated);
  } catch (error) {
    console.error('[Project2X API] Driver update error:', error);
    return c.json({ error: error.message || 'Failed to update driver' }, 500);
  }
});

/**
 * POST /api/project-2x/dossier/:pid/:symbol/refresh-financials
 * On-demand refresh of quarterly financials from Yahoo into SQLite
 */
project2xRoutes.post('/dossier/:pid/:symbol/refresh-financials', async (c) => {
  const pid = c.req.param('pid');
  const symbol = c.req.param('symbol');
  try {
    await syncQuarterlyFinancials(symbol);
    const updatedData = await getDossierData(pid, symbol);
    return c.json(updatedData);
  } catch (error) {
    console.error('[Project2X API] Refresh financials error:', error);
    return c.json({ error: error.message || 'Failed to refresh financials' }, 500);
  }
});

export { project2xRoutes };
