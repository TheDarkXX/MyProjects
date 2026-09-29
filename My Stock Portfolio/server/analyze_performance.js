import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'db', 'stock.db');

const db = new Database(dbPath, { readonly: true });

const symbols = [
  'NVDA', 'TSM', 'AVGO', 'VRT', 'MELI', 'APH', 'ANET', 'KLAC', 'CRWD', // Core
  'STRL', 'ALAB', 'PLTR', 'CLS' // Moonshot
];

console.log('=== PROJECT 2X HISTORICAL PERFORMANCE AUDIT ===\n');

// Find date range
const maxDateRow = db.prepare('SELECT MAX(date) as max_date FROM historical_prices').get();
const latestDate = maxDateRow.max_date;
console.log(`Latest available date in DB: ${latestDate}\n`);

// Helper to get price on or immediately before target date
function getPriceOnOrBefore(symbol, targetDate) {
  const row = db.prepare(`
    SELECT date, COALESCE(close, price) as close 
    FROM historical_prices 
    WHERE symbol = ? AND date <= ? 
    ORDER BY date DESC LIMIT 1
  `).get(symbol, targetDate);
  return row;
}

// Target dates relative to latestDate (approx 2026-09-17)
// 1 Year ago: 2025-09-17
// 2 Years ago: 2024-09-17
// 3 Years ago: 2023-09-17
// 5 Years ago: 2021-09-17

const targetYears = [
  { label: '1Y', date: '2025-09-17', years: 1 },
  { label: '2Y', date: '2024-09-17', years: 2 },
  { label: '3Y', date: '2023-09-17', years: 3 },
  { label: '5Y', date: '2021-09-17', years: 5 }
];

const results = [];

for (const sym of symbols) {
  const latest = getPriceOnOrBefore(sym, latestDate);
  if (!latest) {
    console.log(`No data for ${sym}`);
    continue;
  }
  const currPrice = latest.close;

  const symRes = {
    symbol: sym,
    latestDate: latest.date,
    latestPrice: currPrice,
    returns: {},
    cagr: {}
  };

  for (const ty of targetYears) {
    const past = getPriceOnOrBefore(sym, ty.date);
    if (past) {
      const pastPrice = past.close;
      const totalReturn = (currPrice - pastPrice) / pastPrice;
      const cagr = Math.pow(1 + totalReturn, 1 / ty.years) - 1;
      symRes.returns[ty.label] = {
        pastDate: past.date,
        pastPrice: pastPrice,
        totalReturnPct: (totalReturn * 100).toFixed(1),
        cagrPct: (cagr * 100).toFixed(1)
      };
    } else {
      symRes.returns[ty.label] = null;
    }
  }
  results.push(symRes);
}

// Check NVDA split around June 2024
console.log('\n--- NVDA Split Verification ---');
const nvdaRows = db.prepare('SELECT date, close FROM historical_prices WHERE symbol = ? AND date BETWEEN ? AND ? ORDER BY date ASC')
  .all('NVDA', '2024-06-05', '2024-06-12');
console.log(nvdaRows);

// Check AVGO split around July 2024
console.log('\n--- AVGO Split Verification ---');
const avgoRows = db.prepare('SELECT date, close FROM historical_prices WHERE symbol = ? AND date BETWEEN ? AND ? ORDER BY date ASC')
  .all('AVGO', '2024-07-10', '2024-07-16');
console.log(avgoRows);

// Display results in markdown table format
console.log('\n=== INDIVIDUAL STOCK HISTORICAL PERFORMANCE TABLE ===\n');
console.log('| Symbol | Current ($) | 1Y Return | 2Y Return (CAGR) | 3Y Return (CAGR) | 5Y Return (CAGR) |');
console.log('| :--- | :---: | :---: | :---: | :---: | :---: |');

for (const r of results) {
  const p1 = r.returns['1Y'] ? `+${r.returns['1Y'].totalReturnPct}%` : 'N/A';
  const p2 = r.returns['2Y'] ? `+${r.returns['2Y'].totalReturnPct}% (${r.returns['2Y'].cagrPct}%/y)` : 'N/A';
  const p3 = r.returns['3Y'] ? `+${r.returns['3Y'].totalReturnPct}% (${r.returns['3Y'].cagrPct}%/y)` : 'N/A';
  const p5 = r.returns['5Y'] ? `+${r.returns['5Y'].totalReturnPct}% (${r.returns['5Y'].cagrPct}%/y)` : 'N/A';
  console.log(`| **${r.symbol}** | $${r.latestPrice.toFixed(2)} | ${p1} | ${p2} | ${p3} | ${p5} |`);
}

// Weights according to Project 2X config
const weights = {
  NVDA: 0.15,
  TSM: 0.10,
  AVGO: 0.10,
  VRT: 0.10,
  MELI: 0.10,
  APH: 0.10,
  ANET: 0.07,
  KLAC: 0.07,
  CRWD: 0.04,
  STRL: 0.03,
  ALAB: 0.03,
  PLTR: 0.03,
  CLS: 0.02
};

// Calculate Weighted Returns
console.log('\n=== WEIGHTED PORTFOLIO AVERAGE PERFORMANCE ===\n');

for (const ty of targetYears) {
  let weightedReturn = 0;
  let totalWeight = 0;
  
  for (const r of results) {
    const w = weights[r.symbol] || 0;
    if (r.returns[ty.label]) {
      const ret = parseFloat(r.returns[ty.label].totalReturnPct) / 100;
      weightedReturn += ret * w;
      totalWeight += w;
    }
  }
  
  // Normalize if some weights missing (like ALAB 3Y/5Y)
  const normReturn = weightedReturn / totalWeight;
  const weightedCagr = (Math.pow(1 + normReturn, 1 / ty.years) - 1) * 100;
  
  console.log(`- **${ty.label} Horizon (${ty.years} Year${ty.years > 1 ? 's' : ''}):** Cumulative Return = +${(normReturn * 100).toFixed(1)}% | **CAGR = +${weightedCagr.toFixed(1)}% ต่อปี** (Weight coverage: ${(totalWeight * 100).toFixed(0)}%)`);
}

// Compare with S&P 500 (^GSPC) and QQQ if available
console.log('\n=== BENCHMARK COMPARISON ===\n');
for (const b of ['^GSPC', 'QQQ', 'QQQM']) {
  const latest = getPriceOnOrBefore(b, latestDate);
  if (!latest) continue;
  console.log(`Benchmark ${b} (Current: $${latest.close.toFixed(2)}):`);
  for (const ty of targetYears) {
    const past = getPriceOnOrBefore(b, ty.date);
    if (past) {
      const ret = ((latest.close - past.close) / past.close) * 100;
      const cagr = (Math.pow(1 + ret/100, 1 / ty.years) - 1) * 100;
      console.log(`  ${ty.label}: +${ret.toFixed(1)}% (CAGR: +${cagr.toFixed(1)}%/y)`);
    }
  }
}


