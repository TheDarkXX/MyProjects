import Database from 'better-sqlite3';

const db = new Database('db/stock.db', { readonly: true });
const MONTHLY_INFLOW = 1000;
const TRANSACTION_FEE = 0.0015;

// Find all stocks in DB with data starting from 2016-09-01
const rows = db.prepare(`
  SELECT symbol, min(date) as minDate, count(*) as bars 
  FROM historical_prices 
  GROUP BY symbol 
  HAVING minDate <= '2016-10-01' AND bars >= 2000
`).all();

console.log(`Found ${rows.length} mature stocks with full 10-year history:`, rows.map(r => r.symbol));

const matureSymbols = rows.map(r => r.symbol).filter(s => s !== 'QQQ' && !s.includes('=') && !s.includes('-'));
console.log(`Eligible non-benchmark stocks: ${matureSymbols.length}`, matureSymbols);

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
for (const sym of [...matureSymbols, 'QQQ']) {
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

function runBasketSim(basket, strategy, startDate) {
  const dates = masterDates.filter(d => d >= startDate && d <= '2026-09-17');
  if (dates.length < 20) return null;

  const holdings = {};
  basket.forEach(s => { holdings[s] = 0; });
  const baseWeight = 1 / basket.length;

  const cashflows = [];
  const cfDates = [];
  let totalContributed = 0;
  let lastMonth = '';

  for (let t = 0; t < dates.length; t++) {
    const curDate = dates[t];
    const curMonth = curDate.slice(0, 7);

    if (curMonth !== lastMonth) {
      lastMonth = curMonth;
      totalContributed += MONTHLY_INFLOW;
      cashflows.push(-MONTHLY_INFLOW);
      cfDates.push(curDate);

      const netInflow = MONTHLY_INFLOW * (1 - TRANSACTION_FEE);
      let curPortVal = 0;
      const vals = {};
      const curPrices = {};
      let hasMissing = false;
      basket.forEach(sym => {
        const d = symbolData[sym].dateMap.get(curDate);
        if (!d) hasMissing = true;
        else curPrices[sym] = d.price;
      });
      if (hasMissing) continue;

      basket.forEach(sym => {
        vals[sym] = holdings[sym] * curPrices[sym];
        curPortVal += vals[sym];
      });

      const newTargetTotal = curPortVal + netInflow;
      const deficits = basket.map(sym => {
        const p = curPrices[sym];
        const targetVal = baseWeight * newTargetTotal;
        const def = Math.max(0, targetVal - vals[sym]);
        const ema150 = symbolData[sym].dateMap.get(curDate).ema150;
        const distEma150 = ema150 ? (p - ema150) / ema150 : 0;
        return { symbol: sym, deficit: def, distEma150 };
      });

      const allocations = {};
      basket.forEach(sym => { allocations[sym] = 0; });

      if (strategy === 'D') {
        const sorted = [...deficits].sort((a, b) => b.deficit - a.deficit);
        const top3 = sorted.slice(0, 3).filter(d => d.deficit > 0);
        const sumDef = top3.reduce((s, d) => s + d.deficit, 0);
        if (sumDef > 0) top3.forEach(d => { allocations[d.symbol] = (d.deficit / sumDef) * netInflow; });
        else basket.forEach(sym => { allocations[sym] = netInflow * baseWeight; });
      } else if (strategy === 'D_EMA150_10') {
        let eligible = deficits.filter(d => d.distEma150 <= 0.10 && d.deficit > 0);
        if (eligible.length === 0) eligible = deficits.filter(d => d.deficit > 0);
        const sorted = [...eligible].sort((a, b) => b.deficit - a.deficit);
        const top3 = sorted.slice(0, 3);
        const sumDef = top3.reduce((s, d) => s + d.deficit, 0);
        if (sumDef > 0) top3.forEach(d => { allocations[d.symbol] = (d.deficit / sumDef) * netInflow; });
        else basket.forEach(sym => { allocations[sym] = netInflow * baseWeight; });
      }

      basket.forEach(sym => {
        const alloc = allocations[sym] || 0;
        if (alloc >= 5.0) {
          const p = symbolData[sym].dateMap.get(curDate).price;
          holdings[sym] += alloc / p;
        }
      });
    }
  }

  let finalVal = 0;
  const lastDate = dates[dates.length - 1];
  basket.forEach(sym => {
    const data = symbolData[sym];
    const p = data.dateMap.get(lastDate)?.price || data.candles[data.candles.length - 1]?.price;
    finalVal += holdings[sym] * p;
  });
  cashflows.push(finalVal);
  cfDates.push(lastDate);

  return calcIRR(cashflows, cfDates);
}

// Run 50 random baskets of 8 mature stocks across 3 different start periods
console.log('Running 50 random basket control tests...');
let winCount = 0;
let totalPairs = 0;
const deltas = [];

const startPeriods = ['2016-09-01', '2018-01-01', '2020-01-01'];

for (let i = 0; i < 50; i++) {
  // Pick random 8 stocks from matureSymbols
  const shuffled = [...matureSymbols].sort(() => 0.5 - Math.random());
  const basket = shuffled.slice(0, 8);
  const start = startPeriods[i % startPeriods.length];

  const irrD = runBasketSim(basket, 'D', start);
  const irrD_Skip = runBasketSim(basket, 'D_EMA150_10', start);

  if (irrD && irrD_Skip) {
    const delta = irrD_Skip - irrD;
    deltas.push(delta);
    if (delta >= -0.001) winCount++;
    totalPairs++;
  }
}

deltas.sort((a, b) => a - b);
const medianDelta = deltas[Math.floor(deltas.length / 2)];
const winRate = (winCount / totalPairs) * 100;

console.log(`Control Group Results (Random Baskets):`);
console.log(`Total Trials: ${totalPairs}`);
console.log(`Win Rate of Top-3 + Skip >10% EMA150 vs Pure Top-3: ${winRate.toFixed(1)}% (${winCount}/${totalPairs})`);
console.log(`Median Paired Delta: ${medianDelta >= 0 ? '+' : ''}${medianDelta.toFixed(2)}%/yr`);
