import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  ISeriesApi,
} from 'lightweight-charts';
import {
  NormalizedTickerSeries,
  RawChartData,
  normalizeTickerData,
} from './useCompareData';
import { CompareTimeFrame } from '../../../stores/xchartStore';
import { TV_FONT_FAMILY } from '../../../types/chart';

export interface CompareHoverData {
  time: string;
  targetReturn: number | null;
  refReturns: Record<string, number | null>;
}

export interface DynamicBaseStats {
  baseDate: string;
  targetReturn: number | null;
  refReturns: Record<string, number | null>;
}

interface CompareLWChartProps {
  timeframe?: CompareTimeFrame;
  targetSeries: NormalizedTickerSeries | null;
  refSeriesList: NormalizedTickerSeries[];
  rawDataMapRef: React.MutableRefObject<Record<string, RawChartData>>;
  masterDatesRef: React.MutableRefObject<string[]>;
  showBaselineZero?: boolean;
  baselineStyle?: 'SOLID' | 'DASHED' | 'DOTTED';
  baselineColor?: string;
  showPointMarkers?: boolean;
  pointMarkersRadius?: number;
  applyMarkersToRefs?: boolean;
  onCrosshairMove?: (hoverData: CompareHoverData | null) => void;
  onDynamicBaseChange?: (stats: DynamicBaseStats) => void;
  onResetZoomReady?: (resetFn: () => void) => void;
}

export function parseTimeToDateStr(time: any): string {
  if (!time) return '';
  if (typeof time === 'string') {
    return time.split('T')[0];
  }
  if (typeof time === 'object' && time !== null) {
    if ('year' in time && 'month' in time && 'day' in time) {
      const y = time.year;
      const m = String(time.month).padStart(2, '0');
      const d = String(time.day).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  if (typeof time === 'number' && isFinite(time)) {
    const ms = time > 1e11 ? time : time * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  return String(time);
}

function mapLineStyle(style: string): LineStyle {
  const s = String(style).toUpperCase();
  if (s === 'DASHED') return LineStyle.Dashed;
  if (s === 'DOTTED') return LineStyle.Dotted;
  return LineStyle.Solid;
}

function hexToRgba(hex: string, alpha: number = 1): string {
  if (!hex) return `rgba(255, 255, 255, ${alpha})`;
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

export const CompareLWChart: React.FC<CompareLWChartProps> = ({
  timeframe = '1Y',
  targetSeries,
  refSeriesList,
  rawDataMapRef,
  masterDatesRef,
  showBaselineZero = true,
  baselineStyle = 'DASHED',
  baselineColor = 'rgba(255, 255, 255, 0.45)',
  showPointMarkers,
  pointMarkersRadius = 4,
  applyMarkersToRefs = false,
  onCrosshairMove,
  onDynamicBaseChange,
  onResetZoomReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Keep callback references stable to prevent unnecessary chart re-inits
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;

  const onDynamicBaseChangeRef = useRef(onDynamicBaseChange);
  onDynamicBaseChangeRef.current = onDynamicBaseChange;

  const targetSeriesApiRef = useRef<ISeriesApi<'Line'> | null>(null);
  const refSeriesMapRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const lastBaseDateRef = useRef<string>('');

  useEffect(() => {
    if (!containerRef.current) return;

    // Reset container DOM
    containerRef.current.innerHTML = '';
    lastBaseDateRef.current = '';

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#0B1220' },
        textColor: '#CBD5E1', // Perceptual contrast >= 70%
        fontFamily: TV_FONT_FAMILY,
        fontSize: 13, // Minimum font size >= 13px rule
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.06)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(148, 163, 184, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1E293B',
        },
        horzLine: {
          color: 'rgba(148, 163, 184, 0.4)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1E293B',
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        minBarSpacing: 1.2,
        rightOffset: 8,
        fixLeftEdge: true,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        autoScale: true,
      },
      localization: {
        priceFormatter: (price: number) => {
          return `${price >= 0 ? '+' : ''}${price.toFixed(2)}%`;
        },
      },
    });

    chartRef.current = chart;

    let targetSeriesApi: ISeriesApi<'Line'> | null = null;
    const refSeriesMap = new Map<string, ISeriesApi<'Line'>>();

    const isLongTermTimeframe = timeframe !== '1M' && timeframe !== '3M' && timeframe !== '6M';
    // If showPointMarkers is explicitly passed as boolean, use it.
    // Otherwise: <= 6M -> true, > 6M -> false (auto-off to avoid visual clutter)
    const initialMarkersEnabled = showPointMarkers !== undefined 
      ? showPointMarkers 
      : !isLongTermTimeframe;

    const targetMarkersVisible = initialMarkersEnabled && (targetSeries?.pointMarkersVisible !== false);
    const targetMarkersRadius = targetSeries?.pointMarkersRadius || pointMarkersRadius || 4;

    // 1. Add Target Series (if data exists)
    if (targetSeries && targetSeries.data.length > 0) {
      targetSeriesApi = chart.addSeries(LineSeries, {
        color: hexToRgba(targetSeries.color, targetSeries.opacity),
        lineWidth: targetSeries.lineWidth,
        lineStyle: mapLineStyle(targetSeries.lineStyle),
        pointMarkersVisible: targetMarkersVisible,
        pointMarkersRadius: targetMarkersRadius,
        crosshairMarkerVisible: true,
        priceLineVisible: false,
        lastValueVisible: true,
        title: targetSeries.symbol,
      });

      targetSeriesApi.setData(targetSeries.data as any);
    }

    targetSeriesApiRef.current = targetSeriesApi;

    // 2. Add Visible Reference Series
    const visibleRefs = refSeriesList.filter((r) => r.visible && r.data.length > 0);
    for (const ref of visibleRefs) {
      const refMarkersVisible = initialMarkersEnabled && (
        ref.pointMarkersVisible !== undefined
          ? ref.pointMarkersVisible
          : applyMarkersToRefs
      );
      const refMarkersRadius = ref.pointMarkersRadius || Math.max(2, targetMarkersRadius - 1);

      const seriesApi = chart.addSeries(LineSeries, {
        color: hexToRgba(ref.color, ref.opacity),
        lineWidth: ref.lineWidth,
        lineStyle: mapLineStyle(ref.lineStyle),
        pointMarkersVisible: refMarkersVisible,
        pointMarkersRadius: refMarkersRadius,
        crosshairMarkerVisible: true,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ref.symbol,
      });

      seriesApi.setData(ref.data as any);
      refSeriesMap.set(ref.id, seriesApi);
    }

    refSeriesMapRef.current = refSeriesMap;

    // 3. Create High-Contrast 0.00% Zero Baseline
    if (showBaselineZero) {
      const anchorSeries = targetSeriesApi || (refSeriesMap.size > 0 ? Array.from(refSeriesMap.values())[0] : null);
      if (anchorSeries) {
        anchorSeries.createPriceLine({
          price: 0,
          color: baselineColor || 'rgba(255, 255, 255, 0.45)',
          lineWidth: 1,
          lineStyle: mapLineStyle(baselineStyle || 'DASHED'),
          axisLabelVisible: true,
          title: '0.00%',
        });
      }
    }

    // Expose reset zoom to parent (flush left)
    if (onResetZoomReady) {
      onResetZoomReady(() => {
        chart.timeScale().fitContent();
        if (targetSeries && targetSeries.data.length > 0) {
          chart.timeScale().setVisibleLogicalRange({
            from: 0,
            to: targetSeries.data.length + 6,
          });
        }
      });
    }

    // Fit content initially and pin flush to left edge (Logical index 0)
    chart.timeScale().fitContent();
    if (targetSeries && targetSeries.data.length > 0) {
      chart.timeScale().setVisibleLogicalRange({
        from: 0,
        to: targetSeries.data.length + 6,
      });
    }

    // 3. Dynamic Left-Edge 0% Base Re-normalization
    let rafPending = false;
    let rafId: number | null = null;

    const onVisibleTimeRangeChange = (range: any) => {
      if (!range || !range.from || rafPending) return;

      const fromDateStr = parseTimeToDateStr(range.from);
      if (!fromDateStr || fromDateStr === lastBaseDateRef.current) return;

      rafPending = true;
      rafId = requestAnimationFrame(() => {
        rafPending = false;
        if (fromDateStr === lastBaseDateRef.current) return;
        lastBaseDateRef.current = fromDateStr;

        const rawMap = rawDataMapRef.current;
        const masterDates = masterDatesRef.current;
        if (!masterDates || masterDates.length === 0) return;

        const timeframeStartDate = masterDates[0];

        // 3.1 Re-normalize Target Series (preserve points from timeframeStartDate, base at fromDateStr)
        let newTargetReturn: number | null = null;
        if (targetSeries && targetSeries.symbol && targetSeriesApiRef.current) {
          const cleanTarget = targetSeries.symbol.toUpperCase();
          const rawTarget = rawMap[cleanTarget];
          if (rawTarget) {
            const norm = normalizeTickerData(rawTarget, masterDates, fromDateStr, timeframeStartDate);
            if (norm.points.length > 0) {
              targetSeriesApiRef.current.setData(norm.points as any);
              newTargetReturn = norm.latestReturn;
            }
          }
        }

        // 3.2 Re-normalize Reference Series (preserve points from timeframeStartDate, base at fromDateStr)
        const newRefReturns: Record<string, number | null> = {};
        for (const ref of refSeriesList) {
          if (!ref.visible || !ref.symbol) continue;
          const seriesApi = refSeriesMapRef.current.get(ref.id);
          if (!seriesApi) continue;

          const raw = rawMap[ref.symbol.toUpperCase()];
          if (raw) {
            const norm = normalizeTickerData(raw, masterDates, fromDateStr, timeframeStartDate);
            if (norm.points.length > 0) {
              seriesApi.setData(norm.points as any);
              newRefReturns[ref.id] = norm.latestReturn;
            }
          }
        }

        // 3.3 Notify parent for real-time legend sync
        onDynamicBaseChangeRef.current?.({
          baseDate: fromDateStr,
          targetReturn: newTargetReturn,
          refReturns: newRefReturns,
        });
      });
    };

    chart.timeScale().subscribeVisibleTimeRangeChange(onVisibleTimeRangeChange);

    // 3.4 Dynamic Point Markers Adaptive Engine (TradingView Style):
    // When zoomed in (<= 130 visible bars / ~6 months): show dots for high resolution
    // When zoomed out (> 130 visible bars / > 6 months): hide dots automatically to prevent visual clutter
    let currentMarkersVisible = initialMarkersEnabled;

    const onVisibleLogicalRangeChange = (logicalRange: any) => {
      if (!logicalRange) return;
      const visibleBars = logicalRange.to - logicalRange.from;

      let shouldShow: boolean;
      if (showPointMarkers === false && !isLongTermTimeframe) {
        // User manually turned off dots on <= 6M chart -> respect user choice
        shouldShow = false;
      } else {
        // Adaptive threshold: show dots when <= 130 bars visible (~6 months)
        shouldShow = visibleBars <= 130;
      }

      if (shouldShow !== currentMarkersVisible) {
        currentMarkersVisible = shouldShow;
        if (targetSeriesApiRef.current) {
          const tVisible = shouldShow && (targetSeries?.pointMarkersVisible !== false);
          targetSeriesApiRef.current.applyOptions({ pointMarkersVisible: tVisible });
        }

        for (const [id, api] of refSeriesMapRef.current.entries()) {
          const refConfig = refSeriesList.find((r) => r.id === id);
          if (!refConfig) continue;
          const refVisible = shouldShow && (
            refConfig.pointMarkersVisible !== undefined
              ? refConfig.pointMarkersVisible
              : applyMarkersToRefs
          );
          api.applyOptions({ pointMarkersVisible: refVisible });
        }
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChange);

    // 4. Subscribe to Crosshair moves for real-time live % legend HUD
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        onCrosshairMoveRef.current?.(null);
        return;
      }

      const timeStr = parseTimeToDateStr(param.time);

      let targetVal: number | null = null;
      if (targetSeriesApiRef.current) {
        const item = param.seriesData.get(targetSeriesApiRef.current);
        targetVal = item && 'value' in item ? (item as any).value : null;
      }

      const refReturns: Record<string, number | null> = {};
      for (const [id, api] of refSeriesMapRef.current.entries()) {
        const item = param.seriesData.get(api);
        refReturns[id] = item && 'value' in item ? (item as any).value : null;
      }

      onCrosshairMoveRef.current?.({
        time: timeStr,
        targetReturn: targetVal,
        refReturns,
      });
    });

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chartRef.current.applyOptions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      try {
        chart.timeScale().unsubscribeVisibleTimeRangeChange(onVisibleTimeRangeChange);
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleLogicalRangeChange);
      } catch (_) {}
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      targetSeriesApiRef.current = null;
      refSeriesMapRef.current.clear();
    };
  }, [
    timeframe,
    targetSeries,
    refSeriesList,
    showBaselineZero,
    baselineStyle,
    baselineColor,
    showPointMarkers,
    pointMarkersRadius,
    applyMarkersToRefs,
  ]);

  return (
    <div className="relative w-full h-full min-h-0 flex-1 overflow-hidden select-none bg-[#0B1220]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
