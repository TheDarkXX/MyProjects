/**
 * Trend Speed Analyzer by Zeiierman
 * Dynamic Moving Average with Accelerator Multiplier, Wave Momentum Accumulation,
 * HMA(5) Smoothing, Normalized Color Gradients, and Dominance Wave Statistics.
 */

export interface TrendSpeedStats {
  bullAvg: number;
  bearAvg: number;
  bullMax: number;
  bearMax: number;
  waveRatioAvg: number;
  waveRatioMax: number;
  dominanceAvgText: string;
  dominanceAvgColor: string;
  dominanceMaxText: string;
  dominanceMaxColor: string;
  currentWave: number;
  currentTextAvg: string;
  currentTextMax: string;
  currentColorAvg: string;
  currentColorMax: string;
}

export interface TrendSpeedResult {
  dynEma: (number | null)[];
  dynTrendColor: string[];
  trendSpeed: (number | null)[];
  barColor: string[];
  stats: TrendSpeedStats | null;
}

export interface TrendSpeedOptions {
  maxLength?: number;
  accelMultiplier?: number;
  enableTable?: boolean;
  lookbackPeriod?: number;
  enableCandles?: boolean;
  collectionPeriod?: number;
  upTrendColor?: string;
  dnTrendColor?: string;
  upHistColor1?: string;
  upHistColor2?: string;
  dnHistColor1?: string;
  dnHistColor2?: string;
}

// -------------------------------------------------------------
// Helper: Color Interpolation (Hex to RGB interpolation)
// -------------------------------------------------------------
function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length >= 6) {
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16),
    };
  }
  return { r: 128, g: 128, b: 128 };
}

export function interpolateColor(color1: string, color2: string, ratio: number): string {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const c1 = parseHex(color1);
  const c2 = parseHex(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * clampedRatio);
  const g = Math.round(c1.g + (c2.g - c1.g) * clampedRatio);
  const b = Math.round(c1.b + (c2.b - c1.b) * clampedRatio);
  return `rgb(${r}, ${g}, ${b})`;
}

// -------------------------------------------------------------
// Moving Average Helpers (RMA, WMA, HMA)
// -------------------------------------------------------------
export function computeRMA(src: number[], len: number): (number | null)[] {
  const n = src.length;
  const result: (number | null)[] = new Array(n).fill(null);
  if (len <= 0 || n < len) return result;

  const alpha = 1 / len;
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += src[i];
  }
  let prev = sum / len;
  result[len - 1] = prev;

  for (let i = len; i < n; i++) {
    const curr = alpha * src[i] + (1 - alpha) * prev;
    result[i] = curr;
    prev = curr;
  }
  return result;
}

export function computeWMA(src: number[], len: number): (number | null)[] {
  const n = src.length;
  const result: (number | null)[] = new Array(n).fill(null);
  if (len <= 0 || n < len) return result;

  const denom = (len * (len + 1)) / 2;
  for (let i = len - 1; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < len; j++) {
      sum += src[i - len + 1 + j] * (j + 1);
    }
    result[i] = sum / denom;
  }
  return result;
}

export function computeHMA(src: number[], len: number): (number | null)[] {
  const n = src.length;
  const result: (number | null)[] = new Array(n).fill(null);
  if (len <= 1 || n < len) return result;

  const halfLen = Math.max(1, Math.floor(len / 2));
  const sqrtLen = Math.max(1, Math.floor(Math.sqrt(len)));

  const wmaHalf = computeWMA(src, halfLen);
  const wmaFull = computeWMA(src, len);

  const diff: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const h = wmaHalf[i];
    const f = wmaFull[i];
    if (h !== null && f !== null) {
      diff[i] = 2 * h - f;
    } else {
      diff[i] = src[i];
    }
  }

  const hma = computeWMA(diff, sqrtLen);
  for (let i = 0; i < n; i++) {
    result[i] = hma[i];
  }
  return result;
}

// -------------------------------------------------------------
// Core: Compute Trend Speed Analyzer
// -------------------------------------------------------------
export function computeTrendSpeed(
  closes: number[],
  opens?: number[],
  highs?: number[],
  lows?: number[],
  options?: TrendSpeedOptions
): TrendSpeedResult {
  const n = closes.length;
  if (n === 0) {
    return {
      dynEma: [],
      dynTrendColor: [],
      trendSpeed: [],
      barColor: [],
      stats: null,
    };
  }

  const maxLength = options?.maxLength ?? 50;
  const accelMultiplier = options?.accelMultiplier ?? 0.01;
  const lookbackPeriod = options?.lookbackPeriod ?? 150;
  const collen = options?.collectionPeriod ?? 100;

  const upTrendColor = options?.upTrendColor || '#F7D02C';
  const dnTrendColor = options?.dnTrendColor || '#FFF8DB';
  const upHistColor1 = options?.upHistColor1 || '#F7D02C';
  const upHistColor2 = options?.upHistColor2 || '#FFE600';
  const dnHistColor1 = options?.dnHistColor1 || '#9E2A2B';
  const dnHistColor2 = options?.dnHistColor2 || '#C83337';

  const op = opens && opens.length === n ? opens : closes;

  // 1. Dynamic Moving Average (DMA with Accelerator)
  const dynEma: (number | null)[] = new Array(n).fill(null);
  const deltaCountsDiff: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const prevClose = i > 0 ? closes[i - 1] : closes[0];
    deltaCountsDiff[i] = Math.abs(closes[i] - prevClose);
  }

  let prevDynEma = closes[0];
  dynEma[0] = prevDynEma;

  for (let i = 0; i < n; i++) {
    const start200 = Math.max(0, i - 199);
    let maxAbsClose = Math.abs(closes[i]);
    let maxDelta = deltaCountsDiff[i];

    for (let k = start200; k <= i; k++) {
      const absC = Math.abs(closes[k]);
      if (absC > maxAbsClose) maxAbsClose = absC;
      if (deltaCountsDiff[k] > maxDelta) maxDelta = deltaCountsDiff[k];
    }
    if (maxAbsClose === 0) maxAbsClose = 1;
    if (maxDelta === 0) maxDelta = 1;

    const countsDiffNorm = (closes[i] + maxAbsClose) / (2 * maxAbsClose);
    const dynLength = 5 + countsDiffNorm * (maxLength - 5);

    const accelFactor = deltaCountsDiff[i] / maxDelta;
    const alphaBase = 2 / (dynLength + 1);
    const alpha = Math.min(1, alphaBase * (1 + accelFactor * accelMultiplier));

    if (i === 0) {
      dynEma[0] = closes[0];
      prevDynEma = closes[0];
    } else {
      const curr = alpha * closes[i] + (1 - alpha) * prevDynEma;
      dynEma[i] = curr;
      prevDynEma = curr;
    }
  }

  // 2. Dynamic Trend Color: ta.wma(close, 2) > dyn_ema ? up_col : dn_col
  const wma2 = computeWMA(closes, 2);
  const dynTrendColor: string[] = new Array(n).fill(upTrendColor);

  for (let i = 0; i < n; i++) {
    const w = wma2[i] ?? closes[i];
    const de = dynEma[i] ?? closes[i];
    dynTrendColor[i] = w > de ? upTrendColor : dnTrendColor;
  }

  // 3. Wave Accumulation & Trend Direction
  const rmaClose = computeRMA(closes, 10);
  const rmaOpen = computeRMA(op, 10);

  const bullishWaves: number[] = [];
  const bearishWaves: number[] = [];

  let x1 = 0;
  let speed = 0;
  const rawSpeed: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const c = rmaClose[i] ?? closes[i];
    const o = rmaOpen[i] ?? op[i];
    const diff = c - o;

    const currClose = closes[i];
    const prevClose = i > 0 ? closes[i - 1] : currClose;
    const currTrend = dynEma[i] ?? currClose;
    const prevTrend = i > 0 ? (dynEma[i - 1] ?? prevClose) : currTrend;

    if (i > 0) {
      // Crossing from bear to bull: close crosses above trend
      if (currClose > currTrend && prevClose <= prevTrend) {
        let lowestSpeed = rawSpeed[x1];
        for (let k = x1; k < i; k++) {
          if (rawSpeed[k] < lowestSpeed) lowestSpeed = rawSpeed[k];
        }
        bearishWaves.unshift(lowestSpeed);
        x1 = i;
        speed = diff;
      }
      // Crossing from bull to bear: close crosses below trend
      else if (currClose < currTrend && prevClose >= prevTrend) {
        let highestSpeed = rawSpeed[x1];
        for (let k = x1; k < i; k++) {
          if (rawSpeed[k] > highestSpeed) highestSpeed = rawSpeed[k];
        }
        bullishWaves.unshift(highestSpeed);
        x1 = i;
        speed = diff;
      }
      speed += diff;
    } else {
      speed += diff;
    }

    rawSpeed[i] = speed;
  }

  // 4. Trend Speed Histogram: HMA(speed, 5)
  const trendSpeed = computeHMA(rawSpeed, 5);

  // 5. Normalized Speed & Color Gradient
  const barColor: string[] = new Array(n).fill(upHistColor1);

  for (let i = 0; i < n; i++) {
    const startCol = Math.max(0, i - collen + 1);
    let minSp = rawSpeed[startCol];
    let maxSp = rawSpeed[startCol];

    for (let k = startCol; k <= i; k++) {
      if (rawSpeed[k] < minSp) minSp = rawSpeed[k];
      if (rawSpeed[k] > maxSp) maxSp = rawSpeed[k];
    }

    const range = maxSp - minSp;
    const norm = range === 0 ? 0.5 : Math.max(0, Math.min(1, (rawSpeed[i] - minSp) / range));

    if (rawSpeed[i] < 0) {
      const ratio = norm / 0.5;
      barColor[i] = interpolateColor(dnHistColor1, dnHistColor2, ratio);
    } else {
      const ratio = (norm - 0.5) / 0.5;
      barColor[i] = interpolateColor(upHistColor1, upHistColor2, ratio);
    }
  }

  // 6. Statistics Table (Dominance & Wave Ratios)
  let stats: TrendSpeedStats | null = null;
  const bullRecent = bullishWaves.slice(0, Math.min(lookbackPeriod, bullishWaves.length));
  const bearRecent = bearishWaves.slice(0, Math.min(lookbackPeriod, bearishWaves.length));

  if (bullRecent.length > 0 && bearRecent.length > 0) {
    const bullMax = Math.max(...bullRecent);
    const bearMax = Math.min(...bearRecent); // negative extreme
    const bullAvg = bullRecent.reduce((a, b) => a + b, 0) / bullRecent.length;
    const bearAvg = bearRecent.reduce((a, b) => a + b, 0) / bearRecent.length;

    const absBearAvg = Math.abs(bearAvg) || 1;
    const absBearMax = Math.abs(bearMax) || 1;

    const waveRatioAvg = bullAvg / absBearAvg;
    const waveRatioMax = bullMax / absBearMax;

    const dominanceAvgValue = bullAvg - absBearAvg;
    const dominanceAvgText = dominanceAvgValue > 0
      ? `Bullish +${waveRatioAvg.toFixed(2)}x`
      : `Bearish -${(1 / (waveRatioAvg || 1)).toFixed(2)}x`;
    const dominanceAvgColor = dominanceAvgValue > 0 ? '#22c55e' : '#ef4444';

    const dominanceMaxValue = bullMax - absBearMax;
    const dominanceMaxText = dominanceMaxValue > 0
      ? `Bullish +${waveRatioMax.toFixed(2)}x`
      : `Bearish -${(1 / (waveRatioMax || 1)).toFixed(2)}x`;
    const dominanceMaxColor = dominanceMaxValue > 0 ? '#22c55e' : '#ef4444';

    const currentWave = rawSpeed[n - 1] ?? 0;
    const currentRatioAvg = currentWave > 0 ? currentWave / (bullAvg || 1) : currentWave / absBearAvg;
    const currentRatioMax = currentWave > 0 ? currentWave / (bullMax || 1) : currentWave / absBearMax;

    const currentTextAvg = `${Math.round(currentRatioAvg * 100) / 100}x`;
    const currentTextMax = `${Math.round(currentRatioMax * 100) / 100}x`;

    const currentColorAvg = currentRatioAvg > 0 ? '#22c55e' : '#ef4444';
    const currentColorMax = currentRatioMax > 0 ? '#22c55e' : '#ef4444';

    stats = {
      bullAvg,
      bearAvg,
      bullMax,
      bearMax,
      waveRatioAvg,
      waveRatioMax,
      dominanceAvgText,
      dominanceAvgColor,
      dominanceMaxText,
      dominanceMaxColor,
      currentWave,
      currentTextAvg,
      currentTextMax,
      currentColorAvg,
      currentColorMax,
    };
  }

  return {
    dynEma,
    dynTrendColor,
    trendSpeed,
    barColor,
    stats,
  };
}
