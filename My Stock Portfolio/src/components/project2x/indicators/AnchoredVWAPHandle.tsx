import React, { useEffect, useState, useCallback, useRef } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { RawBarItem, formatBarTime } from '../../../types/chart';
import { AnchoredVWAPResult } from '../../../utils/indicators/anchoredVWAP';
import { IndicatorSettings } from '../../../types/indicatorConfig';
import { useIndicatorStore } from '../../../stores/useIndicatorStore';
import { useDrawingStore } from '../../../stores/drawingStore';

interface AnchoredVWAPHandleProps {
  chart: IChartApi | null;
  candleSeries: ISeriesApi<'Candlestick'> | null;
  displayBars: RawBarItem[];
  anchoredVWAPResult: AnchoredVWAPResult | null;
  indicatorConfig: IndicatorSettings;
  chartContainer: HTMLElement | null;
}

function extractBarDateTime(time: any): { startDate: string; startTime: string } {
  if (typeof time === 'string') {
    if (time.includes('T')) {
      const parts = time.split('T');
      return {
        startDate: parts[0],
        startTime: parts[1].slice(0, 5) || '00:00',
      };
    }
    if (time.includes(' ')) {
      const parts = time.split(' ');
      return {
        startDate: parts[0],
        startTime: parts[1].slice(0, 5) || '00:00',
      };
    }
    return {
      startDate: time.slice(0, 10),
      startTime: '00:00',
    };
  }
  if (typeof time === 'object' && time !== null) {
    const y = time.year;
    const m = String(time.month).padStart(2, '0');
    const d = String(time.day).padStart(2, '0');
    return {
      startDate: `${y}-${m}-${d}`,
      startTime: '00:00',
    };
  }
  if (typeof time === 'number') {
    const d = new Date(time * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return {
      startDate: `${y}-${m}-${day}`,
      startTime: `${hh}:${mm}`,
    };
  }
  return { startDate: '', startTime: '00:00' };
}

export const AnchoredVWAPHandle: React.FC<AnchoredVWAPHandleProps> = ({
  chart,
  candleSeries,
  displayBars,
  anchoredVWAPResult,
  indicatorConfig,
  chartContainer,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{
    x: number;
    y: number;
    barDate: string;
    price: number;
  } | null>(null);

  const isDraggingRef = useRef(false);
  const lastTargetIdxRef = useRef<number | null>(null);

  const avCfg = indicatorConfig.anchoredVwap;
  const isVisible = avCfg?.visible && anchoredVWAPResult && anchoredVWAPResult.anchorIndex >= 0;

  // Compute position (x, y) of the anchor marker on the canvas
  const updatePosition = useCallback(() => {
    if (!chart || !candleSeries || !anchoredVWAPResult || displayBars.length === 0) {
      setPosition(null);
      return;
    }

    const anchorIdx = anchoredVWAPResult.anchorIndex;
    if (anchorIdx < 0 || anchorIdx >= displayBars.length) {
      setPosition(null);
      return;
    }

    const anchorBar = displayBars[anchorIdx];
    if (!anchorBar) {
      setPosition(null);
      return;
    }

    try {
      const timeScale = chart.timeScale();
      const t = formatBarTime(anchorBar.time);
      const x = timeScale.timeToCoordinate(t as any) ?? timeScale.logicalToCoordinate(anchorIdx as any);

      if (x === null || isNaN(x)) {
        setPosition(null);
        return;
      }

      // Calculate anchor Y position
      const aPadding = avCfg?.anchorPadding ?? 0;
      const bLow = typeof anchorBar.low === 'number' && !isNaN(anchorBar.low)
        ? anchorBar.low
        : (anchoredVWAPResult.vwap[anchorIdx] || 0);

      let y: number | null = null;
      if (aPadding > 0) {
        const bHigh = typeof anchorBar.high === 'number' && !isNaN(anchorBar.high)
          ? anchorBar.high
          : bLow;
        const candleSpread = Math.abs(bHigh - bLow);
        const localUnit = Math.max(candleSpread, (bLow || 1) * 0.015);
        const offset = localUnit * 0.6 + localUnit * (aPadding * 0.25);
        const safePrice = bLow - offset;
        y = candleSeries.priceToCoordinate(safePrice as any);
      } else {
        const yLow = candleSeries.priceToCoordinate(bLow as any);
        if (yLow !== null && !isNaN(yLow)) {
          y = yLow + 16; // Standard belowBar marker offset
        }
      }

      if (y === null || isNaN(y)) {
        setPosition(null);
        return;
      }

      setPosition({ x, y });
    } catch (e) {
      setPosition(null);
    }
  }, [chart, candleSeries, anchoredVWAPResult, displayBars, avCfg?.anchorPadding]);

  // Recalculate on indicator or bar change
  useEffect(() => {
    updatePosition();
  }, [updatePosition]);

  // Recalculate on pan / zoom / resize
  useEffect(() => {
    if (!chart) return;
    const timeScale = chart.timeScale();
    const handleRangeChange = () => updatePosition();

    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    window.addEventListener('resize', handleRangeChange);

    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      window.removeEventListener('resize', handleRangeChange);
    };
  }, [chart, updatePosition]);

  // Listen to mouse pan / wheel
  useEffect(() => {
    if (!chartContainer) return;
    let rafId: number | null = null;
    const handlePointer = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        updatePosition();
        rafId = null;
      });
    };

    chartContainer.addEventListener('mousemove', handlePointer);
    chartContainer.addEventListener('wheel', handlePointer, { passive: true });
    window.addEventListener('mouseup', handlePointer);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      chartContainer.removeEventListener('mousemove', handlePointer);
      chartContainer.removeEventListener('wheel', handlePointer);
      window.removeEventListener('mouseup', handlePointer);
    };
  }, [chartContainer, updatePosition]);

  // Start Dragging Anchor Point
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !chart || !chartContainer) return;
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    setIsDragging(true);

    // Disable chart scroll & scale during drag
    chart.applyOptions({ handleScroll: false, handleScale: false });
    chartContainer.style.cursor = 'grabbing';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !chart || !chartContainer || displayBars.length === 0) return;
      const rect = chartContainer.getBoundingClientRect();
      const mouseX = moveEvent.clientX - rect.left;
      const mouseY = moveEvent.clientY - rect.top;

      const logical = chart.timeScale().coordinateToLogical(mouseX);
      if (logical === null || logical === undefined) return;

      const clampedIdx = Math.max(0, Math.min(displayBars.length - 1, Math.round(logical)));
      const targetBar = displayBars[clampedIdx];
      if (!targetBar) return;

      setDragPreview({
        x: mouseX,
        y: mouseY,
        barDate: String(targetBar.time).slice(0, 10),
        price: targetBar.close,
      });

      if (lastTargetIdxRef.current !== clampedIdx) {
        lastTargetIdxRef.current = clampedIdx;
        const { startDate, startTime } = extractBarDateTime(targetBar.time);
        useIndicatorStore.getState().updateAnchoredVWAP({
          anchorMode: 'manual',
          startDate,
          startTime,
        });
      }
    };

    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragPreview(null);

      if (chart) {
        chart.applyOptions({ handleScroll: true, handleScale: true });
      }
      if (chartContainer) {
        chartContainer.style.cursor = 'default';
      }

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      const finalIdx = lastTargetIdxRef.current;
      if (finalIdx !== null && displayBars[finalIdx]) {
        const dStr = String(displayBars[finalIdx].time).slice(0, 10);
        useDrawingStore.getState().setToastNotification(`⚓ ย้าย Anchor VWAP ไปที่ ${dStr} เรียบร้อย`);
        setTimeout(() => {
          if (useDrawingStore.getState().toastNotification?.includes('ย้าย Anchor VWAP')) {
            useDrawingStore.getState().setToastNotification(null);
          }
        }, 3000);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  if (!isVisible || !position) return null;

  const anchorColor = avCfg?.anchorColor ?? '#FFE600';

  return (
    <>
      {/* Interactive Anchor Handle on Canvas */}
      <div
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)',
        }}
        className="absolute z-30 pointer-events-auto cursor-grab active:cursor-grabbing select-none group"
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="⚓ คลิกค้างแล้วลากเพื่อย้ายจุด Anchor VWAP"
      >
        {/* Generous Hitbox (28px) */}
        <div className="w-7 h-7 flex items-center justify-center relative">
          {/* Animated Pulsing Outer Ring on Hover or Drag */}
          {(isHovered || isDragging) && (
            <div
              style={{ borderColor: anchorColor }}
              className="absolute inset-0 rounded-full border-2 animate-ping opacity-60 pointer-events-none"
            />
          )}

          {/* Glowing Halo */}
          <div
            style={{
              backgroundColor: anchorColor,
              boxShadow: isHovered || isDragging ? `0 0 14px 2px ${anchorColor}` : `0 0 8px 1px ${anchorColor}80`,
            }}
            className={`w-3.5 h-3.5 rounded-full border-2 border-white transition-transform duration-150 ${
              isHovered || isDragging ? 'scale-125' : 'scale-100'
            }`}
          />
        </div>

        {/* Hover Tooltip (When not actively dragging) */}
        {isHovered && !isDragging && (
          <div
            style={{ borderColor: anchorColor }}
            className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 bg-slate-900/95 border rounded-md shadow-2xl backdrop-blur-md pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <span className="text-[13px] font-bold text-amber-300">⚓ ลาก Anchor</span>
            <span className="text-[13px] text-slate-300 font-mono">
              ({String(anchoredVWAPResult.anchorTime).slice(0, 10)})
            </span>
          </div>
        )}
      </div>

      {/* Floating Drag Indicator following cursor */}
      {isDragging && dragPreview && (
        <div
          style={{
            left: `${dragPreview.x + 16}px`,
            top: `${dragPreview.y - 28}px`,
          }}
          className="pointer-events-none absolute z-50 px-3 py-1 bg-slate-900/95 border border-amber-400 text-amber-300 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in duration-75"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-[13px] font-bold">⚓ Anchor: {dragPreview.barDate}</span>
          <span className="text-[13px] font-mono text-slate-200">
            ${dragPreview.price ? dragPreview.price.toFixed(2) : ''}
          </span>
        </div>
      )}
    </>
  );
};
