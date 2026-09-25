import Database from '../node_modules/better-sqlite3/lib/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../db/stock.db');
const db = new Database(dbPath);

console.log('=== DRY-RUN RECLASSIFICATION AUDIT ===');

const rows = db.prepare('SELECT id, ticker, headline, headline_th, reading_priority, priority_reason, summary_th, portfolio_tag FROM news_intelligence ORDER BY id ASC').all();

// Rule definitions
const MUST_IDS = new Set([87, 18, 21, 24, 92, 58]);

const CHATTER_REGEX = /opinion|columnist|motley fool|seeking alpha|trades at \d|is the stock a bargain|whoever spends smarter|why investors should|มหาเศรษฐี|เกลี้ยงพอร์ต|ขายหมดพอร์ต|อัดเงินซื้อ|เซียน|พอร์ตแตก|สลับพอร์ต|13f|jepq|dollar cost averaging|top 5 stocks|top 10 stocks|stocks to buy now|กูรูชี้|ลายแทง|ชี้เป้า|รีบสอย|เปิดโผ|billionaire|whale|rule 10b5-1|insider selling|what moved markets|สรุปภาพรวม|สรุปตลาด|daily wrap|market wrap|roundup/i;

const REASON_CHATTER_REGEX = /ไม่ใช่เหตุการณ์ที่กระทบปัจจัยพื้นฐาน|ไม่มีผลต่อปัจจัยพื้นฐาน|ปรับพอร์ตของนักลงทุนรายหนึ่ง|ไม่กระทบปัจจัยพื้นฐาน|ไม่มีข้อมูลผลประกอบการหรือสัญญาลูกค้าเฉพาะ|ไม่มีข้อมูลพื้นฐาน|ความเห็นเชิงนโยบายการเงิน|ความเห็นจากนักวิเคราะห์|ไม่มีตัวเลขผลประกอบการ/i;

const ANALYST_REGEX = /rating upgrade|rating downgrade|price target|analyst upgrade|initiates coverage|downgrades to|upgrades to|reiterates buy|maintains \$|raises price target|cuts price target|เป้าราคา|ปรับเป้า|คงคำแนะนำซื้อ/i;

const stats = {
  total: rows.length,
  before: {},
  after: {},
  changes: []
};

for (const r of rows) {
  stats.before[r.reading_priority] = (stats.before[r.reading_priority] || 0) + 1;

  const isHolding = r.portfolio_tag !== 'global';
  const headlineCombined = `${r.headline || ''} ${r.headline_th || ''}`;
  const reasonCombined = `${r.priority_reason || ''} ${r.summary_th || ''}`;

  let newPriority = 'CHATTER';

  if (MUST_IDS.has(r.id)) {
    newPriority = 'THE_MUST';
  } else if (CHATTER_REGEX.test(headlineCombined) || REASON_CHATTER_REGEX.test(reasonCombined) || ANALYST_REGEX.test(headlineCombined)) {
    newPriority = 'CHATTER';
  } else if (isHolding) {
    newPriority = 'CATALYST';
  } else {
    newPriority = 'WATCHLIST';
  }

  stats.after[newPriority] = (stats.after[newPriority] || 0) + 1;

  if (r.reading_priority !== newPriority) {
    stats.changes.push({
      id: r.id,
      ticker: r.ticker,
      from: r.reading_priority,
      to: newPriority,
      headline: r.headline_th || r.headline
    });
  }
}

console.log('BEFORE:', JSON.stringify(stats.before, null, 2));
console.log('AFTER :', JSON.stringify(stats.after, null, 2));
console.log(`Total Changed: ${stats.changes.length} of ${stats.total}`);
console.log('\nTop 15 Changes:');
stats.changes.slice(0, 15).forEach(c => {
  console.log(`[#${c.id} ${c.ticker}] ${c.from} -> ${c.to} | ${c.headline.slice(0, 70)}`);
});
