import Database from '../node_modules/better-sqlite3/lib/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../db/stock.db');
const backupPath = path.join(__dirname, '../db/stock.db.bak_1790308475493');

console.log('[Clean & Re-score V2] Connecting to DB at:', dbPath);

// Restore original state before refined run
if (fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, dbPath);
  console.log('[Restore] Restored pristine database from pre-run backup.');
}

const db = new Database(dbPath);

// Exact Core Rules
const THE_MUST_IDS = new Set([87, 18, 21, 24, 92, 58]);

// Known explicit chatter IDs
const EXPLICIT_CHATTER_IDS = new Set([1, 2, 4, 7, 42, 44, 45, 51, 52, 63, 67, 74, 76, 85, 86, 90, 94]);

const CHATTER_HEADLINE_REGEX = /(?:opinion|columnist|motley fool|seeking alpha|trades at \d|is the stock a bargain|whoever spends smarter|why investors should|มหาเศรษฐี|เกลี้ยงพอร์ต|ขายหมดพอร์ต|อัดเงินซื้อ|เซียน|พอร์ตแตก|สลับพอร์ต|13f|jepq|dollar cost averaging|top 5 stocks|top 10 stocks|stocks to buy now|กูรูชี้|ลายแทง|ชี้เป้า|รีบสอย|เปิดโผ|billionaire|whale|rule 10b5-1|insider selling|what moved markets|สรุปภาพรวม|สรุปตลาด|daily wrap|market wrap|roundup|สัญญาณเทคนิค|แนวรับ|แนวต้าน|Cramer|Zacks Rank|DCF|เป้าราคา|อัปเกรดคาดการณ์|ส่วนต่างจำกัด|ลงทุนถัวเฉลี่ย|JEPQ|ไร้ข้อมูลปัจจัยพื้นฐาน)/i;

const CHATTER_REASON_REGEX = /(?:ไม่ใช่เหตุการณ์ที่กระทบปัจจัยพื้นฐาน|ไม่มีผลต่อปัจจัยพื้นฐาน|ปรับพอร์ตของนักลงทุนรายหนึ่ง|ไม่กระทบปัจจัยพื้นฐาน|ไม่มีข้อมูลผลประกอบการหรือสัญญาลูกค้าเฉพาะ|ไม่มีข้อมูลพื้นฐาน|ความเห็นเชิงนโยบายการเงิน|ความเห็นจากนักวิเคราะห์|ความเห็นของนักวิเคราะห์สื่อ|ไม่มีตัวเลขผลประกอบการ|บทวิเคราะห์ทางเทคนิค|มุมมองด้านมูลค่าจากบทวิเคราะห์|ความเคลื่อนไหวส่วนบุคคลของซีอีโอ|ความเห็นด้านมูลค่าและจังหวะขายทำกำไร|ไม่มีเหตุการณ์พื้นฐาน|ไม่มีเหตุการณ์พื้นฐานที่ต้องตัดสินใจลงทุน|ไร้ข้อมูลปัจจัยพื้นฐาน)/i;

const rows = db.prepare('SELECT id, ticker, headline, headline_th, reading_priority, priority_reason, summary_th, portfolio_tag, score_breakdown FROM news_intelligence ORDER BY id ASC').all();

const beforeCounts = {};
const afterCounts = {};
const auditLog = [];

const updateStmt = db.prepare(`
  UPDATE news_intelligence 
  SET reading_priority = ? 
  WHERE id = ?
`);

db.transaction(() => {
  for (const r of rows) {
    beforeCounts[r.reading_priority] = (beforeCounts[r.reading_priority] || 0) + 1;

    const isHolding = r.portfolio_tag !== 'global';
    const headlineCombined = `${r.headline || ''} ${r.headline_th || ''}`;
    const reasonCombined = `${r.priority_reason || ''} ${r.summary_th || ''}`;

    let newPriority = 'CHATTER';

    // 1. Check if row already has calibrated 5D score_breakdown
    let hasValid5D = false;
    let scoreTotal = null;
    if (r.score_breakdown) {
      try {
        const sb = JSON.parse(r.score_breakdown);
        if (typeof sb.total === 'number') {
          hasValid5D = true;
          scoreTotal = sb.total;
        }
      } catch {}
    }

    if (hasValid5D) {
      // Respect 5D Engine Thresholds
      if (THE_MUST_IDS.has(r.id)) {
        newPriority = 'THE_MUST';
      } else if (scoreTotal < 40) {
        newPriority = 'CHATTER';
      } else if (scoreTotal < 60) {
        newPriority = 'WATCHLIST';
      } else if (isHolding) {
        newPriority = (scoreTotal >= 85 && THE_MUST_IDS.has(r.id)) ? 'THE_MUST' : 'CATALYST';
      } else {
        newPriority = 'WATCHLIST';
      }
    } else {
      // Legacy rows (no 5D score yet): Apply Strict Content & Keyword Guard
      if (THE_MUST_IDS.has(r.id)) {
        newPriority = 'THE_MUST';
      } else if (
        EXPLICIT_CHATTER_IDS.has(r.id) ||
        CHATTER_HEADLINE_REGEX.test(headlineCombined) ||
        CHATTER_REASON_REGEX.test(reasonCombined)
      ) {
        newPriority = 'CHATTER';
      } else if (isHolding) {
        newPriority = 'CATALYST';
      } else {
        newPriority = 'WATCHLIST';
      }
    }

    afterCounts[newPriority] = (afterCounts[newPriority] || 0) + 1;

    if (r.reading_priority !== newPriority) {
      updateStmt.run(newPriority, r.id);
      auditLog.push({
        id: r.id,
        ticker: r.ticker,
        from: r.reading_priority,
        to: newPriority,
        headline: r.headline_th || r.headline
      });
    }
  }
})();

console.log('\n======================================================');
console.log('📊 RE-CLASSIFICATION AUDIT RESULT (BEFORE vs AFTER):');
console.log('======================================================');
console.log('BEFORE:', JSON.stringify(beforeCounts, null, 2));
console.log('AFTER :', JSON.stringify(afterCounts, null, 2));
console.log(`\nTotal Modified Articles: ${auditLog.length} / ${rows.length}`);

console.log('\n--- 🧹 FULL LIST OF MOVED ARTICLES ---');
auditLog.forEach((item, idx) => {
  console.log(`${(idx + 1).toString().padStart(2, ' ')}. [#${item.id} ${item.ticker.padEnd(5)}] ${item.from.padEnd(8)} ➔ ${item.to.padEnd(8)} | ${item.headline.slice(0, 58)}`);
});
