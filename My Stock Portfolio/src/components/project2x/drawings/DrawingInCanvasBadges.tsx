import React, { useEffect, useState, useCallback } from 'react';
import { ISeriesApi, IChartApi } from 'lightweight-charts';
import { HorizontalLineDrawing } from '../../../types/drawingTypes';
import { useDrawingStore } from '../../../stores/drawingStore';

interface DrawingInCanvasBadgesProps {
  drawings: HorizontalLineDrawing[];
  candleSeries: ISeriesApi<'Candlestick'> | null;
  chart: IChartApi | null;
  selectedLineId: string | null;
  onSelectLine: (id: string) => void;
  onOpenProperties: (id: string) => void;
  onContextMenu: (line: HorizontalLineDrawing, pos: { x: number; y: number }) => void;
  chartContainer: HTMLElement | null;
}

export const DrawingInCanvasBadges: React.FC<DrawingInCanvasBadgesProps> = ({
  drawings,
  candleSeries,
  chart,
  selectedLineId,
  onSelectLine,
  onOpenProperties,
  onContextMenu,
  chartContainer,
}) => {
  const drawingSettings = useDrawingStore((s) => s.drawingSettings);
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [scaleWidth, setScaleWidth] = useState<number>(60);

  const updatePositions = useCallback(() => {
    if (!candleSeries || drawings.length === 0) {
      setPositions({});
      return;
    }

    try {
      const pScale = candleSeries.priceScale();
      const pWidth = pScale?.width?.() || 60;
      setScaleWidth(pWidth);
    } catch (e) {
      setScaleWidth(60);
    }

    const newPositions: Record<string, number> = {};
    for (const d of drawings) {
      try {
        const y = candleSeries.priceToCoordinate(d.price);
        if (y !== null && !isNaN(y)) {
          newPositions[d.id] = y;
        }
      } catch (e) {}
    }
    setPositions(newPositions);
  }, [candleSeries, drawings]);

  // Recalculate on drawings change or candle series update
  useEffect(() => {
    updatePositions();
  }, [updatePositions]);

  // Subscribe to time scale visible logical range changes (zooming, scrolling)
  useEffect(() => {
    if (!chart) return;
    const timeScale = chart.timeScale();
    const handleRangeChange = () => {
      updatePositions();
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [chart, updatePositions]);

  // Listen to chart pan / mouse movements for smooth dynamic tracking
  useEffect(() => {
    if (!chartContainer) return;

    let rafId: number | null = null;
    const handlePointerActivity = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        updatePositions();
        rafId = null;
      });
    };

    chartContainer.addEventListener('mousemove', handlePointerActivity);
    chartContainer.addEventListener('wheel', handlePointerActivity, { passive: true });
    window.addEventListener('mouseup', handlePointerActivity);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      chartContainer.removeEventListener('mousemove', handlePointerActivity);
      chartContainer.removeEventListener('wheel', handlePointerActivity);
      window.removeEventListener('mouseup', handlePointerActivity);
    };
  }, [chartContainer, updatePositions]);

  if (!candleSeries || drawings.length === 0) return null;

  const containerHeight = chartContainer?.clientHeight || 600;
  const level = drawingSettings.labelSizeLevel || 1;

  // Level typography and padding mappings
  const levelStyles = {
    1: {
      fontSize: '10px',
      padding: '1px 5px',
      gap: '2px',
      borderRadius: '4px',
    },
    2: {
      fontSize: '11px',
      padding: '2px 6px',
      gap: '3px',
      borderRadius: '4px',
    },
    3: {
      fontSize: '12px',
      padding: '2px 8px',
      gap: '4px',
      borderRadius: '5px',
    },
    4: {
      fontSize: '13px',
      padding: '4px 10px',
      gap: '5px',
      borderRadius: '6px',
    },
  }[level];

  return (
    <>
      {drawings.map((d) => {
        const y = positions[d.id];
        // Hide if outside visible vertical chart pane
        if (y === undefined || y < 10 || y > containerHeight - 32) return null;

        const isSelected = selectedLineId === d.id;

        // Label content
        const displayText = d.text
          ? d.text
          : `${d.price.toFixed(2)}`;

        return (
          <div
            key={d.id}
            style={{
              top: `${y}px`,
              right: `${scaleWidth + 6}px`,
              transform: 'translateY(-50%)',
              fontSize: levelStyles.fontSize,
              padding: levelStyles.padding,
              gap: levelStyles.gap,
              borderRadius: levelStyles.borderRadius,
              backgroundColor: '#1E222D',
              borderColor: d.color,
              color: d.color,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectLine(d.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onOpenProperties(d.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onContextMenu(d, { x: e.clientX, y: e.clientY });
            }}
            className={`absolute z-20 pointer-events-auto cursor-pointer border font-mono font-bold tracking-tight shadow-md flex items-center select-none transition-transform hover:scale-105 active:scale-95 ${
              isSelected
                ? 'ring-2 ring-white/80 shadow-lg shadow-black/60 brightness-125'
                : 'hover:brightness-125'
            }`}
            title={`${displayText} • Click to select, Dbl-click to edit`}
          >
            {/* Small colored indicator dot */}
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <span className="whitespace-nowrap">{displayText}</span>
          </div>
        );
      })}
    </>
  );
};
