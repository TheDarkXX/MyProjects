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
 * Classifies levels into Major Resistance (above current price) and Major Support (below current price)
 */
export function detectSupportResistance(
  bars: Array<{ high: number; low: number; open: number; close: number }>,
  lookback: number = 12,
  maxPerSide: number = 2
): AutoSRLevel[] {
  if (!bars || bars.length < lookback * 2) return [];

  const currentPrice = bars[bars.length - 1].close;
  const rawHighs: { price: number; strength: number }[] = [];
  const rawLows: { price: number; strength: number }[] = [];

  for (let i = lookback; i < bars.length - lookback; i++) {
    const current = bars[i];

    let isSwingHigh = true;
    let isSwingLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (bars[j].high > current.high) isSwingHigh = false;
      if (bars[j].low < current.low) isSwingLow = false;
    }

    if (isSwingHigh) {
      rawHighs.push({ price: current.high, strength: 1 });
    }
    if (isSwingLow) {
      rawLows.push({ price: current.low, strength: 1 });
    }
  }

  // Cluster nearby levels (within 0.9% of price)
  const clusterItems = (items: { price: number; strength: number }[]) => {
    const clustered: { price: number; strength: number }[] = [];
    for (const item of items) {
      const found = clustered.find(c => Math.abs(c.price - item.price) / item.price <= 0.009);
      if (found) {
        found.strength += 1;
        found.price = Number(((found.price + item.price) / 2).toFixed(4));
      } else {
        clustered.push({ ...item });
      }
    }
    return clustered;
  };

  const clusteredHighs = clusterItems(rawHighs);
  const clusteredLows = clusterItems(rawLows);

  // Resistances: levels above current price (or highest swing highs)
  const resistances = clusteredHighs
    .filter(item => item.price >= currentPrice * 0.995)
    .sort((a, b) => b.strength - a.strength || a.price - b.price)
    .slice(0, maxPerSide)
    .map(r => ({ price: snapToTickSize(r.price), strength: r.strength, type: 'resistance' as const }));

  // Supports: levels below current price (or lowest swing lows)
  const supports = clusteredLows
    .filter(item => item.price <= currentPrice * 1.005)
    .sort((a, b) => b.strength - a.strength || b.price - a.price)
    .slice(0, maxPerSide)
    .map(s => ({ price: snapToTickSize(s.price), strength: s.strength, type: 'support' as const }));

  return [...resistances, ...supports];
}
