import React, { useState, useEffect, useCallback } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import clsx from 'clsx';
import { RawBarItem, formatBarTime } from '../../../types/chart';
import { TierVisualInfo } from '../../xchart/TierBadgeIndicator';

export interface LiveEMAIndicatorBadgeProps {
  chartRef: React.RefObject<IChartApi | null>;
  ema200SeriesRef: React.RefObject<ISeriesApi<'Line'> | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  displayBars: RawBarItem[];
  effectivePrice: number;
  lastEma200: number | null | undefined;
  distEma200: number | null | undefined;
  tierVisual: TierVisualInfo;
  visible: boolean;
  pane0Height?: number;
}

export const LiveEMAIndicatorBadge: React.FC<LiveEMAIndicatorBadgeProps> = ({
  chartRef,
  ema200SeriesRef,
  containerRef,
  displayBars,
  effectivePrice,
  lastEma200,
  distEma200,
  tierVisual,
  visible,
  pane0Height = 450,
}) => {
  const [coords, setCoords] = useState<{ x: number; y: number; inRange: boolean }>({
    x: 0,
    y: 0,
    inRange: false,
  });

  const updatePosition = useCallback(() => {
    if (!visible || !lastEma200 || !chartRef.current || !ema200SeriesRef.current || !containerRef.current) {
      setCoords((prev) => (prev.inRange ? { ...prev, inRange: false } : prev));
      return;
    }

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const pane0 = (chartRef.current as any).panes?.()?.[0];
    const pane0H = (pane0 && typeof pane0.getHeight === 'function')
      ? pane0.getHeight()
      : (pane0Height || container.clientHeight);

    // 1. Calculate Y position based on EMA 200 price
    let y = ema200SeriesRef.current.priceToCoordinate(lastEma200);
    if (y === null || isNaN(y)) {
      setCoords((prev) => (prev.inRange ? { ...prev, inRange: false } : prev));
      return;
    }

    // 2. Calculate X position based on the latest candle time
    const lastBar = displayBars.length > 0 ? displayBars[displayBars.length - 1] : null;
    let x: number | null = null;
    if (lastBar && chartRef.current.timeScale) {
      try {
        const timeVal = formatBarTime(lastBar.time);
        x = chartRef.current.timeScale().timeToCoordinate(timeVal as any);
      } catch (e) {
        x = null;
      }
    }

    // Badge dimensions
    const badgeWidth = 175;
    const badgeHeight = 28;

    // Place badge to the right of the latest candle, clamped nicely before the price axis
    const rightAxisBuffer = 70;
    const targetX = x !== null
      ? Math.min(containerWidth - badgeWidth - rightAxisBuffer, Math.max(16, x + 24))
      : containerWidth - badgeWidth - rightAxisBuffer;

    // Clamp Y inside Pane 0 bounds so it never overflows into indicator sub-panes
    const targetY = Math.max(26, Math.min(pane0H - badgeHeight - 10, y - badgeHeight / 2));

    setCoords({
      x: targetX,
      y: targetY,
      inRange: true,
    });
  }, [visible, lastEma200, displayBars, pane0Height, chartRef, ema200SeriesRef, containerRef]);

  useEffect(() => {
    updatePosition();

    const chart = chartRef.current;
    if (!chart) return;

    let timeScale: any = null;
    try {
      timeScale = chart.timeScale();
      timeScale.subscribeVisibleLogicalRangeChange(updatePosition);
      timeScale.subscribeVisibleTimeRangeChange(updatePosition);
    } catch (e) {}

    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      if (timeScale) {
        try {
          timeScale.unsubscribeVisibleLogicalRangeChange(updatePosition);
          timeScale.unsubscribeVisibleTimeRangeChange(updatePosition);
        } catch (e) {}
      }
    };
  }, [updatePosition, chartRef]);

  if (!visible || !coords.inRange || lastEma200 === null || lastEma200 === undefined) {
    return null;
  }

  // Calculate actual live distance if not precomputed
  const dist = distEma200 !== null && distEma200 !== undefined
    ? distEma200
    : (effectivePrice && lastEma200
        ? Number((((effectivePrice - lastEma200) / lastEma200) * 100).toFixed(2))
        : 0);

  const isPositive = dist >= 0;
  const isSevereDrop = dist < -15 || tierVisual.tierId === 'FALLING_KNIFE' || tierVisual.tierId === 'MAYDAY_EXIT';
  const isDipZone = !isPositive && !isSevereDrop;

  // Visual status themes (Cyber Glassmorphism with Perceptual Contrast >= 70%)
  const badgeBorderTheme = isPositive
    ? 'border-emerald-500/60 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
    : isDipZone
      ? 'border-amber-500/60 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
      : 'border-rose-500/70 shadow-[0_0_16px_rgba(244,63,94,0.45)] animate-pulse';

  const pctColor = isPositive
    ? 'text-emerald-300'
    : isDipZone
      ? 'text-amber-300'
      : 'text-rose-300';

  const distSign = isPositive ? '+' : '';

  return (
    <div
      style={{
        transform: `translate3d(${coords.x}px, ${coords.y}px, 0)`,
      }}
      className={clsx(
        'absolute left-0 top-0 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full',
        'bg-[#0B1220]/90 backdrop-blur-md border font-sans select-none pointer-events-auto cursor-help',
        'transition-transform duration-75 ease-out',
        badgeBorderTheme
      )}
      title={`EMA 200 Anchor: ${distSign}${dist.toFixed(2)}% | ราคาปัจจุบัน $${effectivePrice.toFixed(2)} | เส้น EMA 200 $${lastEma200.toFixed(2)}`}
    >
      {/* Tier Icon from Watchlist */}
      <span className="text-[15px] leading-none shrink-0" role="img" aria-label={tierVisual.label}>
        {tierVisual.icon}
      </span>

      {/* Percentage Distance */}
      <span className={clsx('text-[13px] font-extrabold tracking-tight font-mono', pctColor)}>
        {distSign}{dist.toFixed(2)}%
      </span>

      {/* Exact EMA 200 Price Level */}
      <span className="text-[12px] font-mono font-medium text-slate-300/90 whitespace-nowrap">
        (${lastEma200.toFixed(2)})
      </span>
    </div>
  );
};
