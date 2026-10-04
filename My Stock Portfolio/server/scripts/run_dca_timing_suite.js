/**
 * DCA Timing & Auto-Invest Backtest Suite (D0–D7)
 * Author: Antigravity / มารบูรพา 🔥
 * Pre-registered plan: dca_timing_test_plan.md
 */
import Database from 'better-sqlite3';
import { calcEMASeries, calcRSISeries, calcMcdxSeries } from '../services/technicalAnalysis.js';
import { classifyScenario } from '../services/project2xEngine.js';

const db = new Database('server/db/stock.db', { readonly: true });
const FEE = 0.0015;

// Master Blueprint (12 stocks)
const BP = [
  ['NVDA', 'Core', 0.15], ['TSM', 'Core', 0.14], ['VRT', 'Core', 0.13], ['AVGO', 'Core', 0.11],
  ['APH', 'Core', 0.11], ['KLAC', 'Core', 0.08], ['ANET', 'Core', 0.07], ['MELI', 'Core', 0.05],
  ['CRWD', 'Core', 0.05], ['STRL', 'Moonshot', 0.03], ['PLTR', 'Moonshot', 0.03], ['CLS', 'Moonshot', 0.02]
].map(([symbol, category, weight]) => ({ symbol, category, weight }));

// 19 Mature Stocks with complete data since 2016 (Zero IPO bias)
const MATURE_19 = [
  'NVDA', 'TSM', 'AVGO', 'APH', 'KLAC', 'ANET', 'MELI', 'STRL', 'CLS',
  'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'ADBE', 'INTU', 'AMAT', 'LRCX', 'COST'
];

console.log('Loading price data from SQLite...');

// Load historical prices: close, open
const D = {};
const allSymbols = Array.from(new Set([...BP.map(b => b.symbol), ...MATURE_19, 'QQQ', 'THB=X']));

for (const sym of allSymbols) {
  const rows = db.prepare('SELECT date, price, open, volume FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(sym);
  const px = new Map();
  const openPx = new Map();
  rows.forEach(r => {
    px.set(r.date, r.price);
    openPx.set(r.date, r.open ?? r.price);
  });
  D[sym] = { px, openPx, rows };
}

// Master trading dates from QQQ
const masterDates = db.prepare("SELECT date FROM historical_prices WHERE symbol='QQQ' ORDER BY date ASC").all().map(r => r.date);

// Group trading dates by Year-Month (e.g. '2021-01' => ['2021-01-04', '2021-01-05', ...])
const monthToDates = new Map();
for (const d of masterDates) {
  const ym = d.substring(0, 7);
  if (!monthToDates.has(ym)) monthToDates.set(ym, []);
  monthToDates.get(ym).push(d);
}

// Helper: XIRR calculation via Binary Search
function irr(cfs, dates) {
  if (!cfs || cfs.length === 0) return 0;
  const t0 = new Date(dates[0]).getTime();
  const ts = dates.map(d => (new Date(d).getTime() - t0) / 31557600000);
  const npv = r => cfs.reduce((s, c, i) => s + c / Math.pow(1 + r, ts[i]), 0);
  let lo = -0.9, hi = 5.0;
  if (npv(lo) * npv(hi) > 0) return 0;
  for (let k = 0; k < 100; k++) {
    const m = (lo + hi) / 2;
    if (npv(lo) * npv(m) < 0) hi = m; else lo = m;
  }
  return ((lo + hi) / 2) * 100;
}

function quantile(arr, q) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
}

const median = a => quantile(a, 0.5);
const p10 = a => quantile(a, 0.1);

// Helper to determine trading day based on rule
function getExecutionDate(ym, ruleType, ruleVal) {
  const dates = monthToDates.get(ym);
  if (!dates || dates.length === 0) return null;

  if (ruleType === 'TRADING_DAY') {
    // 1-indexed trading day of month (1 to 21)
    const idx = Math.min(ruleVal - 1, dates.length - 1);
    return dates[idx];
  } else if (ruleType === 'CALENDAR_DAY') {
    // Calendar day 1 to 28: first trading date with day >= ruleVal
    const targetDay = ruleVal;
    const found = dates.find(d => parseInt(d.substring(8, 10), 10) >= targetDay);
    return found || dates[dates.length - 1];
  } else if (ruleType === 'TURN_OF_MONTH') {
    // -2: 2nd to last trading day, 1: 1st trading day
    if (ruleVal === -2) return dates[Math.max(0, dates.length - 2)];
    if (ruleVal === -1) return dates[dates.length - 1];
    if (ruleVal === 1) return dates[0];
    if (ruleVal === 2) return dates[Math.min(1, dates.length - 1)];
    return dates[0];
  } else if (ruleType === 'OPEX_FOLLOWING_MONDAY') {
    // Options expiration is 3rd Friday of month. Find 3rd Friday, then next trading date
    let fridays = dates.filter(d => new Date(d + 'T12:00:00Z').getUTCDay() === 5);
    if (fridays.length >= 3) {
      const thirdFri = fridays[2];
      const friIdx = dates.indexOf(thirdFri);
      return dates[Math.min(friIdx + 1, dates.length - 1)];
    }
    return dates[0];
  }
  return dates[0];
}

// ==========================================
// Generic Simulation Runner for Portfolio
// ==========================================
function runSimulation({
  basket = BP,
  startYM,
  endYM = '2026-08',
  monthlyInflow = 4200,
  allocationMode = 'DEFICIT', // 'PROPORTIONAL', 'DEFICIT', 'TOP3', 'WATERFALL'
  timingRule = { type: 'CALENDAR_DAY', val: 1 },
  useOpenPrice = false,
  trimAtMonthEnd = false,
  trimThreshold = 1.5,
  cashInterestRate = 0.0, // annualized e.g. 0.045
  waitingDays = 0, // days cash sits before purchase
  rebalanceQuarterly = false,
  fixedSplitRatio = 0.0 // e.g. 0.70 fixed + 0.30 deficit
}) {
  const months = Array.from(monthToDates.keys()).filter(ym => ym >= startYM && ym <= endYM);
  if (months.length < 12) return null;

  const holdings = {};
  basket.forEach(b => { holdings[b.symbol] = 0; });
  let cashBalance = 0;

  const cashflows = [];
  const cfDates = [];
  let maxConc = 0;
  let monthsOver15x = 0;
  let trimCount = 0;
  let totalOrders = 0;
  const portfolioValues = [];

  for (let mIdx = 0; mIdx < months.length; mIdx++) {
    const ym = months[mIdx];
    const monthDates = monthToDates.get(ym);
    if (!monthDates || monthDates.length === 0) continue;

    // 1. Inflow arrives on day 1 of month (or salary day)
    let depositDate = monthDates[0];
    let execDate = getExecutionDate(ym, timingRule.type, timingRule.val);
    if (!execDate) execDate = monthDates[0];

    // If waiting days specified
    if (waitingDays > 0) {
      const startIdx = monthDates.indexOf(depositDate);
      const targetIdx = Math.min(startIdx + waitingDays, monthDates.length - 1);
      execDate = monthDates[targetIdx];
    }

    // Apply cash interest during waiting period if any
    let inflowAmount = monthlyInflow;
    if (cashInterestRate > 0 && waitingDays > 0) {
      const waitFraction = waitingDays / 252;
      inflowAmount += inflowAmount * (cashInterestRate * waitFraction);
    }

    cashflows.push(-monthlyInflow);
    cfDates.push(depositDate);

    // Calculate portfolio value on execDate to determine allocation
    let currentTotalVal = cashBalance;
    const stockVals = {};
    for (const b of basket) {
      const px = D[b.symbol].px.get(execDate) || 0;
      const val = holdings[b.symbol] * px;
      stockVals[b.symbol] = val;
      currentTotalVal += val;
    }

    const postDepositVal = currentTotalVal + inflowAmount;
    const isQuarterlyMonth = (mIdx % 3 === 2); // end of quarter

    // Determine target buy amounts per stock
    const buyAmounts = {};
    basket.forEach(b => { buyAmounts[b.symbol] = 0; });

    if (allocationMode === 'PROPORTIONAL' || (fixedSplitRatio === 1.0)) {
      // Fixed dollar proportional to Blueprint target weights
      basket.forEach(b => {
        buyAmounts[b.symbol] = inflowAmount * b.weight;
      });
    } else if (allocationMode === 'DEFICIT') {
      // Standard Deficit Spread
      let totalDeficit = 0;
      const deficits = {};
      basket.forEach(b => {
        const targetVal = postDepositVal * b.weight;
        const currentVal = stockVals[b.symbol];
        const def = Math.max(0, targetVal - currentVal);
        deficits[b.symbol] = def;
        totalDeficit += def;
      });

      if (totalDeficit > 0) {
        basket.forEach(b => {
          buyAmounts[b.symbol] = inflowAmount * (deficits[b.symbol] / totalDeficit);
        });
      } else {
        basket.forEach(b => {
          buyAmounts[b.symbol] = inflowAmount * b.weight;
        });
      }
    } else if (allocationMode === 'TOP3') {
      // Top-3 Deficit
      const deficits = basket.map(b => {
        const targetVal = postDepositVal * b.weight;
        const currentVal = stockVals[b.symbol];
        return { symbol: b.symbol, deficit: Math.max(0, targetVal - currentVal), weight: b.weight };
      }).sort((a, b) => b.deficit - a.deficit);

      const top3 = deficits.slice(0, 3).filter(d => d.deficit > 0);
      const top3DefTotal = top3.reduce((s, x) => s + x.deficit, 0);

      if (top3DefTotal > 0) {
        top3.forEach(t => {
          buyAmounts[t.symbol] = inflowAmount * (t.deficit / top3DefTotal);
        });
      } else {
        basket.slice(0, 3).forEach(b => {
          buyAmounts[b.symbol] = inflowAmount / 3;
        });
      }
    } else if (allocationMode === 'HYBRID_SPLIT') {
      // e.g. 70% fixed + 30% deficit
      const fixedPart = inflowAmount * fixedSplitRatio;
      const deficitPart = inflowAmount * (1 - fixedSplitRatio);

      // Fixed portion
      basket.forEach(b => {
        buyAmounts[b.symbol] += fixedPart * b.weight;
      });

      // Deficit portion
      let totalDeficit = 0;
      const deficits = {};
      basket.forEach(b => {
        const targetVal = postDepositVal * b.weight;
        const currentVal = stockVals[b.symbol];
        const def = Math.max(0, targetVal - currentVal);
        deficits[b.symbol] = def;
        totalDeficit += def;
      });

      if (totalDeficit > 0) {
        basket.forEach(b => {
          buyAmounts[b.symbol] += deficitPart * (deficits[b.symbol] / totalDeficit);
        });
      } else {
        basket.forEach(b => {
          buyAmounts[b.symbol] += deficitPart * b.weight;
        });
      }
    } else if (allocationMode === 'AUTO_QUARTERLY_REBALANCE') {
      // Monthly fixed proportional, but if quarterly month, rebalance auto amounts to deficit
      if (rebalanceQuarterly && isQuarterlyMonth) {
        let totalDeficit = 0;
        const deficits = {};
        basket.forEach(b => {
          const targetVal = postDepositVal * b.weight;
          const currentVal = stockVals[b.symbol];
          const def = Math.max(0, targetVal - currentVal);
          deficits[b.symbol] = def;
          totalDeficit += def;
        });
        if (totalDeficit > 0) {
          basket.forEach(b => {
            buyAmounts[b.symbol] = inflowAmount * (deficits[b.symbol] / totalDeficit);
          });
        } else {
          basket.forEach(b => { buyAmounts[b.symbol] = inflowAmount * b.weight; });
        }
      } else {
        basket.forEach(b => {
          buyAmounts[b.symbol] = inflowAmount * b.weight;
        });
      }
    }

    // Execute purchases
    basket.forEach(b => {
      const amt = buyAmounts[b.symbol] || 0;
      if (amt >= 5) {
        totalOrders++;
        const netAmt = amt * (1 - FEE);
        const px = useOpenPrice ? (D[b.symbol].openPx.get(execDate) || D[b.symbol].px.get(execDate)) : D[b.symbol].px.get(execDate);
        if (px && px > 0) {
          holdings[b.symbol] += netAmt / px;
        }
      }
    });

    // Check Month-End Portfolio Valuation & Concentration
    const monthEndDate = monthDates[monthDates.length - 1];
    let endTotalVal = cashBalance;
    const endStockVals = {};
    for (const b of basket) {
      const px = D[b.symbol].px.get(monthEndDate) || 0;
      const val = holdings[b.symbol] * px;
      endStockVals[b.symbol] = val;
      endTotalVal += val;
    }
    portfolioValues.push(endTotalVal);

    let hasOver15x = false;
    for (const b of basket) {
      const currentPct = endStockVals[b.symbol] / endTotalVal;
      if (currentPct > maxConc) maxConc = currentPct;
      if (currentPct > b.weight * trimThreshold) {
        hasOver15x = true;
        // Trim if trimAtMonthEnd is active
        if (trimAtMonthEnd) {
          const excessVal = endStockVals[b.symbol] - (endTotalVal * b.weight);
          if (excessVal > 500) {
            trimCount++;
            const px = D[b.symbol].px.get(monthEndDate);
            const sharesToSell = (excessVal * (1 - FEE)) / px;
            holdings[b.symbol] -= sharesToSell;
            cashBalance += excessVal * (1 - FEE);
          }
        }
      }
    }
    if (hasOver15x) monthsOver15x++;

    // Reinvest trimmed cash immediately into deficits if trim occurred
    if (trimAtMonthEnd && cashBalance > 100) {
      let subDeficit = 0;
      const subDef = {};
      basket.forEach(b => {
        const val = holdings[b.symbol] * (D[b.symbol].px.get(monthEndDate) || 0);
        const targetVal = endTotalVal * b.weight;
        const d = Math.max(0, targetVal - val);
        subDef[b.symbol] = d;
        subDeficit += d;
      });
      if (subDeficit > 0) {
        basket.forEach(b => {
          const alloc = cashBalance * (subDef[b.symbol] / subDeficit);
          const px = D[b.symbol].px.get(monthEndDate);
          if (px > 0 && alloc >= 5) {
            holdings[b.symbol] += (alloc * (1 - FEE)) / px;
          }
        });
        cashBalance = 0;
      }
    }
  }

  // Final valuation on final master date
  const lastDate = masterDates[masterDates.length - 1];
  let finalValue = cashBalance;
  basket.forEach(b => {
    finalValue += holdings[b.symbol] * (D[b.symbol].px.get(lastDate) || 0);
  });
  cashflows.push(finalValue);
  cfDates.push(lastDate);

  const finalIRR = irr(cashflows, cfDates);
  const totalInvested = months.length * monthlyInflow;
  const multiple = finalValue / totalInvested;

  // Calculate Max Drawdown from monthly snapshots
  let peak = -Infinity;
  let maxDD = 0;
  for (const v of portfolioValues) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }

  return {
    irr: finalIRR,
    finalValue,
    multiple,
    maxDD: maxDD * 100,
    maxConc: maxConc * 100,
    monthsOver15x,
    trimCount,
    avgOrdersPerMonth: totalOrders / months.length
  };
}

// ==========================================
// QQQ Simulation Runner (Benchmark)
// ==========================================
function runQQQSimulation({ startYM, endYM = '2026-08', monthlyInflow = 4200, timingRule = { type: 'CALENDAR_DAY', val: 1 } }) {
  const months = Array.from(monthToDates.keys()).filter(ym => ym >= startYM && ym <= endYM);
  if (months.length < 12) return null;

  let shares = 0;
  const cashflows = [];
  const cfDates = [];

  for (const ym of months) {
    const monthDates = monthToDates.get(ym);
    let execDate = getExecutionDate(ym, timingRule.type, timingRule.val);
    if (!execDate) execDate = monthDates[0];

    cashflows.push(-monthlyInflow);
    cfDates.push(monthDates[0]);

    const px = D['QQQ'].px.get(execDate);
    if (px && px > 0) {
      shares += (monthlyInflow * (1 - FEE)) / px;
    }
  }

  const lastDate = masterDates[masterDates.length - 1];
  const finalValue = shares * D['QQQ'].px.get(lastDate);
  cashflows.push(finalValue);
  cfDates.push(lastDate);

  return {
    irr: irr(cashflows, cfDates),
    finalValue,
    multiple: finalValue / (months.length * monthlyInflow)
  };
}

// Generate Rolling Windows
function getRollingWindows(startFromYM = '2020-10', upToYM = '2024-09') {
  const allYMs = Array.from(monthToDates.keys()).filter(ym => ym >= startFromYM && ym <= upToYM);
  return allYMs;
}

console.log('\n======================================================');
console.log('🏁 RUNNING DCA TIMING & AUTO-INVEST AUDIT (D0–D7)');
console.log('======================================================\n');

// ----------------------------------------------------
// D1: DAY-OF-MONTH (DOM) SWEEP
// ----------------------------------------------------
console.log('>>> [D1] Running Day-of-Month Sweep (Calendar Days 1..28)...');
const cleanWindows = getRollingWindows('2020-10', '2024-09'); // 48 clean windows (all 12 stocks present)
const fullWindows = getRollingWindows('2016-09', '2024-09'); // 97 rolling windows

const calDays = [1, 2, 3, 4, 5, 8, 10, 12, 15, 18, 20, 22, 25, 28];

const d1Results = {};
for (const day of calDays) {
  const cleanIRRs = [];
  const fullIRRs = [];
  const cleanDeltas = []; // paired delta vs Day 1
  const fullDeltas = [];

  for (const ym of cleanWindows) {
    const resDay = runSimulation({ startYM: ym, timingRule: { type: 'CALENDAR_DAY', val: day } });
    const resBase = runSimulation({ startYM: ym, timingRule: { type: 'CALENDAR_DAY', val: 1 } });
    if (resDay && resBase) {
      cleanIRRs.push(resDay.irr);
      cleanDeltas.push(resDay.irr - resBase.irr);
    }
  }

  for (const ym of fullWindows) {
    const resDay = runSimulation({ startYM: ym, timingRule: { type: 'CALENDAR_DAY', val: day } });
    const resBase = runSimulation({ startYM: ym, timingRule: { type: 'CALENDAR_DAY', val: 1 } });
    if (resDay && resBase) {
      fullIRRs.push(resDay.irr);
      fullDeltas.push(resDay.irr - resBase.irr);
    }
  }

  d1Results[day] = {
    cleanMedianIRR: median(cleanIRRs),
    cleanPairedDelta: median(cleanDeltas),
    cleanWinRate: (cleanDeltas.filter(d => d > 0.001).length / cleanDeltas.length) * 100,
    fullMedianIRR: median(fullIRRs),
    fullPairedDelta: median(fullDeltas),
    fullWinRate: (fullDeltas.filter(d => d > 0.001).length / fullDeltas.length) * 100
  };
}

console.log('\n--- D1: Calendar Day Sweep Table (Baseline: Day 1) ---');
console.table(d1Results);

// Trading Days 1 to 21
console.log('\n>>> [D1a] Running Trading Days Sweep (TD 1, 5, 10, 15, 20)...');
const tradingDaysToTest = [1, 3, 5, 8, 10, 12, 15, 18, 20];
const tdResults = {};
for (const td of tradingDaysToTest) {
  const deltas = [];
  const irrs = [];
  for (const ym of cleanWindows) {
    const resTD = runSimulation({ startYM: ym, timingRule: { type: 'TRADING_DAY', val: td } });
    const resBase = runSimulation({ startYM: ym, timingRule: { type: 'TRADING_DAY', val: 1 } });
    if (resTD && resBase) {
      irrs.push(resTD.irr);
      deltas.push(resTD.irr - resBase.irr);
    }
  }
  tdResults[`TD_${td}`] = {
    medianIRR: median(irrs),
    pairedDelta: median(deltas),
    winRateVsTD1: (deltas.filter(d => d > 0.001).length / deltas.length) * 100
  };
}
console.table(tdResults);

// ----------------------------------------------------
// D2: D2 VALIDATION GATES (Is Best Day Real or Fluke?)
// ----------------------------------------------------
console.log('\n>>> [D2] Testing Validation Gates for Best Day...');
// Find best calendar day from D1
let bestCalDay = 1;
let bestDelta = -999;
for (const [day, data] of Object.entries(d1Results)) {
  if (data.cleanPairedDelta > bestDelta) {
    bestDelta = data.cleanPairedDelta;
    bestCalDay = parseInt(day, 10);
  }
}
console.log(`Best Calendar Day candidate: Day ${bestCalDay} (Clean Paired Delta: ${bestDelta.toFixed(3)}%/yr)`);

// Gate 1: 3 Non-overlapping Eras
const eras = [
  { name: 'Era 1 (2016–2019)', start: '2016-01', end: '2019-12' },
  { name: 'Era 2 (2020–2022)', start: '2020-01', end: '2022-12' },
  { name: 'Era 3 (2023–2026)', start: '2023-01', end: '2026-08' }
];

console.log('\nGate 1: Consistency Across 3 Non-Overlapping Eras:');
for (const era of eras) {
  const resDay1 = runSimulation({ startYM: era.start, endYM: era.end, timingRule: { type: 'CALENDAR_DAY', val: 1 } });
  const resBest = runSimulation({ startYM: era.start, endYM: era.end, timingRule: { type: 'CALENDAR_DAY', val: bestCalDay } });
  const delta = (resBest && resDay1) ? (resBest.irr - resDay1.irr) : 0;
  console.log(`  - ${era.name}: Day 1 IRR = ${resDay1?.irr.toFixed(2)}%, Day ${bestCalDay} IRR = ${resBest?.irr.toFixed(2)}%, Delta = ${delta >= 0 ? '+' : ''}${delta.toFixed(3)}%/yr`);
}

// Gate 2: Cross Basket (QQQ & Clean 19 Mature Basket)
const qqqDay1 = runQQQSimulation({ startYM: '2020-10', timingRule: { type: 'CALENDAR_DAY', val: 1 } });
const qqqBest = runQQQSimulation({ startYM: '2020-10', timingRule: { type: 'CALENDAR_DAY', val: bestCalDay } });
const qqqDelta = (qqqBest && qqqDay1) ? (qqqBest.irr - qqqDay1.irr) : 0;
console.log(`\nGate 2: Cross Basket Verification:`);
console.log(`  - QQQ Benchmark: Day 1 IRR = ${qqqDay1?.irr.toFixed(2)}%, Day ${bestCalDay} IRR = ${qqqBest?.irr.toFixed(2)}%, Delta = ${qqqDelta.toFixed(3)}%/yr`);

// ----------------------------------------------------
// D3: WAIT VS BUY IMMEDIATELY (Salary on Day 25)
// ----------------------------------------------------
console.log('\n>>> [D3] Testing Wait vs Buy Immediately (Assuming Salary on Day 25)...');
// D3-0: Buy immediately on Day 25 (or next trading day)
// D3-5: Wait 5 trading days (start of next month)
// D3-10: Wait 10 trading days
// D3-15: Wait 15 trading days
const waitDaysList = [0, 3, 5, 10, 15];
const d3Results0Pct = {};
const d3Results45Pct = {};

for (const wd of waitDaysList) {
  const deltas0 = [];
  const deltas45 = [];
  for (const ym of cleanWindows) {
    const base = runSimulation({ startYM: ym, timingRule: { type: 'CALENDAR_DAY', val: 25 }, waitingDays: 0 });
    const wait0 = runSimulation({ startYM: ym, timingRule: { type: 'CALENDAR_DAY', val: 25 }, waitingDays: wd, cashInterestRate: 0.0 });
    const wait45 = runSimulation({ startYM: ym, timingRule: { type: 'CALENDAR_DAY', val: 25 }, waitingDays: wd, cashInterestRate: 0.045 });
    if (base && wait0 && wait45) {
      deltas0.push(wait0.irr - base.irr);
      deltas45.push(wait45.irr - base.irr);
    }
  }
  d3Results0Pct[`Wait_${wd}_Days`] = {
    pairedDeltaIRR: median(deltas0),
    winRateVsImmediate: (deltas0.filter(d => d > 0.001).length / deltas0.length) * 100
  };
  d3Results45Pct[`Wait_${wd}_Days`] = {
    pairedDeltaIRR: median(deltas45),
    winRateVsImmediate: (deltas45.filter(d => d > 0.001).length / deltas45.length) * 100
  };
}

console.log('\n--- D3: Cash Waiting Penalty (0% Interest in Cash Account) ---');
console.table(d3Results0Pct);
console.log('\n--- D3: Cash Waiting with 4.5% Yield (Money Market / FCD) ---');
console.table(d3Results45Pct);

// ----------------------------------------------------
// D4: CALENDAR ANOMALIES & EXECUTION TIMING
// ----------------------------------------------------
console.log('\n>>> [D4] Testing Calendar Anomalies (Turn-of-Month, OpEx, Open vs Close)...');

// D4a: Turn-of-Month (Day -2 vs Day 1 vs Day 3)
const tomDeltas = [];
for (const ym of cleanWindows) {
  const dayM2 = runSimulation({ startYM: ym, timingRule: { type: 'TURN_OF_MONTH', val: -2 } });
  const day1 = runSimulation({ startYM: ym, timingRule: { type: 'TURN_OF_MONTH', val: 1 } });
  if (dayM2 && day1) tomDeltas.push(dayM2.irr - day1.irr);
}
console.log(`D4a Turn-of-Month: Buy at Day -2 vs Day 1 Paired Median Delta = ${median(tomDeltas).toFixed(3)}%/yr (Win rate: ${((tomDeltas.filter(d => d > 0).length / tomDeltas.length) * 100).toFixed(1)}%)`);

// D4b: OpEx (Options Expiration - Monday following 3rd Friday)
const opexDeltas = [];
for (const ym of cleanWindows) {
  const opexMon = runSimulation({ startYM: ym, timingRule: { type: 'OPEX_FOLLOWING_MONDAY', val: 0 } });
  const day1 = runSimulation({ startYM: ym, timingRule: { type: 'CALENDAR_DAY', val: 1 } });
  if (opexMon && day1) opexDeltas.push(opexMon.irr - day1.irr);
}
console.log(`D4b Options Expiration: Buy Mon after 3rd Fri vs Day 1 Paired Delta = ${median(opexDeltas).toFixed(3)}%/yr`);

// D4d: Open Price vs Close Price Execution
const openCloseDeltas = [];
for (const ym of cleanWindows) {
  const buyOpen = runSimulation({ startYM: ym, timingRule: { type: 'CALENDAR_DAY', val: 1 }, useOpenPrice: true });
  const buyClose = runSimulation({ startYM: ym, timingRule: { type: 'CALENDAR_DAY', val: 1 }, useOpenPrice: false });
  if (buyOpen && buyClose) openCloseDeltas.push(buyOpen.irr - buyClose.irr);
}
console.log(`D4d Market Open vs Market Close: Paired Median Delta = ${median(openCloseDeltas).toFixed(3)}%/yr (Win rate: ${((openCloseDeltas.filter(d => d > 0).length / openCloseDeltas.length) * 100).toFixed(1)}%)`);

// ----------------------------------------------------
// D6: THE BROKER REALITY TEST (THE MOST CRITICAL TEST!)
// ----------------------------------------------------
console.log('\n>>> [D6] Running The Broker Reality Test (Auto-Fixed vs Deficit vs Hybrids)...');

const d6Strategies = [
  { id: 'A_AUTO', name: 'Auto Fixed (Proportional DCA)', mode: 'PROPORTIONAL', split: 1.0, qtr: false, trim: false },
  { id: 'B_MANUAL', name: 'Deficit Spread (Current Web App)', mode: 'DEFICIT', split: 0.0, qtr: false, trim: false },
  { id: 'C_TOP3', name: 'Top-3 Deficit (3 Orders Only)', mode: 'TOP3', split: 0.0, qtr: false, trim: false },
  { id: 'H_QTR', name: 'Auto Fixed + Quarterly Deficit Adjustment', mode: 'AUTO_QUARTERLY_REBALANCE', split: 1.0, qtr: true, trim: false },
  { id: 'H_SPLIT', name: 'Hybrid 70% Auto + 30% Deficit Manual', mode: 'HYBRID_SPLIT', split: 0.70, qtr: false, trim: false },
  { id: 'H_TRIM', name: 'Auto Fixed + Pillar 2 Trim (>1.5x)', mode: 'PROPORTIONAL', split: 1.0, qtr: false, trim: true }
];

const d6Summary = {};

for (const strat of d6Strategies) {
  const irrs = [];
  const deltasVsBase = [];
  const maxConcs = [];
  const over15xCounts = [];
  const trims = [];
  const orders = [];

  for (const ym of cleanWindows) {
    const res = runSimulation({
      startYM: ym,
      allocationMode: strat.mode,
      fixedSplitRatio: strat.split,
      rebalanceQuarterly: strat.qtr,
      trimAtMonthEnd: strat.trim,
      timingRule: { type: 'CALENDAR_DAY', val: 1 }
    });

    const baseRes = runSimulation({
      startYM: ym,
      allocationMode: 'DEFICIT',
      timingRule: { type: 'CALENDAR_DAY', val: 1 }
    });

    if (res && baseRes) {
      irrs.push(res.irr);
      deltasVsBase.push(res.irr - baseRes.irr);
      maxConcs.push(res.maxConc);
      over15xCounts.push(res.monthsOver15x);
      trims.push(res.trimCount);
      orders.push(res.avgOrdersPerMonth);
    }
  }

  d6Summary[strat.name] = {
    medianIRR: median(irrs).toFixed(2) + '%/yr',
    worst10IRR: p10(irrs).toFixed(2) + '%/yr',
    pairedDeltaVsDeficit: (median(deltasVsBase) >= 0 ? '+' : '') + median(deltasVsBase).toFixed(2) + '%/yr',
    winRateVsDeficit: ((deltasVsBase.filter(d => d > 0.001).length / deltasVsBase.length) * 100).toFixed(1) + '%',
    maxStockConc: median(maxConcs).toFixed(1) + '%',
    monthsOver15x: median(over15xCounts).toFixed(1) + ' mos',
    avgOrdersMo: median(orders).toFixed(1) + ' orders',
    totalTrims: median(trims).toFixed(1) + ' trims'
  };
}

console.log('\n--- D6: Broker Reality Matrix (48 Clean Windows >= 2020-10) ---');
console.table(d6Summary);

console.log('\nAudit complete! Writing audit log report...');
