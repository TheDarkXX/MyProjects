import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  CandlestickSeries,
  AreaSeries,
  LineSeries,
  BaselineSeries,
  HistogramSeries,
  createSeriesMarkers,
  ColorType,
  CrosshairMode,
  LineStyle,
  IPriceLine,
} from 'lightweight-charts';
import { BankerMCDXSeriesView } from './BankerMCDXPlugin';
import { useIndicatorStore } from '../../stores/useIndicatorStore';
import { useUiStore } from '../../stores/uiStore';
import { SMCPrimitive } from '../../utils/indicators/smcPrimitive';
import { VolumeProfilePrimitive } from '../../utils/indicators/volumeProfilePrimitive';
import { SubPaneHeaderToolbar } from '../xchart/panes/SubPaneHeaderToolbar';
import { MainPaneIndicatorLegend } from './panes/MainPaneIndicatorLegend';
import {
  IndicatorSettings,
  SubPaneIndicatorId,
} from '../../types/indicatorConfig';
import { getTierMetadata, CyberTier } from '../../utils/tierConfig';
import { ScenarioPreflightCard, SignalCheckItem } from './ScenarioPreflightCard';
import { useDrawingStore } from '../../stores/drawingStore';
import { LeftDrawingToolbar } from './drawings/LeftDrawingToolbar';
import { LineFloatingToolbar } from './drawings/LineFloatingToolbar';
import { LinePropertiesDialog } from './drawings/LinePropertiesDialog';
import { LineContextMenu } from './drawings/LineContextMenu';
import { DrawingAlertBanner } from './drawings/DrawingAlertBanner';
import { DrawingInCanvasBadges } from './drawings/DrawingInCanvasBadges';
import { countTouches } from '../../utils/drawingUtils';
import {
  TV_FONT_FAMILY,
  TimeFrame,
  ChartStyle,
  Resolution,
  RawBarItem,
  WatchlistStock,
  PortfolioOverlayConfig,
  getChartLineStyle,
  hexToRgba,
} from '../../types/chart';
import { usePositionOverlayStore } from '../../stores/usePositionOverlayStore';
import { ChartPositionHUD } from './position/ChartPositionHUD';
import { Holding } from '../../hooks/useHoldings';
import { BlueprintEntry } from '../../stores/blueprintStore';
import { usePriceStore } from '../../stores/priceStore';
import { useChartIndicators } from './hooks/useChartIndicators';
import { useChartLivePulse } from './hooks/useChartLivePulse';
import { useChartDrawings } from './hooks/useChartDrawings';
import { useChartSeries } from './hooks/useChartSeries';
import { PriceRangeRuler } from './PriceRangeRuler';
import { AnchoredVWAPHandle } from './indicators/AnchoredVWAPHandle';
import { LiveEMAIndicatorBadge } from './indicators/LiveEMAIndicatorBadge';
import { LiveConsensusBadge } from './indicators/LiveConsensusBadge';
import { getTierVisualInfo } from '../xchart/TierBadgeIndicator';
import { ChartControlBar } from './ChartControlBar';
import { ChartLegendBar, DominanceTableOverlay } from './ChartLegendOverlay';
import { applyPaneLayoutHeights as computePaneHeights } from './chartLayoutUtils';
import { useDeviceLayout } from '../../hooks/useDeviceLayout';
import {
  ChartContext,
  useChartViewStore,
  DEFAULT_XCHART_VISIBILITY,
  DEFAULT_P2X_VISIBILITY,
} from '../../stores/useChartViewStore';

export { TV_FONT_FAMILY };
export type { WatchlistStock, TimeFrame, ChartStyle, Resolution, PortfolioOverlayConfig };

export interface LWChartProps {
  isMobile?: boolean;
  symbol: string;
  dates?: string[];
  closes: number[];
  opens?: number[];
  highs?: number[];
  lows?: number[];
  volumes?: number[];
  ema50?: (number | null)[];
  ema150?: (number | null)[];
  ema200?: (number | null)[];
  bankerSeries?: number[];
  hotMoneySeries?: number[];
  retailSeries?: number[];
  bankerMaSeries?: number[];
  banker?: number;
  currentPrice: number;
  ema9?: (number | null)[];
  scenario?: number;
  badge?: string;
  trafficLight?: CyberTier;
  regime?: 'BULL' | 'BEAR' | 'NEUTRAL';
  reasonTh?: string;
  signalsChecklist?: SignalCheckItem[];
  distEma150?: number;
  distEma200?: number;
  className?: string;
  onAddInflow?: () => void;
  watchlist?: WatchlistStock[];
  onSelectSymbol?: (symbol: string) => void;
  resolution?: Resolution;
  onResolutionChange?: (res: Resolution) => void;
  portfolioOverlay?: PortfolioOverlayConfig;
  onToggleFullscreen?: () => void;
  holding?: Holding | null;
  blueprint?: BlueprintEntry | null;
  onOpenHoldingDrawer?: () => void;
  chartContext?: ChartContext;
  timeframe?: TimeFrame;
  onTimeframeChange?: (tf: TimeFrame) => void;
  chartStyle?: ChartStyle;
  onChartStyleChange?: (style: ChartStyle) => void;
  analystConsensus?: any;
}

export const LWChart: React.FC<LWChartProps> = ({
  isMobile: propIsMobile,
  symbol,
  dates = [],
  closes = [],
  opens = [],
  highs = [],
  lows = [],
  volumes = [],
  ema50 = [],
  ema150 = [],
  ema200 = [],
  bankerSeries = [],
  hotMoneySeries = [],
  retailSeries = [],
  bankerMaSeries = [],
  banker,
  currentPrice = 0,
  scenario = 1,
  badge,
  trafficLight = 'ON_RADAR',
  regime,
  reasonTh,
  signalsChecklist,
  distEma150: propDistEma150,
  distEma200: propDistEma200,
  className = '',
  onAddInflow,
  watchlist = [],
  onSelectSymbol,
  resolution: propResolution,
  onResolutionChange,
  portfolioOverlay,
  onToggleFullscreen,
  holding,
  blueprint,
  analystConsensus,
  onOpenHoldingDrawer,
  chartContext,
  timeframe: propTimeframe,
  onTimeframeChange: propOnTimeframeChange,
  chartStyle: propChartStyle,
  onChartStyleChange: propOnChartStyleChange,
}) => {
  const { isMobile: layoutIsMobile } = useDeviceLayout();
  const isMobile = propIsMobile ?? layoutIsMobile;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const volumeProfilePrimitiveRef = useRef<VolumeProfilePrimitive | null>(null);

  const activeContext: ChartContext = chartContext ?? 'xchart';
  const viewProfile = useChartViewStore((s) => s.profiles[activeContext]) || (activeContext === 'project2x' ? DEFAULT_P2X_VISIBILITY : DEFAULT_XCHART_VISIBILITY);

  const positionConfig = usePositionOverlayStore((s) => s.config);
  const { currency } = useUiStore();
  const { exchangeRate } = usePriceStore();

  // States with localStorage persistence or parent-controlled per-tab settings
  const [internalTimeframe, setInternalTimeframe] = useState<TimeFrame>(() => {
    try {
      const saved = localStorage.getItem('p2x_lw_timeframe');
      if (saved && ['7D', '1M', '3M', '6M', '10M', '1Y', '5Y', 'ALL'].includes(saved)) {
        return saved as TimeFrame;
      }
    } catch (e) {}
    return '10M';
  });

  const timeframe = propTimeframe !== undefined ? propTimeframe : internalTimeframe;
  const setTimeframe = (newTf: TimeFrame) => {
    if (propOnTimeframeChange) {
      propOnTimeframeChange(newTf);
    } else {
      setInternalTimeframe(newTf);
    }
  };

  const [internalChartStyle, setInternalChartStyle] = useState<ChartStyle>(() => {
    try {
      const saved = localStorage.getItem('p2x_lw_style');
      if (saved === 'CANDLE' || saved === 'HEIKIN_ASHI' || saved === 'AREA') return saved;
    } catch (e) {}
    return 'CANDLE';
  });

  const chartStyle = propChartStyle !== undefined ? propChartStyle : internalChartStyle;
  const setChartStyle = (newStyle: ChartStyle) => {
    if (propOnChartStyleChange) {
      propOnChartStyleChange(newStyle);
    } else {
      setInternalChartStyle(newStyle);
    }
  };

  const { xchartEnable4HForex } = useUiStore();
  const isForex = symbol === 'THB=X' || symbol.endsWith('=X') || symbol.includes('USD/THB');
  const canShow4H = isForex && xchartEnable4HForex;

  const [internalResolution, setInternalResolution] = useState<Resolution>(() => {
    try {
      const saved = localStorage.getItem('p2x_lw_resolution');
      if (saved === '4H' || saved === '1D' || saved === '1W') return saved as Resolution;
    } catch (e) {}
    return '1D';
  });

  const resolution: Resolution = propResolution !== undefined ? propResolution : internalResolution;
  const setResolution = (newRes: Resolution) => {
    if (onResolutionChange) {
      onResolutionChange(newRes);
    } else {
      setInternalResolution(newRes);
    }
    try {
      localStorage.setItem('p2x_lw_resolution', newRes);
    } catch (e) {}
  };

  // Fallback: if resolution is 4H but 4H is disabled or asset is not forex
  useEffect(() => {
    if (resolution === '4H' && !canShow4H) {
      setResolution('1D');
    }
  }, [resolution, canShow4H]);

  const [isIndicatorOpen, setIsIndicatorOpen] = useState<boolean>(false);
  const rawIndicatorConfig = useIndicatorStore((s) => s.config);

  // Context-scoped Effective Indicator Configuration
  const indicatorConfig = useMemo(() => {
    const isP2X = activeContext === 'project2x';
    return {
      ...rawIndicatorConfig,
      ema1: {
        ...rawIndicatorConfig.ema1,
        visible: isP2X ? viewProfile.showEMA : (rawIndicatorConfig.ema1.visible && viewProfile.showEMA),
      },
      ema2: {
        ...rawIndicatorConfig.ema2,
        visible: isP2X ? viewProfile.showEMA : (rawIndicatorConfig.ema2.visible && viewProfile.showEMA),
      },
      ema3: {
        ...rawIndicatorConfig.ema3,
        visible: isP2X ? viewProfile.showEMA : (rawIndicatorConfig.ema3.visible && viewProfile.showEMA),
      },
      ema4: {
        ...(rawIndicatorConfig.ema4 || { id: 'ema4', name: 'EMA 4', visible: false, period: 9, color: '#10B981', lineWidth: 2, lineStyle: 'Solid' }),
        visible: isP2X ? viewProfile.showEMA : ((rawIndicatorConfig.ema4?.visible ?? false) && viewProfile.showEMA),
      },
      ema5: {
        ...(rawIndicatorConfig.ema5 || { id: 'ema5', name: 'EMA 5', visible: false, period: 21, color: '#EC4899', lineWidth: 2, lineStyle: 'Solid' }),
        visible: isP2X ? viewProfile.showEMA : ((rawIndicatorConfig.ema5?.visible ?? false) && viewProfile.showEMA),
      },
      smcLite: {
        ...rawIndicatorConfig.smcLite,
        visible: isP2X ? viewProfile.showSMC : (Boolean(rawIndicatorConfig.smcLite?.visible) && viewProfile.showSMC),
      },
      anchoredVwap: {
        ...rawIndicatorConfig.anchoredVwap,
        visible: isP2X ? viewProfile.showVWAP : (Boolean(rawIndicatorConfig.anchoredVwap?.visible) && viewProfile.showVWAP),
      },
      volumeProfile: {
        ...rawIndicatorConfig.volumeProfile,
        visible: isP2X ? viewProfile.showVolumeProfile : (rawIndicatorConfig.volumeProfile?.visible !== false && viewProfile.showVolumeProfile),
      },
      superMoneySignal: {
        ...rawIndicatorConfig.superMoneySignal,
        visible: isP2X ? viewProfile.showSignals : (Boolean(rawIndicatorConfig.superMoneySignal?.visible) && viewProfile.showSignals),
      },
      envelope: {
        ...rawIndicatorConfig.envelope,
        visible: isP2X ? viewProfile.showEnvelope : (Boolean(rawIndicatorConfig.envelope?.visible) && viewProfile.showEnvelope),
      },
      trendSpeed: {
        ...rawIndicatorConfig.trendSpeed,
        visible: isP2X ? viewProfile.showTrendSpeed : (Boolean(rawIndicatorConfig.trendSpeed?.visible) && viewProfile.showTrendSpeed),
      },
      mcdx: {
        ...rawIndicatorConfig.mcdx,
        visible: isP2X ? viewProfile.showSubPane : (rawIndicatorConfig.mcdx.visible && viewProfile.showSubPane),
      },
    };
  }, [rawIndicatorConfig, viewProfile, activeContext]);

  const paneLayout = indicatorConfig.paneLayout || { assignments: { mcdx: 1, ultimateRsi: 2, trendSpeed: 3 } };

  // Calculate dynamic active sub-panes
  const activeSubPanes = useMemo(() => {
    const list: { id: SubPaneIndicatorId; rank: number }[] = [];
    if (indicatorConfig.mcdx?.visible) {
      list.push({ id: 'mcdx', rank: paneLayout.assignments.mcdx ?? 1 });
    }
    if (indicatorConfig.ultimateRsi?.visible) {
      list.push({ id: 'ultimateRsi', rank: paneLayout.assignments.ultimateRsi ?? 2 });
    }
    if (indicatorConfig.trendSpeed?.visible) {
      list.push({ id: 'trendSpeed', rank: paneLayout.assignments.trendSpeed ?? 3 });
    }
    list.sort((a, b) => a.rank - b.rank);

    const paneMap: Partial<Record<SubPaneIndicatorId, number>> = {};
    list.forEach((item, idx) => {
      paneMap[item.id] = idx + 1;
    });

    return {
      list,
      paneMap,
      count: list.length,
    };
  }, [
    indicatorConfig.mcdx?.visible,
    indicatorConfig.ultimateRsi?.visible,
    indicatorConfig.trendSpeed?.visible,
    paneLayout.assignments.mcdx,
    paneLayout.assignments.ultimateRsi,
    paneLayout.assignments.trendSpeed,
  ]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [maximizedPane, setMaximizedPane] = useState<number | null>(null);
  const [paneOffsets, setPaneOffsets] = useState<Record<number, { top: number; height: number }>>({});
  const [indicatorInitialView, setIndicatorInitialView] = useState<
    'list' | 'ema' | 'envelope' | 'signals' | 'mcdx' | 'ultimateRsi' | 'trendSpeed' | 'smcLite' | 'anchoredVwap' | 'superMoneySignal' | 'volumeProfile'
  >('list');

  // Multi-pane stretch layout calculation
  const applyPaneLayoutHeights = useCallback((
    chartInstance: any,
    cfg: IndicatorSettings,
    maximized: number | null
  ) => {
    computePaneHeights(
      chartInstance,
      chartContainerRef.current?.clientHeight || 650,
      cfg,
      activeSubPanes,
      maximized,
      isMobile
    );
  }, [activeSubPanes, isMobile]);

  // Hover Crosshair Legend data
  const [hoveredBar, setHoveredBar] = useState<RawBarItem | null>(null);
  const [hoveredRsi, setHoveredRsi] = useState<{ arsi: number | null; signal: number | null } | null>(null);
  const [hoveredTrendSpeed, setHoveredTrendSpeed] = useState<{
    speed: number | null;
    color: string;
    dynEma: number | null;
    dynColor: string;
  } | null>(null);
  const [candleSeriesReady, setCandleSeriesReady] = useState(0);

  // Save states to localStorage (only when uncontrolled by parent)
  useEffect(() => {
    if (propTimeframe === undefined) {
      try {
        localStorage.setItem('p2x_lw_timeframe', timeframe);
      } catch (e) {}
    }
  }, [timeframe, propTimeframe]);

  useEffect(() => {
    if (propChartStyle === undefined) {
      try {
        localStorage.setItem('p2x_lw_style', chartStyle);
      } catch (e) {}
    }
  }, [chartStyle, propChartStyle]);

  useEffect(() => {
    if (propResolution === undefined) {
      try {
        localStorage.setItem('p2x_lw_resolution', resolution);
      } catch (e) {}
    }
  }, [resolution, propResolution]);

  // Sync with native browser fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    const target = document.getElementById('xchart-terminal-container') || chartContainerRef.current;
    if (!document.fullscreenElement) {
      target?.requestFullscreen?.().catch(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen?.().catch(() => {
        setIsFullscreen(false);
      });
    }
  }, [onToggleFullscreen]);

  // Keyboard shortcut: F for Fullscreen, ESC to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'ด') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        } else {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleToggleFullscreen]);

  // 1. EXTRACTED HOOK: Indicator computations
  const {
    displayBars,
    aggregatedBars,
    rawBarsByDate,
    ultimateRSIResult,
    rsiDataByDate,
    trendSpeedResult,
    trendSpeedDataByDate,
    smcLiteResult,
    anchoredVWAPResult,
    superMoneySignalResult,
    calculatedRsiMarkers,
    pane0Markers,
  } = useChartIndicators({
    dates,
    closes,
    opens,
    highs,
    lows,
    volumes,
    ema50,
    ema150,
    ema200,
    bankerSeries,
    hotMoneySeries,
    retailSeries,
    bankerMaSeries,
    resolution,
    chartStyle,
    indicatorConfig,
    portfolioOverlay: positionConfig.enabled && positionConfig.showBuyMarkers && viewProfile.showBuyMarkers ? portfolioOverlay : undefined,
  });

  // Timeframe range applier
  const applyTimeframeRange = useCallback((tf: TimeFrame) => {
    if (!chartRef.current || displayBars.length === 0) return;
    const total = displayBars.length;
    let count = total;

    switch (tf) {
      case '7D': count = resolution === '1W' ? 4 : 7; break;
      case '1M': count = resolution === '1W' ? 5 : 22; break;
      case '3M': count = resolution === '1W' ? 14 : 65; break;
      case '6M': count = resolution === '1W' ? 26 : 130; break;
      case '10M': count = resolution === '1W' ? 44 : 215; break;
      case '1Y': count = resolution === '1W' ? 52 : 252; break;
      case '5Y': count = resolution === '1W' ? 260 : 1260; break;
      case 'ALL': count = total; break;
    }

    const from = Math.max(0, total - count);
    chartRef.current.timeScale().setVisibleLogicalRange({
      from: from - 0.5,
      to: total + 6,
    });

    try {
      const priceScale = candleSeriesRef.current?.priceScale() || chartRef.current.priceScale('right');
      priceScale?.setAutoScale(true);
    } catch (e) {}

    setTimeframe(tf);
  }, [displayBars.length, resolution]);

  // 2. EXTRACTED HOOK: Series management & updates
  const {
    candleSeriesRef,
    areaSeriesRef,
    ema50SeriesRef,
    ema150SeriesRef,
    ema200SeriesRef,
    ema4SeriesRef,
    ema5SeriesRef,
    upperEnvSeriesRef,
    lowerEnvSeriesRef,
    mcdxSeriesRef,
    bankerMaSeriesRef,
    rsiAreaSeriesRef,
    rsiSeriesRef,
    rsiSignalSeriesRef,
    dynTrendSeriesRef,
    trendSpeedHistSeriesRef,
    smcFastSmaSeriesRef,
    smcSlowSmaSeriesRef,
    smcPrimitiveRef,
    anchoredVwapSeriesRef,
    anchoredUpperBandSeriesRef,
    anchoredLowerBandSeriesRef,
    markersPluginRef,
    rsiMarkersPluginRef,
    mcdxStrikeLineRef,
    rsiObLineRef,
    rsiMidLineRef,
    rsiOsLineRef,
  } = useChartSeries({
    chartRef,
    chartContainerRef,
    displayBars,
    indicatorConfig,
    trendSpeedResult,
    ultimateRSIResult,
    smcLiteResult,
    anchoredVWAPResult,
    superMoneySignalResult,
    calculatedRsiMarkers,
    pane0Markers,
    chartStyle,
    timeframe,
    applyTimeframeRange,
    activeSubPanes,
    maximizedPane,
    applyPaneLayoutHeights,
    setPaneOffsets,
  });

  // Ghost Laser Price Line for Holographic Scenario Checklist hover
  const ghostPriceLineRef = useRef<IPriceLine | null>(null);

  const handleHoverPriceLevel = useCallback((price: number | null, label?: string) => {
    const activeSeries = candleSeriesRef.current || areaSeriesRef.current;
    if (!activeSeries) return;

    if (ghostPriceLineRef.current) {
      try {
        activeSeries.removePriceLine(ghostPriceLineRef.current);
      } catch (e) {}
      ghostPriceLineRef.current = null;
    }

    if (price !== null && !isNaN(price) && price > 0) {
      try {
        const lbl = label || '';
        let color = '#38BDF8';
        if (lbl.includes('200')) {
          color = '#F59E0B'; // Amber for EMA 200
        } else if (lbl.includes('9')) {
          color = '#06B6D4'; // Cyan for EMA 9
        } else if (lbl.includes('50')) {
          color = '#A855F7'; // Purple for EMA 50
        } else if (lbl.includes('Price')) {
          color = '#10B981'; // Emerald for Price
        }

        const line = activeSeries.createPriceLine({
          price: Number(price.toFixed(2)),
          color,
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `🎯 ${lbl.replace(/Trigger|Regime/g, '').trim() || 'TARGET'}: $${price.toFixed(2)}`,
        });
        ghostPriceLineRef.current = line;
      } catch (e) {
        console.warn('[GhostGuideRay] createPriceLine failed:', e);
      }
    }
  }, [candleSeriesRef, areaSeriesRef]);

  useEffect(() => {
    return () => {
      if (ghostPriceLineRef.current) {
        const activeSeries = candleSeriesRef.current || areaSeriesRef.current;
        if (activeSeries) {
          try {
            activeSeries.removePriceLine(ghostPriceLineRef.current);
          } catch (e) {}
        }
        ghostPriceLineRef.current = null;
      }
    };
  }, [candleSeriesRef, areaSeriesRef]);

  // 3. EXTRACTED HOOK: Live quote polling
  const { isLiveActive, isMarketOpen, livePrice } = useChartLivePulse({
    symbol,
    currentPrice,
    displayBars,
    candleSeriesRef,
    areaSeriesRef,
  });

  // 4. EXTRACTED HOOK: Drawings management & mouse interactions
  const {
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
    isDraggingLineRef,
    rulerState,
    setRulerState,
  } = useChartDrawings({
    symbol,
    displayBars,
    resolution,
    chartContainerRef,
    chartRef,
    candleSeriesRef,
    candleSeriesReady,
    drawingsVisible: viewProfile.showDrawings,
  });

  // Auto-sync logical range and price auto-scale whenever symbol changes or first loads
  const prevSymbolRef = useRef<string | null>(null);
  useEffect(() => {
    if (!chartRef.current || displayBars.length === 0) return;
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol;
      const rafId = requestAnimationFrame(() => {
        if (!chartRef.current || displayBars.length === 0) return;
        applyTimeframeRange(timeframe);
        try {
          const priceScale = candleSeriesRef.current?.priceScale() || chartRef.current.priceScale('right');
          priceScale?.setAutoScale(true);
        } catch (e) {}
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [symbol, displayBars.length, timeframe, applyTimeframeRange, candleSeriesRef]);

  // Instant reactive update for Pane 0 markers
  useEffect(() => {
    if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers(pane0Markers);
    }
  }, [pane0Markers, markersPluginRef]);

  // Portfolio Overlay Price Lines (Cost Basis, Target Price, Ceiling)
  const portfolioPriceLinesRef = useRef<any[]>([]);
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    for (const pl of portfolioPriceLinesRef.current) {
      try {
        candleSeries.removePriceLine(pl);
      } catch (e) {}
    }
    portfolioPriceLinesRef.current = [];

    if (!portfolioOverlay || !positionConfig.enabled) return;

    // 1. Cost Basis Line (Dynamic 3-State P&L Color or Static Custom Color)
    if (positionConfig.showAvgCostLine && viewProfile.showAvgCostLine && portfolioOverlay.avgCost && portfolioOverlay.avgCost > 0) {
      const pnlPct = portfolioOverlay.unrealizedPnLPercent;
      const pnlStr = pnlPct !== undefined ? ` (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)` : '';
      const ticker = (symbol || '').toUpperCase();

      let costColor = positionConfig.avgCostColor || '#F59E0B';
      if ((positionConfig.avgCostColorMode ?? 'dynamic') === 'dynamic') {
        const pct = pnlPct ?? 0;
        if (pct > 0.05) {
          costColor = positionConfig.avgCostProfitColor || '#FACC15';
        } else if (pct < -0.05) {
          costColor = positionConfig.avgCostLossColor || '#F43F5E';
        } else {
          costColor = positionConfig.avgCostBreakEvenColor || '#64748B';
        }
      }



      try {
        const line = candleSeries.createPriceLine({
          price: portfolioOverlay.avgCost,
          color: costColor,
          lineWidth: (positionConfig.avgCostWidth || 2) as any,
          lineStyle: getChartLineStyle(positionConfig.avgCostStyle || 'Dashed'),
          axisLabelVisible: true,
          title: ticker ? `${ticker}${pnlStr}` : `AVG${pnlStr}`,
        });
        portfolioPriceLinesRef.current.push(line);
      } catch (e) {}
    }


    // 2. Blueprint Target Price Line (Sky Blue)
    if (positionConfig.showBlueprintTarget && viewProfile.showBlueprintTarget && portfolioOverlay.blueprint?.targetPrice && portfolioOverlay.blueprint.targetPrice > 0) {
      try {
        const line = candleSeries.createPriceLine({
          price: portfolioOverlay.blueprint.targetPrice,
          color: positionConfig.targetColor || '#38BDF8',
          lineWidth: (positionConfig.targetWidth || 2) as any,
          lineStyle: getChartLineStyle(positionConfig.targetStyle || 'Dotted'),
          axisLabelVisible: true,
          title: `Target: $${portfolioOverlay.blueprint.targetPrice.toFixed(2)}`,
        });
        portfolioPriceLinesRef.current.push(line);
      } catch (e) {}
    }

    // 3. Blueprint Ceiling Price Line (Purple)
    if (positionConfig.showBlueprintTarget && portfolioOverlay.blueprint?.ceilingPrice && portfolioOverlay.blueprint.ceilingPrice > 0) {
      try {
        const line = candleSeries.createPriceLine({
          price: portfolioOverlay.blueprint.ceilingPrice,
          color: '#A855F7',
          lineWidth: 2,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `Ceiling: $${portfolioOverlay.blueprint.ceilingPrice.toFixed(2)}`,
        });
        portfolioPriceLinesRef.current.push(line);
      } catch (e) {}
    }

    return () => {
      for (const pl of portfolioPriceLinesRef.current) {
        try {
          candleSeries.removePriceLine(pl);
        } catch (e) {}
      }
      portfolioPriceLinesRef.current = [];
    };
  }, [candleSeriesReady, portfolioOverlay, positionConfig, viewProfile.showAvgCostLine, viewProfile.showBlueprintTarget]);

  // Target Consensus Price Lines (Mean, High, Low)
  const consensusPriceLinesRef = useRef<any[]>([]);
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries || !candleSeriesReady) return;

    // Cleanup previous consensus lines
    for (const pl of consensusPriceLinesRef.current) {
      try {
        candleSeries.removePriceLine(pl);
      } catch (e) {}
    }
    consensusPriceLinesRef.current = [];

    const tc = indicatorConfig.targetConsensus;
    if (!tc || !tc.visible || !analystConsensus) return;

    const targetMean = analystConsensus.targetMean;
    const targetHigh = analystConsensus.targetHigh;
    const targetLow = analystConsensus.targetLow;

    // 1. Target Mean Line
    if (targetMean && targetMean > 0 && (tc.targetMode === 'mean' || tc.targetMode === 'all')) {
      try {
        const line = candleSeries.createPriceLine({
          price: targetMean,
          color: tc.meanColor || '#38BDF8',
          lineWidth: (tc.lineWidth || 2) as any,
          lineStyle: getChartLineStyle(tc.lineStyle || 'Dotted'),
          axisLabelVisible: true,
          title: `Target: $${targetMean.toFixed(2)}`,
        });
        consensusPriceLinesRef.current.push(line);
      } catch (e) {}
    }

    // 2. Target High Line
    if (targetHigh && targetHigh > 0 && (tc.targetMode === 'band' || tc.targetMode === 'all')) {
      try {
        const line = candleSeries.createPriceLine({
          price: targetHigh,
          color: tc.highColor || '#10B981',
          lineWidth: (tc.lineWidth || 2) as any,
          lineStyle: getChartLineStyle(tc.lineStyle || 'Dotted'),
          axisLabelVisible: true,
          title: `Target High: $${targetHigh.toFixed(2)}`,
        });
        consensusPriceLinesRef.current.push(line);
      } catch (e) {}
    }

    // 3. Target Low Line
    if (targetLow && targetLow > 0 && (tc.targetMode === 'band' || tc.targetMode === 'all')) {
      try {
        const line = candleSeries.createPriceLine({
          price: targetLow,
          color: tc.lowColor || '#F43F5E',
          lineWidth: (tc.lineWidth || 2) as any,
          lineStyle: getChartLineStyle(tc.lineStyle || 'Dotted'),
          axisLabelVisible: true,
          title: `Target Low: $${targetLow.toFixed(2)}`,
        });
        consensusPriceLinesRef.current.push(line);
      } catch (e) {}
    }

    return () => {
      for (const pl of consensusPriceLinesRef.current) {
        try {
          candleSeries.removePriceLine(pl);
        } catch (e) {}
      }
      consensusPriceLinesRef.current = [];
    };
  }, [candleSeriesReady, analystConsensus, indicatorConfig.targetConsensus]);

  // Synchronize Volume Profile (VPVR) data
  useEffect(() => {
    if (volumeProfilePrimitiveRef.current && indicatorConfig.volumeProfile) {
      volumeProfilePrimitiveRef.current.setData(displayBars, indicatorConfig.volumeProfile);
    }
  }, [displayBars, indicatorConfig.volumeProfile]);

  // Initialize and build chart instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartContainerRef.current.innerHTML = '';

    const initialSize = indicatorConfig.signals.size ?? 1.2;
    const initialFontSize = initialSize <= 0.9 ? 11 : initialSize <= 1.2 ? 13 : initialSize <= 1.5 ? 15 : 18;

    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#090D16' },
        textColor: '#94A3B8',
        fontFamily: TV_FONT_FAMILY,
        fontSize: initialFontSize,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.25)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1E293B',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.25)',
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
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });
    chartRef.current = chart;

    // PANE 0: Price Chart Series
    const isBullTrend = displayBars.length > 1 ? displayBars[displayBars.length - 1].close >= displayBars[0].close : true;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#FFE600',
      downColor: '#C62828',
      borderUpColor: '#FFE600',
      borderDownColor: '#C62828',
      wickUpColor: '#FFE600',
      wickDownColor: '#C62828',
      visible: chartStyle !== 'AREA',
    }, 0);
    candleSeriesRef.current = candleSeries;
    setCandleSeriesReady((c) => c + 1);

    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: isBullTrend ? 'rgba(255, 230, 0, 0.38)' : 'rgba(198, 40, 40, 0.38)',
      bottomColor: 'rgba(0, 0, 0, 0.0)',
      lineColor: isBullTrend ? '#FFE600' : '#C62828',
      lineWidth: 2,
      visible: chartStyle === 'AREA',
    }, 0);
    areaSeriesRef.current = areaSeries;

    const showLabels = indicatorConfig.showAxisLabels;

    const ema50Series = chart.addSeries(LineSeries, {
      color: indicatorConfig.ema1.color,
      lineWidth: indicatorConfig.ema1.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema1.lineStyle),
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema1.period}` : '',
      visible: indicatorConfig.ema1.visible,
    }, 0);
    ema50SeriesRef.current = ema50Series;

    const ema150Series = chart.addSeries(LineSeries, {
      color: indicatorConfig.ema2.color,
      lineWidth: indicatorConfig.ema2.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema2.lineStyle),
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema2.period}` : '',
      visible: indicatorConfig.ema2.visible,
    }, 0);
    ema150SeriesRef.current = ema150Series;

    const ema200Series = chart.addSeries(LineSeries, {
      color: indicatorConfig.ema3.color,
      lineWidth: indicatorConfig.ema3.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema3.lineStyle),
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema3.period}` : '',
      visible: indicatorConfig.ema3.visible,
    }, 0);
    ema200SeriesRef.current = ema200Series;

    const ema4Series = chart.addSeries(LineSeries, {
      color: indicatorConfig.ema4?.color ?? '#10B981',
      lineWidth: (indicatorConfig.ema4?.lineWidth ?? 2) as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema4?.lineStyle ?? 'Solid'),
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema4?.period ?? 9}` : '',
      visible: indicatorConfig.ema4?.visible ?? false,
    }, 0);
    ema4SeriesRef.current = ema4Series;

    const ema5Series = chart.addSeries(LineSeries, {
      color: indicatorConfig.ema5?.color ?? '#EC4899',
      lineWidth: (indicatorConfig.ema5?.lineWidth ?? 2) as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema5?.lineStyle ?? 'Solid'),
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema5?.period ?? 21}` : '',
      visible: indicatorConfig.ema5?.visible ?? false,
    }, 0);
    ema5SeriesRef.current = ema5Series;

    const upperEnvSeries = chart.addSeries(LineSeries, {
      color: indicatorConfig.envelope.color,
      lineWidth: indicatorConfig.envelope.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.envelope.lineStyle),
      priceLineVisible: false,
      lastValueVisible: false,
      title: showLabels ? `+${indicatorConfig.envelope.percent}% Bedrock` : '',
      visible: indicatorConfig.envelope.visible,
    }, 0);
    upperEnvSeriesRef.current = upperEnvSeries;

    const lowerEnvSeries = chart.addSeries(LineSeries, {
      color: indicatorConfig.envelope.color,
      lineWidth: indicatorConfig.envelope.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.envelope.lineStyle),
      priceLineVisible: false,
      lastValueVisible: false,
      title: showLabels ? `-${indicatorConfig.envelope.percent}% Bedrock` : '',
      visible: indicatorConfig.envelope.visible,
    }, 0);
    lowerEnvSeriesRef.current = lowerEnvSeries;

    const isDynTrendVisible = indicatorConfig.trendSpeed?.visible && indicatorConfig.trendSpeed?.dynamicTrendVisible;
    const dynTrendSeries = chart.addSeries(LineSeries, {
      color: indicatorConfig.trendSpeed?.upTrendColor ?? '#F7D02C',
      lineWidth: (indicatorConfig.trendSpeed?.dynamicTrendLineWidth ?? 2) as any,
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? 'Dyn Trend' : '',
      visible: isDynTrendVisible,
    }, 0);
    dynTrendSeriesRef.current = dynTrendSeries;

    const isSmcVisible = indicatorConfig.smcLite?.visible;
    const isSmcFastVisible = isSmcVisible && (indicatorConfig.smcLite?.showFastSMA ?? false) && (indicatorConfig.smcLite?.showSMA ?? true);
    const smcFastSmaSeries = chart.addSeries(LineSeries, {
      color: indicatorConfig.smcLite?.fastSMAColor ?? '#3B82F6',
      lineWidth: (indicatorConfig.smcLite?.fastLineWidth ?? 1) as any,
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? `SMA ${indicatorConfig.smcLite?.smaFastLen ?? 15}` : '',
      visible: isSmcFastVisible,
    }, 0);
    smcFastSmaSeriesRef.current = smcFastSmaSeries;

    const isSmcSlowVisible = isSmcVisible && (indicatorConfig.smcLite?.showSlowSMA ?? true) && (indicatorConfig.smcLite?.showSMA ?? true);
    const smcSlowSmaSeries = chart.addSeries(LineSeries, {
      color: indicatorConfig.smcLite?.slowSMAColor ?? '#F59E0B',
      lineWidth: (indicatorConfig.smcLite?.slowLineWidth ?? 2) as any,
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? `SMA ${indicatorConfig.smcLite?.smaSlowLen ?? 200}` : '',
      visible: isSmcSlowVisible,
    }, 0);
    smcSlowSmaSeriesRef.current = smcSlowSmaSeries;

    const smcPrimitive = new SMCPrimitive();
    candleSeries.attachPrimitive(smcPrimitive);
    smcPrimitiveRef.current = smcPrimitive;

    const vpPrimitive = new VolumeProfilePrimitive();
    candleSeries.attachPrimitive(vpPrimitive);
    volumeProfilePrimitiveRef.current = vpPrimitive;

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      volumeProfilePrimitiveRef.current?.requestUpdate?.();
    });

    const isAvwapVisible = indicatorConfig.anchoredVwap?.visible;
    const anchoredVwapSeries = chart.addSeries(LineSeries, {
      color: indicatorConfig.anchoredVwap?.vwapColor ?? '#FFFFFF',
      lineWidth: (indicatorConfig.anchoredVwap?.vwapLineWidth ?? 3) as any,
      lineStyle: getChartLineStyle(indicatorConfig.anchoredVwap?.vwapLineStyle ?? 'Solid'),
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? 'VWAP' : '',
      visible: isAvwapVisible && (indicatorConfig.anchoredVwap?.vwapVisible ?? true),
    }, 0);
    anchoredVwapSeriesRef.current = anchoredVwapSeries;

    const anchoredUpperBandSeries = chart.addSeries(LineSeries, {
      color: indicatorConfig.anchoredVwap?.upperBandColor ?? '#94A3B8',
      lineWidth: (indicatorConfig.anchoredVwap?.upperBandLineWidth ?? 2) as any,
      lineStyle: getChartLineStyle(indicatorConfig.anchoredVwap?.upperBandLineStyle ?? 'Dashed'),
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? 'Upper Band' : '',
      visible: isAvwapVisible && (indicatorConfig.anchoredVwap?.showBands ?? true) && (indicatorConfig.anchoredVwap?.upperBandVisible ?? false),
    }, 0);
    anchoredUpperBandSeriesRef.current = anchoredUpperBandSeries;

    const anchoredLowerBandSeries = chart.addSeries(LineSeries, {
      color: indicatorConfig.anchoredVwap?.lowerBandColor ?? '#94A3B8',
      lineWidth: (indicatorConfig.anchoredVwap?.lowerBandLineWidth ?? 2) as any,
      lineStyle: getChartLineStyle(indicatorConfig.anchoredVwap?.lowerBandLineStyle ?? 'Dashed'),
      priceLineVisible: false,
      lastValueVisible: showLabels,
      title: showLabels ? 'Lower Band' : '',
      visible: isAvwapVisible && (indicatorConfig.anchoredVwap?.showBands ?? true) && (indicatorConfig.anchoredVwap?.lowerBandVisible ?? false),
    }, 0);
    anchoredLowerBandSeriesRef.current = anchoredLowerBandSeries;

    // Dynamic Sub-Panes Construction
    const createMCDXPane = (targetPane: number) => {
      const mcdxSeries = chart.addCustomSeries(
        new BankerMCDXSeriesView(),
        {
          title: showLabels ? 'MCDX' : '',
          priceLineVisible: false,
          lastValueVisible: showLabels,
          bankerColor: indicatorConfig.mcdx.bankerColor || '#C62828',
          hotMoneyColor: indicatorConfig.mcdx.hotMoneyColor || '#FFF176',
          retailColor: indicatorConfig.mcdx.retailColor || '#1B5E20',
          priceFormat: {
            type: 'custom',
            minMove: 1,
            formatter: (val: number) => val.toFixed(0),
          },
        } as any,
        targetPane
      );
      mcdxSeriesRef.current = mcdxSeries;

      const strikeLine = mcdxSeries.createPriceLine({
        price: 10,
        color: '#FC2D79',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: showLabels,
        title: showLabels ? '10 STRIKE' : '',
      });
      mcdxStrikeLineRef.current = strikeLine;

      const bankerMaSeries = chart.addSeries(LineSeries, {
        color: indicatorConfig.mcdx.maColor || '#FFFFFF',
        lineWidth: (indicatorConfig.mcdx.maWidth || 2) as any,
        priceLineVisible: false,
        lastValueVisible: showLabels,
        title: showLabels ? 'Banker MA' : '',
      }, targetPane);
      bankerMaSeriesRef.current = bankerMaSeries;

      chart.priceScale('right', targetPane).applyOptions({
        borderColor: 'rgba(255, 255, 255, 0.12)',
        scaleMargins: {
          top: 0.02,
          bottom: 0.0,
        },
      });
    };

    const createRSIPane = (targetPane: number) => {
      const isRsiVisible = indicatorConfig.ultimateRsi.visible && indicatorConfig.ultimateRsi.rsiVisible !== false;
      const isSigVisible = indicatorConfig.ultimateRsi.visible && indicatorConfig.ultimateRsi.signalVisible !== false;
      const showArea = indicatorConfig.ultimateRsi.showArea !== false;
      const obColor = indicatorConfig.ultimateRsi.obColor || '#089981';
      const osColor = indicatorConfig.ultimateRsi.osColor || '#F23645';
      const midVal = indicatorConfig.ultimateRsi.midValue ?? 50;

      const rsiAreaSeries = chart.addSeries(
        BaselineSeries,
        {
          baseValue: { type: 'price', price: midVal },
          topFillColor1: hexToRgba(obColor, 0.35),
          topFillColor2: hexToRgba(obColor, 0.03),
          bottomFillColor1: hexToRgba(osColor, 0.03),
          bottomFillColor2: hexToRgba(osColor, 0.35),
          topLineColor: 'transparent',
          bottomLineColor: 'transparent',
          lineVisible: false,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          visible: isRsiVisible && showArea,
        },
        targetPane
      );
      rsiAreaSeriesRef.current = rsiAreaSeries;

      const rsiSeries = chart.addSeries(
        LineSeries,
        {
          color: obColor,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: showLabels,
          title: showLabels ? 'ARSI (Extremes)' : '',
          visible: isRsiVisible,
        },
        targetPane
      );
      rsiSeriesRef.current = rsiSeries;

      const isObVisible = indicatorConfig.ultimateRsi.obVisible !== false;
      const rsiObLine = rsiSeries.createPriceLine({
        price: indicatorConfig.ultimateRsi.obValue,
        color: isObVisible ? indicatorConfig.ultimateRsi.obColor : 'transparent',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: showLabels && isObVisible,
        title: showLabels && isObVisible ? `${indicatorConfig.ultimateRsi.obValue} OB` : '',
      });
      rsiObLineRef.current = rsiObLine;

      const isMidVisible = indicatorConfig.ultimateRsi.midVisible !== false;
      const rsiMidLine = rsiSeries.createPriceLine({
        price: indicatorConfig.ultimateRsi.midValue ?? 50,
        color: isMidVisible ? (indicatorConfig.ultimateRsi.midColor || 'rgba(255, 255, 255, 0.25)') : 'transparent',
        lineStyle: LineStyle.Dotted,
        lineWidth: 1,
        axisLabelVisible: false,
        title: showLabels && isMidVisible ? `${indicatorConfig.ultimateRsi.midValue ?? 50} MID` : '',
      });
      rsiMidLineRef.current = rsiMidLine;

      const isOsVisible = indicatorConfig.ultimateRsi.osVisible !== false;
      const rsiOsLine = rsiSeries.createPriceLine({
        price: indicatorConfig.ultimateRsi.osValue,
        color: isOsVisible ? indicatorConfig.ultimateRsi.osColor : 'transparent',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: showLabels && isOsVisible,
        title: showLabels && isOsVisible ? `${indicatorConfig.ultimateRsi.osValue} OS` : '',
      });
      rsiOsLineRef.current = rsiOsLine;

      const rsiSignalSeries = chart.addSeries(
        LineSeries,
        {
          color: indicatorConfig.ultimateRsi.signalColor,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: showLabels,
          title: showLabels ? 'Signal' : '',
          visible: isSigVisible,
        },
        targetPane
      );
      rsiSignalSeriesRef.current = rsiSignalSeries;

      chart.priceScale('right', targetPane).applyOptions({
        borderColor: 'rgba(255, 255, 255, 0.12)',
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
      });
    };

    const createTrendSpeedPane = (targetPane: number) => {
      const isVisible = indicatorConfig.trendSpeed?.visible && indicatorConfig.trendSpeed?.trendSpeedVisible;
      const histSeries = chart.addSeries(
        HistogramSeries,
        {
          color: indicatorConfig.trendSpeed?.upHistColor1 ?? '#F7D02C',
          priceLineVisible: false,
          lastValueVisible: showLabels,
          title: showLabels ? 'Trend Speed' : '',
          visible: isVisible,
          priceFormat: {
            type: 'custom',
            minMove: 0.001,
            formatter: (val: number) => val.toFixed(3),
          },
        },
        targetPane
      );
      trendSpeedHistSeriesRef.current = histSeries;

      histSeries.createPriceLine({
        price: 0,
        color: 'rgba(255, 255, 255, 0.25)',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: false,
        title: '',
      });

      chart.priceScale('right', targetPane).applyOptions({
        borderColor: 'rgba(255, 255, 255, 0.12)',
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
      });
    };

    activeSubPanes.list.forEach(p => {
      const paneIdx = activeSubPanes.paneMap[p.id]!;
      if (p.id === 'mcdx') createMCDXPane(paneIdx);
      if (p.id === 'ultimateRsi') createRSIPane(paneIdx);
      if (p.id === 'trendSpeed') createTrendSpeedPane(paneIdx);
    });

    applyPaneLayoutHeights(chart, indicatorConfig, maximizedPane);

    const markersPlugin = createSeriesMarkers(candleSeries, pane0Markers);
    markersPluginRef.current = markersPlugin;

    if (rsiSignalSeriesRef.current) {
      const rsiMarkersPlugin = createSeriesMarkers(rsiSignalSeriesRef.current, indicatorConfig.ultimateRsi.visible ? calculatedRsiMarkers : []);
      rsiMarkersPluginRef.current = rsiMarkersPlugin;
    }

    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time) {
        setHoveredBar(null);
        setHoveredRsi(null);
        setHoveredTrendSpeed(null);
        return;
      }
      const timeStr = String(param.time);
      const raw = rawBarsByDate.get(timeStr);
      if (raw) {
        setHoveredBar(raw);
      }
      const rsi = rsiDataByDate.get(timeStr);
      if (rsi) {
        setHoveredRsi({ arsi: rsi.arsi, signal: rsi.signal });
      } else {
        setHoveredRsi(null);
      }
      const ts = trendSpeedDataByDate.get(timeStr);
      if (ts) {
        setHoveredTrendSpeed({
          speed: ts.speed,
          color: ts.color,
          dynEma: ts.dynEma,
          dynColor: ts.dynColor,
        });
      } else {
        setHoveredTrendSpeed(null);
      }
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema150SeriesRef.current = null;
      ema200SeriesRef.current = null;
      ema4SeriesRef.current = null;
      ema5SeriesRef.current = null;
      upperEnvSeriesRef.current = null;
      lowerEnvSeriesRef.current = null;
      mcdxSeriesRef.current = null;
      bankerMaSeriesRef.current = null;
      rsiAreaSeriesRef.current = null;
      rsiSeriesRef.current = null;
      rsiSignalSeriesRef.current = null;
      trendSpeedHistSeriesRef.current = null;
      markersPluginRef.current = null;
      rsiMarkersPluginRef.current = null;
      mcdxStrikeLineRef.current = null;
      rsiObLineRef.current = null;
      rsiMidLineRef.current = null;
      rsiOsLineRef.current = null;
      smcPrimitiveRef.current = null;
      volumeProfilePrimitiveRef.current = null;
    };
  }, [activeSubPanes, applyPaneLayoutHeights]);

  // Size synchronization on mount, symbol changes, subpane updates, and fullscreen triggers
  useEffect(() => {
    if (!chartRef.current) return;
    const syncSize = () => {
      const container = chartContainerRef.current;
      if (!container || !chartRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        chartRef.current.resize(w, h, true);
        applyPaneLayoutHeights(chartRef.current, indicatorConfig, maximizedPane);
      }
    };

    syncSize();
    const t1 = setTimeout(syncSize, 50);
    const t2 = setTimeout(syncSize, 150);
    const t3 = setTimeout(syncSize, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isFullscreen, symbol, activeContext, activeSubPanes, maximizedPane]);

  // ResizeObserver: actively resize chart canvas and recalculate pane offsets when container resizes
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !chartRef.current) return;

    const updateOffsets = () => {
      const panes = chartRef.current?.panes();
      const containerRect = container.getBoundingClientRect();
      if (!panes || !containerRect) return;

      const newOffsets: Record<number, { top: number; height: number }> = {};
      for (let i = 1; i < panes.length; i++) {
        try {
          const el = panes[i].getHTMLElement();
          if (el) {
            const paneRect = el.getBoundingClientRect();
            newOffsets[i] = {
              top: paneRect.top - containerRect.top,
              height: paneRect.height,
            };
          }
        } catch (e) {}
      }
      setPaneOffsets(newOffsets);
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0 && chartRef.current) {
            chartRef.current.resize(width, height, true);
          }
        }
      }
      requestAnimationFrame(updateOffsets);
    });
    ro.observe(container);

    const panes = chartRef.current?.panes();
    if (panes) {
      panes.forEach(p => {
        try {
          const el = p.getHTMLElement?.();
          if (el) ro.observe(el);
        } catch (e) {}
      });
    }

    let isDraggingSplitter = false;

    const handleSplitterGrab = (e: MouseEvent | PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const cursor = target.style?.cursor || window.getComputedStyle(target).cursor;
      const isSplitter = cursor === 'row-resize' || !!target.closest('tr')?.style?.height.includes('1px');
      if (!isSplitter) return;

      isDraggingSplitter = true;
    };

    const handleSplitterRelease = () => {
      if (!isDraggingSplitter) return;
      isDraggingSplitter = false;

      const currentPanes = chartRef.current?.panes();
      if (!currentPanes || maximizedPane !== null) return;

      if (activeSubPanes.paneMap.mcdx && currentPanes.length > activeSubPanes.paneMap.mcdx) {
        const h = currentPanes[activeSubPanes.paneMap.mcdx].getHTMLElement?.()?.clientHeight;
        if (h && h >= 80 && Math.abs(h - (indicatorConfig.paneHeights?.mcdx || 140)) > 4) {
          useIndicatorStore.getState().setPaneHeight('mcdx', h);
        }
      }
      if (activeSubPanes.paneMap.ultimateRsi && currentPanes.length > activeSubPanes.paneMap.ultimateRsi) {
        const h = currentPanes[activeSubPanes.paneMap.ultimateRsi].getHTMLElement?.()?.clientHeight;
        if (h && h >= 80 && Math.abs(h - (indicatorConfig.paneHeights?.ultimateRsi || 140)) > 4) {
          useIndicatorStore.getState().setPaneHeight('ultimateRsi', h);
        }
      }
      if (activeSubPanes.paneMap.trendSpeed && currentPanes.length > activeSubPanes.paneMap.trendSpeed) {
        const h = currentPanes[activeSubPanes.paneMap.trendSpeed].getHTMLElement?.()?.clientHeight;
        if (h && h >= 80 && Math.abs(h - (indicatorConfig.paneHeights?.trendSpeed || 140)) > 4) {
          useIndicatorStore.getState().setPaneHeight('trendSpeed', h);
        }
      }
      requestAnimationFrame(updateOffsets);
    };

    container.addEventListener('mousedown', handleSplitterGrab, true);
    container.addEventListener('pointerdown', handleSplitterGrab, true);
    window.addEventListener('mouseup', handleSplitterRelease);
    window.addEventListener('pointerup', handleSplitterRelease);

    requestAnimationFrame(updateOffsets);

    return () => {
      ro.disconnect();
      container.removeEventListener('mousedown', handleSplitterGrab, true);
      container.removeEventListener('pointerdown', handleSplitterGrab, true);
      window.removeEventListener('mouseup', handleSplitterRelease);
      window.removeEventListener('pointerup', handleSplitterRelease);
    };
  }, [activeSubPanes, maximizedPane, indicatorConfig.paneHeights]);

  // Current active legend data
  const activeLegend = useMemo(() => {
    if (hoveredBar) return hoveredBar;
    if (aggregatedBars.length > 0) return aggregatedBars[aggregatedBars.length - 1];
    return null;
  }, [hoveredBar, aggregatedBars]);

  const activePercentChange = useMemo(() => {
    if (!activeLegend) return 0;
    if (activeLegend.open > 0) {
      return ((activeLegend.close - activeLegend.open) / activeLegend.open) * 100;
    }
    return 0;
  }, [activeLegend]);

  // Effective Live Real-Time Price: Poller livePrice -> displayBars latest close -> currentPrice
  const effectivePrice = livePrice || (displayBars && displayBars.length > 0 ? displayBars[displayBars.length - 1].close : (currentPrice || 0));

  // Latest EMA 200 & Live Distance
  const lastEma200 = activeLegend?.ema200 ?? (ema200 && ema200.length > 0 ? ema200[ema200.length - 1] : undefined);
  const liveDistEma200 = effectivePrice && lastEma200
    ? Number((((effectivePrice - lastEma200) / lastEma200) * 100).toFixed(2))
    : propDistEma200;

  const tierVisual = useMemo(() => {
    return getTierVisualInfo(
      {
        traffic_light: trafficLight as any,
        badge: badge || '',
        scenario,
        reason_th: reasonTh,
        reason: reasonTh || '',
        currentPrice: effectivePrice,
        ema200: lastEma200,
        distEma200: liveDistEma200,
      } as any,
      symbol
    );
  }, [trafficLight, badge, scenario, reasonTh, symbol, effectivePrice, lastEma200, liveDistEma200]);

  const isCustomHeight = className.includes('h-') || className.includes('flex-1');
  const defaultHeightClass = isCustomHeight ? '' : 'h-[650px] min-h-[500px]';

  return (
    <div
      className={`relative flex flex-col bg-[#0A0E17] ${isMobile ? 'border-0 rounded-none' : 'border border-slate-800/80 rounded-2xl'} overflow-hidden shadow-2xl transition-all select-none ${
        isFullscreen && !document.fullscreenElement
          ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none border-none p-4'
          : `w-full ${defaultHeightClass} ${className}`
      }`}
      style={{ fontFamily: TV_FONT_FAMILY }}
    >
      {/* 5. EXTRACTED COMPONENT: Top Master Controls Bar */}
      <ChartControlBar
        isMobile={isMobile}
        symbol={symbol}
        currentPrice={currentPrice}
        livePrice={livePrice}
        activePercentChange={activePercentChange}
        isLiveActive={isLiveActive}
        isMarketOpen={isMarketOpen}
        badge={badge}
        resolution={resolution}
        setResolution={setResolution}
        canShow4H={canShow4H}
        chartStyle={chartStyle}
        setChartStyle={setChartStyle}
        isIndicatorOpen={isIndicatorOpen}
        setIsIndicatorOpen={setIsIndicatorOpen}
        indicatorInitialView={indicatorInitialView}
        setIndicatorInitialView={setIndicatorInitialView}
        indicatorConfig={indicatorConfig}
        timeframe={timeframe}
        applyTimeframeRange={applyTimeframeRange}
        onAddInflow={onAddInflow}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        hasPosition={!!holding && holding.quantity > 0}
      />

      {/* Tactical Cyber Cockpit HUD Capsule (Layer 2: Cyber HUD) */}
      {(() => {
        const tier = getTierMetadata(trafficLight);

        // Dynamic Tier Glow & Capsule Background Theme
        let capsuleBorder = 'border-slate-700/70';
        let capsuleGlow = 'shadow-[0_0_18px_rgba(15,23,42,0.6)]';
        let capsuleBg = 'bg-gradient-to-r from-[#0F172A]/95 via-[#131D33]/90 to-[#0F172A]/95';
        let pingColor = 'bg-slate-300';
        let pingGlow = 'bg-slate-400';

        if (tier.id === 'TO_THE_MOON') {
          capsuleBorder = 'border-purple-500/60';
          capsuleGlow = 'shadow-[0_0_25px_rgba(168,85,247,0.35)]';
          capsuleBg = 'bg-gradient-to-r from-[#1e0e35]/95 via-[#131D33]/90 to-[#0F172A]/95';
          pingColor = 'bg-purple-300';
          pingGlow = 'bg-purple-400';
        } else if (tier.id === 'BUY_NOW') {
          capsuleBorder = 'border-emerald-500/60';
          capsuleGlow = 'shadow-[0_0_25px_rgba(16,185,129,0.35)]';
          capsuleBg = 'bg-gradient-to-r from-[#0d2a1f]/95 via-[#131D33]/90 to-[#0F172A]/95';
          pingColor = 'bg-emerald-300';
          pingGlow = 'bg-emerald-400';
        } else if (tier.id === 'BUY_ZONE') {
          capsuleBorder = 'border-cyan-500/60';
          capsuleGlow = 'shadow-[0_0_25px_rgba(6,182,212,0.35)]';
          capsuleBg = 'bg-gradient-to-r from-[#0c2633]/95 via-[#131D33]/90 to-[#0F172A]/95';
          pingColor = 'bg-cyan-300';
          pingGlow = 'bg-cyan-400';
        } else if (tier.id === 'GET_READY') {
          capsuleBorder = 'border-amber-500/60';
          capsuleGlow = 'shadow-[0_0_25px_rgba(245,158,11,0.35)]';
          capsuleBg = 'bg-gradient-to-r from-[#2a1d08]/95 via-[#131D33]/90 to-[#0F172A]/95';
          pingColor = 'bg-amber-300';
          pingGlow = 'bg-amber-400';
        } else if (tier.id === 'MAYDAY_EXIT' || tier.id === 'FALLING_KNIFE' || tier.id === 'DANGER' || tier.id === 'SLOW_BLEED') {
          capsuleBorder = 'border-rose-500/70';
          capsuleGlow = 'shadow-[0_0_25px_rgba(244,63,94,0.45)] animate-pulse';
          capsuleBg = 'bg-gradient-to-r from-[#330f14]/95 via-[#131D33]/90 to-[#0F172A]/95';
          pingColor = 'bg-rose-300';
          pingGlow = 'bg-rose-400';
        }

        // Banker calculations
        const bVal = Number(activeLegend?.banker ?? (bankerSeries && bankerSeries.length > 0 ? bankerSeries[bankerSeries.length - 1] : (banker ?? 0)));
        const isHighBanker = bVal >= 10;
        const bankerPct = Math.min(100, Math.max(0, (bVal / 20) * 100));

        // EMA 9 calculation
        let ema9Cur: number | null = null;
        let ema9Dist: number = 0;
        let isEma9Above: boolean = false;
        if (closes && closes.length >= 9) {
          const k = 2 / (9 + 1);
          let sum = 0;
          for (let i = 0; i < 9; i++) sum += closes[i];
          let cur = sum / 9;
          for (let i = 9; i < closes.length; i++) {
            cur = closes[i] * k + cur * (1 - k);
          }
          ema9Cur = cur;
          ema9Dist = effectivePrice ? Number((((effectivePrice - cur) / cur) * 100).toFixed(2)) : 0;
          isEma9Above = effectivePrice >= cur;
        }

        return (
          <div className={`relative mx-2 my-1.5 px-3 py-1.5 rounded-xl border ${capsuleBorder} ${capsuleGlow} ${capsuleBg} backdrop-blur-md transition-all duration-300 flex items-center gap-3 select-none overflow-x-auto scrollbar-none font-mono text-[13px] z-10`}>
            {/* Corner Tech Brackets */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-white/25 rounded-tl pointer-events-none" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-white/25 rounded-tr pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-white/25 rounded-bl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-white/25 rounded-br pointer-events-none" />

            {/* POD 1: Command & Signal Action with Holographic Preflight Hover Card */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Holographic Scenario Preflight Hover Card */}
              <ScenarioPreflightCard
                scenario={scenario}
                badge={badge}
                trafficLight={trafficLight}
                regime={regime}
                reasonTh={reasonTh}
                signalsChecklist={signalsChecklist}
                distEma200={liveDistEma200}
                distEma9={ema9Dist}
                isAboveEma9={isEma9Above}
                banker={bVal}
                currentPrice={effectivePrice}
                ema200Price={lastEma200 ?? undefined}
                ema9Price={ema9Cur ?? undefined}
                onHoverPriceLevel={handleHoverPriceLevel}
              >
                <div className="flex items-center gap-2 group">
                  {/* Action Signal Badge with Embedded Live Pulse Ping */}
                  <div className={`px-2.5 py-0.5 rounded-lg text-xs font-black inline-flex items-center gap-1.5 shadow-md border ${tier.badgeClass} ${tier.borderClass} ${tier.glowClass} group-hover:scale-105 transition-transform duration-200`}>
                    {/* Embedded Live Pulse Ping */}
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingGlow}`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${pingColor}`} />
                    </span>
                    <span className={tier.animClass}>{tier.icon}</span>
                    <span className="tracking-wide">{tier.label}</span>
                  </div>

                  {/* Scenario Pill */}
                  <div className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-950/80 border border-slate-700/80 text-slate-200 tracking-wide shrink-0 flex items-center gap-1 group-hover:border-slate-500 group-hover:bg-slate-900 transition-all duration-200">
                    <span>{badge ? `${badge} • S${scenario || 1}` : `SCENARIO ${scenario || 1}`}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-amber-300">▼</span>
                  </div>
                </div>
              </ScenarioPreflightCard>
            </div>

            {/* Vertical Divider */}
            <div className="h-4 w-[1px] bg-white/20 shrink-0" />

            {/* POD 2: Market Regime & Institutional Flow */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Regime Chip */}
              {regime === 'BULL' && (
                <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-purple-950/80 text-purple-200 border border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.3)] flex items-center gap-1 shrink-0">
                  👑 BULL REGIME
                </span>
              )}
              {regime === 'BEAR' && (
                <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-rose-950/80 text-rose-200 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] flex items-center gap-1 shrink-0">
                  ⚠️ BEAR REGIME
                </span>
              )}
              {(!regime || regime === 'NEUTRAL') && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-900/90 text-slate-300 border border-slate-700/70 shrink-0">
                  NEUTRAL REGIME
                </span>
              )}

              {/* Banker Flow Meter with Mini Gauge */}
              <div className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold flex items-center gap-2 border bg-black/40 shrink-0 ${
                isHighBanker ? 'border-amber-500/50 text-amber-300' : 'border-slate-800 text-slate-300'
              }`}>
                <span className="text-slate-300">Banker:</span>
                <strong className={isHighBanker ? 'text-amber-300 font-extrabold' : 'text-slate-200'}>
                  {bVal.toFixed(1)}
                </strong>
                <span className="text-slate-400">/20</span>
                {/* Mini Power Gauge */}
                <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/10 shrink-0">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      isHighBanker 
                        ? 'bg-gradient-to-r from-amber-500 to-emerald-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${bankerPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-4 w-[1px] bg-white/20 shrink-0 hidden md:block" />

            {/* POD 3: Tactical Directive (Thai Rationale with Live Distance Sync) */}
            {(() => {
              const liveReasonDirective = reasonTh && liveDistEma200 !== undefined && /(-?\d+\.\d+)%/.test(reasonTh)
                ? reasonTh.replace(/(-?\d+\.\d+)%/, `${liveDistEma200 >= 0 ? '+' : ''}${liveDistEma200.toFixed(2)}%`)
                : reasonTh;
              return liveReasonDirective ? (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-black/35 border border-white/10 text-xs text-slate-200 font-sans truncate max-w-[340px] xl:max-w-[440px] shrink-0" title={liveReasonDirective}>
                  <span className="text-amber-300 shrink-0">💡</span>
                  <span className="truncate">{liveReasonDirective}</span>
                </div>
              ) : null;
            })()}

            {/* EMA 9 Lock Status (Far Right) */}
            {ema9Cur !== null && (
              <div className={`ml-auto shrink-0 font-bold flex items-center gap-2 px-2.5 py-0.5 rounded-md border text-xs ${
                isEma9Above 
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]' 
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
              }`}>
                <span className="text-slate-300 font-normal">EMA 9:</span>
                <span className="font-mono text-slate-100">${ema9Cur.toFixed(2)}</span>
                <span className="font-medium tracking-tight">
                  ({ema9Dist >= 0 ? `+${ema9Dist}%` : `${ema9Dist}%`} {isEma9Above ? 'Unlocked ⚡' : 'Locked 🔒'})
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* 6. EXTRACTED COMPONENT: Real-Time Floating Legend Strip */}
      {!isMobile && (
        <ChartLegendBar
          activeLegend={activeLegend}
          activePercentChange={activePercentChange}
          indicatorConfig={indicatorConfig}
          superMoneySignalResult={superMoneySignalResult}
          rsiDataByDate={rsiDataByDate}
          trendSpeedDataByDate={trendSpeedDataByDate}
        />
      )}

      {/* MAIN BODY: CHART CANVAS + FULLSCREEN WATCHLIST SIDEBAR */}
      <div className="relative flex-1 flex overflow-hidden min-h-0 w-full h-full">
        {/* Left Drawing Toolbar */}
        {!isMobile && viewProfile.showDrawingToolbar && (
          <LeftDrawingToolbar symbol={symbol} bars={displayBars} chartContext={activeContext} />
        )}

        {/* Chart Canvas Container + Floating Pane Toolbars */}
        <div className="relative flex-1 w-full h-full min-h-0">
          <div ref={chartContainerRef} className="w-full h-full min-h-0" />

          {/* In-Canvas Indicator Legend Overlay (Main Pane 0) */}
          {!isMobile && (
            <MainPaneIndicatorLegend
              indicatorConfig={indicatorConfig}
              activeLegend={activeLegend}
              tierVisual={tierVisual}
              distEma200={liveDistEma200}
              superMoneySignalResult={superMoneySignalResult}
              trendSpeedData={
                hoveredTrendSpeed ||
                (activeLegend ? trendSpeedDataByDate.get(activeLegend.time) : null)
              }
              autoSRCount={visibleDrawings.length}
              autoSRLocked={visibleDrawings.some((d) => d.locked)}
              globalDrawingsVisible={viewProfile.showDrawings}
              onToggleEMA={(key) => {
                if (activeContext === 'project2x') {
                  useChartViewStore.getState().toggleVisibility('project2x', 'showEMA');
                } else {
                  useIndicatorStore.getState().toggleEMA(key);
                }
              }}
              onToggleAllEMA={(visible) => {
                if (activeContext === 'project2x') {
                  useChartViewStore.getState().toggleVisibility('project2x', 'showEMA');
                } else {
                  useIndicatorStore.getState().toggleAllEMA(visible);
                }
              }}
              onToggleEnvelope={() => {
                if (activeContext === 'project2x') {
                  useChartViewStore.getState().toggleVisibility('project2x', 'showEnvelope');
                } else {
                  useIndicatorStore.getState().toggleEnvelope();
                }
              }}
              onToggleTrendSpeedDyn={() => {
                if (activeContext === 'project2x') {
                  useChartViewStore.getState().toggleVisibility('project2x', 'showTrendSpeed');
                } else {
                  const cur = indicatorConfig.trendSpeed?.dynamicTrendVisible ?? true;
                  useIndicatorStore.getState().updateTrendSpeed({ dynamicTrendVisible: !cur });
                }
              }}
              onToggleSuperMoneySignal={() => {
                if (activeContext === 'project2x') {
                  useChartViewStore.getState().toggleVisibility('project2x', 'showSignals');
                } else {
                  useIndicatorStore.getState().toggleSuperMoneySignal();
                }
              }}
              onToggleAnchoredVWAP={() => {
                if (activeContext === 'project2x') {
                  useChartViewStore.getState().toggleVisibility('project2x', 'showVWAP');
                } else {
                  useIndicatorStore.getState().toggleAnchoredVWAP();
                }
              }}
              onToggleVolumeProfile={() => {
                if (activeContext === 'project2x') {
                  useChartViewStore.getState().toggleVisibility('project2x', 'showVolumeProfile');
                } else {
                  useIndicatorStore.getState().toggleVolumeProfile();
                }
              }}
              onToggleAutoSR={() => {
                if (activeContext === 'project2x') {
                  useChartViewStore.getState().toggleVisibility('project2x', 'showDrawings');
                } else {
                  useDrawingStore.getState().toggleGlobalVisibility();
                }
              }}
              onToggleAutoSRLock={() => {
                const store = useDrawingStore.getState();
                const currentDrawings = store.getDrawings(symbol);
                const anyLocked = currentDrawings.some((d) => d.locked);
                const nextLocked = !anyLocked;
                currentDrawings.forEach((d) => store.updateLine(symbol, d.id, { locked: nextLocked }));
                store.setToastNotification(
                  nextLocked
                    ? '🔒 ล็อคตำแหน่งเส้นแนวรับ-แนวต้านทั้งหมดแล้ว'
                    : '🔓 ปลดล็อคเส้นทั้งหมดแล้ว — ลากปรับราคาได้อิสระ'
                );
                setTimeout(() => {
                  if (useDrawingStore.getState().toastNotification?.includes('เส้น')) {
                    useDrawingStore.getState().setToastNotification(null);
                  }
                }, 2500);
              }}
              onOpenConfig={(view) => {
                setIndicatorInitialView(view);
                setIsIndicatorOpen(true);
              }}
            />
          )}

          {/* In-Canvas Live Indicator Badge (EMA 200 Anchor Pill with Status Icon) */}
          {!isMobile && (
            <LiveEMAIndicatorBadge
              chartRef={chartRef}
              ema200SeriesRef={ema200SeriesRef}
              containerRef={chartContainerRef}
              displayBars={displayBars}
              effectivePrice={effectivePrice}
              lastEma200={lastEma200}
              distEma200={liveDistEma200}
              tierVisual={tierVisual}
              visible={(indicatorConfig.liveBadge?.visible !== false) && indicatorConfig.ema3.visible && viewProfile.showEMA}
              liveBadgeConfig={indicatorConfig.liveBadge}
            />
          )}

          {/* In-Canvas Live Target Consensus Badge */}
          {!isMobile && (
            <LiveConsensusBadge
              chartRef={chartRef}
              seriesRef={candleSeriesRef}
              containerRef={chartContainerRef}
              displayBars={displayBars}
              effectivePrice={effectivePrice}
              targetMean={analystConsensus?.targetMean}
              recommendationKey={analystConsensus?.recommendationKey}
              analystOpinionsCount={analystConsensus?.analystOpinionsCount}
              visible={Boolean(indicatorConfig.targetConsensus?.visible)}
              config={indicatorConfig.targetConsensus}
            />
          )}

          {/* Real-time Price Alert Banner */}
          {!isMobile && <DrawingAlertBanner />}

          {/* Price Range Ruler (Shift+Drag Measure Tool) */}
          {rulerState && (
            <PriceRangeRuler
              startPoint={rulerState.startPoint}
              currentPoint={rulerState.currentPoint}
              onDismiss={() => setRulerState(null)}
            />
          )}

          {/* In-Canvas Micro-Badges */}
          {!isMobile && (
            <DrawingInCanvasBadges
              drawings={visibleDrawings}
              candleSeries={candleSeriesRef.current}
              chart={chartRef.current}
              selectedLineId={selectedLineId}
              onSelectLine={(id) => useDrawingStore.getState().selectLine(id)}
              onOpenProperties={(id) => setPropertiesModalLineId(id)}
              onContextMenu={(line, pos) => setContextMenuData({ line, position: pos })}
              chartContainer={chartContainerRef.current}
              symbol={symbol}
              onStartDragLine={(id, price) => {
                chartRef.current?.applyOptions({ handleScroll: false, handleScale: false });
                isDraggingLineRef.current = { lineId: id, startPrice: price };
                useDrawingStore.getState().selectLine(id);
              }}
            />
          )}

          {/* Anchored VWAP Interactive Canvas Drag & Drop Handle */}
          {!isMobile && (
            <AnchoredVWAPHandle
              chart={chartRef.current}
              candleSeries={candleSeriesRef.current}
              displayBars={displayBars}
              anchoredVWAPResult={anchoredVWAPResult}
              indicatorConfig={indicatorConfig}
              chartContainer={chartContainerRef.current}
            />
          )}

          {/* Auto S/R Toast Notification */}
          {toastNotification && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 bg-[#1E222D]/95 border border-amber-500/60 text-amber-300 rounded-lg shadow-xl text-[13px] font-medium backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 select-none">
              <span>{toastNotification}</span>
            </div>
          )}

          {/* Magnet Target Snapping Indicator */}
          {magnetIndicator && (
            <div
              style={{ left: `${magnetIndicator.x + 12}px`, top: `${magnetIndicator.y - 12}px` }}
              className="pointer-events-none absolute z-40 px-2 py-0.5 bg-emerald-600/90 text-white rounded text-[13px] font-mono font-bold shadow-lg border border-emerald-400/80 flex items-center gap-1.5 animate-in fade-in duration-75"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-ping" />
              <span>🧲 {magnetIndicator.text}</span>
            </div>
          )}

          {/* Floating Action Toolbar for selected horizontal line */}
          {selectedDrawing && (
            <LineFloatingToolbar
              line={selectedDrawing}
              symbol={symbol}
              yPosition={selectedLineY}
              touchCount={countTouches(selectedDrawing.price, displayBars)}
              onOpenSettings={(id) => setPropertiesModalLineId(id)}
            />
          )}

          {/* Right-click Context Menu */}
          {contextMenuData && (
            <LineContextMenu
              line={contextMenuData.line}
              symbol={symbol}
              position={contextMenuData.position}
              onClose={() => setContextMenuData(null)}
              onOpenSettings={(id) => setPropertiesModalLineId(id)}
            />
          )}

          {/* Properties Dialog Modal */}
          {propertiesModalLineId && (() => {
            const line = drawings.find((d) => d.id === propertiesModalLineId);
            return line ? (
              <LinePropertiesDialog
                line={line}
                symbol={symbol}
                onClose={() => setPropertiesModalLineId(null)}
              />
            ) : null;
          })()}

          {/* MCDX Floating Toolbar */}
          {!isMobile && indicatorConfig.mcdx.visible && activeSubPanes.paneMap.mcdx && paneOffsets[activeSubPanes.paneMap.mcdx] && (
            <SubPaneHeaderToolbar
              paneIndex={activeSubPanes.paneMap.mcdx}
              title="MCDX"
              top={paneOffsets[activeSubPanes.paneMap.mcdx].top}
              isVisible={true}
              isMaximized={maximizedPane === activeSubPanes.paneMap.mcdx}
              liveValues={
                activeLegend
                  ? {
                      Banker: { value: activeLegend.banker.toFixed(1), color: indicatorConfig.mcdx.bankerColor || '#F87171' },
                      Hot: { value: activeLegend.hotMoney.toFixed(1), color: indicatorConfig.mcdx.hotMoneyColor || '#FFF176' },
                      Retail: { value: activeLegend.retail.toFixed(1), color: indicatorConfig.mcdx.retailColor || '#66BB6A' },
                      'B.MA': { value: activeLegend.bankerMa.toFixed(1), color: indicatorConfig.mcdx.maColor || '#FFFFFF' },
                    }
                  : {}
              }
              onToggleVisibility={() => useIndicatorStore.getState().toggleMCDX()}
              onOpenSettings={() => {
                setIndicatorInitialView('mcdx');
                setIsIndicatorOpen(true);
              }}
              onMoveUp={() => useIndicatorStore.getState().moveIndicatorUp('mcdx')}
              onMoveDown={() => useIndicatorStore.getState().moveIndicatorDown('mcdx')}
              onToggleMaximize={() => setMaximizedPane(prev => prev === activeSubPanes.paneMap.mcdx ? null : activeSubPanes.paneMap.mcdx)}
              onRemove={() => useIndicatorStore.getState().toggleMCDX()}
            />
          )}

          {/* Ultimate RSI Floating Toolbar */}
          {!isMobile && indicatorConfig.ultimateRsi.visible && activeSubPanes.paneMap.ultimateRsi && paneOffsets[activeSubPanes.paneMap.ultimateRsi] && (
            <SubPaneHeaderToolbar
              paneIndex={activeSubPanes.paneMap.ultimateRsi}
              title="Ultimate RSI"
              top={paneOffsets[activeSubPanes.paneMap.ultimateRsi].top}
              isVisible={true}
              isMaximized={maximizedPane === activeSubPanes.paneMap.ultimateRsi}
              liveValues={
                hoveredRsi
                  ? {
                      ARSI: {
                        value: hoveredRsi.arsi !== null ? hoveredRsi.arsi.toFixed(2) : '--',
                        color:
                          hoveredRsi.arsi !== null && hoveredRsi.arsi >= indicatorConfig.ultimateRsi.obValue
                            ? indicatorConfig.ultimateRsi.obColor
                            : hoveredRsi.arsi !== null && hoveredRsi.arsi <= indicatorConfig.ultimateRsi.osValue
                            ? indicatorConfig.ultimateRsi.osColor
                            : indicatorConfig.ultimateRsi.rsiColor || '#26A69A',
                      },
                      Sig: {
                        value: hoveredRsi.signal !== null ? hoveredRsi.signal.toFixed(2) : '--',
                        color: indicatorConfig.ultimateRsi.signalColor,
                      },
                    }
                  : {}
              }
              onToggleVisibility={() => useIndicatorStore.getState().toggleUltimateRSI()}
              onOpenSettings={() => {
                setIndicatorInitialView('ultimateRsi');
                setIsIndicatorOpen(true);
              }}
              onMoveUp={() => useIndicatorStore.getState().moveIndicatorUp('ultimateRsi')}
              onMoveDown={() => useIndicatorStore.getState().moveIndicatorDown('ultimateRsi')}
              onToggleMaximize={() => setMaximizedPane(prev => prev === activeSubPanes.paneMap.ultimateRsi ? null : activeSubPanes.paneMap.ultimateRsi)}
              onRemove={() => useIndicatorStore.getState().toggleUltimateRSI()}
            />
          )}

          {/* Trend Speed Floating Toolbar */}
          {!isMobile && indicatorConfig.trendSpeed?.visible && activeSubPanes.paneMap.trendSpeed && paneOffsets[activeSubPanes.paneMap.trendSpeed] && (
            <SubPaneHeaderToolbar
              paneIndex={activeSubPanes.paneMap.trendSpeed}
              title="Trend Speed Analyzer (Zeiierman)"
              subtitle={`${indicatorConfig.trendSpeed?.maxLength ?? 50} ${indicatorConfig.trendSpeed?.accelMultiplier ?? 0.01} ${indicatorConfig.trendSpeed?.lookbackPeriod ?? 150} ${indicatorConfig.trendSpeed?.collectionPeriod ?? 100} From start`}
              top={paneOffsets[activeSubPanes.paneMap.trendSpeed].top}
              isVisible={true}
              isMaximized={maximizedPane === activeSubPanes.paneMap.trendSpeed}
              hideLabels={true}
              liveValues={(() => {
                const tsData = hoveredTrendSpeed || (activeLegend ? trendSpeedDataByDate.get(activeLegend.time) : null);
                const bar = hoveredBar || activeLegend;
                if (!tsData || !bar) return {};

                const dynVal = tsData.dynEma !== null && tsData.dynEma !== undefined
                  ? tsData.dynEma.toFixed(3)
                  : '--';
                const speedVal = tsData.speed !== null && tsData.speed !== undefined
                  ? tsData.speed.toFixed(3)
                  : '--';

                return {
                  dynEma: { value: dynVal, color: tsData.dynColor || '#F7D02C' },
                  speed: { value: speedVal, color: tsData.color || '#F7D02C' },
                  open: { value: bar.open.toFixed(3), color: tsData.color || '#F7D02C' },
                  high: { value: bar.high.toFixed(3), color: tsData.color || '#F7D02C' },
                  low: { value: bar.low.toFixed(3), color: tsData.color || '#F7D02C' },
                  close: { value: bar.close.toFixed(3), color: tsData.color || '#F7D02C' },
                };
              })()}
              onToggleVisibility={() => useIndicatorStore.getState().toggleTrendSpeed()}
              onOpenSettings={() => {
                setIndicatorInitialView('trendSpeed');
                setIsIndicatorOpen(true);
              }}
              onMoveUp={() => useIndicatorStore.getState().moveIndicatorUp('trendSpeed')}
              onMoveDown={() => useIndicatorStore.getState().moveIndicatorDown('trendSpeed')}
              onToggleMaximize={() => setMaximizedPane(prev => prev === activeSubPanes.paneMap.trendSpeed ? null : activeSubPanes.paneMap.trendSpeed)}
              onRemove={() => useIndicatorStore.getState().toggleTrendSpeed()}
            />
          )}

          {/* Dominance Statistics Floating Table */}
          {!isMobile && (
            <DominanceTableOverlay
              trendSpeedResult={trendSpeedResult}
              indicatorConfig={indicatorConfig}
            />
          )}

          {/* Contextual Floating Position HUD (Heads-Up Display) */}
          {!isMobile && holding && holding.quantity > 0 && viewProfile.showHUD && (
            <ChartPositionHUD
              symbol={symbol}
              holding={holding}
              blueprint={blueprint}
              containerRef={chartContainerRef}
              onOpenHoldingDrawer={onOpenHoldingDrawer}
              currency={currency}
              exchangeRate={exchangeRate}
              chartContext={activeContext}
            />
          )}
        </div>

        {/* Right: Quick Watchlist Sidebar */}
        {isFullscreen && watchlist.length > 0 && (
          <div className="w-72 border-l border-slate-800/80 bg-slate-950/60 backdrop-blur-md p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-slate-200">QUICK WATCHLIST</span>
              <span className="text-[13px] font-semibold text-slate-400">{watchlist.length} Stocks</span>
            </div>

            <div className="flex flex-col gap-2">
              {watchlist.map((item) => {
                const isSelected = item.symbol === symbol;
                const itemTier = getTierMetadata(item.traffic_light);

                return (
                  <button
                    key={item.symbol}
                    onClick={() => onSelectSymbol?.(item.symbol)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                        : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-100 text-sm">{item.symbol}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-black flex items-center gap-1 ${itemTier.badgeClass}`}>
                          <span className={itemTier.animClass}>{itemTier.icon}</span>
                          <span>{itemTier.label}</span>
                        </span>
                      </div>
                      <div className="text-[13px] text-slate-300 font-semibold mt-0.5">
                        ${item.currentPrice.toFixed(2)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-xs font-bold ${
                          (item.percent_change ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {(item.percent_change ?? 0) >= 0 ? '+' : ''}
                        {(item.percent_change ?? 0).toFixed(2)}%
                      </div>
                      <div className="text-[13px] font-bold text-rose-400">
                        B: {(item.banker ?? 0).toFixed(1)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
