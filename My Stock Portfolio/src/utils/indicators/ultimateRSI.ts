export type MAMethod = 'RMA' | 'EMA' | 'SMA' | 'TMA';

export interface UltimateRSIResult {
  arsi: (number | null)[];
  signal: (number | null)[];
  bullishCrossLow: boolean[];
  bullishReversal: boolean[];
  buyZone: boolean[];
}

/**
 * Simple Moving Average
 */
export function computeSMA(src: number[], len: number): (number | null)[] {
  const result: (number | null)[] = new Array(src.length).fill(null);
  if (src.length < len || len <= 0) return result;

  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += src[i];
  }
  result[len - 1] = sum / len;

  for (let i = len; i < src.length; i++) {
    sum += src[i] - src[i - len];
    result[i] = sum / len;
  }
  return result;
}

/**
 * Exponential Moving Average
 */
export function computeEMA(src: number[], len: number): (number | null)[] {
  const result: (number | null)[] = new Array(src.length).fill(null);
  if (src.length < len || len <= 0) return result;

  const alpha = 2 / (len + 1);

  // Initial SMA seed
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += src[i];
  }
  let prevEma = sum / len;
  result[len - 1] = prevEma;

  for (let i = len; i < src.length; i++) {
    prevEma = alpha * src[i] + (1 - alpha) * prevEma;
    result[i] = prevEma;
  }
  return result;
}

/**
 * Wilder's Running Moving Average (ta.rma)
 * alpha = 1 / len
 */
export function computeRMA(src: number[], len: number): (number | null)[] {
  const result: (number | null)[] = new Array(src.length).fill(null);
  if (src.length < len || len <= 0) return result;

  const alpha = 1 / len;

  // Initial SMA seed
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += src[i];
  }
  let prevRma = sum / len;
  result[len - 1] = prevRma;

  for (let i = len; i < src.length; i++) {
    prevRma = alpha * src[i] + (1 - alpha) * prevRma;
    result[i] = prevRma;
  }
  return result;
}

/**
 * Triangular Moving Average (ta.sma(ta.sma(x, len), len))
 */
export function computeTMA(src: number[], len: number): (number | null)[] {
  const firstSma = computeSMA(src, len);
  const cleanFirst: number[] = [];
  const offset = len - 1;

  for (let i = offset; i < src.length; i++) {
    cleanFirst.push(firstSma[i] ?? 0);
  }

  const secondSma = computeSMA(cleanFirst, len);
  const result: (number | null)[] = new Array(src.length).fill(null);

  for (let i = 0; i < secondSma.length; i++) {
    result[offset + len - 1 + i] = secondSma[len - 1 + i];
  }
  return result;
}

/**
 * Generic MA selector matching Pine Script ma(x, len, maType)
 */
export function computeMA(src: number[], len: number, method: MAMethod): (number | null)[] {
  switch (method) {
    case 'EMA':
      return computeEMA(src, len);
    case 'SMA':
      return computeSMA(src, len);
    case 'RMA':
      return computeRMA(src, len);
    case 'TMA':
      return computeTMA(src, len);
    default:
      return computeRMA(src, len);
  }
}

/**
 * Compute My Ultimate RSI by doctorbank8989
 */
export function computeUltimateRSI(
  closes: number[],
  highs?: number[],
  lows?: number[],
  opens?: number[],
  options?: {
    length?: number;
    smoType1?: MAMethod;
    smooth?: number;
    smoType2?: MAMethod;
    source?: 'close' | 'hl2' | 'hlc3';
  }
): UltimateRSIResult {
  const n = closes.length;
  const length = options?.length ?? 14;
  const smoType1 = options?.smoType1 ?? 'RMA';
  const smooth = options?.smooth ?? 14;
  const smoType2 = options?.smoType2 ?? 'EMA';
  const source = options?.source ?? 'close';

  const defaultResult: UltimateRSIResult = {
    arsi: new Array(n).fill(null),
    signal: new Array(n).fill(null),
    bullishCrossLow: new Array(n).fill(false),
    bullishReversal: new Array(n).fill(false),
    buyZone: new Array(n).fill(false),
  };

  if (n < length + 2) return defaultResult;

  // 1. Calculate Source Series
  const src: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    if (source === 'hl2' && highs && lows) {
      src[i] = (highs[i] + lows[i]) / 2;
    } else if (source === 'hlc3' && highs && lows) {
      src[i] = (highs[i] + lows[i] + closes[i]) / 3;
    } else {
      src[i] = closes[i];
    }
  }

  // 2. Rolling Highest & Lowest over `length`
  const upper: number[] = new Array(n);
  const lower: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    let maxVal = -Infinity;
    let minVal = Infinity;
    const startIdx = Math.max(0, i - length + 1);
    for (let j = startIdx; j <= i; j++) {
      if (src[j] > maxVal) maxVal = src[j];
      if (src[j] < minVal) minVal = src[j];
    }
    upper[i] = maxVal;
    lower[i] = minVal;
  }

  // 3. Compute `diff`
  // diff = upper > upper[1] ? r : lower < lower[1] ? -r : d
  const diff: number[] = new Array(n).fill(0);
  const absDiff: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const r = upper[i] - lower[i];
    const d = i > 0 ? src[i] - src[i - 1] : 0;
    const prevUpper = i > 0 ? upper[i - 1] : upper[i];
    const prevLower = i > 0 ? lower[i - 1] : lower[i];

    let val = d;
    if (upper[i] > prevUpper) {
      val = r;
    } else if (lower[i] < prevLower) {
      val = -r;
    }
    diff[i] = val;
    absDiff[i] = Math.abs(val);
  }

  // 4. Smooth num and den with smoType1
  const numSeries = computeMA(diff, length, smoType1);
  const denSeries = computeMA(absDiff, length, smoType1);

  // 5. Calculate ARSI = num / den * 50 + 50
  const arsi: (number | null)[] = new Array(n).fill(null);
  const arsiCleanForSignal: number[] = new Array(n).fill(50);

  for (let i = 0; i < n; i++) {
    const num = numSeries[i];
    const den = denSeries[i];

    if (num !== null && den !== null && den !== 0) {
      const calc = (num / den) * 50 + 50;
      const clamped = Math.max(0, Math.min(100, calc));
      const rounded = Number(clamped.toFixed(2));
      arsi[i] = rounded;
      arsiCleanForSignal[i] = rounded;
    } else if (i >= length - 1) {
      arsi[i] = 50;
      arsiCleanForSignal[i] = 50;
    }
  }

  // 6. Signal Line = ma(arsi, smooth, smoType2)
  const signalRaw = computeMA(arsiCleanForSignal, smooth, smoType2);
  const signal: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (arsi[i] !== null && signalRaw[i] !== null) {
      signal[i] = Number(signalRaw[i]!.toFixed(2));
    }
  }

  // 7. Custom Buy Signals
  const bullishCrossLow = new Array(n).fill(false);
  const bullishReversal = new Array(n).fill(false);
  const buyZone = new Array(n).fill(false);

  let lastCrossIdx = -999;

  for (let i = 1; i < n; i++) {
    const currArsi = arsi[i];
    const prevArsi = arsi[i - 1];
    const currSig = signal[i];
    const prevSig = signal[i - 1];

    if (currArsi === null || prevArsi === null || currSig === null || prevSig === null) {
      continue;
    }

    // 1. Momentum rising from weak zone: arsi < 30 + crossover
    const isCross = prevArsi <= prevSig && currArsi > currSig;
    if (isCross && currArsi < 30) {
      bullishCrossLow[i] = true;
      lastCrossIdx = i;
    }

    // 2. Bullish reversal: arsi[1] < 20 and signal[1] < 20 and arsi >= 20 and arsi < 30
    if (prevArsi < 20 && prevSig < 20 && currArsi >= 20 && currArsi < 30) {
      bullishReversal[i] = true;
    }

    // 3. Buy Zone: ta.barssince(bullishCrossLow) < 10 and arsi in [20, 40] and signal in [20, 40]
    const barsSinceCross = i - lastCrossIdx;
    const arsiInBuyZone = currArsi >= 20 && currArsi <= 40;
    const signalInBuyZone = currSig >= 20 && currSig <= 40;

    if (barsSinceCross >= 0 && barsSinceCross < 10 && arsiInBuyZone && signalInBuyZone) {
      buyZone[i] = true;
    }
  }

  return {
    arsi,
    signal,
    bullishCrossLow,
    bullishReversal,
    buyZone,
  };
}
