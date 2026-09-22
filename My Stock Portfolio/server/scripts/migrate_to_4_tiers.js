import Database from '../node_modules/better-sqlite3/lib/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../db/stock.db');
const db = new Database(dbPath);

console.log('[4-Tier Migration] Connecting to DB at:', dbPath);

// Step 1: Default everything to CATALYST for held stocks, WATCHLIST for global stocks
db.prepare(`
  UPDATE news_intelligence
  SET reading_priority = CASE 
    WHEN portfolio_tag = 'global' THEN 'WATCHLIST'
    ELSE 'CATALYST'
  END
`).run();

// Step 2: Mark CHATTER for opinions, analyst ratings, and blogs
const chatterKeywords = [
  '%rating upgrade%', '%rating downgrade%', '%price target%', '%analyst%',
  '%trades at %', '%whoever spends smarter%', '%is the stock a bargain%',
  '%why investors should%', '%rule 10b5-1%', '%insider%', '%opinion%',
  '%motley fool%', '%seeking alpha%'
];

for (const kw of chatterKeywords) {
  db.prepare(`
    UPDATE news_intelligence
    SET reading_priority = 'CHATTER'
    WHERE (headline LIKE ? OR summary_th LIKE ?)
  `).run(kw, kw);
}

// Explicit chatter IDs (known op-eds/rumors)
db.prepare(`
  UPDATE news_intelligence
  SET reading_priority = 'CHATTER'
  WHERE id IN (4, 7, 52, 74, 90, 94)
`).run();

// Step 2.5: Enforce 5D score tiers for all rows that have score_breakdown
const scoredRows = db.prepare(`SELECT id, score_breakdown FROM news_intelligence WHERE score_breakdown IS NOT NULL`).all();
const updateScoreStmt = db.prepare(`UPDATE news_intelligence SET reading_priority = ? WHERE id = ?`);
for (const sr of scoredRows) {
  try {
    const sb = JSON.parse(sr.score_breakdown);
    if (typeof sb.total === 'number') {
      if (sb.total < 40) {
        updateScoreStmt.run('CHATTER', sr.id);
      } else if (sb.total < 60) {
        updateScoreStmt.run('WATCHLIST', sr.id);
      } else if (sb.total < 85) {
        updateScoreStmt.run('CATALYST', sr.id);
      }
    }
  } catch {}
}

// Step 3: Enforce the 6 Red-Alert THE_MUST items (Tier 1)
const mustIds = [18, 21, 24, 58, 87, 92];
db.prepare(`
  UPDATE news_intelligence
  SET reading_priority = 'THE_MUST'
  WHERE id IN (${mustIds.join(',')})
`).run();

// Step 4: Summary by Priority
const counts = db.prepare(`
  SELECT reading_priority, COUNT(*) as cnt 
  FROM news_intelligence 
  GROUP BY reading_priority 
  ORDER BY 
    CASE reading_priority 
      WHEN 'THE_MUST' THEN 1 
      WHEN 'CATALYST' THEN 2 
      WHEN 'WATCHLIST' THEN 3 
      WHEN 'CHATTER' THEN 4 
      ELSE 5 
    END ASC
`).all();

console.log('\n========================================');
console.log('✅ 4-TIER RECLASSIFICATION COMPLETE:');
console.log('========================================');
counts.forEach(c => {
  let icon = '📌';
  if (c.reading_priority === 'THE_MUST') icon = '🚨 Tier 1 - THE MUST:';
  else if (c.reading_priority === 'CATALYST') icon = '⚡ Tier 2 - CATALYSTS:';
  else if (c.reading_priority === 'WATCHLIST') icon = '🌐 Tier 3 - WATCHLIST:';
  else if (c.reading_priority === 'CHATTER') icon = '💬 Tier 4 - CHATTER:';
  console.log(`  ${icon.padEnd(25)} ${c.cnt} articles`);
});

// Print Tier 1 items
const tier1 = db.prepare(`
  SELECT id, ticker, headline_th, priority_reason 
  FROM news_intelligence 
  WHERE reading_priority = 'THE_MUST'
  ORDER BY id DESC
`).all();

console.log('\n--- 🚨 TIER 1 (THE MUST) ITEMS ---');
tier1.forEach(t => console.log(`  [${t.ticker}] #${t.id}: ${t.headline_th}`));

// Print sample Tier 2 items
const tier2 = db.prepare(`
  SELECT id, ticker, headline_th 
  FROM news_intelligence 
  WHERE reading_priority = 'CATALYST'
  ORDER BY id DESC
  LIMIT 5
`).all();

console.log('\n--- ⚡ TIER 2 (CATALYSTS) SAMPLES (Top 5) ---');
tier2.forEach(t => console.log(`  [${t.ticker}] #${t.id}: ${t.headline_th}`));

// Print sample Tier 3 items
const tier3 = db.prepare(`
  SELECT id, ticker, headline_th 
  FROM news_intelligence 
  WHERE reading_priority = 'WATCHLIST'
  ORDER BY id DESC
  LIMIT 5
`).all();

console.log('\n--- 🌐 TIER 3 (WATCHLIST) SAMPLES (Top 5) ---');
tier3.forEach(t => console.log(`  [${t.ticker}] #${t.id}: ${t.headline_th}`));

// Print sample Tier 4 items
const tier4 = db.prepare(`
  SELECT id, ticker, headline_th 
  FROM news_intelligence 
  WHERE reading_priority = 'CHATTER'
  ORDER BY id DESC
  LIMIT 5
`).all();

console.log('\n--- 💬 TIER 4 (CHATTER) SAMPLES (Top 5) ---');
tier4.forEach(t => console.log(`  [${t.ticker}] #${t.id}: ${t.headline_th}`));
