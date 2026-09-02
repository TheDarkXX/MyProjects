const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const POLYGON_BASE_URL = 'https://api.polygon.io';

if (!POLYGON_API_KEY) {
  console.warn('⚠️ POLYGON_API_KEY is missing in .env');
}

// Polygon free tier: 5 calls / minute => we need to queue or rate limit
// For simple usage, we just expose a fetcher. In production with many users, we'd need a queue.
let lastCallTime = 0;
const DELAY_MS = 13000; // 13s between calls for free tier (5/min = 12s)

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchPolygonHistorical(symbol, multiplier, timespan, from, to) {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < DELAY_MS) {
    await wait(DELAY_MS - elapsed);
  }
  
  try {
    const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&apiKey=${POLYGON_API_KEY}`;
    lastCallTime = Date.now(); // update after wait
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Polygon error: ${res.statusText}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Error fetching historical for ${symbol}:`, error);
    return null;
  }
}

export async function fetchPolygonExchangeRate(fromCurrency, toCurrency, date) {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < DELAY_MS) {
    await wait(DELAY_MS - elapsed);
  }

  try {
    const url = `${POLYGON_BASE_URL}/v1/conversion/${fromCurrency}/${toCurrency}?amount=1&date=${date}&apiKey=${POLYGON_API_KEY}`;
    lastCallTime = Date.now();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Polygon exchange error: ${res.statusText}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(`Error fetching exchange rate ${fromCurrency}->${toCurrency}:`, error);
    return null;
  }
}
