import { db, initDb } from '../db/init.js';
import { updatePricesInCache } from './finnhub.js';
import { fetchYahooExchangeRate, fetchYahooLatest } from './yahoo.js';

initDb();

export async function calculatePortfolioNavAndReturns(portfolioId) {
  const port = db.prepare('SELECT * FROM portfolios WHERE id = ?').get(portfolioId);
  if (!port) throw new Error('Portfolio not found: ' + portfolioId);

  // 1. Get all transactions
  const txs = db.prepare(`
    SELECT id, portfolio_id, date, symbol, type, asset, amount, price, fee, status 
    FROM transactions 
    WHERE portfolio_id = ? AND (status IS NULL OR status != 'CANCELLED')
    ORDER BY date ASC
  `).all(portfolioId);

  // 2. Identify all symbols
  const activeSymbolsSet = new Set();
  txs.forEach(t => {
    if (t.symbol && t.symbol !== 'CASH' && t.asset !== 'Cash') {
      activeSymbolsSet.add(t.symbol.toUpperCase());
    }
  });
  const allSymbols = Array.from(activeSymbolsSet);

  // 3. Ensure latest Friday close prices are updated in cache
  const hasFinnhubKey = Boolean(process.env.FINNHUB_API_KEY && !process.env.FINNHUB_API_KEY.includes('missing'));
  if (hasFinnhubKey && allSymbols.length > 0) {
    try {
      await updatePricesInCache([...allSymbols, 'SPY']);
    } catch (err) {}
  } else {
    // Direct Yahoo Finance Fetch for 100% reliable Friday close
    for (const sym of allSymbols) {
      try {
        const q = await fetchYahooLatest(sym);
        if (q && q.price) {
          db.prepare(`
            INSERT INTO latest_prices (symbol, price, change, percent_change, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(symbol) DO UPDATE SET price = excluded.price, change = excluded.change, percent_change = excluded.percent_change, updated_at = datetime('now')
          `).run(sym, q.price, q.change || 0, q.percent_change || 0);
        }
      } catch (e) {}
    }
  }

  // 4. Get FX rate
  let fxRate = 33.53;
  try {
    const fx = await fetchYahooExchangeRate('USD', 'THB');
    if (fx && fx.rate) fxRate = fx.rate;
  } catch (e) {}

  // 5. Current holdings, cash, and Net Invested
  let cash = port.initial_cash || 0;
  let netInvested = 0;
  let grossInvested = 0;
  let totalDividends = 0;
  const holds = {};

  for (const t of txs) {
    const amount = Number(t.amount) || 0;
    const price = Number(t.price) || 0;
    const fee = Number(t.fee) || 0;
    const isCash = t.asset === 'Cash' || t.symbol === 'CASH';

    if (t.type === 'BUY') {
      if (isCash) {
        cash += amount;
        netInvested += amount;
        grossInvested += amount;
      } else {
        cash -= (amount * price) + fee;
        if (!holds[t.symbol]) holds[t.symbol] = 0;
        holds[t.symbol] += amount;
      }
    } else if (t.type === 'SELL') {
      if (isCash) {
        cash -= amount;
        netInvested -= amount;
      } else {
        cash += (amount * price) - fee;
        if (!holds[t.symbol]) holds[t.symbol] = 0;
        holds[t.symbol] -= amount;
      }
    } else if (t.type === 'DEPOSIT') {
      cash += amount;
      netInvested += amount;
      grossInvested += amount;
    } else if (t.type === 'WITHDRAW') {
      cash -= amount;
      netInvested -= amount;
    } else if (t.type === 'DIVIDEND' || t.type === 'INTEREST') {
      cash += (amount - fee);
      totalDividends += (amount - fee);
    }
  }

  // Fetch current market prices for held symbols from latest_prices
  const latestPriceRows = db.prepare(`SELECT symbol, price FROM latest_prices WHERE symbol IN (${allSymbols.map(() => '?').join(',')})`).all(...allSymbols);
  const priceMap = {};
  latestPriceRows.forEach(r => { priceMap[r.symbol] = r.price; });

  let totalSecuritiesValue = 0;
  for (const sym in holds) {
    if (holds[sym] > 0.0001) {
      const p = priceMap[sym] || 0;
      totalSecuritiesValue += holds[sym] * p;
    }
  }

  const totalNetWorth = cash + totalSecuritiesValue;
  const totalPnl = totalNetWorth - netInvested;
  const investedBase = (grossInvested > 0 && netInvested < grossInvested * 0.5)
    ? grossInvested
    : (netInvested > 0 ? netInvested : grossInvested);
  const totalPnlPercent = investedBase > 0 ? (totalPnl / investedBase) * 100 : 0;

  // 6. Build Daily Points for GIPS Daily Time-Weighted Return (TWR)
  const histRows = db.prepare(`
    SELECT symbol, date, close as price 
    FROM historical_prices 
    WHERE symbol IN (${allSymbols.map(() => '?').join(',')})
    ORDER BY date ASC
  `).all(...allSymbols);

  const histMap = {};
  const dateSet = new Set();
  histRows.forEach(r => {
    if (!histMap[r.symbol]) histMap[r.symbol] = {};
    histMap[r.symbol][r.date] = r.price;
    dateSet.add(r.date);
  });

  const sortedDates = Array.from(dateSet).sort();
  const earliestTxDate = txs.length > 0 ? txs[0].date.split('T')[0] : sortedDates[0];
  const validDates = sortedDates.filter(d => !earliestTxDate || d >= earliestTxDate);

  const lastKnownPrices = {};
  const allDailyPoints = validDates.map((date, idx) => {
    let dailyCash = port.initial_cash || 0;
    const dailyHolds = {};

    for (const tx of txs) {
      const eodTarget = new Date(date);
      eodTarget.setHours(23, 59, 59, 999);
      if (new Date(tx.date).getTime() > eodTarget.getTime()) break;

      const isCash = tx.asset === 'Cash' || tx.symbol === 'CASH';
      const amount = Number(tx.amount) || 0;
      const price = Number(tx.price) || 0;
      const fee = Number(tx.fee) || 0;

      if (tx.type === 'BUY') {
        if (isCash) dailyCash += amount;
        else {
          dailyCash -= (amount * price) + fee;
          dailyHolds[tx.symbol] = (dailyHolds[tx.symbol] || 0) + amount;
        }
      } else if (tx.type === 'SELL') {
        if (isCash) dailyCash -= amount;
        else {
          dailyCash += (amount * price) - fee;
          dailyHolds[tx.symbol] = (dailyHolds[tx.symbol] || 0) - amount;
        }
      } else if (tx.type === 'DEPOSIT') {
        dailyCash += amount;
      } else if (tx.type === 'WITHDRAW') {
        dailyCash -= amount;
      } else if (tx.type === 'DIVIDEND' || tx.type === 'INTEREST') {
        dailyCash += (amount - fee);
      }
    }

    let dailyStockValue = 0;
    allSymbols.forEach(sym => {
      if (histMap[sym]?.[date] !== undefined) {
        lastKnownPrices[sym] = histMap[sym][date];
      }
      // On the latest bar, update with latest closing price if available
      if (idx === validDates.length - 1 && priceMap[sym]) {
        lastKnownPrices[sym] = priceMap[sym];
      }
      if (lastKnownPrices[sym] && dailyHolds[sym]) {
        dailyStockValue += dailyHolds[sym] * lastKnownPrices[sym];
      }
    });

    return {
      date,
      value: dailyCash + dailyStockValue
    };
  });

  const lastTradingDate = sortedDates[sortedDates.length - 1];

  // 7. Calculate GIPS TWR for period
  function calcTwrForRange(startDate, endDate = lastTradingDate) {
    const pts = allDailyPoints.filter(p => p.date >= startDate && p.date <= endDate);
    if (pts.length < 2) return 0;

    let cumTwr = 1.0;
    let validDays = 0;

    for (let i = 1; i < pts.length; i++) {
      const prevVal = pts[i - 1].value;
      const currVal = pts[i].value;
      const currDate = pts[i].date;

      let dayCf = 0;
      for (const tx of txs) {
        if (tx.date.split('T')[0] === currDate) {
          const isCash = tx.asset === 'Cash' || tx.symbol === 'CASH';
          const type = (tx.type || '').toUpperCase();
          const amount = Number(tx.amount) || 0;
          if (type === 'DEPOSIT' || (type === 'BUY' && isCash)) {
            dayCf += amount;
          } else if (type === 'WITHDRAW' || (type === 'SELL' && isCash)) {
            dayCf -= amount;
          }
        }
      }

      if (prevVal >= 10.0) {
        const dayReturn = (currVal - dayCf - prevVal) / prevVal;
        if (isFinite(dayReturn) && dayReturn > -0.99 && dayReturn < 3.0) {
          cumTwr *= (1 + dayReturn);
          validDays++;
        }
      }
    }

    if (validDays > 0) {
      return (cumTwr - 1) * 100;
    }
    return 0;
  }

  // Compute 1W, 1M, YTD, ALL
  const now = new Date();
  const d1w = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const d1m = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const dYtd = `${now.getFullYear()}-01-01`;

  const twr1w = calcTwrForRange(d1w);
  const twr1m = calcTwrForRange(d1m);
  const twrYtd = calcTwrForRange(dYtd);
  const twrAll = calcTwrForRange(earliestTxDate);

  const fmtPct = (val) => {
    if (!isFinite(val)) return '+0.0%';
    return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
  };

  return {
    totalNetWorthUsd: Number(totalNetWorth.toFixed(2)),
    totalNetWorthThb: Math.round(totalNetWorth * fxRate),
    netInvestedUsd: Number(netInvested.toFixed(2)),
    netInvestedThb: Math.round(netInvested * fxRate),
    totalPnlUsd: Number(totalPnl.toFixed(2)),
    totalPnlThb: Math.round(totalPnl * fxRate),
    totalPnlPercent: Number(totalPnlPercent.toFixed(1)),
    allTimeTwrPercent: Number(twrAll.toFixed(1)),
    cashUsd: Number(cash.toFixed(2)),
    cashThb: Math.round(cash * fxRate),
    fxRate,
    twr: {
      '1W': fmtPct(twr1w),
      '1M': fmtPct(twr1m),
      'YTD': fmtPct(twrYtd),
      'ALL': fmtPct(twrAll)
    },
    rawTwr: {
      '1W': twr1w,
      '1M': twr1m,
      'YTD': twrYtd,
      'ALL': twrAll
    }
  };
}

// CLI runner
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server/services/portfolioMetrics.js')) {
  (async () => {
    const port = db.prepare("SELECT * FROM portfolios WHERE name LIKE '%Doctorbank%'").get();
    const res = await calculatePortfolioNavAndReturns(port.id);
    console.log("=== Portfolio Metrics Result ===");
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  })();
}
