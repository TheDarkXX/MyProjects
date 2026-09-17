import { db, initDb } from '../db/init.js';
import { DEFAULT_2X_STOCKS } from '../services/project2xEngine.js';

console.log('🌱 Starting Project 2X Dossier Seeding...');
initDb();

// 1. Seed Specific Drivers for all 13 stocks
const SPECIFIC_DRIVERS = [
  { symbol: 'NVDA', key: 'data_center_rev_pct', label: 'Data Center Revenue %', value: 87.5, unit: '%', safe: 80, danger: 70 },
  { symbol: 'TSM', key: 'advanced_nodes_pct', label: 'Advanced Nodes (≤3nm/5nm) %', value: 67.0, unit: '%', safe: 55, danger: 45 },
  { symbol: 'AVGO', key: 'ai_revenue_b', label: 'AI Semiconductor Run-rate ($B)', value: 12.2, unit: '$B', safe: 10.0, danger: 8.0 },
  { symbol: 'VRT', key: 'liquid_cooling_backlog_b', label: 'Liquid Cooling Backlog ($B)', value: 7.4, unit: '$B', safe: 6.0, danger: 5.0 },
  { symbol: 'MELI', key: 'fintech_tpv_b', label: 'Fintech Total Payment Volume ($B)', value: 50.8, unit: '$B', safe: 40.0, danger: 30.0 },
  { symbol: 'APH', key: 'it_datacomm_pct', label: 'IT Datacomm Revenue %', value: 48.0, unit: '%', safe: 40.0, danger: 30.0 },
  { symbol: 'KLAC', key: 'process_control_share_pct', label: 'Process Control Market Share %', value: 55.0, unit: '%', safe: 50.0, danger: 40.0 },
  { symbol: 'ANET', key: 'cloud_titan_pct', label: 'Cloud Titans (MSFT/META) Share %', value: 42.0, unit: '%', safe: 35.0, danger: 25.0 },
  { symbol: 'CRWD', key: 'arr_usd_b', label: 'Annual Recurring Revenue (ARR)', value: 4.02, unit: '$B', safe: 3.8, danger: 3.5 },
  { symbol: 'STRL', key: 'e_infra_margin_pct', label: 'E-Infrastructure Operating Margin %', value: 18.5, unit: '%', safe: 15.0, danger: 12.0 },
  { symbol: 'ALAB', key: 'pcie_retimer_share_pct', label: 'PCIe Gen6/CXL Retimer Share %', value: 85.0, unit: '%', safe: 75.0, danger: 60.0 },
  { symbol: 'PLTR', key: 'us_commercial_growth_pct', label: 'US Commercial Revenue YoY %', value: 54.0, unit: '%', safe: 40.0, danger: 25.0 },
  { symbol: 'CLS', key: 'connectivity_cloud_pct', label: 'CCS Segment Revenue %', value: 65.0, unit: '%', safe: 55.0, danger: 45.0 }
];

const driverStmt = db.prepare(`
  INSERT INTO project2x_specific_drivers (
    symbol, metric_key, metric_label, metric_value, metric_unit, safe_threshold, danger_threshold, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(symbol, metric_key) DO UPDATE SET
    metric_label = excluded.metric_label,
    metric_value = excluded.metric_value,
    metric_unit = excluded.metric_unit,
    safe_threshold = excluded.safe_threshold,
    danger_threshold = excluded.danger_threshold,
    updated_at = datetime('now')
`);

for (const d of SPECIFIC_DRIVERS) {
  driverStmt.run(d.symbol, d.key, d.label, d.value, d.unit, d.safe, d.danger);
}
console.log(`✅ Seeded ${SPECIFIC_DRIVERS.length} specific stock drivers.`);

// 2. Seed 8-10 Quarters of Financials for each stock
// Realistic high-growth trajectory (Q1-2024 to Q3-2026)
const QUARTERS = [
  { q: '2026-Q2', date: '2026-08-20' },
  { q: '2026-Q1', date: '2026-05-22' },
  { q: '2025-Q4', date: '2026-02-21' },
  { q: '2025-Q3', date: '2025-11-20' },
  { q: '2025-Q2', date: '2025-08-23' },
  { q: '2025-Q1', date: '2025-05-24' },
  { q: '2024-Q4', date: '2025-02-26' },
  { q: '2024-Q3', date: '2024-11-21' }
];

// Base stats per stock to generate realistic progression
const STOCK_FIN_PROFILES = {
  NVDA: { baseRevB: 30.0, revGrowth: 122, eps: 0.68, margin: 75.1, beat: 6.2 },
  TSM:  { baseRevB: 23.5, revGrowth: 36,  eps: 1.85, margin: 54.3, beat: 5.1 },
  AVGO: { baseRevB: 13.1, revGrowth: 47,  eps: 1.24, margin: 62.5, beat: 3.8 },
  VRT:  { baseRevB: 2.1,  revGrowth: 28,  eps: 0.72, margin: 36.2, beat: 8.5 },
  MELI: { baseRevB: 5.1,  revGrowth: 42,  eps: 10.4, margin: 48.0, beat: 4.2 },
  APH:  { baseRevB: 4.0,  revGrowth: 26,  eps: 0.44, margin: 38.5, beat: 4.8 },
  KLAC: { baseRevB: 2.8,  revGrowth: 22,  eps: 7.38, margin: 61.2, beat: 5.4 },
  ANET: { baseRevB: 1.8,  revGrowth: 20,  eps: 0.64, margin: 64.5, beat: 6.0 },
  CRWD: { baseRevB: 1.0,  revGrowth: 32,  eps: 0.93, margin: 78.2, beat: 4.5 },
  STRL: { baseRevB: 0.6,  revGrowth: 25,  eps: 1.95, margin: 18.5, beat: 12.0 },
  ALAB: { baseRevB: 0.12, revGrowth: 180, eps: 0.23, margin: 77.8, beat: 15.0 },
  PLTR: { baseRevB: 0.75, revGrowth: 30,  eps: 0.10, margin: 81.0, beat: 10.0 },
  CLS:  { baseRevB: 2.5,  revGrowth: 24,  eps: 0.98, margin: 24.5, beat: 7.2 }
};

const finStmt = db.prepare(`
  INSERT INTO quarterly_financials (
    symbol, fiscal_quarter, report_date, revenue_usd, yoy_revenue_growth_pct,
    eps_actual, eps_estimate, eps_surprise_pct, gross_margin_pct, source, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', datetime('now'))
  ON CONFLICT(symbol, fiscal_quarter) DO UPDATE SET
    revenue_usd = excluded.revenue_usd,
    yoy_revenue_growth_pct = excluded.yoy_revenue_growth_pct,
    eps_actual = excluded.eps_actual,
    eps_estimate = excluded.eps_estimate,
    eps_surprise_pct = excluded.eps_surprise_pct,
    gross_margin_pct = excluded.gross_margin_pct,
    updated_at = datetime('now')
`);

for (const stock of DEFAULT_2X_STOCKS) {
  const p = STOCK_FIN_PROFILES[stock.symbol] || { baseRevB: 2.0, revGrowth: 25, eps: 1.0, margin: 50.0, beat: 5.0 };
  
  QUARTERS.forEach((qObj, idx) => {
    // Decay backwards in time for growth realism
    const decay = Math.pow(0.92, idx);
    const rev = Number((p.baseRevB * 1e9 * decay).toFixed(0));
    const epsActual = Number((p.eps * decay).toFixed(2));
    const epsEst = Number((epsActual * (1 - (p.beat / 100))).toFixed(2));
    const surprise = p.beat;
    const margin = Number((p.margin - (idx * 0.3)).toFixed(1));
    const revGrowth = Number((p.revGrowth * (1 - (idx * 0.05))).toFixed(1));

    finStmt.run(
      stock.symbol,
      qObj.q,
      qObj.date,
      rev,
      revGrowth,
      epsActual,
      epsEst,
      surprise,
      margin
    );
  });
}
console.log(`✅ Seeded quarterly financials for all ${DEFAULT_2X_STOCKS.length} stocks.`);

// 3. Backfill Monthly Historical P/E for 3Y Valuation Band (36 months)
const fundHistStmt = db.prepare(`
  INSERT INTO fundamentals_history (
    symbol, snapshot_date, price_at_snapshot, pe_trailing, pe_forward, peg_ratio, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(symbol, snapshot_date) DO UPDATE SET
    price_at_snapshot = excluded.price_at_snapshot,
    pe_trailing = excluded.pe_trailing,
    pe_forward = excluded.pe_forward,
    peg_ratio = excluded.peg_ratio,
    updated_at = datetime('now')
`);

// Generate 24 monthly snapshots from historical prices in DB
for (const stock of DEFAULT_2X_STOCKS) {
  const rows = db.prepare(`
    SELECT date, price FROM historical_prices
    WHERE symbol = ?
    ORDER BY date ASC
  `).all(stock.symbol);

  if (rows.length > 0) {
    // Pick end-of-month dates
    const monthlyMap = {};
    for (const r of rows) {
      const ym = r.date.substring(0, 7);
      monthlyMap[ym] = r; // latest in that month
    }

    const months = Object.keys(monthlyMap).sort().slice(-24); // last 24 months
    const latestPrice = rows[rows.length - 1].price;
    const basePE = stock.category === 'Moonshot' ? 65 : 38;

    months.forEach((ym, idx) => {
      const item = monthlyMap[ym];
      const price = item.price;
      // PE relative to price variation
      const peTrailing = Number((basePE * (price / latestPrice)).toFixed(1));
      const peForward = Number((peTrailing * 0.78).toFixed(1));
      const pegRatio = Number((peForward / 25).toFixed(2));

      fundHistStmt.run(
        stock.symbol,
        item.date,
        price,
        peTrailing,
        peForward,
        pegRatio
      );
    });
  }
}

console.log('✅ Valuation band history seeded successfully.');
console.log('🏁 Project 2X Dossier Seeding Complete!\n');
process.exit(0);
