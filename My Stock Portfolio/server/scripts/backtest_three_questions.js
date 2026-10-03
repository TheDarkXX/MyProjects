/**
 * Project 2X — Institutional Quantitative Audit: The 3 Core Architecture Questions
 *
 * Question 1: Monthly Inflow Allocation
 *   - 1A: Strict Proportional DCA (Fixed Target Weight Every Month)
 *   - 1B: Smart Cashflow Deficit Rebalance (Zero Inflow to Overweight, 100% to Deficit Assets)
 *
 * Question 2: Moonshot Risk Management
 *   - 2A: Hold Through (Never Sell on EMA 200 breakdown)
 *   - 2B: MAYDAY_EXIT (Sell 100% on Scenarios 1-3 when below EMA 200 with Banker=0, re-enter on S8/S10/S13)
 *
 * Question 3: Pillar 2 Overweight Trimming (Core)
 *   - 3A: Pure Buy & Hold (Never Trim Winners)
 *   - 3B: Pillar 2 Trim (When weight > 1.5x target weight AND Overbought d150 > 15% + Banker >= 12, trim excess to target and redistribute to deficit assets)
 */

import { db } from '../db/init.js';
import { calcEMASeries, calcRSISeries, calcMcdxSeries } from '../services/technicalAnalysis.js';
import { classifyScenario } from '../services/project2xEngine.js';

const START_DATE = '2016-09-01';
const MONTHLY_INFLOW = 1000; // $1,000 / month
const CASH_YIELD_DAILY = Math.pow(1 + 0.03, 1 / 252) - 1; // 3% annual T-bill

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

console.log('Loading historical data from SQLite...');
const symbolData = {};

for (const item of BLUEPRINT) {
  const candles = db.prepare(`
    SELECT date, price, open, high, low, volume 
    FROM historical_prices 
    WHERE symbol = ? AND date >= ? 
    ORDER BY date ASC
  `).all(item.symbol, START_DATE);

  if (!candles || candles.length === 0) {
    console.error(`Missing data for ${item.symbol}`);
    continue;
  }

  const closes = candles.map(c => c.price);
  const opens = candles.map(c => c.open ?? c.price);
  const highs = candles.map(c => c.high ?? c.price);
  const lows = candles.map(c => c.low ?? c.price);
  const vols = candles.map(c => c.volume ?? 0);
  const n = closes.length;

  const e9 = calcEMASeries(closes, 9);
  const e50 = calcEMASeries(closes, 50);
  const e150 = calcEMASeries(closes, 150);
  const e200 = calcEMASeries(closes, 200);
  const rsi14 = calcRSISeries(closes, 14);
  const banker = calcMcdxSeries(closes).banker || [];

  const scenarios = new Array(n).fill(null);
  const isBuyNow = new Array(n).fill(false);
  const isMayday = new Array(n).fill(false);
  const isOverbought = new Array(n).fill(false);

  for (let i = 220; i < n; i++) {
    const p = closes[i];
    if (!e200[i] || !e150[i] || !e50[i]) continue;

    const d = (e) => Number((((p - e) / e) * 100).toFixed(2));
    const regime = (e50[i] > e150[i] && e150[i] > e200[i]) ? 'BULL' : (e50[i] > e200[i] ? 'NEUTRAL' : 'BEAR');

    let vs = 0; for (let v = i - 20; v < i; v++) vs += vols[v];
    const volRatio = vs > 0 ? Number((vols[i] / (vs / 20)).toFixed(2)) : 1;
    const bull = p >= opens[i];
    let red = 0; for (let r = i; r >= 0 && closes[r] < opens[r]; r--) red++;

    const lb = regime !== 'BEAR' ? -5 : -3.5;
    let near = 0; for (let k = i; k >= 0 && e200[k]; k--) {
      const dd = (closes[k] - e200[k]) / e200[k] * 100;
      if (dd >= lb && dd <= 3.5) near++; else break;
    }
    let below = 0; for (let k = i; k >= 0 && e200[k] && closes[k] < e200[k]; k--) below++;
    let bz = 0; for (let k = i; k >= 0 && banker[k] === 0; k--) bz++;

    const d200 = d(e200[i]);
    const d150 = d(e150[i]);

    let bearTrap = false;
    if (d200 >= 0 && bull) {
      for (let k = i - 1; k >= i - 6; k--) {
        if (e200[k] && (closes[k] - e200[k]) / e200[k] * 100 < -4) { bearTrap = true; break; }
      }
    }

    let dbl = false;
    if (d200 >= -3.5 && d200 <= 2.5 && bull) {
      let t = -1;
      for (let k = i - 5; k >= Math.max(0, i - 45); k--) {
        if (e200[k]) {
          const dd = (closes[k] - e200[k]) / e200[k] * 100;
          if (dd >= -4 && dd <= 3) { t = k; break; }
        }
      }
      if (t > 0 && lows[i] >= lows[t] * 0.985) dbl = true;
    }

    let brk = false;
    if (bull && volRatio >= 1.4) {
      const hi = Math.max(...highs.slice(i - 10, i - 2));
      const lo = Math.min(...lows.slice(i - 10, i - 2));
      const r = rsi14[i] ?? 50;
      if ((hi - lo) / lo < 0.08 && p > hi && (banker[i] ?? 0) >= 3 && r >= 50 && r <= 74) brk = true;
    }

    const flip = e50[i] >= e200[i] && (e50[i - 5] || 0) < (e200[i - 5] || 0) && p > e50[i] && p > e200[i];

    const res = classifyScenario({
      currentPrice: p, ema9: e9[i], ema50: e50[i], ema150: e150[i], ema200: e200[i],
      distEma9: d(e9[i]), distEma50: d(e50[i]), distEma150: d150, distEma200: d200,
      banker: banker[i] ?? 0, rsi14: rsi14[i], isAboveEma9: p >= e9[i], hasRsiDivergence: false,
      isLatestBullish: bull, consecutiveRedBars: red, volRatio, regime,
      daysNearEma200: near, daysBelowEma200: below, daysBankerZero: bz,
      isBearTrapReclaimed: bearTrap, isDoubleBottomConfirmed: dbl, isBaseBreakout: brk, isRegimeFlip: flip,
      ownedShares: 100, category: item.category
    });

    scenarios[i] = res.scenario;
    isBuyNow[i] = res.traffic_light === 'BUY_NOW';
    isMayday[i] = res.traffic_light === 'MAYDAY_EXIT';
    isOverbought[i] = (d150 > 15 && (banker[i] ?? 0) >= 12);
  }

  // Create lookup by date string YYYY-MM-DD
  const dateMap = new Map();
  candles.forEach((c, idx) => {
    dateMap.set(c.date, {
      idx,
      price: c.price,
      scenario: scenarios[idx],
      isBuyNow: isBuyNow[idx],
      isMayday: isMayday[idx],
      isOverbought: isOverbought[idx]
    });
  });

  symbolData[item.symbol] = {
    category: item.category,
    targetWeight: item.weight,
    candles,
    dateMap
  };
}

// Master trading calendar (dates present in NVDA, our benchmark anchor)
const masterDates = symbolData['NVDA'].candles.map(c => c.date);

function runSimulation(options) {
  const {
    inflowMode = 'proportional', // 'proportional' | 'deficit'
    moonshotExit = 'hold',        // 'hold' | 'mayday'
    trimPillar2 = false           // true | false
  } = options;

  let totalContributed = 0;
  let cashReserve = 0;
  const holdings = {}; // symbol -> shares
  BLUEPRINT.forEach(b => { holdings[b.symbol] = 0; });

  let peakValue = 0;
  let maxDrawdown = 0;
  const portfolioHistory = [];

  let lastMonth = '';

  for (let d = 0; d < masterDates.length; d++) {
    const curDate = masterDates[d];
    const curMonth = curDate.slice(0, 7);

    // 1. Accrue daily interest on cash reserve
    if (cashReserve > 0) {
      cashReserve *= (1 + CASH_YIELD_DAILY);
    }

    // 2. Check Trimming (Pillar 2) on Core stocks
    if (trimPillar2) {
      // Calculate current portfolio value
      let currentVal = cashReserve;
      for (const b of BLUEPRINT) {
        const info = symbolData[b.symbol]?.dateMap.get(curDate);
        if (info) currentVal += holdings[b.symbol] * info.price;
      }

      if (currentVal > 0) {
        for (const b of BLUEPRINT) {
          if (b.category !== 'Core') continue;
          const info = symbolData[b.symbol]?.dateMap.get(curDate);
          if (!info) continue;

          const stockVal = holdings[b.symbol] * info.price;
          const stockWeight = stockVal / currentVal;

          // If weight > 1.5x target and isOverbought
          if (stockWeight > b.weight * 1.5 && info.isOverbought) {
            const targetVal = b.weight * currentVal;
            const excessVal = stockVal - targetVal;
            const sharesToTrim = excessVal / info.price;
            holdings[b.symbol] -= sharesToTrim;
            cashReserve += excessVal;
          }
        }
      }
    }

    // 3. Check Moonshot MAYDAY_EXIT
    if (moonshotExit === 'mayday') {
      for (const b of BLUEPRINT) {
        if (b.category !== 'Moonshot') continue;
        const info = symbolData[b.symbol]?.dateMap.get(curDate);
        if (!info) continue;

        if (holdings[b.symbol] > 0 && info.isMayday) {
          // Sell 100% into cash
          cashReserve += holdings[b.symbol] * info.price;
          holdings[b.symbol] = 0;
        } else if (holdings[b.symbol] === 0 && info.isBuyNow && cashReserve > 0) {
          // Re-enter on Buy Now signal with allocated share of cash reserve
          // Allocate up to target weight of cash
          const buyAmt = Math.min(cashReserve * b.weight, cashReserve);
          if (buyAmt > 10) {
            holdings[b.symbol] += buyAmt / info.price;
            cashReserve -= buyAmt;
          }
        }
      }
    }

    // 4. Monthly Inflow Injection (First trading day of the month)
    if (curMonth !== lastMonth) {
      lastMonth = curMonth;
      totalContributed += MONTHLY_INFLOW;
      let deposit = MONTHLY_INFLOW;

      if (inflowMode === 'proportional') {
        // Divide strictly by target weight
        for (const b of BLUEPRINT) {
          const info = symbolData[b.symbol]?.dateMap.get(curDate);
          if (info && info.price > 0) {
            const allocUsd = deposit * b.weight;
            holdings[b.symbol] += allocUsd / info.price;
          }
        }
      } else if (inflowMode === 'deficit') {
        // Smart Rebalance: Deficit Allocation
        let currentTotal = cashReserve;
        const vals = {};
        for (const b of BLUEPRINT) {
          const info = symbolData[b.symbol]?.dateMap.get(curDate);
          const p = info ? info.price : 0;
          vals[b.symbol] = holdings[b.symbol] * p;
          currentTotal += vals[b.symbol];
        }

        const newTotal = currentTotal + deposit;
        const deficits = {};
        let totalDeficit = 0;

        for (const b of BLUEPRINT) {
          const targetVal = b.weight * newTotal;
          const def = Math.max(0, targetVal - vals[b.symbol]);
          deficits[b.symbol] = def;
          totalDeficit += def;
        }

        for (const b of BLUEPRINT) {
          const info = symbolData[b.symbol]?.dateMap.get(curDate);
          if (!info || info.price <= 0) continue;

          let allocUsd = 0;
          if (totalDeficit > 0) {
            allocUsd = (deficits[b.symbol] / totalDeficit) * deposit;
          } else {
            allocUsd = deposit * b.weight;
          }
          holdings[b.symbol] += allocUsd / info.price;
        }
      }
    }

    // 5. Daily Portfolio Value & Drawdown Tracker
    let curPortVal = cashReserve;
    for (const b of BLUEPRINT) {
      const info = symbolData[b.symbol]?.dateMap.get(curDate);
      if (info) curPortVal += holdings[b.symbol] * info.price;
    }

    if (curPortVal > peakValue) peakValue = curPortVal;
    const dd = peakValue > 0 ? (curPortVal - peakValue) / peakValue : 0;
    if (dd < maxDrawdown) maxDrawdown = dd;

    portfolioHistory.push({ date: curDate, value: curPortVal, contributed: totalContributed });
  }

  const finalVal = portfolioHistory[portfolioHistory.length - 1].value;
  const terminalMultiple = finalVal / totalContributed;

  return {
    totalContributed,
    finalVal,
    terminalMultiple,
    maxDrawdown: maxDrawdown * 100
  };
}

console.log('\n================================================================================');
console.log('🔬 AUDIT EXPERIMENT 1: INFLOW ALLOCATION (PROPORTIONAL vs DEFICIT REBALANCE)');
console.log('================================================================================');

const exp1A = runSimulation({ inflowMode: 'proportional', moonshotExit: 'hold', trimPillar2: false });
const exp1B = runSimulation({ inflowMode: 'deficit', moonshotExit: 'hold', trimPillar2: false });

console.log(`1A (Strict Proportional DCA) : Final $${exp1A.finalVal.toLocaleString('en-US', {maximumFractionDigits: 0})} | Multiple: ${exp1A.terminalMultiple.toFixed(2)}x | Max DD: ${exp1A.maxDrawdown.toFixed(1)}%`);
console.log(`1B (Smart Deficit Rebalance) : Final $${exp1B.finalVal.toLocaleString('en-US', {maximumFractionDigits: 0})} | Multiple: ${exp1B.terminalMultiple.toFixed(2)}x | Max DD: ${exp1B.maxDrawdown.toFixed(1)}%`);
const diff1 = ((exp1B.finalVal - exp1A.finalVal) / exp1A.finalVal) * 100;
console.log(`➔ Result: Smart Deficit Rebalance delivers ${diff1 >= 0 ? '+' : ''}${diff1.toFixed(2)}% vs Proportional DCA!`);

console.log('\n================================================================================');
console.log('🔬 AUDIT EXPERIMENT 2: MOONSHOT RISK MANAGEMENT (HOLD THROUGH vs MAYDAY_EXIT)');
console.log('================================================================================');

const exp2A = runSimulation({ inflowMode: 'deficit', moonshotExit: 'hold', trimPillar2: false });
const exp2B = runSimulation({ inflowMode: 'deficit', moonshotExit: 'mayday', trimPillar2: false });

console.log(`2A (Hold Through / No Stop) : Final $${exp2A.finalVal.toLocaleString('en-US', {maximumFractionDigits: 0})} | Multiple: ${exp2A.terminalMultiple.toFixed(2)}x | Max DD: ${exp2A.maxDrawdown.toFixed(1)}%`);
console.log(`2B (MAYDAY_EXIT on EMA200)   : Final $${exp2B.finalVal.toLocaleString('en-US', {maximumFractionDigits: 0})} | Multiple: ${exp2B.terminalMultiple.toFixed(2)}x | Max DD: ${exp2B.maxDrawdown.toFixed(1)}%`);
const diff2 = ((exp2B.finalVal - exp2A.finalVal) / exp2A.finalVal) * 100;
console.log(`➔ Result: MAYDAY_EXIT difference: ${diff2 >= 0 ? '+' : ''}${diff2.toFixed(2)}% | Max DD change: ${(exp2B.maxDrawdown - exp2A.maxDrawdown).toFixed(2)}%`);

console.log('\n================================================================================');
console.log('🔬 AUDIT EXPERIMENT 3: PILLAR 2 OVERWEIGHT TRIMMING (LET RUN vs REBALANCE TRIM)');
console.log('================================================================================');

const exp3A = runSimulation({ inflowMode: 'deficit', moonshotExit: 'hold', trimPillar2: false });
const exp3B = runSimulation({ inflowMode: 'deficit', moonshotExit: 'hold', trimPillar2: true });

console.log(`3A (100% Let Profits Run)   : Final $${exp3A.finalVal.toLocaleString('en-US', {maximumFractionDigits: 0})} | Multiple: ${exp3A.terminalMultiple.toFixed(2)}x | Max DD: ${exp3A.maxDrawdown.toFixed(1)}%`);
console.log(`3B (Pillar 2 Trim >1.5x OB) : Final $${exp3B.finalVal.toLocaleString('en-US', {maximumFractionDigits: 0})} | Multiple: ${exp3B.terminalMultiple.toFixed(2)}x | Max DD: ${exp3B.maxDrawdown.toFixed(1)}%`);
console.log('\n================================================================================');
console.log('🔬 BONUS COMBO: PROPORTIONAL DCA + PILLAR 2 TRIM (THE ULTIMATE BLEND)');
console.log('================================================================================');

const expComboA = runSimulation({ inflowMode: 'proportional', moonshotExit: 'hold', trimPillar2: false });
const expComboB = runSimulation({ inflowMode: 'proportional', moonshotExit: 'hold', trimPillar2: true });

console.log(`Combo A (Proportional + Let Run) : Final $${expComboA.finalVal.toLocaleString('en-US', {maximumFractionDigits: 0})} | Multiple: ${expComboA.terminalMultiple.toFixed(2)}x | Max DD: ${expComboA.maxDrawdown.toFixed(1)}%`);
console.log(`Combo B (Proportional + Trim P2) : Final $${expComboB.finalVal.toLocaleString('en-US', {maximumFractionDigits: 0})} | Multiple: ${expComboB.terminalMultiple.toFixed(2)}x | Max DD: ${expComboB.maxDrawdown.toFixed(1)}%`);
const diffCombo = ((expComboB.finalVal - expComboA.finalVal) / expComboA.finalVal) * 100;
console.log(`➔ Result: Trim vs Pure Run on Proportional: ${diffCombo >= 0 ? '+' : ''}${diffCombo.toFixed(2)}% | Max DD change: ${(expComboB.maxDrawdown - expComboA.maxDrawdown).toFixed(2)}%`);

console.log('\n================================================================================');
