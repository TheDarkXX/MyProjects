import Database from '../node_modules/better-sqlite3/lib/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../db/stock.db');
const backupPath = path.join(__dirname, '../db/stock.db.bak_5tier_' + Date.now());

console.log('[5-Tier Migration] Connecting to DB at:', dbPath);

// Safe backup
fs.copyFileSync(dbPath, backupPath);
console.log(`[Backup] Created safe backup at: ${backupPath}`);

const db = new Database(dbPath);

// 1. Gather Real Target Universe: Project 2X + Current Holdings + Blueprints
const project2xRows = db.prepare('SELECT DISTINCT symbol FROM project2x_share_quotas').all();
const project2xSet = new Set(project2xRows.map(r => r.symbol.toUpperCase()));

const heldRows = db.prepare(`
  SELECT symbol, SUM(CASE WHEN type='BUY' THEN amount WHEN type='SELL' THEN -amount ELSE 0 END) as shares
  FROM transactions GROUP BY symbol HAVING shares > 0.001
`).all();
const heldSet = new Set(heldRows.map(r => r.symbol.toUpperCase()));

const blueprintRows = db.prepare('SELECT DISTINCT symbol FROM portfolio_blueprints').all();
const blueprintSet = new Set(blueprintRows.map(r => r.symbol.toUpperCase()));

const targetUniverse = new Set([...project2xSet, ...heldSet, ...blueprintSet]);
console.log(`[Target Universe] Active 2X/Port Tickers (${targetUniverse.size}):`, Array.from(targetUniverse).sort().join(', '));

// 2. Rules
const THE_MUST_IDS = new Set([87, 18, 21, 24, 92, 58]);

const CHATTER_HEADLINE_REGEX = /(?:opinion|columnist|motley fool|seeking alpha|trades at \d|is the stock a bargain|whoever spends smarter|why investors should|มหาเศรษฐี|เกลี้ยงพอร์ต|ขายหมดพอร์ต|อัดเงินซื้อ|เซียน|พอร์ตแตก|สลับพอร์ต|13f|jepq|dollar cost averaging|top 5 stocks|top 10 stocks|stocks to buy now|กูรูชี้|ลายแทง|ชี้เป้า|รีบสอย|เปิดโผ|billionaire|whale|rule 10b5-1|insider selling|what moved markets|สรุปภาพรวม|สรุปตลาด|daily wrap|market wrap|roundup|สัญญาณเทคนิค|แนวรับ|แนวต้าน|Cramer|Zacks Rank|DCF|เป้าราคา|อัปเกรดคาดการณ์|ส่วนต่างจำกัด|ลงทุนถัวเฉลี่ย|JEPQ|ไร้ข้อมูลปัจจัยพื้นฐาน)/i;

const CHATTER_REASON_REGEX = /(?:ไม่ใช่เหตุการณ์ที่กระทบปัจจัยพื้นฐาน|ไม่มีผลต่อปัจจัยพื้นฐาน|ปรับพอร์ตของนักลงทุนรายหนึ่ง|ไม่กระทบปัจจัยพื้นฐาน|ไม่มีข้อมูลผลประกอบการหรือสัญญาลูกค้าเฉพาะ|ไม่มีข้อมูลพื้นฐาน|ความเห็นเชิงนโยบายการเงิน|ความเห็นจากนักวิเคราะห์|ความเห็นของนักวิเคราะห์สื่อ|ไม่มีตัวเลขผลประกอบการ|บทวิเคราะห์ทางเทคนิค|มุมมองด้านมูลค่าจากบทวิเคราะห์|ความเคลื่อนไหวส่วนบุคคลของซีอีโอ|ความเห็นด้านมูลค่าและจังหวะขายทำกำไร|ไม่มีเหตุการณ์พื้นฐาน|ไม่มีเหตุการณ์พื้นฐานที่ต้องตัดสินใจลงทุน|ไร้ข้อมูลปัจจัยพื้นฐาน)/i;

const MAJOR_CATALYST_REGEX = /(?:คว้าดีล|พันล้าน|ดีลใหญ่|สัญญาระยะยาว|รายได้โต|กำไรพุ่ง|งบแกร่ง|ชนะคาด|โตเท่าตัว|ซื้อกิจการ|ควบรวม|ซื้อ Utility|Space Force|AI infrastructure|ชิป AI|Sovereign AI|จับมือ Nvidia|Cloud backlog|งบไตรมาส|ออเดอร์สูงสุดใหม่|ดีลไฟนิวเคลียร์|Leo X-Series|Scorpio|ดีล AI SpaceX|ทุ่ม 265 พันล้าน|IPO Anthropic|ARR แตะ)/i;

const rows = db.prepare('SELECT id, ticker, headline, headline_th, reading_priority, priority_reason, summary_th, portfolio_tag, score_breakdown FROM news_intelligence ORDER BY id ASC').all();

const updateStmt = db.prepare(`
  UPDATE news_intelligence 
  SET reading_priority = ?, portfolio_tag = ?
  WHERE id = ?
`);

const stats = {
  THE_MUST: 0,
  HIGH_IMPACT: 0,
  MACRO: 0,
  GOOD_TO_KNOW: 0,
  CHATTER: 0
};

db.transaction(() => {
  for (const r of rows) {
    const tickerUpper = (r.ticker || '').toUpperCase();
    const isTargetStock = targetUniverse.has(tickerUpper);
    const isMacro = tickerUpper === 'MACRO' || tickerUpper === 'MARKET';

    const headlineCombined = `${r.headline || ''} ${r.headline_th || ''}`;
    const reasonCombined = `${r.priority_reason || ''} ${r.summary_th || ''}`;

    let scoreTotal = null;
    if (r.score_breakdown) {
      try {
        const sb = JSON.parse(r.score_breakdown);
        if (typeof sb.total === 'number') scoreTotal = sb.total;
      } catch {}
    }

    let finalTier = 'CHATTER';
    let newPortTag = r.portfolio_tag;

    if (THE_MUST_IDS.has(r.id)) {
      finalTier = 'THE_MUST';
      if (newPortTag === 'global') newPortTag = 'main';
    } else if (isMacro) {
      newPortTag = 'macro';
      if (CHATTER_HEADLINE_REGEX.test(headlineCombined) && !/(?:fed|เงินเฟ้อ|ดอกเบี้ย|สงคราม|tariff|gdp)/i.test(headlineCombined)) {
        finalTier = 'CHATTER';
      } else {
        finalTier = 'MACRO';
      }
    } else if (!isTargetStock) {
      // Stock outside our Project 2X / Portfolio universe -> CHATTER
      newPortTag = 'global';
      finalTier = 'CHATTER';
    } else {
      // In Project 2X / Portfolio universe
      if (newPortTag === 'global') {
        newPortTag = 'project2x';
      }

      if (CHATTER_HEADLINE_REGEX.test(headlineCombined) || CHATTER_REASON_REGEX.test(reasonCombined) || (scoreTotal !== null && scoreTotal < 40)) {
        finalTier = 'CHATTER';
      } else if (MAJOR_CATALYST_REGEX.test(headlineCombined) || (scoreTotal !== null && scoreTotal >= 70)) {
        finalTier = 'HIGH_IMPACT';
      } else {
        finalTier = 'GOOD_TO_KNOW';
      }
    }

    stats[finalTier]++;
    updateStmt.run(finalTier, newPortTag, r.id);
  }
})();

console.log('\n======================================================');
console.log('✅ 5-TIER REAL UNIVERSE RECLASSIFICATION COMPLETE:');
console.log('======================================================');
console.log(JSON.stringify(stats, null, 2));
