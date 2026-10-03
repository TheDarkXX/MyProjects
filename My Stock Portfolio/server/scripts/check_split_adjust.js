import { db } from '../db/init.js';

const q = db.prepare(`SELECT date, price, close, open FROM historical_prices WHERE symbol = ? AND date BETWEEN ? AND ? ORDER BY date`);
console.log('NVDA split 2024-06-10 (10:1):', q.all('NVDA', '2024-06-05', '2024-06-12'));
console.log('NVDA split 2021-07-20 (4:1):', q.all('NVDA', '2021-07-15', '2021-07-22'));
console.log('AVGO split 2024-07-15 (10:1):', q.all('AVGO', '2024-07-10', '2024-07-17'));

// Max single-day absolute move per symbol (detects unadjusted splits)
for (const s of ['NVDA','TSM','AVGO','VRT','APH','ANET','KLAC','MELI','CRWD','STRL','PLTR','CLS','QQQ']) {
  const rows = db.prepare(`SELECT date, price FROM historical_prices WHERE symbol = ? ORDER BY date`).all(s);
  let worst = { r: 0 };
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i].price / rows[i - 1].price - 1;
    if (Math.abs(r) > Math.abs(worst.r)) worst = { r, date: rows[i].date };
  }
  console.log(s, 'bars', rows.length, 'first', rows[0].date, 'max 1-day move', (worst.r * 100).toFixed(1) + '%', worst.date);
}
