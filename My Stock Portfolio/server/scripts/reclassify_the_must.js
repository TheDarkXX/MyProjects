import Database from '../node_modules/better-sqlite3/lib/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../db/stock.db');
const db = new Database(dbPath);

console.log('[Reclassify-Extreme] Connecting to DB at:', dbPath);

// Step 1: Downgrade everything from THE_MUST to GOOD_TO_KNOW first
// Except the true RED-ALERT THESIS ALTERING catalysts:
// 1. RKLB (id 87): ATM 1.944B Dilution & Iridium deal
// 2. HIMS (id 18): FTC Complaint & investor lawsuits (Regulatory existential threat)
// 3. HIMS (id 21): Q2 margin collapse despite sales growth (Margin/profitability thesis breakdown)
// 4. MELI (id 24): Mercado Pago credit card risk vs Brazil household debt (NPL / credit contagion)
// 5. GOOGL (id 92): Senate proposed AI Kill Switch (Frontier model regulatory ban risk)
// 6. VRT (id 58): 35% organic growth steep guide in 2H (High execution hurdle / cliff risk)

const keepTheMustIds = [87, 18, 21, 24, 92, 58];

const downgrade = db.prepare(`
  UPDATE news_intelligence
  SET reading_priority = 'GOOD_TO_KNOW'
  WHERE reading_priority = 'THE_MUST' AND id NOT IN (${keepTheMustIds.join(',')})
`).run();

// Ensure the 6 critical ones are explicitly marked THE_MUST
const ensureMust = db.prepare(`
  UPDATE news_intelligence
  SET reading_priority = 'THE_MUST'
  WHERE id IN (${keepTheMustIds.join(',')})
`).run();

console.log(`[Reclassify-Extreme] Downgraded non-thesis items: ${downgrade.changes}`);
console.log(`[Reclassify-Extreme] Verified core THE_MUST items: ${ensureMust.changes}`);

// Fetch and display the final Elite THE_MUST items
const finalMust = db.prepare(`
  SELECT id, ticker, portfolio_tag, headline, headline_th, priority_reason, relevance_score, sentiment
  FROM news_intelligence 
  WHERE reading_priority = 'THE_MUST'
  ORDER BY id DESC
`).all();

console.log(`\n======================================================`);
console.log(`🔥 FINAL ELITE THE_MUST ITEMS: ${finalMust.length} ARTICLES ONLY 🔥`);
console.log(`(Strict Standard: Has Direct Impact on Holding/Selling/Trimming Decision)`);
console.log(`======================================================`);

finalMust.forEach((item, i) => {
  console.log(`\n#${i+1} [${item.ticker}] (${item.portfolio_tag.toUpperCase()}) - ID: ${item.id}`);
  console.log(`  TH: ${item.headline_th}`);
  console.log(`  EN: ${item.headline}`);
  console.log(`  Core Holding Impact: ${item.priority_reason}`);
  console.log(`  Score: ${item.relevance_score} | Sentiment: ${item.sentiment}`);
});
