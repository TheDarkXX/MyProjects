import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDb = process.argv[2] || 'stock.db';
const dbPath = path.isAbsolute(targetDb) ? targetDb : path.join(__dirname, 'db', targetDb);

const db = new Database(dbPath, { readonly: true });
const portfolios = db.prepare('SELECT * FROM portfolios').all();

for (const p of portfolios) {
  console.log(`\n========================================`);
  console.log(`Portfolio: ${p.name} (${p.id})`);
  console.log(`========================================`);

  const txs = db.prepare('SELECT * FROM transactions WHERE portfolio_id = ? ORDER BY date ASC').all(p.id);
  console.log(`Total transactions: ${txs.length}`);

  let cash = 0;
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  let totalDividends = 0;
  const holdings = {};

  for (const t of txs) {
    if (t.type === 'DEPOSIT') {
      cash += t.amount;
      totalDeposits += t.amount;
    } else if (t.type === 'WITHDRAW') {
      cash -= t.amount;
      totalWithdrawals += t.amount;
    } else if (t.type === 'BUY') {
      cash -= (t.amount * t.price + (t.fee || 0));
      holdings[t.symbol] = (holdings[t.symbol] || 0) + t.amount;
    } else if (t.type === 'SELL') {
      cash += (t.amount * t.price - (t.fee || 0));
      holdings[t.symbol] = (holdings[t.symbol] || 0) - t.amount;
    } else if (t.type === 'DIVIDEND' || t.type === 'INTEREST') {
      cash += t.amount;
      totalDividends += t.amount;
    }
  }

  console.log(`Cash Balance: $${cash.toFixed(2)}`);
  console.log(`Total Deposits: $${totalDeposits.toFixed(2)}`);
  console.log(`Total Withdrawals: $${totalWithdrawals.toFixed(2)}`);
  console.log(`Total Div/Interest: $${totalDividends.toFixed(2)}`);
  console.log(`Holdings:`);
  for (const [sym, qty] of Object.entries(holdings)) {
    if (Math.abs(qty) > 0.0001) {
      console.log(`  ${sym}: ${qty.toFixed(6)} shares`);
    }
  }
}
