import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const TECH_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours in-memory cache
const technicalCache = new Map();

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
