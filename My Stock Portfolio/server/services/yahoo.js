import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
  return null;
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

/**
 * Fetch dividend information from Yahoo Finance.
 * @param {string} symbol
 */
export async function fetchYahooDividend(symbol) {
  if (!symbol || symbol === 'CASH') return { dividendYield: 0, annualDividend: 0 };
  const upper = symbol.toUpperCase();
  try {
    const res = await yahooFinance.quoteSummary(upper, { modules: ['summaryDetail'] }).catch(() => null);
    const detail = res?.summaryDetail || {};
    
    let divYield = detail.dividendYield || detail.trailingAnnualDividendYield || detail.yield || 0;
    let annualDiv = detail.dividendRate || detail.trailingAnnualDividendRate || 0;
    
    // For ETFs or fund quotes where annual dividend rate is 0 but yield is given
    if (annualDiv === 0 && divYield > 0) {
      const price = detail.previousClose || detail.navPrice || detail.regularMarketOpen || 0;
      if (price > 0) {
        annualDiv = Number((divYield * price).toFixed(2));
      }
    }

    // If still 0, fallback to quote
    if (annualDiv === 0 && divYield === 0) {
      const q = await yahooFinance.quote(upper).catch(() => null);
      if (q) {
        annualDiv = q.dividendRate || q.trailingAnnualDividendRate || 0;
        let qYield = q.dividendYield || q.trailingAnnualDividendYield || q.yield || 0;
        if (qYield > 1) qYield = qYield / 100;
        if (divYield === 0) divYield = qYield;
        if (annualDiv === 0 && divYield > 0 && q.regularMarketPrice) {
          annualDiv = Number((divYield * q.regularMarketPrice).toFixed(2));
        }
      }
    }

    // Normalize yield to decimal ratio (e.g. 0.035 for 3.5%)
    if (divYield > 1) {
      divYield = divYield / 100;
    }

    return {
      dividendYield: Number(divYield.toFixed(6)),
      annualDividend: Number(annualDiv.toFixed(4))
    };
  } catch (error) {
    console.error(`[Yahoo] Error fetching dividend for ${symbol}:`, error.message);
  }
  return { dividendYield: 0, annualDividend: 0 };
}
