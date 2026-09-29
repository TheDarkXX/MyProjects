import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.join(__dirname, 'db', 'stock.db'), { readonly: true });

console.log('--- QUARTERLY FINANCIALS FOR MELI ---');
console.log(db.prepare('SELECT fiscal_quarter, report_date, revenue_usd, yoy_revenue_growth_pct, eps_actual, eps_estimate, eps_surprise_pct, gross_margin_pct FROM quarterly_financials WHERE symbol = ? ORDER BY fiscal_quarter DESC LIMIT 8').all('MELI'));

console.log('\n--- PRICE STATS & DRAWDOWN ---');
const ath = db.prepare('SELECT MAX(close) as ath, date as ath_date FROM historical_prices WHERE symbol = ?').get('MELI');
const latest = db.prepare('SELECT close, date FROM historical_prices WHERE symbol = ? ORDER BY date DESC LIMIT 1').get('MELI');
const low1y = db.prepare("SELECT MIN(close) as low1y, date as low_date FROM historical_prices WHERE symbol = ? AND date >= '2025-09-01'").get('MELI');

console.log('ATH:', ath);
console.log('Latest:', latest);
console.log('1Y Low:', low1y);
console.log('Drawdown from ATH:', (((latest.close - ath.ath) / ath.ath) * 100).toFixed(1) + '%');

console.log('\n--- HISTORICAL ANNUAL RETURNS FOR MELI ---');
const years = ['2020-01-02', '2021-01-04', '2022-01-03', '2023-01-03', '2024-01-02', '2025-01-02', '2026-01-02'];
for (let i = 0; i < years.length - 1; i++) {
  const p1 = db.prepare('SELECT close, date FROM historical_prices WHERE symbol = ? AND date >= ? ORDER BY date ASC LIMIT 1').get('MELI', years[i]);
  const p2 = db.prepare('SELECT close, date FROM historical_prices WHERE symbol = ? AND date >= ? ORDER BY date ASC LIMIT 1').get('MELI', years[i+1]);
  if (p1 && p2) {
    const ret = ((p2.close - p1.close) / p1.close) * 100;
    console.log(`${years[i].substring(0,4)} -> ${years[i+1].substring(0,4)}: ${ret >= 0 ? '+' : ''}${ret.toFixed(1)}% (from $${p1.close.toFixed(2)} to $${p2.close.toFixed(2)})`);
  }
}
