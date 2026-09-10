/**
 * Pure client-side Exponential Moving Average (EMA) calculation.
 * Matches the server-side calcEMASeries formula 1:1.
 *
 * @param closes Array of closing prices
 * @param period EMA lookback period (e.g., 20, 50, 150, 200)
 * @returns Array of the same length as closes, with null for indices before (period - 1)
 */
export function computeEMA(closes: number[], period: number): (number | null)[] {
  if (!closes || closes.length === 0) return [];
  if (period <= 0 || closes.length < period) {
    return new Array(closes.length).fill(null);
  }

  const k = 2 / (period + 1);
  const result: (number | null)[] = new Array(closes.length).fill(null);

  // Seed with Simple Moving Average (SMA) of first `period` bars
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closes[i];
  }
  result[period - 1] = sum / period;

  // Compute EMA iteratively
  for (let i = period; i < closes.length; i++) {
    const prev = result[i - 1];
    if (prev !== null) {
      result[i] = closes[i] * k + prev * (1 - k);
    } else {
      result[i] = closes[i];
    }
  }

  return result;
}
