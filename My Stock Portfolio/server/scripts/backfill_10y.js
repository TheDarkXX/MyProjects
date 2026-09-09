import { db } from '../db/init.js';
import { fetchYahooHistorical } from '../services/yahoo.js';

// Project 2X Scope Only: 9 Core + 4 Moonshot
const PROJECT_2X_SYMBOLS = [
  'NVDA', 'TSM', 'AVGO', 'VRT', 'MELI', 'APH', 'KLAC', 'ANET', 'CRWD',
  'STRL', 'ALAB', 'PLTR', 'RKLB'
];

const START_DATE = '2016-09-01'; // 10 years + buffer
const TODAY = new Date().toISOString().split('T')[0];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runBackfill() {
  console.log('='.repeat(60));
  console.log('⚡ PROJECT 2X: 10-YEAR HISTORICAL PRICE BACKFILL');
  console.log(`Target: ${PROJECT_2X_SYMBOLS.length} symbols`);
  console.log(`Period: ${START_DATE} -> ${TODAY}`);
  console.log('='.repeat(60));

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO historical_prices (symbol, date, price, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const results = [];

  for (let i = 0; i < PROJECT_2X_SYMBOLS.length; i++) {
    const symbol = PROJECT_2X_SYMBOLS[i];
    process.stdout.write(`[${i + 1}/${PROJECT_2X_SYMBOLS.length}] Fetching ${symbol.padEnd(5)} (${START_DATE}..${TODAY})... `);

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
      if (i < PROJECT_2X_SYMBOLS.length - 1) {
        await sleep(600);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      results.push({ symbol, count: 0, status: `ERROR: ${err.message}`, minDate: '-', maxDate: '-' });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 DATABASE VERIFICATION (historical_prices)');
  console.log('='.repeat(60));

  const placeholders = PROJECT_2X_SYMBOLS.map(() => '?').join(',');
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
  `).all(...PROJECT_2X_SYMBOLS);

  console.table(stats);

  const totalRows = stats.reduce((acc, row) => acc + row.total_rows, 0);
  const totalNulls = stats.reduce((acc, row) => acc + row.null_ohlcv, 0);

  console.log(`🎯 Total Rows in DB for Project 2X: ${totalRows.toLocaleString()}`);
  console.log(`🛡️ Total Invalid/NULL OHLCV Rows: ${totalNulls} (Must be 0)`);
  console.log('='.repeat(60));

  if (totalNulls === 0 && totalRows > 20000) {
    console.log('🎉 10-YEAR BACKFILL COMPLETED SUCCESSFULLY!');
  } else {
    console.log('⚠️ Backfill finished with warnings. Review table above.');
  }
}

runBackfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error during backfill:', err);
    process.exit(1);
  });
