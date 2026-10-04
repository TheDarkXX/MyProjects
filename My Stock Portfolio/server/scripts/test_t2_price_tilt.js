/**
 * Project 2X — Quantitative Rebalance Strategy Backtest (T2: Price-Gate Tilt)
 * 
 * Pre-registered Evaluation Matrix (T2):
 * - Strategy B: Deficit Spread (Current Engine - Baseline)
 * - Strategy F: Deficit × Price Multiplier (EMA150: <=0% -> 1.5x, 0-10% -> 1.0x, >10% -> 0.5x)
 * - Strategy F_EMA50: Deficit × Price Multiplier (EMA50: <=0% -> 1.5x, 0-8% -> 1.0x, >8% -> 0.5x)
 * - Strategy G: Skip Expensive (>10% above EMA150) & Reallocate 100% to non-expensive deficit stocks
 * - Strategy G_Moon: Skip Extreme Overextension (>25% above EMA150) & Reallocate 100%
 * 
 * Gate Condition:
 * - Strategy wins if: Median IRR >= +0.5%/yr AND Win Rate >= 70% vs Baseline AND beats in Control Group.
 * - Otherwise: Statistical DRAW (Choose lowest operational friction / simpler rule).
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

function calcEMASeries(closes, period) {
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

// 1. Load Price & Technical Indicators
console.log('Loading price history and calculating EMA indicators from SQLite stock.db...');
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

  const closes = candles.map(c => c.price);
  const ema50Arr = calcEMASeries(closes, 50);
  const ema150Arr = calcEMASeries(closes, 150);
  const ema200Arr = calcEMASeries(closes, 200);

  const dateMap = new Map();
  const ema50Map = new Map();
  const ema150Map = new Map();
  const ema200Map = new Map();

  for (let i = 0; i < candles.length; i++) {
    const d = candles[i].date;
    dateMap.set(d, closes[i]);
    ema50Map.set(d, ema50Arr[i]);
    ema150Map.set(d, ema150Arr[i]);
    ema200Map.set(d, ema200Arr[i]);
  }

  symbolData[sym] = {
    candles,
    dateMap,
    ema50Map,
    ema150Map,
    ema200Map
  };
}

const masterDates = symbolData['QQQ'].candles.map(c => c.date);

// 2. Exact IRR Calculation
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

  let low = -0.90;
  let high = 5.00;
  let npvLow = npv(low);
  let npvHigh = npv(high);

  if (npvLow * npvHigh > 0) return 0;

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

// 3. Strategy Allocator for T2
function allocateInflowT2(strategy, activeBlueprint, activeWeights, curPortVal, vals, netInflow, curDate) {
  const newTargetTotal = curPortVal + netInflow;
  const allocations = {};
  activeBlueprint.forEach(b => { allocations[b.symbol] = 0; });

  // Calculate base deficits
  const deficits = activeBlueprint.map(b => {
    const targetVal = activeWeights[b.symbol] * newTargetTotal;
    const def = Math.max(0, targetVal - vals[b.symbol]);
    const price = symbolData[b.symbol].dateMap.get(curDate);
    const ema50 = symbolData[b.symbol].ema50Map.get(curDate);
    const ema150 = symbolData[b.symbol].ema150Map.get(curDate);
    const ema200 = symbolData[b.symbol].ema200Map.get(curDate);

    // Anchor: EMA150 preferred, fallback to EMA50
    const anchor150 = ema150 || ema200 || ema50 || price;
    const distEma150 = anchor150 > 0 ? (price - anchor150) / anchor150 : 0;

    const anchor50 = ema50 || price;
    const distEma50 = anchor50 > 0 ? (price - anchor50) / anchor50 : 0;

    return {
      symbol: b.symbol,
      weight: activeWeights[b.symbol],
      deficit: def,
      price,
      distEma150,
      distEma50
    };
  });

  const totalDeficit = deficits.reduce((s, d) => s + d.deficit, 0);

  // Fallback if no deficit
  if (totalDeficit <= 0.01) {
    activeBlueprint.forEach(b => {
      allocations[b.symbol] = netInflow * activeWeights[b.symbol];
    });
    return allocations;
  }

  // Strategy B: Deficit Spread (Baseline)
  if (strategy === 'deficit_spread') {
    deficits.forEach(d => {
      allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow;
    });
    return allocations;
  }

  // Strategy F: Price-Gate Multiplier (EMA150 Anchor)
  // Dip (<=0%): 1.5x | Fair (0% to +10%): 1.0x | Expensive (>+10%): 0.5x
  if (strategy === 'tilt_ema150') {
    let totalTiltedDeficit = 0;
    const tilted = deficits.map(d => {
      let mult = 1.0;
      if (d.distEma150 <= 0.0) {
        mult = 1.5; // Cheap / Dip
      } else if (d.distEma150 > 0.10) {
        mult = 0.5; // Expensive
      } else {
        mult = 1.0; // Fair
      }
      const tiltedDef = d.deficit * mult;
      totalTiltedDeficit += tiltedDef;
      return { symbol: d.symbol, tiltedDef };
    });

    if (totalTiltedDeficit > 0) {
      tilted.forEach(t => {
        allocations[t.symbol] = (t.tiltedDef / totalTiltedDeficit) * netInflow;
      });
    } else {
      deficits.forEach(d => {
        allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow;
      });
    }
    return allocations;
  }

  // Strategy F_EMA50: Price-Gate Multiplier (EMA50 Anchor)
  // Dip (<=0%): 1.5x | Fair (0% to +8%): 1.0x | Expensive (>+8%): 0.5x
  if (strategy === 'tilt_ema50') {
    let totalTiltedDeficit = 0;
    const tilted = deficits.map(d => {
      let mult = 1.0;
      if (d.distEma50 <= 0.0) {
        mult = 1.5;
      } else if (d.distEma50 > 0.08) {
        mult = 0.5;
      } else {
        mult = 1.0;
      }
      const tiltedDef = d.deficit * mult;
      totalTiltedDeficit += tiltedDef;
      return { symbol: d.symbol, tiltedDef };
    });

    if (totalTiltedDeficit > 0) {
      tilted.forEach(t => {
        allocations[t.symbol] = (t.tiltedDef / totalTiltedDeficit) * netInflow;
      });
    } else {
      deficits.forEach(d => {
        allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow;
      });
    }
    return allocations;
  }

  // Strategy G: Skip Expensive (>10% above EMA150) & Reallocate 100%
  if (strategy === 'skip_expensive_ema150') {
    const eligible = deficits.filter(d => d.distEma150 <= 0.10 && d.deficit > 0);
    const eligibleDeficitSum = eligible.reduce((s, d) => s + d.deficit, 0);

    if (eligibleDeficitSum > 0) {
      // Reallocate 100% among eligible non-expensive deficit assets
      eligible.forEach(e => {
        allocations[e.symbol] = (e.deficit / eligibleDeficitSum) * netInflow;
      });
    } else {
      // If ALL deficit stocks are expensive, fallback to normal deficit spread (never hold cash drag)
      deficits.forEach(d => {
        allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow;
      });
    }
    return allocations;
  }

  // Strategy G_Moon: Skip Extreme Overextension (>25% above EMA150) & Reallocate 100%
  if (strategy === 'skip_moon_extreme') {
    const eligible = deficits.filter(d => d.distEma150 <= 0.25 && d.deficit > 0);
    const eligibleDeficitSum = eligible.reduce((s, d) => s + d.deficit, 0);

    if (eligibleDeficitSum > 0) {
      eligible.forEach(e => {
        allocations[e.symbol] = (e.deficit / eligibleDeficitSum) * netInflow;
      });
    } else {
      deficits.forEach(d => {
        allocations[d.symbol] = (d.deficit / totalDeficit) * netInflow;
      });
    }
    return allocations;
  }

  return allocations;
}

// 4. Simulation Runner
function runSimulationT2({ startDate, endDate = '2026-09-17', strategy = 'deficit_spread' }) {
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

      const allocMap = allocateInflowT2(strategy, activeBlueprint, activeWeights, curPortVal, vals, netInflow, curDate);

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

    // Daily Drawdown & Concentration Tracking
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

// 5. Run Multi-Window Rolling Simulation (85 Windows)
console.log('\n=============================================================');
console.log('🔬 T2: MULTI-WINDOW ROLLING SIMULATION (85 START DATES)');
console.log('Testing whether Price-Gate Tilt adds alpha over pure Deficit');
console.log('=============================================================');

const rollingStartDates = [];
let yr = 2016;
let mo = 9;
while (yr < 2023 || (yr === 2023 && mo <= 9)) {
  const dStr = `${yr}-${String(mo).padStart(2, '0')}-01`;
  const actualDate = masterDates.find(d => d >= dStr);
  if (actualDate && !rollingStartDates.includes(actualDate)) {
    rollingStartDates.push(actualDate);
  }
  mo++;
  if (mo > 12) { mo = 1; yr++; }
}

const STRATEGIES = [
  { id: 'deficit_spread', name: 'Strategy B (Deficit Spread - Baseline)' },
  { id: 'tilt_ema150', name: 'Strategy F (EMA150 Tilt: Dip 1.5x / Exp 0.5x)' },
  { id: 'tilt_ema50', name: 'Strategy F_EMA50 (EMA50 Dynamic Momentum Tilt)' },
  { id: 'skip_expensive_ema150', name: 'Strategy G (Skip Expensive >10% EMA150)' },
  { id: 'skip_moon_extreme', name: 'Strategy G_Moon (Skip Extreme Moon >25% EMA150)' },
];

const results = {};
STRATEGIES.forEach(s => { results[s.id] = []; });

for (const sDate of rollingStartDates) {
  for (const strat of STRATEGIES) {
    const res = runSimulationT2({ startDate: sDate, strategy: strat.id });
    if (res) results[strat.id].push(res);
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
console.log('STRATEGY PERFORMANCE SUMMARY (85 ROLLING START DATES 2016–2023 to 2026-09):');
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

const baselineResults = results['deficit_spread'];

for (const strat of STRATEGIES) {
  const stratRes = results[strat.id];
  const irrStats = stats(stratRes.map(r => r.irr));
  const multStats = stats(stratRes.map(r => r.multiple));
  const ddStats = stats(stratRes.map(r => r.maxDrawdown));
  const ordersStats = stats(stratRes.map(r => r.avgOrdersPerMonth));
  const concStats = stats(stratRes.map(r => r.maxSingleWeight));

  let wins = 0;
  for (let i = 0; i < stratRes.length; i++) {
    if (stratRes[i].irr >= baselineResults[i].irr) wins++;
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

// Detailed Delta vs Baseline
console.log('\n📊 HEAD-TO-HEAD DELTA VS STRATEGY B (DEFICIT SPREAD BASELINE):');
for (const strat of STRATEGIES) {
  if (strat.id === 'deficit_spread') continue;
  const stratRes = results[strat.id];
  let irrDeltas = [];
  let multDeltas = [];
  let betterCount = 0;
  let tieCount = 0;
  let worseCount = 0;

  for (let i = 0; i < stratRes.length; i++) {
    const dIrr = stratRes[i].irr - baselineResults[i].irr;
    const dMult = stratRes[i].multiple - baselineResults[i].multiple;
    irrDeltas.push(dIrr);
    multDeltas.push(dMult);
    if (dIrr > 0.05) betterCount++;
    else if (Math.abs(dIrr) <= 0.05) tieCount++;
    else worseCount++;
  }

  const irrDeltaStats = stats(irrDeltas);
  const multDeltaStats = stats(multDeltas);

  console.log(`\n▶ ${strat.name}:`);
  console.log(`  - Median IRR Delta:    ${irrDeltaStats.median >= 0 ? '+' : ''}${irrDeltaStats.median.toFixed(3)}%/yr`);
  console.log(`  - Mean IRR Delta:      ${irrDeltaStats.mean >= 0 ? '+' : ''}${irrDeltaStats.mean.toFixed(3)}%/yr`);
  console.log(`  - Median Multiple Δ:   ${multDeltaStats.median >= 0 ? '+' : ''}${multDeltaStats.median.toFixed(3)}x`);
  console.log(`  - Outperformed Base:   ${betterCount}/${stratRes.length} windows (${((betterCount/stratRes.length)*100).toFixed(1)}%)`);
  console.log(`  - Statistically Tied:  ${tieCount}/${stratRes.length} windows (${((tieCount/stratRes.length)*100).toFixed(1)}%)`);
  console.log(`  - Underperformed Base: ${worseCount}/${stratRes.length} windows (${((worseCount/stratRes.length)*100).toFixed(1)}%)`);
}

// 6. Control Group Test on Non-Blueprint Universe
console.log('\n=============================================================');
console.log('🧪 CONTROL GROUP: TESTING T2 STRATEGIES ON 20 RANDOM BASKETS');
console.log('=============================================================');

const CANDIDATE_POOL = [
  'AMZN', 'META', 'NFLX', 'COST', 'ISRG', 'GLD', 'SCHD', 'SCHG', 'SPY', 
  'HIMS', 'COIN', 'DOCN', 'CRDO', 'ASTS', 'TWST', 'VKTX'
];

const poolData = {};
for (const sym of CANDIDATE_POOL) {
  const rows = db.prepare('SELECT date, price FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(sym);
  if (rows && rows.length > 500) {
    const closes = rows.map(r => r.price);
    const ema150 = calcEMASeries(closes, 150);
    const map = new Map();
    const emaMap = new Map();
    rows.forEach((r, idx) => {
      map.set(r.date, r.price);
      emaMap.set(r.date, ema150[idx]);
    });
    poolData[sym] = { rows, map, emaMap };
  }
}
const activePool = Object.keys(poolData).filter(s => poolData[s].rows.length > 1000);

function runControlSimT2(basket, stratId, startDate = '2019-01-01', endDate = '2026-09-01') {
  const dates = masterDates.filter(d => d >= startDate && d <= endDate);
  const equalWeight = 1 / basket.length;
  const holdings = {};
  basket.forEach(s => { holdings[s] = 0; });

  let lastMonth = '';
  let totalContributed = 0;

  for (const curDate of dates) {
    const curMonth = curDate.slice(0, 7);
    const activeSymbols = basket.filter(s => poolData[s].map.has(curDate));
    if (activeSymbols.length === 0) continue;

    const normWeight = 1 / activeSymbols.length;

    if (curMonth !== lastMonth) {
      lastMonth = curMonth;
      totalContributed += MONTHLY_INFLOW;
      const netInflow = MONTHLY_INFLOW * (1 - TRANSACTION_FEE);

      let curPortVal = 0;
      const vals = {};
      activeSymbols.forEach(s => {
        const p = poolData[s].map.get(curDate);
        vals[s] = holdings[s] * p;
        curPortVal += vals[s];
      });

      const newTargetTotal = curPortVal + netInflow;
      let totalDeficit = 0;
      const deficits = {};

      activeSymbols.forEach(s => {
        const targetVal = normWeight * newTargetTotal;
        const def = Math.max(0, targetVal - vals[s]);
        deficits[s] = def;
        totalDeficit += def;
      });

      if (stratId === 'deficit_spread' || totalDeficit <= 0.01) {
        activeSymbols.forEach(s => {
          const p = poolData[s].map.get(curDate);
          const alloc = totalDeficit > 0 ? (deficits[s] / totalDeficit) * netInflow : netInflow * normWeight;
          holdings[s] += alloc / p;
        });
      } else if (stratId === 'tilt_ema150') {
        let tiltedDefSum = 0;
        const tilted = {};
        activeSymbols.forEach(s => {
          const p = poolData[s].map.get(curDate);
          const ema = poolData[s].emaMap.get(curDate) || p;
          const dist = ema > 0 ? (p - ema) / ema : 0;
          let mult = 1.0;
          if (dist <= 0) mult = 1.5;
          else if (dist > 0.10) mult = 0.5;
          const tDef = deficits[s] * mult;
          tilted[s] = tDef;
          tiltedDefSum += tDef;
        });

        activeSymbols.forEach(s => {
          const p = poolData[s].map.get(curDate);
          const alloc = tiltedDefSum > 0 ? (tilted[s] / tiltedDefSum) * netInflow : netInflow * normWeight;
          holdings[s] += alloc / p;
        });
      } else if (stratId === 'skip_expensive_ema150') {
        const eligible = activeSymbols.filter(s => {
          const p = poolData[s].map.get(curDate);
          const ema = poolData[s].emaMap.get(curDate) || p;
          const dist = ema > 0 ? (p - ema) / ema : 0;
          return dist <= 0.10 && deficits[s] > 0;
        });
        const eligDefSum = eligible.reduce((s, sym) => s + deficits[sym], 0);

        activeSymbols.forEach(s => {
          const p = poolData[s].map.get(curDate);
          let alloc = 0;
          if (eligDefSum > 0 && eligible.includes(s)) {
            alloc = (deficits[s] / eligDefSum) * netInflow;
          } else if (eligDefSum <= 0 && totalDeficit > 0) {
            alloc = (deficits[s] / totalDeficit) * netInflow;
          } else if (totalDeficit <= 0) {
            alloc = netInflow * normWeight;
          }
          holdings[s] += alloc / p;
        });
      }
    }
  }

  const lastDate = dates[dates.length - 1];
  let finalVal = 0;
  basket.forEach(s => {
    const p = poolData[s].map.get(lastDate) || 0;
    finalVal += holdings[s] * p;
  });

  return { totalContributed, finalVal, multiple: finalVal / (totalContributed || 1) };
}

// Deterministic Pseudo-random basket generation
function getSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const controlStartDates = ['2019-01-01', '2020-01-01', '2021-01-01', '2021-11-01', '2022-06-01'];
let tiltWins = 0;
let skipWins = 0;
let totalControlTests = 0;
let multDeltaTiltSum = 0;
let multDeltaSkipSum = 0;

for (let bIdx = 0; bIdx < 20; bIdx++) {
  const rng = getSeededRandom(42 + bIdx * 97);
  const shuffled = [...activePool].sort(() => rng() - 0.5);
  const basket = shuffled.slice(0, 8);

  for (const sDate of controlStartDates) {
    const resBase = runControlSimT2(basket, 'deficit_spread', sDate);
    const resTilt = runControlSimT2(basket, 'tilt_ema150', sDate);
    const resSkip = runControlSimT2(basket, 'skip_expensive_ema150', sDate);

    totalControlTests++;
    if (resTilt.multiple >= resBase.multiple) tiltWins++;
    if (resSkip.multiple >= resBase.multiple) skipWins++;

    multDeltaTiltSum += (resTilt.multiple - resBase.multiple);
    multDeltaSkipSum += (resSkip.multiple - resBase.multiple);
  }
}

console.log(`Control Group Results (20 Baskets × 5 Start Windows = ${totalControlTests} Tests):`);
console.log(`- Strategy F (EMA150 Tilt) Win Rate vs Deficit Spread:   ${((tiltWins / totalControlTests) * 100).toFixed(1)}% (Avg Mult Δ: ${(multDeltaTiltSum / totalControlTests).toFixed(3)}x)`);
console.log(`- Strategy G (Skip Expensive) Win Rate vs Deficit Spread: ${((skipWins / totalControlTests) * 100).toFixed(1)}% (Avg Mult Δ: ${(multDeltaSkipSum / totalControlTests).toFixed(3)}x)`);

console.log('\n=============================================================');
console.log('🏁 PRE-REGISTERED GATE VERDICT (T2):');
console.log('Rule: Strategy wins if: Median IRR >= +0.5%/yr AND Win Rate >= 70% vs Baseline AND beats in Control Group.');
console.log('=============================================================');
