import { db } from '../db/init.js';
import { calcRSI } from '../services/technicalAnalysis.js';

const rows = db.prepare(`
  SELECT date, close 
  FROM historical_prices 
  WHERE symbol = 'NVDA' 
  ORDER BY date ASC
`).all();

console.log(`Total NVDA rows in DB: ${rows.length}`);
const closes = rows.map(r => r.close);

console.log('\n--- Testing MCDX Formulas on Last 10 Daily Bars ---');

for (let i = closes.length - 10; i < closes.length; i++) {
  const slice = closes.slice(0, i + 1);
  const rsi50 = calcRSI(slice, 50);
  const rsi40 = calcRSI(slice, 40);
  const rsi14 = calcRSI(slice, 14);

  // Banker: 1.5 * (RSI(50) - 50)
  let banker = 0;
  if (rsi50 !== null && rsi50 > 50) {
    banker = Math.min(20, Math.max(0, 1.5 * (rsi50 - 50)));
  }

  // Hot Money: 0.7 * (RSI(40) - 30)
  let hotMoney = 0;
  if (rsi40 !== null && rsi40 > 30) {
    hotMoney = Math.min(20, Math.max(0, 0.7 * (rsi40 - 30)));
  }

  // Retail: Green is from hotMoney to 20
  const greenCeiling = 20;
  const greenVisible = Math.max(0, greenCeiling - Math.max(banker, hotMoney));
  const yellowVisible = Math.max(0, hotMoney - banker);
  const redVisible = banker;

  console.log(
    `${rows[i].date} | Close: $${closes[i].toFixed(2)} | RSI50: ${rsi50} -> Banker: ${banker.toFixed(2)} | RSI40: ${rsi40} -> HotMoney: ${hotMoney.toFixed(2)} | Visible [Red: ${redVisible.toFixed(1)}, Yellow: ${yellowVisible.toFixed(1)}, Green: ${greenVisible.toFixed(1)}]`
  );
}
