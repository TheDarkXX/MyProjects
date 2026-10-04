import Database from 'better-sqlite3';

const db = new Database('db/stock.db', { readonly: true });
const MONTHLY_INFLOW = 1000;
const TRANSACTION_FEE = 0.0015;

// Candidate pool of other non-blueprint stocks with >1500 daily bars
const CANDIDATE_POOL = [
  'AMZN', 'META', 'NFLX', 'COST', 'ISRG', 'GLD', 'SCHD', 'SCHG', 'SPY', 
  'HIMS', 'COIN', 'DOCN', 'CRDO', 'ASTS', 'TWST', 'VKTX'
];

console.log('Loading candles for candidate control pool...');
const poolData = {};
for (const sym of CANDIDATE_POOL) {
  const rows = db.prepare('SELECT date, price FROM historical_prices WHERE symbol = ? ORDER BY date ASC').all(sym);
  if (rows && rows.length > 500) {
    const map = new Map();
    rows.forEach(r => map.set(r.date, r.price));
    poolData[sym] = { rows, map };
  }
}

const activePool = Object.keys(poolData).filter(s => poolData[s].rows.length > 1000);
console.log('Active pool count:', activePool.length, activePool);

const qqqDates = db.prepare("SELECT date FROM historical_prices WHERE symbol = 'QQQ' ORDER BY date ASC").all().map(r => r.date);

function runBasketSim(basket, strategy, startDate = '2019-01-01', endDate = '2026-09-01') {
  const dates = qqqDates.filter(d => d >= startDate && d <= endDate);
  const equalWeight = 1 / basket.length;
  const holdings = {};
  basket.forEach(s => { holdings[s] = 0; });

  let lastMonth = '';
  let totalContributed = 0;

  for (const curDate of dates) {
    const curMonth = curDate.slice(0, 7);
    const activeSymbols = basket.filter(s => poolData[s].map.has(curDate));
    if (activeSymbols.length === 0) continue;

    const normWeight = 1 / activeSymbols.length;

    if (curMonth !== lastMonth) {
      lastMonth = curMonth;
      totalContributed += MONTHLY_INFLOW;
      const netInflow = MONTHLY_INFLOW * (1 - TRANSACTION_FEE);

      if (strategy === 'proportional') {
        activeSymbols.forEach(s => {
          const p = poolData[s].map.get(curDate);
          holdings[s] += (netInflow * normWeight) / p;
        });
      } else if (strategy === 'deficit') {
        let curPortVal = 0;
        const vals = {};
        activeSymbols.forEach(s => {
          const p = poolData[s].map.get(curDate);
          vals[s] = holdings[s] * p;
          curPortVal += vals[s];
        });

        const newTargetTotal = curPortVal + netInflow;
        let totalDeficit = 0;
        const deficits = {};

        activeSymbols.forEach(s => {
          const targetVal = normWeight * newTargetTotal;
          const def = Math.max(0, targetVal - vals[s]);
          deficits[s] = def;
          totalDeficit += def;
        });

        activeSymbols.forEach(s => {
          const p = poolData[s].map.get(curDate);
          let alloc = 0;
          if (totalDeficit > 0) {
            alloc = (deficits[s] / totalDeficit) * netInflow;
          } else {
            alloc = netInflow * normWeight;
          }
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

console.log('\nRunning 30 Random Control Baskets across 5 start dates...');
const startDates = ['2019-01-01', '2020-01-01', '2021-01-01', '2021-11-01', '2022-06-01'];
let deficitWins = 0;
let totalTests = 0;
let totalDeltaMultiple = 0;

for (let bIdx = 0; bIdx < 20; bIdx++) {
  // Shuffle active pool and pick 8 stocks
  const shuffled = [...activePool].sort(() => Math.random() - 0.5);
  const basket = shuffled.slice(0, 8);

  for (const sDate of startDates) {
    const resProp = runBasketSim(basket, 'proportional', sDate);
    const resDef = runBasketSim(basket, 'deficit', sDate);
    totalTests++;
    if (resDef.finalVal > resProp.finalVal) deficitWins++;
    totalDeltaMultiple += (resDef.multiple - resProp.multiple);
  }
}

console.log(`\nControl Group Results (${totalTests} Tests across 20 Random Baskets):`);
console.log(`- Deficit Win Rate vs Proportional: ${((deficitWins / totalTests) * 100).toFixed(1)}%`);
console.log(`- Average Multiple Delta (Deficit - Proportional): +${(totalDeltaMultiple / totalTests).toFixed(3)}x`);
