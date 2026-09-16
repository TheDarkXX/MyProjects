import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../db/stock.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:18810/openai/v1/chat/completions';

async function generateHeadlineTh(ticker, companyName, headline, summaryTh, priority) {
  const systemPrompt = `You are a world-class financial editor writing catchy, punchy Thai stock headlines for Thai investors.
Reply ONLY with the final Thai headline text starting with [${ticker}]. Do not output quotes, backticks, or any markdown formatting.`;

  const userPrompt = `Ticker: [${ticker}] (${companyName})
Priority: ${priority}
Original Headline: "${headline}"
Key Points:
${summaryTh}

Requirements:
1. MUST start with "[${ticker}] "
2. Written in natural, high-impact, professional Thai (10-18 words, max 90 characters).
3. Directly state the catalyst/business event (e.g. คว้าดีล, พุ่งแรง, เสี่ยงโดนฟ้อง, ทุ่มงบ, เลื่อนเปิดตัว, เตือนสติ).
4. No cheap scam clickbait. Accurate, ruthlessly clear.

Example output:
[NVDA] เจรจาลงทุนหมื่นล้านดอลลาร์ใน IPO ของ Anthropic เสริมแกร่งชิป AI`;

  try {
    const res = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.6-terra',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (res.ok) {
      const data = await res.json();
      let text = data.choices?.[0]?.message?.content || data.reply || '';
      text = text.replace(/^["'`]+|["'`]+$/g, '').trim();
      if (!text.startsWith(`[${ticker}]`)) {
        text = `[${ticker}] ${text.replace(/^\[.*?\]\s*/, '')}`;
      }
      if (text.length >= 10) return text;
    }
  } catch (err) {
    console.warn(`[Headline AI] Fallback for ${ticker}:`, err.message);
  }

  // Fallback if AI fails
  return `[${ticker}] ${headline}`;
}

async function main() {
  console.log('================================================================');
  console.log('🔥 CATCHY THAI HEADLINE GENERATOR');
  console.log('================================================================');

  // Ensure column exists
  try {
    db.exec("ALTER TABLE news_intelligence ADD COLUMN headline_th TEXT DEFAULT NULL;");
  } catch {}

  const rows = db.prepare(`
    SELECT id, ticker, company_name, headline, summary_th, reading_priority
    FROM news_intelligence
    WHERE headline_th IS NULL OR headline_th = ''
    ORDER BY created_at DESC
  `).all();

  console.log(`Found ${rows.length} articles needing Catchy Thai Headlines.`);
  if (rows.length === 0) {
    console.log('All articles already have Thai headlines!');
    return;
  }

  const updateStmt = db.prepare('UPDATE news_intelligence SET headline_th = ? WHERE id = ?');

  let count = 0;
  for (const row of rows) {
    const thaiHeadline = await generateHeadlineTh(
      row.ticker,
      row.company_name || row.ticker,
      row.headline,
      row.summary_th || '',
      row.reading_priority || 'GOOD_TO_KNOW'
    );

    updateStmt.run(thaiHeadline, row.id);
    count++;
    console.log(`[${count}/${rows.length}] ${thaiHeadline}`);
    
    // Smooth throttle
    await new Promise(r => setTimeout(r, 200));
  }

  // Commit WAL
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {}

  console.log('\n================================================================');
  console.log(`🎉 Successfully generated ${count} Catchy Thai Headlines!`);
  console.log('================================================================');
}

main().catch(console.error);
