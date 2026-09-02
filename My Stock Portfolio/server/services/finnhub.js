import { db } from '../db/init.js';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

if (!FINNHUB_API_KEY) {
  console.warn('⚠️ FINNHUB_API_KEY is missing in .env');
}

export async function fetchFinnhubQuote(symbol) {
  try {
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Finnhub error: ${res.statusText}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

export async function updatePricesInCache(symbols) {
  const insertPrice = db.prepare(`
    INSERT OR REPLACE INTO latest_prices (symbol, price, change, percent_change, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  const results = {};
  
  for (const symbol of symbols) {
    // Basic rate limit handling: Finnhub free tier is 60 req/min (1/sec)
    // For small portfolios, we can just fetch sequentially
    const quote = await fetchFinnhubQuote(symbol);
    if (quote && quote.c !== undefined) {
      insertPrice.run(symbol, quote.c, quote.d || 0, quote.dp || 0);
      results[symbol] = {
        price: quote.c,
        change: quote.d || 0,
        percent_change: quote.dp || 0,
        updated_at: new Date().toISOString()
      };
    }
  }
  
  return results;
}
