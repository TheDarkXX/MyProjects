import YahooFinance from 'yahoo-finance2';
import { db } from '../db/init.js';
import { fetchYahooHistorical } from './yahoo.js';
import { saveHistoricalIndexFiles } from '../scripts/generate_historical_index.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const TECH_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours in-memory cache
const technicalCache = new Map();

/**
 * Calculate Exponential Moving Average (EMA) series
 * @param {number[]} closes 
 * @param {number} period 
 * @returns {Array<number|null>}
 */
export function calcEMASeries(closes, period) {
  if (!closes || closes.length < period) return [];
  const k = 2 / (period + 1);
  const result = new Array(closes.length).fill(null);

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closes[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < closes.length; i++) {
    result[i] = closes[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/**
 * Calculate latest Exponential Moving Average (EMA)
 * @param {number[]} closes 
 * @param {number} period 
 * @returns {number|null}
 */
export function calcEMA(closes, period) {
  const series = calcEMASeries(closes, period);
  if (!series || series.length === 0) return null;
  const last = series[series.length - 1];
  return last !== null ? Number(last.toFixed(2)) : null;
}

/**
 * Calculate Banker MCDX (Super Money Institutional Flow)
 * Formula: rsi_Banker = 1.5 * (RSI(50) - 50)
 * Scaled 0 - 20
 * @param {number[]} closes 
 * @returns {number}
 */
export function calcBankerMCDX(closes) {
  if (!closes || closes.length < 51) return 0;
  const rsi50 = calcRSI(closes, 50);
  if (rsi50 === null || rsi50 <= 50) return 0;
  return Number(Math.min(20, Math.max(0, 1.5 * (rsi50 - 50))).toFixed(2));
}

/**
 * Calculate Banker MCDX series for the last N bars
 * @param {number[]} closes 
 * @param {number} lookback 
 * @returns {number[]}
 */
/**
 * Calculate Banker MCDX series for the full series (matching closes length)
 * @param {number[]} closes 
 * @returns {number[]}
 */
export function calcBankerSeries(closes) {
  if (!closes || closes.length === 0) return [];
  const mcdx = calcMcdxSeries(closes);
  return mcdx.banker;
}

/**
 * Calculate full MCDX 3-tier continuous stacked flow (Banker, Hot Money, Retail, Banker MA)
/**
 * Fast O(N) Running Wilder's RSI series calculation
 * @param {number[]} closes 
 * @param {number} period 
 * @returns {(number|null)[]}
 */
export function calcRSISeries(closes, period = 14) {
  const len = closes ? closes.length : 0;
  const rsis = new Array(len).fill(null);
  if (!closes || len <= period) return rsis;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsis[period] = avgLoss === 0 ? 100 : Number((100 - (100 / (1 + avgGain / avgLoss))).toFixed(1));

  for (let i = period + 1; i < len; i++) {
    const diff = closes[i] - closes[i - 1];
    const currentGain = diff >= 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    rsis[i] = avgLoss === 0 ? 100 : Number((100 - (100 / (1 + avgGain / avgLoss))).toFixed(1));
  }

  return rsis;
}

/**
 * Calculate full Banker MCDX multi-series across the entire history (100% full chart, no slicing)
 * Scaled 0 - 20, matching TradingView Super Money MCDX
 * @param {number[]} closes 
 */
export function calcMcdxSeries(closes) {
  if (!closes || closes.length === 0) {
    return { banker: [], hotMoney: [], retail: [], bankerMa: [] };
  }
  const len = closes.length;
  const banker = new Array(len).fill(0);
  const hotMoney = new Array(len).fill(0);
  const retail = new Array(len).fill(20);

  // High-performance O(N) RSI series across entire historical series
  const rsi50Series = calcRSISeries(closes, 50);
  const rsi40Series = calcRSISeries(closes, 40);

  for (let i = 0; i < len; i++) {
    const rsi50 = rsi50Series[i];
    const rsi40 = rsi40Series[i];

    // Banker (Red): Sensitivity 1.5, Base 50, Period 50
    let b = 0;
    if (rsi50 !== null && rsi50 > 50) {
      b = Math.min(20, Math.max(0, 1.5 * (rsi50 - 50)));
    }

    // Hot Money (Yellow): Sensitivity 0.7, Base 30, Period 40
    let h = 0;
    if (rsi40 !== null && rsi40 > 30) {
      h = Math.min(20, Math.max(0, 0.7 * (rsi40 - 30)));
    }

    // Retailer (Green): Floating supply above Hot Money / Banker up to 20
    const topCoverage = Math.max(b, h);
    const r = Math.max(0, 20 - topCoverage);

    banker[i] = Number(b.toFixed(2));
    hotMoney[i] = Number(h.toFixed(2));
    retail[i] = Number(r.toFixed(2));
  }

  // Calculate 9-period SMA for banker MA (White line)
  const bankerMa = new Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    const start = Math.max(0, i - 8);
    let sum = 0;
    let cnt = 0;
    for (let j = start; j <= i; j++) {
      sum += banker[j];
      cnt++;
    }
    bankerMa[i] = Number((sum / cnt).toFixed(2));
  }

  return { banker, hotMoney, retail, bankerMa };
}

/**
 * Sync daily candles for a symbol using Delta Sync into historical_prices SQLite table.
 * - If symbol has no rows or corrupted data, automatically backfills Max Lifetime (from 1927-01-01 / IPO).
 * - If symbol already exists and is fresh, returns instantly from SQLite (0ms latency).
 * - If symbol has new sessions, fetches only the incremental delta (maxDate -> today).
 * @param {string} symbol
 * @param {number} minDaysRequired
 * @returns {Promise<Array<{ date: string, price: number, open: number, high: number, low: number, close: number, volume: number }>>}
 */
export async function syncCandleDelta(symbol, minDaysRequired = 36500) {
  if (!symbol || symbol === 'CASH') return [];
  const upper = symbol.toUpperCase();

  const today = new Date().toISOString().split('T')[0];

  // Check latest & earliest date in DB
  const stats = db.prepare(
    'SELECT MAX(date) as max_date, MIN(date) as min_date, COUNT(*) as count FROM historical_prices WHERE symbol = ?'
  ).get(upper);

  const maxDate = stats?.max_date;
  const minDate = stats?.min_date;
  const count = stats?.count || 0;

  const nowTime = new Date().getTime();
  const maxDateTime = maxDate ? new Date(maxDate).getTime() : 0;
  const diffDays = maxDate ? Math.floor((nowTime - maxDateTime) / (24 * 60 * 60 * 1000)) : 999;

  const isFresh = diffDays <= 1 || (new Date().getDay() === 0 && diffDays <= 2) || (new Date().getDay() === 1 && diffDays <= 3);

  // Check if ALL rows have valid OHLCV (no NULL open/high/low)
  const hasNullRows = !!db.prepare('SELECT 1 FROM historical_prices WHERE symbol = ? AND (open IS NULL OR high IS NULL OR high <= low) LIMIT 1').get(upper);
  const hasValidOhlcv = !hasNullRows;

  // 1. FAST CACHE HIT: If data is fresh, count >= 40, and valid OHLCV -> 0ms return from SQLite
  if (isFresh && count >= 40 && hasValidOhlcv) {
    const rows = db.prepare('SELECT date, price, open, high, low, close, volume FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(upper);
    if (rows.length >= 40) {
      return rows;
    }
  }

  // 2. SMART FETCH STRATEGY:
  // - If brand new symbol (count === 0) or corrupted data (hasNullRows): Auto fetch MAX LIFETIME from 1927-01-01 (All-Time IPO)
  // - If existing symbol in DB: Only fetch incremental DELTA from maxDate to today (fast 1-2 bars)
  const isBrandNew = count === 0 || !hasValidOhlcv;
  const fetchFrom = isBrandNew ? '1927-01-01' : maxDate;

  try {
    const freshData = await fetchYahooHistorical(upper, fetchFrom, today);
    if (freshData && freshData.length > 0) {
      const insert = db.prepare(`
        INSERT OR REPLACE INTO historical_prices (symbol, date, price, open, high, low, close, volume)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertTx = db.transaction((items) => {
        for (const item of items) {
          insert.run(
            upper,
            item.date,
            item.price,
            item.open ?? item.price,
            item.high ?? item.price,
            item.low ?? item.price,
            item.close ?? item.price,
            item.volume ?? 0
          );
        }
      });
      insertTx(freshData);

      // Auto-update HISTORICAL_INDEX.md in background if a brand new symbol was just backfilled
      if (isBrandNew) {
        setTimeout(() => {
          try {
            saveHistoricalIndexFiles();
          } catch (e) {
            console.warn('[HistoricalIndex] Auto-update failed:', e.message);
          }
        }, 100);
      }
    }
  } catch (err) {
    console.warn(`[syncCandleDelta] Delta fetch error for ${upper}:`, err.message);
  }

  return db.prepare('SELECT date, price, open, high, low, close, volume FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(upper);
}

/**
 * Calculate Wilder's Smoothing RSI (14 periods)
 * @param {number[]} closes 
 * @param {number} period 
 * @returns {number|null}
 */
export function calcRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const currentGain = diff >= 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  return Number(rsi.toFixed(1));
}

/**
 * Calculate Average True Range (ATR 14) with Wilder's Smoothing
 * @param {number[]} highs 
 * @param {number[]} lows 
 * @param {number[]} closes 
 * @param {number} period 
 * @returns {number|null}
 */
export function calcATR(highs, lows, closes, period = 14) {
  if (!highs || !lows || !closes || highs.length < period + 1) return null;

  const trs = [];
  for (let i = 1; i < closes.length; i++) {
    const h = highs[i];
    const l = lows[i];
    const prevC = closes[i - 1];
    const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    trs.push(tr);
  }

  if (trs.length < period) return null;

  let atr = trs.slice(0, period).reduce((acc, v) => acc + v, 0) / period;

  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }

  return Number(atr.toFixed(2));
}

/**
 * Calculate Simple Moving Average (SMA)
 * @param {number[]} closes 
 * @param {number} period 
 * @returns {number|null}
 */
export function calcSMA(closes, period = 20) {
  if (!closes || closes.length < period) return null;
  const slice = closes.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return Number((sum / period).toFixed(2));
}

/**
 * Find 20-Day Swing High and Low (Support & Resistance pivots)
 * @param {number[]} highs 
 * @param {number[]} lows 
 * @param {number} lookback 
 * @returns {{ support20d: number, resistance20d: number }}
 */
export function find20DayPivots(highs, lows, lookback = 20) {
  if (!highs || !lows || highs.length === 0 || lows.length === 0) {
    return { support20d: 0, resistance20d: 0 };
  }
  const recentHighs = highs.slice(-lookback);
  const recentLows = lows.slice(-lookback);
  const resistance20d = Number(Math.max(...recentHighs).toFixed(2));
  const support20d = Number(Math.min(...recentLows).toFixed(2));
  return { support20d, resistance20d };
}

/**
 * Fetch OHLC and compute Technical Indicators for AI Strategist.
 * Cached in memory for 4 hours.
 * @param {string} symbol 
 * @returns {Promise<Object|null>}
 */
export async function fetchTechnicalAnalysis(symbol) {
  if (!symbol || symbol === 'CASH') return null;
  const upper = symbol.toUpperCase();
  if (upper.includes('BTC') || upper.includes('ETH')) return null;

  // Check In-Memory Cache
  const cached = technicalCache.get(upper);
  if (cached && (Date.now() - cached.timestamp < TECH_CACHE_TTL)) {
    return cached.data;
  }

  try {
    // 65 calendar days back guarantees at least 42-45 trading sessions
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 65);
    const fromStr = fromDate.toISOString().split('T')[0];

    const result = await yahooFinance.chart(upper, {
      period1: fromStr,
      interval: '1d'
    }).catch(err => {
      console.warn(`[TechnicalAnalysis] Chart fetch error for ${upper}:`, err.message);
      return null;
    });

    if (!result || !result.quotes || result.quotes.length === 0) {
      return null;
    }

    const validQuotes = result.quotes.filter(
      q => q.close !== null && q.close !== undefined &&
           q.high !== null && q.high !== undefined &&
           q.low !== null && q.low !== undefined
    );

    if (validQuotes.length < 15) {
      return null;
    }

    const closes = validQuotes.map(q => Number(q.close));
    const highs = validQuotes.map(q => Number(q.high));
    const lows = validQuotes.map(q => Number(q.low));

    const currentPrice = Number(closes[closes.length - 1].toFixed(2));
    const rsi14 = calcRSI(closes, 14);
    const atr14 = calcATR(highs, lows, closes, 14);
    const sma20 = calcSMA(closes, 20);
    const { support20d, resistance20d } = find20DayPivots(highs, lows, 20);

    let rsiState = 'NEUTRAL';
    if (rsi14 !== null) {
      if (rsi14 >= 70) rsiState = 'OVERBOUGHT';
      else if (rsi14 <= 30) rsiState = 'OVERSOLD';
      else if (rsi14 >= 60) rsiState = 'STRONG_BULLISH';
      else if (rsi14 <= 40) rsiState = 'WEAK_BEARISH';
    }

    const trailingStop2ATR = atr14 !== null ? Number((currentPrice - (2 * atr14)).toFixed(2)) : null;

    const data = {
      symbol: upper,
      currentPrice,
      rsi14,
      rsiState,
      sma20,
      atr14,
      trailingStop2ATR,
      support20d,
      resistance20d,
      dataPoints: validQuotes.length,
      updatedAt: new Date().toISOString()
    };

    // Cache in memory
    technicalCache.set(upper, {
      timestamp: Date.now(),
      data
    });

    return data;
  } catch (err) {
    console.error(`[TechnicalAnalysis] Error processing technicals for ${upper}:`, err.message);
    return null;
  }
}

/**
 * Synchronize and aggregate 4-Hour (4H) candles from Yahoo Finance 1h data (up to 720 days).
 * Caches directly into SQLite intraday_prices table.
 * @param {string} symbol - e.g. 'THB=X'
 * @returns {Promise<Array<{ time: string, price: number, open: number, high: number, low: number, close: number, volume: number }>>}
 */
export async function sync4HCandles(symbol) {
  if (!symbol || symbol === 'CASH') return [];
  const upper = symbol.toUpperCase();

  // 1. Check existing 4H candles in SQLite
  const stats = db.prepare(
    'SELECT MAX(time) as max_time, MIN(time) as min_time, COUNT(*) as count FROM intraday_prices WHERE symbol = ? AND resolution = ?'
  ).get(upper, '4H');

  const maxTime = stats?.max_time;
  const count = stats?.count || 0;
  const now = Date.now();
  const maxDateTime = maxTime ? new Date(maxTime).getTime() : 0;
  const diffHours = (now - maxDateTime) / (1000 * 60 * 60);

  // If count >= 500 and data was fetched within 2 hours, return from DB immediately (0ms hit)
  if (count >= 500 && diffHours < 2) {
    return db.prepare(
      'SELECT time, price, open, high, low, close, volume FROM intraday_prices WHERE symbol = ? AND resolution = ? ORDER BY time ASC'
    ).all(upper, '4H');
  }

  // 2. Fetch 1h candles from Yahoo Finance
  // Lookback: 720 days (~2 years max allowed by Yahoo Finance)
  try {
    const p1 = new Date(now - 720 * 24 * 60 * 60 * 1000);
    const res = await yahooFinance.chart(upper, { interval: '1h', period1: p1 });

    if (res && res.quotes && res.quotes.length > 0) {
      // Aggregate into 4h bars aligned to UTC 00:00, 04:00, 08:00, 12:00, 16:00, 20:00
      const map4h = new Map();
      for (const q of res.quotes) {
        if (q.close === null || q.close === undefined || isNaN(q.close)) continue;
        const d = new Date(q.date);
        const blockHour = Math.floor(d.getUTCHours() / 4) * 4;
        d.setUTCHours(blockHour, 0, 0, 0);
        const key = d.toISOString();

        const close = Number(q.close);
        const open = q.open !== null && q.open !== undefined ? Number(q.open) : close;
        const high = q.high !== null && q.high !== undefined ? Number(q.high) : Math.max(open, close);
        const low = q.low !== null && q.low !== undefined ? Number(q.low) : Math.min(open, close);
        const volume = q.volume !== null && q.volume !== undefined ? Number(q.volume) : 0;

        if (!map4h.has(key)) {
          map4h.set(key, {
            symbol: upper,
            resolution: '4H',
            time: key,
            price: close,
            open,
            high,
            low,
            close,
            volume
          });
        } else {
          const bar = map4h.get(key);
          bar.high = Math.max(bar.high, high);
          bar.low = Math.min(bar.low, low);
          bar.close = close;
          bar.price = close;
          bar.volume += volume;
        }
      }

      const bars = Array.from(map4h.values()).sort((a, b) => a.time.localeCompare(b.time));

      if (bars.length > 0) {
        const insert = db.prepare(`
          INSERT OR REPLACE INTO intraday_prices (symbol, resolution, time, price, open, high, low, close, volume)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertTx = db.transaction((items) => {
          for (const item of items) {
            insert.run(
              item.symbol,
              item.resolution,
              item.time,
              item.price,
              item.open,
              item.high,
              item.low,
              item.close,
              item.volume
            );
          }
        });
        insertTx(bars);
      }
    }
  } catch (err) {
    console.warn(`[sync4HCandles] Error fetching 1h data for ${upper}:`, err.message);
  }

  return db.prepare(
    'SELECT time, price, open, high, low, close, volume FROM intraday_prices WHERE symbol = ? AND resolution = ? ORDER BY time ASC'
  ).all(upper, '4H');
}
