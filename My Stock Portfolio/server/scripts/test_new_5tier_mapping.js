import Database from '../node_modules/better-sqlite3/lib/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../db/stock.db');
const db = new Database(dbPath);

console.log('=== TEST 5-TIER REAL UNIVERSE MAPPING ===');

// 1. Gather Real Target Universe: Project 2X + Held + Blueprints
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
console.log('Target Universe Tickers (Total ' + targetUniverse.size + '):', Array.from(targetUniverse).sort().join(', '));

// 2. Rules
const THE_MUST_IDS = new Set([87, 18, 21, 24, 92, 58]);

const CHATTER_HEADLINE_REGEX = /(?:opinion|columnist|motley fool|seeking alpha|trades at \d|is the stock a bargain|whoever spends smarter|why investors should|มหาเศรษฐี|เกลี้ยงพอร์ต|ขายหมดพอร์ต|อัดเงินซื้อ|เซียน|พอร์ตแตก|สลับพอร์ต|13f|jepq|dollar cost averaging|top 5 stocks|top 10 stocks|stocks to buy now|กูรูชี้|ลายแทง|ชี้เป้า|รีบสอย|เปิดโผ|billionaire|whale|rule 10b5-1|insider selling|what moved markets|สรุปภาพรวม|สรุปตลาด|daily wrap|market wrap|roundup|สัญญาณเทคนิค|แนวรับ|แนวต้าน|Cramer|Zacks Rank|DCF|เป้าราคา|อัปเกรดคาดการณ์|ส่วนต่างจำกัด|ลงทุนถัวเฉลี่ย|JEPQ|ไร้ข้อมูลปัจจัยพื้นฐาน)/i;

const CHATTER_REASON_REGEX = /(?:ไม่ใช่เหตุการณ์ที่กระทบปัจจัยพื้นฐาน|ไม่มีผลต่อปัจจัยพื้นฐาน|ปรับพอร์ตของนักลงทุนรายหนึ่ง|ไม่กระทบปัจจัยพื้นฐาน|ไม่มีข้อมูลผลประกอบการหรือสัญญาลูกค้าเฉพาะ|ไม่มีข้อมูลพื้นฐาน|ความเห็นเชิงนโยบายการเงิน|ความเห็นจากนักวิเคราะห์|ความเห็นของนักวิเคราะห์สื่อ|ไม่มีตัวเลขผลประกอบการ|บทวิเคราะห์ทางเทคนิค|มุมมองด้านมูลค่าจากบทวิเคราะห์|ความเคลื่อนไหวส่วนบุคคลของซีอีโอ|ความเห็นด้านมูลค่าและจังหวะขายทำกำไร|ไม่มีเหตุการณ์พื้นฐาน|ไม่มีเหตุการณ์พื้นฐานที่ต้องตัดสินใจลงทุน|ไร้ข้อมูลปัจจัยพื้นฐาน)/i;

const MAJOR_CATALYST_REGEX = /(?:คว้าดีล|พันล้าน|ดีลใหญ่|สัญญาระยะยาว|รายได้โต|กำไรพุ่ง|งบแกร่ง|ชนะคาด|โตเท่าตัว|ซื้อกิจการ|ควบรวม|ซื้อ Utility|Space Force|AI infrastructure|ชิป AI|Sovereign AI|จับมือ Nvidia|Cloud backlog|งบไตรมาส|ออเดอร์สูงสุดใหม่|ดีลไฟนิวเคลียร์|Leo X-Series|Scorpio|ดีล AI SpaceX)/i;

const rows = db.prepare('SELECT id, ticker, headline, headline_th, reading_priority, priority_reason, summary_th, portfolio_tag, score_breakdown FROM news_intelligence ORDER BY id ASC').all();

const counts = {
  THE_MUST: 0,
  HIGH_IMPACT: 0,
  MACRO: 0,
  GOOD_TO_KNOW: 0,
  CHATTER: 0
};

const categorizedRows = [];

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

  if (THE_MUST_IDS.has(r.id)) {
    finalTier = 'THE_MUST';
  } else if (isMacro) {
    // Macro news
    if (CHATTER_HEADLINE_REGEX.test(headlineCombined) && !/(?:fed|เงินเฟ้อ|ดอกเบี้ย|สงคราม|tariff|gdp)/i.test(headlineCombined)) {
      finalTier = 'CHATTER';
    } else {
      finalTier = 'MACRO';
    }
  } else if (!isTargetStock) {
    // If not in our Project 2X / Portfolio universe, it's external noise -> CHATTER!
    finalTier = 'CHATTER';
  } else if (CHATTER_HEADLINE_REGEX.test(headlineCombined) || CHATTER_REASON_REGEX.test(reasonCombined) || (scoreTotal !== null && scoreTotal < 40)) {
    finalTier = 'CHATTER';
  } else if (MAJOR_CATALYST_REGEX.test(headlineCombined) || (scoreTotal !== null && scoreTotal >= 70)) {
    finalTier = 'HIGH_IMPACT';
  } else {
    finalTier = 'GOOD_TO_KNOW';
  }

  counts[finalTier]++;
  categorizedRows.push({
    id: r.id,
    ticker: r.ticker,
    tier: finalTier,
    headline: r.headline_th || r.headline
  });
}

console.log('\n--- 📊 NEW 5-TIER DISTRIBUTION ---');
console.log(JSON.stringify(counts, null, 2));

console.log('\n--- 🚨 THE MUST SAMPLES ---');
categorizedRows.filter(r => r.tier === 'THE_MUST').forEach(r => console.log(`[#${r.id} ${r.ticker}] ${r.headline.slice(0, 60)}`));

console.log('\n--- ⚡ HIGH IMPACT SAMPLES (Top 8) ---');
categorizedRows.filter(r => r.tier === 'HIGH_IMPACT').slice(0, 8).forEach(r => console.log(`[#${r.id} ${r.ticker}] ${r.headline.slice(0, 60)}`));

console.log('\n--- 🌐 MACRO PULSE SAMPLES ---');
categorizedRows.filter(r => r.tier === 'MACRO').forEach(r => console.log(`[#${r.id} ${r.ticker}] ${r.headline.slice(0, 60)}`));

console.log('\n--- 📘 GOOD TO KNOW SAMPLES (Top 8) ---');
categorizedRows.filter(r => r.tier === 'GOOD_TO_KNOW').slice(0, 8).forEach(r => console.log(`[#${r.id} ${r.ticker}] ${r.headline.slice(0, 60)}`));
