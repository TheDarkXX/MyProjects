/**
 * FluidTrades - SMC Lite (Smart Money Concepts Lite)
 * Supply & Demand Zones, POI Equilibrium Lines, Break of Structure (BOS),
 * Dual SMA Trend Filter, Signal Crossovers, Zigzag, and Price Action Labels.
 */

import { SMCLiteConfig } from '../../types/indicatorConfig';

export interface SMCZone {
  id: string;
  type: 'SUPPLY' | 'DEMAND';
  startIndex: number;
  startTime: string;
  top: number;
  bottom: number;
  poi: number;
  isBroken: boolean;
  brokenIndex?: number;
  brokenTime?: string;
}

export interface SMCBOS {
  id: string;
  startIndex: number;
  startTime: string;
  endIndex: number;
  endTime: string;
  level: number;
  type: 'SUPPLY_BOS' | 'DEMAND_BOS';
}

export interface SMCZigzagPoint {
  index: number;
  time: string;
  price: number;
  isHigh: boolean;
}

export interface SMCPriceActionLabel {
  index: number;
  time: string;
  price: number;
  text: 'HH' | 'LH' | 'HL' | 'LL';
  isHigh: boolean;
}

export interface SMCSignal {
  index: number;
  time: string;
  type: 'BUY' | 'SELL';
  price: number;
  text: string;
}

export interface SMCResult {
  activeSupplyZones: SMCZone[];
  activeDemandZones: SMCZone[];
  bosLines: SMCBOS[];
  zigzagPoints: SMCZigzagPoint[];
  priceActionLabels: SMCPriceActionLabel[];
  fastSMA: (number | null)[];
  slowSMA: (number | null)[];
  signals: SMCSignal[];
}

export interface BarInput {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

// -------------------------------------------------------------
// ATR Helper: 50-period RMA of True Range (matching Pine Script)
// -------------------------------------------------------------
export function computeATR(bars: BarInput[], period: number = 50): number[] {
  const n = bars.length;
  const atr: number[] = new Array(n).fill(0);
  if (n === 0) return atr;

  const tr: number[] = new Array(n).fill(0);
  tr[0] = bars[0].high - bars[0].low;

  for (let i = 1; i < n; i++) {
    const hl = bars[i].high - bars[i].low;
    const hc = Math.abs(bars[i].high - bars[i - 1].close);
    const lc = Math.abs(bars[i].low - bars[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  // RMA of TR
  const alpha = 1 / period;
  let sum = 0;
  const initLen = Math.min(period, n);
  for (let i = 0; i < initLen; i++) {
    sum += tr[i];
  }
  let prev = sum / initLen;
  for (let i = 0; i < initLen; i++) {
    atr[i] = prev;
  }

  for (let i = initLen; i < n; i++) {
    const curr = alpha * tr[i] + (1 - alpha) * prev;
    atr[i] = curr;
    prev = curr;
  }

  return atr;
}

// -------------------------------------------------------------
// SMA Helper
// -------------------------------------------------------------
export function computeSMA(src: number[], len: number): (number | null)[] {
  const n = src.length;
  const result: (number | null)[] = new Array(n).fill(null);
  if (len <= 0 || n < len) return result;

  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += src[i];
  }
  result[len - 1] = sum / len;

  for (let i = len; i < n; i++) {
    sum += src[i] - src[i - len];
    result[i] = sum / len;
  }
  return result;
}

// -------------------------------------------------------------
// Overlap Check Helper (f_check_overlapping)
// -------------------------------------------------------------
function checkOverlapping(newPoi: number, existingZones: SMCZone[], atr: number): boolean {
  const atrThreshold = atr * 2;
  for (const zone of existingZones) {
    if (zone.isBroken) continue;
    const lower = zone.poi - atrThreshold;
    const upper = zone.poi + atrThreshold;
    if (newPoi >= lower && newPoi <= upper) {
      return false; // Overlapping, do not draw
    }
  }
  return true;
}

// -------------------------------------------------------------
// Core Engine: computeSMCLite
// -------------------------------------------------------------
export function computeSMCLite(
  bars: BarInput[],
  config?: Partial<SMCLiteConfig>
): SMCResult {
  const n = bars.length;
  if (n === 0) {
    return {
      activeSupplyZones: [],
      activeDemandZones: [],
      bosLines: [],
      zigzagPoints: [],
      priceActionLabels: [],
      fastSMA: [],
      slowSMA: [],
      signals: [],
    };
  }

  const swingLength = config?.swingLength ?? 10;
  const boxWidth = config?.boxWidth ?? 2.5;
  const historyToKeep = config?.historyToKeep ?? 20;

  const showSMA = config?.showSMA ?? true;
  const showFastSMA = config?.showFastSMA ?? false;
  const showSlowSMA = config?.showSlowSMA ?? true;
  const smaFastLen = config?.smaFastLen ?? 15;
  const smaSlowLen = config?.smaSlowLen ?? 200;

  const showArrows = config?.showArrows ?? true;
  const showLabels = config?.showLabels ?? true;
  const showPriceOnly = config?.showPriceOnly ?? false;
  const labelDistance = config?.labelDistance ?? 1.5;

  const atr50 = computeATR(bars, 50);
  const atr14 = computeATR(bars, 14);

  // Storage
  const activeSupplyZones: SMCZone[] = [];
  const activeDemandZones: SMCZone[] = [];
  const bosLines: SMCBOS[] = [];
  const priceActionLabels: SMCPriceActionLabel[] = [];

  const prevSwingHighs: number[] = [];
  const prevSwingLows: number[] = [];

  let zoneCounter = 0;

  // Main Bar-by-Bar Loop
  for (let i = swingLength * 2; i < n; i++) {
    const pivotIdx = i - swingLength;
    const currentAtr = atr50[i] || bars[i].close * 0.01;
    const atrBuffer = currentAtr * (boxWidth / 10);

    // 1. Detect Pivot High: bar at pivotIdx is >= surrounding swingLength bars
    let isPivotHigh = true;
    const highVal = bars[pivotIdx].high;
    for (let k = pivotIdx - swingLength; k < pivotIdx; k++) {
      if (bars[k].high > highVal) {
        isPivotHigh = false;
        break;
      }
    }
    if (isPivotHigh) {
      for (let k = pivotIdx + 1; k <= pivotIdx + swingLength; k++) {
        if (bars[k].high >= highVal) {
          isPivotHigh = false;
          break;
        }
      }
    }

    if (isPivotHigh) {
      // Manage Swing High Labels (HH / LH)
      let labelText: 'HH' | 'LH' = 'HH';
      if (prevSwingHighs.length > 0) {
        labelText = highVal >= prevSwingHighs[0] ? 'HH' : 'LH';
      }
      prevSwingHighs.unshift(highVal);
      if (prevSwingHighs.length > 5) prevSwingHighs.pop();

      priceActionLabels.push({
        index: pivotIdx,
        time: bars[pivotIdx].time,
        price: highVal,
        text: labelText,
        isHigh: true,
      });

      // Supply Zone Calculation
      const boxTop = highVal;
      const boxBottom = boxTop - atrBuffer;
      const poi = (boxTop + boxBottom) / 2;

      const okayToDraw = checkOverlapping(poi, activeSupplyZones, currentAtr);
      if (okayToDraw) {
        if (activeSupplyZones.length >= historyToKeep) {
          activeSupplyZones.shift(); // Remove oldest
        }
        activeSupplyZones.push({
          id: `supply_${++zoneCounter}`,
          type: 'SUPPLY',
          startIndex: pivotIdx,
          startTime: bars[pivotIdx].time,
          top: boxTop,
          bottom: boxBottom,
          poi,
          isBroken: false,
        });
      }
    }

    // 2. Detect Pivot Low: bar at pivotIdx is <= surrounding swingLength bars
    let isPivotLow = true;
    const lowVal = bars[pivotIdx].low;
    for (let k = pivotIdx - swingLength; k < pivotIdx; k++) {
      if (bars[k].low < lowVal) {
        isPivotLow = false;
        break;
      }
    }
    if (isPivotLow) {
      for (let k = pivotIdx + 1; k <= pivotIdx + swingLength; k++) {
        if (bars[k].low <= lowVal) {
          isPivotLow = false;
          break;
        }
      }
    }

    if (isPivotLow) {
      // Manage Swing Low Labels (HL / LL)
      let labelText: 'HL' | 'LL' = 'HL';
      if (prevSwingLows.length > 0) {
        labelText = lowVal >= prevSwingLows[0] ? 'HL' : 'LL';
      }
      prevSwingLows.unshift(lowVal);
      if (prevSwingLows.length > 5) prevSwingLows.pop();

      priceActionLabels.push({
        index: pivotIdx,
        time: bars[pivotIdx].time,
        price: lowVal,
        text: labelText,
        isHigh: false,
      });

      // Demand Zone Calculation
      const boxBottom = lowVal;
      const boxTop = boxBottom + atrBuffer;
      const poi = (boxTop + boxBottom) / 2;

      const okayToDraw = checkOverlapping(poi, activeDemandZones, currentAtr);
      if (okayToDraw) {
        if (activeDemandZones.length >= historyToKeep) {
          activeDemandZones.shift(); // Remove oldest
        }
        activeDemandZones.push({
          id: `demand_${++zoneCounter}`,
          type: 'DEMAND',
          startIndex: pivotIdx,
          startTime: bars[pivotIdx].time,
          top: boxTop,
          bottom: boxBottom,
          poi,
          isBroken: false,
        });
      }
    }

    // 3. Check Breaks of Structure (BOS) on current bar close
    const currentClose = bars[i].close;

    // Check Supply zones broken to the upside
    for (let s = activeSupplyZones.length - 1; s >= 0; s--) {
      const zone = activeSupplyZones[s];
      if (!zone.isBroken && currentClose >= zone.top) {
        zone.isBroken = true;
        zone.brokenIndex = i;
        zone.brokenTime = bars[i].time;

        bosLines.push({
          id: `bos_${zone.id}`,
          startIndex: zone.startIndex,
          startTime: zone.startTime,
          endIndex: i,
          endTime: bars[i].time,
          level: zone.poi,
          type: 'SUPPLY_BOS',
        });
        if (bosLines.length > 10) bosLines.shift();
        activeSupplyZones.splice(s, 1);
      }
    }

    // Check Demand zones broken to the downside
    for (let d = activeDemandZones.length - 1; d >= 0; d--) {
      const zone = activeDemandZones[d];
      if (!zone.isBroken && currentClose <= zone.bottom) {
        zone.isBroken = true;
        zone.brokenIndex = i;
        zone.brokenTime = bars[i].time;

        bosLines.push({
          id: `bos_${zone.id}`,
          startIndex: zone.startIndex,
          startTime: zone.startTime,
          endIndex: i,
          endTime: bars[i].time,
          level: zone.poi,
          type: 'DEMAND_BOS',
        });
        if (bosLines.length > 10) bosLines.shift();
        activeDemandZones.splice(d, 1);
      }
    }
  }

  // 4. Zigzag Calculation (Matching Pine Script lines 183-228)
  const zigzagPoints: SMCZigzagPoint[] = [];
  const zzSpan = swingLength * 2 + 1;

  if (n >= zzSpan) {
    let dirUp = false;
    let lastLow = bars[0].high * 100;
    let lastHigh = 0;
    let timeLow = 0;
    let timeHigh = 0;

    for (let i = zzSpan; i < n; i++) {
      const startIdx = i - zzSpan + 1;
      let highestH = bars[startIdx].high;
      let lowestL = bars[startIdx].low;

      for (let k = startIdx; k <= i; k++) {
        if (bars[k].high > highestH) highestH = bars[k].high;
        if (bars[k].low < lowestL) lowestL = bars[k].low;
      }

      const evalIdx = i - swingLength;
      const isMin = bars[evalIdx].low === lowestL;
      const isMax = bars[evalIdx].high === highestH;

      if (dirUp) {
        if (isMin && bars[evalIdx].low < lastLow) {
          lastLow = bars[evalIdx].low;
          timeLow = evalIdx;
          if (zigzagPoints.length > 0 && !zigzagPoints[zigzagPoints.length - 1].isHigh) {
            zigzagPoints.pop();
          }
          zigzagPoints.push({ index: timeLow, time: bars[timeLow].time, price: lastLow, isHigh: false });
        }
        if (isMax && bars[evalIdx].high > lastLow) {
          lastHigh = bars[evalIdx].high;
          timeHigh = evalIdx;
          dirUp = false;
          zigzagPoints.push({ index: timeHigh, time: bars[timeHigh].time, price: lastHigh, isHigh: true });
        }
      } else {
        if (isMax && bars[evalIdx].high > lastHigh) {
          lastHigh = bars[evalIdx].high;
          timeHigh = evalIdx;
          if (zigzagPoints.length > 0 && zigzagPoints[zigzagPoints.length - 1].isHigh) {
            zigzagPoints.pop();
          }
          zigzagPoints.push({ index: timeHigh, time: bars[timeHigh].time, price: lastHigh, isHigh: true });
        }
        if (isMin && bars[evalIdx].low < lastHigh) {
          lastLow = bars[evalIdx].low;
          timeLow = evalIdx;
          dirUp = true;
          zigzagPoints.push({ index: timeLow, time: bars[timeLow].time, price: lastLow, isHigh: false });
          if (isMax && bars[evalIdx].high > lastLow) {
            lastHigh = bars[evalIdx].high;
            timeHigh = evalIdx;
            dirUp = false;
            zigzagPoints.push({ index: timeHigh, time: bars[timeHigh].time, price: lastHigh, isHigh: true });
          }
        }
      }
    }
  }

  // 5. Calculate Fast & Slow SMAs
  const closes = bars.map(b => b.close);
  const fastSMA = computeSMA(closes, smaFastLen);
  const slowSMA = computeSMA(closes, smaSlowLen);

  // 6. SMA Crossover Signals (Strong Buy / Strong Sell)
  const signals: SMCSignal[] = [];
  for (let i = 1; i < n; i++) {
    const fCurr = fastSMA[i];
    const fPrev = fastSMA[i - 1];
    const sCurr = slowSMA[i];
    const sPrev = slowSMA[i - 1];

    if (fCurr !== null && fPrev !== null && sCurr !== null && sPrev !== null) {
      const offset = (atr14[i] || bars[i].close * 0.01) * labelDistance;

      // Bullish Crossover (Fast crosses above Slow)
      if (fCurr > sCurr && fPrev <= sPrev) {
        const text = showPriceOnly ? bars[i].close.toFixed(2) : `Strong Buy\n${bars[i].close.toFixed(2)}`;
        signals.push({
          index: i,
          time: bars[i].time,
          type: 'BUY',
          price: bars[i].low - offset,
          text,
        });
      }
      // Bearish Crossunder (Fast crosses below Slow)
      else if (fCurr < sCurr && fPrev >= sPrev) {
        const text = showPriceOnly ? bars[i].close.toFixed(2) : `Strong Sell\n${bars[i].close.toFixed(2)}`;
        signals.push({
          index: i,
          time: bars[i].time,
          type: 'SELL',
          price: bars[i].high + offset,
          text,
        });
      }
    }
  }

  return {
    activeSupplyZones,
    activeDemandZones,
    bosLines,
    zigzagPoints,
    priceActionLabels,
    fastSMA,
    slowSMA,
    signals,
  };
}
