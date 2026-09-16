import { db } from '../db/init.js';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'd383nj1r01qlbdj3p8q0d383nj1r01qlbdj3p8qg';
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:18810/openai/v1/chat/completions';
const BRAIN_GATEWAY_URL = process.env.BRAIN_GATEWAY_URL || 'https://brain.doctorbankonline.com/api/ai/chat';
const BRAIN_GATEWAY_TOKEN = process.env.BRAIN_GATEWAY_TOKEN || 'ZIvyWp4BTqcX2Gm1aDHR7lwz0i8PrVqug5KWBX53wqI';

// Known Ticker Mappings for Thai/English text
const KNOWN_TICKER_MAP = {
  'bofa': 'BAC',
  'cathie': 'ARKK',
  'robotaxi': 'TSLA',
  'lrcx': 'LRCX',
  'alab': 'ALAB',
  'on': 'ON',
  'rubrik': 'RBRK',
  'rbrk': 'RBRK',
  'crowdstrike': 'CRWD',
  'crwd': 'CRWD',
  'hims': 'HIMS',
  'mercadolibre': 'MELI',
  'meli': 'MELI',
  'meta': 'META',
  'facebook': 'META',
  'nvidia': 'NVDA',
  'nvda': 'NVDA',
  'schwab': 'SCHG',
  'schg': 'SCHG',
  'qqqm': 'QQQM',
  'qqq': 'QQQM',
  'apple': 'AAPL',
  'aapl': 'AAPL',
  'tesla': 'TSLA',
  'tsla': 'TSLA',
  'microsoft': 'MSFT',
  'msft': 'MSFT',
  'amazon': 'AMZN',
  'amzn': 'AMZN',
  'google': 'GOOGL',
  'alphabet': 'GOOGL',
  'goog': 'GOOGL',
  'googl': 'GOOGL',
  'broadcom': 'AVGO',
  'avgo': 'AVGO',
  'vertiv': 'VRT',
  'vrt': 'VRT',
  'tsmc': 'TSM',
  'tsm': 'TSM',
  'palantir': 'PLTR',
  'pltr': 'PLTR',
  'applovin': 'APP',
  'app': 'APP',
  'robinhood': 'HOOD',
  'hood': 'HOOD',
  'coinbase': 'COIN',
  'coin': 'COIN',
  'snowflake': 'SNOW',
  'snow': 'SNOW'
};

/**
 * Ecosystem and competitor relationship mapping for portfolio stocks
 */
export const ECOSYSTEM_MAP = {
  'NVDA': ['AMD', 'TSM', 'ASML', 'ARM', 'AVGO', 'SMCI', 'MRVL', 'MSFT', 'AMZN', 'GOOGL', 'META'],
  'CRWD': ['PANW', 'FTNT', 'ZS', 'S', 'MSFT', 'OKTA', 'NET', 'CYBR'],
  'RBRK': ['COMM', 'CVLT', 'PANW', 'CRWD', 'MSFT', 'AMZN'],
  'HIMS': ['AMZN', 'CVS', 'WBA', 'TDOC', 'LLY', 'NVO'],
  'MELI': ['AMZN', 'SE', 'BABA', 'NU', 'CPNG', 'STNE'],
  'META': ['GOOGL', 'SNAP', 'PINS', 'MSFT', 'AAPL', 'AMZN', 'TTD', 'RDDT'],
  'SCHG': ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'GOOG', 'AVGO', 'TSLA', 'LLY'],
  'QQQM': ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'GOOG', 'AVGO', 'TSLA', 'COST']
};

export const MACRO_KEYWORDS = [
  // Thai Macro Keywords
  'เฟด', 'พาวเวลล์', 'ขึ้นดอกเบี้ย', 'ลดดอกเบี้ย', 'อัตราดอกเบี้ย', 
  'เงินเฟ้อ', 'เศรษฐกิจถดถอย', 'ถดถอย', 'สงคราม', 'ภาษีศุลกากร', 
  'กำแพงภาษี', 'จ้างงาน', 'วิกฤต', 'ตราสารหนี้', 'บอนด์ยีลด์', 
  'ดอลลาร์', 'จีดีพี', 'เพดานหนี้',
  // English Macro Keywords
  'fed', 'federal reserve', 'powell', 'interest rate', 'rate cut', 
  'rate hike', 'inflation', 'cpi', 'pce', 'recession', 'tariff', 
  'tariffs', 'trade war', 'war', 'yield curve', 'bond yield', 
  'fomc', 'gdp', 'unemployment', 'treasury'
];

export const MARKET_SUMMARY_KEYWORDS = [
  'สรุปตลาด', 'สรุปภาพรวม', 'สรุปภาวะตลาด', 'ปิดตลาด', 'สรุปข่าวเด่น', 
  'market wrap', 'market summary', 'daily wrap', 'roundup', 'wall street wrap', 'morning brief'
];

export const CATALYST_PATTERNS = [
  // Price swing with percentage (e.g. พุ่ง 16%, ร่วง 12%, +15%, -8%)
  /(?:พุ่ง|ร่วง|ดิ่ง|บวก|ลบ|ทะยาน|ทรุด|ดิ่งเหว|กระฉูด|crash|surge|plunge|spike|jump|drop|slump|tumble|soar|skyrocket)\s*(?:กว่า|เกือบ|ทะลุ)?\s*\d+(?:\.\d+)?%/i,
  /(?:\+|\-)\d+(?:\.\d+)?%/,
  // Management shakeups, legal/SEC, M&A, bankruptcy
  /(?:ลาออก|ปลด|สอบสวน|ฟ้อง|ก\.ล\.ต\.|ควบรวม|ซื้อกิจการ|ล้มละลาย|resigns?|fired|sec investigation|lawsuit|antitrust|merger|acquisition|buyout|takeover|bankruptcy|subpoena)/i,
  // Earnings surprises
  /(?:งบเซอร์ไพรส์|กำไรพุ่ง|ขาดทุนหนัก|earnings beat|earnings miss|revenue warning|guidance cut|guidance boost)/i
];

export const NOISE_KEYWORDS = [
  'หุ้นเด็ด', '5 หุ้น', '10 หุ้น', '3 หุ้น', '7 หุ้น', 'น่าช้อน', 'น่าซื้อ', 
  'ต้องมีติดพอร์ต', 'กูรูชี้', 'เซียนหุ้น', 'รวยแน่', 'ลายแทง', 
  'ลับเฉพาะ', 'ชี้เป้า', 'รีบสอย', 'เปิดโผ', 'ส่องหุ้น', 
  'top 5 stocks', 'top 10 stocks', 'stocks to buy now', 'get rich', 'secret stock'
];

/**
 * Get active holdings categorized by portfolio:
 * Main: Doctorbank Growth
 * Sub: Tiger
 */
export function getPortfolioHoldings() {
  const portfolios = db.prepare('SELECT id, name FROM portfolios').all();
  const mainPort = portfolios.find(p => /growth|doctorbank/i.test(p.name)) || portfolios[0];
  const tigerPort = portfolios.find(p => /tiger/i.test(p.name));

  const mainHoldings = new Set();
  const tigerHoldings = new Set();

  if (mainPort) {
    const rows = db.prepare(`
      SELECT symbol, SUM(CASE WHEN type='BUY' THEN amount WHEN type='SELL' THEN -amount ELSE 0 END) as shares
      FROM transactions WHERE portfolio_id = ? GROUP BY symbol HAVING shares > 0
    `).all(mainPort.id);
    rows.forEach(r => mainHoldings.add(r.symbol.toUpperCase()));
  }

  if (tigerPort) {
    const rows = db.prepare(`
      SELECT symbol, SUM(CASE WHEN type='BUY' THEN amount WHEN type='SELL' THEN -amount ELSE 0 END) as shares
      FROM transactions WHERE portfolio_id = ? GROUP BY symbol HAVING shares > 0
    `).all(tigerPort.id);
    rows.forEach(r => tigerHoldings.add(r.symbol.toUpperCase()));
  }

  return {
    mainPortId: mainPort?.id || null,
    tigerPortId: tigerPort?.id || null,
    mainHoldings,
    tigerHoldings
  };
}

/**
 * Get dynamic watchlist tickers from database
 */
export function getWatchlistTickers() {
  const list = new Set(['AMD', 'GOOGL', 'AVGO', 'TSM', 'AMZN', 'MSFT', 'PANW', 'PLTR']);
  try {
    // 1. Check portfolio_blueprints
    const blueprintRows = db.prepare("SELECT symbol FROM portfolio_blueprints WHERE status = 'WATCHLIST'").all();
    blueprintRows.forEach(r => list.add(r.symbol.toUpperCase()));

    // 2. Check watchlist_tickers table
    const dbRows = db.prepare("SELECT symbol FROM watchlist_tickers").all();
    dbRows.forEach(r => list.add(r.symbol.toUpperCase()));
  } catch (err) {
    console.warn('[NewsRadar] Error reading watchlist tickers:', err.message);
  }
  return list;
}

/**
 * Determine portfolio tag for a ticker symbol
 */
export function getTickerPortfolioTag(symbol, { mainHoldings, tigerHoldings, mainPortId, tigerPortId }) {
  const upper = symbol.toUpperCase();
  const inMain = mainHoldings.has(upper);
  const inTiger = tigerHoldings.has(upper);

  if (inMain && inTiger) {
    return { tag: 'dual', portfolioId: mainPortId };
  }
  if (inMain) {
    return { tag: 'main', portfolioId: mainPortId };
  }
  if (inTiger) {
    return { tag: 'tiger', portfolioId: tigerPortId };
  }
  return { tag: 'global', portfolioId: null };
}

/**
 * Extract ticker symbols from text/title
 */
export function extractTickers(text) {
  if (!text) return [];
  const found = new Set();
  const lower = text.toLowerCase();

  // 1. Check known keywords
  for (const [key, sym] of Object.entries(KNOWN_TICKER_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lower)) {
      found.add(sym);
    }
  }

  // 2. Check 2-5 uppercase letters that look like stock tickers
  const tickerRegex = /\b[A-Z]{2,5}\b/g;
  let match;
  while ((match = tickerRegex.exec(text)) !== null) {
    const candidate = match[0];
    // filter out non-ticker common abbreviations
    if (!['THE', 'FOR', 'AND', 'WITH', 'NEW', 'ALL', 'OUT', 'TOP', 'CEO', 'CFO', 'USA', 'FED', 'GDP', 'CPI', 'AI', 'SEC'].includes(candidate)) {
      found.add(candidate);
    }
  }

  return Array.from(found);
}

/**
 * Fetch and parse Beehiiv homepage
 */
export async function fetchBeehiivArticles() {
  const url = 'https://wethaiinvest.beehiiv.com/';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  if (!res.ok) {
    throw new Error(`Beehiiv fetch failed with status ${res.status}`);
  }

  const html = await res.text();

  // Find all distinct /p/ slugs
  const slugRegex = /href="(\/p\/[a-z0-9-]+)"/gi;
  const slugs = [];
  const seenSlugs = new Set();
  let sm;
  while ((sm = slugRegex.exec(html)) !== null) {
    const s = sm[1];
    if (!seenSlugs.has(s)) {
      seenSlugs.add(s);
      slugs.push(s);
    }
  }

  const articles = [];

  for (const slug of slugs) {
    const firstIdx = html.indexOf(slug);
    const lastIdx = html.lastIndexOf(slug);
    const sliceStart = Math.max(0, firstIdx - 250);
    const sliceEnd = Math.min(html.length, lastIdx + 3000);
    const block = html.substring(sliceStart, sliceEnd);

    // 1. Title
    let title = '';
    const h2Match = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    if (h2Match) {
      title = h2Match[1].replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
    } else {
      const altMatch = block.match(/<img[^>]*alt="([^"]+)"/i);
      if (altMatch) {
        title = altMatch[1].replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
      }
    }

    // 2. Published Time
    const timeMatch = block.match(/<time[^>]*dateTime="([^"]*)"[^>]*>([\s\S]*?)<\/time>/i);
    const isoTime = timeMatch ? timeMatch[1] : '';

    let dayOfWeek = null;
    let hour = null;
    if (isoTime) {
      const d = new Date(isoTime);
      if (!isNaN(d.getTime())) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayOfWeek = days[d.getUTCDay()];
        hour = d.getUTCHours();
      }
    }

    // 3. Premium status
    const isPremium = block.includes('>Premium<') || block.includes('🔒') || block.includes('premium-badge');

    // 4. Extract tickers
    const tickers = extractTickers(title + ' ' + slug);

    articles.push({
      slug,
      title: title || slug.replace('/p/', '').replace(/-/g, ' '),
      url: 'https://wethaiinvest.beehiiv.com' + slug,
      isPremium: isPremium ? 1 : 0,
      publishedAt: isoTime || null,
      dayOfWeek,
      hour,
      tickers
    });
  }

  return articles;
}

/**
 * Fetch supplementary news from Yahoo Finance
 */
export async function fetchYahooNews(symbol) {
  try {
    const res = await yahooFinance.search(symbol, { newsCount: 3 }).catch(() => null);
    if (!res || !Array.isArray(res.news)) return [];
    return res.news.slice(0, 3).map(n => ({
      title: n.title || '',
      publisher: n.publisher || 'Yahoo Finance',
      link: n.link || '',
      publishedTime: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null
    }));
  } catch (err) {
    console.warn(`[NewsRadar] Yahoo news error for ${symbol}:`, err.message);
    return [];
  }
}

/**
 * Fetch supplementary company news from Finnhub
 */
export async function fetchFinnhubNews(symbol) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const past = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${past}&to=${today}&token=${FINNHUB_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.slice(0, 3).map(item => ({
      title: item.headline || '',
      publisher: item.source || 'Finnhub',
      link: item.url || '',
      summary: item.summary || ''
    }));
  } catch (err) {
    console.warn(`[NewsRadar] Finnhub news error for ${symbol}:`, err.message);
    return [];
  }
}

/**
 * 6-Gate Pre-Filter Triage Engine
 * Calculates relevance score (0-100) and routes articles:
 * Score >= 70 -> FULL_PIPELINE
 * Score 30-69 -> TITLE_ONLY
 * Score < 30  -> DROPPED
 */
export function triageArticle(article, context) {
  const { mainHoldings, tigerHoldings, watchlist, ecosystemMap } = context;
  const title = article.title || '';
  const slug = article.slug || '';
  const textToCheck = `${title} ${slug}`.toLowerCase();
  
  let score = 0;
  const tags = [];
  const breakdown = {};
  const matchedTickers = [];
  let isMarketSummary = false;

  // Gate 1: Portfolio VIP Hit
  let isVip = false;
  let isWatchlist = false;
  for (const ticker of article.tickers) {
    const sym = ticker.toUpperCase();
    if (mainHoldings.has(sym) || tigerHoldings.has(sym)) {
      isVip = true;
      matchedTickers.push(sym);
      tags.push(`VIP:${sym}`);
    } else if (watchlist.has(sym)) {
      isWatchlist = true;
      matchedTickers.push(sym);
      tags.push(`WATCHLIST:${sym}`);
    }
  }

  if (isVip) {
    score += 80;
    breakdown.vip = 80;
  } else if (isWatchlist) {
    score += 50;
    breakdown.watchlist = 50;
  }

  // Gate 1.5: Ecosystem Scan
  const allHeld = new Set([...mainHoldings, ...tigerHoldings]);
  const matchedEcosystem = [];
  for (const [heldStock, relatedList] of Object.entries(ecosystemMap || ECOSYSTEM_MAP)) {
    if (!allHeld.has(heldStock)) continue;
    for (const ticker of article.tickers) {
      const sym = ticker.toUpperCase();
      if (sym !== heldStock && relatedList.includes(sym)) {
        matchedEcosystem.push(`${sym}->${heldStock}`);
        tags.push(`ECO:${heldStock}`);
        if (!matchedTickers.includes(sym)) matchedTickers.push(sym);
      }
    }
  }
  if (matchedEcosystem.length > 0) {
    score += 60;
    breakdown.ecosystem = 60;
    breakdown.ecosystem_matches = matchedEcosystem;
  }

  // Gate 2: Macro Shield & Market Summary
  let hasMacro = false;
  for (const kw of MACRO_KEYWORDS) {
    if (textToCheck.includes(kw.toLowerCase())) {
      hasMacro = true;
      break;
    }
  }
  if (hasMacro) {
    score += 50;
    tags.push('MACRO');
    breakdown.macro = 50;
  }

  for (const kw of MARKET_SUMMARY_KEYWORDS) {
    if (textToCheck.includes(kw.toLowerCase())) {
      isMarketSummary = true;
      tags.push('MARKET_SUMMARY');
      breakdown.market_summary = true;
      if (!hasMacro && !isVip && !isWatchlist) {
        score += 40;
        breakdown.market_summary_score = 40;
      }
      break;
    }
  }

  // Gate 3: Catalyst / High-Impact Trigger
  let hasCatalyst = false;
  for (const pattern of CATALYST_PATTERNS) {
    if (pattern.test(title)) {
      hasCatalyst = true;
      break;
    }
  }
  if (hasCatalyst) {
    score += 40;
    tags.push('CATALYST');
    breakdown.catalyst = 40;
  }

  // Gate 4: Noise / Clickbait Penalty
  let hasNoise = false;
  for (const kw of NOISE_KEYWORDS) {
    if (textToCheck.includes(kw.toLowerCase())) {
      hasNoise = true;
      break;
    }
  }
  if (hasNoise) {
    score -= 40;
    tags.push('NOISE_PENALTY');
    breakdown.noise_penalty = -40;
  }

  // Clamp score [0, 100]
  const finalScore = Math.max(0, Math.min(100, score));

  // Determine Action
  let action = 'DROPPED';
  if (finalScore >= 70) {
    action = 'FULL_PIPELINE';
  } else if (finalScore >= 30) {
    action = 'TITLE_ONLY';
  } else {
    action = 'DROPPED';
  }

  return {
    score: finalScore,
    rawScore: score,
    action,
    tags,
    breakdown,
    matchedTickers,
    isMarketSummary
  };
}

/**
 * Call Codex GPT-5.6 Terra (free subscription tier) via Brain Gateway
 */
export async function synthesizeWithAI({ ticker, headline, newsItems, portfolioTag, isHolding, relevanceScore = 50, triageTags = [] }) {
  const contextText = newsItems.map((n, i) => `[ข่าว ${i+1}] (${n.publisher}): ${n.title}\n${n.summary || ''}`).join('\n\n');

  const systemPrompt = `You are the Ruthless Investment Intelligence AI for My Stock Portfolio. Always reply with a valid raw JSON object matching the requested schema. Do not include markdown fences, backticks, or any explanation text outside JSON.`;

  const userMessage = `Stock Ticker: ${ticker}
Holding Status: ${isHolding ? `HELD IN PORTFOLIO (${portfolioTag.toUpperCase()})` : 'WATCHLIST / NOT IN PORTFOLIO'}
Triage Relevance Score: ${relevanceScore}/100
Triage Tags: ${triageTags.join(', ') || 'NONE'}
Headline: "${headline}"

Recent News Context:
${contextText || headline}

Rules for reading_priority:
1. "THE_MUST": STRICTLY for stocks HELD IN PORTFOLIO (${portfolioTag.toUpperCase()}) facing game-changing fundamental catalysts: Direct corporate SEC filings, unexpected earnings beats/misses, major guidance raises/cuts, capital dilution / ATM stock offerings, high-stakes regulatory/legal threats (FTC/DOJ/bans), or fundamental moat disruptions.
CRITICAL: Watchlist stocks (NOT in portfolio), pure valuation commentary/op-eds (e.g. P/S or P/E debate articles), commentator blog posts, and generic price target adjustments MUST NEVER be classified as "THE_MUST".
2. "GOOD_TO_KNOW": Watchlist earnings/updates, normal business developments, analyst price target adjustments, or commentary/opinion pieces on held stocks.
3. "OPTIONAL": Routine scheduled insider selling (Rule 10b5-1), minor mentions, generic macro opinion, or peripheral noise.

Output ONLY a JSON object:
{
  "headline_th": "[${ticker}] พาดหัวภาษาไทยกระชับ คม เข้าใจใน 1 วินาที (10-18 คำ ไม่ใช้คำหลอกลวง)",
  "summary_th": ["ประเด็น 1 (ภาษาไทย)", "ประเด็น 2 (ภาษาไทย)", "ประเด็น 3 (ภาษาไทย)"],
  "sentiment": "bullish" | "bearish" | "neutral",
  "reading_priority": "THE_MUST" | "GOOD_TO_KNOW" | "OPTIONAL",
  "priority_reason": "เหตุผลสั้นๆ 1 ประโยคภาษาไทย",
  "impact_level": "routine" | "significant" | "moat_breaker"
}`;

  try {
    let reply = '';
    let res = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.6-terra',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      }),
      signal: AbortSignal.timeout(25000)
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || data.reply || '';
    } else {
      // Secondary fallback to external gateway if configured
      const fbRes = await fetch(BRAIN_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BRAIN_GATEWAY_TOKEN}`
        },
        body: JSON.stringify({
          model: 'gpt-5.6-terra',
          context: systemPrompt,
          message: userMessage
        }),
        signal: AbortSignal.timeout(25000)
      }).catch(() => null);

      if (fbRes && fbRes.ok) {
        const fbData = await fbRes.json();
        reply = fbData.reply || fbData.choices?.[0]?.message?.content || '';
      }
    }

    if (!reply) {
      throw new Error('No AI response from primary or secondary gateway');
    }

    // Robust JSON extraction
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`No JSON block found in reply: ${reply.slice(0, 100)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    let formattedSummary = '';
    if (Array.isArray(parsed.summary_th)) {
      formattedSummary = parsed.summary_th.map(line => line.startsWith('•') ? line : `• ${line}`).join('\n');
    } else if (typeof parsed.summary_th === 'string') {
      formattedSummary = parsed.summary_th;
    } else {
      formattedSummary = `• ${headline}`;
    }

    let calculatedPriority = ['THE_MUST', 'GOOD_TO_KNOW', 'OPTIONAL'].includes(parsed.reading_priority) 
      ? parsed.reading_priority 
      : (isHolding ? 'GOOD_TO_KNOW' : 'OPTIONAL');

    // Elevate to THE_MUST if holding + score >= 80 + significant/moat_breaker impact
    if (isHolding && relevanceScore >= 80 && (parsed.impact_level === 'significant' || parsed.impact_level === 'moat_breaker')) {
      calculatedPriority = 'THE_MUST';
    }

    // Iron Clad Guardrails for THE_MUST:
    // 1. Non-holding stocks (Watchlist/Global) can NEVER be THE_MUST
    if (!isHolding && calculatedPriority === 'THE_MUST') {
      calculatedPriority = 'GOOD_TO_KNOW';
    }

    // 2. Pure opinion/commentary/op-ed articles should not be THE_MUST
    const isOpinionOrCommentary = /opinion|columnist|motley fool|seeking alpha contributor|trades at \d|is the stock a bargain|whoever spends smarter/i.test(headline);
    if (isOpinionOrCommentary && calculatedPriority === 'THE_MUST') {
      calculatedPriority = 'GOOD_TO_KNOW';
    }

    return {
      headline_th: parsed.headline_th || `[${ticker}] ${headline}`,
      summary_th: formattedSummary,
      sentiment: ['bullish', 'bearish', 'neutral'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
      reading_priority: calculatedPriority,
      priority_reason: parsed.priority_reason || (isHolding ? 'ข่าวสารหุ้นในพอร์ต' : 'ข่าวทั่วไป'),
      impact_level: ['routine', 'significant', 'moat_breaker'].includes(parsed.impact_level) ? parsed.impact_level : 'routine'
    };
  } catch (err) {
    console.error(`[NewsRadar] AI synthesis error for ${ticker}:`, err.message);
    return {
      headline_th: `[${ticker}] ${headline}`,
      summary_th: `• ${headline}\n• ข้อมูลดึงจาก Yahoo Finance & Finnhub\n• สามารถคลิกอ่านรายละเอียดจากลิงก์ข่าวต้นฉบับได้โดยตรง`,
      sentiment: 'neutral',
      reading_priority: isHolding && relevanceScore >= 80 ? 'THE_MUST' : (isHolding ? 'GOOD_TO_KNOW' : 'OPTIONAL'),
      priority_reason: isHolding ? 'ข่าวสารหุ้นในพอร์ต' : 'ข่าวทั่วไปนอกพอร์ต',
      impact_level: 'routine'
    };
  }
}

/**
 * Execute full scan with 6-gate pre-filter triage:
 * 1. Scrape Beehiiv
 * 2. 6-Gate Triage Scoring (0-100)
 * 3. Route: Dropped (<30), Title-Only (30-69), Full Pipeline (>=70)
 * 4. Aggregate Yahoo & Finnhub for Full Pipeline items
 * 5. Synthesize with GPT-5.6 Terra
 * 6. Store in seen_articles and news_intelligence tables
 */
export async function runNewsScan() {
  console.log('[NewsRadar] 🚀 Starting news intelligence scan with 6-Gate Pre-Filter...');
  const portfolioInfo = getPortfolioHoldings();
  const watchlist = getWatchlistTickers();
  const triageContext = {
    ...portfolioInfo,
    watchlist,
    ecosystemMap: ECOSYSTEM_MAP
  };

  const articles = await fetchBeehiivArticles();
  console.log(`[NewsRadar] Fetched ${articles.length} articles from Beehiiv`);

  const insertSeen = db.prepare(`
    INSERT INTO seen_articles (
      slug, title, source, published_at, published_day_of_week, published_hour, 
      detected_at, tickers, is_premium, triage_score, triage_action, triage_tags
    )
    VALUES (?, ?, 'beehiiv', ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      published_at = COALESCE(excluded.published_at, seen_articles.published_at),
      published_day_of_week = COALESCE(excluded.published_day_of_week, seen_articles.published_day_of_week),
      published_hour = COALESCE(excluded.published_hour, seen_articles.published_hour),
      tickers = excluded.tickers,
      triage_score = excluded.triage_score,
      triage_action = excluded.triage_action,
      triage_tags = excluded.triage_tags
  `);

  const findIntel = db.prepare('SELECT id FROM news_intelligence WHERE ticker = ? AND headline = ?');
  const insertIntel = db.prepare(`
    INSERT INTO news_intelligence (
      ticker, company_name, headline, headline_th, source_name, source_url,
      summary_th, sentiment, reading_priority, priority_reason, impact_level,
      portfolio_tag, related_portfolio_id, relevance_score, triage_tags, is_read, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `);

  let newArticlesCount = 0;
  let newIntelCount = 0;
  let droppedCount = 0;
  let titleOnlyCount = 0;
  let fullPipelineCount = 0;

  for (const article of articles) {
    // Gate 0: Check if article has already been processed with triage
    const existingSeen = db.prepare('SELECT slug, triage_action, triage_score FROM seen_articles WHERE slug = ?').get(article.slug);
    if (existingSeen && existingSeen.triage_action && existingSeen.triage_action !== 'PENDING') {
      // Already evaluated in a previous scan
      continue;
    }

    // Run 6-Gate Triage Scoring
    const triage = triageArticle(article, triageContext);

    // Save seen article with triage metrics
    insertSeen.run(
      article.slug,
      article.title,
      article.publishedAt,
      article.dayOfWeek,
      article.hour,
      JSON.stringify(article.tickers),
      article.isPremium,
      triage.score,
      triage.action,
      JSON.stringify(triage.tags)
    );

    console.log(`[NewsRadar] Article: "${article.title}" -> Score: ${triage.score} (${triage.action}) [${triage.tags.join(', ')}]`);

    // Route based on triage action
    if (triage.action === 'DROPPED') {
      droppedCount++;
      newArticlesCount++;
      continue;
    }

    if (triage.action === 'TITLE_ONLY') {
      titleOnlyCount++;
      const tickersToProcess = triage.matchedTickers.length > 0 
        ? triage.matchedTickers 
        : (article.tickers.length > 0 ? article.tickers : (triage.isMarketSummary ? ['MARKET'] : ['MACRO']));

      for (const ticker of tickersToProcess) {
        const existing = findIntel.get(ticker, article.title);
        if (existing) continue;

        const portMapping = getTickerPortfolioTag(ticker, portfolioInfo);
        insertIntel.run(
          ticker,
          ticker,
          article.title,
          `[${ticker}] ${article.title}`,
          'Beehiiv',
          article.url,
          `• ${article.title}\n• คะแนนคัดกรอง: ${triage.score}/100\n• ป้ายกำกับ: ${triage.tags.join(', ') || 'ทั่วไป'}\n• หมายเหตุ: ข่าวสารระดับกลาง (บันทึกเฉพาะหัวข้อโดยไม่เรียก AI สรุปเพื่อประหยัดทรัพยากร สามารถคลิกอ่านรายละเอียดจากลิงก์ต้นฉบับได้)`,
          'neutral',
          'OPTIONAL',
          `คัดกรองระดับกลาง (${triage.score} คะแนน): ${triage.tags.join(', ')}`,
          'routine',
          portMapping.tag,
          portMapping.portfolioId,
          triage.score,
          JSON.stringify(triage.tags)
        );
        newIntelCount++;
      }
      newArticlesCount++;
      continue;
    }

    // Action === 'FULL_PIPELINE' (Score >= 70)
    fullPipelineCount++;
    const tickersToProcess = triage.matchedTickers.length > 0 
      ? triage.matchedTickers 
      : (article.tickers.length > 0 ? article.tickers : (triage.isMarketSummary ? ['MARKET'] : ['MACRO']));

    for (const ticker of tickersToProcess) {
      const existing = findIntel.get(ticker, article.title);
      if (existing) continue;

      const portMapping = getTickerPortfolioTag(ticker, portfolioInfo);
      const isHolding = portMapping.tag !== 'global';

      // Supplementary news
      let supplementaryNews = [];
      if (ticker !== 'MARKET' && ticker !== 'MACRO') {
        const [yhNews, fhNews] = await Promise.all([
          fetchYahooNews(ticker),
          fetchFinnhubNews(ticker)
        ]);
        supplementaryNews = [...yhNews, ...fhNews];
      }

      // AI Synthesis with GPT-5.6 Terra
      const aiResult = await synthesizeWithAI({
        ticker,
        headline: article.title,
        newsItems: supplementaryNews,
        portfolioTag: portMapping.tag,
        isHolding,
        relevanceScore: triage.score,
        triageTags: triage.tags
      });

      insertIntel.run(
        ticker,
        ticker,
        article.title,
        aiResult.headline_th || `[${ticker}] ${article.title}`,
        'Beehiiv / Yahoo / Finnhub',
        article.url,
        aiResult.summary_th,
        aiResult.sentiment,
        aiResult.reading_priority,
        aiResult.priority_reason,
        aiResult.impact_level,
        portMapping.tag,
        portMapping.portfolioId,
        triage.score,
        JSON.stringify(triage.tags)
      );

      newIntelCount++;
      console.log(`[NewsRadar] ✨ Full Intel Processed: ${ticker} [${portMapping.tag.toUpperCase()}] -> Priority: ${aiResult.reading_priority} (Score: ${triage.score})`);
    }

    newArticlesCount++;
  }

  return {
    success: true,
    articlesScanned: articles.length,
    newArticlesCount,
    newIntelCount,
    triageSummary: {
      fullPipelineCount,
      titleOnlyCount,
      droppedCount
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Get timing analytics of when Beehiiv articles are published
 */
export function getPublicationTimingStats() {
  const byDay = db.prepare(`
    SELECT published_day_of_week as day, COUNT(*) as count 
    FROM seen_articles 
    WHERE published_day_of_week IS NOT NULL 
    GROUP BY published_day_of_week 
    ORDER BY count DESC
  `).all();

  const byHour = db.prepare(`
    SELECT published_hour as hour, COUNT(*) as count 
    FROM seen_articles 
    WHERE published_hour IS NOT NULL 
    GROUP BY published_hour 
    ORDER BY count DESC
  `).all();

  const total = db.prepare('SELECT COUNT(*) as total FROM seen_articles').get();

  return {
    totalArticles: total?.total || 0,
    byDay,
    byHour
  };
}

/**
 * Get triage filtering statistics (Full Pipeline vs Title-Only vs Dropped)
 */
export function getTriageStats() {
  const byAction = db.prepare(`
    SELECT triage_action as action, COUNT(*) as count, ROUND(AVG(triage_score), 1) as avgScore
    FROM seen_articles
    GROUP BY triage_action
  `).all();

  const recentTriage = db.prepare(`
    SELECT slug, title, triage_score, triage_action, triage_tags, detected_at
    FROM seen_articles
    ORDER BY detected_at DESC
    LIMIT 20
  `).all();

  return {
    byAction,
    recentTriage
  };
}
