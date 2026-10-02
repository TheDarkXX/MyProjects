import { useState, useEffect, useRef } from 'react';
import { api } from '../../../services/api';
import { getCachedCandles, setCachedCandles } from '../../../utils/chartIdbCache';
import { CompareTimeFrame, CompareRefSeries } from '../../../stores/xchartStore';

export interface CompareDataPoint {
  time: string; // 'YYYY-MM-DD'
  value: number; // Normalized return % (e.g. +25.40%)
}

export interface NormalizedTickerSeries {
  id: string;
  symbol: string;
  name?: string;
  color: string;
  lineWidth: 1 | 2 | 3 | 4;
  lineStyle: 'SOLID' | 'DASHED' | 'DOTTED';
  opacity: number;
  visible: boolean;
  isTarget?: boolean;
  data: CompareDataPoint[];
  latestReturn: number | null;
  basePrice: number | null;
  currentPrice: number | null;
  startDate?: string;
}

export interface RawChartData {
  dates: string[];
  closes: number[];
  currentPrice?: number;
}

export function calculateStartDate(timeframe: CompareTimeFrame, availableDates?: string[]): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  switch (timeframe) {
    case '1M': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return formatDate(d);
    }
    case '3M': {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return formatDate(d);
    }
    case '6M': {
      const d = new Date(now);
      d.setDate(d.getDate() - 180);
      return formatDate(d);
    }
    case 'YTD': {
      return `${now.getFullYear()}-01-01`;
    }
    case '1Y': {
      const d = new Date(now);
      d.setDate(d.getDate() - 365);
      return formatDate(d);
    }
    case '3Y': {
      const d = new Date(now);
      d.setDate(d.getDate() - 365 * 3);
      return formatDate(d);
    }
    case '5Y': {
      const d = new Date(now);
      d.setDate(d.getDate() - 365 * 5);
      return formatDate(d);
    }
    case 'MAX':
    default: {
      if (availableDates && availableDates.length > 0) {
        return availableDates[0];
      }
      return '1970-01-01';
    }
  }
}

/**
 * Pure function: Transforms raw ticker historical prices into a normalized 0% baseline series
 * starting from fromDate. Handles IPO (staggered inception), trading halts, and calendar forward-fill.
 */
export function normalizeTickerData(
  raw: RawChartData,
  masterDates: string[],
  fromDate: string
): {
  points: CompareDataPoint[];
  latestReturn: number | null;
  basePrice: number | null;
  actualBaseDate: string | null;
} {
  if (!raw.dates || raw.dates.length === 0 || !raw.closes || raw.closes.length === 0 || masterDates.length === 0) {
    return { points: [], latestReturn: null, basePrice: null, actualBaseDate: null };
  }

  // 1. Build fast price lookup: date -> close
  const priceMap = new Map<string, number>();
  for (let i = 0; i < raw.dates.length; i++) {
    const c = raw.closes[i];
    if (c != null && c > 0 && isFinite(c)) {
      priceMap.set(raw.dates[i], c);
    }
  }

  if (priceMap.size === 0) {
    return { points: [], latestReturn: null, basePrice: null, actualBaseDate: null };
  }

  const stockFirstDate = raw.dates[0];

  // 2. Find first date in masterDates >= fromDate
  let windowStartDate = masterDates.find((d) => d >= fromDate);
  if (!windowStartDate) {
    windowStartDate = masterDates[0];
  }

  // Effective start date for this stock:
  // If the stock IPO'd AFTER windowStartDate, it starts on its first trading date (staggered inception)
  const effectiveStartDate = stockFirstDate > windowStartDate ? stockFirstDate : windowStartDate;

  // 3. Find base price P0 at effectiveStartDate:
  let basePrice: number | null = null;
  let actualBaseDate: string | null = null;

  if (priceMap.has(effectiveStartDate)) {
    basePrice = priceMap.get(effectiveStartDate)!;
    actualBaseDate = effectiveStartDate;
  } else {
    // Look backwards from effectiveStartDate for last known close
    for (let i = raw.dates.length - 1; i >= 0; i--) {
      if (raw.dates[i] <= effectiveStartDate) {
        const c = priceMap.get(raw.dates[i]);
        if (c != null && c > 0 && isFinite(c)) {
          basePrice = c;
          actualBaseDate = raw.dates[i];
          break;
        }
      }
    }
    // If not found backwards (e.g. IPO occurred), take the first available price
    if (basePrice == null) {
      for (let i = 0; i < raw.dates.length; i++) {
        const c = priceMap.get(raw.dates[i]);
        if (c != null && c > 0 && isFinite(c)) {
          basePrice = c;
          actualBaseDate = raw.dates[i];
          break;
        }
      }
    }
  }

  if (basePrice == null || basePrice <= 0 || !isFinite(basePrice)) {
    return { points: [], latestReturn: null, basePrice: null, actualBaseDate: null };
  }

  // 4. Generate points for all dates in masterDates >= effectiveStartDate
  const points: CompareDataPoint[] = [];
  let lastKnownClose = basePrice;

  for (const d of masterDates) {
    if (d < effectiveStartDate) continue;

    const currentClose = priceMap.get(d);
    if (currentClose != null && currentClose > 0 && isFinite(currentClose)) {
      lastKnownClose = currentClose;
    }

    const returnPct = ((lastKnownClose - basePrice) / basePrice) * 100;
    points.push({
      time: d,
      value: Number(returnPct.toFixed(2)),
    });
  }

  const latestReturn = points.length > 0 ? points[points.length - 1].value : null;

  return {
    points,
    latestReturn,
    basePrice,
    actualBaseDate,
  };
}

export function useCompareData(
  targetSymbol: string,
  refs: CompareRefSeries[],
  timeframe: CompareTimeFrame,
  targetStyle: { color: string; lineWidth: 1 | 2 | 3 | 4; lineStyle: 'SOLID' | 'DASHED' | 'DOTTED'; opacity: number }
) {
  const [targetSeries, setTargetSeries] = useState<NormalizedTickerSeries | null>(null);
  const [refSeriesList, setRefSeriesList] = useState<NormalizedTickerSeries[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // In-memory cache for fast snappy switching
  const memCacheRef = useRef<Record<string, RawChartData>>({});
  const rawDataMapRef = useRef<Record<string, RawChartData>>({});
  const masterDatesRef = useRef<string[]>([]);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const cleanTarget = targetSymbol.trim().toUpperCase();
    const symbolsToFetch = Array.from(new Set([cleanTarget, ...refs.map((r) => r.symbol.trim().toUpperCase())]));

    async function fetchAllData() {
      try {
        const rawMap: Record<string, RawChartData> = {};

        // 1. Resolve from memory or IndexedDB cache for instant display
        const missingSymbols: string[] = [];
        for (const sym of symbolsToFetch) {
          if (memCacheRef.current[sym]) {
            rawMap[sym] = memCacheRef.current[sym];
          } else {
            try {
              const idbData = await getCachedCandles<any>(sym, '1D');
              if (idbData && idbData.dates && idbData.dates.length > 0 && idbData.closes) {
                rawMap[sym] = {
                  dates: idbData.dates,
                  closes: idbData.closes,
                  currentPrice: idbData.currentPrice || idbData.closes[idbData.closes.length - 1],
                };
                memCacheRef.current[sym] = rawMap[sym];
              } else {
                missingSymbols.push(sym);
              }
            } catch (_) {
              missingSymbols.push(sym);
            }
          }
        }

        // 2. Fetch missing symbols in parallel
        const fetchPromises = missingSymbols.map(async (sym) => {
          try {
            const apiRes = await api.chart.get(sym, 36500, '1D');
            if (apiRes && apiRes.dates && apiRes.closes) {
              const rawData: RawChartData = {
                dates: apiRes.dates,
                closes: apiRes.closes,
                currentPrice: apiRes.currentPrice || apiRes.closes[apiRes.closes.length - 1],
              };
              rawMap[sym] = rawData;
              memCacheRef.current[sym] = rawData;
              setCachedCandles(sym, '1D', apiRes);
            }
          } catch (e: any) {
            console.warn(`[useCompareData] Failed to fetch ${sym}:`, e);
          }
        });

        await Promise.allSettled(fetchPromises);

        if (isCancelled) return;

        // Check if target has data
        const targetRaw = rawMap[cleanTarget];
        if (!targetRaw || !targetRaw.dates || targetRaw.dates.length === 0) {
          setError(`No historical price data found for target ${cleanTarget}`);
          setLoading(false);
          return;
        }

        // 3. Build unified master trading dates across all fetched symbols
        const dateSet = new Set<string>();
        for (const sym of symbolsToFetch) {
          const raw = rawMap[sym];
          if (raw && raw.dates) {
            for (let i = 0; i < raw.dates.length; i++) {
              dateSet.add(raw.dates[i]);
            }
          }
        }

        const masterDates = Array.from(dateSet).sort();

        if (masterDates.length === 0) {
          setError(`No trading dates available for comparison`);
          setLoading(false);
          return;
        }

        rawDataMapRef.current = rawMap;
        masterDatesRef.current = masterDates;

        // 4. Compute initial startDate cutoff for active timeframe
        const startDate = calculateStartDate(timeframe, targetRaw.dates);

        // 5. Normalize Target
        const targetNorm = normalizeTickerData(targetRaw, masterDates, startDate);
        const normTargetSeries: NormalizedTickerSeries = {
          id: `target-${cleanTarget.toLowerCase()}`,
          symbol: cleanTarget,
          name: cleanTarget,
          color: targetStyle.color,
          lineWidth: targetStyle.lineWidth,
          lineStyle: targetStyle.lineStyle,
          opacity: targetStyle.opacity,
          visible: true,
          isTarget: true,
          data: targetNorm.points,
          latestReturn: targetNorm.latestReturn,
          basePrice: targetNorm.basePrice,
          currentPrice: targetRaw.currentPrice || targetRaw.closes[targetRaw.closes.length - 1],
          startDate: targetNorm.actualBaseDate || startDate,
        };

        // 6. Normalize all Refs (both visible and hidden so toggle is instantaneous)
        const normRefSeries: NormalizedTickerSeries[] = refs.map((ref) => {
          const raw = rawMap[ref.symbol.toUpperCase()];
          if (!raw) {
            return {
              ...ref,
              isTarget: false,
              data: [],
              latestReturn: null,
              basePrice: null,
              currentPrice: null,
              startDate,
            };
          }

          const norm = normalizeTickerData(raw, masterDates, startDate);
          return {
            ...ref,
            isTarget: false,
            data: norm.points,
            latestReturn: norm.latestReturn,
            basePrice: norm.basePrice,
            currentPrice: raw.currentPrice || raw.closes[raw.closes.length - 1],
            startDate: norm.actualBaseDate || startDate,
          };
        });

        if (!isCancelled) {
          setTargetSeries(normTargetSeries);
          setRefSeriesList(normRefSeries);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[useCompareData] Error calculating normalized compare data:', err);
          setError(err?.message || 'Error processing comparison data');
          setLoading(false);
        }
      }
    }

    fetchAllData();

    return () => {
      isCancelled = true;
    };
  }, [targetSymbol, refs, timeframe, targetStyle.color, targetStyle.lineWidth, targetStyle.lineStyle, targetStyle.opacity]);

  return {
    targetSeries,
    refSeriesList,
    loading,
    error,
    rawDataMapRef,
    masterDatesRef,
  };
}
