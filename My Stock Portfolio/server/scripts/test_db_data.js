import { db } from '../db/init.js';

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in DB:', tables.map(t => t.name));

try {
  const count = db.prepare("SELECT count(*) as c FROM historical_prices").get();
  console.log('Total rows in historical_prices:', count.c);
  
  const symbols = db.prepare("SELECT symbol, count(*) as bars, min(date) as start_date, max(date) as end_date FROM historical_prices GROUP BY symbol ORDER BY bars DESC").all();
  console.log('\nSymbols with historical data:');
  console.table(symbols);
} catch (e) {
  console.error('Error querying historical_prices:', e.message);
}
