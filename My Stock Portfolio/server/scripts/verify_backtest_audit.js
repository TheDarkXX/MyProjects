/**
 * Independent Audit of T1–T4 Backtest Claims
 * Checks:
 *  1. T3 trigger counts — did H (No Chase) / I (Falling Knife) ever fire with deficit > 0?
 *  2. IPO-entry bias — VRT(2018)/CRWD(2019)/PLTR(2020) enter mid-sim with 0 holdings → Deficit dumps cash into them.
 *     Re-test on windows starting >= 2020-10 (all 12 stocks present from day 1).
 *  3. Regime dependence — re-test with end date 2022-12-30 (before AI rally).
 *  4. T3 corrected H (badge-based No Chase detection).
 *  5. T4 drift persistence (month-end weight > 22.5%, not just 1-day peak).
 */
import Database from 'better-sqlite3';
import { calcEMASeries, calcRSISeries, calcMcdxSeries } from '../services/technicalAnalysis.js';
import { classifyScenario } from '../services/project2xEngine.js';

const db = new Database('db/stock.db', { readonly: true });
const FEE = 0.0015;
const BP = [
  ['NVDA', 'Core', 0.15], ['TSM', 'Core', 0.14], ['VRT', 'Core', 0.13], ['AVGO', 'Core', 0.11],
  ['APH', 'Core', 0.11], ['KLAC', 'Core', 0.08], ['ANET', 'Core', 0.07], ['MELI', 'Core', 0.05],
  ['CRWD', 'Core', 0.05], ['STRL', 'Moonshot', 0.03], ['PLTR', 'Moonshot', 0.03], ['CLS', 'Moonshot', 0.02]
].map(([symbol, category, weight]) => ({ symbol, category, weight }));

const D = {};
for (const sym of [...BP.map(b => b.symbol), 'QQQ']) {
  const rows = db.prepare('SELECT date, price, open, volume FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(sym);
  const closes = rows.map(r => r.price);
  const e9 = calcEMASeries(closes, 9), e50 = calcEMASeries(closes, 50), e150 = calcEMASeries(closes, 150), e200 = calcEMASeries(closes, 200);
  const rsi = calcRSISeries(closes, 14);
  const banker = calcMcdxSeries(closes).banker || [];
  const px = new Map(), dist150 = new Map(), tier = new Map();
  const cat = BP.find(b => b.symbol === sym)?.category || 'Core';
  rows.forEach((r, i) => {
    px.set(r.date, r.price);
    if (e150[i]) dist150.set(r.date, (r.price - e150[i]) / e150[i]);
    if (sym !== 'QQQ' && e50[i] && e150[i] && e200[i]) {
      const bull = e50[i] > e150[i] && e150[i] > e200[i];
      const regime = bull ? 'BULL' : (e50[i] > e200[i] ? 'NEUTRAL' : 'BEAR');
      tier.set(r.date, classifyScenario({
        currentPrice: r.price, ema9: e9[i], ema50: e50[i], ema150: e150[i], ema200: e200[i],
        banker: banker[i] ?? 0, rsi14: rsi[i] ?? 50, regime, isLatestBullish: r.price >= (r.open ?? r.price),
        ownedShares: 0, category: cat
      }));
    }
  });
  D[sym] = { px, dist150, tier };
}
const masterDates = db.prepare("SELECT date FROM historical_prices WHERE symbol='QQQ' ORDER BY date").all().map(r => r.date);

function irr(cfs, dates) {
  const t0 = new Date(dates[0]).getTime();
  const ts = dates.map(d => (new Date(d).getTime() - t0) / 31557600000);
  const npv = r => cfs.reduce((s, c, i) => s + c / Math.pow(1 + r, ts[i]), 0);
  let lo = -0.9, hi = 5;
  if (npv(lo) * npv(hi) > 0) return 0;
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (npv(lo) * npv(m) < 0) hi = m; else lo = m; }
  return (lo + hi) / 2 * 100;
}

const isNoChase = t => (t?.badge || '').toUpperCase().includes('NO CHASE');
const isKnife = t => ['FALLING_KNIFE', 'MAYDAY_EXIT'].includes(t?.traffic_light);
const trig = { noChaseFired: 0, knifeFired: 0, expensiveFired: 0, months: 0 };

// strategy: 'prop' | 'def' | 'skipExp' | 'skipNoChase' | 'skipKnife'
function sim(start, end, strat, count = false) {
  const dates = masterDates.filter(d => d >= start && d <= end);
  const h = {}; BP.forEach(b => h[b.symbol] = 0);
  const cfs = [], cfd = []; let last = '';
  for (const d of dates) {
    if (d.slice(0, 7) === last) continue;
    last = d.slice(0, 7);
    const act = BP.filter(b => D[b.symbol].px.has(d));
    const wSum = act.reduce((s, b) => s + b.weight, 0);
    const inflow = 1000 * (1 - FEE);
    cfs.push(-1000); cfd.push(d);
    const vals = {}; let tot = 0;
    act.forEach(b => { vals[b.symbol] = h[b.symbol] * D[b.symbol].px.get(d); tot += vals[b.symbol]; });
    const defs = act.map(b => ({ b, w: b.weight / wSum, def: Math.max(0, (b.weight / wSum) * (tot + inflow) - vals[b.symbol]) }));
    let pool = defs;
    if (count) trig.months++;
    if (strat === 'skipExp') pool = defs.filter(x => (D[x.b.symbol].dist150.get(d) ?? 0) <= 0.10);
    if (strat === 'skipNoChase') pool = defs.filter(x => !isNoChase(D[x.b.symbol].tier.get(d)));
    if (strat === 'skipKnife') pool = defs.filter(x => !isKnife(D[x.b.symbol].tier.get(d)));
    if (count) defs.forEach(x => {
      if (x.def <= 0) return;
      const t = D[x.b.symbol].tier.get(d);
      if (isNoChase(t)) trig.noChaseFired++;
      if (isKnife(t)) trig.knifeFired++;
      if ((D[x.b.symbol].dist150.get(d) ?? 0) > 0.10) trig.expensiveFired++;
    });
    let ps = pool.reduce((s, x) => s + x.def, 0);
    if (ps <= 0.01) { pool = defs; ps = defs.reduce((s, x) => s + x.def, 0); }
    defs.forEach(x => {
      let a;
      if (strat === 'prop' || ps <= 0.01) a = inflow * x.w;
      else a = pool.includes(x) ? (x.def / ps) * inflow : 0;
      if (a >= 5) h[x.b.symbol] += a / D[x.b.symbol].px.get(d);
    });
  }
  const ld = dates[dates.length - 1];
  const fv = BP.reduce((s, b) => s + h[b.symbol] * (D[b.symbol].px.get(ld) || 0), 0);
  cfs.push(fv); cfd.push(ld);
  return { irr: irr(cfs, cfd), mult: fv / (1000 * (cfs.length - 1)) };
}

function starts(fromY, fromM, toY, toM) {
  const out = [];
  let y = fromY, m = fromM;
  while (y < toY || (y === toY && m <= toM)) {
    const s = `${y}-${String(m).padStart(2, '0')}-01`;
    const a = masterDates.find(d => d >= s);
    if (a && !out.includes(a)) out.push(a);
    if (++m > 12) { m = 1; y++; }
  }
  return out;
}
const med = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

function compare(label, startList, end, sA, sB) {
  const dI = [], dM = []; let wins = 0;
  for (const s of startList) {
    const a = sim(s, end, sA), b = sim(s, end, sB);
    dI.push(a.irr - b.irr); dM.push(a.mult - b.mult); if (a.irr >= b.irr) wins++;
  }
  console.log(`${label.padEnd(62)} n=${String(startList.length).padStart(2)} | median ΔIRR ${med(dI) >= 0 ? '+' : ''}${med(dI).toFixed(2)}%/yr | median ΔMult ${med(dM) >= 0 ? '+' : ''}${med(dM).toFixed(3)}x | win ${(wins / startList.length * 100).toFixed(0)}%`);
}

const END = '2026-09-17';
const all85 = starts(2016, 9, 2023, 9);
const post2020 = starts(2020, 10, 2023, 9);
const preAI = starts(2016, 9, 2019, 12);

console.log('\n=== CHECK 1: T3 TRIGGER COUNTS (all months, full 2016-09 window) ===');
sim(all85[0], END, 'def', true);
console.log(trig);

console.log('\n=== CHECK 2: IPO-ENTRY BIAS (Deficit vs Proportional) ===');
compare('B Deficit vs A Prop | all 85 windows (with IPO entries)', all85, END, 'def', 'prop');
compare('B Deficit vs A Prop | starts >= 2020-10 (all 12 present)', post2020, END, 'def', 'prop');

console.log('\n=== CHECK 3: G (Skip >10% EMA150) ROBUSTNESS ===');
compare('G vs B | all 85 windows', all85, END, 'skipExp', 'def');
compare('G vs B | starts >= 2020-10 (no IPO effect)', post2020, END, 'skipExp', 'def');
compare('G vs B | 2016-2019 starts, END 2022-12-30 (pre-AI rally)', preAI, '2022-12-30', 'skipExp', 'def');
compare('B vs A | 2016-2019 starts, END 2022-12-30 (pre-AI rally)', preAI, '2022-12-30', 'def', 'prop');

console.log('\n=== CHECK 4: T3 CORRECTED (badge-based No Chase) ===');
compare('H-fixed Skip No Chase vs B | all 85', all85, END, 'skipNoChase', 'def');
compare('I Skip Knife vs B | all 85', all85, END, 'skipKnife', 'def');
compare('I Skip Knife vs B | starts >= 2020-10', post2020, END, 'skipKnife', 'def');

console.log('\n=== CHECK 5: T4 DRIFT PERSISTENCE (month-end NVDA weight > 22.5%) 2023-01 → 2024-06, $4,200/mo ===');
const t4d = masterDates.filter(d => d >= '2023-01-03' && d <= '2024-06-30');
for (const init of [25000, 50000, 75000, 100000, 200000, 500000]) {
  const h = {}; BP.forEach(b => h[b.symbol] = init * b.weight / D[b.symbol].px.get(t4d[0]));
  let last = '', monthsOver = 0, months = 0, peak = 0;
  for (let i = 0; i < t4d.length; i++) {
    const d = t4d[i];
    if (d.slice(0, 7) !== last) {
      last = d.slice(0, 7);
      const vals = {}; let tot = 0;
      BP.forEach(b => { vals[b.symbol] = h[b.symbol] * D[b.symbol].px.get(d); tot += vals[b.symbol]; });
      const inflow = 4200 * (1 - FEE);
      const defs = BP.map(b => Math.max(0, b.weight * (tot + inflow) - vals[b.symbol]));
      const ds = defs.reduce((s, x) => s + x, 0);
      BP.forEach((b, k) => { h[b.symbol] += (ds > 0 ? defs[k] / ds * inflow : inflow * b.weight) / D[b.symbol].px.get(d); });
    }
    const tot = BP.reduce((s, b) => s + h[b.symbol] * D[b.symbol].px.get(d), 0);
    const w = h.NVDA * D.NVDA.px.get(d) / tot * 100;
    peak = Math.max(peak, w);
    const isMonthEnd = i === t4d.length - 1 || t4d[i + 1].slice(0, 7) !== d.slice(0, 7);
    if (isMonthEnd) { months++; if (w > 22.5) monthsOver++; }
  }
  console.log(`$${String(init).padStart(7)} (฿${(init * 35 / 1e6).toFixed(2)}M) | inflow ratio ${(4200 / init * 100).toFixed(1)}%/mo | peak ${peak.toFixed(1)}% | month-ends over 22.5%: ${monthsOver}/${months}`);
}
