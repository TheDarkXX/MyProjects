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

/**
 * Fetch real-time exchange rate from Yahoo Finance.
 * e.g. USD to THB -> 'THB=X'
 */
export async function fetchYahooExchangeRate(from = 'USD', to = 'THB') {
  try {
    let symbol = `${to}=X`;
    if (from !== 'USD') {
      symbol = `${from}${to}=X`;
    }
    const quote = await yahooFinance.quote(symbol);
    if (quote && quote.regularMarketPrice) {
      return {
        rate: quote.regularMarketPrice,
        from,
        to,
        date: new Date().toISOString().split('T')[0],
        source: 'yahoo'
      };
    }
  } catch (error) {
    console.error(`[Yahoo] Error fetching exchange rate ${from}->${to}:`, error.message);
  }
/**
 * Fetch sector / category and industry profile for a symbol from Yahoo Finance.
 * Supports both Stocks (assetProfile) and ETFs (fundProfile).
 * @param {string} symbol 
 */
export async function fetchYahooProfile(symbol) {
  if (!symbol || symbol === 'CASH') return { sector: 'Cash / Currency', industry: 'Cash' };
  const upper = symbol.toUpperCase();
  if (upper.includes('BTC') || upper.includes('ETH')) return { sector: 'Cryptocurrency', industry: 'Digital Assets' };
  try {
    const res = await yahooFinance.quoteSummary(upper, { modules: ['assetProfile', 'fundProfile'] });
    const sector = res?.assetProfile?.sector || res?.fundProfile?.categoryName || 'Other';
    const industry = res?.assetProfile?.industry || '';
    return { sector, industry, isFund: !!res?.fundProfile };
  } catch (error) {
    console.error(`[Yahoo] Error fetching profile for ${symbol}:`, error.message);
    return { sector: 'Other', industry: '' };
  }
}


