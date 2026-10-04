/**
 * W1: Moving Average Wall Event Study
 * 
 * Objective:
 * Test which moving average (EMA21, EMA50, EMA100, EMA150, SMA200) and which distance threshold
 * best predicts RELATIVE UNDERPERFORMANCE vs the portfolio basket across 1M, 3M, 6M horizons.
 */

import Database from 'better-sqlite3';

const db = new Database('db/stock.db', { readonly: true });

const BLUEPRINT_SYMBOLS = [
  'NVDA', 'TSM', 'VRT', 'AVGO', 'APH', 'KLAC', 'ANET', 'MELI', 'CRWD', 'STRL', 'PLTR', 'CLS'
];

// Additional liquid control symbols in DB
const CONTROL_SYMBOLS = [
  'AMZN', 'COST', 'ISRG', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMD', 'COIN', 'DOCN'
];

function calcEMA(closes, period) {
  if (!closes || closes.length < period) return [];
  const k = 2 / (period + 1);
  const result = new Array(closes.length).fill(null);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  result[period - 1] = sum / period;
  for (let i = period; i < closes.length; i++) {
    result[i] = closes[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

function calcSMA(closes, period) {
  if (!closes || closes.length < period) return [];
  const result = new Array(closes.length).fill(null);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  result[period - 1] = sum / period;
  for (let i = period; i < closes.length; i++) {
    sum += closes[i] - closes[i - period];
    result[i] = sum / period;
  }
  return result;
}

// 1. Load data
console.log('Loading candles from SQLite stock.db...');
const allSymbols = Array.from(new Set([...BLUEPRINT_SYMBOLS, ...CONTROL_SYMBOLS, 'QQQ']));
const stockData = {};

for (const sym of allSymbols) {
  const candles = db.prepare(`
    SELECT date, price 
    FROM historical_prices 
    WHERE symbol = ? 
    ORDER BY date ASC
  `).all(sym);

  if (!candles || candles.length === 0) continue;

  const closes = candles.map(c => c.price);
  const ema21 = calcEMA(closes, 21);
  const ema50 = calcEMA(closes, 50);
  const ema100 = calcEMA(closes, 100);
  const ema150 = calcEMA(closes, 150);
  const sma200 = calcSMA(closes, 200);

  const dateMap = new Map();
  for (let i = 0; i < candles.length; i++) {
    dateMap.set(candles[i].date, {
      index: i,
      price: closes[i],
      ema21: ema21[i],
      ema50: ema50[i],
      ema100: ema100[i],
      ema150: ema150[i],
      sma200: sma200[i]
    });
  }

  stockData[sym] = { candles, closes, dateMap };
}

// 2. Identify month-end rebalance dates from QQQ
const qqqCandles = stockData['QQQ'].candles;
const monthEndDates = [];
for (let i = 0; i < qqqCandles.length - 1; i++) {
  const curMonth = qqqCandles[i].date.substring(0, 7);
  const nextMonth = qqqCandles[i + 1].date.substring(0, 7);
  if (curMonth !== nextMonth) {
    monthEndDates.push(qqqCandles[i].date);
  }
}

console.log(`Identified ${monthEndDates.length} month-end decision dates from ${monthEndDates[0]} to ${monthEndDates[monthEndDates.length - 1]}`);

// 3. Distance Buckets
const BUCKETS = [
  { label: '< 0% (Below)', min: -Infinity, max: 0 },
  { label: '0% - 5%', min: 0, max: 0.05 },
  { label: '5% - 10%', min: 0.05, max: 0.10 },
  { label: '10% - 15%', min: 0.10, max: 0.15 },
  { label: '15% - 20%', min: 0.15, max: 0.20 },
  { label: '20% - 30%', min: 0.20, max: 0.30 },
  { label: '> 30% (Extended)', min: 0.30, max: Infinity }
];

const MA_KEYS = ['ema21', 'ema50', 'ema100', 'ema150', 'sma200'];

function runEventStudy(symbolList, labelName, startDate = '2016-01-01', endDate = '2026-10-01') {
  console.log(`\n================================================================`);
  console.log(`  EVENT STUDY: ${labelName} (${startDate} to ${endDate})`);
  console.log(`================================================================`);

  // Collect month-end observations
  const observations = [];

  for (let mIdx = 0; mIdx < monthEndDates.length; mIdx++) {
    const d = monthEndDates[mIdx];
    if (d < startDate || d > endDate) continue;

    // Check which stocks are active on date d
    const active = [];
    for (const sym of symbolList) {
      const data = stockData[sym];
      if (!data) continue;
      const cur = data.dateMap.get(d);
      if (cur && cur.ema150 !== null) {
        active.push({ sym, cur });
      }
    }

    if (active.length < 5) continue; // Skip if too few stocks active

    // Calculate forward returns (1M, 3M, 6M)
    // 1M ~ next month-end date
    const d1M = monthEndDates[mIdx + 1];
    const d3M = monthEndDates[mIdx + 3];
    const d6M = monthEndDates[mIdx + 6];

    // Compute returns
    const stockReturns = {};
    let sumRet1M = 0, count1M = 0;
    let sumRet3M = 0, count3M = 0;
    let sumRet6M = 0, count6M = 0;

    for (const { sym, cur } of active) {
      const data = stockData[sym];
      const p1M = d1M ? data.dateMap.get(d1M)?.price : null;
      const p3M = d3M ? data.dateMap.get(d3M)?.price : null;
      const p6M = d6M ? data.dateMap.get(d6M)?.price : null;

      const ret1M = p1M ? (p1M - cur.price) / cur.price : null;
      const ret3M = p3M ? (p3M - cur.price) / cur.price : null;
      const ret6M = p6M ? (p6M - cur.price) / cur.price : null;

      stockReturns[sym] = { ret1M, ret3M, ret6M };

      if (ret1M !== null) { sumRet1M += ret1M; count1M++; }
      if (ret3M !== null) { sumRet3M += ret3M; count3M++; }
      if (ret6M !== null) { sumRet6M += ret6M; count6M++; }
    }

    const avgRet1M = count1M > 0 ? sumRet1M / count1M : 0;
    const avgRet3M = count3M > 0 ? sumRet3M / count3M : 0;
    const avgRet6M = count6M > 0 ? sumRet6M / count6M : 0;

    for (const { sym, cur } of active) {
      const rets = stockReturns[sym];
      if (!rets) continue;

      // Calculate distances for all MAs
      const distances = {};
      for (const ma of MA_KEYS) {
        const maVal = cur[ma];
        if (maVal && maVal > 0) {
          distances[ma] = (cur.price - maVal) / maVal;
        } else {
          distances[ma] = null;
        }
      }

      observations.push({
        date: d,
        sym,
        price: cur.price,
        distances,
        ret1M: rets.ret1M,
        ret3M: rets.ret3M,
        ret6M: rets.ret6M,
        excess1M: rets.ret1M !== null ? rets.ret1M - avgRet1M : null,
        excess3M: rets.ret3M !== null ? rets.ret3M - avgRet3M : null,
        excess6M: rets.ret6M !== null ? rets.ret6M - avgRet6M : null
      });
    }
  }

  console.log(`Total sample points: ${observations.length} stock-months`);

  // Analyze each MA across buckets
  for (const ma of MA_KEYS) {
    console.log(`\n--- Indicator: ${ma.toUpperCase()} ---`);
    console.log(`Bucket            | N     | 1M Ret  | 1M vs Basket | Skip Win% 1M | 3M vs Basket | Skip Win% 3M | 6M vs Basket`);
    console.log(`---------------------------------------------------------------------------------------------------------`);

    for (const b of BUCKETS) {
      const match = observations.filter(o => {
        const dist = o.distances[ma];
        return dist !== null && dist >= b.min && dist < b.max;
      });

      if (match.length === 0) continue;

      const valid1M = match.filter(o => o.excess1M !== null);
      const valid3M = match.filter(o => o.excess3M !== null);
      const valid6M = match.filter(o => o.excess6M !== null);

      const mean1MRet = valid1M.reduce((s, o) => s + o.ret1M, 0) / valid1M.length;
      const mean1MExcess = valid1M.reduce((s, o) => s + o.excess1M, 0) / valid1M.length;
      const skipWin1M = (valid1M.filter(o => o.excess1M < 0).length / valid1M.length) * 100;

      const mean3MExcess = valid3M.length > 0 ? valid3M.reduce((s, o) => s + o.excess3M, 0) / valid3M.length : 0;
      const skipWin3M = valid3M.length > 0 ? (valid3M.filter(o => o.excess3M < 0).length / valid3M.length) * 100 : 0;

      const mean6MExcess = valid6M.length > 0 ? valid6M.reduce((s, o) => s + o.excess6M, 0) / valid6M.length : 0;

      const pad = (s, n) => s.toString().padEnd(n);
      const fmtPct = (val) => (val >= 0 ? '+' : '') + (val * 100).toFixed(2) + '%';

      console.log(
        `${pad(b.label, 17)} | ${pad(match.length, 5)} | ${pad(fmtPct(mean1MRet), 7)} | ${pad(fmtPct(mean1MExcess), 12)} | ${pad(skipWin1M.toFixed(1) + '%', 12)} | ${pad(fmtPct(mean3MExcess), 12)} | ${pad(skipWin3M.toFixed(1) + '%', 12)} | ${fmtPct(mean6MExcess)}`
      );
    }
  }
}

// Run 1: Master Blueprint (Full Period 2016-2026)
runEventStudy(BLUEPRINT_SYMBOLS, 'Master Blueprint (Full 2016-2026)', '2016-01-01', '2026-10-01');

// Run 2: Master Blueprint Clean Window (Post-Oct 2020 All 12 stocks active)
runEventStudy(BLUEPRINT_SYMBOLS, 'Master Blueprint Clean Window (Post-Oct 2020)', '2020-10-01', '2026-10-01');

// Run 3: Out-of-Sample Validation (2022-2026 Bear/Bull/AI Run)
runEventStudy(BLUEPRINT_SYMBOLS, 'Out-of-Sample Period (2022-2026)', '2022-01-01', '2026-10-01');

// Run 4: Broader Control Group (10 control stocks)
const validControl = CONTROL_SYMBOLS.filter(s => stockData[s]);
runEventStudy(validControl, 'Control Group (Broader Nasdaq/Mega-cap)', '2016-01-01', '2026-10-01');
