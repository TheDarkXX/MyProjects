import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';

// Initialize DB first
import { initDb } from './db/init.js';
initDb();

import { authRoutes } from './routes/auth.js';
import { portfoliosRoutes } from './routes/portfolios.js';
import { transactionsRoutes } from './routes/transactions.js';
import { pricesRoutes } from './routes/prices.js';
import { historicalRoutes } from './routes/historical.js';
import { exchangeRoutes } from './routes/exchange.js';
import { metadataRoutes } from './routes/metadata.js';
import { snapshotsRoutes } from './routes/snapshots.js';
import { backupRoutes } from './routes/backup.js';
import { aiRoutes } from './routes/ai.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/portfolios', portfoliosRoutes);
app.route('/api/transactions', transactionsRoutes);
app.route('/api/prices', pricesRoutes);
app.route('/api/historical', historicalRoutes);
app.route('/api/exchange-rate', exchangeRoutes);
app.route('/api/metadata', metadataRoutes);
app.route('/api/snapshots', snapshotsRoutes);
app.route('/api/backup', backupRoutes);
app.route('/api/ai-chat', aiRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve static frontend in production
app.use('/*', serveStatic({ root: '../dist' }));
app.get('*', (c) => {
  // SPA fallback
  const htmlPath = '../dist/index.html';
  // Note: in a real Hono serveStatic setup, we might need a custom fallback.
  // For now, this is a placeholder. If file doesn't exist, this will error in dev.
  try {
    return c.html(require('fs').readFileSync(htmlPath, 'utf-8'));
  } catch (e) {
    return c.text('API Server is running. Frontend build not found.', 200);
  }
});

const port = process.env.PORT || 3100;
console.log(`🚀 Server starting on port ${port}...`);

serve({
  fetch: app.fetch,
  port
});
