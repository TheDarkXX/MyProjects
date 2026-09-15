import { Hono } from 'hono';
import { db } from '../db/init.js';
import { authMiddleware } from './auth.js';
import {
  syncCandleDelta,
  sync4HCandles,
  calcEMASeries,
  calcMcdxSeries
} from '../services/technicalAnalysis.js';
import { fetchYahooRealtimeQuote } from '../services/yahoo.js';

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

      // Attempt live pulse update on latest 4H candle
      try {
        const liveQuote4h = await fetchYahooRealtimeQuote(symbol);
        if (liveQuote4h && liveQuote4h.price && closes.length > 0) {
          const lastIdx = closes.length - 1;
          closes[lastIdx] = Number(liveQuote4h.price.toFixed(4));
          highs[lastIdx] = Math.max(highs[lastIdx], closes[lastIdx]);
          lows[lastIdx] = Math.min(lows[lastIdx], closes[lastIdx]);
        }
      } catch (e) {}

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

    // Fetch real-time quote to inject/update today's live trading candle
    let liveQuote = null;
    try {
      liveQuote = await fetchYahooRealtimeQuote(symbol);
      if (liveQuote && liveQuote.price != null && liveQuote.date) {
        const lastDbDate = dbCandles[dbCandles.length - 1]?.date;
        if (lastDbDate && liveQuote.date > lastDbDate) {
          // A new trading day session in progress -> Append today's live candle
          dbCandles.push({
            date: liveQuote.date,
            price: liveQuote.price,
            open: liveQuote.open,
            high: liveQuote.high,
            low: liveQuote.low,
            close: liveQuote.price,
            volume: liveQuote.volume,
            isLive: true,
          });
        } else if (lastDbDate && liveQuote.date === lastDbDate) {
          // Today's candle is already in DB -> Update with live intraday ticks
          const last = dbCandles[dbCandles.length - 1];
          last.close = liveQuote.price;
          last.price = liveQuote.price;
          last.high = Math.max(last.high ?? liveQuote.price, liveQuote.high);
          last.low = Math.min(last.low ?? liveQuote.price, liveQuote.low);
          if (liveQuote.volume > (last.volume ?? 0)) last.volume = liveQuote.volume;
          last.isLive = true;
        }

        // Also refresh latest_prices table in DB for portfolio/watchlist sync
        db.prepare(`
          INSERT OR REPLACE INTO latest_prices (symbol, price, change, percent_change, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `).run(symbol, liveQuote.price, liveQuote.change, liveQuote.percent_change);
      }
    } catch (err) {
      console.warn(`[chartRoutes] Realtime quote injection failed for ${symbol}:`, err.message);
    }

    const dates = dbCandles.map((c) => c.date);
    const closes = dbCandles.map((c) => Number((c.close ?? c.price).toFixed(4)));
    const opens = dbCandles.map((c) => Number((c.open ?? c.close ?? c.price).toFixed(4)));
    const highs = dbCandles.map((c) => Number((c.high ?? c.close ?? c.price).toFixed(4)));
    const lows = dbCandles.map((c) => Number((c.low ?? c.close ?? c.price).toFixed(4)));
    const volumes = dbCandles.map((c) => Number(c.volume ?? 0));

    // Compute EMAs across full series (including today's live candle)
    const ema50 = calcEMASeries(closes, 50);
    const ema150 = calcEMASeries(closes, 150);
    const ema200 = calcEMASeries(closes, 200);

    // Compute MCDX across full series (including today's live candle)
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

    const currentPrice = liveQuote?.price ?? latestPriceRow?.price ?? lastClose;
    const change = liveQuote?.change ?? latestPriceRow?.change ?? computedChange;
    const percentChange = liveQuote?.percent_change ?? latestPriceRow?.percent_change ?? computedPct;
    const lastUpdated = liveQuote?.updatedAt ?? latestPriceRow?.updated_at ?? new Date().toISOString();

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
