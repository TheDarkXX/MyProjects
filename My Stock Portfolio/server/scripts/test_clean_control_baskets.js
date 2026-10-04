import Database from 'better-sqlite3';

const db = new Database('db/stock.db', { readonly: true });
const MONTHLY_INFLOW = 1000;
const TRANSACTION_FEE = 0.0015;

// Find all candidate stocks that have full price history from 2016-09-01 (No IPO mid-sim)
const allStocks = db.prepare(`
  SELECT symbol, count(*) as count, min(date) as minDate 
  FROM historical_prices 
  GROUP BY symbol 
  HAVING count >= 2400
`).all();

const fullHistorySymbols = allStocks
  .filter(r => r.minDate <= '2016-09-01' && r.symbol !== 'QQQ' && !r.symbol.includes('=') && !r.symbol.includes('-'))
  .map(r => r.symbol);

console.log(`Found ${fullHistorySymbols.length} candidate stocks with 100% full history from 2016-09-01:`);
console.log(fullHistorySymbols.join(', '));

const poolData = {};
for (const sym of fullHistorySymbols) {
  const rows = db.prepare('SELECT date, price FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(sym);
  const map = new Map();
  rows.forEach(r => map.set(r.date, r.price));
  poolData[sym] = { rows, map };
}

const qqqDates = db.prepare("SELECT date FROM historical_prices WHERE symbol = 'QQQ' ORDER BY date ASC").all().map(r => r.date);

function runCleanBasketSim(basket, strategy, startDate = '2016-09-01', endDate = '2026-09-01') {
  const dates = qqqDates.filter(d => d >= startDate && d <= endDate);
  const equalWeight = 1 / basket.length;
  const holdings = {};
  basket.forEach(s => { holdings[s] = 0; });

  let lastMonth = '';
  let totalContributed = 0;

  for (const curDate of dates) {
    const curMonth = curDate.slice(0, 7);
    if (curMonth !== lastMonth) {
      lastMonth = curMonth;
      totalContributed += MONTHLY_INFLOW;
      const netInflow = MONTHLY_INFLOW * (1 - TRANSACTION_FEE);

      if (strategy === 'proportional') {
        basket.forEach(s => {
          const p = poolData[s].map.get(curDate);
          holdings[s] += (netInflow * equalWeight) / p;
        });
      } else if (strategy === 'deficit') {
        let curPortVal = 0;
        const vals = {};
        basket.forEach(s => {
          const p = poolData[s].map.get(curDate);
          vals[s] = holdings[s] * p;
          curPortVal += vals[s];
        });

        const newTargetTotal = curPortVal + netInflow;
        let totalDeficit = 0;
        const deficits = {};

        basket.forEach(s => {
          const targetVal = equalWeight * newTargetTotal;
          const def = Math.max(0, targetVal - vals[s]);
          deficits[s] = def;
          totalDeficit += def;
        });

        basket.forEach(s => {
          const p = poolData[s].map.get(curDate);
          const alloc = totalDeficit > 0 ? (deficits[s] / totalDeficit) * netInflow : netInflow * equalWeight;
          holdings[s] += alloc / p;
        });
      }
    }
  }

  const lastDate = dates[dates.length - 1];
  let finalVal = 0;
  basket.forEach(s => {
    const p = poolData[s].map.get(lastDate) || 0;
    finalVal += holdings[s] * p;
  });

  return { totalContributed, finalVal, multiple: finalVal / (totalContributed || 1) };
}

// Pseudo-random deterministic generator
function getSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

console.log('\nRunning 50 Random Control Baskets (Full-History Stocks Only) across 5 start dates (250 tests)...');
const startDates = ['2016-09-01', '2018-01-01', '2020-01-01', '2021-11-01', '2023-01-01'];

let deficitWins = 0;
let ties = 0;
let propWins = 0;
let totalTests = 0;
let multDeltaSum = 0;

for (let bIdx = 0; bIdx < 50; bIdx++) {
  const rng = getSeededRandom(1001 + bIdx * 83);
  const shuffled = [...fullHistorySymbols].sort(() => rng() - 0.5);
  const basket = shuffled.slice(0, 8); // 8-stock random baskets

  for (const sDate of startDates) {
    const resProp = runCleanBasketSim(basket, 'proportional', sDate);
    const resDef = runCleanBasketSim(basket, 'deficit', sDate);

    totalTests++;
    const delta = resDef.multiple - resProp.multiple;
    multDeltaSum += delta;

    if (delta > 0.01) deficitWins++;
    else if (Math.abs(delta) <= 0.01) ties++;
    else propWins++;
  }
}

console.log(`\n=============================================================`);
console.log(`📊 CLEAN CONTROL GROUP AUDIT (${totalTests} Tests on Mature Stocks):`);
console.log(`- Deficit Rebalance Beat Proportional: ${deficitWins}/${totalTests} (${((deficitWins/totalTests)*100).toFixed(1)}%)`);
console.log(`- Statistically Tied:                 ${ties}/${totalTests} (${((ties/totalTests)*100).toFixed(1)}%)`);
console.log(`- Proportional Beat Deficit:          ${propWins}/${totalTests} (${((propWins/totalTests)*100).toFixed(1)}%)`);
console.log(`- Average Multiple Delta:             ${multDeltaSum >= 0 ? '+' : ''}${(multDeltaSum/totalTests).toFixed(3)}x`);
console.log(`=============================================================`);
