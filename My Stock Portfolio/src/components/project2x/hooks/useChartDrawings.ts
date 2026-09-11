import { useEffect, useRef, useState, useMemo, RefObject } from 'react';
import { IChartApi, ISeriesApi, IPriceLine, BarPrice } from 'lightweight-charts';
import { useDrawingStore } from '../../../stores/drawingStore';
import { HorizontalLineDrawing, TrendLineDrawing } from '../../../types/drawingTypes';
import { RawBarItem, Resolution, getChartLineStyle } from '../../../types/chart';
import {
  hitTestLines,
  hitTestTrendLines,
  snapToCandleOHLC,
  snapToTickSize,
} from '../../../utils/drawingUtils';
import { triggerPriceAlert } from '../../../utils/drawingAlerts';
import { RulerPoint } from '../PriceRangeRuler';
import { TrendLinePrimitive, TrendLinePreview } from '../../../utils/drawings/trendLinePrimitive';

export interface UseChartDrawingsProps {
  symbol: string;
  displayBars: RawBarItem[];
  resolution: Resolution;
  chartContainerRef: RefObject<HTMLDivElement | null>;
  chartRef: RefObject<IChartApi | null>;
  candleSeriesRef: RefObject<ISeriesApi<'Candlestick'> | null>;
  candleSeriesReady: number;
}

export function useChartDrawings({
  symbol,
  displayBars,
  resolution,
  chartContainerRef,
  chartRef,
  candleSeriesRef,
  candleSeriesReady,
}: UseChartDrawingsProps) {
  const priceLineMapRef = useRef<Map<string, IPriceLine>>(new Map());
  const isDraggingLineRef = useRef<{ lineId: string; startPrice: number } | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const isMeasuringRulerRef = useRef<boolean>(false);
  const lastYRef = useRef<number>(0);

  // Trendline Primitive Ref & 2-click state machine
  const trendLinePrimitiveRef = useRef<TrendLinePrimitive | null>(null);
  if (!trendLinePrimitiveRef.current) {
    trendLinePrimitiveRef.current = new TrendLinePrimitive();
  }
  const trendLineStartRef = useRef<{
    startTime: string | number;
    startPrice: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [trendLinePreview, setTrendLinePreview] = useState<TrendLinePreview | null>(null);

  const [rulerState, setRulerState] = useState<{ startPoint: RulerPoint; currentPoint: RulerPoint } | null>(null);
  const [selectedLineY, setSelectedLineY] = useState<number>(0);
  const [propertiesModalLineId, setPropertiesModalLineId] = useState<string | null>(null);
  const [contextMenuData, setContextMenuData] = useState<{
    line: HorizontalLineDrawing;
    position: { x: number; y: number };
  } | null>(null);
  const [magnetIndicator, setMagnetIndicator] = useState<{
    x: number;
    y: number;
    text: string;
    price: number;
  } | null>(null);

  const drawingsBySymbol = useDrawingStore((s) => s.drawingsBySymbol);
  const trendLinesBySymbol = useDrawingStore((s) => s.trendLinesBySymbol);
  const globalDrawingsVisible = useDrawingStore((s) => s.globalDrawingsVisible);
  const selectedLineId = useDrawingStore((s) => s.selectedLineId);
  const selectedTrendLineId = useDrawingStore((s) => s.selectedTrendLineId);
  const toastNotification = useDrawingStore((s) => s.toastNotification);

  const drawings = useMemo(() => {
    return drawingsBySymbol[symbol.toUpperCase().trim()] || [];
  }, [drawingsBySymbol, symbol]);

  const trendLines = useMemo(() => {
    return trendLinesBySymbol[symbol.toUpperCase().trim()] || [];
  }, [trendLinesBySymbol, symbol]);

  // Load drawings & trend lines on symbol change
  useEffect(() => {
    useDrawingStore.getState().loadDrawings(symbol);
    useDrawingStore.getState().loadTrendLines(symbol);
  }, [symbol]);

  const visibleDrawings = useMemo(() => {
    if (!globalDrawingsVisible) return [];
    return drawings.filter((d) => {
      if (!d.visible) return false;
      if (d.visibleOn && d.visibleOn !== 'all' && d.visibleOn !== resolution) return false;
      return true;
    });
  }, [drawings, globalDrawingsVisible, resolution]);

  const visibleTrendLines = useMemo(() => {
    if (!globalDrawingsVisible) return [];
    return trendLines.filter((tl) => {
      if (tl.visible === false) return false;
      if (tl.visibleOn && tl.visibleOn !== 'all' && tl.visibleOn !== resolution) return false;
      return true;
    });
  }, [trendLines, globalDrawingsVisible, resolution]);

  // Attach TrendLinePrimitive to Candle Series
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const prim = trendLinePrimitiveRef.current;
    if (!candleSeries || !prim) return;
    try {
      candleSeries.attachPrimitive(prim);
    } catch (e) {}

    return () => {
      try {
        candleSeries.detachPrimitive(prim);
      } catch (e) {}
    };
  }, [candleSeriesReady, candleSeriesRef]);

  // Synchronize trendlines data to primitive
  useEffect(() => {
    trendLinePrimitiveRef.current?.setData(visibleTrendLines, selectedTrendLineId, trendLinePreview);
  }, [visibleTrendLines, selectedTrendLineId, trendLinePreview]);

  const selectedDrawing = useMemo(() => {
    if (!selectedLineId) return null;
    return drawings.find((d) => d.id === selectedLineId) || null;
  }, [drawings, selectedLineId]);

  // Sync selected line Y coordinate
  useEffect(() => {
    if (!selectedDrawing || !candleSeriesRef.current) return;
    const y = candleSeriesRef.current.priceToCoordinate(selectedDrawing.price as unknown as BarPrice);
    if (y !== null) {
      setSelectedLineY(y);
    }
  }, [selectedDrawing, selectedDrawing?.price, candleSeriesRef]);

  // Synchronize drawings store with Native Lightweight Charts IPriceLine
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    const currentMap = priceLineMapRef.current;
    const activeIds = new Set(visibleDrawings.map((d) => d.id));

    // Remove deleted / hidden
    for (const [id, pl] of currentMap.entries()) {
      if (!activeIds.has(id)) {
        try {
          candleSeries.removePriceLine(pl);
        } catch (e) {}
        currentMap.delete(id);
      }
    }

    // Add or update
    for (const d of visibleDrawings) {
      const existing = currentMap.get(d.id);
      const lineOpts = {
        price: d.price,
        color: d.color,
        lineWidth: d.lineWidth,
        lineStyle: getChartLineStyle(d.lineStyle as any),
        axisLabelVisible: false,
        title: '',
      };

      if (existing) {
        existing.applyOptions(lineOpts);
      } else {
        const pl = candleSeries.createPriceLine(lineOpts);
        currentMap.set(d.id, pl);
      }
    }
  }, [visibleDrawings, symbol, candleSeriesReady, candleSeriesRef]);

  // Price Alert Monitor Effect
  useEffect(() => {
    if (!displayBars || displayBars.length < 2) return;
    const latestBar = displayBars[displayBars.length - 1];
    const prevBar = displayBars[displayBars.length - 2];
    const alertLines = visibleDrawings.filter((d) => d.alertEnabled);

    for (const line of alertLines) {
      const crossedUp = prevBar.close < line.price && latestBar.close >= line.price;
      const crossedDown = prevBar.close > line.price && latestBar.close <= line.price;

      if (crossedUp || crossedDown) {
        const pl = priceLineMapRef.current.get(line.id);
        triggerPriceAlert(line, crossedUp ? 'up' : 'down', chartContainerRef.current, pl, symbol);
      }
    }
  }, [displayBars, visibleDrawings, symbol, chartContainerRef]);

  // Global Keyboard Shortcuts (Alt+H, Del, Esc, Ctrl+C/V, Arrow Nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        useDrawingStore.getState().setActiveTool('horizontalLine');
        return;
      }

      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        useDrawingStore.getState().setActiveTool('trendLine');
        return;
      }

      if (e.key === 'Escape') {
        useDrawingStore.getState().setActiveTool('cursor');
        useDrawingStore.getState().selectLine(null);
        useDrawingStore.getState().selectTrendLine(null);
        trendLineStartRef.current = null;
        setTrendLinePreview(null);
        setPropertiesModalLineId(null);
        setRulerState(null);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = useDrawingStore.getState().selectedLineId;
        if (sel) {
          e.preventDefault();
          useDrawingStore.getState().deleteLine(symbol, sel);
          return;
        }
        const selTl = useDrawingStore.getState().selectedTrendLineId;
        if (selTl) {
          e.preventDefault();
          useDrawingStore.getState().deleteTrendLine(symbol, selTl);
          useDrawingStore.getState().selectTrendLine(null);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        useDrawingStore.getState().copySelectedLine(symbol);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        useDrawingStore.getState().pasteClipboard(symbol);
        return;
      }

      if (e.key === 'ArrowUp') {
        const sel = useDrawingStore.getState().selectedLineId;
        if (sel) {
          e.preventDefault();
          useDrawingStore.getState().nudgeSelectedLine(symbol, 'up');
        }
      } else if (e.key === 'ArrowDown') {
        const sel = useDrawingStore.getState().selectedLineId;
        if (sel) {
          e.preventDefault();
          useDrawingStore.getState().nudgeSelectedLine(symbol, 'down');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [symbol]);

  // Setup DOM mouse event listeners on chart container
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        const hovered = useDrawingStore.getState().hoveredLineId;
        if (hovered) {
          useDrawingStore.getState().deleteLine(symbol, hovered);
          return;
        }
      }

      if (e.button !== 0) return;
      const rect = container.getBoundingClientRect();
      if (e.clientX > rect.right - 60 || e.clientY > rect.bottom - 26) return;

      const mouseY = e.clientY - rect.top;
      const mouseX = e.clientX - rect.left;
      const candleSeries = candleSeriesRef.current;
      if (!candleSeries) return;

      const store = useDrawingStore.getState();
      const currentTool = store.activeTool;
      const currentDrawings = store.getDrawings(symbol);
      const isMagnet = store.magnetMode;

      const logical = chartRef.current?.timeScale().coordinateToLogical(mouseX);
      const barIdx = logical !== null && logical !== undefined ? Math.round(logical) : null;

      // Priority 0: Shift Key Held -> Price Range Ruler Measure Tool
      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const rawP = candleSeries.coordinateToPrice(mouseY);
        if (rawP !== null && !isNaN(rawP as unknown as number)) {
          const p = rawP as unknown as number;
          const barTime = (barIdx !== null && displayBars[barIdx]?.time) || '';
          const pt: RulerPoint = {
            x: mouseX,
            y: mouseY,
            price: p,
            time: barTime,
            barIndex: barIdx ?? 0,
          };
          isMeasuringRulerRef.current = true;
          setRulerState({ startPoint: pt, currentPoint: pt });
        }
        return;
      }

      // Normal click clears previous ruler box
      setRulerState(null);

      if (currentTool === 'horizontalLine') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const rawPrice = candleSeries.coordinateToPrice(mouseY);
        if (rawPrice !== null && !isNaN(rawPrice as unknown as number)) {
          let snappedPrice = rawPrice as unknown as number;
          if (isMagnet) {
            const snap = snapToCandleOHLC(rawPrice as unknown as number, mouseY, barIdx, displayBars, candleSeries, 30);
            snappedPrice = snap.price;
          } else {
            snappedPrice = snapToTickSize(rawPrice as unknown as number);
          }

          store.addLine(symbol, { price: snappedPrice });
          setSelectedLineY(mouseY);
          setMagnetIndicator(null);
        }
        return;
      }

      // Priority: Trend Line 2-Click Drawing Tool
      if (currentTool === 'trendLine') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const rawPrice = candleSeries.coordinateToPrice(mouseY);
        if (rawPrice !== null && !isNaN(rawPrice as unknown as number)) {
          let snappedPrice = rawPrice as unknown as number;
          let snapY = mouseY;
          if (isMagnet) {
            const snap = snapToCandleOHLC(rawPrice as unknown as number, mouseY, barIdx, displayBars, candleSeries, 30);
            snappedPrice = snap.price;
            if (snap.yCoord !== undefined) snapY = snap.yCoord;
          } else {
            snappedPrice = snapToTickSize(rawPrice as unknown as number);
          }
          const barTime = (barIdx !== null && displayBars[barIdx]?.time) || '';

          if (!trendLineStartRef.current) {
            // Step 1: Anchor first point
            trendLineStartRef.current = {
              startTime: barTime,
              startPrice: snappedPrice,
              startX: mouseX,
              startY: snapY,
            };
            setTrendLinePreview({
              startX: mouseX,
              startY: snapY,
              currentX: mouseX,
              currentY: snapY,
            });
            store.setToastNotification('📍 คลิกจุดที่ 2 บนชาร์ตเพื่อวาด Trendline ให้เสร็จ (หรือกด Esc เพื่อยกเลิก)');
          } else {
            // Step 2: Commit Trendline
            store.addTrendLine(symbol, {
              startTime: trendLineStartRef.current.startTime,
              startPrice: trendLineStartRef.current.startPrice,
              endTime: barTime,
              endPrice: snappedPrice,
              extendRight: false,
            });
            trendLineStartRef.current = null;
            setTrendLinePreview(null);
            setMagnetIndicator(null);
            store.setToastNotification('✨ สร้าง Trendline เรียบร้อย (กด Alt+T เพื่อวาดต่อ)');
            setTimeout(() => store.setToastNotification(null), 3000);
          }
        }
        return;
      }

      const hitLine = hitTestLines(mouseY, currentDrawings, candleSeries, 14);
      if (hitLine) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        store.selectLine(hitLine.id);
        store.selectTrendLine(null);
        setSelectedLineY(mouseY);

        if (hitLine.locked) {
          store.setToastNotification('🔒 เส้นนี้ล็อคอยู่ — กด Unlock ที่เมนูบนเส้นหรือไอคอนบนป้ายเพื่อลากปรับราคา');
          setTimeout(() => {
            if (useDrawingStore.getState().toastNotification?.includes('เส้นนี้ล็อคอยู่')) {
              useDrawingStore.getState().setToastNotification(null);
            }
          }, 2500);
          return;
        }

        chartRef.current?.applyOptions({ handleScroll: false, handleScale: false });
        if (e.ctrlKey) {
          const clonedId = store.cloneLine(symbol, hitLine.id);
          if (clonedId) {
            isDraggingLineRef.current = { lineId: clonedId, startPrice: hitLine.price };
            store.selectLine(clonedId);
          }
        } else {
          isDraggingLineRef.current = { lineId: hitLine.id, startPrice: hitLine.price };
        }
        return;
      }

      // Check Trendline selection hit-test
      const currentTrendLines = store.getTrendLines(symbol);
      const hitTrendLine = hitTestTrendLines(
        mouseX,
        mouseY,
        currentTrendLines,
        chartRef.current?.timeScale(),
        candleSeries,
        10
      );
      if (hitTrendLine) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        store.selectTrendLine(hitTrendLine.id);
        store.selectLine(null);
        return;
      }

      store.selectLine(null);
      store.selectTrendLine(null);
      setContextMenuData(null);

      isDraggingRef.current = true;
      lastYRef.current = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const candleSeries = candleSeriesRef.current;
      if (!candleSeries) return;

      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const mouseX = e.clientX - rect.left;

      const logical = chartRef.current?.timeScale().coordinateToLogical(mouseX);
      const barIdx = logical !== null && logical !== undefined ? Math.round(logical) : null;

      // Priority 0: Measuring with Price Range Ruler
      if (isMeasuringRulerRef.current) {
        const rawPrice = candleSeries.coordinateToPrice(mouseY);
        if (rawPrice !== null && !isNaN(rawPrice as unknown as number)) {
          const barTime = (barIdx !== null && displayBars[barIdx]?.time) || '';
          setRulerState((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              currentPoint: {
                x: mouseX,
                y: mouseY,
                price: rawPrice as unknown as number,
                time: barTime,
                barIndex: barIdx ?? 0,
              },
            };
          });
        }
        return;
      }

      if (isDraggingLineRef.current) {
        const lineId = isDraggingLineRef.current.lineId;
        const store = useDrawingStore.getState();
        const currentDrawings = store.getDrawings(symbol);
        const targetLine = currentDrawings.find((d) => d.id === lineId);

        if (targetLine) {
          if (targetLine.locked) {
            const startPrice = isDraggingLineRef.current.startPrice;
            const rawP = candleSeries.coordinateToPrice(mouseY);
            if (rawP !== null && Math.abs((rawP as unknown as number) - startPrice) / startPrice > 0.006) {
              store.setToastNotification('🔒 เส้นนี้ล็อคอยู่ — กด Unlock ที่เมนูบนเส้นหรือไอคอนบนป้ายเพื่อลากปรับราคา');
              setTimeout(() => {
                if (useDrawingStore.getState().toastNotification?.includes('เส้นนี้ล็อคอยู่')) {
                  useDrawingStore.getState().setToastNotification(null);
                }
              }, 2500);
            }
          } else {
            const rawPrice = candleSeries.coordinateToPrice(mouseY);
            if (rawPrice !== null && !isNaN(rawPrice as unknown as number)) {
              const isMagnet = store.magnetMode;
              let newPrice = rawPrice as unknown as number;

              if (isMagnet) {
                const snap = snapToCandleOHLC(rawPrice as unknown as number, mouseY, barIdx, displayBars, candleSeries, 30);
                newPrice = snap.price;
                if (snap.snappedType && snap.snappedType !== 'Tick') {
                  setMagnetIndicator({
                    x: mouseX,
                    y: snap.yCoord ?? mouseY,
                    text: `${snap.snappedType}: ${snap.price.toFixed(2)}`,
                    price: snap.price,
                  });
                } else {
                  setMagnetIndicator(null);
                }
              } else {
                newPrice = snapToTickSize(rawPrice as unknown as number);
                setMagnetIndicator(null);
              }

              const pl = priceLineMapRef.current.get(lineId);
              if (pl) {
                pl.applyOptions({ price: newPrice });
              }
              store.updateLine(symbol, lineId, { price: newPrice });
              setSelectedLineY(mouseY);
            }
          }
        }
        return;
      }

      if (isDraggingRef.current) {
        const deltaY = e.clientY - lastYRef.current;
        if (Math.abs(deltaY) < 1) return;

        const priceScale = candleSeries.priceScale();
        const range = priceScale.getVisibleRange();
        if (!range) return;

        const relLastY = lastYRef.current - rect.top;
        const relCurrY = e.clientY - rect.top;

        const p1 = candleSeries.coordinateToPrice(relLastY) as unknown as number;
        const p2 = candleSeries.coordinateToPrice(relCurrY) as unknown as number;

        let deltaPrice = 0;
        if (p1 !== null && p2 !== null && !isNaN(p1) && !isNaN(p2)) {
          deltaPrice = p1 - p2;
        } else {
          const height = Math.max(100, rect.height * 0.7);
          const priceRange = range.to - range.from;
          deltaPrice = (deltaY / height) * priceRange;
        }

        if (!isNaN(deltaPrice) && isFinite(deltaPrice)) {
          priceScale.setVisibleRange({
            from: range.from + deltaPrice,
            to: range.to + deltaPrice,
          });
          lastYRef.current = e.clientY;
          const selId = useDrawingStore.getState().selectedLineId;
          if (selId) {
            const selLine = useDrawingStore.getState().getDrawings(symbol).find((d) => d.id === selId);
            if (selLine) {
              const newY = candleSeries.priceToCoordinate(selLine.price as unknown as BarPrice);
              if (newY !== null) setSelectedLineY(newY);
            }
          }
        }
        return;
      }

      const store = useDrawingStore.getState();
      const currentTool = store.activeTool;
      const isMagnet = store.magnetMode;

      // Priority: Trend Line In-Progress Preview Update
      if (trendLineStartRef.current) {
        container.style.cursor = 'crosshair';
        let snapX = mouseX;
        let snapY = mouseY;

        if (isMagnet) {
          const rawP = candleSeries.coordinateToPrice(mouseY);
          if (rawP !== null && !isNaN(rawP as unknown as number)) {
            const snap = snapToCandleOHLC(rawP as unknown as number, mouseY, barIdx, displayBars, candleSeries, 30);
            if (snap.yCoord !== undefined) snapY = snap.yCoord;
            if (snap.snappedType && snap.snappedType !== 'Tick') {
              setMagnetIndicator({
                x: mouseX,
                y: snapY,
                text: `${snap.snappedType}: ${snap.price.toFixed(2)}`,
                price: snap.price,
              });
            }
          }
        }

        setTrendLinePreview({
          startX: trendLineStartRef.current.startX,
          startY: trendLineStartRef.current.startY,
          currentX: snapX,
          currentY: snapY,
        });
        return;
      }

      if (currentTool === 'horizontalLine' || currentTool === 'trendLine') {
        container.style.cursor = 'crosshair';

        if (isMagnet) {
          const rawP = candleSeries.coordinateToPrice(mouseY);
          if (rawP !== null && !isNaN(rawP as unknown as number)) {
            const snap = snapToCandleOHLC(rawP as unknown as number, mouseY, barIdx, displayBars, candleSeries, 30);
            if (snap.snappedType && snap.snappedType !== 'Tick') {
              setMagnetIndicator({
                x: mouseX,
                y: snap.yCoord ?? mouseY,
                text: `${snap.snappedType}: ${snap.price.toFixed(2)}`,
                price: snap.price,
              });
            } else {
              setMagnetIndicator(null);
            }
          }
        } else {
          setMagnetIndicator(null);
        }
      } else {
        setMagnetIndicator(null);
        const currentDrawings = store.getDrawings(symbol);
        const hit = hitTestLines(mouseY, currentDrawings, candleSeries, 14);
        if (hit) {
          container.style.cursor = hit.locked ? 'pointer' : 'ns-resize';
          store.hoverLine(hit.id);
        } else {
          // Check Trendline hover
          const currentTrendLines = store.getTrendLines(symbol);
          const hitTl = hitTestTrendLines(
            mouseX,
            mouseY,
            currentTrendLines,
            chartRef.current?.timeScale(),
            candleSeries,
            8
          );
          if (hitTl) {
            container.style.cursor = 'pointer';
          } else {
            container.style.cursor = 'default';
          }
          store.hoverLine(null);
        }
      }
    };

    const handleMouseUp = () => {
      if (isMeasuringRulerRef.current) {
        isMeasuringRulerRef.current = false;
        return;
      }
      if (isDraggingLineRef.current) {
        chartRef.current?.applyOptions({ handleScroll: true, handleScale: true });
      }
      isDraggingRef.current = false;
      isDraggingLineRef.current = null;
    };

    const handleMouseLeave = () => {
      if (isMeasuringRulerRef.current) {
        isMeasuringRulerRef.current = false;
      }
      if (isDraggingLineRef.current) {
        chartRef.current?.applyOptions({ handleScroll: true, handleScale: true });
      }
      isDraggingLineRef.current = null;
      isDraggingRef.current = false;
      setMagnetIndicator(null);
    };

    const handleContextMenu = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (e.clientX > rect.right - 60 || e.clientY > rect.bottom - 26) return;

      const mouseY = e.clientY - rect.top;
      const candleSeries = candleSeriesRef.current;
      if (candleSeries) {
        const currentDrawings = useDrawingStore.getState().getDrawings(symbol);
        const hit = hitTestLines(mouseY, currentDrawings, candleSeries, 14);
        if (hit) {
          e.preventDefault();
          setContextMenuData({ line: hit, position: { x: e.clientX, y: e.clientY } });
          return;
        }
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (e.clientX > rect.right - 60 || e.clientY > rect.bottom - 26) return;

      const mouseY = e.clientY - rect.top;
      const candleSeries = candleSeriesRef.current;
      if (candleSeries) {
        const currentDrawings = useDrawingStore.getState().getDrawings(symbol);
        const hit = hitTestLines(mouseY, currentDrawings, candleSeries, 14);
        if (hit) {
          setPropertiesModalLineId(hit.id);
          return;
        }
      }

      candleSeriesRef.current?.priceScale().setAutoScale(true);
    };

    container.addEventListener('mousedown', handleMouseDown, true);
    container.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('contextmenu', handleContextMenu);
    container.addEventListener('dblclick', handleDblClick);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown, true);
      container.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('contextmenu', handleContextMenu);
      container.removeEventListener('dblclick', handleDblClick);
    };
  }, [symbol, displayBars, candleSeriesRef, chartRef, chartContainerRef]);

  return {
    drawings,
    visibleDrawings,
    selectedDrawing,
    selectedLineY,
    setSelectedLineY,
    propertiesModalLineId,
    setPropertiesModalLineId,
    contextMenuData,
    setContextMenuData,
    magnetIndicator,
    globalDrawingsVisible,
    selectedLineId,
    toastNotification,
    priceLineMapRef,
    isDraggingLineRef,
    rulerState,
    setRulerState,
    trendLines,
    visibleTrendLines,
    selectedTrendLineId,
  };
}
