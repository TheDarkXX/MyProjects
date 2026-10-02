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
import { NormalizedTickerSeries } from './useCompareData';
import { TV_FONT_FAMILY } from '../../../types/chart';

export interface CompareHoverData {
  time: string;
  targetReturn: number | null;
  refReturns: Record<string, number | null>;
}

interface CompareLWChartProps {
  targetSeries: NormalizedTickerSeries | null;
  refSeriesList: NormalizedTickerSeries[];
  onCrosshairMove?: (hoverData: CompareHoverData | null) => void;
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
  targetSeries,
  refSeriesList,
  onCrosshairMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Reset container DOM
    containerRef.current.innerHTML = '';

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
        rightOffset: 12,
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

    // 1. Add Target Series (if data exists)
    if (targetSeries && targetSeries.data.length > 0) {
      targetSeriesApi = chart.addSeries(LineSeries, {
        color: hexToRgba(targetSeries.color, targetSeries.opacity),
        lineWidth: targetSeries.lineWidth,
        lineStyle: mapLineStyle(targetSeries.lineStyle),
        crosshairMarkerVisible: true,
        priceLineVisible: false,
        lastValueVisible: true,
        title: targetSeries.symbol,
      });

      targetSeriesApi.setData(targetSeries.data as any);

      // Create 0.00% Zero Baseline
      targetSeriesApi.createPriceLine({
        price: 0,
        color: '#64748B',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: '0.00%',
      });
    }

    // 2. Add Visible Reference Series
    const visibleRefs = refSeriesList.filter((r) => r.visible && r.data.length > 0);
    for (const ref of visibleRefs) {
      const seriesApi = chart.addSeries(LineSeries, {
        color: hexToRgba(ref.color, ref.opacity),
        lineWidth: ref.lineWidth,
        lineStyle: mapLineStyle(ref.lineStyle),
        crosshairMarkerVisible: true,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ref.symbol,
      });

      seriesApi.setData(ref.data as any);
      refSeriesMap.set(ref.id, seriesApi);
    }

    // Fit content nicely
    chart.timeScale().fitContent();

    // 3. Subscribe to Crosshair moves for real-time live % legend HUD
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        onCrosshairMove?.(null);
        return;
      }

      const timeStr =
        typeof param.time === 'string'
          ? param.time
          : (param.time as any)?.year
          ? `${(param.time as any).year}-${String((param.time as any).month).padStart(2, '0')}-${String(
              (param.time as any).day
            ).padStart(2, '0')}`
          : String(param.time);

      let targetVal: number | null = null;
      if (targetSeriesApi) {
        const item = param.seriesData.get(targetSeriesApi);
        targetVal = item && 'value' in item ? (item as any).value : null;
      }

      const refReturns: Record<string, number | null> = {};
      for (const [id, api] of refSeriesMap.entries()) {
        const item = param.seriesData.get(api);
        refReturns[id] = item && 'value' in item ? (item as any).value : null;
      }

      onCrosshairMove?.({
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
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [targetSeries, refSeriesList, onCrosshairMove]);

  return (
    <div className="relative w-full h-full min-h-0 flex-1 overflow-hidden select-none bg-[#0B1220]">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
