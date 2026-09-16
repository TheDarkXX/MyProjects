import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import crypto from 'crypto';
import https from 'node:https';
import http from 'node:http';
import { decodeGoogleNewsUrl as npmDecodeGoogleNewsUrl } from 'decode-google-news-url';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://127.0.0.1:18810/openai/v1/chat/completions';
const BRAIN_GATEWAY_URL = process.env.BRAIN_GATEWAY_URL || 'https://brain.doctorbankonline.com/api/ai/chat';
const BRAIN_GATEWAY_TOKEN = process.env.BRAIN_GATEWAY_TOKEN || 'ZIvyWp4BTqcX2Gm1aDHR7lwz0i8PrVqug5KWBX53wqI';

// Whitelisted Tier-1 Financial Publishers
export const WHITELIST_PUBLISHERS = [
  'reuters', 'bloomberg', 'cnbc', 'wsj', 'wall street journal',
  'marketwatch', 'barron', 'financial times', 'ft.com', 'yahoo finance',
  'pr newswire', 'business wire', 'globenewswire', 'techcrunch',
  'the verge', 'ars technica', 'fortune', 'forbes', 'investing.com',
  'the information', 'nikkei', 'scmp', 'associated press', 'ap news'
];

// Noise / Speculative Bloggers to Block
export const BLACKLIST_PUBLISHERS = [
  'motley fool', 'fool.com', 'investorplace', 'zacks', 'tipranks',
  '247wallst', 'seeking alpha contributor', 'benzinga clickbait',
  'thestreet', 'dailyfx'
];

/**
 * Clean Thai/English headline into core search keywords for Google/Yahoo RSS
 */
export function extractSearchKeywords(headline, ticker) {
  if (!headline) return ticker || '';
  
  // Remove common noisy Thai prefix/suffix phrases
  let clean = headline
    .replace(/\[.*?\]/g, '')
    .replace(/(?:พุ่ง|ร่วง|ดิ่ง|บวก|ลบ|ทะยาน|ทรุด|ดิ่งเหว|กระฉูด)\s*\d+%/gi, '')
    .replace(/(?:จับตา|ด่วน|เผย|ชี้|เตือน|เซียน|กูรู|เปิดโผ|วิเคราะห์|สรุปข่าว|หุ้นเด็ด)/gi, '')
    .replace(/[^\w\s\u0E00-\u0E7F]/g, ' ')
    .trim();

  // Pick top words
  const words = clean.split(/\s+/).filter(w => w.length > 2 && w.toUpperCase() !== ticker.toUpperCase());
  const selectedWords = words.slice(0, 5).join(' ');
  
  return `${ticker} ${selectedWords}`.trim();
}

/**
 * Use AI to translate and expand Thai headlines into precise English search queries
 */
export async function generateSmartSearchQuery(headline, ticker) {
  if (!headline) return ticker || '';
  const isThai = /[\u0E00-\u0E7F]/.test(headline);
  
  if (!isThai) {
    return extractSearchKeywords(headline, ticker);
  }

  const prompt = `You are a financial news researcher. Translate this Thai headline into a VERY BROAD English search query (max 2-3 words). Use ONLY the Ticker and 1-2 core English nouns (e.g., "AVGO AI", "Broadcom revenue"). Do NOT translate clickbait adjectives or full sentences.
Headline: "${headline}"
Ticker: "${ticker}"
Return ONLY the raw string search query. No quotes. No JSON.`;

  try {
    let reply = '';
    const res = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.6-terra',
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(8000)
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || data.reply || '';
    } else {
      const fbRes = await fetch(BRAIN_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BRAIN_GATEWAY_TOKEN}`
        },
        body: JSON.stringify({
          model: 'gpt-5.6-terra',
          message: prompt
        }),
        signal: AbortSignal.timeout(8000)
      }).catch(() => null);
      if (fbRes && fbRes.ok) {
        const fbData = await fbRes.json();
        reply = fbData.reply || fbData.choices?.[0]?.message?.content || '';
      }
    }
    
    if (reply && reply.trim().length > 3) {
      return reply.replace(/["']/g, '').trim();
    }
  } catch (err) {
    console.warn('[gfin] AI Query generation failed, using fallback:', err.message);
  }

  return extractSearchKeywords(headline, ticker);
}

/**
 * Generate normalized event fingerprint for deduplication (72h window)
 */
export function generateEventFingerprint(ticker, headline) {
  const normTicker = (ticker || 'GLOBAL').toUpperCase().trim();
  const clean = (headline || '')
    .toLowerCase()
    .replace(/\[.*?\]/g, '')
    .replace(/[^a-z0-9\u0E00-\u0E7F]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .sort()
    .slice(0, 6)
    .join('_');

  const raw = `${normTicker}:${clean}`;
  return crypto.createHash('md5').update(raw).digest('hex').slice(0, 16);
}

/**
 * Search Google News RSS with temporal filtering (last 48-72h)
 */
export async function searchGoogleNewsRSS(ticker, headline) {
  try {
    const query = await generateSmartSearchQuery(headline, ticker);
    console.log(`[gfin] 🔎 Smart Query for [${ticker}]: "${query}"`);
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) return [];
    const xml = await res.text();

    const items = [];
    const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    const now = Date.now();
    const maxAgeMs = 14 * 24 * 60 * 60 * 1000; // 14 Days

    for (const blockMatch of itemBlocks) {
      if (items.length >= 15) break;
      const block = blockMatch[1];
      const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
        ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        ?.replace(/&#x27;/g, "'")
        ?.replace(/&quot;/g, '"')
        ?.replace(/&amp;/g, '&')
        ?.trim() || '';
      const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
      const pubDateStr = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';
      const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1]
        ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        ?.trim() || 'Google News';

      if (!rawTitle || !link) continue;

      // Temporal Freshness Check
      const pubTime = new Date(pubDateStr).getTime();
      const ageHours = !isNaN(pubTime) ? (now - pubTime) / (3600 * 1000) : 0;
      if (!isNaN(pubTime) && (now - pubTime) > maxAgeMs) {
        continue; // Discard articles older than 72 hours
      }

      // Publisher Whitelist / Blacklist Filter
      const sourceLower = source.toLowerCase();
      const isBlacklisted = BLACKLIST_PUBLISHERS.some(bp => sourceLower.includes(bp));
      if (isBlacklisted) continue;

      const isWhitelisted = WHITELIST_PUBLISHERS.some(wp => sourceLower.includes(wp));

      items.push({
        title: rawTitle,
        link,
        source,
        pubDate: pubDateStr,
        ageHours: Math.round(ageHours),
        isWhitelisted: isWhitelisted ? 1 : 0,
        provider: 'google_news'
      });
    }

    // Sort: Whitelisted first, then freshest
    items.sort((a, b) => (b.isWhitelisted - a.isWhitelisted) || (a.ageHours - b.ageHours));
    return items;
  } catch (err) {
    console.warn(`[gfin] Google News search error for ${ticker}:`, err.message);
    return [];
  }
}

/**
 * Search Yahoo Finance RSS for company headlines
 */
export async function searchYahooNewsRSS(ticker) {
  try {
    const url = `https://finance.yahoo.com/rss/headline?s=${encodeURIComponent(ticker)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) return [];
    const xml = await res.text();

    const items = [];
    const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
    const now = Date.now();
    const maxAgeMs = 14 * 24 * 60 * 60 * 1000; // 14 Days

    for (const blockMatch of itemBlocks) {
      if (items.length >= 15) break;
      const block = blockMatch[1];
      const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
        ?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        ?.replace(/&#x27;/g, "'")
        ?.replace(/&quot;/g, '"')
        ?.replace(/&amp;/g, '&')
        ?.trim() || '';
      const link = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() || '';
      const pubDateStr = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';

      if (!rawTitle || !link) continue;

      const pubTime = new Date(pubDateStr).getTime();
      const ageHours = !isNaN(pubTime) ? (now - pubTime) / (3600 * 1000) : 0;
      if (!isNaN(pubTime) && (now - pubTime) > maxAgeMs) {
        continue;
      }

      items.push({
        title: rawTitle,
        link,
        source: 'Yahoo Finance',
        pubDate: pubDateStr,
        ageHours: Math.round(ageHours),
        isWhitelisted: 1,
        provider: 'yahoo_rss'
      });
    }

    return items;
  } catch (err) {
    console.warn(`[gfin] Yahoo RSS error for ${ticker}:`, err.message);
    return [];
  }
}

/**
 * Fetch HTML supporting large headers (128KB) and automatic redirects (up to 5 hops)
 */
export function fetchHtmlWithLargeHeaders(targetUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    try {
      const isHttps = targetUrl.startsWith('https:');
      const client = isHttps ? https : http;

      const req = client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        maxHeaderSize: 128 * 1024,
        timeout: 10000
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
          const nextUrl = new URL(res.headers.location, targetUrl).toString();
          return resolve(fetchHtmlWithLargeHeaders(nextUrl, maxRedirects - 1));
        }

        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode || 200, html: data, resolvedUrl: targetUrl });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout fetching ${targetUrl}`));
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Extract clean full article content using Mozilla Readability + Linkedom
 * With fallback to Jina Reader and clean paragraph extraction
 */
export async function extractArticleWithReadability(url) {
  if (!url) return null;

  // Step 1: Direct Fetch with 128KB Header Support + Readability
  try {
    const { status, html, resolvedUrl } = await fetchHtmlWithLargeHeaders(url);

    if (status >= 200 && status < 300 && html && html.length > 500) {
      const { document } = parseHTML(html);
      const reader = new Readability(document, { charThreshold: 200 });
      const parsed = reader.parse();

      if (parsed && parsed.textContent && parsed.textContent.length > 500) {
        const cleanText = parsed.textContent
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n/g, '\n\n')
          .trim();
        const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

        if (wordCount >= 150) {
          return {
            title: parsed.title || '',
            byline: parsed.byline || '',
            content: cleanText.slice(0, 12000),
            wordCount,
            extractionMethod: 'mozilla_readability',
            resolvedUrl: resolvedUrl || url
          };
        }
      }

      // Secondary HTML Paragraph Extraction Fallback
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let match;
      const paragraphs = [];
      while ((match = pRegex.exec(html)) !== null) {
        const pText = match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim();
        if (pText.length > 40 && !pText.includes('cookie') && !pText.includes('Privacy') && !pText.includes('Rights Reserved')) {
          paragraphs.push(pText);
        }
      }

      if (paragraphs.length >= 3) {
        const joinedText = paragraphs.join('\n\n');
        const wordCount = joinedText.split(/\s+/).filter(Boolean).length;
        return {
          title: '',
          byline: '',
          content: joinedText.slice(0, 10000),
          wordCount,
          extractionMethod: 'paragraph_fallback',
          resolvedUrl: resolvedUrl || url
        };
      }
    }
  } catch (directErr) {
    console.warn(`[gfin] Direct extraction warning for ${url}:`, directErr.message);
  }

  // Step 2: Jina Reader Fallback (bypasses heavy cloudflare / JS hurdles)
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const jinaRes = await fetch(jinaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/plain'
      },
      signal: AbortSignal.timeout(9000)
    });

    if (jinaRes.ok) {
      const text = await jinaRes.text();
      if (text && text.length > 400 && !text.includes('Rate limit exceeded')) {
        // Clean markdown headers / footers
        const cleanText = text.replace(/\[.*?\]\(.*?\)/g, '').replace(/http\S+/g, '').trim();
        const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
        if (wordCount >= 120) {
          return {
            title: '',
            byline: '',
            content: cleanText.slice(0, 10000),
            wordCount,
            extractionMethod: 'jina_reader',
            resolvedUrl: url
          };
        }
      }
    }
  } catch (jinaErr) {
    console.warn(`[gfin] Jina reader fallback warning:`, jinaErr.message);
  }

  return null;
}

/**
 * Check Semantic Relevance between Seed Headline and Candidate Article
 * Returns { isRelevant: boolean, relevanceScore: number (0-100), reason: string }
 */
export async function checkSemanticRelevance({ ticker, seedHeadline, candidateTitle, candidateSnippet }) {
  if (!seedHeadline || !candidateSnippet) {
    return { isRelevant: false, relevanceScore: 0, reason: 'Missing content for relevance check' };
  }

  const prompt = `You are an exacting financial editor. Determine if Candidate Article is reporting on the EXACT SAME fundamental corporate event or story as the Seed Headline.
Seed Headline: "${seedHeadline}"
Ticker: "${ticker}"
Candidate Title: "${candidateTitle}"
Candidate Text Snippet: "${(candidateSnippet || '').slice(0, 1200)}"

Respond ONLY with raw JSON:
{
  "is_same_event": true | false,
  "relevance_score": 0-100,
  "reason": "Short reason in English"
}`;

  try {
    let reply = '';
    const res = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-5.6-terra',
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: AbortSignal.timeout(12000)
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || data.reply || '';
    } else {
      const fbRes = await fetch(BRAIN_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BRAIN_GATEWAY_TOKEN}`
        },
        body: JSON.stringify({
          model: 'gpt-5.6-terra',
          message: prompt
        }),
        signal: AbortSignal.timeout(12000)
      }).catch(() => null);

      if (fbRes && fbRes.ok) {
        const fbData = await fbRes.json();
        reply = fbData.reply || fbData.choices?.[0]?.message?.content || '';
      }
    }

    if (reply) {
      const match = reply.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const score = Math.max(0, Math.min(100, Number(parsed.relevance_score) || 0));
        return {
          isRelevant: parsed.is_same_event === true && score >= 65,
          relevanceScore: score,
          reason: parsed.reason || 'Semantic relevance evaluated'
        };
      }
    }
  } catch (err) {
    console.warn('[gfin] Semantic check error, using keyword overlap fallback:', err.message);
  }

  // Fallback: Heuristic Keyword Overlap
  const cleanSeed = seedHeadline.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  const cleanText = `${candidateTitle} ${candidateSnippet}`.toLowerCase();
  let matches = 0;
  for (const w of cleanSeed) {
    if (cleanText.includes(w)) matches++;
  }
  const overlapRatio = cleanSeed.length > 0 ? matches / cleanSeed.length : 0;
  const heuristicScore = Math.round(overlapRatio * 100);
  return {
    isRelevant: heuristicScore >= 40,
    relevanceScore: heuristicScore,
    reason: `Heuristic keyword overlap: ${heuristicScore}%`
  };
}

/**
 * Decode Google News RSS wrapper tokens into direct publisher URLs
 * Using external decode-google-news-url package for robustness against Google's changes
 */
export async function decodeGoogleNewsUrl(sourceUrl) {
  try {
    if (!sourceUrl.includes('news.google.com/rss/articles/')) return sourceUrl;
    
    const decodedUrl = await npmDecodeGoogleNewsUrl(sourceUrl);
    if (decodedUrl && decodedUrl.startsWith('http')) {
      return decodedUrl;
    }
    return sourceUrl;
  } catch (err) {
    console.warn('[gfin] Google News URL Decode Error:', err.message);
    return sourceUrl;
  }
}

/**
 * Main Autonomous Orchestrator:
 * Hunt and ingest full article story for paywalled/short Beehiiv headline
 */
export async function fetchFullStoryForHeadline({ ticker, headline, beehiivUrl }) {
  console.log(`[gfin] 🔎 Hunting full story for [${ticker}]: "${headline}"`);

  // Step 1: Collect Candidate Articles from Google News & Yahoo RSS
  const [googleCandidates, yahooCandidates] = await Promise.all([
    searchGoogleNewsRSS(ticker, headline),
    searchYahooNewsRSS(ticker)
  ]);

  const allCandidates = [...googleCandidates, ...yahooCandidates];
  if (allCandidates.length === 0) {
    console.log(`[gfin] No candidates found on Google/Yahoo RSS for [${ticker}]`);
    return null;
  }

  console.log(`[gfin] Found ${allCandidates.length} potential candidate articles from RSS`);

  // Count distinct publishers reporting on this ticker/event for consensus
  const publisherSet = new Set(allCandidates.map(c => c.source));
  const consensusCount = Math.max(1, publisherSet.size);

  // Step 2: Iterate and Extract Articles with Semantic Guard
  const validArticles = [];
  for (const candidate of allCandidates.slice(0, 12)) {
    console.log(`[gfin] Inspecting candidate: [${candidate.source}] "${candidate.title}"`);

    // Decode Google News URL if needed
    const directUrl = candidate.provider === 'google_news' 
      ? await decodeGoogleNewsUrl(candidate.link)
      : candidate.link;
      
    if (directUrl !== candidate.link) {
      console.log(`[gfin] Decoded Google wrapper to: ${directUrl}`);
    }

    const extracted = await extractArticleWithReadability(directUrl);
    if (!extracted || !extracted.content || extracted.wordCount < 150) {
      console.log(`[gfin] Skipped: Insufficient content (${extracted?.wordCount || 0} words)`);
      continue;
    }

    // Step 3: Semantic Relevance Guard
    const semantic = await checkSemanticRelevance({
      ticker,
      seedHeadline: headline,
      candidateTitle: candidate.title,
      candidateSnippet: extracted.content.slice(0, 1000)
    });

    console.log(`[gfin] Semantic Guard for "${candidate.title}": Score ${semantic.relevanceScore}/100 (Relevant: ${semantic.isRelevant})`);

    if (semantic.isRelevant) {
      validArticles.push({ extracted, candidate, semantic });
      if (validArticles.length >= 7) {
        console.log(`[gfin] Reached maximum consensus (7 articles). Stopping scan.`);
        break;
      }
    }
  }

  if (validArticles.length > 0) {
    const combinedText = validArticles.map((a, i) => `--- SOURCE ${i+1}: ${a.candidate.source} ---\n${a.extracted.content}`).join('\n\n');
    const totalWords = validArticles.reduce((sum, a) => sum + a.extracted.wordCount, 0);
    const avgScore = Math.round(validArticles.reduce((sum, a) => sum + a.semantic.relevanceScore, 0) / validArticles.length);
    const combinedSources = validArticles.map(a => a.candidate.source).join(' + ');

    return {
      fullText: combinedText,
      wordCount: totalWords,
      sourceName: combinedSources,
      sourceUrl: validArticles[0].extracted.resolvedUrl || validArticles[0].candidate.link,
      contentSource: 'multi_source_aggregated',
      relevanceScore: avgScore,
      sourceCount: validArticles.length,
      extractionMethod: 'multi_source_aggregated'
    };
  }

  console.log(`[gfin] No candidates passed the Semantic Relevance Gate for [${ticker}]`);
  return null;
}
