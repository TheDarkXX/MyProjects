import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../../services/api';
import { getCachedCandlesWithMeta, setCachedCandles } from '../../../utils/chartIdbCache';
import { CompareTimeFrame, CompareRefSeries, CompareLineStyleConfig } from '../../../stores/xchartStore';

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
  pointMarkersVisible?: boolean;
  pointMarkersRadius?: number;
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
    case '1W':
    case '1Wk': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return formatDate(d);
    }
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
  fromDate: string,
  timeframeStartDate?: string
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

  // 4. Generate points for all dates in masterDates >= pointInceptionDate
  // If timeframeStartDate is provided, preserve all points >= timeframeStartDate (and >= stockFirstDate)
  // so zoom-out / panning never loses historical bars!
  const minStartDate = timeframeStartDate || fromDate;
  const pointInceptionDate = stockFirstDate > minStartDate ? stockFirstDate : minStartDate;

  const points: CompareDataPoint[] = [];
  let lastKnownClose = basePrice;

  for (const d of masterDates) {
    if (d < pointInceptionDate) continue;

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

/**
 * Pure function: Compute normalized comparison series for target and all reference tickers.
 */
export function computeNormalizedSeries(
  rawMap: Record<string, RawChartData>,
  cleanTarget: string,
  refs: CompareRefSeries[],
  timeframe: CompareTimeFrame,
  targetStyle: CompareLineStyleConfig
): {
  normTargetSeries: NormalizedTickerSeries;
  normRefSeries: NormalizedTickerSeries[];
  masterDates: string[];
} | null {
  const targetRaw = rawMap[cleanTarget];
  if (!targetRaw || !targetRaw.dates || targetRaw.dates.length === 0) {
    return null;
  }

  // 1. Build unified master trading dates across all available symbols
  const dateSet = new Set<string>();
  for (const raw of Object.values(rawMap)) {
    if (raw && raw.dates) {
      for (let i = 0; i < raw.dates.length; i++) {
        dateSet.add(raw.dates[i]);
      }
    }
  }

  const allDates = Array.from(dateSet).sort();
  if (allDates.length === 0) {
    return null;
  }

  // 2. Compute initial startDate cutoff for active timeframe
  const startDate = calculateStartDate(timeframe, targetRaw.dates);

  let masterDates = allDates.filter((d) => d >= startDate);
  if (masterDates.length === 0) {
    masterDates = allDates.slice(-30);
  }

  // 3. Normalize Target
  const targetNorm = normalizeTickerData(targetRaw, masterDates, startDate, startDate);
  const normTargetSeries: NormalizedTickerSeries = {
    id: `target-${cleanTarget.toLowerCase()}`,
    symbol: cleanTarget,
    name: cleanTarget,
    color: targetStyle.color,
    lineWidth: targetStyle.lineWidth,
    lineStyle: targetStyle.lineStyle,
    opacity: targetStyle.opacity,
    pointMarkersVisible: targetStyle.pointMarkersVisible,
    pointMarkersRadius: targetStyle.pointMarkersRadius,
    visible: true,
    isTarget: true,
    data: targetNorm.points,
    latestReturn: targetNorm.latestReturn,
    basePrice: targetNorm.basePrice,
    currentPrice: targetRaw.currentPrice || targetRaw.closes[targetRaw.closes.length - 1],
    startDate: targetNorm.actualBaseDate || startDate,
  };

  // 4. Normalize all Refs (both visible and hidden so toggle is instantaneous)
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

    const norm = normalizeTickerData(raw, masterDates, startDate, startDate);
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

  return {
    normTargetSeries,
    normRefSeries,
    masterDates,
  };
}

/**
 * Concurrency helper to avoid overwhelming server or rate limits
 */
async function fetchWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) {
        await fn(item);
      }
    }
  });
  await Promise.allSettled(workers);
}

export function useCompareData(
  targetSymbol: string,
  refs: CompareRefSeries[],
  timeframe: CompareTimeFrame,
  targetStyle: CompareLineStyleConfig
) {
  const [targetSeries, setTargetSeries] = useState<NormalizedTickerSeries | null>(null);
  const [refSeriesList, setRefSeriesList] = useState<NormalizedTickerSeries[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // In-memory cache for fast snappy switching
  const memCacheRef = useRef<Record<string, RawChartData>>({});
  const rawDataMapRef = useRef<Record<string, RawChartData>>({});
  const masterDatesRef = useRef<string[]>([]);

  // Track session-level fetch timestamps (symbol -> ms timestamp)
  const lastFetchedRef = useRef<Record<string, number>>({});

  // Manual trigger mechanism
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const forceRefreshRef = useRef<boolean>(false);

  const refetch = useCallback((force = true) => {
    forceRefreshRef.current = force;
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const forceRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;

    const cleanTarget = targetSymbol.trim().toUpperCase();
    const symbolsToFetch = Array.from(new Set([cleanTarget, ...refs.map((r) => r.symbol.trim().toUpperCase())]));

    async function execute() {
      try {
        setError(null);

        // 1. FAST INITIAL RESOLVE (0ms UX via Memory or IndexedDB cache)
        const rawMap: Record<string, RawChartData> = { ...memCacheRef.current };
        const cachedAtMap: Record<string, number> = {};

        for (const sym of symbolsToFetch) {
          if (!rawMap[sym]) {
            try {
              const meta = await getCachedCandlesWithMeta<any>(sym, '1D');
              if (meta && meta.data && meta.data.dates && meta.data.dates.length > 0 && meta.data.closes) {
                rawMap[sym] = {
                  dates: meta.data.dates,
                  closes: meta.data.closes,
                  currentPrice: meta.data.currentPrice || meta.data.closes[meta.data.closes.length - 1],
                };
                memCacheRef.current[sym] = rawMap[sym];
                cachedAtMap[sym] = meta.cachedAt;
              }
            } catch (_) {}
          }
        }

        if (isCancelled) return;

        // If target exists in initial cache, render immediately so user sees instant chart!
        const initialNormalized = computeNormalizedSeries(rawMap, cleanTarget, refs, timeframe, targetStyle);
        if (initialNormalized) {
          setTargetSeries(initialNormalized.normTargetSeries);
          setRefSeriesList(initialNormalized.normRefSeries);
          masterDatesRef.current = initialNormalized.masterDates;
          rawDataMapRef.current = rawMap;
          setLoading(false);
        } else {
          setLoading(true);
        }

        // 2. STALE & MISSING DETECTION (Stale-While-Revalidate Engine)
        // Find latest known trading date among cached symbols
        let maxKnownDate = '';
        for (const sym of symbolsToFetch) {
          const d = rawMap[sym]?.dates;
          if (d && d.length > 0) {
            const lastDate = d[d.length - 1];
            if (lastDate > maxKnownDate) {
              maxKnownDate = lastDate;
            }
          }
        }

        const now = Date.now();
        const symbolsToFetchFromNetwork: string[] = [];

        for (const sym of symbolsToFetch) {
          if (forceRefresh) {
            symbolsToFetchFromNetwork.push(sym);
            continue;
          }

          const existingRaw = rawMap[sym];
          if (!existingRaw || !existingRaw.dates || existingRaw.dates.length === 0) {
            // Missing entirely -> MUST fetch
            symbolsToFetchFromNetwork.push(sym);
            continue;
          }

          // Check if fetched from network recently in this session (TTL: 60s)
          const lastFetched = lastFetchedRef.current[sym] || 0;
          if (now - lastFetched < 60000) {
            continue; // Already fresh in this session
          }

          // Check IndexedDB write age
          const idbCachedAt = cachedAtMap[sym] || 0;
          if (now - idbCachedAt < 60000) {
            continue; // Written to IDB recently by single chart or other tab
          }

          // If symbol's latest candle is behind maxKnownDate, it's missing the newest day(s)
          const symDates = existingRaw.dates;
          const symLastDate = symDates[symDates.length - 1];
          if (maxKnownDate && symLastDate < maxKnownDate) {
            symbolsToFetchFromNetwork.push(sym);
            continue;
          }

          // Stale cache (> 60s old) -> background revalidate
          symbolsToFetchFromNetwork.push(sym);
        }

        // 3. BACKGROUND CONCURRENT NETWORK FETCH
        if (symbolsToFetchFromNetwork.length > 0) {
          setIsRefreshing(true);

          await fetchWithConcurrency(symbolsToFetchFromNetwork, 4, async (sym) => {
            try {
              const apiRes = await api.chart.get(sym, 36500, '1D');
              if (apiRes && apiRes.dates && apiRes.closes && apiRes.dates.length > 0) {
                const rawData: RawChartData = {
                  dates: apiRes.dates,
                  closes: apiRes.closes,
                  currentPrice: apiRes.currentPrice || apiRes.closes[apiRes.closes.length - 1],
                };
                rawMap[sym] = rawData;
                memCacheRef.current[sym] = rawData;
                lastFetchedRef.current[sym] = Date.now();
                setCachedCandles(sym, '1D', apiRes);
              }
            } catch (fetchErr: any) {
              console.warn(`[useCompareData] Failed to fetch fresh data for ${sym}:`, fetchErr?.message || fetchErr);
            }
          });

          if (isCancelled) return;

          // 4. RE-NORMALIZE WITH FRESH CANDLES
          const freshNormalized = computeNormalizedSeries(rawMap, cleanTarget, refs, timeframe, targetStyle);
          if (freshNormalized) {
            setTargetSeries(freshNormalized.normTargetSeries);
            setRefSeriesList(freshNormalized.normRefSeries);
            masterDatesRef.current = freshNormalized.masterDates;
            rawDataMapRef.current = rawMap;
          } else {
            setError(`No historical price data found for target ${cleanTarget}`);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[useCompareData] Error in execute:', err);
          setError(err?.message || 'Error processing comparison data');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    execute();

    // 5. PERIODIC 60S REVALIDATION TO KEEP LATEST DAY / LIVE CANDLES FRESH
    const interval = setInterval(() => {
      execute();
    }, 60000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [
    targetSymbol,
    refs,
    timeframe,
    targetStyle.color,
    targetStyle.lineWidth,
    targetStyle.lineStyle,
    targetStyle.opacity,
    targetStyle.pointMarkersVisible,
    targetStyle.pointMarkersRadius,
    refreshTrigger,
  ]);

  return {
    targetSeries,
    refSeriesList,
    loading,
    isRefreshing,
    refetch,
    error,
    rawDataMapRef,
    masterDatesRef,
  };
}
