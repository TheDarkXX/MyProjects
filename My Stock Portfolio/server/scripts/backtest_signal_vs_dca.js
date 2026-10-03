import { db } from '../db/init.js';
import { 
  calcEMASeries, 
  calcRSISeries, 
  calcMcdxSeries 
} from '../services/technicalAnalysis.js';
import { classifyScenario } from '../services/project2xEngine.js';

console.log('='.repeat(90));
console.log('🔥 PROJECT 2X: BACKTEST ENGINE — SIGNAL SNIPER (BUY_NOW) vs BLIND MONTHLY DCA');
console.log('='.repeat(90));
console.log('Testing Universe: Core & Moonshot stocks (10-Year Historical Daily Bars 2016–2026)\n');

const STOCKS = [
  { symbol: 'NVDA', category: 'Core' },
  { symbol: 'TSM', category: 'Core' },
  { symbol: 'AVGO', category: 'Core' },
  { symbol: 'VRT', category: 'Core' },
  { symbol: 'APH', category: 'Core' },
  { symbol: 'ANET', category: 'Core' },
  { symbol: 'KLAC', category: 'Core' },
  { symbol: 'MELI', category: 'Core' },
  { symbol: 'CRWD', category: 'Core' },
  { symbol: 'STRL', category: 'Moonshot' },
  { symbol: 'PLTR', category: 'Moonshot' },
  { symbol: 'CLS', category: 'Moonshot' },
  { symbol: 'QQQ', category: 'Benchmark' }
];

const HORIZONS = [
  { label: '6M (126d)', days: 126 },
  { label: '1Y (252d)', days: 252 },
  { label: '2Y (504d)', days: 504 },
  { label: '3Y (756d)', days: 756 }
];

function runBacktestForSymbol(symbol, category) {
  const candles = db.prepare(`
    SELECT date, price, open, high, low, close, volume 
    FROM historical_prices 
    WHERE symbol = ? 
    ORDER BY date ASC
  `).all(symbol);

  if (!candles || candles.length < 300) {
    console.log(`[SKIP] ${symbol}: Insufficient historical data (${candles?.length || 0} bars)`);
    return null;
  }

  const closes = candles.map(c => c.price ?? c.close);
  const opens = candles.map(c => c.open ?? c.price ?? c.close);
  const highs = candles.map(c => c.high ?? c.price ?? c.close);
  const lows = candles.map(c => c.low ?? c.price ?? c.close);
  const volumes = candles.map(c => c.volume ?? 0);
  const dates = candles.map(c => c.date);
  const n = closes.length;

  // Precompute full series
  const ema9Series = calcEMASeries(closes, 9);
  const ema50Series = calcEMASeries(closes, 50);
  const ema150Series = calcEMASeries(closes, 150);
  const ema200Series = calcEMASeries(closes, 200);
  const rsi14Series = calcRSISeries(closes, 14);
  const mcdxData = calcMcdxSeries(closes);
  const bankerArr = mcdxData.banker || [];

  const signalEntries = [];
  const dcaEntries = [];

  let lastDcaMonth = '';

  // Start after day 220 so all EMAs and indicators are fully seeded
  for (let idx = 220; idx < n; idx++) {
    const curDate = dates[idx];
    const curPrice = closes[idx];
    const curMonth = curDate.substring(0, 7);

    // Monthly DCA Trigger (1st trading day of each month)
    if (curMonth !== lastDcaMonth) {
      dcaEntries.push({ idx, date: curDate, price: curPrice });
      lastDcaMonth = curMonth;
    }

    const ema9 = ema9Series[idx];
    const ema50 = ema50Series[idx];
    const ema150 = ema150Series[idx];
    const ema200 = ema200Series[idx];
    if (!ema200 || !ema150 || !ema50) continue;

    const banker = bankerArr[idx] ?? 0;
    const rsi14 = rsi14Series[idx] ?? 50;

    const distEma9 = ema9 ? Number((((curPrice - ema9) / ema9) * 100).toFixed(2)) : 0;
    const distEma50 = Number((((curPrice - ema50) / ema50) * 100).toFixed(2));
    const distEma150 = Number((((curPrice - ema150) / ema150) * 100).toFixed(2));
    const distEma200 = Number((((curPrice - ema200) / ema200) * 100).toFixed(2));
    const isAboveEma9 = curPrice >= (ema9 || 0);

    const isBullRegime = (ema50 > ema150 && ema150 > ema200);
    const isNeutralRegime = (ema50 > ema200 && !isBullRegime);
    const regime = isBullRegime ? 'BULL' : (isNeutralRegime ? 'NEUTRAL' : 'BEAR');

    // Vol ratio 20d
    let volSum = 0;
    for (let v = Math.max(0, idx - 20); v < idx; v++) volSum += volumes[v];
    const avg20dVol = volSum / 20;
    const volRatio = avg20dVol > 0 ? Number((volumes[idx] / avg20dVol).toFixed(2)) : 1.0;

    // Candle
    const isLatestBullish = curPrice >= opens[idx];
    let consecutiveRedBars = 0;
    for (let r = idx; r >= Math.max(0, idx - 10); r--) {
      if (closes[r] < opens[r]) consecutiveRedBars++;
      else break;
    }

    // Days near / below EMA200
    const nearLowerBound = regime !== 'BEAR' ? -5.0 : -3.5;
    let daysNearEma200 = 0;
    for (let d = idx; d >= Math.max(0, idx - 30); d--) {
      const e2 = ema200Series[d];
      if (!e2) break;
      const dist = ((closes[d] - e2) / e2) * 100;
      if (dist >= nearLowerBound && dist <= 3.5) daysNearEma200++;
      else break;
    }

    let daysBelowEma200 = 0;
    for (let d = idx; d >= Math.max(0, idx - 30); d--) {
      const e2 = ema200Series[d];
      if (!e2 || closes[d] >= e2) break;
      daysBelowEma200++;
    }

    let daysBankerZero = 0;
    for (let d = idx; d >= Math.max(0, idx - 30); d--) {
      if (bankerArr[d] === 0) daysBankerZero++;
      else break;
    }

    // Patterns
    let isBearTrapReclaimed = false;
    if (distEma200 >= 0 && isLatestBullish) {
      for (let b = idx - 1; b >= Math.max(0, idx - 6); b--) {
        const e2 = ema200Series[b];
        if (e2 && ((closes[b] - e2) / e2) * 100 < -4.0) {
          isBearTrapReclaimed = true;
          break;
        }
      }
    }

    let isDoubleBottomConfirmed = false;
    if (distEma200 >= -3.5 && distEma200 <= 2.5 && isLatestBullish) {
      let earlierTouchIndex = -1;
      for (let b = idx - 5; b >= Math.max(0, idx - 45); b--) {
        const e2 = ema200Series[b];
        if (e2) {
          const dist = ((closes[b] - e2) / e2) * 100;
          if (dist >= -4.0 && dist <= 3.0) {
            earlierTouchIndex = b;
            break;
          }
        }
      }
      if (earlierTouchIndex > 0) {
        const earlierLow = lows[earlierTouchIndex];
        const currentLow = lows[idx];
        if (currentLow >= earlierLow * 0.985) {
          isDoubleBottomConfirmed = true;
        }
      }
    }

    let isBaseBreakout = false;
    if (isLatestBullish && volRatio >= 1.4 && idx >= 12) {
      const baseHighs = highs.slice(idx - 10, idx - 2);
      const baseLows = lows.slice(idx - 10, idx - 2);
      const maxBaseHigh = Math.max(...baseHighs);
      const minBaseLow = Math.min(...baseLows);
      const baseSpread = minBaseLow > 0 ? (maxBaseHigh - minBaseLow) / minBaseLow : 1;
      if (baseSpread < 0.08 && curPrice > maxBaseHigh && banker >= 3 && rsi14 >= 50 && rsi14 <= 74) {
        isBaseBreakout = true;
      }
    }

    let isRegimeFlip = false;
    if (idx >= 10 && ema50Series[idx] && ema200Series[idx]) {
      const isNowAbove = ema50Series[idx] >= ema200Series[idx];
      const wasBelow = (ema50Series[idx - 5] || 0) < (ema200Series[idx - 5] || 0);
      if (isNowAbove && wasBelow && curPrice > ema50 && curPrice > ema200) {
        isRegimeFlip = true;
      }
    }

    const classification = classifyScenario({
      currentPrice: curPrice,
      ema9,
      ema50,
      ema150,
      ema200,
      distEma9,
      distEma50,
      distEma150,
      distEma200,
      banker,
      rsi14,
      isAboveEma9,
      hasRsiDivergence: false,
      isLatestBullish,
      consecutiveRedBars,
      volRatio,
      regime,
      daysNearEma200,
      daysBelowEma200,
      daysBankerZero,
      isBearTrapReclaimed,
      isDoubleBottomConfirmed,
      isBaseBreakout,
      isRegimeFlip,
      ownedShares: 0,
      category
    });

    if (classification.traffic_light === 'BUY_NOW') {
      // Avoid spamming consecutive days (cooldown 5 days)
      const lastEntry = signalEntries[signalEntries.length - 1];
      if (!lastEntry || (idx - lastEntry.idx) >= 5) {
        signalEntries.push({
          idx,
          date: curDate,
          price: curPrice,
          scenario: classification.scenario,
          badge: classification.badge
        });
      }
    }
  }

  // Calculate Forward Returns for both Signal Entries and DCA Entries
  function calcStats(entries) {
    const stats = {};
    for (const h of HORIZONS) {
      const returns = [];
      let wins = 0;
      let maxDDs = [];

      for (const e of entries) {
        const exitIdx = e.idx + h.days;
        if (exitIdx < n) {
          const exitPrice = closes[exitIdx];
          const ret = ((exitPrice - e.price) / e.price) * 100;
          returns.push(ret);
          if (ret > 0) wins++;

          // Calc Max Drawdown during the holding period
          let minPrice = e.price;
          for (let k = e.idx; k <= exitIdx; k++) {
            if (lows[k] < minPrice) minPrice = lows[k];
          }
          const dd = ((minPrice - e.price) / e.price) * 100;
          maxDDs.push(dd);
        }
      }

      if (returns.length > 0) {
        const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
        const avgDD = maxDDs.reduce((a, b) => a + b, 0) / maxDDs.length;
        const winRate = (wins / returns.length) * 100;
        stats[h.label] = {
          samples: returns.length,
          avgReturn: Number(avg.toFixed(1)),
          winRate: Number(winRate.toFixed(1)),
          avgDrawdown: Number(avgDD.toFixed(1))
        };
      } else {
        stats[h.label] = null;
      }
    }
    return stats;
  }

  return {
    symbol,
    category,
    totalBars: n,
    signalCount: signalEntries.length,
    dcaCount: dcaEntries.length,
    signalStats: calcStats(signalEntries),
    dcaStats: calcStats(dcaEntries)
  };
}

const allResults = [];
for (const s of STOCKS) {
  const res = runBacktestForSymbol(s.symbol, s.category);
  if (res) allResults.push(res);
}

console.log('\n' + '='.repeat(90));
console.log('📊 RESULTS SUMMARY: SIGNAL (BUY_NOW) vs MONTHLY DCA ACROSS ALL HORIZONS');
console.log('='.repeat(90));

const summaryTable = [];
let totalAlpha1Y = 0;
let totalAlpha3Y = 0;
let count1Y = 0;
let count3Y = 0;

for (const r of allResults) {
  const sig1Y = r.signalStats['1Y (252d)'];
  const dca1Y = r.dcaStats['1Y (252d)'];
  const sig3Y = r.signalStats['3Y (756d)'];
  const dca3Y = r.dcaStats['3Y (756d)'];

  const alpha1Y = (sig1Y && dca1Y) ? Number((sig1Y.avgReturn - dca1Y.avgReturn).toFixed(1)) : 'N/A';
  const alpha3Y = (sig3Y && dca3Y) ? Number((sig3Y.avgReturn - dca3Y.avgReturn).toFixed(1)) : 'N/A';

  if (typeof alpha1Y === 'number') {
    totalAlpha1Y += alpha1Y;
    count1Y++;
  }
  if (typeof alpha3Y === 'number') {
    totalAlpha3Y += alpha3Y;
    count3Y++;
  }

  summaryTable.push({
    Symbol: r.symbol,
    Category: r.category,
    'Signal Triggers': r.signalCount,
    'DCA Months': r.dcaCount,
    '1Y Signal Ret': sig1Y ? `+${sig1Y.avgReturn}% (${sig1Y.winRate}% win)` : 'N/A',
    '1Y DCA Ret': dca1Y ? `+${dca1Y.avgReturn}% (${dca1Y.winRate}% win)` : 'N/A',
    '1Y Alpha': typeof alpha1Y === 'number' ? (alpha1Y >= 0 ? `+${alpha1Y}% 🟢` : `${alpha1Y}% 🔴`) : 'N/A',
    '3Y Signal Ret': sig3Y ? `+${sig3Y.avgReturn}%` : 'N/A',
    '3Y DCA Ret': dca3Y ? `+${dca3Y.avgReturn}%` : 'N/A',
    '3Y Alpha': typeof alpha3Y === 'number' ? (alpha3Y >= 0 ? `+${alpha3Y}% 🟢` : `${alpha3Y}% 🔴`) : 'N/A'
  });
}

console.table(summaryTable);

const avgAlpha1Y = count1Y > 0 ? (totalAlpha1Y / count1Y).toFixed(1) : 0;
const avgAlpha3Y = count3Y > 0 ? (totalAlpha3Y / count3Y).toFixed(1) : 0;

console.log('\n' + '='.repeat(90));
console.log(`🎯 MACRO VERDICT:`);
console.log(`- Average 1-Year Alpha (Signal vs DCA): ${avgAlpha1Y >= 0 ? '+' + avgAlpha1Y : avgAlpha1Y}% per year`);
console.log(`- Average 3-Year Alpha (Signal vs DCA): ${avgAlpha3Y >= 0 ? '+' + avgAlpha3Y : avgAlpha3Y}% over 3-year holding cycle`);
console.log('='.repeat(90));
