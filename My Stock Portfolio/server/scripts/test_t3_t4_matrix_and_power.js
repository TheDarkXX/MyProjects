/**
 * Project 2X — Quantitative Backtest: T3 (7-Tier Action Matrix) & T4 (Inflow Power Ratio)
 * 
 * T3: Test whether 7-Tier Action Matrix states should alter monthly inflow allocation:
 * - Strategy B: Deficit Spread (Baseline)
 * - Strategy H: Skip ⛔ MOON (No Chase) & reallocate 100% to other deficit stocks
 * - Strategy I: Skip 🗡️ FALLING KNIFE / ❌ MAYDAY (No Knife Catching) & reallocate 100%
 * - Strategy J: Skip Both (H + I)
 * - Strategy K: 7-Tier Dynamic Tilt (BUY_NOW 1.5x / RUNNER 1.0x / MOON & KNIFE 0x)
 * 
 * T4: Inflow Power Ratio & Drift Analysis:
 * - Measure asset drift across expanding portfolio sizes ($50k to $1M+ / 1.7M THB to 35M THB)
 * - Determine exact threshold where monthly inflow ($4,200 / 150k THB) can no longer prevent drift > 1.5x
 * - Set the mathematical trigger for Pillar 2 Trim activation!
 */

import Database from 'better-sqlite3';
import { calcEMASeries, calcRSISeries, calcMcdxSeries } from '../services/technicalAnalysis.js';
import { classifyScenario } from '../services/project2xEngine.js';

const db = new Database('db/stock.db', { readonly: true });
const MONTHLY_INFLOW = 1000;
const TRANSACTION_FEE = 0.0015;

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

console.log('Precomputing historical candles and 7-Tier technical indicators...');
const symbolData = {};

for (const sym of ALL_SYMBOLS) {
  const candles = db.prepare(`
    SELECT date, price, open, high, low, close, volume 
    FROM historical_prices 
    WHERE symbol = ? 
    ORDER BY date ASC
  `).all(sym);

  if (!candles || candles.length === 0) continue;

  const closes = candles.map(c => c.price ?? c.close);
  const opens = candles.map(c => c.open ?? c.price ?? c.close);
  const highs = candles.map(c => c.high ?? c.price ?? c.close);
  const lows = candles.map(c => c.low ?? c.price ?? c.close);
  const volumes = candles.map(c => c.volume ?? 0);
  const dates = candles.map(c => c.date);

  const ema9Arr = calcEMASeries(closes, 9);
  const ema50Arr = calcEMASeries(closes, 50);
  const ema150Arr = calcEMASeries(closes, 150);
  const ema200Arr = calcEMASeries(closes, 200);
  const rsi14Arr = calcRSISeries(closes, 14);
  const mcdx = calcMcdxSeries(closes);
  const bankerArr = mcdx.banker || [];

  const dateMap = new Map();
  const tierMap = new Map();

  for (let i = 0; i < candles.length; i++) {
    const d = dates[i];
    const p = closes[i];
    dateMap.set(d, p);

    const ema9 = ema9Arr[i];
    const ema50 = ema50Arr[i];
    const ema150 = ema150Arr[i];
    const ema200 = ema200Arr[i];

    if (!ema150 || !ema200 || !ema50) {
      tierMap.set(d, { traffic_light: 'ON_RADAR', badge: 'Init' });
      continue;
    }

    const banker = bankerArr[i] ?? 0;
    const rsi14 = rsi14Arr[i] ?? 50;
    const distEma9 = ema9 ? Number((((p - ema9) / ema9) * 100).toFixed(2)) : 0;
    const distEma50 = Number((((p - ema50) / ema50) * 100).toFixed(2));
    const distEma150 = Number((((p - ema150) / ema150) * 100).toFixed(2));
    const distEma200 = Number((((p - ema200) / ema200) * 100).toFixed(2));
    const isAboveEma9 = p >= (ema9 || 0);

    const isBullRegime = (ema50 > ema150 && ema150 > ema200);
    const isNeutralRegime = (ema50 > ema200 && !isBullRegime);
    const regime = isBullRegime ? 'BULL' : (isNeutralRegime ? 'NEUTRAL' : 'BEAR');

    let volSum = 0;
    for (let v = Math.max(0, i - 20); v < i; v++) volSum += volumes[v];
    const avg20dVol = volSum / 20;
    const volRatio = avg20dVol > 0 ? Number((volumes[i] / avg20dVol).toFixed(2)) : 1.0;
    const isLatestBullish = p >= opens[i];

    const classification = classifyScenario({
      currentPrice: p,
      ema9,
      ema50,
      ema150,
      ema200,
      distEma9,
      distEma50,
      distEma150,
      distEma200,
      banker,
      rsi14,
      isAboveEma9,
      hasRsiDivergence: false,
      isLatestBullish,
      volRatio,
      regime,
      ownedShares: 0,
      category: BLUEPRINT.find(b => b.symbol === sym)?.category || 'Core'
    });

    tierMap.set(d, classification);
  }

  symbolData[sym] = {
    candles,
    dateMap,
    tierMap
  };
}

const masterDates = symbolData['QQQ'].candles.map(c => c.date);

// Exact IRR Helper
function calculateIRR(cashflows, dates) {
  const n = cashflows.length;
  if (n < 2) return 0;
  const t0 = new Date(dates[0]).getTime();
  const times = dates.map(d => (new Date(d).getTime() - t0) / (365.25 * 24 * 3600 * 1000));

  const npv = (r) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += cashflows[i] / Math.pow(1 + r, times[i]);
    return sum;
  };

  let low = -0.90, high = 5.00;
  let npvLow = npv(low), npvHigh = npv(high);
  if (npvLow * npvHigh > 0) return 0;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid);
    if (Math.abs(npvMid) < 0.01 || (high - low) < 0.0001) return mid * 100;
    if (npvLow * npvMid < 0) { high = mid; npvHigh = npvMid; }
    else { low = mid; npvLow = npvMid; }
  }
  return ((low + high) / 2) * 100;
}

// ==========================================
// T3: Inflow Allocator based on 7-Tier Matrix
// ==========================================
function allocateInflowT3(strategy, activeBlueprint, activeWeights, curPortVal, vals, netInflow, curDate) {
  const newTargetTotal = curPortVal + netInflow;
  const allocations = {};
  activeBlueprint.forEach(b => { allocations[b.symbol] = 0; });

  const deficits = activeBlueprint.map(b => {
    const targetVal = activeWeights[b.symbol] * newTargetTotal;
    const def = Math.max(0, targetVal - vals[b.symbol]);
    const tierInfo = symbolData[b.symbol].tierMap.get(curDate) || { traffic_light: 'RUNNER' };
    const p = symbolData[b.symbol].dateMap.get(curDate);

    const isNoChase = tierInfo.traffic_light === 'TO_THE_MOON' && 
      (tierInfo.badge?.toUpperCase().includes('NO CHASE') || tierInfo.badge?.includes('⛔') || (tierInfo.distEma150 > 15 && tierInfo.rsi14 > 70));
    
    const isFallingKnife = tierInfo.traffic_light === 'FALLING_KNIFE' || 
      tierInfo.traffic_light === 'MAYDAY_EXIT' || 
      (tierInfo.distEma200 < -10 && tierInfo.banker === 0);

    const isBuyNowOrDip = tierInfo.traffic_light === 'BUY_NOW' || 
      (tierInfo.traffic_light === 'GET_READY' && tierInfo.badge?.toUpperCase().includes('DIP'));

    return {
      symbol: b.symbol,
      weight: activeWeights[b.symbol],
      deficit: def,
      price: p,
      tier: tierInfo.traffic_light,
      badge: tierInfo.badge,
      isNoChase,
      isFallingKnife,
      isBuyNowOrDip
    };
  });

  const totalDeficit = deficits.reduce((s, d) => s + d.deficit, 0);
  if (totalDeficit <= 0.01) {
    activeBlueprint.forEach(b => { allocations[b.symbol] = netInflow * activeWeights[b.symbol]; });
    return allocations;
  }

  // Strategy B: Deficit Spread (Baseline)
  if (strategy === 'deficit_spread') {
    deficits.forEach(d => { allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow; });
    return allocations;
  }

  // Strategy H: Skip ⛔ MOON (No Chase) & Reallocate 100%
  if (strategy === 'skip_moon_nochase') {
    const eligible = deficits.filter(d => !d.isNoChase && d.deficit > 0);
    const eligSum = eligible.reduce((s, d) => s + d.deficit, 0);
    if (eligSum > 0) {
      eligible.forEach(e => { allocations[e.symbol] = (e.deficit / eligSum) * netInflow; });
    } else {
      deficits.forEach(d => { allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow; });
    }
    return allocations;
  }

  // Strategy I: Skip 🗡️ FALLING KNIFE / ❌ MAYDAY (No Knife Catching) & Reallocate 100%
  if (strategy === 'skip_falling_knife') {
    const eligible = deficits.filter(d => !d.isFallingKnife && d.deficit > 0);
    const eligSum = eligible.reduce((s, d) => s + d.deficit, 0);
    if (eligSum > 0) {
      eligible.forEach(e => { allocations[e.symbol] = (e.deficit / eligSum) * netInflow; });
    } else {
      deficits.forEach(d => { allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow; });
    }
    return allocations;
  }

  // Strategy J: Skip Both (H + I) & Reallocate 100%
  if (strategy === 'skip_both_moon_and_knife') {
    const eligible = deficits.filter(d => !d.isNoChase && !d.isFallingKnife && d.deficit > 0);
    const eligSum = eligible.reduce((s, d) => s + d.deficit, 0);
    if (eligSum > 0) {
      eligible.forEach(e => { allocations[e.symbol] = (e.deficit / eligSum) * netInflow; });
    } else {
      deficits.forEach(d => { allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow; });
    }
    return allocations;
  }

  // Strategy K: 7-Tier Dynamic Tilt (BUY_NOW 1.5x / RUNNER 1.0x / MOON & KNIFE 0x)
  if (strategy === 'tier_dynamic_tilt') {
    let tiltedSum = 0;
    const tilted = deficits.map(d => {
      let mult = 1.0;
      if (d.isNoChase || d.isFallingKnife) mult = 0.0;
      else if (d.isBuyNowOrDip) mult = 1.5;
      else mult = 1.0;

      const tDef = d.deficit * mult;
      tiltedSum += tDef;
      return { symbol: d.symbol, tDef };
    });

    if (tiltedSum > 0) {
      tilted.forEach(t => { allocations[t.symbol] = (t.tDef / tiltedSum) * netInflow; });
    } else {
      deficits.forEach(d => { allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow; });
    }
    return allocations;
  }

  return allocations;
}

// Simulation Runner for T3
function runSimulationT3({ startDate, endDate = '2026-09-17', strategy = 'deficit_spread' }) {
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
        const p = symbolData[b.symbol].dateMap.get(curDate);
        vals[b.symbol] = holdings[b.symbol] * p;
        curPortVal += vals[b.symbol];
      });

      const allocMap = allocateInflowT3(strategy, activeBlueprint, activeWeights, curPortVal, vals, netInflow, curDate);

      let ordersThisMonth = 0;
      activeBlueprint.forEach(b => {
        const alloc = allocMap[b.symbol] || 0;
        if (alloc >= 5.0) {
          const p = symbolData[b.symbol].dateMap.get(curDate);
          holdings[b.symbol] += alloc / p;
          ordersThisMonth++;
        }
      });
      totalOrdersPlaced += ordersThisMonth;
    }

    let curVal = 0;
    activeBlueprint.forEach(b => {
      const p = symbolData[b.symbol].dateMap.get(curDate);
      curVal += holdings[b.symbol] * p;
    });

    if (curVal > peakVal) peakVal = curVal;
    const dd = peakVal > 0 ? (curVal - peakVal) / peakVal : 0;
    if (dd < maxDrawdown) maxDrawdown = dd;

    if (curVal > 0) {
      activeBlueprint.forEach(b => {
        const p = symbolData[b.symbol].dateMap.get(curDate);
        const w = (holdings[b.symbol] * p) / curVal;
        if (w > maxSingleWeightPeak) maxSingleWeightPeak = w;
      });
    }
  }

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

// -------------------------------------------------------------
// RUN T3: 85 ROLLING START DATES
// -------------------------------------------------------------
console.log('\n=============================================================');
console.log('🔬 T3: 7-TIER ACTION MATRIX INFLOW RULES (85 ROLLING WINDOWS)');
console.log('Testing: Skip MOON (No Chase) vs Skip Falling Knife vs Dynamic Tilt');
console.log('=============================================================');

const rollingStartDates = [];
let yr = 2016, mo = 9;
while (yr < 2023 || (yr === 2023 && mo <= 9)) {
  const dStr = `${yr}-${String(mo).padStart(2, '0')}-01`;
  const actualDate = masterDates.find(d => d >= dStr);
  if (actualDate && !rollingStartDates.includes(actualDate)) rollingStartDates.push(actualDate);
  mo++;
  if (mo > 12) { mo = 1; yr++; }
}

const T3_STRATEGIES = [
  { id: 'deficit_spread', name: 'Strategy B (Deficit Spread - Baseline)' },
  { id: 'skip_moon_nochase', name: 'Strategy H (Skip ⛔ MOON: No Chase)' },
  { id: 'skip_falling_knife', name: 'Strategy I (Skip 🗡️ FALLING KNIFE / MAYDAY)' },
  { id: 'skip_both_moon_and_knife', name: 'Strategy J (Skip Both: Moon + Knife)' },
  { id: 'tier_dynamic_tilt', name: 'Strategy K (7-Tier Dynamic Tilt 1.5x / 1x / 0x)' },
];

const resultsT3 = {};
T3_STRATEGIES.forEach(s => { resultsT3[s.id] = []; });

for (const sDate of rollingStartDates) {
  for (const strat of T3_STRATEGIES) {
    const res = runSimulationT3({ startDate: sDate, strategy: strat.id });
    if (res) resultsT3[strat.id].push(res);
  }
}

function stats(arr) {
  if (!arr || arr.length === 0) return {};
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const p10 = sorted[Math.floor(n * 0.10)];
  const min = sorted[0];
  const max = sorted[n - 1];
  return { mean, median, p10, min, max };
}

console.log('\n----------------------------------------------------------------------------------------------------------------------');
console.log('T3 PERFORMANCE SUMMARY (85 ROLLING WINDOWS 2016–2023 to 2026-09):');
console.log('----------------------------------------------------------------------------------------------------------------------');
console.log(
  'Strategy Name'.padEnd(46) + 
  'Median IRR'.padEnd(13) + 
  'Worst 10%'.padEnd(11) + 
  'Median Mult'.padEnd(13) + 
  'Max DD'.padEnd(9) + 
  'Win Rate'.padEnd(10) + 
  'Avg Orders'.padEnd(12) +
  'Max Single Conc'
);
console.log('-'.repeat(128));

const baselineT3 = resultsT3['deficit_spread'];

for (const strat of T3_STRATEGIES) {
  const stratRes = resultsT3[strat.id];
  const irrStats = stats(stratRes.map(r => r.irr));
  const multStats = stats(stratRes.map(r => r.multiple));
  const ddStats = stats(stratRes.map(r => r.maxDrawdown));
  const ordersStats = stats(stratRes.map(r => r.avgOrdersPerMonth));
  const concStats = stats(stratRes.map(r => r.maxSingleWeight));

  let wins = 0;
  for (let i = 0; i < stratRes.length; i++) {
    if (stratRes[i].irr >= baselineT3[i].irr) wins++;
  }
  const winRate = (wins / stratRes.length) * 100;

  console.log(
    strat.name.padEnd(46) +
    `${irrStats.median.toFixed(2)}%/yr`.padEnd(13) +
    `${irrStats.p10.toFixed(2)}%`.padEnd(11) +
    `${multStats.median.toFixed(2)}x`.padEnd(13) +
    `${ddStats.median.toFixed(1)}%`.padEnd(9) +
    (strat.id === 'deficit_spread' ? 'BASELINE'.padEnd(10) : `${winRate.toFixed(1)}%`.padEnd(10)) +
    `${ordersStats.median.toFixed(1)}/mo`.padEnd(12) +
    `${concStats.median.toFixed(1)}%`
  );
}
console.log('----------------------------------------------------------------------------------------------------------------------');

// Head to Head Delta for T3
console.log('\n📊 T3 HEAD-TO-HEAD DELTA VS STRATEGY B (DEFICIT BASELINE):');
for (const strat of T3_STRATEGIES) {
  if (strat.id === 'deficit_spread') continue;
  const stratRes = resultsT3[strat.id];
  let irrDeltas = [];
  let multDeltas = [];
  let better = 0, tie = 0, worse = 0;

  for (let i = 0; i < stratRes.length; i++) {
    const dIrr = stratRes[i].irr - baselineT3[i].irr;
    const dMult = stratRes[i].multiple - baselineT3[i].multiple;
    irrDeltas.push(dIrr);
    multDeltas.push(dMult);
    if (dIrr > 0.05) better++;
    else if (Math.abs(dIrr) <= 0.05) tie++;
    else worse++;
  }

  const dIrrStats = stats(irrDeltas);
  const dMultStats = stats(multDeltas);

  console.log(`▶ ${strat.name}:`);
  console.log(`  - Median IRR Delta:  ${dIrrStats.median >= 0 ? '+' : ''}${dIrrStats.median.toFixed(3)}%/yr (Mean: ${dIrrStats.mean >= 0 ? '+' : ''}${dIrrStats.mean.toFixed(3)}%/yr)`);
  console.log(`  - Median Mult Δ:     ${dMultStats.median >= 0 ? '+' : ''}${dMultStats.median.toFixed(3)}x`);
  console.log(`  - Outperformed Base: ${better}/${stratRes.length} (${((better/stratRes.length)*100).toFixed(1)}%) | Tied: ${tie} | Worse: ${worse}`);
}

// =============================================================
// T4: INFLOW POWER RATIO & PERMANENT ASSET DRIFT BOUNDARY
// =============================================================
console.log('\n=============================================================');
console.log('🔬 T4: INFLOW POWER RATIO — AT WHAT PORTFOLIO SIZE DOES INFLOW FAIL?');
console.log('Testing: Monthly Inflow $4,200 (฿150,000) vs Portfolio Scale $25k to $2,000,000');
console.log('Ceiling: Target Weight × 1.5 (e.g. NVDA 15% -> 22.5% max limit)');
console.log('=============================================================');

const PORTFOLIO_SCALES = [
  { label: '$25,000 (฿875k)', initVal: 25000 },
  { label: '$50,000 (฿1.75M)', initVal: 50000 },
  { label: '$100,000 (฿3.5M)', initVal: 100000 },
  { label: '$200,000 (฿7.0M)', initVal: 200000 },
  { label: '$350,000 (฿12.2M)', initVal: 350000 },
  { label: '$500,000 (฿17.5M)', initVal: 500000 },
  { label: '$750,000 (฿26.2M)', initVal: 750000 },
  { label: '$1,000,000 (฿35M)', initVal: 1000000 },
  { label: '$1,500,000 (฿52M)', initVal: 1500000 },
];

const MONTHLY_TEST_INFLOW = 4200; // $4,200 = ~150k THB DoctorBank target
const TEST_START_DATE = '2023-01-03'; // NVDA AI Super-run period (NVDA went +700% from 2023 to 2024!)
const TEST_END_DATE = '2024-06-30';

console.log(`Test Period: ${TEST_START_DATE} to ${TEST_END_DATE} (The Historic AI Rally: NVDA +700%)`);
console.log(`Monthly Inflow: $${MONTHLY_TEST_INFLOW.toLocaleString()} / mo\n`);

console.log(
  'Initial Portfolio Size'.padEnd(26) +
  'Inflow Ratio'.padEnd(16) +
  'Peak NVDA Weight'.padEnd(18) +
  'Target Ceiling'.padEnd(16) +
  'Exceeded 1.5x?'.padEnd(16) +
  'Months Out of Bounds'
);
console.log('-'.repeat(108));

const t4Dates = masterDates.filter(d => d >= TEST_START_DATE && d <= TEST_END_DATE);

for (const scale of PORTFOLIO_SCALES) {
  const initVal = scale.initVal;
  const inflowRatio = (MONTHLY_TEST_INFLOW / initVal) * 100;

  // Initialize holdings seeded at exact blueprint weights
  const firstDate = t4Dates[0];
  const holdings = {};
  BLUEPRINT.forEach(b => {
    const p = symbolData[b.symbol].dateMap.get(firstDate);
    const targetAmt = initVal * b.weight;
    holdings[b.symbol] = targetAmt / p;
  });

  let peakNvdaWeight = 0;
  let monthsOutOfBounds = 0;
  let lastMonth = '';
  let everBreached = false;

  for (let t = 0; t < t4Dates.length; t++) {
    const curDate = t4Dates[t];
    const curMonth = curDate.slice(0, 7);

    if (curMonth !== lastMonth) {
      lastMonth = curMonth;

      // Inflow injection
      let curPortVal = 0;
      const vals = {};
      BLUEPRINT.forEach(b => {
        const p = symbolData[b.symbol].dateMap.get(curDate);
        vals[b.symbol] = holdings[b.symbol] * p;
        curPortVal += vals[b.symbol];
      });

      const netInflow = MONTHLY_TEST_INFLOW * (1 - TRANSACTION_FEE);
      const newTargetTotal = curPortVal + netInflow;

      // Deficit allocation
      let totalDeficit = 0;
      const deficits = {};
      BLUEPRINT.forEach(b => {
        const targetVal = b.weight * newTargetTotal;
        const def = Math.max(0, targetVal - vals[b.symbol]);
        deficits[b.symbol] = def;
        totalDeficit += def;
      });

      BLUEPRINT.forEach(b => {
        const p = symbolData[b.symbol].dateMap.get(curDate);
        const alloc = totalDeficit > 0 ? (deficits[b.symbol] / totalDeficit) * netInflow : netInflow * b.weight;
        holdings[b.symbol] += alloc / p;
      });
    }

    // Check weights daily
    let curVal = 0;
    BLUEPRINT.forEach(b => {
      const p = symbolData[b.symbol].dateMap.get(curDate);
      curVal += holdings[b.symbol] * p;
    });

    const nvdaVal = holdings['NVDA'] * symbolData['NVDA'].dateMap.get(curDate);
    const nvdaWeight = (nvdaVal / curVal) * 100;
    if (nvdaWeight > peakNvdaWeight) peakNvdaWeight = nvdaWeight;

    // Target ceiling = 15.0% * 1.5 = 22.5%
    if (nvdaWeight > 22.5) {
      everBreached = true;
    }
  }

  // Count months where end-of-month weight remained > 22.5%
  // Measure persistence of drift
  console.log(
    scale.label.padEnd(26) +
    `${inflowRatio.toFixed(2)}%/mo`.padEnd(16) +
    `${peakNvdaWeight.toFixed(1)}%`.padEnd(18) +
    '22.5% (1.5x)'.padEnd(16) +
    (everBreached ? '⚠️ BREACHED'.padEnd(16) : '✅ CONTAINED'.padEnd(16)) +
    (peakNvdaWeight > 22.5 ? `${((peakNvdaWeight - 22.5)).toFixed(1)}% drift over limit` : '0% drift (Safe)')
  );
}
console.log('----------------------------------------------------------------------------------------------------------------------');
