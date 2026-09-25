/**
 * Laya Fast Gatekeeper Client (Tier-1 Binary Triage)
 * Connects to local Laya HTTP daemon at http://127.0.0.1:5055/triage
 * Fails gracefully to heuristic rules if Laya daemon is not running.
 */

const LAYA_GATEWAY_URL = process.env.LAYA_GATEWAY_URL || 'http://127.0.0.1:5055';

// Fast heuristic fallback patterns (Used when Laya daemon is unreachable)
const NOISE_HEURISTIC_PATTERNS = [
  /why.*(?:down|up|falling|rising|drop|jump)\s*today/i,
  /is.*(?:a buy|worth buying|a bargain)/i,
  /should you buy/i,
  /better buy/i,
  /if you invested/i,
  /\b\d+\s*stocks?\s*to\s*buy\b/i,
  /millionaire-maker/i,
  /forget.*buy/i,
  /top.*stocks?/i,
  /trades at \d/i,
  /clears.*trend template/i,
  /opinion|columnist|motley fool|seeking alpha contributor/i,
  /13f|whale|jepq|dollar cost averaging/i,
  /มหาเศรษฐี|เกลี้ยงพอร์ต|ขายหมดพอร์ต|อัดเงินซื้อ|เซียน|พอร์ตแตก|สลับพอร์ต/i
];

const MACRO_HEURISTIC_PATTERNS = [
  /\b(?:fed|federal reserve|powell|interest rate|rate cut|rate hike|inflation|cpi|pce|recession|tariff|tariffs|treasury|bond yield|fomc|gdp)\b/i,
  /เฟด|พาวเวลล์|ขึ้นดอกเบี้ย|ลดดอกเบี้ย|เงินเฟ้อ|เศรษฐกิจถดถอย|กำแพงภาษี|บอนด์ยีลด์/i
];

/**
 * Check if Laya daemon is currently healthy
 */
export async function isLayaAvailable() {
  try {
    const res = await fetch(`${LAYA_GATEWAY_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(1500)
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Run batch triage through Laya Gatekeeper
 * @param {Array<{ id: string|number, ticker: string, title: string }>} items
 * @returns {Promise<Map<string|number, { is_noise: boolean, is_macro: boolean, noise_prob: number, triage_verdict: string, source: string }>>}
 */
export async function triageBatchWithLaya(items = []) {
  const resultMap = new Map();
  if (!items || items.length === 0) return resultMap;

  try {
    const res = await fetch(`${LAYA_GATEWAY_URL}/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map(it => ({
          id: it.id,
          ticker: it.ticker || 'MKT',
          title: it.title || ''
        }))
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        for (const r of data.results) {
          resultMap.set(r.id, {
            is_noise: Boolean(r.is_noise),
            is_macro: Boolean(r.is_macro),
            noise_prob: r.noise_prob,
            macro_prob: r.macro_prob,
            triage_verdict: r.triage_verdict,
            source: 'laya_neural'
          });
        }
        return resultMap;
      }
    }
  } catch (err) {
    console.warn(`[LayaClient] Laya daemon unavailable (${err.message}). Falling back to heuristic rules.`);
  }

  // Graceful Rule-Based Fallback if daemon is not running
  for (const it of items) {
    const title = it.title || '';
    const isNoise = NOISE_HEURISTIC_PATTERNS.some(p => p.test(title));
    const isMacro = MACRO_HEURISTIC_PATTERNS.some(p => p.test(title));

    resultMap.set(it.id, {
      is_noise: isNoise,
      is_macro: isMacro,
      noise_prob: isNoise ? 0.85 : 0.15,
      macro_prob: isMacro ? 0.85 : 0.15,
      triage_verdict: isNoise ? 'NOISE' : (isMacro ? 'MACRO' : 'SIGNAL'),
      source: 'heuristic_fallback'
    });
  }

  return resultMap;
}
