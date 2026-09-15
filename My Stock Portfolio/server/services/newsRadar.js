import { db } from '../db/init.js';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'd383nj1r01qlbdj3p8q0d383nj1r01qlbdj3p8qg';
const BRAIN_GATEWAY_URL = 'https://brain.doctorbankonline.com/api/ai/chat';
const BRAIN_GATEWAY_TOKEN = 'ZIvyWp4BTqcX2Gm1aDHR7lwz0i8PrVqug5KWBX53wqI';

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
 * Call Codex GPT-5.6 Terra (free subscription tier) via Brain Gateway
 */
export async function synthesizeWithAI({ ticker, headline, newsItems, portfolioTag, isHolding }) {
  const contextText = newsItems.map((n, i) => `[ข่าว ${i+1}] (${n.publisher}): ${n.title}\n${n.summary || ''}`).join('\n\n');

  const systemPrompt = `You are the Ruthless Investment Intelligence AI for My Stock Portfolio. Always reply with a valid raw JSON object matching the requested schema. Do not include markdown fences, backticks, or any explanation text outside JSON.`;

  const userMessage = `Stock Ticker: ${ticker}
Holding Status: ${isHolding ? `HELD IN PORTFOLIO (${portfolioTag.toUpperCase()})` : 'WATCHLIST / NOT IN PORTFOLIO'}
Headline: "${headline}"

Recent News Context:
${contextText || headline}

Rules for reading_priority:
1. "THE_MUST": News directly impacting business moat, regulatory bans, severe earnings swing, high-level leadership shakeup, or major catalysts threatening/boosting held stocks (${portfolioTag.toUpperCase()}).
2. "GOOD_TO_KNOW": Normal business updates, analyst price target changes, routine product announcements, moderate growth/earnings news.
3. "OPTIONAL": Routine scheduled insider selling (Rule 10b5-1), generic macro opinion, or stocks not in portfolio.

Output ONLY a JSON object:
{
  "summary_th": ["ประเด็น 1 (ภาษาไทย)", "ประเด็น 2 (ภาษาไทย)", "ประเด็น 3 (ภาษาไทย)"],
  "sentiment": "bullish" | "bearish" | "neutral",
  "reading_priority": "THE_MUST" | "GOOD_TO_KNOW" | "OPTIONAL",
  "priority_reason": "เหตุผลสั้นๆ 1 ประโยคภาษาไทย",
  "impact_level": "routine" | "significant" | "moat_breaker"
}`;

  try {
    const res = await fetch(BRAIN_GATEWAY_URL, {
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
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) {
      throw new Error(`AI Gateway error status ${res.status}`);
    }

    const data = await res.json();
    let reply = data.reply || '';

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

    return {
      summary_th: formattedSummary,
      sentiment: ['bullish', 'bearish', 'neutral'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
      reading_priority: ['THE_MUST', 'GOOD_TO_KNOW', 'OPTIONAL'].includes(parsed.reading_priority) ? parsed.reading_priority : (isHolding ? 'GOOD_TO_KNOW' : 'OPTIONAL'),
      priority_reason: parsed.priority_reason || (isHolding ? 'ข่าวสารหุ้นในพอร์ต' : 'ข่าวทั่วไป'),
      impact_level: ['routine', 'significant', 'moat_breaker'].includes(parsed.impact_level) ? parsed.impact_level : 'routine'
    };
  } catch (err) {
    console.error(`[NewsRadar] AI synthesis error for ${ticker}:`, err.message);
    return {
      summary_th: `• ${headline}\n• ข้อมูลดึงจาก Yahoo Finance & Finnhub\n• สามารถคลิกอ่านรายละเอียดจากลิงก์ข่าวต้นฉบับได้โดยตรง`,
      sentiment: 'neutral',
      reading_priority: isHolding ? 'GOOD_TO_KNOW' : 'OPTIONAL',
      priority_reason: isHolding ? 'ข่าวสารหุ้นในพอร์ต' : 'ข่าวทั่วไปนอกพอร์ต',
      impact_level: 'routine'
    };
  }
}

/**
 * Execute full scan:
 * 1. Scrape Beehiiv
 * 2. Save seen articles & timing stats
 * 3. Extract tickers & map to portfolios
 * 4. Aggregate Yahoo & Finnhub news
 * 5. Synthesize with GPT-5.6 Terra
 * 6. Store in news_intelligence table
 */
export async function runNewsScan() {
  console.log('[NewsRadar] Starting news intelligence scan...');
  const portfolioInfo = getPortfolioHoldings();
  const articles = await fetchBeehiivArticles();
  console.log(`[NewsRadar] Fetched ${articles.length} articles from Beehiiv`);

  const insertSeen = db.prepare(`
    INSERT INTO seen_articles (slug, title, source, published_at, published_day_of_week, published_hour, detected_at, tickers, is_premium)
    VALUES (?, ?, 'beehiiv', ?, ?, ?, datetime('now'), ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      published_at = COALESCE(excluded.published_at, seen_articles.published_at),
      published_day_of_week = COALESCE(excluded.published_day_of_week, seen_articles.published_day_of_week),
      published_hour = COALESCE(excluded.published_hour, seen_articles.published_hour),
      tickers = excluded.tickers
  `);

  const findIntel = db.prepare('SELECT id FROM news_intelligence WHERE ticker = ? AND headline = ?');
  const insertIntel = db.prepare(`
    INSERT INTO news_intelligence (
      ticker, company_name, headline, source_name, source_url,
      summary_th, sentiment, reading_priority, priority_reason, impact_level,
      portfolio_tag, related_portfolio_id, is_read, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `);

  let newArticlesCount = 0;
  let newIntelCount = 0;

  for (const article of articles) {
    // 1. Record seen article with timing stats
    insertSeen.run(
      article.slug,
      article.title,
      article.publishedAt,
      article.dayOfWeek,
      article.hour,
      JSON.stringify(article.tickers),
      article.isPremium
    );

    // 2. Process each ticker found in this article
    const tickers = article.tickers.length > 0 ? article.tickers : ['MARKET'];

    for (const ticker of tickers) {
      const existing = findIntel.get(ticker, article.title);
      if (existing) continue; // skip already recorded

      const portMapping = getTickerPortfolioTag(ticker, portfolioInfo);
      const isHolding = portMapping.tag !== 'global';

      // 3. Fetch supplementary sources (Yahoo + Finnhub)
      let supplementaryNews = [];
      if (ticker !== 'MARKET') {
        const [yhNews, fhNews] = await Promise.all([
          fetchYahooNews(ticker),
          fetchFinnhubNews(ticker)
        ]);
        supplementaryNews = [...yhNews, ...fhNews];
      }

      // 4. Synthesize with AI
      const aiResult = await synthesizeWithAI({
        ticker,
        headline: article.title,
        newsItems: supplementaryNews,
        portfolioTag: portMapping.tag,
        isHolding
      });

      // 5. Insert into DB
      insertIntel.run(
        ticker,
        ticker, // company name fallback
        article.title,
        'Beehiiv / Yahoo / Finnhub',
        article.url,
        aiResult.summary_th,
        aiResult.sentiment,
        aiResult.reading_priority,
        aiResult.priority_reason,
        aiResult.impact_level,
        portMapping.tag,
        portMapping.portfolioId
      );

      newIntelCount++;
      console.log(`[NewsRadar] Processed ${ticker} [${portMapping.tag.toUpperCase()}] -> Priority: ${aiResult.reading_priority}`);
    }

    newArticlesCount++;
  }

  return {
    success: true,
    articlesScanned: articles.length,
    newArticlesCount,
    newIntelCount,
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
