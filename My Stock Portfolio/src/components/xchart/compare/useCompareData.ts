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

interface RawChartData {
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

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const cleanTarget = targetSymbol.trim().toUpperCase();
    const visibleRefs = refs.filter((r) => r.visible);
    const symbolsToFetch = Array.from(new Set([cleanTarget, ...refs.map((r) => r.symbol.trim().toUpperCase())]));

    async function fetchAllData() {
      try {
        const rawMap: Record<string, RawChartData> = {};

        // 1. First resolve from memory or IndexedDB cache for instant display
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

        // 2. Fetch missing or stale symbols in parallel (only symbols not in cache)
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

        // 3. Compute common startDate cutoff
        const startDate = calculateStartDate(timeframe, targetRaw.dates);

        // 4. Collect all unique trading dates from target and all active visible symbols >= startDate
        const dateSet = new Set<string>();
        for (let i = 0; i < targetRaw.dates.length; i++) {
          if (targetRaw.dates[i] >= startDate) {
            dateSet.add(targetRaw.dates[i]);
          }
        }

        // Also add dates from visible refs
        for (const ref of visibleRefs) {
          const raw = rawMap[ref.symbol.toUpperCase()];
          if (raw && raw.dates) {
            for (let i = 0; i < raw.dates.length; i++) {
              if (raw.dates[i] >= startDate) {
                dateSet.add(raw.dates[i]);
              }
            }
          }
        }

        const sortedDates = Array.from(dateSet).sort();

        if (sortedDates.length === 0) {
          setError(`No overlapping trading dates for ${timeframe}`);
          setLoading(false);
          return;
        }

        // 5. Normalizer function: transforms raw ticker data into 0% baseline series
        const normalizeSeries = (
          raw: RawChartData,
          symbolName: string
        ): { data: CompareDataPoint[]; latestReturn: number | null; basePrice: number | null; currentPrice: number | null } => {
          // Build lookup: date -> close
          const priceLookup = new Map<string, number>();
          for (let i = 0; i < raw.dates.length; i++) {
            priceLookup.set(raw.dates[i], raw.closes[i]);
          }

          // Find earliest date >= startDate where price exists to be base price P0
          let basePrice: number | null = null;
          for (const d of sortedDates) {
            const p = priceLookup.get(d);
            if (p != null && p > 0) {
              basePrice = p;
              break;
            }
          }

          if (basePrice == null || basePrice <= 0) {
            return { data: [], latestReturn: null, basePrice: null, currentPrice: null };
          }

          const points: CompareDataPoint[] = [];
          let lastKnownClose = basePrice;
          let hasStarted = false;

          for (const d of sortedDates) {
            const currentClose = priceLookup.get(d);
            if (currentClose != null && currentClose > 0) {
              lastKnownClose = currentClose;
              hasStarted = true;
            }

            if (hasStarted) {
              const returnPct = ((lastKnownClose - basePrice) / basePrice) * 100;
              // Format to 2 decimal places for precision without floating point noise
              points.push({
                time: d,
                value: Number(returnPct.toFixed(2)),
              });
            }
          }

          const latestReturn = points.length > 0 ? points[points.length - 1].value : null;
          const currentPrice = raw.currentPrice || lastKnownClose;

          return {
            data: points,
            latestReturn,
            basePrice,
            currentPrice,
          };
        };

        // Normalize Target
        const targetNorm = normalizeSeries(targetRaw, cleanTarget);
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
          data: targetNorm.data,
          latestReturn: targetNorm.latestReturn,
          basePrice: targetNorm.basePrice,
          currentPrice: targetNorm.currentPrice,
          startDate,
        };

        // Normalize all Refs (both visible and hidden so toggle is instantaneous)
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

          const norm = normalizeSeries(raw, ref.symbol);
          return {
            ...ref,
            isTarget: false,
            data: norm.data,
            latestReturn: norm.latestReturn,
            basePrice: norm.basePrice,
            currentPrice: norm.currentPrice,
            startDate,
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
  };
}
