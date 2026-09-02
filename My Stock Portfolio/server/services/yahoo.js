import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

/**
 * Fetch historical prices for a symbol.
 * @param {string} symbol - The stock ticker (e.g. AAPL)
 * @param {string} from - YYYY-MM-DD
 * @param {string} to - YYYY-MM-DD
 * @returns {Promise<Array>} Array of { date, price }
 */
export async function fetchYahooHistorical(symbol, from, to) {
  try {
    const queryOptions = {
      period1: from,
      period2: to,
      interval: '1d'
    };
    
    // yahoo-finance2 chart API returns historical data
    const result = await yahooFinance.chart(symbol, queryOptions);
    
    if (!result || !result.quotes || result.quotes.length === 0) {
      return [];
    }
    
    // Map the result to our expected format, filtering out invalid quotes
    return result.quotes
      .filter(q => q.close !== null && q.close !== undefined)
      .map(q => {
        const date = new Date(q.date).toISOString().split('T')[0];
        return {
          symbol,
          date,
          price: q.close
        };
      });
  } catch (error) {
    console.error(`[Yahoo] Error fetching historical for ${symbol}:`, error.message);
    return [];
  }
}

/**
 * Fetch latest price for a symbol.
 * @param {string} symbol 
 */
export async function fetchYahooLatest(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    return {
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      percent_change: quote.regularMarketChangePercent
    };
  } catch (error) {
    console.error(`[Yahoo] Error fetching latest for ${symbol}:`, error.message);
    return null;
  }
}
