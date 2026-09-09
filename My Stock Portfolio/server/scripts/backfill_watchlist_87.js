import { db } from '../db/init.js';
import { fetchYahooHistorical } from '../services/yahoo.js';

// All 87 symbols from doctorbank8989 TradingView Watchlist (6 Sections)
const WATCHLIST_87_SYMBOLS = [
  // 1. STOCKS (44)
  'WMT', 'VRT', 'DUOL', 'BKNG', 'ELF', 'KLAC', 'GOOGL', 'UBER', 'UNH', 'SPGI',
  'ASML', 'CEG', 'ETN', 'TSM', 'WM', 'NVO', 'ORLY', 'AAPL', 'APP', 'ELV',
  'CRM', 'GWW', 'KO', 'APH', 'TTD', 'MA', 'ADBE', 'MSFT', 'CAH', 'V',
  'PANW', 'RTX', 'LLY', 'ANET', 'TSLA', 'BRK-B', 'JPM', 'INTC', 'ARM', 'FICO',
  'WFC', 'AMD', 'MRVL', 'NET',

  // 2. STRONG GROWTH (5)
  'SOFI', 'AVGO', 'NVDA', 'PLTR', 'ALAB',

  // 3. SMALL CAP (8)
  'ASTS', 'TWST', 'RKLB', 'VKTX', 'ISRG', 'CRDO', 'JMIA', 'DOCN',

  // 4. WAITING (21)
  'EOSE', 'IREN', 'IONQ', 'CRWV', 'AXON', 'MELI', 'NVTS', 'HIMS', 'GOOG', 'SFM',
  'AMZN', 'TMDX', 'COST', 'RBRK', 'NFLX', 'CRWD', 'STRL', 'NBIS', 'OKLO', 'ORCL', 'META',

  // 5. EXCHANGE & MACRO (6)
  'SCHD', 'SCHG', '^GSPC', 'QQQ', 'JEPQ', 'THB=X',

  // 6. COMMODITIES & CRYPTO (3)
  'BTC-USD', 'GC=F', 'CL=F'
];

// 10 years + buffer
const START_DATE = '2016-01-01';
const TODAY = new Date().toISOString().split('T')[0];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runWatchlistBackfill() {
  console.log('='.repeat(70));
  console.log('⚡ TRADINGVIEW WATCHLIST: 10-YEAR HISTORICAL PRICE BACKFILL (87 SYMBOLS)');
  console.log(`Target: ${WATCHLIST_87_SYMBOLS.length} symbols`);
  console.log(`Period: ${START_DATE} -> ${TODAY}`);
  console.log('='.repeat(70));

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO historical_prices (symbol, date, price, open, high, low, close, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const results = [];
  let totalRowsInserted = 0;

  for (let i = 0; i < WATCHLIST_87_SYMBOLS.length; i++) {
    const symbol = WATCHLIST_87_SYMBOLS[i];
    process.stdout.write(`[${i + 1}/${WATCHLIST_87_SYMBOLS.length}] Fetching ${symbol.padEnd(8)} (${START_DATE}..${TODAY})... `);

    try {
      const startTime = Date.now();
      const quotes = await fetchYahooHistorical(symbol, START_DATE, TODAY);
      const elapsedMs = Date.now() - startTime;

      if (!quotes || quotes.length === 0) {
        console.log(`⚠️ No quotes returned (${elapsedMs}ms)`);
        results.push({ symbol, count: 0, status: 'NO_DATA', minDate: '-', maxDate: '-' });
        await sleep(400);
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
      totalRowsInserted += quotes.length;

      const minDate = quotes[0]?.date || '-';
      const maxDate = quotes[quotes.length - 1]?.date || '-';
      console.log(`✅ ${quotes.length} bars (${minDate}..${maxDate}) in ${elapsedMs}ms`);
      results.push({ symbol, count: quotes.length, status: 'OK', minDate, maxDate });
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      results.push({ symbol, count: 0, status: `ERR: ${err.message.slice(0, 30)}`, minDate: '-', maxDate: '-' });
    }

    // Rate-limit safety: 600ms between requests
    await sleep(600);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`🎯 BACKFILL SUMMARY: ${totalRowsInserted.toLocaleString()} total historical bars saved`);
  console.log('='.repeat(70));
}

runWatchlistBackfill().catch((err) => {
  console.error('Fatal backfill error:', err);
  process.exit(1);
});
