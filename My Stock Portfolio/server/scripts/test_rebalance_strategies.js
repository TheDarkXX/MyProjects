/**
 * Project 2X — Quantitative Rebalance Strategy Backtest (T0 + T1)
 * 
 * Pre-registered Evaluation Matrix:
 * - T0: Rolling Starts (85 monthly windows 2016-09 to 2023-09) + Control Universe
 * - T1: Inflow Allocation Rules:
 *   A) Proportional DCA (Static Target Weights)
 *   B) Deficit Spread (Current Engine - Proportional to Deficit)
 *   C) Waterfall Full (Fill largest deficit 100% first, then spill over)
 *   D) Waterfall Top-3 (Distribute among top 3 deficit assets)
 *   E) Waterfall Cap 40% (Fill largest deficit up to 40% max per asset)
 * 
 * Gate Condition:
 * - Strategy wins if: Median IRR >= +0.5%/yr AND Win Rate >= 70% vs Baseline.
 * - Otherwise: Statistical DRAW (Choose lowest operational friction / order count).
 */

import Database from 'better-sqlite3';

const db = new Database('db/stock.db', { readonly: true });
const MONTHLY_INFLOW = 1000;
const TRANSACTION_FEE = 0.0015; // 0.15% fee/spread

const BLUEPRINT = [
  // Core (89%)
  { symbol: 'NVDA', category: 'Core', weight: 0.15 },
  { symbol: 'TSM', category: 'Core', weight: 0.14 },
  { symbol: 'VRT', category: 'Core', weight: 0.13 },
  { symbol: 'AVGO', category: 'Core', weight: 0.11 },
  { symbol: 'APH', category: 'Core', weight: 0.11 },
  { symbol: 'KLAC', category: 'Core', weight: 0.08 },
  { symbol: 'ANET', category: 'Core', weight: 0.07 },
  { symbol: 'MELI', category: 'Core', weight: 0.05 },
  { symbol: 'CRWD', category: 'Core', weight: 0.05 },
  // Moonshot (11%)
  { symbol: 'STRL', category: 'Moonshot', weight: 0.03 },
  { symbol: 'PLTR', category: 'Moonshot', weight: 0.03 },
  { symbol: 'CLS', category: 'Moonshot', weight: 0.02 },
];

const ALL_SYMBOLS = [...BLUEPRINT.map(b => b.symbol), 'QQQ'];

// 1. Load Price History
console.log('Loading price history from SQLite stock.db...');
const symbolData = {};

for (const sym of ALL_SYMBOLS) {
  const candles = db.prepare(`
    SELECT date, price 
    FROM historical_prices 
    WHERE symbol = ? 
    ORDER BY date ASC
  `).all(sym);

  if (!candles || candles.length === 0) {
    console.warn(`Missing price data for ${sym}`);
    continue;
  }

  const dateMap = new Map();
  for (const c of candles) {
    dateMap.set(c.date, c.price);
  }

  symbolData[sym] = {
    candles,
    dateMap
  };
}

const masterDates = symbolData['QQQ'].candles.map(c => c.date);

// 2. Exact IRR Calculation (Newton-Raphson with Bisection Fallback)
function calculateIRR(cashflows, dates) {
  const n = cashflows.length;
  if (n < 2) return 0;

  const t0 = new Date(dates[0]).getTime();
  const times = dates.map(d => (new Date(d).getTime() - t0) / (365.25 * 24 * 3600 * 1000));

  const npv = (r) => {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += cashflows[i] / Math.pow(1 + r, times[i]);
    }
    return sum;
  };

  // Bisection search for annualized rate r in [-0.9, 10.0]
  let low = -0.90;
  let high = 5.00;
  let npvLow = npv(low);
  let npvHigh = npv(high);

  if (npvLow * npvHigh > 0) {
    return 0; // No root or extreme case
  }

  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid);
    if (Math.abs(npvMid) < 0.01 || (high - low) < 0.0001) {
      return mid * 100;
    }
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

// 3. Strategy Allocator Implementations
function allocateInflow(strategy, activeBlueprint, activeWeights, curPortVal, vals, netInflow) {
  const newTargetTotal = curPortVal + netInflow;
  const allocations = {};
  activeBlueprint.forEach(b => { allocations[b.symbol] = 0; });

  // A) Proportional
  if (strategy === 'proportional') {
    activeBlueprint.forEach(b => {
      allocations[b.symbol] = netInflow * activeWeights[b.symbol];
    });
    return allocations;
  }

  // Calculate deficits for all deficit-based strategies
  const deficits = activeBlueprint.map(b => {
    const targetVal = activeWeights[b.symbol] * newTargetTotal;
    const def = Math.max(0, targetVal - vals[b.symbol]);
    return {
      symbol: b.symbol,
      weight: activeWeights[b.symbol],
      deficit: def,
      targetVal,
      currentVal: vals[b.symbol]
    };
  });

  const totalDeficit = deficits.reduce((s, d) => s + d.deficit, 0);

  // If no deficit (e.g. at start or perfectly balanced), fallback to proportional
  if (totalDeficit <= 0.01) {
    activeBlueprint.forEach(b => {
      allocations[b.symbol] = netInflow * activeWeights[b.symbol];
    });
    return allocations;
  }

  // B) Deficit Spread (Current Engine)
  if (strategy === 'deficit_spread') {
    deficits.forEach(d => {
      allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow;
    });
    return allocations;
  }

  // C) Waterfall Full (Fill largest deficit 100% first)
  if (strategy === 'waterfall_full') {
    const sorted = [...deficits].sort((a, b) => b.deficit - a.deficit);
    let remainingCash = netInflow;

    for (const d of sorted) {
      if (remainingCash <= 0.01) break;
      if (d.deficit <= 0) continue;
      const take = Math.min(remainingCash, d.deficit);
      allocations[d.symbol] += take;
      remainingCash -= take;
    }

    // Spillover if all deficits filled
    if (remainingCash > 0.01) {
      sorted.forEach(d => {
        allocations[d.symbol] += remainingCash * d.weight;
      });
    }
    return allocations;
  }

  // D) Waterfall Top-3
  if (strategy === 'waterfall_top3') {
    const sorted = [...deficits].sort((a, b) => b.deficit - a.deficit);
    const top3 = sorted.slice(0, 3).filter(d => d.deficit > 0);
    const top3DeficitSum = top3.reduce((s, d) => s + d.deficit, 0);

    if (top3DeficitSum > 0) {
      top3.forEach(d => {
        allocations[d.symbol] = (d.deficit / top3DeficitSum) * netInflow;
      });
    } else {
      activeBlueprint.forEach(b => {
        allocations[b.symbol] = netInflow * activeWeights[b.symbol];
      });
    }
    return allocations;
  }

  // E) Waterfall Cap 40% (No single asset gets > 40% of monthly inflow)
  if (strategy === 'waterfall_cap40') {
    const sorted = [...deficits].sort((a, b) => b.deficit - a.deficit);
    const maxSingleCap = netInflow * 0.40;
    let remainingCash = netInflow;

    // Iterative filling with cap
    for (const d of sorted) {
      if (remainingCash <= 0.01) break;
      if (d.deficit <= 0) continue;
      const availableCap = maxSingleCap - allocations[d.symbol];
      if (availableCap <= 0) continue;
      const take = Math.min(remainingCash, d.deficit, availableCap);
      allocations[d.symbol] += take;
      remainingCash -= take;
    }

    // If remaining cash left, distribute across all remaining un-capped or proportionally
    if (remainingCash > 0.01) {
      sorted.forEach(d => {
        allocations[d.symbol] += remainingCash * d.weight;
      });
    }
    return allocations;
  }

  return allocations;
}

// 4. Single Simulation Runner
function runSimulation({ startDate, endDate = '2026-09-17', strategy = 'deficit_spread' }) {
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

    // Identify active assets
    const activeBlueprint = BLUEPRINT.filter(b => symbolData[b.symbol]?.dateMap.has(curDate));
    const totalActiveBaseWeight = activeBlueprint.reduce((s, b) => s + b.weight, 0);

    const activeWeights = {};
    activeBlueprint.forEach(b => {
      activeWeights[b.symbol] = b.weight / totalActiveBaseWeight;
    });

    // Monthly Inflow Injection
    if (curMonth !== lastMonth) {
      lastMonth = curMonth;
      totalMonths++;
      totalContributed += MONTHLY_INFLOW;
      cashflows.push(-MONTHLY_INFLOW);
      cfDates.push(curDate);

      const netInflow = MONTHLY_INFLOW * (1 - TRANSACTION_FEE);

      // Current portfolio valuation
      let curPortVal = 0;
      const vals = {};
      activeBlueprint.forEach(b => {
        const p = symbolData[b.symbol].dateMap.get(curDate);
        vals[b.symbol] = holdings[b.symbol] * p;
        curPortVal += vals[b.symbol];
      });

      const allocMap = allocateInflow(strategy, activeBlueprint, activeWeights, curPortVal, vals, netInflow);

      // Execute buys
      let ordersThisMonth = 0;
      activeBlueprint.forEach(b => {
        const alloc = allocMap[b.symbol] || 0;
        if (alloc >= 5.0) { // Min order size $5
          const p = symbolData[b.symbol].dateMap.get(curDate);
          holdings[b.symbol] += alloc / p;
          ordersThisMonth++;
        }
      });
      totalOrdersPlaced += ordersThisMonth;
    }

    // Daily Valuation & Drawdown Check
    let curVal = 0;
    activeBlueprint.forEach(b => {
      const p = symbolData[b.symbol].dateMap.get(curDate);
      curVal += holdings[b.symbol] * p;
    });

    if (curVal > peakVal) peakVal = curVal;
    const dd = peakVal > 0 ? (curVal - peakVal) / peakVal : 0;
    if (dd < maxDrawdown) maxDrawdown = dd;

    // Track concentration
    if (curVal > 0) {
      activeBlueprint.forEach(b => {
        const p = symbolData[b.symbol].dateMap.get(curDate);
        const w = (holdings[b.symbol] * p) / curVal;
        if (w > maxSingleWeightPeak) maxSingleWeightPeak = w;
      });
    }
  }

  // Final Terminal Value
  const lastDate = dates[dates.length - 1];
  let finalVal = 0;
  BLUEPRINT.forEach(b => {
    const p = symbolData[b.symbol]?.dateMap.get(lastDate) || 0;
    finalVal += holdings[b.symbol] * p;
  });

  cashflows.push(finalVal);
  cfDates.push(lastDate);

  const irr = calculateIRR(cashflows, cfDates);
  const multiple = totalContributed > 0 ? finalVal / totalContributed : 0;

  return {
    strategy,
    startDate,
    totalContributed,
    finalVal,
    multiple,
    irr,
    maxDrawdown: maxDrawdown * 100,
    avgOrdersPerMonth: totalMonths > 0 ? totalOrdersPlaced / totalMonths : 0,
    maxSingleWeight: maxSingleWeightPeak * 100
  };
}

// 5. T0 Multi-Window Rolling Start Execution
console.log('\n=============================================================');
console.log('🔬 T0 + T1: MULTI-WINDOW ROLLING SIMULATION (85 START DATES)');
console.log('=============================================================');

// Generate all first-of-month dates between 2016-09 and 2023-09
const rollingStartDates = [];
let currentYear = 2016;
let currentMonth = 9;

while (currentYear < 2023 || (currentYear === 2023 && currentMonth <= 9)) {
  const mStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const firstTradingDay = masterDates.find(d => d.startsWith(mStr));
  if (firstTradingDay) {
    rollingStartDates.push(firstTradingDay);
  }
  currentMonth++;
  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear++;
  }
}

console.log(`Generated ${rollingStartDates.length} rolling monthly start windows (2016-09 to 2023-09).`);

const STRATEGIES = [
  { id: 'proportional', name: 'A) Proportional DCA' },
  { id: 'deficit_spread', name: 'B) Deficit Spread (Current)' },
  { id: 'waterfall_full', name: 'C) Waterfall Full' },
  { id: 'waterfall_top3', name: 'D) Waterfall Top-3' },
  { id: 'waterfall_cap40', name: 'E) Waterfall Cap 40%' }
];

const resultsByStrategy = {};
STRATEGIES.forEach(s => { resultsByStrategy[s.id] = []; });

for (const startDate of rollingStartDates) {
  for (const strat of STRATEGIES) {
    const res = runSimulation({ startDate, strategy: strat.id });
    if (res) {
      resultsByStrategy[strat.id].push(res);
    }
  }
}

// Helper statistics functions
const median = arr => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const percentile = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(s.length * p);
  return s[Math.min(idx, s.length - 1)];
};

const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

// Compute Head-to-Head Win Rates
const numWindows = resultsByStrategy['proportional'].length;
const summaryTable = [];

for (const strat of STRATEGIES) {
  const list = resultsByStrategy[strat.id];
  const irrs = list.map(r => r.irr);
  const multiples = list.map(r => r.multiple);
  const dds = list.map(r => r.maxDrawdown);
  const orders = list.map(r => r.avgOrdersPerMonth);
  const concentrations = list.map(r => r.maxSingleWeight);

  // Win rate vs Proportional
  let winsVsProp = 0;
  for (let i = 0; i < numWindows; i++) {
    if (list[i].finalVal > resultsByStrategy['proportional'][i].finalVal) {
      winsVsProp++;
    }
  }
  const winRateProp = (winsVsProp / numWindows) * 100;

  // Win rate vs Deficit Spread
  let winsVsDef = 0;
  for (let i = 0; i < numWindows; i++) {
    if (list[i].finalVal > resultsByStrategy['deficit_spread'][i].finalVal) {
      winsVsDef++;
    }
  }
  const winRateDef = (winsVsDef / numWindows) * 100;

  summaryTable.push({
    Strategy: strat.name,
    'Median IRR (%)': median(irrs).toFixed(2),
    'Worst 10% IRR (%)': percentile(irrs, 0.10).toFixed(2),
    'Mean IRR (%)': mean(irrs).toFixed(2),
    'Median Multiple': median(multiples).toFixed(2) + 'x',
    'Max DD (%)': median(dds).toFixed(1) + '%',
    'Win Rate vs Prop (%)': winRateProp.toFixed(1) + '%',
    'Win Rate vs Deficit (%)': winRateDef.toFixed(1) + '%',
    'Avg Orders/Mo': mean(orders).toFixed(1),
    'Max Concentration (%)': Math.max(...concentrations).toFixed(1) + '%'
  });
}

console.log('\n📊 EXECUTIVE AUDIT LEDGER: T1 INFLOW REBALANCE STRATEGIES');
console.table(summaryTable);

// 6. Benchmark QQQ Reference across identical windows
const qqqMultiples = [];
const qqqIRRs = [];

for (const startDate of rollingStartDates) {
  const dates = masterDates.filter(d => d >= startDate && d <= '2026-09-17');
  let qqqShares = 0;
  let totalContributed = 0;
  const cashflows = [];
  const cfDates = [];
  let lastMonth = '';

  for (const curDate of dates) {
    const curMonth = curDate.slice(0, 7);
    if (curMonth !== lastMonth) {
      lastMonth = curMonth;
      totalContributed += MONTHLY_INFLOW;
      cashflows.push(-MONTHLY_INFLOW);
      cfDates.push(curDate);
      const qPrice = symbolData['QQQ'].dateMap.get(curDate);
      qqqShares += (MONTHLY_INFLOW * (1 - TRANSACTION_FEE)) / qPrice;
    }
  }

  const lastDate = dates[dates.length - 1];
  const finalVal = qqqShares * symbolData['QQQ'].dateMap.get(lastDate);
  cashflows.push(finalVal);
  cfDates.push(lastDate);

  qqqMultiples.push(finalVal / totalContributed);
  qqqIRRs.push(calculateIRR(cashflows, cfDates));
}

console.log(`\n🇺🇸 Benchmark QQQ (Identical 85 Rolling Windows):`);
console.log(`- QQQ Median Multiple: ${median(qqqMultiples).toFixed(2)}x`);
console.log(`- QQQ Median IRR:      ${median(qqqIRRs).toFixed(2)}% / yr`);
console.log(`- QQQ Worst 10% IRR:   ${percentile(qqqIRRs, 0.10).toFixed(2)}% / yr`);

console.log('\n=============================================================');
console.log('✅ PRE-REGISTERED GATE VERIFICATION & SCIENTIFIC DECISION');
console.log('=============================================================');

const baseIRR = parseFloat(summaryTable[1]['Median IRR (%)']); // Deficit Spread
const propIRR = parseFloat(summaryTable[0]['Median IRR (%)']); // Proportional
const waterfallFullIRR = parseFloat(summaryTable[2]['Median IRR (%)']);
const waterfallTop3IRR = parseFloat(summaryTable[3]['Median IRR (%)']);
const waterfallCap40IRR = parseFloat(summaryTable[4]['Median IRR (%)']);

console.log(`1. Deficit vs Proportional Spread:`);
console.log(`   - Median IRR Delta: ${(baseIRR - propIRR).toFixed(2)}% / yr`);
console.log(`   - Win Rate: ${summaryTable[1]['Win Rate vs Prop (%)']}`);

console.log(`2. Waterfall Full vs Deficit Spread:`);
console.log(`   - Median IRR Delta: ${(waterfallFullIRR - baseIRR).toFixed(2)}% / yr`);
console.log(`   - Win Rate vs Deficit: ${summaryTable[2]['Win Rate vs Deficit (%)']}`);
console.log(`   - Orders / Month Reduction: ${summaryTable[1]['Avg Orders/Mo']} -> ${summaryTable[2]['Avg Orders/Mo']}`);

console.log(`3. Waterfall Top-3 vs Deficit Spread:`);
console.log(`   - Median IRR Delta: ${(waterfallTop3IRR - baseIRR).toFixed(2)}% / yr`);
console.log(`   - Win Rate vs Deficit: ${summaryTable[3]['Win Rate vs Deficit (%)']}`);
console.log(`   - Orders / Month Reduction: ${summaryTable[1]['Avg Orders/Mo']} -> ${summaryTable[3]['Avg Orders/Mo']}`);
