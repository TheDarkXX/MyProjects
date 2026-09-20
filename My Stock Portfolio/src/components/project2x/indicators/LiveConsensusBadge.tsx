import React, { useState, useEffect, useCallback } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import clsx from 'clsx';
import { RawBarItem, formatBarTime } from '../../../types/chart';
import { TargetConsensusConfig } from '../../../types/indicatorConfig';

export interface LiveConsensusBadgeProps {
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  displayBars: RawBarItem[];
  effectivePrice: number;
  targetMean: number | null | undefined;
  recommendationKey?: string | null;
  analystOpinionsCount?: number | null;
  visible: boolean;
  pane0Height?: number;
  config?: TargetConsensusConfig;
}

export const LiveConsensusBadge: React.FC<LiveConsensusBadgeProps> = ({
  chartRef,
  seriesRef,
  containerRef,
  displayBars,
  effectivePrice,
  targetMean,
  recommendationKey,
  analystOpinionsCount,
  visible,
  pane0Height = 450,
  config,
}) => {
  const [coords, setCoords] = useState<{ x: number; y: number; inRange: boolean }>({
    x: 0,
    y: 0,
    inRange: false,
  });

  const updatePosition = useCallback(() => {
    if (!visible || !targetMean || targetMean <= 0 || !chartRef.current || !seriesRef.current || !containerRef.current) {
      setCoords((prev) => (prev.inRange ? { ...prev, inRange: false } : prev));
      return;
    }

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const pane0 = (chartRef.current as any).panes?.()?.[0];
    const pane0H = (pane0 && typeof pane0.getHeight === 'function')
      ? pane0.getHeight()
      : (pane0Height || container.clientHeight);

    // 1. Calculate Y position based on targetMean price
    const y = seriesRef.current.priceToCoordinate(targetMean);
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
    const badgeWidth = 220;
    const badgeHeight = 28;

    // Place badge to the right of the latest candle, clamped nicely before the price axis
    const rightAxisBuffer = 70;
    const targetX = x !== null
      ? Math.min(containerWidth - badgeWidth - rightAxisBuffer, Math.max(16, x + 24))
      : containerWidth - badgeWidth - rightAxisBuffer;

    // Apply Position logic: above / center / below + verticalOffset
    const position = config?.badgePosition || 'above';
    const vertOffset = config?.verticalOffset ?? 0;

    let baseBadgeY = y - badgeHeight / 2;
    if (position === 'above') {
      baseBadgeY = y - badgeHeight - 6;
    } else if (position === 'below') {
      baseBadgeY = y + 6;
    }
    baseBadgeY += vertOffset;

    // Clamp Y inside Pane 0 bounds so it never overflows into indicator sub-panes
    const targetY = Math.max(10, Math.min(pane0H - badgeHeight - 8, baseBadgeY));

    setCoords({
      x: targetX,
      y: targetY,
      inRange: true,
    });
  }, [visible, targetMean, displayBars, pane0Height, chartRef, seriesRef, containerRef, config]);

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
      if (timeScale) {
        try {
          timeScale.unsubscribeVisibleLogicalRangeChange(updatePosition);
          timeScale.unsubscribeVisibleTimeRangeChange(updatePosition);
        } catch (e) {}
      }
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition, chartRef]);

  if (!visible || !targetMean || targetMean <= 0 || !coords.inRange || !(config?.showBadge ?? true)) {
    return null;
  }

  // Calculate Upside %
  const upsidePct = effectivePrice > 0
    ? ((targetMean - effectivePrice) / effectivePrice) * 100
    : 0;
  const isPositiveUpside = upsidePct >= 0;

  // Format Recommendation Pill
  const formatRating = (key?: string | null) => {
    switch (key?.toLowerCase()) {
      case 'strong_buy':
        return { label: 'Strong Buy', color: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50' };
      case 'buy':
        return { label: 'Buy', color: 'text-green-300 bg-green-950/80 border-green-500/50' };
      case 'underperform':
      case 'sell':
        return { label: 'Sell', color: 'text-rose-300 bg-rose-950/80 border-rose-500/50' };
      case 'hold':
      default:
        return { label: 'Hold', color: 'text-amber-300 bg-amber-950/80 border-amber-500/50' };
    }
  };

  const ratingInfo = formatRating(recommendationKey);

  // Font size classes
  const fontClass = config?.badgeFontSize === 'lg'
    ? 'text-[14px]'
    : config?.badgeFontSize === 'base'
      ? 'text-[13px]'
      : 'text-[12px]';

  const showUpside = config?.showUpsidePercent ?? true;
  const showPrice = config?.showTargetPrice ?? true;
  const showRating = config?.showRatingPill ?? true;
  const showCount = config?.showAnalystCount ?? true;

  return (
    <div
      style={{
        transform: `translate3d(${coords.x}px, ${coords.y}px, 0)`,
        willChange: 'transform',
      }}
      className="absolute top-0 left-0 z-30 pointer-events-none transition-transform duration-75 ease-out select-none"
    >
      <div
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-xl backdrop-blur-md",
          "bg-[#0B101B]/92 border-sky-500/40 text-slate-200"
        )}
      >
        {/* Target Icon */}
        <span className="text-[13px] leading-none shrink-0" title="Target Consensus">
          🎯
        </span>

        {/* Upside % Pill */}
        {showUpside && (
          <span
            className={clsx(
              "font-mono font-extrabold tracking-tight shrink-0",
              fontClass,
              isPositiveUpside ? "text-cyan-300" : "text-rose-300"
            )}
          >
            {isPositiveUpside ? `+${upsidePct.toFixed(1)}%` : `${upsidePct.toFixed(1)}%`}
          </span>
        )}

        {/* Target Price */}
        {showPrice && (
          <span className={clsx("text-slate-300 font-mono font-semibold shrink-0", fontClass)}>
            (${targetMean.toFixed(2)})
          </span>
        )}

        {/* Rating Pill */}
        {showRating && recommendationKey && (
          <span
            className={clsx(
              "px-1.5 py-0.5 rounded text-[11px] font-bold border shrink-0",
              ratingInfo.color
            )}
          >
            {ratingInfo.label}
          </span>
        )}

        {/* Analyst Count */}
        {showCount && analystOpinionsCount !== undefined && analystOpinionsCount !== null && analystOpinionsCount > 0 && (
          <span className="text-[11px] font-medium text-slate-400 shrink-0">
            ({analystOpinionsCount})
          </span>
        )}
      </div>
    </div>
  );
};
