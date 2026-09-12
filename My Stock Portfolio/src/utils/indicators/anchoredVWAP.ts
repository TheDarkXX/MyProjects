/**
 * Anchored VWAP (Volume Weighted Average Price) with Standard Deviation Bands
 * Matching TradingView Pine Script v5 mathematical formulation.
 */

import { AnchoredVWAPConfig } from '../../types/indicatorConfig';

export interface BarInput {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface AnchoredVWAPResult {
  vwap: (number | null)[];
  upperBand: (number | null)[];
  lowerBand: (number | null)[];
  anchorIndex: number;
  anchorTime: string;
}

function getSourcePrice(
  bar: BarInput,
  source: 'close' | 'hl2' | 'hlc3' | 'ohlc4' | 'open' | 'high' | 'low' = 'hlc3'
): number {
  switch (source) {
    case 'close':
      return bar.close;
    case 'open':
      return bar.open;
    case 'high':
      return bar.high;
    case 'low':
      return bar.low;
    case 'hl2':
      return (bar.high + bar.low) / 2;
    case 'ohlc4':
      return (bar.open + bar.high + bar.low + bar.close) / 4;
    case 'hlc3':
    default:
      return (bar.high + bar.low + bar.close) / 3;
  }
}

function parseBarTimestamp(timeStr: string): number {
  if (!timeStr) return 0;
  if (timeStr.includes('T')) {
    return new Date(timeStr).getTime();
  }
  // If YYYY-MM-DD
  const parts = timeStr.split('-');
  if (parts.length === 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
  }
  return new Date(timeStr).getTime() || 0;
}

export function computeAnchoredVWAP(
  bars: BarInput[],
  config?: Partial<AnchoredVWAPConfig>
): AnchoredVWAPResult {
  const n = bars.length;
  if (n === 0) {
    return {
      vwap: [],
      upperBand: [],
      lowerBand: [],
      anchorIndex: -1,
      anchorTime: '',
    };
  }

  const source = config?.source ?? 'hlc3';
  const multiplier = config?.bandMultiplier ?? 0.5;
  const startDateStr = config?.startDate?.trim();
  const startTimeStr = config?.startTime?.trim() || '00:00';

  // 1. Locate the Anchor Index
  let anchorIndex = -1;
  const anchorMode = config?.anchorMode ?? (startDateStr ? 'manual' : 'majorLow10M');

  if (anchorMode === 'manual' && startDateStr) {
    // Check for exact date match first (e.g. YYYY-MM-DD prefix)
    const exactIdx = bars.findIndex((b) => b.time.startsWith(startDateStr));
    if (exactIdx !== -1) {
      anchorIndex = exactIdx;
    } else {
      // Construct target timestamp
      const targetTimestamp = new Date(`${startDateStr}T${startTimeStr}:00`).getTime();
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < n; i++) {
        const barTime = parseBarTimestamp(bars[i].time);
        const diff = Math.abs(barTime - targetTimestamp);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      anchorIndex = closestIdx;
    }
  } else if (anchorMode === 'ytd') {
    // First bar of the current calendar year
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < n; i++) {
      const d = new Date(parseBarTimestamp(bars[i].time));
      if (d.getFullYear() >= currentYear) {
        anchorIndex = i;
        break;
      }
    }
  } else if (anchorMode === 'swingLow60D') {
    // 60-day recent swing low
    const lookback = Math.min(60, n);
    const startScan = n - lookback;
    let minLow = Infinity;
    let minIdx = startScan;
    for (let i = startScan; i < n; i++) {
      if (bars[i].low < minLow) {
        minLow = bars[i].low;
        minIdx = i;
      }
    }
    anchorIndex = minIdx;
  }

  // Default / Fallback: 240 trading days (~10-11 calendar months) Major Structural Bottom
  if (anchorIndex < 0 || anchorIndex >= n) {
    const lookback = Math.min(240, n);
    const startScan = n - lookback;
    let minLow = Infinity;
    let minIdx = startScan;
    for (let i = startScan; i < n; i++) {
      if (bars[i].low < minLow) {
        minLow = bars[i].low;
        minIdx = i;
      }
    }
    anchorIndex = minIdx;
  }

  const anchorTime = bars[anchorIndex]?.time || '';

  // 2. Cumulative VWAP Calculation from anchorIndex
  const vwap: (number | null)[] = new Array(n).fill(null);
  const upperBand: (number | null)[] = new Array(n).fill(null);
  const lowerBand: (number | null)[] = new Array(n).fill(null);

  let cumSrcVol = 0;
  let cumVol = 0;

  const vwapBuffer: number[] = [];
  const stdLen = 30; // fixed length matching Pine Script

  for (let i = anchorIndex; i < n; i++) {
    const bar = bars[i];
    const srcVal = getSourcePrice(bar, source);
    // Safe volume: if volume is undefined, 0 or NaN, default to 1 so VWAP functions as cumulative mean
    const vol = bar.volume && bar.volume > 0 && !isNaN(bar.volume) ? bar.volume : 1;

    cumSrcVol += srcVal * vol;
    cumVol += vol;

    const currVwap = cumVol > 0 ? cumSrcVol / cumVol : srcVal;
    vwap[i] = currVwap;
    vwapBuffer.push(currVwap);

    // Standard deviation over last min(30, buffer.length) points
    const count = Math.min(stdLen, vwapBuffer.length);
    let sum = 0;
    let sumSq = 0;
    const bufferStart = vwapBuffer.length - count;
    for (let k = bufferStart; k < vwapBuffer.length; k++) {
      const v = vwapBuffer[k];
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    const stdDev = Math.sqrt(Math.max(0, variance));

    upperBand[i] = currVwap + multiplier * stdDev;
    lowerBand[i] = currVwap - multiplier * stdDev;
  }

  return {
    vwap,
    upperBand,
    lowerBand,
    anchorIndex,
    anchorTime,
  };
}
