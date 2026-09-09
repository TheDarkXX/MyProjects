import { db } from '../db/init.js';
import { calcRSI } from '../services/technicalAnalysis.js';

// Aggregate into weekly candles
const rows = db.prepare(`
  SELECT date, close 
  FROM historical_prices 
  WHERE symbol = 'NVDA' 
  ORDER BY date ASC
`).all();

const weeklyCloses = [];
let currentWeek = null;
let lastCloseInWeek = null;

for (const r of rows) {
  const d = new Date(r.date);
  // Get ISO week number
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
  const weekKey = `${d.getFullYear()}-W${weekNum}`;

  if (currentWeek !== weekKey) {
    if (lastCloseInWeek !== null) {
      weeklyCloses.push(lastCloseInWeek);
    }
    currentWeek = weekKey;
  }
  lastCloseInWeek = r.close;
}
if (lastCloseInWeek !== null) weeklyCloses.push(lastCloseInWeek);

console.log(`Total NVDA Weekly bars: ${weeklyCloses.length}`);

console.log('\n--- Weekly MCDX Calculation (Image 1 comparison) ---');
for (let i = weeklyCloses.length - 5; i < weeklyCloses.length; i++) {
  const slice = weeklyCloses.slice(0, i + 1);
  const rsi50 = calcRSI(slice, 50);
  const rsi40 = calcRSI(slice, 40);

  let banker = 0;
  if (rsi50 !== null && rsi50 > 50) {
    banker = Math.min(20, Math.max(0, 1.5 * (rsi50 - 50)));
  }

  let hotMoney = 0;
  if (rsi40 !== null && rsi40 > 30) {
    hotMoney = Math.min(20, Math.max(0, 0.7 * (rsi40 - 30)));
  }

  const greenVisible = Math.max(0, 20 - Math.max(banker, hotMoney));
  const yellowVisible = Math.max(0, hotMoney - banker);
  const redVisible = banker;

  console.log(
    `Weekly Bar ${i} | Close: $${weeklyCloses[i].toFixed(2)} | Weekly RSI50: ${rsi50} -> Banker: ${banker.toFixed(2)} | RSI40: ${rsi40} -> HotMoney: ${hotMoney.toFixed(2)} | Visible [Red: ${redVisible.toFixed(1)}, Yellow: ${yellowVisible.toFixed(1)}, Green: ${greenVisible.toFixed(1)}]`
  );
}
