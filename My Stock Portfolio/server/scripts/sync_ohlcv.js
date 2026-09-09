import { db } from '../db/init.js';
import { syncCandleDelta } from '../services/technicalAnalysis.js';

const symbols = [
  'NVDA', 'MELI', 'AVGO', 'CRWD', 'TSM', 'VRT', 'APH', 'KLAC', 'ANET', 'ALAB',
  'PLTR', 'SMCI', 'TSLA', 'AMZN', 'COST', 'HIMS', 'RBRK', 'SE', 'QQQ', 'SPY'
];

console.log('🚀 Starting Full OHLCV Sync from Yahoo Finance...');

async function main() {
  for (const sym of symbols) {
    process.stdout.write(`Fetching OHLCV for ${sym}... `);
    try {
      const rows = await syncCandleDelta(sym, 1825);
      const valid = rows.filter(r => r.high > r.low);
      console.log(`✅ ${rows.length} rows (${valid.length} with real high > low wicks)`);
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
  }

  const check = db.prepare(`
    SELECT symbol, count(*) as count, count(open) as count_open, count(case when high > low then 1 end) as count_wicks 
    FROM historical_prices 
    WHERE symbol IN ('NVDA', 'MELI', 'AVGO', 'CRWD', 'TSM', 'VRT', 'APH', 'KLAC', 'ANET', 'ALAB')
    GROUP BY symbol
  `).all();
  console.table(check);
  console.log('✨ All symbols synced successfully!');
}

main().catch(console.error);
