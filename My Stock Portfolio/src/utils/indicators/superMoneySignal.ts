/**
 * Super Money Signal V3 (TradingView Pine Script v6 Parity)
 * 
 * Strict 2-Stage Institutional Entry System:
 * - Stage 1 (Ready Signal - White Shape at Bottom): Scout Entry when Banker emerges from >= 5 zero days (Day 3..4).
 * - Stage 2 (Buy Signal - Yellow Triangle below bar): Confirmation Entry when Banker >= 5 days and Hot Money > 15 (Day 5..14).
 * - Stage 3 (No Signal - Maroon Cross below bar): Inflow exhaustion or breakdown.
 */

import { SuperMoneySignalConfig } from '../../types/indicatorConfig';

export interface BarInput {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SuperMoneySignalResult {
  readySignals: boolean[];
  buySignals: boolean[];
  noSignals: boolean[];
  rsiBanker: number[];
  rsiHotMoney: number[];
  bankerMa: number[];
  currentDirection: 1 | 2 | -1 | 0; // 1: READY, 2: BUY, -1: NO SIGNAL, 0: NEUTRAL
  currentBarCount: number;
  currentStatusText: string;
}

/**
 * Fast Running Wilder's RSI calculation (ta.rsi)
 */
function computeRSI(closes: number[], period: number): (number | null)[] {
  const n = closes.length;
  const result: (number | null)[] = new Array(n).fill(null);
  if (n <= period) return result;

  let sumGain = 0;
  let sumLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) sumGain += diff;
    else sumLoss += -diff;
  }

  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < n; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/**
 * RSI Clamping function: sensitivity * (RSI - base) clamped to [0, 20]
 */
function rsi_function(rsiVal: number | null, sensitivity: number, base: number): number {
  if (rsiVal === null) return 0;
  const raw = sensitivity * (rsiVal - base);
  if (raw > 20) return 20;
  if (raw < 0) return 0;
  return Number(raw.toFixed(2));
}

/**
 * EMA calculation
 */
function computeEMA(src: number[], len: number): number[] {
  const n = src.length;
  const out = new Array(n).fill(0);
  if (n === 0) return out;
  const alpha = 2 / (len + 1);
  let prev = src[0];
  out[0] = prev;
  for (let i = 1; i < n; i++) {
    prev = alpha * src[i] + (1 - alpha) * prev;
    out[i] = Number(prev.toFixed(2));
  }
  return out;
}

export function computeSuperMoneySignal(
  bars: BarInput[],
  config?: Partial<SuperMoneySignalConfig>
): SuperMoneySignalResult {
  const n = bars.length;
  if (n === 0) {
    return {
      readySignals: [],
      buySignals: [],
      noSignals: [],
      rsiBanker: [],
      rsiHotMoney: [],
      bankerMa: [],
      currentDirection: 0,
      currentBarCount: 0,
      currentStatusText: '■ NEUTRAL',
    };
  }

  const bankerBase = config?.bankerBase ?? 50;
  const bankerRsiPeriod = config?.bankerRsiPeriod ?? 50;
  const hotMoneyRsiBase = config?.hotMoneyRsiBase ?? 30;
  const hotMoneyRsiPeriod = config?.hotMoneyRsiPeriod ?? 40;
  const sensitivityBanker = config?.sensitivityBanker ?? 1.5;
  const sensitivityHotMoney = config?.sensitivityHotMoney ?? 0.7;

  const readyDays = config?.readyDays ?? 3;
  const buyDays = config?.buyDays ?? 5;
  const noSignalDays = config?.noSignalDays ?? 3;

  const closes = bars.map((b) => b.close);

  // 1. Calculate Wilder's RSIs
  const rsiBankerRaw = computeRSI(closes, bankerRsiPeriod);
  const rsiHotMoneyRaw = computeRSI(closes, hotMoneyRsiPeriod);

  // 2. Map to Clamped Flow [0, 20]
  const rsiBanker = new Array(n);
  const rsiHotMoney = new Array(n);
  for (let i = 0; i < n; i++) {
    rsiBanker[i] = rsi_function(rsiBankerRaw[i], sensitivityBanker, bankerBase);
    rsiHotMoney[i] = rsi_function(rsiHotMoneyRaw[i], sensitivityHotMoney, hotMoneyRsiBase);
  }

  // 3. Banker MA (10-period EMA of Banker flow)
  const bankerMa = computeEMA(rsiBanker, 10);

  // 4. Consecutive Counters & Cycle State Machine
  const readySignals = new Array(n).fill(false);
  const buySignals = new Array(n).fill(false);
  const noSignals = new Array(n).fill(false);

  let consecutiveZeroBefore = 0;
  let consecutiveZeroDays = 0;
  let consecutivePositiveDays = 0;
  let daysAfterZero = 0;
  let startedFromZero = false;
  let readyFired = false;
  let buyFired = false;
  let direction: 1 | 2 | -1 | 0 = 0;

  for (let i = 0; i < n; i++) {
    const bVal = rsiBanker[i];
    const hVal = rsiHotMoney[i];
    const bMa = bankerMa[i];
    const prevBMa = i > 0 ? bankerMa[i - 1] : bMa;

    const bankerZero = bVal === 0;
    const bankerPositive = bVal > 0;
    const bankerMADecreasing = bMa < prevBMa;
    const hotMoneyAbove15 = hVal > 15;

    if (bankerZero) {
      consecutiveZeroBefore++;
      consecutiveZeroDays++;
      consecutivePositiveDays = 0;

      // If at least 3 zero days, end any active cycle
      if (consecutiveZeroDays >= noSignalDays) {
        if (readyFired || buyFired) {
          noSignals[i] = true;
          direction = -1;
        }
        startedFromZero = false;
        readyFired = false;
        buyFired = false;
        daysAfterZero = 0;
      }
    } else {
      // Banker is positive (> 0)
      if (i > 0 && rsiBanker[i - 1] === 0) {
        // Just crossed above 0! Check if baseline had >= 5 zeros
        if (consecutiveZeroBefore >= 5) {
          startedFromZero = true;
          daysAfterZero = 1;
          readyFired = false;
          buyFired = false;
        } else {
          startedFromZero = false;
        }
      } else if (startedFromZero) {
        daysAfterZero++;
      }
      consecutiveZeroBefore = 0;
      consecutiveZeroDays = 0;
      consecutivePositiveDays++;
    }

    // TRIGGER 1: Ready Signal (White shape at bottom - Stage 1 Scout Entry)
    // Exactly 1 crisp marker on the first bar when count reaches readyDays (3..4)
    if (
      startedFromZero &&
      consecutivePositiveDays >= readyDays &&
      consecutivePositiveDays < buyDays &&
      daysAfterZero <= 14 &&
      !readyFired
    ) {
      readySignals[i] = true;
      readyFired = true;
      direction = 1;
    }

    // TRIGGER 2: Buy Signal (Yellow triangle below candle - Stage 2 Momentum Confirmation Entry)
    // Exactly 1 crisp marker on the first bar when count reaches buyDays (>= 5) with Hot Money > 15
    if (
      startedFromZero &&
      consecutivePositiveDays >= buyDays &&
      daysAfterZero <= 14 &&
      hotMoneyAbove15 &&
      !buyFired
    ) {
      buySignals[i] = true;
      buyFired = true;
      direction = 2;
    }

    // TRIGGER 3: No Signal (Maroon cross - Exit / Invalidation)
    if (
      (startedFromZero || readyFired || buyFired) &&
      (consecutiveZeroDays >= noSignalDays || (bankerMADecreasing && consecutivePositiveDays >= 3 && daysAfterZero > 14))
    ) {
      if (readyFired || buyFired) {
        noSignals[i] = true;
        direction = -1;
      }
      startedFromZero = false;
      readyFired = false;
      buyFired = false;
      daysAfterZero = 0;
    }
  }

  // Current status badge string for Screener table / Pane 0 header
  let statusText = '■ NEUTRAL';
  let barCount = 0;

  if (direction === 1) {
    barCount = consecutivePositiveDays;
    statusText = `🔍 READY [${barCount}]`;
  } else if (direction === 2) {
    barCount = consecutivePositiveDays;
    statusText = `🔺 BUY [${barCount}]`;
  } else if (direction === -1) {
    barCount = consecutiveZeroDays;
    statusText = `⛔ NO SIGNAL [${barCount}]`;
  }

  return {
    readySignals,
    buySignals,
    noSignals,
    rsiBanker,
    rsiHotMoney,
    bankerMa,
    currentDirection: direction,
    currentBarCount: barCount,
    currentStatusText: statusText,
  };
}
