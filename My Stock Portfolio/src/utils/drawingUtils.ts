import { LineStyle } from 'lightweight-charts';
import { HorizontalLineDrawing, LineStyleOption, AutoSRLevel } from '../types/drawingTypes';

export function getChartLineStyle(opt: LineStyleOption): LineStyle {
  switch (opt) {
    case 'Solid':
      return LineStyle.Solid;
    case 'Dotted':
      return LineStyle.Dotted;
    case 'Dashed':
      return LineStyle.Dashed;
    default:
      return LineStyle.Solid;
  }
}

/**
 * SET Market Dynamic Tick Size
 */
export function getSETTickSize(price: number): number {
  if (price < 2) return 0.01;
  if (price < 5) return 0.02;
  if (price < 10) return 0.05;
  if (price < 25) return 0.10;
  if (price < 100) return 0.25;
  if (price < 200) return 0.50;
  if (price < 400) return 1.00;
  return 2.00;
}

/**
 * Snap price to closest tick size avoiding floating point issues
 */
export function snapToTickSize(price: number, customTickSize?: number): number {
  const step = customTickSize ?? getSETTickSize(price);
  if (step <= 0) return price;
  const snapped = Math.round(price / step) * step;
  return Number(snapped.toFixed(4));
}

/**
 * Hit-test to see if mouseY is close to any visible horizontal line (within hitZonePx)
 */
export function hitTestLines(
  mouseY: number,
  drawings: HorizontalLineDrawing[],
  series: { priceToCoordinate: (price: number) => number | null } | null,
  hitZonePx: number = 7
): HorizontalLineDrawing | null {
  if (!series) return null;
  // Test in reverse so top-most drawn line gets priority
  for (let i = drawings.length - 1; i >= 0; i--) {
    const d = drawings[i];
    if (!d.visible) continue;
    const lineY = series.priceToCoordinate(d.price);
    if (lineY !== null && Math.abs(mouseY - lineY) <= hitZonePx) {
      return d;
    }
  }
  return null;
}

export interface SnapTargetResult {
  price: number;
  snappedType: 'High' | 'Low' | 'Open' | 'Close' | 'Tick' | null;
  yCoord?: number;
}

/**
 * High-precision TradingView Magnet Snap
 * Prioritizes the candle currently under cursor (mouseX) or nearby candles (±2)
 */
export function snapToCandleOHLC(
  price: number,
  mouseY: number,
  barIndex: number | null,
  bars: Array<{ high: number; low: number; open: number; close: number }>,
  series: { priceToCoordinate: (p: number) => number | null } | null,
  snapThresholdPx: number = 28
): SnapTargetResult {
  if (!bars || bars.length === 0 || !series) {
    return { price: snapToTickSize(price), snappedType: 'Tick' };
  }

  // If we have a target bar index under the mouse, scan it and its immediate neighbors (±2)
  const candidateIndices: number[] = [];
  if (barIndex !== null && barIndex >= 0 && barIndex < bars.length) {
    for (let offset = -2; offset <= 2; offset++) {
      const idx = barIndex + offset;
      if (idx >= 0 && idx < bars.length) {
        candidateIndices.push(idx);
      }
    }
  } else {
    // If no specific bar index, inspect the last 50 bars
    const start = Math.max(0, bars.length - 60);
    for (let i = start; i < bars.length; i++) {
      candidateIndices.push(i);
    }
  }

  let bestPrice: number | null = null;
  let bestDistPx = Infinity;
  let bestType: 'High' | 'Low' | 'Open' | 'Close' | null = null;
  let bestY: number | undefined = undefined;

  for (const idx of candidateIndices) {
    const bar = bars[idx];
    const points: Array<{ val: number; type: 'High' | 'Low' | 'Open' | 'Close' }> = [
      { val: bar.high, type: 'High' },
      { val: bar.low, type: 'Low' },
      { val: bar.close, type: 'Close' },
      { val: bar.open, type: 'Open' },
    ];

    for (const pt of points) {
      const coord = series.priceToCoordinate(pt.val);
      if (coord !== null) {
        const dist = Math.abs(mouseY - coord);
        if (dist <= snapThresholdPx && dist < bestDistPx) {
          bestDistPx = dist;
          bestPrice = pt.val;
          bestType = pt.type;
          bestY = coord;
        }
      }
    }
  }

  if (bestPrice !== null && bestType !== null) {
    return {
      price: Number(bestPrice.toFixed(4)),
      snappedType: bestType,
      yCoord: bestY,
    };
  }

  return {
    price: snapToTickSize(price),
    snappedType: 'Tick',
  };
}

/**
 * Legacy OHLC snap fallback
 */
export function snapToOHLC(
  price: number,
  bars: Array<{ high: number; low: number; open: number; close: number }>,
  maxRangePct: number = 0.02
): number {
  if (!bars || bars.length === 0) return snapToTickSize(price);

  let nearest = price;
  let minDist = Infinity;

  const lastBar = bars[bars.length - 1];
  const firstBar = bars[0];
  const range = Math.abs((lastBar?.high || 100) - (firstBar?.low || 1)) || 1;

  for (let i = Math.max(0, bars.length - 100); i < bars.length; i++) {
    const b = bars[i];
    const points = [b.high, b.low, b.close, b.open];
    for (const val of points) {
      const dist = Math.abs(val - price);
      if (dist < minDist) {
        minDist = dist;
        nearest = val;
      }
    }
  }

  if (minDist / range <= maxRangePct) {
    return Number(nearest.toFixed(4));
  }
  return snapToTickSize(price);
}

export interface TouchAnalysis {
  count: number;
  strength: 'weak' | 'moderate' | 'strong';
  label: string;
}

/**
 * Count how many candles tested or reacted to this level
 */
export function countTouches(
  linePrice: number,
  bars: Array<{ high: number; low: number; open: number; close: number }>,
  tolerancePct: number = 0.003
): number {
  if (!bars || bars.length === 0) return 0;
  const tolerance = linePrice * tolerancePct;
  let touches = 0;

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const touchedHigh = Math.abs(b.high - linePrice) <= tolerance;
    const touchedLow = Math.abs(b.low - linePrice) <= tolerance;
    if (touchedHigh || touchedLow) {
      touches++;
    }
  }
  return touches;
}

export function analyzeLineStrength(touchCount: number): TouchAnalysis {
  if (touchCount >= 5) {
    return { count: touchCount, strength: 'strong', label: `Tested ${touchCount}x (Rock Solid)` };
  }
  if (touchCount >= 3) {
    return { count: touchCount, strength: 'moderate', label: `Tested ${touchCount}x (Moderate)` };
  }
  if (touchCount >= 1) {
    return { count: touchCount, strength: 'weak', label: `Tested ${touchCount}x (Minor)` };
  }
  return { count: 0, strength: 'weak', label: 'Unverified Level' };
}

/**
 * Institutional Swing-based Support & Resistance Detector
 * Uses Multi-Horizon Pivots (Major 8, Minor 4), ATR-based Dynamic Spacing,
 * Polarity Flipping Bonus (Role Reversal), and Recency Scoring.
 * 100% Dynamic for ANY stock (Zero Hardcoding).
 */
export function detectSupportResistance(
  bars: Array<{ high: number; low: number; open: number; close: number }>,
  maxPerSide: number = 3
): AutoSRLevel[] {
  if (!bars || bars.length < 20) return [];

  // 1. Focus on the relevant trading cycle (last 250 bars ~ 1 trading year)
  const windowBars = bars.slice(Math.max(0, bars.length - 250));
  const currentPrice = windowBars[windowBars.length - 1].close;
  if (currentPrice <= 0) return [];

  // 2. Compute dynamic ATR (14 period) to adapt level separation to this stock's volatility
  let atrSum = 0;
  const atrPeriod = Math.min(14, windowBars.length - 1);
  for (let i = windowBars.length - atrPeriod; i < windowBars.length; i++) {
    const prevClose = windowBars[i - 1].close;
    const tr = Math.max(
      windowBars[i].high - windowBars[i].low,
      Math.abs(windowBars[i].high - prevClose),
      Math.abs(windowBars[i].low - prevClose)
    );
    atrSum += tr;
  }
  const atr = atrPeriod > 0 ? atrSum / atrPeriod : currentPrice * 0.02;
  // Minimum separation between levels: at least 1.2x ATR or 2.5% of price
  const minSeparation = Math.max(atr * 1.2, currentPrice * 0.025);

  // 3. Multi-lookback swing detection (Major: 8, Minor: 4)
  interface RawPivot {
    price: number;
    type: 'high' | 'low';
    index: number;
    isMajor: boolean;
  }
  const rawPivots: RawPivot[] = [];

  const checkSwing = (idx: number, lb: number): { isHigh: boolean; isLow: boolean } => {
    let isHigh = true;
    let isLow = true;
    const curr = windowBars[idx];
    for (let j = Math.max(0, idx - lb); j <= Math.min(windowBars.length - 1, idx + lb); j++) {
      if (j === idx) continue;
      if (windowBars[j].high > curr.high) isHigh = false;
      if (windowBars[j].low < curr.low) isLow = false;
    }
    return { isHigh, isLow };
  };

  for (let i = 4; i < windowBars.length - 2; i++) {
    // Check Major Swings (lookback 8)
    if (i >= 8 && i < windowBars.length - 4) {
      const major = checkSwing(i, 8);
      if (major.isHigh) rawPivots.push({ price: windowBars[i].high, type: 'high', index: i, isMajor: true });
      if (major.isLow) rawPivots.push({ price: windowBars[i].low, type: 'low', index: i, isMajor: true });
    }
    // Check Minor Swings (lookback 4)
    const minor = checkSwing(i, 4);
    if (minor.isHigh) rawPivots.push({ price: windowBars[i].high, type: 'high', index: i, isMajor: false });
    if (minor.isLow) rawPivots.push({ price: windowBars[i].low, type: 'low', index: i, isMajor: false });
  }

  // Always include absolute ATH in this trading cycle
  const highestBar = windowBars.reduce((prev, curr) => (curr.high > prev.high ? curr : prev), windowBars[0]);
  if (highestBar.high > currentPrice) {
    rawPivots.push({ price: highestBar.high, type: 'high', index: windowBars.indexOf(highestBar), isMajor: true });
  }

  // 4. Cluster nearby levels within 1.5%
  interface PivotCluster {
    price: number;
    score: number;
    hasHigh: boolean;
    hasLow: boolean;
    touchCount: number;
    lastSeenIndex: number;
  }
  const clusters: PivotCluster[] = [];

  for (const pivot of rawPivots) {
    const cluster = clusters.find((c) => Math.abs(c.price - pivot.price) / pivot.price <= 0.018);
    const recencyWeight = (pivot.index / windowBars.length) * 2; // Fresh levels get higher weight
    const pivotScore = (pivot.isMajor ? 3 : 1.5) + recencyWeight;

    if (cluster) {
      cluster.score += pivotScore;
      cluster.touchCount += 1;
      cluster.lastSeenIndex = Math.max(cluster.lastSeenIndex, pivot.index);
      if (pivot.type === 'high') cluster.hasHigh = true;
      if (pivot.type === 'low') cluster.hasLow = true;
      cluster.price = cluster.price * 0.6 + pivot.price * 0.4;
    } else {
      clusters.push({
        price: pivot.price,
        score: pivotScore,
        hasHigh: pivot.type === 'high',
        hasLow: pivot.type === 'low',
        touchCount: 1,
        lastSeenIndex: pivot.index,
      });
    }
  }

  // 5. Apply Polarity Bonus (Role Reversal: acted as both high and low!)
  for (const c of clusters) {
    if (c.hasHigh && c.hasLow) {
      c.score += 4.0; // Institutional S/R Flipping
    }
    // Psychological round number bonus
    const isRound = Math.round(c.price) % 10 === 0 || Math.round(c.price) % 5 === 0;
    if (isRound) c.score += 1.5;
  }

  // 6. Separate into Resistances (above currentPrice) and Supports (below currentPrice)
  const candidatesAbove = clusters
    .filter((c) => c.price >= currentPrice * 1.008)
    .sort((a, b) => b.score - a.score);

  const candidatesBelow = clusters
    .filter((c) => c.price <= currentPrice * 0.992)
    .sort((a, b) => b.score - a.score);

  // Pick levels ensuring separation by minSeparation
  const pickedResistances: { price: number; strength: number }[] = [];
  for (const cand of candidatesAbove) {
    if (pickedResistances.length >= maxPerSide) break;
    const isSeparated = pickedResistances.every((p) => Math.abs(p.price - cand.price) >= minSeparation);
    if (isSeparated) {
      pickedResistances.push({ price: cand.price, strength: Math.min(5, Math.max(1, Math.round(cand.score / 2))) });
    }
  }

  const pickedSupports: { price: number; strength: number }[] = [];
  for (const cand of candidatesBelow) {
    if (pickedSupports.length >= maxPerSide) break;
    const isSeparated = pickedSupports.every((p) => Math.abs(p.price - cand.price) >= minSeparation);
    if (isSeparated) {
      pickedSupports.push({ price: cand.price, strength: Math.min(5, Math.max(1, Math.round(cand.score / 2))) });
    }
  }

  // If price is near ATH and only 1 resistance found, or none found, project key psychological extension
  if (pickedResistances.length === 0) {
    const r1 = snapToTickSize(currentPrice * 1.05);
    const r2 = snapToTickSize(currentPrice * 1.10);
    pickedResistances.push({ price: r1, strength: 2 });
    pickedResistances.push({ price: r2, strength: 3 });
  } else if (pickedResistances.length === 1 && pickedResistances[0].price < currentPrice * 1.08) {
    const nextMilestone = snapToTickSize(pickedResistances[0].price * 1.06);
    pickedResistances.push({ price: nextMilestone, strength: 2 });
  }

  // Sort resistances ascending: R1 is nearest above current price, R2 higher, R3 highest
  pickedResistances.sort((a, b) => a.price - b.price);

  // Sort supports descending: S1 is nearest below current price, S2 lower, S3 lowest
  pickedSupports.sort((a, b) => b.price - a.price);

  const resistances: AutoSRLevel[] = pickedResistances.map((r) => ({
    price: snapToTickSize(r.price),
    strength: r.strength,
    type: 'resistance',
  }));

  const supports: AutoSRLevel[] = pickedSupports.map((s) => ({
    price: snapToTickSize(s.price),
    strength: s.strength,
    type: 'support',
  }));

  return [...resistances, ...supports];
}
