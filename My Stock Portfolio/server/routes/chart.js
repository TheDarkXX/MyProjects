import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';
import {
  syncCandleDelta,
  sync4HCandles,
  calcEMASeries,
  calcMcdxSeries
} from '../services/technicalAnalysis.js';

export const chartRoutes = new Hono();

// Require auth for all chart endpoints
chartRoutes.use('*', authMiddleware);

/**
 * GET /api/chart/:symbol?days=3650&resolution=1D
 * Fetches historical OHLCV, computes EMA 50/150/200, Banker MCDX indicators,
 * and returns ready-to-render series for Lightweight Charts.
 * Supports resolution=4H for 4-hour intraday candles (Forex USD/THB).
 */
chartRoutes.get('/:symbol', async (c) => {
  try {
    const rawSymbol = c.req.param('symbol');
    if (!rawSymbol || rawSymbol.trim() === '') {
      return c.json({ error: 'Symbol is required' }, 400);
    }
    const symbol = rawSymbol.trim().toUpperCase();
    const resolution = (c.req.query('resolution') || c.req.query('timeframe') || '1D').toUpperCase();

    // -------------------------------------------------------------
    // 4H INTRADAY RESOLUTION (Forex USD/THB 720-Day Lookback)
    // -------------------------------------------------------------
    if (resolution === '4H') {
      const candles4h = await sync4HCandles(symbol);
      if (!candles4h || candles4h.length === 0) {
        return c.json({ error: `No 4H data available for ${symbol}` }, 404);
      }

      const dates = candles4h.map((c) => c.time);
      const closes = candles4h.map((c) => Number((c.close ?? c.price).toFixed(4)));
      const opens = candles4h.map((c) => Number((c.open ?? c.close ?? c.price).toFixed(4)));
      const highs = candles4h.map((c) => Number((c.high ?? c.close ?? c.price).toFixed(4)));
      const lows = candles4h.map((c) => Number((c.low ?? c.close ?? c.price).toFixed(4)));
      const volumes = candles4h.map((c) => Number(c.volume ?? 0));

      const ema50 = calcEMASeries(closes, 50);
      const ema150 = calcEMASeries(closes, 150);
      const ema200 = calcEMASeries(closes, 200);
      const mcdxData = calcMcdxSeries(closes);

      const latestPriceRow = db.prepare(`
        SELECT price, change, percent_change, updated_at 
        FROM latest_prices 
        WHERE symbol = ?
      `).get(symbol);

      const lastClose = closes[closes.length - 1];
      const prevClose = closes.length > 1 ? closes[closes.length - 2] : lastClose;
      const computedChange = Number((lastClose - prevClose).toFixed(4));
      const computedPct = prevClose > 0 ? Number(((computedChange / prevClose) * 100).toFixed(2)) : 0;

      const currentPrice = latestPriceRow?.price ?? lastClose;
      const change = latestPriceRow?.change ?? computedChange;
      const percentChange = latestPriceRow?.percent_change ?? computedPct;
      const lastUpdated = latestPriceRow?.updated_at ?? new Date().toISOString();

      return c.json({
        symbol,
        resolution: '4H',
        dates,
        opens,
        highs,
        lows,
        closes,
        volumes,
        ema50,
        ema150,
        ema200,
        bankerSeries: mcdxData.banker,
        hotMoneySeries: mcdxData.hotMoney,
        retailSeries: mcdxData.retail,
        bankerMaSeries: mcdxData.bankerMa,
        currentPrice,
        change,
        percentChange,
        lastUpdated
      });
    }

    // -------------------------------------------------------------
    // 1D DAILY RESOLUTION (Standard Max Lifetime All-time IPO)
    // -------------------------------------------------------------
    const days = parseInt(c.req.query('days') || '36500', 10);

    // Delta sync candles (defaults to Max Lifetime / All-time IPO / 36500 days)
    await syncCandleDelta(symbol, days);

    // Fetch all available candles for maximum historical depth and smooth EMA convergence
    const dbCandles = db.prepare(`
      SELECT date, price, open, high, low, close, volume 
      FROM historical_prices 
      WHERE symbol = ? 
      ORDER BY date ASC
    `).all(symbol);

    if (!dbCandles || dbCandles.length === 0) {
      return c.json({ error: `No historical data available for ${symbol}` }, 404);
    }

    const dates = dbCandles.map((c) => c.date);
    const closes = dbCandles.map((c) => Number((c.close ?? c.price).toFixed(4)));
    const opens = dbCandles.map((c) => Number((c.open ?? c.close ?? c.price).toFixed(4)));
    const highs = dbCandles.map((c) => Number((c.high ?? c.close ?? c.price).toFixed(4)));
    const lows = dbCandles.map((c) => Number((c.low ?? c.close ?? c.price).toFixed(4)));
    const volumes = dbCandles.map((c) => Number(c.volume ?? 0));

    // Compute EMAs across full series
    const ema50 = calcEMASeries(closes, 50);
    const ema150 = calcEMASeries(closes, 150);
    const ema200 = calcEMASeries(closes, 200);

    // Compute MCDX across full series (100% of historical depth)
    const mcdxData = calcMcdxSeries(closes);

    // Latest price & day change
    const latestPriceRow = db.prepare(`
      SELECT price, change, percent_change, updated_at 
      FROM latest_prices 
      WHERE symbol = ?
    `).get(symbol);

    const lastClose = closes[closes.length - 1];
    const prevClose = closes.length > 1 ? closes[closes.length - 2] : lastClose;
    const computedChange = Number((lastClose - prevClose).toFixed(4));
    const computedPct = prevClose > 0 ? Number(((computedChange / prevClose) * 100).toFixed(2)) : 0;

    const currentPrice = latestPriceRow?.price ?? lastClose;
    const change = latestPriceRow?.change ?? computedChange;
    const percentChange = latestPriceRow?.percent_change ?? computedPct;
    const lastUpdated = latestPriceRow?.updated_at ?? new Date().toISOString();

    return c.json({
      symbol,
      dates,
      opens,
      highs,
      lows,
      closes,
      volumes,
      ema50,
      ema150,
      ema200,
      bankerSeries: mcdxData.banker,
      hotMoneySeries: mcdxData.hotMoney,
      retailSeries: mcdxData.retail,
      bankerMaSeries: mcdxData.bankerMa,
      currentPrice,
      change,
      percentChange,
      lastUpdated
    });
  } catch (error) {
    console.error(`[chartRoutes] Error fetching chart for ${c.req.param('symbol')}:`, error);
    return c.json({ error: error.message || 'Failed to load chart data' }, 500);
  }
});
