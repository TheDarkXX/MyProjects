import Database from 'better-sqlite3';

const db = new Database('server/db/stock.db', { readonly: true });
const rowCount = db.prepare('SELECT count(*) as count FROM historical_prices').get();
console.log('Total rows in historical_prices:', rowCount.count);

const symbols = db.prepare('SELECT DISTINCT symbol FROM historical_prices').all().map(r => r.symbol);
console.log('Symbols count:', symbols.length);
console.log('Contains THB=X:', symbols.includes('THB=X'));

const nvdaCheck = db.prepare('SELECT count(*) as total, sum(CASE WHEN open = price THEN 1 ELSE 0 END) as exact_matches FROM historical_prices WHERE symbol = ?').get('NVDA');
console.log('NVDA open == close check:', nvdaCheck);

const qqqCheck = db.prepare('SELECT count(*) as total, sum(CASE WHEN open = price THEN 1 ELSE 0 END) as exact_matches FROM historical_prices WHERE symbol = ?').get('QQQ');
console.log('QQQ open == close check:', qqqCheck);

if (symbols.includes('THB=X')) {
  const thbStats = db.prepare('SELECT min(date) as min_date, max(date) as max_date, count(*) as count FROM historical_prices WHERE symbol = ?').get('THB=X');
  console.log('THB=X stats:', thbStats);
}
