import React, { useState, useEffect, useCallback } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { TargetConsensusConfig } from '../../../types/indicatorConfig';

export interface TargetLineEndBadgesProps {
  chartRef: React.RefObject<IChartApi | null>;
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | null>;
  chartContainer: HTMLElement | null;
  effectivePrice: number;
  analystConsensus?: any;
  config?: TargetConsensusConfig;
  visible: boolean;
  pane0Height?: number;
}

interface BadgeItem {
  id: string;
  label: string;
  price: number;
  color: string;
  upside: number | null;
}

export const TargetLineEndBadges: React.FC<TargetLineEndBadgesProps> = ({
  chartRef,
  seriesRef,
  chartContainer,
  effectivePrice,
  analystConsensus,
  config,
  visible,
  pane0Height = 450,
}) => {
  const [positions, setPositions] = useState<Record<string, number | null>>({});
  const [scaleWidth, setScaleWidth] = useState<number>(60);

  // Check if labels are enabled
  const showLineLabel = config?.showLineLabel !== false;
  const showPct = config?.showLinePercent !== false;

  const isMeanActive = config?.showMeanLine !== false;
  const isHighActive = Boolean(config?.showHighLine);
  const isLowActive = Boolean(config?.showLowLine);

  const targetMean = analystConsensus?.targetMean;
  const targetHigh = analystConsensus?.targetHigh;
  const targetLow = analystConsensus?.targetLow;

  const badgeItems: BadgeItem[] = [];

  if (isMeanActive && targetMean && targetMean > 0) {
    const upside = effectivePrice > 0 ? ((targetMean - effectivePrice) / effectivePrice) * 100 : null;
    badgeItems.push({
      id: 'mean',
      label: 'Target: $',
      price: targetMean,
      color: config?.meanColor || '#38BDF8',
      upside,
    });
  }

  if (isHighActive && targetHigh && targetHigh > 0) {
    const upside = effectivePrice > 0 ? ((targetHigh - effectivePrice) / effectivePrice) * 100 : null;
    badgeItems.push({
      id: 'high',
      label: 'High: $',
      price: targetHigh,
      color: config?.highColor || '#10B981',
      upside,
    });
  }

  if (isLowActive && targetLow && targetLow > 0) {
    const upside = effectivePrice > 0 ? ((targetLow - effectivePrice) / effectivePrice) * 100 : null;
    badgeItems.push({
      id: 'low',
      label: 'Low: $',
      price: targetLow,
      color: config?.lowColor || '#F43F5E',
      upside,
    });
  }

  const updatePositions = useCallback(() => {
    if (!visible || !showLineLabel || badgeItems.length === 0 || !seriesRef.current || !chartRef.current) {
      setPositions({});
      return;
    }

    try {
      const pScale = seriesRef.current.priceScale();
      const pWidth = pScale?.width?.() || 60;
      setScaleWidth(pWidth);
    } catch (e) {
      setScaleWidth(60);
    }

    const newPos: Record<string, number | null> = {};
    for (const item of badgeItems) {
      try {
        const y = seriesRef.current.priceToCoordinate(item.price);
        newPos[item.id] = y !== null && !isNaN(y) ? y : null;
      } catch (e) {
        newPos[item.id] = null;
      }
    }
    setPositions(newPos);
  }, [visible, showLineLabel, badgeItems, seriesRef, chartRef]);

  // Recalculate positions on dependencies change
  useEffect(() => {
    updatePositions();
  }, [updatePositions]);

  // Subscribe to chart logical range changes
  useEffect(() => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const handleRangeChange = () => {
      updatePositions();
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [chartRef, updatePositions]);

  // Listen to mouse/wheel interactions on container for dynamic tracking
  useEffect(() => {
    if (!chartContainer) return;

    let rafId: number | null = null;
    const handleActivity = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        updatePositions();
        rafId = null;
      });
    };

    chartContainer.addEventListener('mousemove', handleActivity);
    chartContainer.addEventListener('wheel', handleActivity, { passive: true });
    window.addEventListener('mouseup', handleActivity);
    window.addEventListener('resize', handleActivity);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      chartContainer.removeEventListener('mousemove', handleActivity);
      chartContainer.removeEventListener('wheel', handleActivity);
      window.removeEventListener('mouseup', handleActivity);
      window.removeEventListener('resize', handleActivity);
    };
  }, [chartContainer, updatePositions]);

  if (!visible || !showLineLabel || badgeItems.length === 0) {
    return null;
  }

  const pane0 = (chartRef.current as any)?.panes?.()?.[0];
  const effectivePane0H = (pane0 && typeof pane0.getHeight === 'function')
    ? pane0.getHeight()
    : (chartContainer?.clientHeight || pane0Height || 450);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-25">
      {badgeItems.map((item) => {
        const y = positions[item.id];
        if (y === null || y === undefined || isNaN(y)) return null;

        // Clamp inside Pane 0 bounds so it never leaks into sub-panes
        if (y < 8 || y > effectivePane0H - 8) return null;

        const pctText = (showPct && item.upside !== null)
          ? ` (${item.upside >= 0 ? '+' : ''}${item.upside.toFixed(1)}%)`
          : '';
        const text = `${item.label}${item.price.toFixed(2)}${pctText}`;

        return (
          <div
            key={item.id}
            style={{
              top: `${y}px`,
              right: `${scaleWidth}px`,
              transform: 'translateY(-50%)',
              backgroundColor: item.color,
            }}
            className="absolute flex items-center px-1.5 py-[2px] rounded-[3px] shadow-md border border-white/20 text-white font-mono font-bold text-[12px] leading-none whitespace-nowrap transition-all duration-75"
          >
            <span>{text}</span>
          </div>
        );
      })}
    </div>
  );
};
