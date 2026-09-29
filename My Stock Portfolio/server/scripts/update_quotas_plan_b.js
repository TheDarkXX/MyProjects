import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'db', 'stock.db');
const db = new Database(dbPath);

console.log('--- UPDATING PROJECT 2X SHARE QUOTAS FOR PLAN B ---');

const p2xPort = db.prepare("SELECT * FROM portfolios WHERE id = 'fcfdd1e0-bf53-4910-89e7-8ca2474d4c27'").get();
console.log('Target Portfolio:', p2xPort ? p2xPort.name : 'Not found');

const config = db.prepare("SELECT * FROM project2x_config WHERE portfolio_id = 'fcfdd1e0-bf53-4910-89e7-8ca2474d4c27'").get();
const fxRate = 35.0; // Standard 35 THB/USD
const targetUsdTotal = (config?.goal_amount_thb || 10000000) / fxRate;

const updates = [
  { symbol: 'TSM', target_percent: 13.0 },
  { symbol: 'VRT', target_percent: 12.0 },
  { symbol: 'MELI', target_percent: 5.0 }
];

for (const u of updates) {
  const quota = db.prepare("SELECT * FROM project2x_share_quotas WHERE portfolio_id = 'fcfdd1e0-bf53-4910-89e7-8ca2474d4c27' AND symbol = ?").get(u.symbol);
  if (quota) {
    const basePrice = quota.base_price || 100;
    const allocUsd = targetUsdTotal * (u.target_percent / 100);
    const newTargetShares = Number((allocUsd / basePrice).toFixed(4));
    
    db.prepare(`
      UPDATE project2x_share_quotas 
      SET target_percent = ?, target_shares = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(u.target_percent, newTargetShares, quota.id);

    console.log(`Updated ${u.symbol}: target_percent=${u.target_percent}%, base_price=$${basePrice}, target_shares=${newTargetShares} (was ${quota.target_shares})`);
  } else {
    console.log(`Quota not found for ${u.symbol}`);
  }
}

console.log('\n--- VERIFY ALL PROJECT 2X QUOTAS ---');
const allQuotas = db.prepare("SELECT symbol, category, target_percent, target_shares, base_price FROM project2x_share_quotas WHERE portfolio_id = 'fcfdd1e0-bf53-4910-89e7-8ca2474d4c27' ORDER BY target_percent DESC").all();
console.table(allQuotas);

const totalPct = allQuotas.reduce((sum, q) => sum + q.target_percent, 0);
console.log(`Total Target Percent across all stocks: ${totalPct}% (Remaining 6% is Cash/MMF Reserve)`);
