import { db } from '../db/init.js';
import YahooFinance from 'yahoo-finance2';
import { 
  extractArticleWithReadability, 
  decodeGoogleNewsUrl, 
  generateEventFingerprint,
  WHITELIST_PUBLISHERS,
  BLACKLIST_PUBLISHERS 
} from './gfinSearcher.js';
import { DEFAULT_2X_STOCKS, DEFAULT_TIGER_2X_STOCKS } from './project2xEngine.js';
import { getPortfolioHoldings, getWatchlistTickers } from './newsRadar.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'd383nj1r01qlbdj3p8q0d383nj1r01qlbdj3p8qg';

// Large cap tickers with lower volatility threshold (3.5% vs 4.5%)
const LARGE_CAPS = new Set([
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSM', 'AVGO', 'COST', 'SCHG', 'QQQM'
]);

// Clickbait / Speculative Bloggers to strictly reject
const JUNK_TITLE_PATTERNS = [
  /why.*(?:down|up|falling|rising|drop|jump)\s*today/i,
  /is.*(?:a buy|worth buying|a bargain)/i,
  /should you buy/i,
  /better buy/i,
  /if you invested/i,
  /\b\d+\s*stocks?\s*to\s*buy\b/i,
  /millionaire-maker/i,
  /meet the.*stock/i,
  /forget.*buy/i,
  /top.*stocks?/i,
  /whale/i,
  /13f/i,
  /jepq/i,
  /dollar cost averaging/i
];

// Fundamental Catalyst Keywords (must match at least one for routine news)
const FUNDAMENTAL_CATALYSTS = [
  /earnings|revenue|guidance|quarterly results|q[1-4]\s*results|beat.*estimates|miss.*estimates/i,
  /antitrust|sec|investigation|lawsuit|subpoena|doj|legal|patent/i,
  /billion.*deal|contract|partnership|customer|order|expansion|supply agreement/i,
  /acquire|acquisition|merger|buyout|takeover|spin-off/i,
  /chip|gpu|datacenter|ai server|architecture|blackwell|rubin|quantum|fda approval/i,
  /price target|upgrade|downgrade|initiates coverage|outperform|overweight/i,
  /export curb|sanctions?|tariffs?|trade restrictions?|chips? act/i,
  /ceo|cfo|executive|layoffs?|restructuring/i
];

/**
 * Throttle helper to respect API limits
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get all tracked tickers:
 * 1. Active Portfolio Holdings (Doctorbank Growth + Tiger)
 * 2. Project 2X Targets from SQLite & defaults (Both Portfolios)
 * 3. Dynamic Watchlist Tickers
 */
export function getAllTrackedTickers() {
  const tickers = new Set();

  try {
    // 1. Current active holdings from transactions
    const holdings = getPortfolioHoldings();
    holdings.mainHoldings.forEach(s => tickers.add(s.toUpperCase()));
    holdings.tigerHoldings.forEach(s => tickers.add(s.toUpperCase()));
  } catch (err) {
    console.warn('[DirectFeed] Failed to get portfolio holdings:', err.message);
  }

  try {
    // 2. Project 2X share quotas across all portfolios from database
    const p2xRows = db.prepare('SELECT DISTINCT symbol FROM project2x_share_quotas').all();
    p2xRows.forEach(r => {
      if (r.symbol) tickers.add(r.symbol.toUpperCase());
    });
  } catch (err) {
    console.warn('[DirectFeed] Failed to read project2x_share_quotas:', err.message);
  }

  // 3. Project 2X Defaults fallback (ensures new targets like CLS, APH, ANET are always included)
  DEFAULT_2X_STOCKS.forEach(s => tickers.add(s.symbol.toUpperCase()));
  DEFAULT_TIGER_2X_STOCKS.forEach(s => tickers.add(s.symbol.toUpperCase()));

  try {
    // 4. Watchlist tickers
    const watchlist = getWatchlistTickers();
    watchlist.forEach(s => tickers.add(s.toUpperCase()));
  } catch (err) {
    console.warn('[DirectFeed] Failed to read watchlist tickers:', err.message);
  }

  // Clean up non-stock symbols
  tickers.delete('CASH');
  tickers.delete('THB');
  tickers.delete('USD');

  return Array.from(tickers).sort();
}

/**
 * Detect Intraday / Daily Price Shocks for tracked tickers
 * Triggers when large caps swing >= 3.5% or growth/mid caps swing >= 4.5%
 */
export async function detectPriceShocks(tickers) {
  const shockMap = new Map();
  if (!tickers || tickers.length === 0) return shockMap;

  try {
    const quotes = await yahooFinance.quote(tickers).catch(err => {
      console.warn('[DirectFeed] Quote fetch error:', err.message);
      return [];
    });

    const quoteList = Array.isArray(quotes) ? quotes : [quotes].filter(Boolean);

    for (const q of quoteList) {
      const sym = (q.symbol || '').toUpperCase();
      const changePct = Number(q.regularMarketChangePercent);
      if (isNaN(changePct)) continue;

      const isLarge = LARGE_CAPS.has(sym);
      const threshold = isLarge ? 3.5 : 4.5;

      if (Math.abs(changePct) >= threshold) {
        shockMap.set(sym, {
          symbol: sym,
          price: q.regularMarketPrice,
          changePercent: Number(changePct.toFixed(2)),
          isShock: true,
          direction: changePct > 0 ? 'surge' : 'plunge',
          threshold
        });
      }
    }
  } catch (err) {
    console.warn('[DirectFeed] Price shock detection warning:', err.message);
  }

  return shockMap;
}

/**
 * Filter news items with strict Catalyst & Noise Guard
 */
export function filterDirectCatalysts(rawItems, ticker, shockInfo) {
  const tickerUpper = ticker.toUpperCase();
  const tickerRegex = new RegExp(`\\b${tickerUpper}\\b`, 'i');

  const filtered = [];

  for (const item of rawItems) {
    const title = (item.title || item.headline || '').trim();
    if (!title || title.length < 15) continue;

    const sourceLower = (item.source || item.publisher || '').toLowerCase();

    // 1. Blacklist Publisher Check
    if (BLACKLIST_PUBLISHERS.some(bp => sourceLower.includes(bp))) {
      continue;
    }

    // 2. Blacklist Clickbait Title Check
    if (JUNK_TITLE_PATTERNS.some(p => p.test(title))) {
      continue;
    }

    // 3. Primary Subject Check: Ticker or Company name MUST be relevant
    const isTickerInTitle = tickerRegex.test(title);
    if (!isTickerInTitle && !shockInfo?.isShock) {
      // If ticker not directly in title, skip unless it is a shock investigation
      continue;
    }

    // 4. Fundamental Catalyst or Price Shock Check
    let isCatalyst = false;
    let catalystTag = null;

    if (shockInfo?.isShock) {
      isCatalyst = true;
      catalystTag = `PRICE_SHOCK_${shockInfo.direction.toUpperCase()}_${Math.abs(shockInfo.changePercent)}%`;
    } else {
      for (const pattern of FUNDAMENTAL_CATALYSTS) {
        if (pattern.test(title)) {
          isCatalyst = true;
          catalystTag = 'FUNDAMENTAL_CATALYST';
          break;
        }
      }
    }

    if (isCatalyst) {
      const isWhitelisted = WHITELIST_PUBLISHERS.some(wp => sourceLower.includes(wp)) ? 1 : 0;
      filtered.push({
        ...item,
        title,
        catalystTag,
        isWhitelisted,
        score: (isWhitelisted ? 50 : 20) + (shockInfo?.isShock ? 30 : 0)
      });
    }
  }

  // Sort: highest score first
  filtered.sort((a, b) => b.score - a.score);
  return filtered;
}

/**
 * Fetch direct news for a single ticker via Finnhub & Yahoo
 */
export async function fetchDirectNewsForTicker(ticker, shockInfo = null) {
  const candidates = [];
  const today = new Date().toISOString().split('T')[0];
  const past = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];

  // 1. Finnhub Company News API
  try {
    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}&from=${past}&to=${today}&token=${FINNHUB_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data.slice(0, 15)) {
          candidates.push({
            title: item.headline || '',
            link: item.url || '',
            publisher: item.source || 'Finnhub',
            summary: item.summary || '',
            publishedTime: item.datetime ? new Date(item.datetime * 1000).toISOString() : null,
            provider: 'finnhub'
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[DirectFeed] Finnhub fetch error for ${ticker}:`, err.message);
  }

  await sleep(150); // API throttle

  // 2. Yahoo Finance Search API
  try {
    const yfRes = await yahooFinance.search(ticker, { newsCount: 5 }).catch(() => null);
    if (yfRes && Array.isArray(yfRes.news)) {
      for (const n of yfRes.news) {
        candidates.push({
          title: n.title || '',
          link: n.link || '',
          publisher: n.publisher || 'Yahoo Finance',
          summary: '',
          publishedTime: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
          provider: 'yahoo_finance'
        });
      }
    }
  } catch (err) {
    console.warn(`[DirectFeed] Yahoo search error for ${ticker}:`, err.message);
  }

  // 3. Price Shock Targeted Google News Query (if stock is swinging wildly)
  if (shockInfo?.isShock) {
    try {
      const dirTerm = shockInfo.direction === 'surge' ? 'soaring OR surging OR rally OR jumps' : 'tumbling OR plunging OR selloff OR drops';
      const q = `"${ticker}" stock (${dirTerm}) when:2d`;
      const gUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
      const gRes = await fetch(gUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9'
        },
        signal: AbortSignal.timeout(8000)
      });
      if (gRes.ok) {
        const xml = await gRes.text();
        const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
        for (const blockMatch of itemBlocks.slice(0, 5)) {
          const block = blockMatch[1];
          const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
            ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')?.trim() || '';
          const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
          const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1]
            ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')?.trim() || 'Google News';

          if (rawTitle && link) {
            candidates.push({
              title: rawTitle,
              link,
              publisher: source,
              summary: '',
              publishedTime: new Date().toISOString(),
              provider: 'google_news_shock'
            });
          }
        }
      }
    } catch (gErr) {
      console.warn(`[DirectFeed] Google Shock query error for ${ticker}:`, gErr.message);
    }
  }

  // Apply strict filtering
  const passed = filterDirectCatalysts(candidates, ticker, shockInfo);
  return passed;
}

/**
 * Fetch Macro Pulse News (Fed, CPI, Inflation, Rates) from Tier-1 Sources
 */
export async function fetchMacroPulseNews() {
  const macroQuery = `(Federal Reserve OR "interest rate" OR "CPI inflation" OR FOMC) (Reuters OR Bloomberg OR CNBC OR "Wall Street Journal") when:2d`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(macroQuery)}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) return [];
    const xml = await res.text();
    const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    const items = [];

    for (const bMatch of itemBlocks.slice(0, 10)) {
      const block = bMatch[1];
      const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
        ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')?.trim() || '';
      const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
      const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1]
        ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')?.trim() || 'Wire';

      const sourceLower = source.toLowerCase();
      // Only Tier-1
      const isTier1 = ['reuters', 'bloomberg', 'cnbc', 'wsj', 'wall street journal', 'financial times'].some(w => sourceLower.includes(w));
      if (!isTier1) continue;

      // Filter out pure gossip / opinion
      if (JUNK_TITLE_PATTERNS.some(p => p.test(rawTitle))) continue;

      items.push({
        ticker: 'MACRO',
        title: rawTitle,
        link,
        publisher: source,
        summary: '',
        publishedTime: new Date().toISOString(),
        provider: 'macro_tier1',
        catalystTag: 'MACRO_PULSE',
        isWhitelisted: 1
      });
    }

    return items;
  } catch (err) {
    console.warn('[DirectFeed] Macro pulse fetch error:', err.message);
    return [];
  }
}

/**
 * Extract full content for a candidate article with automatic fallback
 */
export async function extractArticleContentWithFallback(candidate) {
  let targetUrl = candidate.link;

  // 1. Resolve Finnhub redirect if necessary
  if (targetUrl.includes('finnhub.io/api/news?id=')) {
    try {
      const headRes = await fetch(targetUrl, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      const loc = headRes.headers.get('location');
      if (loc) targetUrl = loc;
    } catch (e) {}
  } else if (candidate.provider?.includes('google_news')) {
    targetUrl = await decodeGoogleNewsUrl(targetUrl);
  }

  let fullText = null;
  let wordCount = 0;

  try {
    const extracted = await extractArticleWithReadability(targetUrl);
    if (extracted && extracted.content && extracted.wordCount >= 120) {
      fullText = extracted.content;
      wordCount = extracted.wordCount;
    }
  } catch (err) {
    console.warn(`[DirectFeed] Readability extraction failed for ${targetUrl}:`, err.message);
  }

  // Fallback to summary if full text extraction fails
  if (!fullText || wordCount < 120) {
    if (candidate.summary && candidate.summary.length >= 50) {
      fullText = `${candidate.title}\n\n${candidate.summary}\n\n(Source Summary from ${candidate.publisher})`;
      wordCount = fullText.split(/\s+/).filter(Boolean).length;
    } else {
      fullText = `${candidate.title}\n\n(Reported by ${candidate.publisher})`;
      wordCount = fullText.split(/\s+/).filter(Boolean).length;
    }
  }

  return {
    fullText,
    wordCount,
    resolvedUrl: targetUrl
  };
}

/**
 * Main Direct Engine Orchestrator:
 * Gathers news across Holdings + Project 2X Targets + Price Shocks + Macro Pulse
 */
export async function collectDirectIntelligenceCandidates() {
  const trackedTickers = getAllTrackedTickers();
  console.log(`[DirectFeed] 🎯 Scanning Direct Feeds for ${trackedTickers.length} Tracked Tickers (Holdings + Project 2X)...`);

  // 1. Detect Price Shocks first
  const shockMap = await detectPriceShocks(trackedTickers);
  if (shockMap.size > 0) {
    console.log(`[DirectFeed] 🚨 Price Shocks Detected for ${shockMap.size} tickers:`, Array.from(shockMap.keys()));
  }

  // 2. Fetch Direct News per Ticker (Parallel with settle guard)
  const tickerResults = await Promise.allSettled(
    trackedTickers.map(async (ticker) => {
      const shockInfo = shockMap.get(ticker) || null;
      const news = await fetchDirectNewsForTicker(ticker, shockInfo);
      return { ticker, news, shockInfo };
    })
  );

  const selectedArticles = [];
  const seenFingerprints = new Set();

  for (const res of tickerResults) {
    if (res.status !== 'fulfilled') continue;
    const { ticker, news, shockInfo } = res.value;
    if (!news || news.length === 0) continue;

    // Pick top 1 story per ticker (or top 2 if there's a price shock)
    const maxStories = shockInfo?.isShock ? 2 : 1;
    const bestStories = news.slice(0, maxStories);

    for (const story of bestStories) {
      const fingerprint = generateEventFingerprint(ticker, story.title);

      // Check 72h deduplication in SQLite
      const existing = db.prepare(`
        SELECT id FROM news_intelligence 
        WHERE event_fingerprint = ? AND created_at >= datetime('now', '-3 days')
        LIMIT 1
      `).get(fingerprint);

      if (existing || seenFingerprints.has(fingerprint)) {
        continue;
      }

      seenFingerprints.add(fingerprint);
      selectedArticles.push({
        ticker,
        title: story.title,
        link: story.link,
        publisher: story.publisher,
        summary: story.summary,
        publishedTime: story.publishedTime,
        provider: story.provider,
        catalystTag: story.catalystTag,
        shockInfo,
        fingerprint
      });
    }
  }

  // 3. Collect Macro Pulse News (Top 1-2 stories)
  console.log('[DirectFeed] 🌐 Scanning Tier-1 Macro Pulse (Fed / CPI / Rates)...');
  const macroItems = await fetchMacroPulseNews();
  for (const mItem of macroItems.slice(0, 2)) {
    const fingerprint = generateEventFingerprint('MACRO', mItem.title);
    const existing = db.prepare(`
      SELECT id FROM news_intelligence 
      WHERE event_fingerprint = ? AND created_at >= datetime('now', '-3 days')
      LIMIT 1
    `).get(fingerprint);

    if (existing || seenFingerprints.has(fingerprint)) continue;

    seenFingerprints.add(fingerprint);
    selectedArticles.push({
      ticker: 'MACRO',
      title: mItem.title,
      link: mItem.link,
      publisher: mItem.publisher,
      summary: mItem.summary,
      publishedTime: mItem.publishedTime,
      provider: 'macro_tier1',
      catalystTag: 'MACRO_PULSE',
      shockInfo: null,
      fingerprint
    });
  }

  console.log(`[DirectFeed] ✅ Total Direct Candidates passed all filters: ${selectedArticles.length}`);
  return selectedArticles;
}
