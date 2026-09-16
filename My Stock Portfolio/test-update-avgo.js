import { db, initDb } from './server/db/init.js';
import { rescoreArticle } from './server/services/newsRadar.js';

async function run() {
  console.log("🛠️ Initializing DB (running migrations)...");
  initDb();
  
  console.log("🔍 Searching for AVGO article...");
  // Let's also check if there's any article with headline that matches the old paywall one
  const row = db.prepare(`SELECT id, headline, headline_th FROM news_intelligence WHERE ticker = 'AVGO' AND reading_priority = 'CHATTER' ORDER BY id DESC LIMIT 1`).get();
  
  if (row) {
    console.log(`✅ Found AVGO Article ID: ${row.id}`);
    console.log(`   Original Headline: ${row.headline}`);
    console.log(`   Thai Headline: ${row.headline_th}`);
    console.log(`\n🚀 Triggering rescoreArticle(${row.id})...`);
    
    try {
      const result = await rescoreArticle(row.id);
      console.log(`\n🎉 Rescore Complete!`);
      console.log(`   New Thai Headline: ${result.headline_th}`);
      console.log(`   New Priority: ${result.reading_priority}`);
      console.log(`   New 5D Score: ${result.total_score}`);
    } catch (err) {
      console.error(`❌ Rescore failed:`, err);
    }
  } else {
    console.log("❌ AVGO article not found.");
  }
}

run();
