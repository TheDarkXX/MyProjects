import Database from '../node_modules/better-sqlite3/lib/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../db/stock.db');
const db = new Database(dbPath);

console.log('[Reclassify] Connecting to DB at:', dbPath);

// 1. Downgrade non-holding / watchlist stocks (portfolio_tag = 'global') from THE_MUST to GOOD_TO_KNOW
const r1 = db.prepare(`
  UPDATE news_intelligence 
  SET reading_priority = 'GOOD_TO_KNOW',
      priority_reason = 'ข่าวสำคัญของหุ้นใน Watchlist (อยู่นอกพอร์ต)'
  WHERE reading_priority = 'THE_MUST' AND portfolio_tag = 'global'
`).run();

// 2. Downgrade pure valuation opinion pieces and duplicate press conferences
const r2 = db.prepare(`
  UPDATE news_intelligence 
  SET reading_priority = 'GOOD_TO_KNOW',
      priority_reason = 'บทวิเคราะห์มุมมองและเปรียบเทียบมูลค่า (ไม่ใช่ Catalyst ตรงจากบริษัท)'
  WHERE id IN (90, 94, 52)
`).run();

console.log(`[Reclassify] Downgraded global watchlist items: ${r1.changes}`);
console.log(`[Reclassify] Downgraded opinion/duplicate items: ${r2.changes}`);

// 3. Query all remaining THE_MUST items
const remaining = db.prepare(`
  SELECT id, ticker, portfolio_tag, headline, headline_th, priority_reason, relevance_score, sentiment
  FROM news_intelligence 
  WHERE reading_priority = 'THE_MUST'
  ORDER BY id DESC
`).all();

console.log(`\n=== REMAINING THE_MUST ITEMS (${remaining.length}) ===`);
remaining.forEach((item, i) => {
  console.log(`\n#${i+1} [${item.ticker}] (${item.portfolio_tag}) - ID: ${item.id}`);
  console.log(`  TH: ${item.headline_th}`);
  console.log(`  EN: ${item.headline}`);
  console.log(`  Reason: ${item.priority_reason}`);
  console.log(`  Score: ${item.relevance_score} | Sentiment: ${item.sentiment}`);
});
