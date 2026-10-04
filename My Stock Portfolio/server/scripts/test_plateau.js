import Database from 'better-sqlite3';

const db = new Database('db/stock.db', { readonly: true });
const MONTHLY_INFLOW = 1000;
const TRANSACTION_FEE = 0.0015;

const BLUEPRINT = [
  { symbol: 'NVDA', weight: 0.15 },
  { symbol: 'TSM', weight: 0.14 },
  { symbol: 'VRT', weight: 0.13 },
  { symbol: 'AVGO', weight: 0.11 },
  { symbol: 'APH', weight: 0.11 },
  { symbol: 'KLAC', weight: 0.08 },
  { symbol: 'ANET', weight: 0.07 },
  { symbol: 'MELI', weight: 0.05 },
  { symbol: 'CRWD', weight: 0.05 },
  { symbol: 'STRL', weight: 0.03 },
  { symbol: 'PLTR', weight: 0.03 },
  { symbol: 'CLS', weight: 0.02 }
];

const ALL_SYMBOLS = [...BLUEPRINT.map(b => b.symbol), 'QQQ'];

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

const symbolData = {};
for (const sym of ALL_SYMBOLS) {
  const candles = db.prepare('SELECT date, price FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(sym);
  if (!candles || candles.length === 0) continue;
  const closes = candles.map(c => c.price);
  const ema150 = calcEMA(closes, 150);
  const dateMap = new Map();
  for (let i = 0; i < candles.length; i++) {
    dateMap.set(candles[i].date, { price: closes[i], ema150: ema150[i] });
  }
  symbolData[sym] = { candles, dateMap };
}

const masterDates = symbolData['QQQ'].candles.map(c => c.date);

function calcIRR(cashflows, dates) {
  if (cashflows.length < 2) return 0;
  const d0 = new Date(dates[0]).getTime();
  const times = dates.map(d => (new Date(d).getTime() - d0) / (365.25 * 86400000));
  function npv(r) {
    let sum = 0;
    for (let i = 0; i < cashflows.length; i++) sum += cashflows[i] / Math.pow(1 + r, times[i]);
    return sum;
  }
  let low = -0.999, high = 10.0;
  let npvLow = npv(low), npvHigh = npv(high);
  if (npvLow * npvHigh > 0) return 0;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid);
    if (Math.abs(npvMid) < 1e-4) return mid * 100;
    if (npvLow * npvMid < 0) high = mid; else low = mid;
  }
  return ((low + high) / 2) * 100;
}

function runSim(threshold, startDate) {
  const dates = masterDates.filter(d => d >= startDate && d <= '2026-09-17');
  if (dates.length < 20) return null;

  const holdings = {};
  BLUEPRINT.forEach(b => { holdings[b.symbol] = 0; });
  const cashflows = [], cfDates = [];
  let totalContributed = 0, lastMonth = '';

  for (let t = 0; t < dates.length; t++) {
    const curDate = dates[t];
    const curMonth = curDate.slice(0, 7);

    const activeBlueprint = BLUEPRINT.filter(b => symbolData[b.symbol]?.dateMap.has(curDate));
    const totalActiveWeight = activeBlueprint.reduce((s, b) => s + b.weight, 0);

    if (curMonth !== lastMonth) {
      lastMonth = curMonth;
      totalContributed += MONTHLY_INFLOW;
      cashflows.push(-MONTHLY_INFLOW);
      cfDates.push(curDate);

      const netInflow = MONTHLY_INFLOW * (1 - TRANSACTION_FEE);
      let curPortVal = 0;
      const vals = {};
      activeBlueprint.forEach(b => {
        const p = symbolData[b.symbol].dateMap.get(curDate).price;
        vals[b.symbol] = holdings[b.symbol] * p;
        curPortVal += vals[b.symbol];
      });

      const newTargetTotal = curPortVal + netInflow;
      const deficits = activeBlueprint.map(b => {
        const p = symbolData[b.symbol].dateMap.get(curDate).price;
        const targetVal = (b.weight / totalActiveWeight) * newTargetTotal;
        const def = Math.max(0, targetVal - vals[b.symbol]);
        const ema150 = symbolData[b.symbol].dateMap.get(curDate).ema150;
        const distEma150 = ema150 ? (p - ema150) / ema150 : 0;
        return { symbol: b.symbol, deficit: def, distEma150, weight: b.weight };
      });

      let eligible = deficits.filter(d => (threshold === null || d.distEma150 <= threshold) && d.deficit > 0);
      if (eligible.length === 0) eligible = deficits.filter(d => d.deficit > 0);

      const sorted = [...eligible].sort((a, b) => b.deficit - a.deficit);
      const top3 = sorted.slice(0, 3);
      const sumDef = top3.reduce((s, d) => s + d.deficit, 0);

      const allocations = {};
      activeBlueprint.forEach(b => { allocations[b.symbol] = 0; });
      if (sumDef > 0) {
        top3.forEach(d => { allocations[d.symbol] = (d.deficit / sumDef) * netInflow; });
      }

      activeBlueprint.forEach(b => {
        const alloc = allocations[b.symbol] || 0;
        if (alloc >= 5.0) {
          const p = symbolData[b.symbol].dateMap.get(curDate).price;
          holdings[b.symbol] += alloc / p;
        }
      });
    }
  }

  let finalVal = 0;
  const lastDate = dates[dates.length - 1];
  BLUEPRINT.forEach(b => {
    if (symbolData[b.symbol]?.dateMap.has(lastDate)) {
      finalVal += holdings[b.symbol] * symbolData[b.symbol].dateMap.get(lastDate).price;
    }
  });
  cashflows.push(finalVal);
  cfDates.push(lastDate);

  return calcIRR(cashflows, cfDates);
}

// Windows
const simStartDates = [];
let prevMonth = '';
for (const d of masterDates) {
  if (d < '2016-09-01' || d > '2023-09-01') continue;
  const m = d.slice(0, 7);
  if (m !== prevMonth) {
    prevMonth = m;
    simStartDates.push(d);
  }
}

// Test thresholds
const thresholds = [
  { label: 'Pure Top-3 (No Filter)', th: null },
  { label: 'EMA150 > 5.0%', th: 0.05 },
  { label: 'EMA150 > 7.5%', th: 0.075 },
  { label: 'EMA150 > 10.0%', th: 0.10 },
  { label: 'EMA150 > 12.5%', th: 0.125 },
  { label: 'EMA150 > 15.0%', th: 0.15 },
  { label: 'EMA150 > 17.5%', th: 0.175 },
  { label: 'EMA150 > 20.0%', th: 0.20 }
];

console.log('Testing Parameter Plateau across 85 Rolling Windows:');
console.log('Threshold       | Median IRR | Paired Δ vs Pure Top-3 | Win Rate vs Pure Top-3');
console.log('--------------------------------------------------------------------------------');

// Get Pure Top-3 baseline per window
const baseIRRs = simStartDates.map(d => runSim(null, d));

for (const t of thresholds) {
  const irrs = simStartDates.map(d => runSim(t.th, d));
  const deltas = irrs.map((irr, i) => irr - baseIRRs[i]).sort((a, b) => a - b);
  const sortedIRR = [...irrs].sort((a, b) => a - b);
  const medIRR = sortedIRR[Math.floor(sortedIRR.length / 2)];
  const medDelta = deltas[Math.floor(deltas.length / 2)];
  const winRate = (deltas.filter(d => d >= -0.001).length / deltas.length) * 100;

  const pad = (s, n) => s.padEnd(n);
  const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%/y';

  console.log(
    `${pad(t.label, 15)} | ${pad(medIRR.toFixed(2) + '%', 10)} | ${pad(fmt(medDelta), 22)} | ${winRate.toFixed(1)}%`
  );
}
