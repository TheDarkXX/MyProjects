import Database from 'better-sqlite3';

const db = new Database('db/stock.db', { readonly: true });
const BLUEPRINT = ['NVDA', 'TSM', 'VRT', 'AVGO', 'APH', 'KLAC', 'ANET', 'MELI', 'CRWD', 'STRL', 'PLTR', 'CLS'];

function calcRSI(closes, period = 14) {
  if (closes.length <= period) return [];
  const rsi = new Array(closes.length).fill(null);
  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

function calcEMA(closes, period) {
  const k = 2 / (period + 1);
  const res = new Array(closes.length).fill(null);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  res[period - 1] = sum / period;
  for (let i = period; i < closes.length; i++) {
    res[i] = closes[i] * k + res[i - 1] * (1 - k);
  }
  return res;
}

const stockData = {};
for (const sym of [...BLUEPRINT, 'QQQ']) {
  const candles = db.prepare('SELECT date, price FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(sym);
  if (!candles || candles.length === 0) continue;
  const closes = candles.map(c => c.price);
  const rsi = calcRSI(closes, 14);
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);
  const ema150 = calcEMA(closes, 150);

  const dateMap = new Map();
  for (let i = 0; i < candles.length; i++) {
    dateMap.set(candles[i].date, {
      price: closes[i],
      rsi: rsi[i],
      ema20: ema20[i],
      ema50: ema50[i],
      ema150: ema150[i]
    });
  }
  stockData[sym] = { candles, dateMap };
}

const qqqCandles = stockData['QQQ'].candles;
const monthEndDates = [];
for (let i = 0; i < qqqCandles.length - 1; i++) {
  if (qqqCandles[i].date.slice(0, 7) !== qqqCandles[i + 1].date.slice(0, 7)) {
    monthEndDates.push(qqqCandles[i].date);
  }
}

// Event Study on RSI & EMA Cross
const obs = [];
for (let mIdx = 0; mIdx < monthEndDates.length - 3; mIdx++) {
  const d = monthEndDates[mIdx];
  const d1M = monthEndDates[mIdx + 1];
  const d3M = monthEndDates[mIdx + 3];

  const active = BLUEPRINT.filter(sym => stockData[sym]?.dateMap.has(d) && stockData[sym]?.dateMap.get(d).rsi !== null);
  if (active.length < 5) continue;

  let sum1M = 0, sum3M = 0, count = 0;
  const rets = {};
  for (const sym of active) {
    const p0 = stockData[sym].dateMap.get(d).price;
    const p1 = stockData[sym].dateMap.get(d1M)?.price;
    const p3 = stockData[sym].dateMap.get(d3M)?.price;
    if (p1 && p3) {
      const r1 = (p1 - p0) / p0;
      const r3 = (p3 - p0) / p0;
      rets[sym] = { r1, r3 };
      sum1M += r1;
      sum3M += r3;
      count++;
    }
  }

  const avg1M = count > 0 ? sum1M / count : 0;
  const avg3M = count > 0 ? sum3M / count : 0;

  for (const sym of active) {
    if (!rets[sym]) continue;
    const cur = stockData[sym].dateMap.get(d);
    obs.push({
      sym,
      date: d,
      rsi: cur.rsi,
      isEmaCrossBear: cur.ema20 < cur.ema50,
      isEma150Extended: (cur.price - cur.ema150) / cur.ema150 > 0.10,
      excess1M: rets[sym].r1 - avg1M,
      excess3M: rets[sym].r3 - avg3M
    });
  }
}

console.log(`Total observations: ${obs.length}`);

// Test Filters
const tests = [
  { name: 'EMA150 > 10% (Current Wall)', fn: o => o.isEma150Extended },
  { name: 'RSI > 70 (Overbought)', fn: o => o.rsi > 70 },
  { name: 'RSI > 75 (Extreme Overbought)', fn: o => o.rsi > 75 },
  { name: 'RSI > 80 (Blow-off Top)', fn: o => o.rsi > 80 },
  { name: 'EMA Cross Bear (EMA20 < EMA50)', fn: o => o.isEmaCrossBear },
  { name: 'RSI > 70 OR EMA150 > 10%', fn: o => o.rsi > 70 || o.isEma150Extended },
  { name: 'RSI > 70 AND EMA150 > 10%', fn: o => o.rsi > 70 && o.isEma150Extended }
];

console.log('\n--- Event Study Comparison: Does skipping these signals save alpha? ---');
console.log('Filter Condition                      | N Exceed | 1M Skip Win% | 1M Alpha Saved | 3M Skip Win% | 3M Alpha Saved');
console.log('---------------------------------------------------------------------------------------------------------------');

for (const t of tests) {
  const match = obs.filter(t.fn);
  const win1M = (match.filter(o => o.excess1M < 0).length / match.length) * 100;
  const alpha1M = -(match.reduce((s, o) => s + o.excess1M, 0) / match.length) * 100;

  const win3M = (match.filter(o => o.excess3M < 0).length / match.length) * 100;
  const alpha3M = -(match.reduce((s, o) => s + o.excess3M, 0) / match.length) * 100;

  const pad = (s, n) => s.padEnd(n);
  const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';

  console.log(
    `${pad(t.name, 37)} | ${pad(match.length.toString(), 8)} | ${pad(win1M.toFixed(1) + '%', 12)} | ${pad(fmt(alpha1M), 14)} | ${pad(win3M.toFixed(1) + '%', 12)} | ${fmt(alpha3M)}`
  );
}
