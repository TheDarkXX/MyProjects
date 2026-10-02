import { db } from '../db/init.js';
import { getPortfolioHoldings } from './newsRadar.js';
import { sendLineMessage } from './lineNotifier.js';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:18810/openai/v1/chat/completions';
const BRAIN_GATEWAY_URL = process.env.BRAIN_GATEWAY_URL || 'https://brain.doctorbankonline.com/api/ai/chat';
const BRAIN_GATEWAY_TOKEN = process.env.BRAIN_GATEWAY_TOKEN || 'ZIvyWp4BTqcX2Gm1aDHR7lwz0i8PrVqug5KWBX53wqI';

/**
 * Format a date range into Thai string (e.g., 25 ก.ย. - 02 ต.ค. 2026)
 */
function formatDateRange(startDateStr, endDateStr) {
  const d1 = new Date(startDateStr);
  const d2 = new Date(endDateStr);
  const opt = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' };
  const s1 = d1.toLocaleDateString('th-TH', opt);
  const s2 = d2.toLocaleDateString('th-TH', opt);
  return `${s1} — ${s2}`;
}

/**
 * Generate AI News Digest for specified lookback days
 * @param {Object} options
 * @param {number} options.days - Lookback days (default: 7)
 * @param {'weekly'|'ondemand'} options.type - Digest type (default: 'ondemand')
 * @param {boolean} options.force - Force regenerate even if dedup matches
 * @param {boolean} options.notifyLine - Whether to send LINE push notification
 */
export async function generateNewsDigest({ days = 7, type = 'ondemand', force = false, notifyLine = false } = {}) {
  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(now.getTime() - days * 24 * 3600 * 1000).toISOString();

  // 1. Dedup Guard: If weekly and not forced, check if generated today
  if (type === 'weekly' && !force) {
    const todayBangkok = new Date(now.getTime() + 7 * 3600000).toISOString().split('T')[0];
    const existing = db.prepare(`
      SELECT * FROM news_digests 
      WHERE digest_type = 'weekly' 
        AND date(created_at, '+7 hours') = ?
      ORDER BY id DESC LIMIT 1
    `).get(todayBangkok);

    if (existing) {
      console.log(`[NewsDigest] 🛡️ Dedup Guard: Weekly digest already exists for ${todayBangkok} (ID: ${existing.id})`);
      return {
        success: true,
        digest: {
          ...existing,
          tickers_covered: JSON.parse(existing.tickers_covered || '[]'),
          source_article_ids: JSON.parse(existing.source_article_ids || '[]')
        },
        dedupHit: true
      };
    }
  }

  // 2. Portfolio context
  const portfolioInfo = getPortfolioHoldings();
  const myHoldings = Array.from(portfolioInfo.mainHoldings || []);
  const tigerHoldings = Array.from(portfolioInfo.tigerHoldings || []);
  const allHoldings = Array.from(new Set([...myHoldings, ...tigerHoldings]));

  // 3. Query high-signal news articles
  // Prioritize THE_MUST, HIGH_IMPACT, MACRO, and high relevance scores. Exclude pure CHATTER.
  const rawArticles = db.prepare(`
    SELECT id, ticker, company_name, headline, headline_th, summary_th, sentiment, 
           reading_priority, priority_reason, impact_level, portfolio_tag, relevance_score, created_at
    FROM news_intelligence
    WHERE created_at >= ?
      AND reading_priority != 'CHATTER'
    ORDER BY 
      CASE reading_priority 
        WHEN 'THE_MUST' THEN 1 
        WHEN 'HIGH_IMPACT' THEN 2 
        WHEN 'MACRO' THEN 3 
        WHEN 'GOOD_TO_KNOW' THEN 4 
        ELSE 5 
      END ASC,
      relevance_score DESC,
      id DESC
    LIMIT 40
  `).all(periodStart);

  if (!rawArticles || rawArticles.length === 0) {
    console.log(`[NewsDigest] ⚠️ No articles found between ${periodStart} and ${periodEnd}`);
    return {
      success: false,
      message: `ไม่พบข่าวสารคุณภาพสูงในช่วง ${days} วันที่ผ่านมา`,
      articleCount: 0
    };
  }

  // 4. Token Budget Guard: Filter & compress articles (max 30 items)
  const selectedArticles = rawArticles.slice(0, 30);
  const sourceArticleIds = selectedArticles.map(a => a.id);
  const tickersCovered = Array.from(new Set(selectedArticles.map(a => a.ticker.toUpperCase())));

  // Mark which tickers are in user's portfolio
  const articleListText = selectedArticles.map((a, idx) => {
    const isHolding = allHoldings.includes(a.ticker.toUpperCase()) ? ' [PORTFOLIO HOLDING]' : '';
    const cleanSummary = (a.summary_th || '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .slice(0, 2)
      .join(' ');

    return `${idx + 1}. [#${a.id}] [${a.ticker}]${isHolding} (${a.reading_priority}, ${a.sentiment})\n   - หัวข้อ: ${a.headline_th || a.headline}\n   - สรุปย่อ: ${cleanSummary || '-'}`;
  }).join('\n\n');

  const rangeTitle = formatDateRange(periodStart, periodEnd);
  const digestTitle = type === 'weekly' 
    ? `Weekly Market & Portfolio Brief (${rangeTitle})`
    : `AI Market Catch-up (${days} วัน: ${rangeTitle})`;

  // 5. Build AI Prompts
  const systemPrompt = `คุณคือ Chief Investment Officer (CIO) & Senior Portfolio Strategist ส่วนตัว
หน้าที่ของคุณคือ สังเคราะห์และกลั่นกรองข่าวกรองตลาดหุ้นต่างประเทศรอบ ${days} วันที่ผ่านมา ให้เป็น "Executive Briefing" ที่เฉียบคม ทรงคุณค่า ตัดเสียงรบกวนทิ้งทั้งหมด

กฎเหล็กในการสรุป:
1. ภาษาไทยกระชับ คมกริบ ระดับผู้จัดการกองทุนมืออาชีพ (ตรงประเด็น ไม่อารัมภบท ไม่ใช้น้ำ ไม่แปลกูเกิลตรงๆ)
2. โฟกัสเข้มข้นที่ "ผลกระทบต่อพื้นฐานกิจการและ Valuation" ไม่ใช่แค่รายงานการเคลื่อนไหวของราคาฉาบฉวย
3. พอร์ตหลักของผู้ใช้ถือหุ้น: [${allHoldings.join(', ')}] ให้ความสำคัญสูงสุดกับหุ้นกลุ่มนี้
4. รูปแบบโครงสร้าง Output ต้องเป็น Plain Markdown (ห้ามใช้ LaTeX หรือ $$ เด็ดขาด) แบ่ง 4 หมวดชัดเจน:
   - ## 🌍 1. Macro Pulse & Regime Shift (ภาพรวมเศรษฐกิจและนโยบายการเงิน)
     • สรุป 2-4 ประเด็นมาโครใหญ่ (Fed, ดอกเบี้ย, จีน, สภาพคล่อง, น้ำมัน, นโยบาย) ที่ส่งผลต่อกระแสตลาด
   - ## 🎯 2. Portfolio Deep-Dive (เจาะลึกหุ้นและสินทรัพย์ในพอร์ต)
     • ชี้ชัดสถานะหุ้นที่ถืออยู่ (${allHoldings.join(', ')}) ทุกตัวที่มีข่าว ระบุ [$TICKER] กำกับเสมอ
   - ## 🧭 3. Signal vs Noise (จุดเปลี่ยนสำคัญ vs สัญญาณลวง)
     • ชี้ว่าข่าวไหนคือของจริงที่กระทบ Moat/Earning และข่าวไหนเป็นแค่ FUD/Sentiment ชั่วคราว
   - ## ⏰ 4. Upcoming Catalysts & Strategy (ปัจจัยจับตาและแผนรับมือ)
     • กำหนดการสำคัญสัปดาห์ถัดไป (Earnings, ข้อมูลเศรษฐกิจ) และข้อควรระวัง`;

  const userPrompt = `ข่าวกรองที่คัดเลือกมาแล้วรอบ ${days} วันล่าสุด (${selectedArticles.length} ข่าว):\n\n${articleListText}\n\nกรุณาสังเคราะห์เป็น Executive Briefing ตามโครงสร้าง 4 หมวดทันที`;

  let rawMarkdown = '';
  let aiError = null;

  // 6. Dual-Fallback AI Gateway Call (25s timeout)
  try {
    console.log(`[NewsDigest] 🧠 Calling Primary AI Gateway (gpt-5.6-terra) for ${selectedArticles.length} articles...`);
    let res = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.6-terra',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
      signal: AbortSignal.timeout(25000)
    }).catch(err => {
      console.warn('[NewsDigest] Primary gateway error/timeout:', err.message);
      return null;
    });

    if (res && res.ok) {
      const data = await res.json();
      rawMarkdown = data.choices?.[0]?.message?.content || data.reply || '';
    } else {
      console.log('[NewsDigest] 🔄 Fallback to Brain Gateway...');
      const fbRes = await fetch(BRAIN_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BRAIN_GATEWAY_TOKEN}`
        },
        body: JSON.stringify({
          model: 'gpt-5.6-terra',
          context: systemPrompt,
          message: userPrompt
        }),
        signal: AbortSignal.timeout(25000)
      }).catch(err => {
        console.warn('[NewsDigest] Brain gateway error/timeout:', err.message);
        return null;
      });

      if (fbRes && fbRes.ok) {
        const fbData = await fbRes.json();
        rawMarkdown = fbData.reply || fbData.choices?.[0]?.message?.content || '';
      }
    }
  } catch (err) {
    aiError = err.message;
    console.error('[NewsDigest] ❌ AI Generation failed:', err.message);
  }

  // 7. Graceful Degradation: If AI failed completely, build structured fallback from top articles
  if (!rawMarkdown || rawMarkdown.trim().length === 0) {
    console.warn('[NewsDigest] ⚠️ Falling back to rule-based structured briefing...');
    rawMarkdown = buildFallbackMarkdown(selectedArticles, allHoldings, rangeTitle, days);
  }

  // 8. Extract High-Level Sections for DB columns
  const macroSummary = extractSection(rawMarkdown, '1. Macro Pulse', '2. Portfolio Deep-Dive');
  const portfolioSummary = extractSection(rawMarkdown, '2. Portfolio Deep-Dive', '3. Signal vs Noise');
  const actionableNotes = extractSection(rawMarkdown, '4. Upcoming Catalysts', null);

  // 9. Save into Database
  const insertStmt = db.prepare(`
    INSERT INTO news_digests (
      digest_type, period_start, period_end, title, 
      macro_summary_th, portfolio_summary_th, actionable_notes_th, 
      raw_markdown, tickers_covered, source_article_ids, article_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = insertStmt.run(
    type,
    periodStart,
    periodEnd,
    digestTitle,
    macroSummary || null,
    portfolioSummary || null,
    actionableNotes || null,
    rawMarkdown,
    JSON.stringify(tickersCovered),
    JSON.stringify(sourceArticleIds),
    selectedArticles.length
  );

  const savedDigest = {
    id: info.lastInsertRowid,
    digest_type: type,
    period_start: periodStart,
    period_end: periodEnd,
    title: digestTitle,
    raw_markdown: rawMarkdown,
    tickers_covered: tickersCovered,
    source_article_ids: sourceArticleIds,
    article_count: selectedArticles.length,
    created_at: new Date().toISOString()
  };

  console.log(`[NewsDigest] ✅ Digest saved successfully! (ID: ${savedDigest.id}, Type: ${type}, Articles: ${selectedArticles.length})`);

  // 10. Send LINE notification if requested or weekly cron
  if (notifyLine || type === 'weekly') {
    try {
      await sendLineDigestNotification(savedDigest, allHoldings);
    } catch (lineErr) {
      console.warn('[NewsDigest] ⚠️ LINE push failed:', lineErr.message);
    }
  }

  return {
    success: true,
    digest: savedDigest,
    aiError: aiError || null
  };
}

/**
 * Format and send LINE push message for digest
 */
export async function sendLineDigestNotification(digest, holdings = []) {
  const title = digest.title || '⚡ AI Weekly Market Brief';
  const tickers = (digest.tickers_covered || []).slice(0, 8).join(', ');
  
  // Extract top highlights from markdown
  const lines = digest.raw_markdown.split('\n');
  const bullets = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if ((trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) && trimmed.length > 15) {
      bullets.push(trimmed.replace(/^[-*•]\s*/, ''));
      if (bullets.length >= 4) break;
    }
  }

  const bulletText = bullets.length > 0 
    ? bullets.map(b => `• ${b}`).join('\n') 
    : '• มีการประมวลผลข่าวกรองการลงทุนครบถ้วนทุกมิติ';

  const webUrl = 'https://stock.doctorbankonline.com/news';

  const message = [
    `📰 ${title}`,
    `━━━━━━━━━━━━━━━━━━`,
    `🎯 หุ้นที่ครอบคลุม: ${tickers || 'NVDA, CRWD, RBRK, MELI, SCHG'}`,
    `📊 ข่าวกรองที่คัดกรอง: ${digest.article_count} รายการ`,
    ``,
    `⚡ ไฮไลท์สำคัญประจำสัปดาห์:`,
    bulletText,
    ``,
    `🔗 อ่านสรุปฉบับเต็มและกลยุทธ์:`,
    webUrl
  ].join('\n');

  console.log(`[NewsDigest] 📲 Sending Weekly Digest to LINE...`);
  return await sendLineMessage(message);
}

/**
 * Fallback Markdown Generator when AI is offline
 */
function buildFallbackMarkdown(articles, holdings, rangeTitle, days) {
  const holdingArticles = articles.filter(a => holdings.includes(a.ticker.toUpperCase()));
  const macroArticles = articles.filter(a => a.reading_priority === 'MACRO' || a.portfolio_tag === 'global');
  const otherHighImpact = articles.filter(a => !holdingArticles.includes(a) && !macroArticles.includes(a));

  return `# ⚡ AI Market Intelligence Brief (${rangeTitle})

> ⚠️ *หมายเหตุ: สร้างจาก Rule-based Fallback Engine เนื่องจาก AI Gateway ออฟไลน์ชั่วคราว — รวบรวมจาก ${articles.length} ข่าวกรองที่ผ่านการประเมินความสำคัญสูงสุด*

## 🌍 1. Macro Pulse & Regime Shift (ภาพรวมเศรษฐกิจมหภาค)
${macroArticles.length > 0 
  ? macroArticles.slice(0, 5).map(a => `• **[${a.ticker}] ${a.headline_th || a.headline}**\n  - ${a.summary_th || a.priority_reason || '-'}`).join('\n')
  : '• ไม่พบประเด็นมาโครรุนแรงที่มีนัยยะสำคัญเป็นพิเศษในช่วงเวลานี้'}

## 🎯 2. Portfolio Deep-Dive (เจาะลึกหุ้นในพอร์ตโฟลิโอ)
${holdingArticles.length > 0 
  ? holdingArticles.slice(0, 8).map(a => `• **[$${a.ticker}] ${a.headline_th || a.headline}** (${a.sentiment})\n  - ${a.summary_th || a.priority_reason || '-'}`).join('\n')
  : `• หุ้นหลักในพอร์ต (${holdings.join(', ')}) เคลื่อนไหวตามปกติ ไม่มีข่าวลบที่กระทบปัจจัยพื้นฐาน`}

## 🧭 3. Signal vs Noise (ข่าวเด่นสำคัญและทิศทางอุตสาหกรรม)
${otherHighImpact.length > 0 
  ? otherHighImpact.slice(0, 6).map(a => `• **[${a.ticker}] ${a.headline_th || a.headline}**\n  - ${a.summary_th || a.priority_reason || '-'}`).join('\n')
  : '• ข่าวส่วนใหญ่เป็นความผันผวนระยะสั้น ไม่พบสัญญาณเปลี่ยนปัจจัยพื้นฐาน'}

## ⏰ 4. Upcoming Catalysts & Strategy
• ติดตามปฏิทินงบการเงินและตัวเลขเศรษฐกิจสหรัฐฯ ในสัปดาห์ถัดไป
• ดำเนินกลยุทธ์ตาม Scenario Matrix ของ Project 2X และรันเทรนด์ตามแผน`;
}

/**
 * Helper to slice sections from markdown text
 */
function extractSection(markdown, startHeader, nextHeader) {
  if (!markdown) return '';
  const startIdx = markdown.indexOf(startHeader);
  if (startIdx === -1) return '';
  
  if (!nextHeader) {
    return markdown.slice(startIdx).trim();
  }
  
  const endIdx = markdown.indexOf(nextHeader, startIdx + startHeader.length);
  if (endIdx === -1) {
    return markdown.slice(startIdx).trim();
  }
  
  return markdown.slice(startIdx, endIdx).trim();
}

/**
 * Get history of digests
 */
export function getDigestHistory({ limit = 20, type = null } = {}) {
  let query = 'SELECT id, digest_type, period_start, period_end, title, tickers_covered, article_count, created_at FROM news_digests';
  const params = [];
  
  if (type) {
    query += ' WHERE digest_type = ?';
    params.push(type);
  }
  
  query += ' ORDER BY id DESC LIMIT ?';
  params.push(Number(limit) || 20);

  const rows = db.prepare(query).all(...params);
  return rows.map(r => ({
    ...r,
    tickers_covered: JSON.parse(r.tickers_covered || '[]')
  }));
}

/**
 * Get single digest by ID
 */
export function getDigestById(id) {
  const row = db.prepare('SELECT * FROM news_digests WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    tickers_covered: JSON.parse(row.tickers_covered || '[]'),
    source_article_ids: JSON.parse(row.source_article_ids || '[]')
  };
}

/**
 * Get latest digest
 */
export function getLatestDigest(type = null) {
  let query = 'SELECT * FROM news_digests';
  const params = [];
  if (type) {
    query += ' WHERE digest_type = ?';
    params.push(type);
  }
  query += ' ORDER BY id DESC LIMIT 1';
  
  const row = db.prepare(query).get(...params);
  if (!row) return null;
  return {
    ...row,
    tickers_covered: JSON.parse(row.tickers_covered || '[]'),
    source_article_ids: JSON.parse(row.source_article_ids || '[]')
  };
}
