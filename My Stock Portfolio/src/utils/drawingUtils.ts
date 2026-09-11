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
  hitZonePx: number = 6
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

/**
 * Magnet snap to nearest OHLC of visible bars
 */
export function snapToOHLC(
  price: number,
  bars: Array<{ high: number; low: number; open: number; close: number }>,
  maxRangePct: number = 0.015
): number {
  if (!bars || bars.length === 0) return price;

  let nearest = price;
  let minDist = Infinity;

  for (let i = 0; i < bars.length; i++) {
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

  const lastBar = bars[bars.length - 1];
  const firstBar = bars[0];
  const range = Math.abs((lastBar?.high || 100) - (firstBar?.low || 1)) || 1;

  if (minDist / range <= maxRangePct) {
    return Number(nearest.toFixed(4));
  }
  return price;
}

/**
 * Count how many candles tested or bounced off this line (Touch Counter)
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

/**
 * Auto-detect Support and Resistance levels from Swing High/Low
 */
export function detectSupportResistance(
  bars: Array<{ high: number; low: number; open: number; close: number }>,
  lookback: number = 15,
  maxLevels: number = 5
): AutoSRLevel[] {
  if (!bars || bars.length < lookback * 2) return [];

  const rawLevels: AutoSRLevel[] = [];

  for (let i = lookback; i < bars.length - lookback; i++) {
    const current = bars[i];

    let isHigh = true;
    let isLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (bars[j].high > current.high) isHigh = false;
      if (bars[j].low < current.low) isLow = false;
    }

    if (isHigh) {
      rawLevels.push({ price: current.high, strength: 1, type: 'resistance' });
    }
    if (isLow) {
      rawLevels.push({ price: current.low, strength: 1, type: 'support' });
    }
  }

  // Cluster nearby levels (within 0.8% of price)
  const clustered: AutoSRLevel[] = [];
  for (const item of rawLevels) {
    const existing = clustered.find(c => Math.abs(c.price - item.price) / item.price <= 0.008);
    if (existing) {
      existing.strength += 1;
      existing.price = Number(((existing.price + item.price) / 2).toFixed(4));
    } else {
      clustered.push({ ...item });
    }
  }

  return clustered.sort((a, b) => b.strength - a.strength).slice(0, maxLevels);
}
