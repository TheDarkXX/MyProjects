import { db } from '../db/init.js';
import { fetchYahooHistorical } from '../services/yahoo.js';

// Target: Benchmarks + Active Holdings + Past Holdings + Blueprints
const TARGET_SYMBOLS = [
  // Benchmarks & Refs
  'SPY', 'QQQ', 'SCHG', 'GLD', 'BTC-USD',
  // Active Portfolio Holdings
  'META', 'HIMS',
  // Past & Other Portfolio Holdings
  'AMZN', 'COST', 'ISRG', 'ASTS', 'CRWV', 'SE', 'SMCI', 'O'
];

const START_DATE = '1927-01-01'; // Max Lifetime (All-Time back to IPO / 1927)
const TODAY = new Date().toISOString().split('T')[0];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runBackfill() {
  console.log('='.repeat(65));
  console.log('⚡ MAX LIFETIME HISTORICAL PRICE BACKFILL: PORTFOLIO & REFERENCES');
  console.log(`Target: ${TARGET_SYMBOLS.length} symbols: ${TARGET_SYMBOLS.join(', ')}`);
  console.log(`Period: ${START_DATE} (IPO) -> ${TODAY}`);
  console.log('='.repeat(65));

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO historical_prices (symbol, date, price, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const results = [];

  for (let i = 0; i < TARGET_SYMBOLS.length; i++) {
    const symbol = TARGET_SYMBOLS[i];
    process.stdout.write(`[${i + 1}/${TARGET_SYMBOLS.length}] Fetching ${symbol.padEnd(8)} (${START_DATE}..${TODAY})... `);

    try {
      const startTime = Date.now();
      const quotes = await fetchYahooHistorical(symbol, START_DATE, TODAY);
      const elapsedMs = Date.now() - startTime;

      if (!quotes || quotes.length === 0) {
        console.log(`⚠️ No quotes returned (${elapsedMs}ms)`);
        results.push({ symbol, count: 0, status: 'NO_DATA', minDate: '-', maxDate: '-' });
        continue;
      }

      // Batch insert inside a transaction for performance & integrity
      const insertTx = db.transaction((rows) => {
        for (const r of rows) {
          insertStmt.run(
            r.symbol,
            r.date,
            r.price,
            r.open ?? r.price,
            r.high ?? r.price,
            r.low ?? r.price,
            r.close ?? r.price,
            r.volume ?? 0
          );
        }
      });

      insertTx(quotes);

      const minDate = quotes[0]?.date || '-';
      const maxDate = quotes[quotes.length - 1]?.date || '-';
      console.log(`✅ ${quotes.length} bars [${minDate} -> ${maxDate}] (${elapsedMs}ms)`);

      results.push({
        symbol,
        count: quotes.length,
        status: 'SUCCESS',
        minDate,
        maxDate
      });

      // Pacing to avoid Yahoo rate limits (600ms)
      if (i < TARGET_SYMBOLS.length - 1) {
        await sleep(600);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      results.push({ symbol, count: 0, status: `ERROR: ${err.message}`, minDate: '-', maxDate: '-' });
    }
  }

  console.log('\n' + '='.repeat(65));
  console.log('📊 DATABASE VERIFICATION (historical_prices)');
  console.log('='.repeat(65));

  const placeholders = TARGET_SYMBOLS.map(() => '?').join(',');
  const stats = db.prepare(`
    SELECT 
      symbol,
      COUNT(*) as total_rows,
      MIN(date) as oldest_date,
      MAX(date) as newest_date,
      SUM(CASE WHEN open IS NULL OR high IS NULL THEN 1 ELSE 0 END) as null_ohlcv
    FROM historical_prices
    WHERE symbol IN (${placeholders})
    GROUP BY symbol
    ORDER BY total_rows DESC
  `).all(...TARGET_SYMBOLS);

  console.table(stats);

  const totalRows = stats.reduce((acc, row) => acc + row.total_rows, 0);
  const totalNulls = stats.reduce((acc, row) => acc + row.null_ohlcv, 0);

  console.log(`🎯 Total Rows in DB for this Batch: ${totalRows.toLocaleString()}`);
  console.log(`🛡️ Total Invalid/NULL OHLCV Rows: ${totalNulls} (Must be 0)`);
  console.log('='.repeat(65));
}

runBackfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error during backfill:', err);
    process.exit(1);
  });
