/**
 * Independent audit of run_dca_timing_suite_v2.js
 *  C1 data coverage (missing prices silently drop money in v2)
 *  C2 D3 look-ahead bug: v2 baseline buys on day 1 but books the cashflow on day 25
 *  C3 H_Q bug: fixedSplitRatio === 1.0 short-circuits into PROPORTIONAL
 *  C4 Reconcile Deficit vs Proportional (prior audit said ~-0.20%/yr, v2 says +1.44%/yr)
 *  C5 Max concentration with 12-month burn-in (v2 counts month 1 when Top-3 holds only 3 stocks)
 *  C6 D3 corrected (cross-month waiting)
 *  C7 D6 corrected + Deficit/Top-3 with Trim, monthly vs annual trim checks
 *  C8 Existing-portfolio regime (initial capital) — closer to the real portfolio
 *  C9 D2 permutation gate for the "best day"
 */
import Database from 'better-sqlite3';

const db = new Database('server/db/stock.db', { readonly: true });
const FEE = 0.0015;
const BP = [
  ['NVDA', 0.15], ['TSM', 0.14], ['VRT', 0.13], ['AVGO', 0.11], ['APH', 0.11], ['KLAC', 0.08],
  ['ANET', 0.07], ['MELI', 0.05], ['CRWD', 0.05], ['STRL', 0.03], ['PLTR', 0.03], ['CLS', 0.02]
].map(([symbol, weight]) => ({ symbol, weight }));

const masterDates = db.prepare("SELECT date FROM historical_prices WHERE symbol='QQQ' ORDER BY date").all().map(r => r.date);
const idxOf = new Map(masterDates.map((d, i) => [d, i]));
const RAW = {}, FF = {};
for (const b of BP) {
  const rows = db.prepare('SELECT date, price FROM historical_prices WHERE symbol = ? ORDER BY date').all(b.symbol);
  RAW[b.symbol] = new Map(rows.map(r => [r.date, r.price]));
  const ff = new Map(); let last = null;
  for (const d of masterDates) { if (RAW[b.symbol].has(d)) last = RAW[b.symbol].get(d); if (last) ff.set(d, last); }
  FF[b.symbol] = ff;
}
const EXT = {}; // price > EMA150 * 1.10
for (const b of BP) {
  const m = new Map(); let e = null; const k = 2 / 151; let n = 0;
  for (const d of masterDates) {
    const p = FF[b.symbol].get(d); if (!p) continue;
    e = e === null ? p : p * k + e * (1 - k); n++;
    m.set(d, n >= 150 && p > e * 1.10);
  }
  EXT[b.symbol] = m;
}

function irr(cfs, dates) {
  const t0 = new Date(dates[0]).getTime();
  const ts = dates.map(d => (new Date(d).getTime() - t0) / 31557600000);
  const npv = r => cfs.reduce((s, c, i) => s + c / Math.pow(1 + r, ts[i]), 0);
  let lo = -0.9, hi = 5;
  if (npv(lo) * npv(hi) > 0) return NaN;
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (npv(lo) * npv(m) < 0) hi = m; else lo = m; }
  return (lo + hi) / 2 * 100;
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); const pos = (s.length - 1) * p, b = Math.floor(pos); return s[b + 1] !== undefined ? s[b] + (pos - b) * (s[b + 1] - s[b]) : s[b]; };
const med = a => q(a, 0.5);
const f = (x, d = 2) => (x >= 0 ? '+' : '') + x.toFixed(d);

// ---------- C1 ----------
console.log('\n=== C1 DATA COVERAGE (trading days since 2020-10-01 with no raw price) ===');
const since = masterDates.filter(d => d >= '2020-10-01');
for (const b of BP) {
  const miss = since.filter(d => !RAW[b.symbol].has(d)).length;
  if (miss) console.log(`  ${b.symbol}: ${miss} missing of ${since.length}`);
}
console.log('  (v2 values missing-price stocks at $0 and silently drops buy money for them)');

// ---------- Corrected event-driven simulator ----------
function sim({ start, end = '2026-08', alloc = 'DEF', trim = null, initCap = 0, salaryDay = 1, waitDays = 0,
  cashRate = 0, monthly = 4200, burnIn = 12, dayOverride = null, trimMult = 1.5, valueAt = null,
  feeFn = (i, a) => a * FEE, pauseReview = 'MONTHLY', pauseExp = false, pauseIdle = false }) {
  const months = [...new Set(masterDates.map(d => d.slice(0, 7)))].filter(m => m >= start && m <= end);
  const h = {}; BP.forEach(b => h[b.symbol] = 0);
  const cfs = [], cfd = [];
  const buys = new Map(); // execDate -> amount
  let orders = 0, sells = 0, mIdx = 0, maxConc = 0, over = 0, lastExec = '';
  const firstDate = masterDates.find(d => d.slice(0, 7) === months[0]);
  if (initCap > 0) { cfs.push(-initCap); cfd.push(firstDate); BP.forEach(b => h[b.symbol] += initCap * b.weight * (1 - FEE) / FF[b.symbol].get(firstDate)); }
  for (const m of months) {
    const md = masterDates.filter(d => d.slice(0, 7) === m);
    const day = dayOverride ? (typeof dayOverride === 'function' ? dayOverride(m, md) : dayOverride) : salaryDay;
    const dep = md.find(d => +d.slice(8, 10) >= day) || md[md.length - 1];
    const ex = masterDates[Math.min(idxOf.get(dep) + waitDays, masterDates.length - 1)];
    cfs.push(-monthly); cfd.push(dep);
    const amt = monthly * (1 + cashRate * waitDays / 252);
    buys.set(ex, (buys.get(ex) || 0) + amt);
    lastExec = ex > lastExec ? ex : lastExec;
  }
  const lastMonthEnd = masterDates.filter(d => d.slice(0, 7) <= months[months.length - 1]).pop();
  const stopAt = lastExec > lastMonthEnd ? lastExec : lastMonthEnd;
  const span = masterDates.filter(d => d >= firstDate && d <= stopAt);
  const val = d => { const v = {}; let t = 0; BP.forEach(b => { v[b.symbol] = h[b.symbol] * FF[b.symbol].get(d); t += v[b.symbol]; }); return { v, t }; };
  let paused = new Set(), feesPaid = 0, monthOrders = 0, curMonth = '', idle = 0;
  const deficitBuy = (d, cash, mode) => {
    if (d.slice(0, 7) !== curMonth) { curMonth = d.slice(0, 7); monthOrders = 0; }
    const { v, t } = val(d);
    let defs = BP.map(b => ({ b, def: Math.max(0, b.weight * (t + cash) - v[b.symbol]) }));
    if (mode === 'PROP') defs = BP.map(b => ({ b, def: b.weight }));
    if (mode === 'TOP3') defs = [...defs].sort((x, y) => y.def - x.def).slice(0, 3);
    if (mode === 'TOP3X') {
      const ok = defs.filter(x => !EXT[x.b.symbol].get(d) && x.def > 0);
      defs = (ok.length ? ok : defs).sort((x, y) => y.def - x.def).slice(0, 3);
    }
    if (mode === 'PAUSE') {
      if (pauseReview === 'MONTHLY' || mIdx % 3 === 0 || paused === null) {
        paused = new Set(BP.filter(b => t > 0 && (v[b.symbol] / t >= b.weight || (pauseExp && EXT[b.symbol].get(d)))).map(b => b.symbol));
        if (paused.size === BP.length) paused = new Set();
      }
      defs = BP.filter(b => !paused.has(b.symbol)).map(b => ({ b, def: b.weight }));
      if (pauseIdle) {
        const all = BP.reduce((a, b) => a + b.weight, 0);
        const act = defs.reduce((a, x) => a + x.def, 0);
        idle += cash * (1 - act / all);
        cash = cash * act / all;
        if (mIdx % 3 === 0 && idle > 0) { const pool = idle; idle = 0; deficitBuy(d, pool, 'DEF'); }
      }
    }
    let s = defs.reduce((a, x) => a + x.def, 0);
    if (s <= 0) { defs = BP.map(b => ({ b, def: b.weight })); s = BP.reduce((a, b) => a + b.weight, 0); }
    defs.forEach(x => {
      const a = cash * x.def / s;
      if (a >= 5) { orders++; const fee = feeFn(monthOrders++, a); feesPaid += fee; h[x.b.symbol] += (a - fee) / FF[x.b.symbol].get(d); }
    });
  };
  for (let i = 0; i < span.length; i++) {
    const d = span[i];
    if (buys.has(d)) {
      let mode = alloc;
      if (alloc === 'QTR') mode = (mIdx % 3 === 2) ? 'DEF' : 'PROP';
      deficitBuy(d, buys.get(d), mode);
    }
    const isME = i === span.length - 1 || span[i + 1].slice(0, 7) !== d.slice(0, 7);
    if (!isME) continue;
    const { v, t } = val(d);
    let hit = false;
    BP.forEach(b => { const w = v[b.symbol] / t; if (mIdx >= burnIn) maxConc = Math.max(maxConc, w); if (w > b.weight * 1.5) hit = true; });
    if (hit && mIdx >= burnIn) over++;
    const doTrim = trim === 'MONTHLY' || (trim === 'ANNUAL' && d.slice(5, 7) === '12') || (trim === 'QUARTERLY' && ['03', '06', '09', '12'].includes(d.slice(5, 7)));
    if (doTrim) {
      let cash = 0;
      BP.forEach(b => { const ex = v[b.symbol] - t * b.weight; if (v[b.symbol] > t * b.weight * trimMult && ex > 500) { sells++; h[b.symbol] -= ex / FF[b.symbol].get(d); cash += ex * (1 - FEE); } });
      if (cash > 0) deficitBuy(d, cash, 'DEF');
    }
    mIdx++;
  }
  const ld = valueAt || masterDates[masterDates.length - 1];
  const fv = BP.reduce((s, b) => s + h[b.symbol] * FF[b.symbol].get(ld), 0) + idle;
  cfs.push(fv); cfd.push(ld);
  return { irr: irr(cfs, cfd), maxConc: maxConc * 100, over, orders: orders / months.length, sells, feesPaid };
}

const ymRange = (a, b) => [...new Set(masterDates.map(d => d.slice(0, 7)))].filter(m => m >= a && m <= b);
const clean = ymRange('2020-10', '2024-09');

function compare(label, rows, base) {
  const minus12 = ym => { const [y, m] = ym.split('-').map(Number); return `${y - 1}-${String(m).padStart(2, '0')}`; };
  const W = base.end ? clean.filter(s => s <= minus12(base.end)) : clean;
  console.log(`\n--- ${label} (n=${W.length} clean windows, start ${W[0]}..${W[W.length - 1]}) ---`);
  const B = W.map(s => sim({ start: s, ...base }));
  for (const [name, cfg] of rows) {
    const R = W.map(s => sim({ start: s, ...cfg }));
    const d = R.map((r, i) => r.irr - B[i].irr);
    console.log(`${name.padEnd(36)} IRR ${med(R.map(r => r.irr)).toFixed(2)} | Δ ${f(med(d))}%/yr win ${(d.filter(x => x > 0).length / d.length * 100).toFixed(0)}% | maxConc(post-12m) ${med(R.map(r => r.maxConc)).toFixed(1)}% | months>1.5x ${med(R.map(r => r.over)).toFixed(0)} | orders/mo ${med(R.map(r => r.orders)).toFixed(1)} | sells ${med(R.map(r => r.sells)).toFixed(0)} | fees $${med(R.map(r => r.feesPaid)).toFixed(0)}`);
  }
}

if (process.argv[2] === 'combo') {
  const W = (i, a) => a * 0.0010 * 1.07;
  const rows = x => [
    ['C Top-3', { alloc: 'TOP3', feeFn: W, ...x }],
    ['C Top-3 + skip >10% EMA150', { alloc: 'TOP3X', feeFn: W, ...x }],
    ['A Auto equal', { alloc: 'PROP', feeFn: W, ...x }],
    ['P pause qtr (money redistributed)', { alloc: 'PAUSE', pauseReview: 'QUARTERLY', feeFn: W, ...x }],
    ['P pause qtr (paused money idle)', { alloc: 'PAUSE', pauseReview: 'QUARTERLY', pauseIdle: true, feeFn: W, ...x }]
  ];
  for (const [label, x] of [
    ['CB full to 2026-09, $0', {}],
    ['CB full to 2026-09, $150k', { initCap: 150000 }],
    ['CB valued 2022-12-30 (bear), $0', { end: '2022-12', valueAt: '2022-12-30' }],
    ['CB valued 2023-12-29, $0', { end: '2023-12', valueAt: '2023-12-29' }]
  ]) compare(label, rows(x), { alloc: 'DEF', feeFn: W, ...x });
  process.exit(0);
}

if (process.argv[2] === 'broker') {
  const FEES = {
    WEBULL: (i, a) => a * 0.0010 * 1.07,
    WEBULL_DCA_FREE: () => 0,
    DIME_1ST_FREE: (i, a) => i === 0 ? 0 : a * 0.0015 * 1.07,
    DIME_NO_FREE: (i, a) => a * 0.0015 * 1.07,
    HYPO_MIN_1USD: (i, a) => Math.max(a * 0.0010, 1)
  };
  const S = {
    'B Deficit (manual)': { alloc: 'DEF' },
    'C Top-3 (manual)': { alloc: 'TOP3' },
    'C Top-3 + skip >10% EMA150': { alloc: 'TOP3X' },
    'A Auto equal (no pause)': { alloc: 'PROP' },
    'P Auto + pause overweight (monthly)': { alloc: 'PAUSE', pauseReview: 'MONTHLY' },
    'P Auto + pause overweight (quarterly)': { alloc: 'PAUSE', pauseReview: 'QUARTERLY' },
    'P Auto + pause over/expensive (qtr)': { alloc: 'PAUSE', pauseReview: 'QUARTERLY', pauseExp: true }
  };
  for (const cap of [0, 150000]) {
    compare(`BR-1 STRATEGIES @ Webull fee, start capital $${cap / 1000}k`,
      Object.entries(S).map(([n, c]) => [n, { ...c, initCap: cap, feeFn: FEES.WEBULL }]),
      { alloc: 'DEF', initCap: cap, feeFn: FEES.WEBULL });
  }
  for (const [fname, fn] of Object.entries(FEES)) {
    compare(`BR-2 FEE MODEL ${fname} ($0 start, delta vs Deficit on same fee)`,
      ['B Deficit (manual)', 'C Top-3 (manual)', 'A Auto equal (no pause)', 'P Auto + pause overweight (quarterly)'].map(n => [n, { ...S[n], feeFn: fn }]),
      { alloc: 'DEF', feeFn: fn });
  }
  console.log('\n--- BR-3 SAME STRATEGY, DIFFERENT BROKER (Top-3, $0 start): delta vs Webull ---');
  const base = clean.map(s => sim({ start: s, alloc: 'TOP3', feeFn: FEES.WEBULL }).irr);
  for (const [fname, fn] of Object.entries(FEES)) {
    const d = clean.map((s, i) => sim({ start: s, alloc: 'TOP3', feeFn: fn }).irr - base[i]);
    console.log(`  ${fname.padEnd(18)} Δ ${f(med(d), 3)}%/yr`);
  }
  process.exit(0);
}

if (process.argv[2] === 'trim') {
  const T = (label, extra) => compare(label, [
    ['B Deficit (no trim)', { alloc: 'DEF', ...extra }],
    ['A Prop + MONTHLY 1.5x', { alloc: 'PROP', trim: 'MONTHLY', ...extra }],
    ['A Prop + QUARTERLY 1.5x', { alloc: 'PROP', trim: 'QUARTERLY', ...extra }],
    ['A Prop + MONTHLY 1.3x', { alloc: 'PROP', trim: 'MONTHLY', trimMult: 1.3, ...extra }],
    ['A Prop + MONTHLY 2.0x', { alloc: 'PROP', trim: 'MONTHLY', trimMult: 2.0, ...extra }],
    ['B Deficit + MONTHLY 1.5x', { alloc: 'DEF', trim: 'MONTHLY', ...extra }],
    ['C Top-3 + MONTHLY 1.5x', { alloc: 'TOP3', trim: 'MONTHLY', ...extra }],
    ['C Top-3 + QUARTERLY 1.5x', { alloc: 'TOP3', trim: 'QUARTERLY', ...extra }]
  ], { alloc: 'DEF', ...extra });
  T('T-A full period to 2026-09', {});
  T('T-B bear/chop regime: valued 2022-12-30', { end: '2022-12', valueAt: '2022-12-30' });
  T('T-C pre-AI-peak: valued 2023-12-29', { end: '2023-12', valueAt: '2023-12-29' });
  T('T-D existing $150k portfolio', { initCap: 150000 });
  process.exit(0);
}

// ---------- C2 ----------
console.log('\n=== C2 D3 LOOK-AHEAD BUG IN v2 ===');
console.log('  v2 baseline (waitingDays=0, salaryDay=25): exec = getExecutionDate(CALENDAR_DAY,1) = day 1, cashflow booked on day 25');
console.log('  => baseline buys ~3 weeks BEFORE the money exists. Waits of 4..15 days all clamp to month-end => identical -3.194%.');

// ---------- C4 ----------
compare('C4 RECONCILE: Deficit vs Proportional, $0 start, buy on day 1', [
  ['A Proportional', { alloc: 'PROP' }], ['B Deficit', { alloc: 'DEF' }], ['C Top-3', { alloc: 'TOP3' }],
  ['H_Q Auto + quarterly Deficit (FIXED)', { alloc: 'QTR' }]
], { alloc: 'DEF' });

// ---------- C6 ----------
compare('C6 D3 CORRECTED: salary on 25th, buy same day vs wait k trading days (crosses month)', [
  ['wait 0', { waitDays: 0, salaryDay: 25 }], ['wait 3', { waitDays: 3, salaryDay: 25 }],
  ['wait 5 (~1st of next month)', { waitDays: 5, salaryDay: 25 }], ['wait 10', { waitDays: 10, salaryDay: 25 }],
  ['wait 5 @4.5% cash yield', { waitDays: 5, salaryDay: 25, cashRate: 0.045 }]
], { waitDays: 0, salaryDay: 25 });

// ---------- C7 ----------
compare('C7 D6 CORRECTED + TRIM VARIANTS ($0 start)', [
  ['A Prop (auto, no trim)', { alloc: 'PROP' }], ['A Prop + MONTHLY trim', { alloc: 'PROP', trim: 'MONTHLY' }],
  ['A Prop + ANNUAL trim (Dec)', { alloc: 'PROP', trim: 'ANNUAL' }], ['B Deficit', { alloc: 'DEF' }],
  ['B Deficit + ANNUAL trim', { alloc: 'DEF', trim: 'ANNUAL' }], ['C Top-3', { alloc: 'TOP3' }],
  ['C Top-3 + ANNUAL trim', { alloc: 'TOP3', trim: 'ANNUAL' }]
], { alloc: 'DEF' });

// ---------- C8 ----------
for (const cap of [50000, 150000]) {
  compare(`C8 EXISTING PORTFOLIO $${cap / 1000}k + $4,200/mo`, [
    ['A Prop', { alloc: 'PROP', initCap: cap }], ['A Prop + ANNUAL trim', { alloc: 'PROP', trim: 'ANNUAL', initCap: cap }],
    ['B Deficit', { alloc: 'DEF', initCap: cap }], ['B Deficit + ANNUAL trim', { alloc: 'DEF', trim: 'ANNUAL', initCap: cap }],
    ['C Top-3', { alloc: 'TOP3', initCap: cap }], ['C Top-3 + ANNUAL trim', { alloc: 'TOP3', trim: 'ANNUAL', initCap: cap }]
  ], { alloc: 'DEF', initCap: cap });
}

// ---------- C9 ----------
console.log('\n=== C9 D2 PERMUTATION GATE: is "Day 25" better than a random day each month? ===');
const sub = clean.filter((_, i) => i % 3 === 0);
const base1 = sub.map(s => sim({ start: s, dayOverride: 1 }).irr);
const obs = med(sub.map((s, i) => sim({ start: s, dayOverride: 25 }).irr - base1[i]));
const perms = [];
let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let r = 0; r < 300; r++) {
  const pick = new Map();
  const dayFn = (m, md) => { if (!pick.has(m)) pick.set(m, 1 + Math.floor(rnd() * 28)); return pick.get(m); };
  perms.push(med(sub.map((s, i) => sim({ start: s, dayOverride: dayFn }).irr - base1[i])));
}
const p95 = q(perms, 0.95), rank = perms.filter(x => x >= obs).length / perms.length;
console.log(`  Day 25 median Δ vs Day 1 = ${f(obs, 3)}%/yr | random-day 95th pct = ${f(p95, 3)}%/yr | p = ${rank.toFixed(2)} => ${obs > p95 ? 'PASS' : 'FAIL (noise)'}`);
