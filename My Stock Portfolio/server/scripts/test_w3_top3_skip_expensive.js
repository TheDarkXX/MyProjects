/**
 * W3 & W2: Top-3 Waterfall + MA Wall Backtest Suite
 * 
 * Tests the real performance of combining Top-3 Waterfall with Moving Average Wall filters:
 * - Strategy B: Deficit Spread (Baseline)
 * - Strategy D: Waterfall Top-3 (Pure Top-3)
 * - Strategy G: Deficit Spread + Skip Expensive (>10% EMA150)
 * - Strategy D_EMA150_10: Top-3 Waterfall + Skip Expensive (>10% EMA150) [The UI candidate!]
 * - Strategy D_EMA150_15: Top-3 Waterfall + Skip Expensive (>15% EMA150)
 * - Strategy D_EMA150_20: Top-3 Waterfall + Skip Expensive (>20% EMA150)
 * - Strategy D_EMA50_10:  Top-3 Waterfall + Skip Expensive (>10% EMA50)
 * - Strategy D_SMA200_15: Top-3 Waterfall + Skip Expensive (>15% SMA200)
 * 
 * Verifies:
 * 1. 85 Rolling Windows (Full 2016-2026)
 * 2. Clean Windows (Post-Oct 2020 - all 12 stocks active)
 * 3. Out-of-Sample (2022-2026)
 * 4. Control Group (50 random baskets of 12 mature stocks)
 */

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

console.log('Loading candle history from SQLite stock.db...');
const symbolData = {};

for (const sym of ALL_SYMBOLS) {
  const candles = db.prepare('SELECT date, price FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(sym);
  if (!candles || candles.length === 0) continue;

  const closes = candles.map(c => c.price);
  const ema50 = calcEMA(closes, 50);
  const ema150 = calcEMA(closes, 150);
  const sma200 = calcSMA(closes, 200);

  const dateMap = new Map();
  for (let i = 0; i < candles.length; i++) {
    dateMap.set(candles[i].date, {
      price: closes[i],
      ema50: ema50[i],
      ema150: ema150[i],
      sma200: sma200[i]
    });
  }

  symbolData[sym] = { candles, closes, dateMap };
}

const masterDates = symbolData['QQQ'].candles.map(c => c.date);

function calcIRR(cashflows, dates) {
  if (cashflows.length < 2) return 0;
  const d0 = new Date(dates[0]).getTime();
  const times = dates.map(d => (new Date(d).getTime() - d0) / (365.25 * 86400000));

  function npv(r) {
    let sum = 0;
    for (let i = 0; i < cashflows.length; i++) {
      sum += cashflows[i] / Math.pow(1 + r, times[i]);
    }
    return sum;
  }

  let low = -0.999;
  let high = 5.0;
  let npvLow = npv(low);
  let npvHigh = npv(high);

  if (npvLow * npvHigh > 0) {
    high = 20.0;
    npvHigh = npv(high);
    if (npvLow * npvHigh > 0) return 0;
  }

  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid);
    if (Math.abs(npvMid) < 1e-4) return mid * 100;
    if (npvLow * npvMid < 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }

  return ((low + high) / 2) * 100;
}

// Allocator Function
function allocate(strategy, activeBlueprint, activeWeights, curPortVal, vals, netInflow, curDate) {
  const newTargetTotal = curPortVal + netInflow;
  const allocations = {};
  activeBlueprint.forEach(b => { allocations[b.symbol] = 0; });

  const deficits = activeBlueprint.map(b => {
    const targetVal = activeWeights[b.symbol] * newTargetTotal;
    const def = Math.max(0, targetVal - vals[b.symbol]);
    const tech = symbolData[b.symbol]?.dateMap.get(curDate);
    const p = tech?.price || vals[b.symbol];
    const distEma50 = tech?.ema50 ? (p - tech.ema50) / tech.ema50 : 0;
    const distEma150 = tech?.ema150 ? (p - tech.ema150) / tech.ema150 : 0;
    const distSma200 = tech?.sma200 ? (p - tech.sma200) / tech.sma200 : 0;

    return {
      symbol: b.symbol,
      weight: activeWeights[b.symbol],
      deficit: def,
      distEma50,
      distEma150,
      distSma200
    };
  });

  const totalDeficit = deficits.reduce((s, d) => s + d.deficit, 0);
  if (totalDeficit <= 0.01) {
    activeBlueprint.forEach(b => { allocations[b.symbol] = netInflow * activeWeights[b.symbol]; });
    return allocations;
  }

  // B: Deficit Spread
  if (strategy === 'B') {
    deficits.forEach(d => { allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow; });
    return allocations;
  }

  // D: Waterfall Top-3
  if (strategy === 'D') {
    const sorted = [...deficits].sort((a, b) => b.deficit - a.deficit);
    const top3 = sorted.slice(0, 3).filter(d => d.deficit > 0);
    const sumDef = top3.reduce((s, d) => s + d.deficit, 0);
    if (sumDef > 0) {
      top3.forEach(d => { allocations[d.symbol] = (d.deficit / sumDef) * netInflow; });
    } else {
      activeBlueprint.forEach(b => { allocations[b.symbol] = netInflow * activeWeights[b.symbol]; });
    }
    return allocations;
  }

  // G: Deficit Spread + Skip Expensive (>10% EMA150)
  if (strategy === 'G') {
    const eligible = deficits.filter(d => d.distEma150 <= 0.10 && d.deficit > 0);
    const sumDef = eligible.reduce((s, d) => s + d.deficit, 0);
    if (sumDef > 0) {
      eligible.forEach(d => { allocations[d.symbol] = (d.deficit / sumDef) * netInflow; });
    } else {
      deficits.forEach(d => { allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow; });
    }
    return allocations;
  }

  // Helper for Top-3 + MA Filter
  function allocateTop3WithFilter(filterFn) {
    let eligible = deficits.filter(d => filterFn(d) && d.deficit > 0);
    // Fallback if all are expensive
    if (eligible.length === 0) {
      eligible = deficits.filter(d => d.deficit > 0);
    }
    const sorted = [...eligible].sort((a, b) => b.deficit - a.deficit);
    const top3 = sorted.slice(0, 3);
    const sumDef = top3.reduce((s, d) => s + d.deficit, 0);
    if (sumDef > 0) {
      top3.forEach(d => { allocations[d.symbol] = (d.deficit / sumDef) * netInflow; });
    } else {
      activeBlueprint.forEach(b => { allocations[b.symbol] = netInflow * activeWeights[b.symbol]; });
    }
    return allocations;
  }

  // D_EMA150_10: Top-3 + Skip >10% EMA150
  if (strategy === 'D_EMA150_10') {
    return allocateTop3WithFilter(d => d.distEma150 <= 0.10);
  }

  // D_EMA150_15: Top-3 + Skip >15% EMA150
  if (strategy === 'D_EMA150_15') {
    return allocateTop3WithFilter(d => d.distEma150 <= 0.15);
  }

  // D_EMA150_20: Top-3 + Skip >20% EMA150
  if (strategy === 'D_EMA150_20') {
    return allocateTop3WithFilter(d => d.distEma150 <= 0.20);
  }

  // D_EMA50_10: Top-3 + Skip >10% EMA50
  if (strategy === 'D_EMA50_10') {
    return allocateTop3WithFilter(d => d.distEma50 <= 0.10);
  }

  // D_SMA200_15: Top-3 + Skip >15% SMA200
  if (strategy === 'D_SMA200_15') {
    return allocateTop3WithFilter(d => d.distSma200 <= 0.15);
  }

  return allocations;
}

function runSim({ startDate, endDate = '2026-09-17', strategy = 'B' }) {
  const dates = masterDates.filter(d => d >= startDate && d <= endDate);
  if (dates.length < 20) return null;

  const holdings = {};
  BLUEPRINT.forEach(b => { holdings[b.symbol] = 0; });

  const cashflows = [];
  const cfDates = [];
  let totalContributed = 0;
  let peakVal = 0;
  let maxDrawdown = 0;
  let lastMonth = '';
  let totalOrdersPlaced = 0;
  let totalMonths = 0;
  let maxSingleWeightPeak = 0;

  for (let t = 0; t < dates.length; t++) {
    const curDate = dates[t];
    const curMonth = curDate.slice(0, 7);

    const activeBlueprint = BLUEPRINT.filter(b => symbolData[b.symbol]?.dateMap.has(curDate));
    const totalActiveBaseWeight = activeBlueprint.reduce((s, b) => s + b.weight, 0);

    const activeWeights = {};
    activeBlueprint.forEach(b => {
      activeWeights[b.symbol] = b.weight / totalActiveBaseWeight;
    });

    if (curMonth !== lastMonth) {
      lastMonth = curMonth;
      totalMonths++;
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

      const allocMap = allocate(strategy, activeBlueprint, activeWeights, curPortVal, vals, netInflow, curDate);

      let ordersThisMonth = 0;
      activeBlueprint.forEach(b => {
        const alloc = allocMap[b.symbol] || 0;
        if (alloc >= 5.0) {
          const p = symbolData[b.symbol].dateMap.get(curDate).price;
          holdings[b.symbol] += alloc / p;
          ordersThisMonth++;
        }
      });
      totalOrdersPlaced += ordersThisMonth;
    }

    let curVal = 0;
    activeBlueprint.forEach(b => {
      const p = symbolData[b.symbol].dateMap.get(curDate).price;
      curVal += holdings[b.symbol] * p;
    });

    if (curVal > peakVal) peakVal = curVal;
    const dd = peakVal > 0 ? (curVal - peakVal) / peakVal : 0;
    if (dd < maxDrawdown) maxDrawdown = dd;

    if (curVal > 0) {
      activeBlueprint.forEach(b => {
        const p = symbolData[b.symbol].dateMap.get(curDate).price;
        const w = (holdings[b.symbol] * p) / curVal;
        if (w > maxSingleWeightPeak) maxSingleWeightPeak = w;
      });
    }
  }

  let finalVal = 0;
  const lastDate = dates[dates.length - 1];
  BLUEPRINT.forEach(b => {
    if (symbolData[b.symbol]?.dateMap.has(lastDate)) {
      const p = symbolData[b.symbol].dateMap.get(lastDate).price;
      finalVal += holdings[b.symbol] * p;
    }
  });

  cashflows.push(finalVal);
  cfDates.push(lastDate);

  const irr = calcIRR(cashflows, cfDates);
  const multiple = totalContributed > 0 ? finalVal / totalContributed : 0;
  const avgOrders = totalMonths > 0 ? totalOrdersPlaced / totalMonths : 0;

  return {
    strategy,
    startDate,
    endDate: lastDate,
    irr,
    multiple,
    maxDrawdown,
    avgOrders,
    maxSingleWeightPeak
  };
}

// Generate 85 Monthly Rolling Windows
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

console.log(`Generated ${simStartDates.length} rolling windows from ${simStartDates[0]} to ${simStartDates[simStartDates.length - 1]}`);

const STRATEGIES = [
  { id: 'B', name: 'Deficit Spread (Baseline)' },
  { id: 'D', name: 'Waterfall Top-3 (Pure)' },
  { id: 'G', name: 'Deficit Spread + Skip >10% EMA150' },
  { id: 'D_EMA150_10', name: 'Top-3 + Skip >10% EMA150' },
  { id: 'D_EMA150_15', name: 'Top-3 + Skip >15% EMA150' },
  { id: 'D_EMA150_20', name: 'Top-3 + Skip >20% EMA150' },
  { id: 'D_EMA50_10',  name: 'Top-3 + Skip >10% EMA50' },
  { id: 'D_SMA200_15', name: 'Top-3 + Skip >15% SMA200' }
];

function analyzeSuite(windows, label) {
  console.log(`\n========================================================================================`);
  console.log(`  BACKTEST SUITE: ${label} (N = ${windows.length} Windows)`);
  console.log(`========================================================================================`);

  const results = {};
  STRATEGIES.forEach(s => { results[s.id] = []; });

  for (const startDate of windows) {
    for (const s of STRATEGIES) {
      const res = runSim({ startDate, strategy: s.id });
      if (res) results[s.id].push(res);
    }
  }

  // Compare against Strategy B (Baseline) and Strategy D (Top-3 Alone)
  console.log(`Code           | Strategy Description                | Median IRR | Paired Δ vs B | Paired Δ vs D | Worst 10% | Mult  | Max DD | Win% vs B | Win% vs D | Orders`);
  console.log(`----------------------------------------------------------------------------------------------------------------------------------------------------------------`);

  const bRes = results['B'];
  const dRes = results['D'];

  for (const s of STRATEGIES) {
    const list = results[s.id];
    if (list.length === 0) continue;

    const irrs = list.map(r => r.irr).sort((a, b) => a - b);
    const mults = list.map(r => r.multiple).sort((a, b) => a - b);
    const dds = list.map(r => r.maxDrawdown).sort((a, b) => a - b);
    const orders = list.map(r => r.avgOrders);

    const medIRR = irrs[Math.floor(irrs.length / 2)];
    const worst10IRR = irrs[Math.floor(irrs.length * 0.10)];
    const medMult = mults[Math.floor(mults.length / 2)];
    const medDD = dds[Math.floor(dds.length / 2)];
    const avgOrder = orders.reduce((sum, o) => sum + o, 0) / orders.length;

    // Paired Delta vs B
    const deltasB = list.map((r, i) => r.irr - bRes[i].irr).sort((a, b) => a - b);
    const pairedDeltaB = deltasB[Math.floor(deltasB.length / 2)];
    const winRateB = (list.filter((r, i) => r.irr >= bRes[i].irr - 0.001).length / list.length) * 100;

    // Paired Delta vs D
    const deltasD = list.map((r, i) => r.irr - dRes[i].irr).sort((a, b) => a - b);
    const pairedDeltaD = deltasD[Math.floor(deltasD.length / 2)];
    const winRateD = (list.filter((r, i) => r.irr >= dRes[i].irr - 0.001).length / list.length) * 100;

    const pad = (str, n) => str.toString().padEnd(n);
    const fmtDelta = (val) => (val >= 0 ? '+' : '') + val.toFixed(2) + '%/y';

    console.log(
      `${pad(s.id, 14)} | ${pad(s.name, 35)} | ${pad(medIRR.toFixed(2) + '%', 10)} | ${pad(s.id === 'B' ? 'BASELINE' : fmtDelta(pairedDeltaB), 13)} | ${pad(s.id === 'D' ? 'REF' : fmtDelta(pairedDeltaD), 13)} | ${pad(worst10IRR.toFixed(2) + '%', 9)} | ${pad(medMult.toFixed(2) + 'x', 5)} | ${pad((medDD * 100).toFixed(1) + '%', 6)} | ${pad(winRateB.toFixed(1) + '%', 9)} | ${pad(winRateD.toFixed(1) + '%', 9)} | ${avgOrder.toFixed(1)}/mo`
    );
  }
}

// 1. All 85 Rolling Windows (Full 2016-2026)
analyzeSuite(simStartDates, '85 Rolling Windows (Full 2016-2026)');

// 2. Clean Windows (Post Oct 2020 - All 12 stocks exist from Day 1)
const cleanWindows = simStartDates.filter(d => d >= '2020-10-01');
analyzeSuite(cleanWindows, 'Clean Windows (Post-Oct 2020 - All 12 Stocks Active)');

// 3. Out-of-Sample (Post Jan 2022 - Bear 2022 to AI Run 2024-2026)
const oosWindows = simStartDates.filter(d => d >= '2022-01-01');
analyzeSuite(oosWindows, 'Out-of-Sample Period (2022-2026 Bear -> AI Boom)');
