/**
 * Project 2X — Rigorous Quantitative Engine (Zero-Leakage Simulator)
 *
 * Fixes all prior methodological flaws:
 * 1. ZERO CASH LEAK: Dynamically normalizes target weights for available assets prior to IPO dates
 *    (e.g. before VRT/CRWD/PLTR IPO, their weights are proportionally redistributed to active Core/Moonshot).
 * 2. PROCEEDS REINVESTMENT: Sales from MAYDAY_EXIT or Pillar 2 Trim are immediately redistributed
 *    into remaining active assets (not parked in 3% cash to artificially create cash drag).
 * 3. CORE HOLD vs CUT: Directly tests Moat Audit (Hold) vs EMA200 Cut on Core stocks.
 * 4. MULTI-REGIME SENSITIVITY: Runs on 4 different start dates:
 *    - 2016-09-01 (10-Year Full Cycle)
 *    - 2018-01-01 (8-Year Cycle)
 *    - 2020-01-01 (6-Year Covid Cycle)
 *    - 2021-11-01 (Market Peak Top Stress Test)
 * 5. BENCHMARK: QQQ DCA over identical cash flows and timelines.
 * 6. FRICTION: Deducts 0.15% fee/spread on all transactions.
 */

import Database from 'better-sqlite3';
import { calcEMASeries, calcRSISeries, calcMcdxSeries } from '../services/technicalAnalysis.js';
import { classifyScenario } from '../services/project2xEngine.js';

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

console.log('Loading full price history and computing indicators...');
const symbolData = {};

for (const sym of ALL_SYMBOLS) {
  const candles = db.prepare(`
    SELECT date, price, open, high, low, volume 
    FROM historical_prices 
    WHERE symbol = ? 
    ORDER BY date ASC
  `).all(sym);

  if (!candles || candles.length === 0) {
    console.error(`Missing data for ${sym}`);
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

  const dateMap = new Map();

  for (let i = 0; i < n; i++) {
    const p = closes[i];
    const d = (e) => (e ? Number((((p - e) / e) * 100).toFixed(2)) : 0);
    const d200 = e200[i] ? d(e200[i]) : 0;
    const d150 = e150[i] ? d(e150[i]) : 0;
    const d50 = e50[i] ? d(e50[i]) : 0;
    const d9 = e9[i] ? d(e9[i]) : 0;

    let isBuyNow = false;
    let isMayday = false;
    let isOverbought = false;
    let isBelowEma200 = false;

    if (i >= 220 && e200[i] && e150[i] && e50[i]) {
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

      isBelowEma200 = p < e200[i] && bz >= 5;

      const res = classifyScenario({
        currentPrice: p, ema9: e9[i], ema50: e50[i], ema150: e150[i], ema200: e200[i],
        distEma9: d9, distEma50: d50, distEma150: d150, distEma200: d200,
        banker: banker[i] ?? 0, rsi14: rsi14[i], isAboveEma9: p >= e9[i], hasRsiDivergence: false,
        isLatestBullish: bull, consecutiveRedBars: red, volRatio, regime,
        daysNearEma200: near, daysBelowEma200: below, daysBankerZero: bz,
        ownedShares: 100, category: 'Moonshot' // to check raw mayday
      });

      isBuyNow = res.traffic_light === 'BUY_NOW';
      isMayday = res.traffic_light === 'MAYDAY_EXIT';
      isOverbought = (d150 > 15 && (banker[i] ?? 0) >= 12);
    }

    dateMap.set(candles[i].date, {
      price: p,
      isBuyNow,
      isMayday,
      isOverbought,
      isBelowEma200
    });
  }

  symbolData[sym] = {
    candles,
    dateMap
  };
}

// Master calendar from QQQ
const allDates = symbolData['QQQ'].candles.map(c => c.date);

/**
 * Runs a rigorous portfolio simulation
 */
function runRigorousSimulation({
  startDate = '2016-09-01',
  inflowMode = 'proportional', // 'proportional' | 'deficit'
  moonshotExit = 'hold',        // 'hold' | 'mayday_reinvest'
  coreExit = 'hold',            // 'hold' | 'cut_reinvest'
  trimPillar2 = false,          // true | false
  isQQQBenchmark = false
}) {
  const dates = allDates.filter(d => d >= startDate);
  let totalContributed = 0;
  const holdings = {};
  BLUEPRINT.forEach(b => { holdings[b.symbol] = 0; });
  let qqqShares = 0;

  let peakVal = 0;
  let maxDrawdown = 0;
  let lastMonth = '';

  for (let t = 0; t < dates.length; t++) {
    const curDate = dates[t];
    const curMonth = curDate.slice(0, 7);

    // Benchmark QQQ mode
    if (isQQQBenchmark) {
      const qqqInfo = symbolData['QQQ'].dateMap.get(curDate);
      if (!qqqInfo) continue;

      if (curMonth !== lastMonth) {
        lastMonth = curMonth;
        totalContributed += MONTHLY_INFLOW;
        const netDeposit = MONTHLY_INFLOW * (1 - TRANSACTION_FEE);
        qqqShares += netDeposit / qqqInfo.price;
      }

      const curVal = qqqShares * qqqInfo.price;
      if (curVal > peakVal) peakVal = curVal;
      const dd = peakVal > 0 ? (curVal - peakVal) / peakVal : 0;
      if (dd < maxDrawdown) maxDrawdown = dd;
      continue;
    }

    // 1. Identify which blueprint symbols have valid price on curDate
    const activeBlueprint = BLUEPRINT.filter(b => symbolData[b.symbol]?.dateMap.has(curDate));
    const totalActiveBaseWeight = activeBlueprint.reduce((s, b) => s + b.weight, 0);

    // Normalized target weights for active symbols
    const activeWeights = {};
    activeBlueprint.forEach(b => {
      activeWeights[b.symbol] = b.weight / totalActiveBaseWeight;
    });

    // 2. Evaluate SELL / TRIM rules (with instant redistribution)
    // A. Pillar 2 Trim on Overweight Core stocks
    if (trimPillar2) {
      let curPortVal = 0;
      activeBlueprint.forEach(b => {
        const p = symbolData[b.symbol].dateMap.get(curDate).price;
        curPortVal += holdings[b.symbol] * p;
      });

      if (curPortVal > 0) {
        let freedCash = 0;
        for (const b of activeBlueprint) {
          if (b.category !== 'Core') continue;
          const info = symbolData[b.symbol].dateMap.get(curDate);
          const stockVal = holdings[b.symbol] * info.price;
          const actualWeight = stockVal / curPortVal;

          if (actualWeight > activeWeights[b.symbol] * 1.5 && info.isOverbought) {
            const targetVal = activeWeights[b.symbol] * curPortVal;
            const excessVal = stockVal - targetVal;
            if (excessVal > 50) {
              const sharesToTrim = excessVal / info.price;
              holdings[b.symbol] -= sharesToTrim;
              freedCash += excessVal * (1 - TRANSACTION_FEE);
            }
          }
        }

        // Reinvest freed cash immediately into deficit/other active stocks
        if (freedCash > 0) {
          const otherStocks = activeBlueprint.filter(b => {
            const p = symbolData[b.symbol].dateMap.get(curDate).price;
            return (holdings[b.symbol] * p) / curPortVal < activeWeights[b.symbol];
          });
          const recipientStocks = otherStocks.length > 0 ? otherStocks : activeBlueprint;
          const totalRecipWeight = recipientStocks.reduce((s, b) => s + activeWeights[b.symbol], 0);

          recipientStocks.forEach(b => {
            const p = symbolData[b.symbol].dateMap.get(curDate).price;
            const share = (activeWeights[b.symbol] / totalRecipWeight) * freedCash;
            holdings[b.symbol] += share / p;
          });
        }
      }
    }

    // B. Moonshot MAYDAY_EXIT with instant redistribution
    if (moonshotExit === 'mayday_reinvest') {
      let freedCash = 0;
      for (const b of activeBlueprint) {
        if (b.category !== 'Moonshot') continue;
        const info = symbolData[b.symbol].dateMap.get(curDate);
        if (holdings[b.symbol] > 0 && info.isMayday) {
          const saleVal = holdings[b.symbol] * info.price * (1 - TRANSACTION_FEE);
          holdings[b.symbol] = 0;
          freedCash += saleVal;
        }
      }

      // Reinvest proceeds immediately into Core stocks
      if (freedCash > 0) {
        const coreStocks = activeBlueprint.filter(b => b.category === 'Core');
        const coreWeightSum = coreStocks.reduce((s, b) => s + activeWeights[b.symbol], 0);
        coreStocks.forEach(b => {
          const p = symbolData[b.symbol].dateMap.get(curDate).price;
          const alloc = (activeWeights[b.symbol] / coreWeightSum) * freedCash;
          holdings[b.symbol] += alloc / p;
        });
      }
    }

    // C. Core EMA200 Breakdown Cut vs Hold
    if (coreExit === 'cut_reinvest') {
      let freedCash = 0;
      for (const b of activeBlueprint) {
        if (b.category !== 'Core') continue;
        const info = symbolData[b.symbol].dateMap.get(curDate);
        if (holdings[b.symbol] > 0 && info.isBelowEma200) {
          const saleVal = holdings[b.symbol] * info.price * (1 - TRANSACTION_FEE);
          holdings[b.symbol] = 0;
          freedCash += saleVal;
        }
      }

      if (freedCash > 0) {
        const otherActive = activeBlueprint.filter(b => holdings[b.symbol] > 0);
        if (otherActive.length > 0) {
          const sumW = otherActive.reduce((s, b) => s + activeWeights[b.symbol], 0);
          otherActive.forEach(b => {
            const p = symbolData[b.symbol].dateMap.get(curDate).price;
            const alloc = (activeWeights[b.symbol] / sumW) * freedCash;
            holdings[b.symbol] += alloc / p;
          });
        }
      }
    }

    // 3. Monthly Inflow Injection (First trading day of the month)
    if (curMonth !== lastMonth) {
      lastMonth = curMonth;
      totalContributed += MONTHLY_INFLOW;
      const netInflow = MONTHLY_INFLOW * (1 - TRANSACTION_FEE);

      if (inflowMode === 'proportional') {
        // Distribute strictly by normalized target weight
        activeBlueprint.forEach(b => {
          const p = symbolData[b.symbol].dateMap.get(curDate).price;
          const alloc = netInflow * activeWeights[b.symbol];
          holdings[b.symbol] += alloc / p;
        });
      } else if (inflowMode === 'deficit') {
        // Smart Rebalance: Deficit Allocation
        let curPortVal = 0;
        const vals = {};
        activeBlueprint.forEach(b => {
          const p = symbolData[b.symbol].dateMap.get(curDate).price;
          vals[b.symbol] = holdings[b.symbol] * p;
          curPortVal += vals[b.symbol];
        });

        const newTargetTotal = curPortVal + netInflow;
        const deficits = {};
        let totalDeficit = 0;

        activeBlueprint.forEach(b => {
          const targetVal = activeWeights[b.symbol] * newTargetTotal;
          const def = Math.max(0, targetVal - vals[b.symbol]);
          deficits[b.symbol] = def;
          totalDeficit += def;
        });

        activeBlueprint.forEach(b => {
          const p = symbolData[b.symbol].dateMap.get(curDate).price;
          let alloc = 0;
          if (totalDeficit > 0) {
            alloc = (deficits[b.symbol] / totalDeficit) * netInflow;
          } else {
            alloc = netInflow * activeWeights[b.symbol];
          }
          holdings[b.symbol] += alloc / p;
        });
      }
    }

    // 4. Daily Portfolio Value & Max Drawdown
    let curVal = 0;
    activeBlueprint.forEach(b => {
      const p = symbolData[b.symbol].dateMap.get(curDate).price;
      curVal += holdings[b.symbol] * p;
    });

    if (curVal > peakVal) peakVal = curVal;
    const dd = peakVal > 0 ? (curVal - peakVal) / peakVal : 0;
    if (dd < maxDrawdown) maxDrawdown = dd;
  }

  // Calculate final portfolio value
  const lastDate = dates[dates.length - 1];
  let finalVal = 0;
  if (isQQQBenchmark) {
    const qqqInfo = symbolData['QQQ'].dateMap.get(lastDate);
    finalVal = qqqShares * qqqInfo.price;
  } else {
    BLUEPRINT.forEach(b => {
      const info = symbolData[b.symbol].dateMap.get(lastDate);
      if (info) finalVal += holdings[b.symbol] * info.price;
    });
  }

  const terminalMultiple = finalVal / totalContributed;

  // Approximate Money-Weighted Annual Return (IRR)
  const years = dates.length / 252;
  // Simple IRR approximation for monthly contributions:
  // Using annualized CAGR on average capital
  const approxIRR = (Math.pow(terminalMultiple, 1 / (years / 2)) - 1) * 100;

  return {
    startDate,
    years: Number(years.toFixed(1)),
    totalContributed,
    finalVal: Math.round(finalVal),
    terminalMultiple: Number(terminalMultiple.toFixed(2)),
    maxDrawdown: Number((maxDrawdown * 100).toFixed(1))
  };
}

console.log('\n================================================================================================');
console.log('🏆 1. CORE EXPERIMENT: PROPORTIONAL DCA vs DEFICIT REBALANCE (NO CASH LEAKAGE)');
console.log('================================================================================================');

const exp1_Prop = runRigorousSimulation({ startDate: '2016-09-01', inflowMode: 'proportional' });
const exp1_Def = runRigorousSimulation({ startDate: '2016-09-01', inflowMode: 'deficit' });
const exp1_QQQ = runRigorousSimulation({ startDate: '2016-09-01', isQQQBenchmark: true });

console.log(`• 1A. Proportional DCA (Fixed Blueprint) : Final $${exp1_Prop.finalVal.toLocaleString()} | ${exp1_Prop.terminalMultiple}x | Max DD: ${exp1_Prop.maxDrawdown}%`);
console.log(`• 1B. Smart Deficit Rebalance           : Final $${exp1_Def.finalVal.toLocaleString()} | ${exp1_Def.terminalMultiple}x | Max DD: ${exp1_Def.maxDrawdown}%`);
console.log(`• 1C. Benchmark 100% QQQ DCA            : Final $${exp1_QQQ.finalVal.toLocaleString()} | ${exp1_QQQ.terminalMultiple}x | Max DD: ${exp1_QQQ.maxDrawdown}%`);
const diff1 = ((exp1_Prop.finalVal - exp1_Def.finalVal) / exp1_Def.finalVal) * 100;
console.log(`➔ Real Alpha: Proportional DCA is ${diff1 >= 0 ? '+' : ''}${diff1.toFixed(1)}% vs Deficit Rebalance, and ${(exp1_Prop.finalVal/exp1_QQQ.finalVal).toFixed(2)}x vs QQQ!`);

console.log('\n================================================================================================');
console.log('🚀 2. MOONSHOT EXPERIMENT: HOLD THROUGH vs MAYDAY_EXIT (WITH INSTANT REINVESTMENT)');
console.log('================================================================================================');

const exp2_Hold = runRigorousSimulation({ startDate: '2016-09-01', inflowMode: 'proportional', moonshotExit: 'hold' });
const exp2_Cut = runRigorousSimulation({ startDate: '2016-09-01', inflowMode: 'proportional', moonshotExit: 'mayday_reinvest' });

console.log(`• 2A. Moonshot Hold Through            : Final $${exp2_Hold.finalVal.toLocaleString()} | ${exp2_Hold.terminalMultiple}x | Max DD: ${exp2_Hold.maxDrawdown}%`);
console.log(`• 2B. Moonshot MAYDAY Reinvest to Core : Final $${exp2_Cut.finalVal.toLocaleString()} | ${exp2_Cut.terminalMultiple}x | Max DD: ${exp2_Cut.maxDrawdown}%`);
const diff2 = ((exp2_Cut.finalVal - exp2_Hold.finalVal) / exp2_Hold.finalVal) * 100;
console.log(`➔ Result: Cutting Moonshot gives ${diff2 >= 0 ? '+' : ''}${diff2.toFixed(1)}% | Max DD delta: ${(exp2_Cut.maxDrawdown - exp2_Hold.maxDrawdown).toFixed(1)}%`);

console.log('\n================================================================================================');
console.log('✂️ 3. PILLAR 2 OVERWEIGHT TRIMMING: LET PROFITS RUN vs TRIM >1.5x OVERBOUGHT');
console.log('================================================================================================');

const exp3_Run = runRigorousSimulation({ startDate: '2016-09-01', inflowMode: 'proportional', trimPillar2: false });
const exp3_Trim = runRigorousSimulation({ startDate: '2016-09-01', inflowMode: 'proportional', trimPillar2: true });

console.log(`• 3A. 100% Let Profits Run             : Final $${exp3_Run.finalVal.toLocaleString()} | ${exp3_Run.terminalMultiple}x | Max DD: ${exp3_Run.maxDrawdown}%`);
console.log(`• 3B. Pillar 2 Trim Reinvested to Deficit: Final $${exp3_Trim.finalVal.toLocaleString()} | ${exp3_Trim.terminalMultiple}x | Max DD: ${exp3_Trim.maxDrawdown}%`);
const diff3 = ((exp3_Trim.finalVal - exp3_Run.finalVal) / exp3_Run.finalVal) * 100;
console.log(`➔ Result: Trimming yields ${diff3 >= 0 ? '+' : ''}${diff3.toFixed(1)}% | Max DD reduction: ${(exp3_Run.maxDrawdown - exp3_Trim.maxDrawdown).toFixed(1)}%`);

console.log('\n================================================================================================');
console.log('🛡️ 4. CORE BREAKDOWN: MOAT AUDIT (HOLD) vs CUT LOSS ON EMA200 BREAKDOWN');
console.log('================================================================================================');

const exp4_Hold = runRigorousSimulation({ startDate: '2016-09-01', inflowMode: 'proportional', coreExit: 'hold' });
const exp4_Cut = runRigorousSimulation({ startDate: '2016-09-01', inflowMode: 'proportional', coreExit: 'cut_reinvest' });

console.log(`• 4A. Core Moat Audit (Dynasty Hold)   : Final $${exp4_Hold.finalVal.toLocaleString()} | ${exp4_Hold.terminalMultiple}x | Max DD: ${exp4_Hold.maxDrawdown}%`);
console.log(`• 4B. Core Cut Loss on EMA200 Breakdown: Final $${exp4_Cut.finalVal.toLocaleString()} | ${exp4_Cut.terminalMultiple}x | Max DD: ${exp4_Cut.maxDrawdown}%`);
const diff4 = ((exp4_Cut.finalVal - exp4_Hold.finalVal) / exp4_Hold.finalVal) * 100;
console.log(`➔ Result: Cutting Core on EMA200 breakdown gives ${diff4 >= 0 ? '+' : ''}${diff4.toFixed(1)}%!`);

console.log('\n================================================================================================');
console.log('⏳ 5. SENSITIVITY TEST: 4 DIFFERENT TIME HORIZONS & MARKET REGIMES');
console.log('================================================================================================');

const startDates = [
  { label: '10-Year Full Cycle (2016-09-01)', date: '2016-09-01' },
  { label: '8-Year Post-Election (2018-01-01)', date: '2018-01-01' },
  { label: '6-Year Covid Cycle (2020-01-01)', date: '2020-01-01' },
  { label: 'Peak Market Top Stress (2021-11-01)', date: '2021-11-01' },
];

for (const sd of startDates) {
  const pProp = runRigorousSimulation({ startDate: sd.date, inflowMode: 'proportional' });
  const pDef = runRigorousSimulation({ startDate: sd.date, inflowMode: 'deficit' });
  const pQQQ = runRigorousSimulation({ startDate: sd.date, isQQQBenchmark: true });

  console.log(`\n--- [ ${sd.label} ] (Contributed: $${pProp.totalContributed.toLocaleString()}) ---`);
  console.log(`  Project 2X (Proportional DCA) : Final $${pProp.finalVal.toLocaleString().padStart(9)} | Multiple: ${pProp.terminalMultiple.toFixed(2)}x | Max DD: ${pProp.maxDrawdown}%`);
  console.log(`  Project 2X (Deficit Rebalance): Final $${pDef.finalVal.toLocaleString().padStart(9)} | Multiple: ${pDef.terminalMultiple.toFixed(2)}x | Max DD: ${pDef.maxDrawdown}%`);
  console.log(`  Benchmark 100% QQQ DCA        : Final $${pQQQ.finalVal.toLocaleString().padStart(9)} | Multiple: ${pQQQ.terminalMultiple.toFixed(2)}x | Max DD: ${pQQQ.maxDrawdown}%`);
  console.log(`  ➔ Alpha vs QQQ: ${((pProp.finalVal - pQQQ.finalVal) / pQQQ.finalVal * 100).toFixed(1)}% | Win over Deficit: ${((pProp.finalVal - pDef.finalVal) / pDef.finalVal * 100).toFixed(1)}%`);
}

console.log('\n================================================================================================');
