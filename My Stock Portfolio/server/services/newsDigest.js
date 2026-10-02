import 'dotenv/config';
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
หน้าที่ของคุณคือ สังเคราะห์ข่าวกรองตลาดหุ้นรอบ ${days} วันที่ผ่านมา ให้เป็น "Executive Briefing" ระดับผู้จัดการกองทุนชั้นนำ — "สั้น กระชับ ฟันธง ไม่เอาน้ำ ไม่ออกทะเล"

🎯 กฎเหล็ก 5 ข้อ (ฝ่าฝืนไม่ได้เด็ดขาด):
1. เปิดหัวด้วย "The 3-Line Punch" เสมอ: สรุปภาพรวมและประเด็นชี้ขาดทั้งหมดจบใน 3 บรรทัดแรกเท่านั้น (1. Regime ตลาดตอนนี้ 2. พอร์ตของเราได้รับผลกระทบยังไง 3. Action สัปดาห์นี้ต้องทำอะไร)
2. ห้ามใช้น้ำลาย ห้ามอารัมภบท ห้ามแปลกูเกิลตรงๆ ห้ามออกทะเลเรื่องการเมืองที่ไม่กระทบราคาหุ้น
3. พอร์ตหลักของผู้ใช้ถือหุ้น: [${allHoldings.join(', ')}] ต้องระบุแท็ก [$TICKER] ทุกครั้งที่เอ่ยถึงหุ้น เช่น [$NVDA], [$CRWD], [$MELI], [$RBRK], [$SCHG]
4. แม้ไม่มีข่าวของหุ้นเดี่ยวตรงๆ ต้องฟันธงผลกระทบทางอ้อม (Macro-to-Portfolio Transmission) ต่อหุ้นในพอร์ตเสมอ
5. ห้ามใช้สูตร LaTeX หรือ $$ เด็ดขาด ให้ใช้ Plain Markdown ตามโครงสร้างด้านล่างเป๊ะ 100%

โครงสร้าง Output ที่ต้องใช้เป๊ะๆ (ห้ามเปลี่ยนชื่อหัวข้อเด็ดขาด):

## ⚡ 1. The 3-Line Punch (สรุปประเด็นชี้ขาดใน 3 บรรทัด)
• **Market Regime:** [ฟันธงใน 1 บรรทัดว่าตลาดกำลังอยู่ในโหมดอะไร Fed/ดอกเบี้ย/สภาพคล่องชี้ทางไหน]
• **Portfolio Impact:** [ฟันธงใน 1 บรรทัดว่าหุ้นในพอร์ต ${allHoldings.slice(0, 5).map(t => '[$' + t + ']').join(', ')} ใครได้ประโยชน์ ใครเสียประโยชน์]
• **Tactical Action:** [ฟันธงใน 1 บรรทัดว่าสัปดาห์นี้ควรทำอะไร: เช่น ทยอยสะสม, ชะลอซื้อรอดูตัวเลข, หรือถือรอ]

## 🌍 2. Macro Pulse & Rates (ปัจจัยชี้นำตลาด)
• 2-3 บุลเล็ตเจาะเฉพาะตัวเลขและนโยบายที่มีผลต่อราคาจริง (Fed, Bond Yields, ดอกเบี้ย, เงินเฟ้อ) ตัดประเด็นการเมืองทิ้งทั้งหมด

## 🎯 3. Portfolio Deep-Dive (เจาะลึกหุ้นในพอร์ต)
• ประเมินผลกระทบต่อหุ้นที่เราถือ [${allHoldings.join(', ')}] โดยระบุ [$TICKER] กำกับเสมอ พร้อมชี้ชัดว่ากระทบ Valuation หรือ Earnings อย่างไร

## 🧭 4. Signal vs Noise (อะไรของจริง vs อะไรเสียงนกเสียงกา)
• **Signal (ของจริง):** [ข่าวหรือตัวเลขที่มีผลต่อกระแสเงินสด/พื้นฐานระยะยาว]
• **Noise (สัญญาณลวง):** [ข่าว FUD ชั่วคราว หรือการเคลื่อนไหวฉาบฉวยที่ตลาดตื่นตระหนกเกินจริง ไม่ต้องตื่นตูม]

## ⏰ 5. Watchlist & Next Catalysts (ปฏิทินจับตาสัปดาห์หน้า)
• วันสำคัญและตัวเลขเศรษฐกิจ/งบการเงินสัปดาห์ถัดไปที่ต้องเฝ้าระวัง`;

  const userPrompt = `ข่าวกรองที่คัดเลือกมาแล้วรอบ ${days} วันล่าสุด (${selectedArticles.length} ข่าว):\n\n${articleListText}\n\nกรุณาสังเคราะห์เป็น Executive Briefing ตามโครงสร้าง 5 หมวด (ขึ้นต้นด้วย The 3-Line Punch) ทันที`;

  let rawMarkdown = '';
  let aiError = null;

  // 6. Dual-Fallback AI Gateway Call (80s timeout for deep financial synthesis)
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
      signal: AbortSignal.timeout(80000)
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
        signal: AbortSignal.timeout(60000)
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
  const punchSummary = extractSection(rawMarkdown, '1. The 3-Line Punch', '2. Macro Pulse');
  const macroSummary = extractSection(rawMarkdown, '2. Macro Pulse', '3. Portfolio Deep-Dive') || extractSection(rawMarkdown, '1. Macro Pulse', '2. Portfolio Deep-Dive');
  const portfolioSummary = extractSection(rawMarkdown, '3. Portfolio Deep-Dive', '4. Signal vs Noise') || extractSection(rawMarkdown, '2. Portfolio Deep-Dive', '3. Signal vs Noise');
  const actionableNotes = extractSection(rawMarkdown, '5. Watchlist', null) || extractSection(rawMarkdown, '4. Upcoming Catalysts', null);

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
  
  // Extract 3-line punch or top highlights
  const lines = (digest.raw_markdown || '').split('\n');
  const punchLines = [];
  let inPunch = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('The 3-Line Punch') || trimmed.includes('1. The 3-Line Punch')) {
      inPunch = true;
      continue;
    }
    if (inPunch && trimmed.startsWith('## ')) {
      inPunch = false;
      break;
    }
    if (inPunch && (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*'))) {
      punchLines.push(trimmed.replace(/^[-*•]\s*/, ''));
    }
  }

  if (punchLines.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if ((trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) && trimmed.length > 15) {
        punchLines.push(trimmed.replace(/^[-*•]\s*/, ''));
        if (punchLines.length >= 3) break;
      }
    }
  }

  const bulletText = punchLines.length > 0 
    ? punchLines.map(b => `• ${b}`).join('\n\n') 
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

## ⚡ 1. The 3-Line Punch (สรุปประเด็นชี้ขาดใน 3 บรรทัด)
• **Market Regime:** ภาพรวมตลาดยังอยู่ในช่วงปรับตัวซึมซับดอกเบี้ยและนโยบายการเงินของ Fed
• **Portfolio Impact:** หุ้นหลักในพอร์ต [${holdings.join(', ')}] พื้นฐานยังแข็งแกร่ง ไม่มีข่าวลบรุนแรงกระทบ Valuation
• **Tactical Action:** ถือครองตามสัดส่วนเดิม และชะลอการไล่ราคาเพื่อรอดูตัวเลขเศรษฐกิจสำคัญในสัปดาห์หน้า

## 🌍 2. Macro Pulse & Rates (ปัจจัยชี้นำตลาด)
${macroArticles.length > 0 
  ? macroArticles.slice(0, 5).map(a => `• **[${a.ticker}] ${a.headline_th || a.headline}**\n  - ${a.summary_th || a.priority_reason || '-'}`).join('\n')
  : '• ไม่พบประเด็นมาโครรุนแรงที่มีนัยยะสำคัญเป็นพิเศษในช่วงเวลานี้'}

## 🎯 3. Portfolio Deep-Dive (เจาะลึกหุ้นในพอร์ต)
${holdingArticles.length > 0 
  ? holdingArticles.slice(0, 8).map(a => `• **[$${a.ticker}] ${a.headline_th || a.headline}** (${a.sentiment})\n  - ${a.summary_th || a.priority_reason || '-'}`).join('\n')
  : `• หุ้นหลักในพอร์ต (${holdings.join(', ')}) เคลื่อนไหวตามปกติ ไม่มีข่าวลบที่กระทบปัจจัยพื้นฐาน`}

## 🧭 4. Signal vs Noise (อะไรของจริง vs อะไรเสียงนกเสียงกา)
${otherHighImpact.length > 0 
  ? otherHighImpact.slice(0, 6).map(a => `• **[${a.ticker}] ${a.headline_th || a.headline}**\n  - ${a.summary_th || a.priority_reason || '-'}`).join('\n')
  : '• ข่าวส่วนใหญ่เป็นความผันผวนระยะสั้น ไม่พบสัญญาณเปลี่ยนปัจจัยพื้นฐาน'}

## ⏰ 5. Watchlist & Next Catalysts (ปฏิทินจับตาสัปดาห์หน้า)
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
  return rows.map(r => {
    let tickers = [];
    try {
      tickers = typeof r.tickers_covered === 'string' ? JSON.parse(r.tickers_covered || '[]') : (r.tickers_covered || []);
    } catch {
      tickers = [];
    }
    return {
      ...r,
      tickers_covered: tickers
    };
  });
}

/**
 * Get single digest by ID
 */
export function getDigestById(id) {
  const row = db.prepare('SELECT * FROM news_digests WHERE id = ?').get(id);
  if (!row) return null;
  let tickers = [];
  let sources = [];
  try {
    tickers = typeof row.tickers_covered === 'string' ? JSON.parse(row.tickers_covered || '[]') : (row.tickers_covered || []);
  } catch {
    tickers = [];
  }
  try {
    sources = typeof row.source_article_ids === 'string' ? JSON.parse(row.source_article_ids || '[]') : (row.source_article_ids || []);
  } catch {
    sources = [];
  }
  return {
    ...row,
    tickers_covered: tickers,
    source_article_ids: sources
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
  let tickers = [];
  let sources = [];
  try {
    tickers = typeof row.tickers_covered === 'string' ? JSON.parse(row.tickers_covered || '[]') : (row.tickers_covered || []);
  } catch {
    tickers = [];
  }
  try {
    sources = typeof row.source_article_ids === 'string' ? JSON.parse(row.source_article_ids || '[]') : (row.source_article_ids || []);
  } catch {
    sources = [];
  }
  return {
    ...row,
    tickers_covered: tickers,
    source_article_ids: sources
  };
}
