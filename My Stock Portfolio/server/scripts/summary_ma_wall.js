import Database from 'better-sqlite3';

const db = new Database('db/stock.db', { readonly: true });
const BLUEPRINT_SYMBOLS = ['NVDA', 'TSM', 'VRT', 'AVGO', 'APH', 'KLAC', 'ANET', 'MELI', 'CRWD', 'STRL', 'PLTR', 'CLS'];

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

const stockData = {};
for (const sym of [...BLUEPRINT_SYMBOLS, 'QQQ']) {
  const candles = db.prepare('SELECT date, price FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(sym);
  if (!candles || candles.length === 0) continue;
  const closes = candles.map(c => c.price);
  stockData[sym] = {
    candles,
    closes,
    dateMap: new Map(candles.map((c, i) => [c.date, {
      price: c.price,
      ema21: calcEMA(closes, 21)[i],
      ema50: calcEMA(closes, 50)[i],
      ema100: calcEMA(closes, 100)[i],
      ema150: calcEMA(closes, 150)[i],
      sma200: calcSMA(closes, 200)[i]
    }]))
  };
}

const qqqCandles = stockData['QQQ'].candles;
const monthEndDates = [];
for (let i = 0; i < qqqCandles.length - 1; i++) {
  if (qqqCandles[i].date.substring(0, 7) !== qqqCandles[i + 1].date.substring(0, 7)) {
    monthEndDates.push(qqqCandles[i].date);
  }
}

// Check only Master Blueprint 2016-2026
const observations = [];
for (let mIdx = 0; mIdx < monthEndDates.length; mIdx++) {
  const d = monthEndDates[mIdx];
  const active = [];
  for (const sym of BLUEPRINT_SYMBOLS) {
    const cur = stockData[sym]?.dateMap.get(d);
    if (cur && cur.ema150 !== null) active.push({ sym, cur });
  }
  if (active.length < 5) continue;

  const d1M = monthEndDates[mIdx + 1];
  const d3M = monthEndDates[mIdx + 3];
  let sumRet1M = 0, count1M = 0;
  let sumRet3M = 0, count3M = 0;
  const stockRet = {};

  for (const { sym, cur } of active) {
    const p1M = d1M ? stockData[sym].dateMap.get(d1M)?.price : null;
    const p3M = d3M ? stockData[sym].dateMap.get(d3M)?.price : null;
    const ret1M = p1M ? (p1M - cur.price) / cur.price : null;
    const ret3M = p3M ? (p3M - cur.price) / cur.price : null;
    stockRet[sym] = { ret1M, ret3M };
    if (ret1M !== null) { sumRet1M += ret1M; count1M++; }
    if (ret3M !== null) { sumRet3M += ret3M; count3M++; }
  }

  const avg1M = count1M > 0 ? sumRet1M / count1M : 0;
  const avg3M = count3M > 0 ? sumRet3M / count3M : 0;

  for (const { sym, cur } of active) {
    const rets = stockRet[sym];
    if (!rets || rets.ret1M === null) continue;
    observations.push({
      date: d,
      sym,
      cur,
      excess1M: rets.ret1M - avg1M,
      excess3M: rets.ret3M !== null ? rets.ret3M - avg3M : null
    });
  }
}

console.log('=== SUMMARY: MASTER BLUEPRINT (N = ' + observations.length + ' stock-months) ===');
console.log('Testing "Skip if > Threshold" across different MAs:');
console.log('MA Indicator | Threshold | N Exceed | Skip Win Rate 1M | Mean 1M Alpha Saved | Skip Win Rate 3M | Mean 3M Alpha Saved');
console.log('-------------------------------------------------------------------------------------------------------------------');

const tests = [
  { ma: 'ema21', th: 0.05 },
  { ma: 'ema21', th: 0.10 },
  { ma: 'ema50', th: 0.05 },
  { ma: 'ema50', th: 0.10 },
  { ma: 'ema50', th: 0.15 },
  { ma: 'ema100', th: 0.08 },
  { ma: 'ema100', th: 0.10 },
  { ma: 'ema100', th: 0.15 },
  { ma: 'ema150', th: 0.05 },
  { ma: 'ema150', th: 0.10 },
  { ma: 'ema150', th: 0.15 },
  { ma: 'ema150', th: 0.20 },
  { ma: 'ema150', th: 0.25 },
  { ma: 'sma200', th: 0.10 },
  { ma: 'sma200', th: 0.15 },
  { ma: 'sma200', th: 0.20 },
  { ma: 'sma200', th: 0.25 }
];

for (const t of tests) {
  const exceeded = observations.filter(o => {
    const maVal = o.cur[t.ma];
    if (!maVal) return false;
    return (o.cur.price - maVal) / maVal > t.th;
  });

  if (exceeded.length === 0) continue;

  const valid1M = exceeded.filter(o => o.excess1M !== null);
  const valid3M = exceeded.filter(o => o.excess3M !== null);

  const win1M = (valid1M.filter(o => o.excess1M < 0).length / valid1M.length) * 100;
  // Alpha saved = -(mean excess return). If stock was -2% vs basket, skipping it saved +2%!
  const alpha1M = -(valid1M.reduce((s, o) => s + o.excess1M, 0) / valid1M.length) * 100;

  const win3M = valid3M.length > 0 ? (valid3M.filter(o => o.excess3M < 0).length / valid3M.length) * 100 : 0;
  const alpha3M = valid3M.length > 0 ? -(valid3M.reduce((s, o) => s + o.excess3M, 0) / valid3M.length) * 100 : 0;

  const pad = (s, n) => s.toString().padEnd(n);
  const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';

  console.log(
    `${pad(t.ma.toUpperCase(), 12)} | ${pad('>' + (t.th * 100) + '%', 9)} | ${pad(exceeded.length, 8)} | ${pad(win1M.toFixed(1) + '%', 16)} | ${pad(fmt(alpha1M), 19)} | ${pad(win3M.toFixed(1) + '%', 16)} | ${fmt(alpha3M)}`
  );
}
