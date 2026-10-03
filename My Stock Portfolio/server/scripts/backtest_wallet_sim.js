/**
 * Project 2X — Wallet-Level Backtest (proper simulation, not averaged entries)
 *
 * Why this exists:
 *   backtest_signal_vs_dca.js measures the *average forward return per entry*.
 *   That metric cannot answer "how should I split monthly money", because it ignores
 *   cash sitting idle while waiting for a signal. simulate_splits_3y.js then blended
 *   those averages linearly — which is arithmetic, not a simulation.
 *
 * This script simulates a real wallet per stock:
 *   - 1 unit of money arrives on the first trading day of every month
 *   - Strategies:
 *       DCA100     : invest 100% immediately
 *       H80_20     : invest 80% immediately, 20% parks in cash (T-bill yield), whole chest
 *                    deploys on BUY_NOW
 *       H80_20_SWP : same as H80_20, but chest is swept into the stock if no BUY_NOW for 12 months
 *       SIG100     : everything parks in cash, deploys only on BUY_NOW
 *   - Output: terminal multiple on contributed money, money-weighted annual return (IRR), max drawdown
 *
 * Part 2 measures per-stock "signal edge": mean 252d forward return after BUY_NOW
 * minus the mean 252d forward return of ALL trading days (unconditional baseline),
 * plus stock traits (volatility, trend persistence) to see which kind of stock the signal suits.
 */
import { db } from '../db/init.js';
import { calcEMASeries, calcRSISeries, calcMcdxSeries } from '../services/technicalAnalysis.js';
import { classifyScenario } from '../services/project2xEngine.js';

const START_DATE = '2016-09-01'; // common window for every symbol (CLS trimmed to this)
const CASH_YIELD = 0.03;         // flat T-bill proxy (2016–2021 ~1%, 2022+ ~4–5%)
const STOCKS = [
  ['NVDA', 'Core', 0.15], ['TSM', 'Core', 0.13], ['VRT', 'Core', 0.12], ['AVGO', 'Core', 0.10],
  ['APH', 'Core', 0.10], ['ANET', 'Core', 0.07], ['KLAC', 'Core', 0.07], ['MELI', 'Core', 0.05],
  ['CRWD', 'Core', 0.04], ['STRL', 'Moonshot', 0.03], ['PLTR', 'Moonshot', 0.03], ['CLS', 'Moonshot', 0.02],
  ['QQQ', 'Benchmark', 0]
];

function loadCandles(symbol) {
  return db.prepare(`SELECT date, price, open, high, low, volume FROM historical_prices
    WHERE symbol = ? AND date >= ? ORDER BY date ASC`).all(symbol, START_DATE);
}

/** Replicates calculateStockRadarSignal() feature prep bar-by-bar, returns BUY_NOW flags */
function buildSignals(c, category) {
  const closes = c.map(x => x.price), opens = c.map(x => x.open ?? x.price);
  const highs = c.map(x => x.high ?? x.price), lows = c.map(x => x.low ?? x.price);
  const vols = c.map(x => x.volume ?? 0), n = closes.length;
  const e9 = calcEMASeries(closes, 9), e50 = calcEMASeries(closes, 50);
  const e150 = calcEMASeries(closes, 150), e200 = calcEMASeries(closes, 200);
  const rsi14 = calcRSISeries(closes, 14), banker = calcMcdxSeries(closes).banker || [];
  const isBuy = new Array(n).fill(false);
  const regimeArr = new Array(n).fill(null);

  for (let i = 220; i < n; i++) {
    const p = closes[i];
    if (!e200[i] || !e150[i] || !e50[i]) continue;
    const d = (e) => Number((((p - e) / e) * 100).toFixed(2));
    const regime = (e50[i] > e150[i] && e150[i] > e200[i]) ? 'BULL' : (e50[i] > e200[i] ? 'NEUTRAL' : 'BEAR');
    regimeArr[i] = regime;
    let vs = 0; for (let v = i - 20; v < i; v++) vs += vols[v];
    const volRatio = vs > 0 ? Number((vols[i] / (vs / 20)).toFixed(2)) : 1;
    const bull = p >= opens[i];
    let red = 0; for (let r = i; r >= 0 && closes[r] < opens[r]; r--) red++;
    const lb = regime !== 'BEAR' ? -5 : -3.5;
    let near = 0; for (let k = i; k >= 0 && e200[k]; k--) { const dd = (closes[k] - e200[k]) / e200[k] * 100; if (dd >= lb && dd <= 3.5) near++; else break; }
    let below = 0; for (let k = i; k >= 0 && e200[k] && closes[k] < e200[k]; k--) below++;
    let bz = 0; for (let k = i; k >= 0 && banker[k] === 0; k--) bz++;
    const d200 = d(e200[i]);
    let bearTrap = false;
    if (d200 >= 0 && bull) for (let k = i - 1; k >= i - 6; k--) if (e200[k] && (closes[k] - e200[k]) / e200[k] * 100 < -4) { bearTrap = true; break; }
    let dbl = false;
    if (d200 >= -3.5 && d200 <= 2.5 && bull) {
      let t = -1;
      for (let k = i - 5; k >= Math.max(0, i - 45); k--) { if (e200[k]) { const dd = (closes[k] - e200[k]) / e200[k] * 100; if (dd >= -4 && dd <= 3) { t = k; break; } } }
      if (t > 0 && lows[i] >= lows[t] * 0.985) dbl = true;
    }
    let brk = false;
    if (bull && volRatio >= 1.4) {
      const hi = Math.max(...highs.slice(i - 10, i - 2)), lo = Math.min(...lows.slice(i - 10, i - 2));
      const r = rsi14[i] ?? 50;
      if ((hi - lo) / lo < 0.08 && p > hi && (banker[i] ?? 0) >= 3 && r >= 50 && r <= 74) brk = true;
    }
    const flip = e50[i] >= e200[i] && (e50[i - 5] || 0) < (e200[i - 5] || 0) && p > e50[i] && p > e200[i];
    const res = classifyScenario({
      currentPrice: p, ema9: e9[i], ema50: e50[i], ema150: e150[i], ema200: e200[i],
      distEma9: d(e9[i]), distEma50: d(e50[i]), distEma150: d(e150[i]), distEma200: d200,
      banker: banker[i] ?? 0, rsi14: rsi14[i], isAboveEma9: p >= e9[i], hasRsiDivergence: false,
      isLatestBullish: bull, consecutiveRedBars: red, volRatio, regime,
      daysNearEma200: near, daysBelowEma200: below, daysBankerZero: bz,
      isBearTrapReclaimed: bearTrap, isDoubleBottomConfirmed: dbl, isBaseBreakout: brk, isRegimeFlip: flip,
      ownedShares: 0, category
    });
    isBuy[i] = res.traffic_light === 'BUY_NOW';
  }
  return { isBuy, regimeArr, closes };
}

function irrMonthly(flows) { // flows: array of {t (years), amt}
  let lo = -0.99, hi = 5;
  const npv = (r) => flows.reduce((s, f) => s + f.amt / Math.pow(1 + r, f.t), 0);
  for (let k = 0; k < 200; k++) { const mid = (lo + hi) / 2; if (npv(mid) > 0) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

function simulate(c, isBuy, mode) {
  const closes = c.map(x => x.price), dates = c.map(x => x.date), n = closes.length;
  const dailyCash = Math.pow(1 + CASH_YIELD, 1 / 252) - 1;
  let shares = 0, cash = 0, contributed = 0, lastMonth = '', lastDeploy = 220, peak = 0, maxDD = 0;
  const flows = [];
  const t0 = new Date(dates[220]).getTime();
  for (let i = 220; i < n; i++) {
    cash *= 1 + dailyCash;
    const m = dates[i].slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m; contributed += 1;
      flows.push({ t: (new Date(dates[i]).getTime() - t0) / 3.15576e10, amt: -1 });
      const investNow = mode === 'DCA100' ? 1 : (mode === 'SIG100' ? 0 : 0.8);
      shares += investNow / closes[i]; cash += 1 - investNow;
    }
    const sweep = mode === 'H80_20_SWP' && (i - lastDeploy) >= 252 && cash > 0;
    if ((isBuy[i] || sweep) && cash > 0 && mode !== 'DCA100') {
      shares += cash / closes[i]; cash = 0; lastDeploy = i;
    }
    const val = shares * closes[i] + cash;
    // drawdown measured on value per unit contributed, so new money doesn't mask losses
    const perUnit = val / contributed;
    if (perUnit > peak) peak = perUnit;
    maxDD = Math.min(maxDD, perUnit / peak - 1);
  }
  const finalVal = shares * closes[n - 1] + cash;
  flows.push({ t: (new Date(dates[n - 1]).getTime() - t0) / 3.15576e10, amt: finalVal });
  return { contributed, finalVal, multiple: finalVal / contributed, irr: irrMonthly(flows), maxDD };
}

const fmtPct = (x) => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%';
const MODES = ['DCA100', 'H80_20', 'H80_20_SWP', 'SIG100'];
const walletRows = [], edgeRows = [];
const portfolio = Object.fromEntries(MODES.map(m => [m, { contributed: 0, finalVal: 0 }]));

for (const [sym, cat, w] of STOCKS) {
  const c = loadCandles(sym);
  if (c.length < 500) continue;
  const { isBuy, regimeArr, closes } = buildSignals(c, cat);
  const res = Object.fromEntries(MODES.map(m => [m, simulate(c, isBuy, m)]));
  const row = { Symbol: sym, Signals: isBuy.filter(Boolean).length };
  for (const m of MODES) {
    row[`${m} IRR`] = fmtPct(res[m].irr);
    if (m === 'DCA100' || m === 'H80_20_SWP') row[`${m} MaxDD`] = fmtPct(res[m].maxDD);
    if (w > 0) { portfolio[m].contributed += res[m].contributed * w; portfolio[m].finalVal += res[m].finalVal * w; }
  }
  walletRows.push(row);

  // ---- Part 2: signal edge vs unconditional baseline (252d forward) ----
  const H = 252, fwd = [];
  for (let i = 220; i + H < closes.length; i++) fwd.push({ i, r: closes[i + H] / closes[i] - 1 });
  const base = fwd.reduce((s, x) => s + x.r, 0) / fwd.length;
  const sig = fwd.filter(x => isBuy[x.i]);
  const sigMean = sig.length ? sig.reduce((s, x) => s + x.r, 0) / sig.length : NaN;
  // traits
  const rets = []; for (let i = 1; i < closes.length; i++) rets.push(Math.log(closes[i] / closes[i - 1]));
  const mu = rets.reduce((a, b) => a + b, 0) / rets.length;
  const vol = Math.sqrt(rets.reduce((s, r) => s + (r - mu) ** 2, 0) / rets.length) * Math.sqrt(252);
  const valid = regimeArr.filter(Boolean);
  const bullShare = valid.filter(r => r === 'BULL').length / valid.length;
  let pk = 0, mdd = 0; for (const p of closes) { pk = Math.max(pk, p); mdd = Math.min(mdd, p / pk - 1); }
  edgeRows.push({
    Symbol: sym, 'Ann.Vol': fmtPct(vol), 'Time in BULL': fmtPct(bullShare), 'Worst DD': fmtPct(mdd),
    'Signals(1Y fwd)': sig.length, 'Baseline 1Y': fmtPct(base), 'After BUY_NOW 1Y': isNaN(sigMean) ? 'N/A' : fmtPct(sigMean),
    Edge: isNaN(sigMean) ? 'N/A' : fmtPct(sigMean - base)
  });
}

console.log(`\nWALLET SIMULATION (${START_DATE} → latest, 1 unit/month, cash yield ${CASH_YIELD * 100}%)`);
console.table(walletRows);
console.log('\nPORTFOLIO (Plan B weights) — terminal multiple on contributed money:');
for (const m of MODES) console.log(`  ${m.padEnd(11)} ${(portfolio[m].finalVal / portfolio[m].contributed).toFixed(2)}x`);
console.log('\nSIGNAL EDGE vs UNCONDITIONAL BASELINE (252d forward, overlapping windows — small n = noise)');
console.table(edgeRows);
