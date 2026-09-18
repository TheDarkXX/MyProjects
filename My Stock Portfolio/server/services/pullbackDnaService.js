import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { calcEMASeries } from './technicalAnalysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../db/stock.db');
const db = new Database(dbPath);

// In-memory cache with 10-minute TTL
const dnaCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Analyze 10-Year Pullback & Bedrock DNA for a given symbol
 * @param {string} symbol 
 * @returns {Promise<Object>}
 */
export async function getPullbackDna(symbol) {
  if (!symbol) return null;
  const upper = symbol.toUpperCase();

  const cached = dnaCache.get(upper);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const candles = db.prepare(`
    SELECT date, price, open, high, low, close, volume 
    FROM historical_prices 
    WHERE symbol = ? 
    ORDER BY date ASC
  `).all(upper);

  if (!candles || candles.length < 210) {
    return {
      symbol: upper,
      totalPullbacks: 0,
      ema50Bounces: 0,
      ema150Bounces: 0,
      ema200Bounces: 0,
      deepBreakdowns: 0,
      bedrockLine: 'N/A',
      summary_th: `ข้อมูลแท่งเทียนในอดีตมีเพียง ${candles?.length || 0} แท่ง ยังไม่เพียงพอต่อการวิเคราะห์สถิติย่อตัว 2-10 ปี (ต้องการอย่างน้อย 210 แท่ง)`,
      recentEvents: []
    };
  }

  const dates = candles.map(c => c.date);
  const closes = candles.map(c => c.price);
  const highs = candles.map(c => c.high ?? c.price);
  const lows = candles.map(c => c.low ?? c.price);

  const ema50 = calcEMASeries(closes, 50);
  const ema150 = calcEMASeries(closes, 150);
  const ema200 = calcEMASeries(closes, 200);

  const pullbacks = [];
  const n = closes.length;

  let inPullback = false;
  let currentPeak = { index: -1, price: 0, date: '' };
  let currentTrough = { index: -1, price: Infinity, date: '' };

  // Scan across history from bar 200 onward
  for (let i = 200; i < n; i++) {
    const price = closes[i];
    const high = highs[i];
    const low = lows[i];

    if (!inPullback) {
      // Check if bar i is a local swing peak (higher than past 15 bars)
      const past15High = Math.max(...highs.slice(i - 15, i));
      if (high >= past15High) {
        currentPeak = { index: i, price: high, date: dates[i] };
      }

      // Trigger pullback mode if price drops > 5.0% from current peak
      if (currentPeak.price > 0 && price < currentPeak.price * 0.95) {
        inPullback = true;
        currentTrough = { index: i, price: low, date: dates[i] };
      }
    } else {
      // While in pullback, track the lowest low
      if (low < currentTrough.price) {
        currentTrough = { index: i, price: low, date: dates[i] };
      }

      // Check if price has rebounded by at least 8.0% from the lowest trough
      if (price >= currentTrough.price * 1.08) {
        // Pullback is confirmed and completed!
        const troughIdx = currentTrough.index;
        const troughPrice = currentTrough.price;
        const e50 = ema50[troughIdx];
        const e150 = ema150[troughIdx];
        const e200 = ema200[troughIdx];

        if (e50 && e150 && e200) {
          const dist50 = ((troughPrice - e50) / e50) * 100;
          const dist150 = ((troughPrice - e150) / e150) * 100;
          const dist200 = ((troughPrice - e200) / e200) * 100;
          const drawdown = ((troughPrice - currentPeak.price) / currentPeak.price) * 100;

          let bounceCategory = 'Minor';
          if (dist50 >= -3.0 && dist50 <= 3.0 && dist150 > 2.0) {
            bounceCategory = 'EMA50';
          } else if (dist150 >= -3.0 && dist150 <= 3.0 && dist200 > 1.5) {
            bounceCategory = 'EMA150';
          } else if (dist200 >= -4.0 && dist200 <= 3.0) {
            bounceCategory = 'EMA200';
          } else if (dist200 < -4.0) {
            bounceCategory = 'BREAKDOWN';
          } else if (dist50 > 3.0) {
            bounceCategory = 'SHALLOW';
          }

          // Measure subsequent rebound peak over the next 40 bars
          const futureMaxHigh = Math.max(...highs.slice(troughIdx, Math.min(n, troughIdx + 40)));
          const reboundGain = ((futureMaxHigh - troughPrice) / troughPrice) * 100;

          pullbacks.push({
            peakDate: currentPeak.date,
            peakPrice: Number(currentPeak.price.toFixed(2)),
            troughDate: currentTrough.date,
            troughPrice: Number(troughPrice.toFixed(2)),
            drawdownPct: Number(drawdown.toFixed(1)),
            reboundGainPct: Number(reboundGain.toFixed(1)),
            bounceCategory,
            distEma50: Number(dist50.toFixed(1)),
            distEma150: Number(dist150.toFixed(1)),
            distEma200: Number(dist200.toFixed(1))
          });
        }

        // Reset for next swing
        inPullback = false;
        currentPeak = { index: i, price: high, date: dates[i] };
      }
    }
  }

  // Calculate aggregated stats
  const total = pullbacks.length;
  const countEma50 = pullbacks.filter(p => p.bounceCategory === 'EMA50' || p.bounceCategory === 'SHALLOW').length;
  const countEma150 = pullbacks.filter(p => p.bounceCategory === 'EMA150').length;
  const countEma200 = pullbacks.filter(p => p.bounceCategory === 'EMA200').length;
  const countBreakdown = pullbacks.filter(p => p.bounceCategory === 'BREAKDOWN').length;

  const pct50 = total > 0 ? Number(((countEma50 / total) * 100).toFixed(1)) : 0;
  const pct150 = total > 0 ? Number(((countEma150 / total) * 100).toFixed(1)) : 0;
  const pct200 = total > 0 ? Number(((countEma200 / total) * 100).toFixed(1)) : 0;
  const pctBreakdown = total > 0 ? Number(((countBreakdown / total) * 100).toFixed(1)) : 0;

  const avgDrawdown = total > 0
    ? Number((pullbacks.reduce((sum, p) => sum + p.drawdownPct, 0) / total).toFixed(1))
    : 0;

  const avgRebound = total > 0
    ? Number((pullbacks.reduce((sum, p) => sum + p.reboundGainPct, 0) / total).toFixed(1))
    : 0;

  // Determine Primary Bedrock Line
  let bedrockLine = 'EMA 150';
  let bedrockDescriptionTh = '';

  if (pct50 >= 45) {
    bedrockLine = 'EMA 50 (Super Bull)';
    bedrockDescriptionTh = `หุ้นเทรนด์แกร่งระดับซูเปอร์บูล (ย่อเด้งที่ EMA 50 ถึง ${pct50}%) ถ้ารอช้อนที่เส้น 200 จะตกรถเกือบตลอดรอบ`;
  } else if (pct150 >= 35 || (pct50 + pct150 >= 65)) {
    bedrockLine = 'EMA 150 (Primary Core)';
    bedrockDescriptionTh = `แนวรับแม่ทัพหลักอยู่ที่เส้น EMA 150 (เด้งโซน 50/150 รวมกัน ${(pct50 + pct150).toFixed(1)}%) เป็นจุดเก็บของที่คุ้มค่าที่สุด`;
  } else if (pct200 >= 30) {
    bedrockLine = 'EMA 200 (Bedrock Fortress)';
    bedrockDescriptionTh = `หุ้นมีนิสัยลงมาล้างไพ่ที่เส้น EMA 200 เป็นประจำ (${pct200}%) เส้น 200 คือปราการหินผาความปลอดภัยสูงสุด`;
  } else {
    bedrockLine = 'EMA 150 / 200';
    bedrockDescriptionTh = `แนวรับกระจายตัว แนะนำแบ่งไม้ 50% ที่เส้น 150 และสำรอง 50% ที่เส้น 200`;
  }

  // Safety Score (1-10): low breakdown rate = higher safety score
  const safetyScore = Math.max(1, Math.min(10, Math.round(10 - (pctBreakdown / 10))));

  const summary_th = `${upper} ผ่านการย่อตัวครั้งสำคัญมาทั้งหมด ${total} ครั้งในรอบประวัติศาสตร์ — เด้งที่ EMA 50 (${pct50}%), เด้งที่ EMA 150 (${pct150}%), แตะหินผา EMA 200 (${pct200}%), หลุดมีดร่วง (${pctBreakdown}%). ${bedrockDescriptionTh}`;

  const result = {
    symbol: upper,
    totalPullbacks: total,
    stats: {
      ema50: { count: countEma50, percent: pct50 },
      ema150: { count: countEma150, percent: pct150 },
      ema200: { count: countEma200, percent: pct200 },
      breakdown: { count: countBreakdown, percent: pctBreakdown },
      avgDrawdownPct: avgDrawdown,
      avgReboundGainPct: avgRebound,
      safetyScore
    },
    bedrockLine,
    summary_th,
    recentEvents: pullbacks.slice(-6).reverse()
  };

  dnaCache.set(upper, { timestamp: Date.now(), data: result });
  return result;
}
