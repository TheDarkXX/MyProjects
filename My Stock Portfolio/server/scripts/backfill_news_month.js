import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Open database directly
const dbPath = path.join(__dirname, '../db/stock.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'd383nj1r01qlbdj3p8q0d383nj1r01qlbdj3p8qg';
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:18810/openai/v1/chat/completions';

// Portfolio IDs
const MAIN_PORT_ID = 'fcfdd1e0-bf53-4910-89e7-8ca2474d4c27'; // Doctorbank Growth
const TIGER_PORT_ID = '1c32059d-7847-41c8-a45f-311b3ade67b7'; // Tiger

export const TICKER_CONFIGS = {
  // 🏢 Main Port Holdings
  'NVDA': { name: 'NVIDIA Corporation', keywords: ['nvidia', 'nvda', 'blackwell', 'jensen'], tag: 'dual', portId: MAIN_PORT_ID, targetArticles: 6 },
  'CRWD': { name: 'CrowdStrike Holdings', keywords: ['crowdstrike', 'crwd', 'falcon'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 6 },
  'HIMS': { name: 'Hims & Hers Health', keywords: ['hims & hers', 'hims', 'semaglutide', 'glp-1'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 5 },
  'MELI': { name: 'MercadoLibre', keywords: ['mercadolibre', 'meli', 'mercado pago'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 5 },
  'META': { name: 'Meta Platforms', keywords: ['meta', 'facebook', 'instagram', 'zuckerberg', 'llama'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 6 },
  'RBRK': { name: 'Rubrik Inc', keywords: ['rubrik', 'rbrk', 'zero trust'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 5 },

  // 🐯 Tiger Port Holdings
  'SCHG': { name: 'Schwab U.S. Large-Cap Growth ETF', keywords: ['schg', 'schwab large-cap', 'growth etf', 'large-cap growth'], tag: 'tiger', portId: TIGER_PORT_ID, targetArticles: 4 },

  // 🐯 Tiger 5 จตุรเทพ Dynasty / Dual Targets
  'QQQM': { name: 'Invesco NASDAQ 100 ETF', keywords: ['qqqm', 'nasdaq 100', 'invesco nasdaq', 'nasdaq'], tag: 'tiger', portId: TIGER_PORT_ID, targetArticles: 4 },
  'TSM': { name: 'Taiwan Semiconductor Manufacturing', keywords: ['tsmc', 'tsm', 'taiwan semiconductor', 'wafer', 'foundry'], tag: 'dual', portId: MAIN_PORT_ID, targetArticles: 5 },
  'AVGO': { name: 'Broadcom Inc', keywords: ['broadcom', 'avgo', 'custom silicon', 'asic', 'hock tan'], tag: 'dual', portId: MAIN_PORT_ID, targetArticles: 5 },
  'VRT': { name: 'Vertiv Holdings Co', keywords: ['vertiv', 'vrt', 'liquid cooling', 'thermal management', 'data center cooling'], tag: 'dual', portId: MAIN_PORT_ID, targetArticles: 5 },

  // 🚀 Project 2X Main Targets
  'APH': { name: 'Amphenol Corporation', keywords: ['amphenol', 'aph', 'interconnect', 'fiber optic'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 4 },
  'KLAC': { name: 'KLA Corporation', keywords: ['kla corp', 'klac', 'process control', 'wafer inspection', 'semiconductor equipment'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 4 },
  'ANET': { name: 'Arista Networks', keywords: ['arista', 'anet', 'ethernet', 'cloud networking'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 4 },
  'STRL': { name: 'Sterling Infrastructure', keywords: ['sterling infrastructure', 'strl', 'e-infrastructure'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 4 },
  'ALAB': { name: 'Astera Labs', keywords: ['astera labs', 'astera', 'alab', 'pcie', 'cxl', 'connectivity'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 4 },
  'PLTR': { name: 'Palantir Technologies', keywords: ['palantir', 'pltr', 'aip', 'karp', 'defense ai', 'foundry'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 5 },
  'RKLB': { name: 'Rocket Lab USA', keywords: ['rocket lab', 'rklb', 'neutron', 'electron', 'peter beck', 'space launch'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 4 },
  'GOOGL': { name: 'Alphabet Inc', keywords: ['google', 'alphabet', 'googl', 'goog', 'gemini', 'waymo'], tag: 'main', portId: MAIN_PORT_ID, targetArticles: 5 },

  // ⭐ Top Watchlist
  'AMD': { name: 'Advanced Micro Devices', keywords: ['amd', 'lisa su', 'mi300', 'mi325', 'epyc'], tag: 'global', portId: null, targetArticles: 4 },
  'PANW': { name: 'Palo Alto Networks', keywords: ['palo alto networks', 'panw', 'cybersecurity platform', 'strata'], tag: 'global', portId: null, targetArticles: 4 },
  'MSFT': { name: 'Microsoft Corporation', keywords: ['microsoft', 'msft', 'azure', 'copilot', 'openai'], tag: 'global', portId: null, targetArticles: 5 },
  'AAPL': { name: 'Apple Inc', keywords: ['apple', 'aapl', 'iphone', 'apple intelligence', 'tim cook'], tag: 'global', portId: null, targetArticles: 5 },
  'TSLA': { name: 'Tesla Inc', keywords: ['tesla', 'tsla', 'robotaxi', 'fsd', 'musk', 'energy storage'], tag: 'global', portId: null, targetArticles: 5 }
};

const NOISE_REGEX = /forget.*buy|top \d+ stocks|3 stocks|5 stocks|7 stocks|10 stocks|better buy than|passive income|dividend king|millionaire|zacks rank|unusual options|penny stock|retirement|roth ira|why i sold|why i'm selling|if you invested/i;
const CATALYST_REGEX = /earnings|revenue|eps|guidance|beat|miss|upgrade|downgrade|price target|outperform|deal|contract|defense|partnership|sec|ftc|lawsuit|antitrust|ai|gpu|blackwell|cloud|datacenter|surge|plunge|jump|drop|breakout|record|acquisition|merger|investigation/i;

/**
 * Fetch company news from Finnhub for the past 30 days
 */
async function fetchCompanyNews(symbol, fromDate, toDate) {
  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[Finnhub] HTTP ${res.status} for ${symbol}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[Finnhub] Error fetching ${symbol}:`, err.message);
    return [];
  }
}

/**
 * Filter and rank articles by signal quality and time distribution
 */
function filterAndSelectArticles(articles, config) {
  const { keywords, targetArticles } = config;

  // 1. Initial filter
  const candidateArticles = [];
  for (const item of articles) {
    const headline = (item.headline || '').trim();
    const summary = (item.summary || '').trim();
    if (!headline || headline.length < 15) continue;

    // Filter out clickbait noise
    if (NOISE_REGEX.test(headline)) continue;

    const hlLower = headline.toLowerCase();
    const sumLower = summary.toLowerCase();

    // Must match at least one keyword
    const matchesKeyword = keywords.some(kw => hlLower.includes(kw) || new RegExp(`\\b${kw}\\b`, 'i').test(hlLower));
    if (!matchesKeyword && !keywords.some(kw => sumLower.includes(kw))) {
      continue;
    }

    // Calculate quality score
    let score = 50;
    if (matchesKeyword) score += 20;
    if (CATALYST_REGEX.test(headline)) score += 30;
    if (CATALYST_REGEX.test(summary)) score += 15;
    if (item.source && ['Reuters', 'Bloomberg', 'CNBC', 'The Wall Street Journal', 'Financial Times', 'MarketWatch', 'Barron\'s'].includes(item.source)) {
      score += 15;
    }

    candidateArticles.push({
      ...item,
      score,
      timestamp: item.datetime ? item.datetime * 1000 : Date.now()
    });
  }

  // Deduplicate by similar headline
  const seenHeadlines = new Set();
  const deduped = [];
  for (const item of candidateArticles) {
    const norm = item.headline.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (!seenHeadlines.has(norm)) {
      seenHeadlines.add(norm);
      deduped.push(item);
    }
  }

  // Sort by date descending
  deduped.sort((a, b) => b.timestamp - a.timestamp);

  if (deduped.length <= targetArticles) {
    return deduped;
  }

  // Divide into temporal buckets to cover the full 30 days evenly
  const buckets = 4; // 4 weeks
  const minTime = Math.min(...deduped.map(d => d.timestamp));
  const maxTime = Math.max(...deduped.map(d => d.timestamp));
  const range = (maxTime - minTime) || 1;
  const bucketSize = range / buckets;

  const bucketItems = Array.from({ length: buckets }, () => []);
  for (const item of deduped) {
    const idx = Math.min(buckets - 1, Math.floor((item.timestamp - minTime) / bucketSize));
    bucketItems[idx].push(item);
  }

  // Pick top scoring articles from each bucket
  const selected = [];
  const perBucket = Math.ceil(targetArticles / buckets);

  for (let i = buckets - 1; i >= 0; i--) { // latest to oldest
    bucketItems[i].sort((a, b) => b.score - a.score);
    const take = bucketItems[i].slice(0, perBucket);
    selected.push(...take);
  }

  // Fill remaining slots if any bucket was empty
  if (selected.length < targetArticles) {
    const remaining = deduped.filter(d => !selected.some(s => s.id === d.id));
    remaining.sort((a, b) => b.score - a.score);
    selected.push(...remaining.slice(0, targetArticles - selected.length));
  }

  // Sort final selection by date descending
  return selected.sort((a, b) => b.timestamp - a.timestamp).slice(0, targetArticles);
}

/**
 * Call AI Gateway to synthesize structured Thai intelligence
 */
async function synthesizeArticle(ticker, article, config) {
  const systemPrompt = `You are the Ruthless Investment Intelligence AI for My Stock Portfolio. Analyze the provided stock news headline and summary. Output ONLY a valid raw JSON object matching the requested schema. No markdown fences, no formatting backticks.`;

  const userMessage = `Stock Ticker: ${ticker} (${config.name})
Portfolio Status: ${config.tag.toUpperCase()}
Headline: "${article.headline}"
Summary: "${article.summary || article.headline}"
Publisher: "${article.source || 'News'}"

Schema:
{
  "summary_th": ["ประเด็นที่ 1 เป็นภาษาไทย กระชับ ตรงประเด็น เห็นภาพผลกระทบต่อธุรกิจ", "ประเด็นที่ 2 เป็นภาษาไทย"],
  "sentiment": "bullish" | "bearish" | "neutral",
  "reading_priority": "THE_MUST" | "GOOD_TO_KNOW" | "OPTIONAL",
  "priority_reason": "เหตุผลสั้นๆ 1 ประโยคภาษาไทย",
  "impact_level": "routine" | "significant" | "moat_breaker"
}`;

  try {
    const res = await fetch(AI_GATEWAY_URL, {
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
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || data.reply || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        let summaryTh = '';
        if (Array.isArray(parsed.summary_th)) {
          summaryTh = parsed.summary_th.map(line => line.startsWith('•') ? line : `• ${line}`).join('\n');
        } else if (typeof parsed.summary_th === 'string') {
          summaryTh = parsed.summary_th;
        }

        return {
          summary_th: summaryTh || `• ${article.headline}`,
          sentiment: ['bullish', 'bearish', 'neutral'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
          reading_priority: ['THE_MUST', 'GOOD_TO_KNOW', 'OPTIONAL'].includes(parsed.reading_priority) ? parsed.reading_priority : (config.tag !== 'global' ? 'GOOD_TO_KNOW' : 'OPTIONAL'),
          priority_reason: parsed.priority_reason || (config.tag !== 'global' ? `ข่าวสารหุ้นในพอร์ต ${ticker}` : `ความเคลื่อนไหวทั่วไป ${ticker}`),
          impact_level: ['routine', 'significant', 'moat_breaker'].includes(parsed.impact_level) ? parsed.impact_level : 'routine'
        };
      }
    }
  } catch (err) {
    console.warn(`[AI-Gateway] Fallback for ${ticker}:`, err.message);
  }

  // High quality fallback if AI gateway times out or is busy
  const hasCatalyst = CATALYST_REGEX.test(article.headline);
  return {
    summary_th: `• ${article.headline}\n• ${article.summary ? article.summary.slice(0, 180) + '...' : 'ติดตามรายละเอียดเพิ่มเติมจากต้นฉบับข่าว'}\n• แหล่งที่มา: ${article.source || 'Finnhub'}`,
    sentiment: /record|surge|beat|high|jump|boost|upgrade/i.test(article.headline) ? 'bullish' : (/plunge|drop|miss|cut|fall|probe|lawsuit/i.test(article.headline) ? 'bearish' : 'neutral'),
    reading_priority: hasCatalyst && config.tag !== 'global' ? 'THE_MUST' : (config.tag !== 'global' ? 'GOOD_TO_KNOW' : 'OPTIONAL'),
    priority_reason: hasCatalyst ? `ข่าวเหตุการณ์สำคัญและผลกระทบต่อ ${ticker}` : `อัปเดตธุรกิจและการดำเนินงาน ${ticker}`,
    impact_level: hasCatalyst ? 'significant' : 'routine'
  };
}

async function main() {
  console.log('================================================================');
  console.log('🚀 30-DAY HISTORICAL NEWS BACKFILL ENGINE');
  console.log('================================================================');

  // Compute 30-day window
  const now = new Date();
  const toDate = now.toISOString().split('T')[0];
  const fromDateObj = new Date(now.getTime() - (30 * 86400000));
  const fromDate = fromDateObj.toISOString().split('T')[0];

  console.log(`📅 Date Range: ${fromDate} to ${toDate} (Past 30 Days)`);
  console.log(`🎯 Total Tickers to Backfill: ${Object.keys(TICKER_CONFIGS).length}`);
  console.log(`🤖 AI Synthesis Engine: ${AI_GATEWAY_URL}\n`);

  const checkExisting = db.prepare(`
    SELECT id FROM news_intelligence WHERE ticker = ? AND (headline = ? OR source_url = ?)
  `);

  const insertStmt = db.prepare(`
    INSERT INTO news_intelligence (
      ticker, company_name, headline, source_name, source_url,
      summary_th, sentiment, reading_priority, priority_reason, impact_level,
      portfolio_tag, related_portfolio_id, relevance_score, triage_tags, is_read, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const [ticker, config] of Object.entries(TICKER_CONFIGS)) {
    console.log(`\n🔍 [${ticker}] Fetching 30-day news (${config.tag.toUpperCase()})...`);
    const rawArticles = await fetchCompanyNews(ticker, fromDate, toDate);
    console.log(`   Fetched ${rawArticles.length} raw articles from Finnhub`);

    const selected = filterAndSelectArticles(rawArticles, config);
    console.log(`   Filtered down to ${selected.length} high-signal articles (Target: ${config.targetArticles})`);

    let tickerInserted = 0;
    for (const article of selected) {
      // Check existing
      const existing = checkExisting.get(ticker, article.headline, article.url);
      if (existing) {
        totalSkipped++;
        continue;
      }

      // Format true historical date (YYYY-MM-DD HH:MM:SS)
      const pubDate = article.datetime 
        ? new Date(article.datetime * 1000).toISOString().replace('T', ' ').substring(0, 19)
        : new Date().toISOString().replace('T', ' ').substring(0, 19);

      // AI Synthesis
      const intel = await synthesizeArticle(ticker, article, config);

      // Determine relevance score
      let score = 75;
      if (config.tag === 'dual') score = 90;
      else if (config.tag === 'main' || config.tag === 'tiger') score = 85;
      if (intel.reading_priority === 'THE_MUST') score = Math.max(score, 92);

      const triageTags = [config.tag.toUpperCase(), intel.sentiment.toUpperCase(), intel.impact_level.toUpperCase()];

      try {
        insertStmt.run(
          ticker,
          config.name,
          article.headline,
          article.source || 'Finnhub',
          article.url,
          intel.summary_th,
          intel.sentiment,
          intel.reading_priority,
          intel.priority_reason,
          intel.impact_level,
          config.tag,
          config.portId,
          score,
          JSON.stringify(triageTags),
          pubDate
        );

        tickerInserted++;
        totalInserted++;
        console.log(`   ✨ [${pubDate.slice(0, 10)}] [${intel.reading_priority}] ${article.headline.slice(0, 65)}...`);
      } catch (insertErr) {
        console.error(`   ❌ DB Insert error for ${ticker}:`, insertErr.message);
      }

      // Small throttle to ensure smooth processing
      await new Promise(r => setTimeout(r, 250));
    }

    console.log(`   ✅ [${ticker}] Successfully added ${tickerInserted} new intel items`);
  }

  console.log('\n================================================================');
  console.log('🎉 30-DAY NEWS BACKFILL COMPLETE!');
  console.log(`📊 Summary: Inserted: ${totalInserted} | Skipped (Existing): ${totalSkipped}`);
  
  const stats = db.prepare(`
    SELECT ticker, portfolio_tag, count(*) as count 
    FROM news_intelligence 
    GROUP BY ticker, portfolio_tag 
    ORDER BY count DESC
  `).all();
  
  console.log('\n📈 News Intelligence Breakdown in DB:');
  console.table(stats);
  console.log('================================================================');
}

main().catch(err => {
  console.error('Fatal Backfill Error:', err);
  process.exit(1);
});
