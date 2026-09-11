import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  AreaSeries,
  LineSeries,
  BaselineSeries,
  HistogramSeries,
  createSeriesMarkers,
  ColorType,
  CrosshairMode,
  LineStyle,
  Time,
  UTCTimestamp,
  SeriesMarker,
  SeriesMarkerShape,
  IPriceLine,
} from 'lightweight-charts';
import {
  Activity,
  Zap,
  RotateCcw,
  Maximize2,
  Minimize2,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  Check,
  Flame,
  Sliders,
} from 'lucide-react';
import { api } from '../../services/api';
import { BankerMCDXSeriesView, BankerMCDXData } from './BankerMCDXPlugin';
import { useIndicatorStore } from '../../stores/useIndicatorStore';
import { useUiStore } from '../../stores/uiStore';
import { computeEMA } from '../../utils/computeEMA';
import { computeUltimateRSI } from '../../utils/indicators/ultimateRSI';
import { computeTrendSpeed, TrendSpeedResult } from '../../utils/indicators/trendSpeed';
import { computeSMCLite, SMCResult } from '../../utils/indicators/smcLite';
import { SMCPrimitive } from '../../utils/indicators/smcPrimitive';
import { computeAnchoredVWAP, AnchoredVWAPResult } from '../../utils/indicators/anchoredVWAP';
import { computeSuperMoneySignal, SuperMoneySignalResult } from '../../utils/indicators/superMoneySignal';
import { IndicatorManagerPopover } from '../xchart/IndicatorManagerPopover';
import { SubPaneHeaderToolbar } from '../xchart/panes/SubPaneHeaderToolbar';
import {
  LineStyleOption,
  RSIMarkerShape,
  RSIMarkerLocation,
  IndicatorSettings,
  SubPaneIndicatorId,
} from '../../types/indicatorConfig';
import { useDrawingStore } from '../../stores/drawingStore';
import { LeftDrawingToolbar } from './drawings/LeftDrawingToolbar';
import { LineFloatingToolbar } from './drawings/LineFloatingToolbar';
import { LinePropertiesDialog } from './drawings/LinePropertiesDialog';
import { LineContextMenu } from './drawings/LineContextMenu';
import { DrawingAlertBanner } from './drawings/DrawingAlertBanner';
import {
  hitTestLines,
  snapToCandleOHLC,
  snapToOHLC,
  snapToTickSize,
  countTouches,
} from '../../utils/drawingUtils';
import { triggerPriceAlert } from '../../utils/drawingAlerts';

export const TV_FONT_FAMILY = "'Trebuchet MS', 'Segoe UI Symbol', 'Segoe UI Emoji', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const getChartLineStyle = (opt: LineStyleOption): LineStyle => {
  switch (opt) {
    case 'Dashed': return LineStyle.Dashed;
    case 'Dotted': return LineStyle.Dotted;
    case 'Solid':
    default: return LineStyle.Solid;
  }
};

const formatBarTime = (t: string): Time => {
  if (t && t.includes('T')) {
    return Math.floor(new Date(t).getTime() / 1000) as UTCTimestamp;
  }
  return t as Time;
};

export interface WatchlistStock {
  symbol: string;
  currentPrice: number;
  percent_change?: number;
  banker?: number;
  traffic_light?: 'BUY_ZONE' | 'WAIT' | 'DANGER';
}

export interface LWChartProps {
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
  scenario?: number;
  badge?: string;
  trafficLight?: 'BUY_ZONE' | 'WAIT' | 'DANGER';
  distEma150?: number;
  distEma200?: number;
  className?: string;
  onAddInflow?: () => void;
  watchlist?: WatchlistStock[];
  onSelectSymbol?: (symbol: string) => void;
  resolution?: Resolution;
  onResolutionChange?: (res: Resolution) => void;
}

export type TimeFrame = '7D' | '1M' | '3M' | '6M' | '10M' | '1Y' | '5Y' | 'ALL';
export type ChartStyle = 'CANDLE' | 'HEIKIN_ASHI' | 'AREA';
export type Resolution = '4H' | '1D' | '1W';

interface RawBarItem {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema50: number | null;
  ema150: number | null;
  ema200: number | null;
  banker: number;
  hotMoney: number;
  retail: number;
  bankerMa: number;
}

// US market hours check: Mon-Fri, 9:30 AM to 4:00 PM US Eastern Time (UTC-4 / EDT or UTC-5 / EST)
const isUsMarketOpen = (): boolean => {
  try {
    const now = new Date();
    const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const nyDate = new Date(nyTimeStr);
    const day = nyDate.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) return false;
    const hours = nyDate.getHours();
    const minutes = nyDate.getMinutes();
    const totalMins = hours * 60 + minutes;
    // 9:30 AM = 570 mins, 4:00 PM = 960 mins
    return totalMins >= 570 && totalMins <= 960;
  } catch (e) {
    return false;
  }
};

function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length >= 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export const LWChart: React.FC<LWChartProps> = ({
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
  banker = 0,
  currentPrice,
  scenario = 1,
  badge = 'Setup',
  trafficLight = 'BUY_ZONE',
  distEma150 = 0,
  distEma200 = 0,
  className = '',
  onAddInflow,
  watchlist = [],
  onSelectSymbol,
  resolution: propResolution,
  onResolutionChange,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Series references
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema150SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const upperEnvSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lowerEnvSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const mcdxSeriesRef = useRef<ISeriesApi<'Custom'> | null>(null);
  const bankerMaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiAreaSeriesRef = useRef<ISeriesApi<'Baseline'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSignalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const dynTrendSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const trendSpeedHistSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smcFastSmaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const smcSlowSmaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const smcPrimitiveRef = useRef<SMCPrimitive | null>(null);
  const anchoredVwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const anchoredUpperBandSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const anchoredLowerBandSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const markersPluginRef = useRef<any>(null);
  const rsiMarkersPluginRef = useRef<any>(null);
  const mcdxStrikeLineRef = useRef<IPriceLine | null>(null);
  const rsiObLineRef = useRef<IPriceLine | null>(null);
  const rsiMidLineRef = useRef<IPriceLine | null>(null);
  const rsiOsLineRef = useRef<IPriceLine | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastYRef = useRef<number>(0);

  // States with localStorage persistence
  const [timeframe, setTimeframe] = useState<TimeFrame>(() => {
    try {
      const saved = localStorage.getItem('p2x_lw_timeframe');
      if (saved && ['7D', '1M', '3M', '6M', '10M', '1Y', '5Y', 'ALL'].includes(saved)) {
        return saved as TimeFrame;
      }
    } catch (e) {}
    return '10M';
  });

  const [chartStyle, setChartStyle] = useState<ChartStyle>(() => {
    try {
      const saved = localStorage.getItem('p2x_lw_style');
      if (saved === 'CANDLE' || saved === 'HEIKIN_ASHI' || saved === 'AREA') return saved;
    } catch (e) {}
    return 'CANDLE';
  });

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
  const indicatorConfig = useIndicatorStore((s) => s.config);
  const paneLayout = indicatorConfig.paneLayout || { assignments: { mcdx: 1, ultimateRsi: 2, trendSpeed: 3 } };

  // Calculate dynamic active sub-panes: ONLY visible indicators get allocated panes!
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
  const [indicatorInitialView, setIndicatorInitialView] = useState<'list' | 'mcdx' | 'ultimateRsi' | 'trendSpeed'>('list');

  // Synchronized multi-pane stretch layout calculation
  const applyPaneLayoutHeights = useCallback((
    chartInstance: any,
    cfg: IndicatorSettings,
    maximized: number | null
  ) => {
    if (!chartInstance) return;
    const panes = chartInstance.panes?.();
    if (!panes || panes.length === 0) return;

    const containerH = chartContainerRef.current?.clientHeight || 650;

    if (panes.length < 2) {
      // Only main chart pane exists (all subpanes closed)
      if (panes[0]?.setStretchFactor) panes[0].setStretchFactor(containerH);
      return;
    }

    if (maximized !== null) {
      // Maximized mode: target subpane takes most of the height, main chart keeps 60px
      const mainH = 60;
      const subMaxH = Math.max(200, containerH - mainH);
      if (panes[0]?.setStretchFactor) panes[0].setStretchFactor(mainH);
      for (let i = 1; i < panes.length; i++) {
        if (panes[i]?.setStretchFactor) {
          panes[i].setStretchFactor(maximized === i ? subMaxH : 0);
        }
      }
    } else {
      let subpanesSum = 0;
      const heights: number[] = [];

      for (let i = 1; i < panes.length; i++) {
        let targetH = 140;
        if (activeSubPanes.paneMap.mcdx === i) {
          targetH = Math.max(80, cfg.paneHeights?.mcdx || 140);
        } else if (activeSubPanes.paneMap.ultimateRsi === i) {
          targetH = Math.max(80, cfg.paneHeights?.ultimateRsi || 140);
        } else if (activeSubPanes.paneMap.trendSpeed === i) {
          targetH = Math.max(80, cfg.paneHeights?.trendSpeed || 140);
        }
        heights[i] = targetH;
        subpanesSum += targetH;
      }

      const mainH = Math.max(120, containerH - subpanesSum);
      if (panes[0]?.setStretchFactor) panes[0].setStretchFactor(mainH);
      for (let i = 1; i < panes.length; i++) {
        if (panes[i]?.setStretchFactor) {
          panes[i].setStretchFactor(heights[i]);
        }
      }
    }
  }, [activeSubPanes]);

  // Live Pulse state
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(isUsMarketOpen());
  const [livePrice, setLivePrice] = useState<number>(currentPrice);
  const [liveChangePercent, setLiveChangePercent] = useState<number>(0);

  // Hover Crosshair Legend data
  const [hoveredBar, setHoveredBar] = useState<RawBarItem | null>(null);
  // Hover RSI values for sub-pane toolbar
  const [hoveredRsi, setHoveredRsi] = useState<{ arsi: number | null; signal: number | null } | null>(null);
  // Hover Trend Speed values for sub-pane toolbar
  const [hoveredTrendSpeed, setHoveredTrendSpeed] = useState<{
    speed: number | null;
    color: string;
    dynEma: number | null;
    dynColor: string;
  } | null>(null);

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('p2x_lw_timeframe', timeframe);
    } catch (e) {}
  }, [timeframe]);

  useEffect(() => {
    try {
      localStorage.setItem('p2x_lw_style', chartStyle);
    } catch (e) {}
  }, [chartStyle]);

  useEffect(() => {
    try {
      localStorage.setItem('p2x_lw_resolution', resolution);
    } catch (e) {}
  }, [resolution]);

  // Sync initial livePrice with currentPrice prop
  useEffect(() => {
    setLivePrice(currentPrice);
  }, [currentPrice, symbol]);

  // Keyboard shortcut: F for Fullscreen, ESC to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Dynamic client-side EMA recalculation with server fallback
  const activeEma1 = useMemo(() => {
    if (indicatorConfig.ema1.period === 50 && ema50 && ema50.length === closes.length) {
      return ema50;
    }
    return computeEMA(closes, indicatorConfig.ema1.period);
  }, [closes, ema50, indicatorConfig.ema1.period]);

  const activeEma2 = useMemo(() => {
    if (indicatorConfig.ema2.period === 150 && ema150 && ema150.length === closes.length) {
      return ema150;
    }
    return computeEMA(closes, indicatorConfig.ema2.period);
  }, [closes, ema150, indicatorConfig.ema2.period]);

  const activeEma3 = useMemo(() => {
    if (indicatorConfig.ema3.period === 200 && ema200 && ema200.length === closes.length) {
      return ema200;
    }
    return computeEMA(closes, indicatorConfig.ema3.period);
  }, [closes, ema200, indicatorConfig.ema3.period]);

  // Sanitize & build raw clean bars sorted by date ascending
  const rawCleanBars: RawBarItem[] = useMemo(() => {
    const total = (closes || []).length;
    if (total === 0) return [];

    const items: RawBarItem[] = [];
    const seenDates = new Set<string>();

    for (let i = 0; i < total; i++) {
      const d = dates[i];
      if (!d || seenDates.has(d)) continue;
      seenDates.add(d);

      const c = closes[i];
      if (typeof c !== 'number' || isNaN(c)) continue;

      let o = opens[i] !== undefined && !isNaN(opens[i]) ? opens[i] : (i > 0 ? closes[i - 1] : c * 0.998);
      let h = highs[i] !== undefined && !isNaN(highs[i]) ? highs[i] : Math.max(o, c);
      let l = lows[i] !== undefined && !isNaN(lows[i]) ? lows[i] : Math.min(o, c);

      // Synthesize realistic wicks if DB has only close prices
      if (h <= l) {
        const prevC = i > 0 ? closes[i - 1] : c;
        const spread = Math.max(c * 0.015, Math.abs(c - prevC) * 1.4);
        h = Math.max(o, c) + spread * 0.6;
        l = Math.min(o, c) - spread * 0.6;
      }

      const e50Val = activeEma1[i] !== undefined && activeEma1[i] !== null && !isNaN(activeEma1[i]!) ? activeEma1[i] : null;
      const e150Val = activeEma2[i] !== undefined && activeEma2[i] !== null && !isNaN(activeEma2[i]!) ? activeEma2[i] : null;
      const e200Val = activeEma3[i] !== undefined && activeEma3[i] !== null && !isNaN(activeEma3[i]!) ? activeEma3[i] : null;

      const bVal = bankerSeries[i] ?? 0;
      let hVal = hotMoneySeries[i] ?? 0;
      if (hVal === 0 && bVal > 0) {
        hVal = Math.min(20, bVal * 1.6);
      }
      const rVal = retailSeries[i] ?? Math.max(0, 20 - Math.max(bVal, hVal));

      const maLen = indicatorConfig.mcdx.maPeriod || 9;
      let bMaVal = bVal;
      if (maLen === 9 && bankerMaSeries[i] !== undefined) {
        bMaVal = bankerMaSeries[i];
      } else {
        const start = Math.max(0, i - maLen + 1);
        let sum = 0;
        let count = 0;
        for (let k = start; k <= i; k++) {
          sum += (bankerSeries[k] ?? 0);
          count++;
        }
        bMaVal = count > 0 ? sum / count : bVal;
      }

      items.push({
        time: d,
        open: Number(o.toFixed(2)),
        high: Number(h.toFixed(2)),
        low: Number(l.toFixed(2)),
        close: Number(c.toFixed(2)),
        volume: volumes[i] || 0,
        ema50: e50Val !== null ? Number(e50Val.toFixed(2)) : null,
        ema150: e150Val !== null ? Number(e150Val.toFixed(2)) : null,
        ema200: e200Val !== null ? Number(e200Val.toFixed(2)) : null,
        banker: Number(bVal.toFixed(2)),
        hotMoney: Number(hVal.toFixed(2)),
        retail: Number(rVal.toFixed(2)),
        bankerMa: Number(bMaVal.toFixed(2)),
      });
    }

    // Ensure sorted ascending by date
    items.sort((a, b) => a.time.localeCompare(b.time));
    return items;
  }, [dates, closes, opens, highs, lows, volumes, activeEma1, activeEma2, activeEma3, bankerSeries, hotMoneySeries, retailSeries, bankerMaSeries, indicatorConfig.mcdx.maPeriod]);

  // Aggregate into Weekly bars (if resolution === '1W')
  const aggregatedBars: RawBarItem[] = useMemo(() => {
    if (resolution === '1D' || resolution === '4H' || rawCleanBars.length === 0) return rawCleanBars;

    // Group bars by ISO Week (Monday to Friday)
    const weeksMap = new Map<string, RawBarItem[]>();
    for (const bar of rawCleanBars) {
      const d = new Date(bar.time);
      const day = d.getUTCDay();
      // Calculate Monday of this week
      const diffToMon = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() + diffToMon);
      const monStr = monday.toISOString().split('T')[0];

      if (!weeksMap.has(monStr)) {
        weeksMap.set(monStr, []);
      }
      weeksMap.get(monStr)!.push(bar);
    }

    const weeklyBars: RawBarItem[] = [];
    for (const [monStr, days] of weeksMap.entries()) {
      if (days.length === 0) continue;
      const firstDay = days[0];
      const lastDay = days[days.length - 1];

      let weekHigh = -Infinity;
      let weekLow = Infinity;
      let weekVol = 0;

      for (const day of days) {
        if (day.high > weekHigh) weekHigh = day.high;
        if (day.low < weekLow) weekLow = day.low;
        weekVol += day.volume;
      }

      weeklyBars.push({
        time: monStr,
        open: firstDay.open,
        high: Number(weekHigh.toFixed(2)),
        low: Number(weekLow.toFixed(2)),
        close: lastDay.close,
        volume: weekVol,
        ema50: lastDay.ema50,
        ema150: lastDay.ema150,
        ema200: lastDay.ema200,
        banker: lastDay.banker,
        hotMoney: lastDay.hotMoney,
        retail: lastDay.retail,
        bankerMa: lastDay.bankerMa,
      });
    }

    weeklyBars.sort((a, b) => a.time.localeCompare(b.time));
    return weeklyBars;
  }, [rawCleanBars, resolution]);

  // Compute Heikin-Ashi if selected
  const displayBars: RawBarItem[] = useMemo(() => {
    if (chartStyle !== 'HEIKIN_ASHI' || aggregatedBars.length === 0) return aggregatedBars;

    const haResult: RawBarItem[] = [];
    let prevHaOpen = 0;
    let prevHaClose = 0;

    for (let i = 0; i < aggregatedBars.length; i++) {
      const b = aggregatedBars[i];
      const haClose = (b.open + b.high + b.low + b.close) / 4;
      const haOpen = i === 0 ? (b.open + b.close) / 2 : (prevHaOpen + prevHaClose) / 2;
      const haHigh = Math.max(b.high, haOpen, haClose);
      const haLow = Math.min(b.low, haOpen, haClose);

      prevHaOpen = haOpen;
      prevHaClose = haClose;

      haResult.push({
        ...b,
        open: Number(haOpen.toFixed(2)),
        high: Number(haHigh.toFixed(2)),
        low: Number(haLow.toFixed(2)),
        close: Number(haClose.toFixed(2)),
      });
    }
    return haResult;
  }, [aggregatedBars, chartStyle]);

  // Map for O(1) hover lookup by date string or unix timestamp seconds
  const rawBarsByDate = useMemo(() => {
    const map = new Map<string, RawBarItem>();
    for (const b of aggregatedBars) {
      map.set(b.time, b);
      if (b.time && b.time.includes('T')) {
        const sec = Math.floor(new Date(b.time).getTime() / 1000);
        map.set(String(sec), b);
      }
    }
    return map;
  }, [aggregatedBars]);

  // -------------------------------------------------------------
  // TRADINGVIEW-STYLE DRAWING TOOLS STATE & HOOKS
  // -------------------------------------------------------------
  const priceLineMapRef = useRef<Map<string, IPriceLine>>(new Map());
  const isDraggingLineRef = useRef<{ lineId: string; startPrice: number } | null>(null);
  const [selectedLineY, setSelectedLineY] = useState<number>(0);
  const [propertiesModalLineId, setPropertiesModalLineId] = useState<string | null>(null);
  const [contextMenuData, setContextMenuData] = useState<{ line: HorizontalLineDrawing; position: { x: number; y: number } } | null>(null);
  const [magnetIndicator, setMagnetIndicator] = useState<{ x: number; y: number; text: string; price: number } | null>(null);
  const [candleSeriesReady, setCandleSeriesReady] = useState(0);

  const drawingsBySymbol = useDrawingStore((s) => s.drawingsBySymbol);
  const globalDrawingsVisible = useDrawingStore((s) => s.globalDrawingsVisible);
  const selectedLineId = useDrawingStore((s) => s.selectedLineId);
  const toastNotification = useDrawingStore((s) => s.toastNotification);

  const drawings = useMemo(() => {
    return drawingsBySymbol[symbol.toUpperCase().trim()] || [];
  }, [drawingsBySymbol, symbol]);

  // Load drawings on symbol change
  useEffect(() => {
    useDrawingStore.getState().loadDrawings(symbol);
  }, [symbol]);

  const visibleDrawings = useMemo(() => {
    if (!globalDrawingsVisible) return [];
    return drawings.filter((d) => {
      if (!d.visible) return false;
      if (d.visibleOn && d.visibleOn !== 'all' && d.visibleOn !== resolution) return false;
      return true;
    });
  }, [drawings, globalDrawingsVisible, resolution]);

  const selectedDrawing = useMemo(() => {
    if (!selectedLineId) return null;
    return drawings.find((d) => d.id === selectedLineId) || null;
  }, [drawings, selectedLineId]);

  // Sync selected line Y coordinate
  useEffect(() => {
    if (!selectedDrawing || !candleSeriesRef.current) return;
    const y = candleSeriesRef.current.priceToCoordinate(selectedDrawing.price);
    if (y !== null) {
      setSelectedLineY(y);
    }
  }, [selectedDrawing, selectedDrawing?.price]);

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
        axisLabelVisible: d.showPriceLabel,
        title: d.text || '',
      };

      if (existing) {
        existing.applyOptions(lineOpts);
      } else {
        const pl = candleSeries.createPriceLine(lineOpts);
        currentMap.set(d.id, pl);
      }
    }
  }, [visibleDrawings, symbol, candleSeriesReady]);

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
  }, [displayBars, visibleDrawings, symbol]);

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

      if (e.key === 'Escape') {
        useDrawingStore.getState().setActiveTool('cursor');
        useDrawingStore.getState().selectLine(null);
        setPropertiesModalLineId(null);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = useDrawingStore.getState().selectedLineId;
        if (sel) {
          e.preventDefault();
          useDrawingStore.getState().deleteLine(symbol, sel);
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

  // Compute My Ultimate RSI by doctorbank8989
  const ultimateRSIResult = useMemo(() => {
    if (aggregatedBars.length === 0) return null;
    const closes = aggregatedBars.map(b => b.close);
    const highs = aggregatedBars.map(b => b.high);
    const lows = aggregatedBars.map(b => b.low);
    const opens = aggregatedBars.map(b => b.open);
    return computeUltimateRSI(closes, highs, lows, opens, {
      length: indicatorConfig.ultimateRsi.length,
      smoType1: indicatorConfig.ultimateRsi.smoType1,
      smooth: indicatorConfig.ultimateRsi.smooth,
      smoType2: indicatorConfig.ultimateRsi.smoType2,
      source: indicatorConfig.ultimateRsi.source,
    });
  }, [
    aggregatedBars,
    indicatorConfig.ultimateRsi.length,
    indicatorConfig.ultimateRsi.smoType1,
    indicatorConfig.ultimateRsi.smooth,
    indicatorConfig.ultimateRsi.smoType2,
    indicatorConfig.ultimateRsi.source,
  ]);

  // Map for O(1) hover lookup of Ultimate RSI values by date
  const rsiDataByDate = useMemo(() => {
    const map = new Map<string, { arsi: number | null; signal: number | null; buyCross: boolean; reversal: boolean; buyZone: boolean }>();
    if (!ultimateRSIResult) return map;
    for (let i = 0; i < aggregatedBars.length; i++) {
      const b = aggregatedBars[i];
      const item = {
        arsi: ultimateRSIResult.arsi[i],
        signal: ultimateRSIResult.signal[i],
        buyCross: ultimateRSIResult.bullishCrossLow[i],
        reversal: ultimateRSIResult.bullishReversal[i],
        buyZone: ultimateRSIResult.buyZone[i],
      };
      map.set(b.time, item);
      if (b.time && b.time.includes('T')) {
        const sec = Math.floor(new Date(b.time).getTime() / 1000);
        map.set(String(sec), item);
      }
    }
    return map;
  }, [aggregatedBars, ultimateRSIResult]);

  // Compute Trend Speed Analyzer by Zeiierman
  const trendSpeedResult: TrendSpeedResult | null = useMemo(() => {
    if (aggregatedBars.length === 0) return null;
    const c = aggregatedBars.map(b => b.close);
    const o = aggregatedBars.map(b => b.open);
    const h = aggregatedBars.map(b => b.high);
    const l = aggregatedBars.map(b => b.low);
    return computeTrendSpeed(c, o, h, l, {
      maxLength: indicatorConfig.trendSpeed?.maxLength ?? 50,
      accelMultiplier: indicatorConfig.trendSpeed?.accelMultiplier ?? 0.01,
      enableTable: indicatorConfig.trendSpeed?.enableTable ?? true,
      lookbackPeriod: indicatorConfig.trendSpeed?.lookbackPeriod ?? 150,
      enableCandles: indicatorConfig.trendSpeed?.enableCandles ?? true,
      collectionPeriod: indicatorConfig.trendSpeed?.collectionPeriod ?? 100,
      upTrendColor: indicatorConfig.trendSpeed?.upTrendColor ?? '#F7D02C',
      dnTrendColor: indicatorConfig.trendSpeed?.dnTrendColor ?? '#FFF8DB',
      upHistColor1: indicatorConfig.trendSpeed?.upHistColor1 ?? '#F7D02C',
      upHistColor2: indicatorConfig.trendSpeed?.upHistColor2 ?? '#FFE600',
      dnHistColor1: indicatorConfig.trendSpeed?.dnHistColor1 ?? '#9E2A2B',
      dnHistColor2: indicatorConfig.trendSpeed?.dnHistColor2 ?? '#C83337',
    });
  }, [
    aggregatedBars,
    indicatorConfig.trendSpeed?.maxLength,
    indicatorConfig.trendSpeed?.accelMultiplier,
    indicatorConfig.trendSpeed?.enableTable,
    indicatorConfig.trendSpeed?.lookbackPeriod,
    indicatorConfig.trendSpeed?.enableCandles,
    indicatorConfig.trendSpeed?.collectionPeriod,
    indicatorConfig.trendSpeed?.upTrendColor,
    indicatorConfig.trendSpeed?.dnTrendColor,
    indicatorConfig.trendSpeed?.upHistColor1,
    indicatorConfig.trendSpeed?.upHistColor2,
    indicatorConfig.trendSpeed?.dnHistColor1,
    indicatorConfig.trendSpeed?.dnHistColor2,
  ]);

  // Map for O(1) hover lookup of Trend Speed values by date
  const trendSpeedDataByDate = useMemo(() => {
    const map = new Map<string, { speed: number | null; color: string; dynEma: number | null; dynColor: string }>();
    if (!trendSpeedResult) return map;
    for (let i = 0; i < aggregatedBars.length; i++) {
      const b = aggregatedBars[i];
      const item = {
        speed: trendSpeedResult.trendSpeed[i],
        color: trendSpeedResult.barColor[i],
        dynEma: trendSpeedResult.dynEma[i],
        dynColor: trendSpeedResult.dynTrendColor[i],
      };
      map.set(b.time, item);
      if (b.time && b.time.includes('T')) {
        const sec = Math.floor(new Date(b.time).getTime() / 1000);
        map.set(String(sec), item);
      }
    }
    return map;
  }, [aggregatedBars, trendSpeedResult]);

  // Compute FluidTrades - SMC Lite (Smart Money Concepts Lite)
  const smcLiteResult: SMCResult | null = useMemo(() => {
    if (aggregatedBars.length === 0 || !indicatorConfig.smcLite?.visible) return null;
    return computeSMCLite(aggregatedBars, indicatorConfig.smcLite);
  }, [aggregatedBars, indicatorConfig.smcLite]);

  // Compute Anchored VWAP
  const anchoredVWAPResult: AnchoredVWAPResult | null = useMemo(() => {
    if (aggregatedBars.length === 0 || !indicatorConfig.anchoredVwap?.visible) return null;
    return computeAnchoredVWAP(aggregatedBars, indicatorConfig.anchoredVwap);
  }, [aggregatedBars, indicatorConfig.anchoredVwap]);

  // Compute Super Money Signal V3
  const superMoneySignalResult: SuperMoneySignalResult | null = useMemo(() => {
    if (aggregatedBars.length === 0 || !indicatorConfig.superMoneySignal?.visible) return null;
    return computeSuperMoneySignal(aggregatedBars, indicatorConfig.superMoneySignal);
  }, [aggregatedBars, indicatorConfig.superMoneySignal]);

  // Helper to map RSI marker shape to SeriesMarkerShape & text
  // IMPORTANT: For text-based symbols ('diamond', 'cross'), size MUST be 0 so Lightweight Charts does NOT draw a shape above the text!
  // For shape-based symbols ('circle', 'square', etc.), text MUST be undefined so it does NOT draw a text label below the shape!
  const getRsiMarkerProps = (
    shape: RSIMarkerShape = 'circle'
  ): { shape: SeriesMarkerShape; text?: string; size: number } => {
    switch (shape) {
      case 'diamond':
        return { shape: 'circle', text: '◇', size: 0 };
      case 'cross':
        return { shape: 'circle', text: '+', size: 0 };
      case 'square':
        return { shape: 'square', text: undefined, size: 0.7 };
      case 'arrowUp':
        return { shape: 'arrowUp', text: undefined, size: 0.8 };
      case 'arrowDown':
        return { shape: 'arrowDown', text: undefined, size: 0.8 };
      case 'circle':
      default:
        return { shape: 'circle', text: undefined, size: 0.7 };
    }
  };

  // Calculate Ultimate RSI buy signals markers with individual shape, color, and location settings
  const calculatedRsiMarkers: SeriesMarker<Time>[] = useMemo(() => {
    if (!ultimateRSIResult || !indicatorConfig.ultimateRsi.visible) return [];
    const markers: SeriesMarker<Time>[] = [];
    const sigs = indicatorConfig.ultimateRsi.signals;
    const osPrice = indicatorConfig.ultimateRsi.osValue ?? 20;

    for (let i = 0; i < aggregatedBars.length; i++) {
      const bar = aggregatedBars[i];
      const t = formatBarTime(bar.time);

      // Determine single active signal for this bar using Priority Hierarchy (Matching TradingView single-row layout):
      // Priority 1: Buy Signal (Momentum crossover) -> จุดตัดสำคัญที่สุด
      // Priority 2: Bullish Reversal (Oversold bounce dot) -> จุดกลับตัว
      // Priority 3: Buy Zone (Post-cross accumulation zone) -> โซนสะสม
      let signalType: 'buyCross' | 'reversal' | 'buyZone' | null = null;

      if (sigs.buyCross && ultimateRSIResult.bullishCrossLow[i]) {
        signalType = 'buyCross';
      } else if (sigs.reversal && ultimateRSIResult.bullishReversal[i]) {
        signalType = 'reversal';
      } else if (sigs.buyZone && ultimateRSIResult.buyZone[i]) {
        signalType = 'buyZone';
      }

      if (!signalType) continue;

      let shape: RSIMarkerShape;
      let color: string;
      let location: RSIMarkerLocation;

      if (signalType === 'buyCross') {
        shape = sigs.buyCrossShape || 'diamond';
        color = sigs.buyCrossColor || '#FFFFFF';
        location = sigs.buyCrossLocation || 'bottom';
      } else if (signalType === 'reversal') {
        shape = sigs.reversalShape || 'circle';
        color = sigs.reversalColor || '#FFE600';
        location = sigs.reversalLocation || 'bottom';
      } else {
        shape = sigs.buyZoneShape || 'cross';
        color = sigs.buyZoneColor || '#22c55e';
        location = sigs.buyZoneLocation || 'bottom';
      }

      const props = getRsiMarkerProps(shape);
      const isBottom = location === 'bottom';

      if (isBottom) {
        markers.push({
          time: t,
          position: 'atPriceMiddle',
          price: osPrice,
          color,
          shape: props.shape,
          text: props.text,
          size: props.size,
        });
      } else {
        markers.push({
          time: t,
          position: 'belowBar',
          color,
          shape: props.shape,
          text: props.text,
          size: props.size,
        });
      }
    }
    return markers;
  }, [
    aggregatedBars,
    ultimateRSIResult,
    indicatorConfig.ultimateRsi.visible,
    indicatorConfig.ultimateRsi.signals,
    indicatorConfig.ultimateRsi.osValue,
  ]);

  // Calculate 3-Step Super Money Signals markers with individual sub-toggles
  const calculatedMarkers: SeriesMarker<Time>[] = useMemo(() => {
    if (!indicatorConfig.signals.visible || aggregatedBars.length < 2) return [];

    const markers: SeriesMarker<Time>[] = [];
    let lastType: string | null = null;
    let lastReadyIdx = -100;
    const { rebound, breakout, goldenStar, pullback } = indicatorConfig.signals.markers;
    const showText = indicatorConfig.signals.showText !== false;
    const userSize = indicatorConfig.signals.size ?? 1.2;
    const padding = indicatorConfig.signals.padding ?? 0;
    const sigColors = indicatorConfig.signals.colors || { rebound: '#FBBF24', breakout: '#FFE600', goldenStar: '#FFFFFF', pullback: '#FF1744' };
    const avgRange = aggregatedBars.length > 0 ? aggregatedBars.reduce((acc, b) => acc + (b.high - b.low), 0) / aggregatedBars.length : 1;

    const makeMarker = (
      time: Time,
      pos: 'below' | 'above',
      barHigh: number,
      barLow: number,
      color: string,
      shape: 'circle' | 'arrowUp' | 'arrowDown',
      textLabel: string,
      sizeMult: number,
      textOnly?: string
    ): SeriesMarker<Time> => {
      const finalSize = textOnly !== undefined ? 0 : Math.max(0.5, Math.round(userSize * sizeMult * 10) / 10);
      const text = textOnly !== undefined ? (showText ? `${textOnly} READY` : textOnly) : (showText ? textLabel : undefined);
      if (padding > 0) {
        // Dynamic adaptive clearance: local candle spread or 1.5% of price, scaling cleanly with padding
        const candleSpread = Math.abs(barHigh - barLow);
        const refPrice = pos === 'below' ? barLow : barHigh;
        const localUnit = Math.max(candleSpread, (refPrice || 1) * 0.015);
        const offset = localUnit * 0.6 + localUnit * (padding * 0.25);
        return {
          time,
          position: pos === 'below' ? 'atPriceBottom' : 'atPriceTop',
          price: pos === 'below' ? barLow - offset : barHigh + offset,
          color, shape, text, size: finalSize,
        };
      }
      return { time, position: pos === 'below' ? 'belowBar' : 'aboveBar', color, shape, text, size: finalSize };
    };

    for (let i = 0; i < aggregatedBars.length; i++) {
      const bar = aggregatedBars[i];
      const close = bar.close;
      const e50 = bar.ema50;
      const e150 = bar.ema150;
      const e200 = bar.ema200;
      const bVal = bar.banker;
      const prevBVal = i > 0 ? aggregatedBars[i - 1].banker : 0;
      const isBull = bar.close >= bar.open;

      const dist200 = e200 ? ((close - e200) / e200) * 100 : 0;
      const dist150 = e150 ? ((close - e150) / e150) * 100 : 0;
      // Buffer zone: -3.0% to +2.5% near support
      const nearSupport = (e200 && dist200 >= -3.0 && dist200 <= 2.5) || (e150 && dist150 >= -2.5 && dist150 <= 2.5);

      // STEP 3: ★ SUPER MONEY (Banker crosses >= 10, in trend) -> Upward arrow + White Star
      if (goldenStar && bVal >= 10 && prevBVal < 10 && close > (e50 || close * 0.98)) {
        if (lastType !== 'SUPER') {
          markers.push(makeMarker(formatBarTime(bar.time), 'below', bar.high, bar.low, sigColors.goldenStar, 'arrowUp', '★ SUPER', 1.35));
          lastType = 'SUPER';
          continue;
        }
      }

      // STEP 2: ▲ BUY ZONE (At/near EMA support + Banker emerges > 0 on green bar) -> Yellow Triangle below candle
      if (breakout && nearSupport && bVal > 0 && prevBVal === 0 && isBull) {
        if (lastType !== 'BUY') {
          markers.push(makeMarker(formatBarTime(bar.time), 'below', bar.high, bar.low, sigColors.breakout, 'arrowUp', '▲ BUY', 1.15));
          lastType = 'BUY';
          continue;
        }
      }

      // STEP 1: ● ● ● READY (Near EMA support, Banker = 0, setup forming) -> 3 dots (● ● ●) below candle
      if (rebound && nearSupport && bVal === 0) {
        if (lastType !== 'READY' && lastType !== 'BUY' && lastType !== 'SUPER') {
          if (i - lastReadyIdx >= 14) {
            markers.push(makeMarker(formatBarTime(bar.time), 'below', bar.high, bar.low, sigColors.rebound, 'circle', '', 0, '● ● ●'));
            lastType = 'READY';
            lastReadyIdx = i;
            continue;
          }
        }
      }

      // If in READY state and price breaks support below -4%, quietly cancel setup
      if (lastType === 'READY' && dist200 < -4) {
        lastType = null;
      }

      // EXIT: ▼ DANGER / STOP LOSS (Only fires when in a BUY/SUPER position)
      const inPosition = lastType === 'BUY' || lastType === 'SUPER';
      if (pullback && inPosition && ((dist200 < -5.0 && bVal === 0 && e200) || (prevBVal >= 10 && bVal < 5 && close < (e50 || close)))) {
        markers.push(makeMarker(formatBarTime(bar.time), 'above', bar.high, bar.low, sigColors.pullback, 'arrowDown', '▼ EXIT', 1.15));
        lastType = null; // Position exited, back to cash
      }
    }

    return markers;
  }, [aggregatedBars, indicatorConfig.signals]);

  // Set timeframe logical range helper
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

    // Also reset vertical price scale to autoScale
    try {
      const priceScale = candleSeriesRef.current?.priceScale() || chartRef.current.priceScale('right');
      priceScale?.setAutoScale(true);
    } catch (e) {}

    setTimeframe(tf);
  }, [displayBars.length, resolution]);

  // Combined Pane 0 Markers: Super Money Signals + SMC Lite Signals
  const pane0Markers: SeriesMarker<Time>[] = useMemo(() => {
    const list: SeriesMarker<Time>[] = [];
    if (indicatorConfig.signals.visible) {
      list.push(...calculatedMarkers);
    }
    if (
      indicatorConfig.smcLite?.visible &&
      indicatorConfig.smcLite?.showArrows &&
      smcLiteResult?.signals &&
      smcLiteResult.signals.length > 0
    ) {
      const showBuy = indicatorConfig.smcLite.showBuySignal;
      const showSell = indicatorConfig.smcLite.showSellSignal;
      for (const sig of smcLiteResult.signals) {
        if (sig.type === 'BUY' && showBuy) {
          list.push({
            time: formatBarTime(sig.time),
            position: 'belowBar',
            color: '#10B981',
            shape: 'arrowUp',
            text: sig.text,
            size: 1.5,
          });
        } else if (sig.type === 'SELL' && showSell) {
          list.push({
            time: formatBarTime(sig.time),
            position: 'aboveBar',
            color: '#EF4444',
            shape: 'arrowDown',
            text: sig.text,
            size: 1.5,
          });
        }
      }
    }
    if (indicatorConfig.anchoredVwap?.visible && anchoredVWAPResult?.anchorTime) {
      list.push({
        time: formatBarTime(anchoredVWAPResult.anchorTime),
        position: 'belowBar',
        color: '#FFE600',
        shape: 'arrowUp',
        text: 'ANCHOR',
        size: 1.5,
      });
    }
    if (indicatorConfig.superMoneySignal?.visible && superMoneySignalResult) {
      const cfg = indicatorConfig.superMoneySignal;
      const showText = cfg.showText !== false;
      const userSize = cfg.size ?? 1.2;
      const padding = cfg.padding ?? 0;
      const avgRange = aggregatedBars.length > 0 ? aggregatedBars.reduce((acc, b) => acc + (b.high - b.low), 0) / aggregatedBars.length : 1;

      // Rich Unicode symbol dictionary for 20+ symbols
      const GLYPH_MAP: Record<string, string> = {
        arrowUp: '▲',
        arrowDown: '▼',
        arrowRight: '►',
        arrowDoubleUp: '⇈',
        circle: '●',
        circleOutline: '○',
        square: '■',
        squareOutline: '□',
        diamond: '◆',
        diamondOutline: '◇',
        triangle: '▲',
        triangleOutline: '△',
        triangleDown: '▼',
        hexagon: '⬡',
        star: '★',
        starOutline: '☆',
        sparkle: '✦',
        cross: '✚',
        xMark: '✖',
        check: '✔',
        bolt: '⚡',
        target: '🎯',
        fire: '🔥',
        flag: '⚑',
        dollar: '💲',
      };

      const resolveSuperVisual = (
        symbolKey: string,
        sizeMultiplier: number,
        label: string
      ): { shape: SeriesMarkerShape; size: number; text?: string } => {
        const scaledSize = Math.max(0.5, Math.round(userSize * sizeMultiplier * 10) / 10);

        // Native Lightweight Charts shapes
        if (symbolKey === 'arrowUp') {
          return { shape: 'arrowUp', size: scaledSize, text: showText ? label : undefined };
        }
        if (symbolKey === 'arrowDown') {
          return { shape: 'arrowDown', size: scaledSize, text: showText ? label : undefined };
        }
        if (symbolKey === 'circle') {
          return { shape: 'circle', size: scaledSize, text: showText ? label : undefined };
        }
        if (symbolKey === 'square') {
          return { shape: 'square', size: scaledSize, text: showText ? label : undefined };
        }

        // Custom rich Unicode glyph
        const glyph = GLYPH_MAP[symbolKey] || '▲';
        const text = showText ? `${glyph} ${label}` : glyph;
        return {
          shape: 'circle',
          size: 0,
          text,
        };
      };

      const makeSuperMarker = (
        time: Time,
        bar: any,
        color: string,
        shapeKey: string,
        label: string,
        sizeMult: number,
        pos: 'below' | 'above' = 'below'
      ): SeriesMarker<Time> => {
        const visual = resolveSuperVisual(shapeKey, sizeMult, label);

        if (padding > 0) {
          const bHigh = typeof bar.high === 'number' && !isNaN(bar.high) ? bar.high : bar.close;
          const bLow = typeof bar.low === 'number' && !isNaN(bar.low) ? bar.low : bar.close;
          const candleSpread = Math.abs(bHigh - bLow);
          const refPrice = pos === 'below' ? bLow : bHigh;
          const localUnit = Math.max(candleSpread, (refPrice || 1) * 0.015);
          const offset = localUnit * 0.6 + localUnit * (padding * 0.25);
          const safePrice = pos === 'below' ? bLow - offset : bHigh + offset;
          return {
            time,
            position: pos === 'below' ? 'atPriceBottom' : 'atPriceTop',
            price: safePrice,
            color,
            shape: visual.shape,
            text: visual.text,
            size: visual.size,
          };
        }
        return {
          time,
          position: pos === 'below' ? 'belowBar' : 'aboveBar',
          color,
          shape: visual.shape,
          text: visual.text,
          size: visual.size,
        };
      };

      for (let i = 0; i < aggregatedBars.length; i++) {
        const bar = aggregatedBars[i];
        const t = formatBarTime(bar.time);
        if (cfg.showReadySignal && superMoneySignalResult.readySignals[i]) {
          list.push(makeSuperMarker(
            t,
            bar,
            cfg.readySignalColor ?? '#FFFFFF',
            cfg.readySignalShape ?? 'arrowUp',
            'READY',
            1.0,
            'below'
          ));
        }
        if (cfg.showBuySignal && superMoneySignalResult.buySignals[i]) {
          list.push(makeSuperMarker(
            t,
            bar,
            cfg.buySignalColor ?? '#FFE600',
            cfg.buySignalShape ?? 'arrowUp',
            'BUY',
            1.2,
            'below'
          ));
        }
        if (cfg.showNoSignal && superMoneySignalResult.noSignals[i]) {
          list.push(makeSuperMarker(
            t,
            bar,
            cfg.noSignalColor ?? '#800000',
            cfg.noSignalShape ?? 'arrowDown',
            'NO SIGNAL',
            1.0,
            cfg.noSignalShape === 'arrowDown' ? 'above' : 'below'
          ));
        }
      }
    }
    list.sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
    return list;
  }, [indicatorConfig.signals.visible, calculatedMarkers, indicatorConfig.smcLite, smcLiteResult, indicatorConfig.anchoredVwap?.visible, anchoredVWAPResult, indicatorConfig.superMoneySignal, superMoneySignalResult]);

  // Instant reactive update for Pane 0 markers whenever pane0Markers recomputes (padding, size, symbols)
  useEffect(() => {
    if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers(pane0Markers);
    }
  }, [pane0Markers]);

  // Initialize and build chart instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear old container children
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

    // -------------------------------------------------------------
    // PANE 0: Price Chart Series
    // -------------------------------------------------------------
    const isBullTrend = displayBars.length > 1 ? displayBars[displayBars.length - 1].close >= displayBars[0].close : true;

    // 1. Candlestick Series (Bull = Yellow #FFE600, Bear = Crimson #C62828)
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

    // 2. Area Series (for Area Mode)
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: isBullTrend ? 'rgba(255, 230, 0, 0.38)' : 'rgba(198, 40, 40, 0.38)',
      bottomColor: 'rgba(0, 0, 0, 0.0)',
      lineColor: isBullTrend ? '#FFE600' : '#C62828',
      lineWidth: 2,
      visible: chartStyle === 'AREA',
    }, 0);
    areaSeriesRef.current = areaSeries;

    const showLabels = indicatorConfig.showAxisLabels;

    // 3. EMA 1 (Customizable)
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

    // 4. EMA 2 (Customizable)
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

    // 5. EMA 3 (Customizable Core Bedrock)
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

    // 6. Bedrock Envelope (+% Upper Band)
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

    // 7. Bedrock Envelope (-% Lower Band)
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

    // 8. Dynamic Trend EMA (Zeiierman)
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

    // 9. SMC Lite Fast SMA (Pane 0)
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

    // 10. SMC Lite Slow SMA (Pane 0)
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

    // 11. SMC Lite Custom Primitive (Pane 0: Supply/Demand Boxes, BOS, Zigzag, Labels)
    const smcPrimitive = new SMCPrimitive();
    candleSeries.attachPrimitive(smcPrimitive);
    smcPrimitiveRef.current = smcPrimitive;

    // 12. Anchored VWAP (Pane 0)
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

    // 13. Anchored VWAP Upper Band (Pane 0)
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

    // 14. Anchored VWAP Lower Band (Pane 0)
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

    // -------------------------------------------------------------
    // Dynamic Sub-Panes Construction (Ordered by Pane Index)
    // -------------------------------------------------------------
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

      // Pink Threshold Line (10 Entry Strike)
      const strikeLine = mcdxSeries.createPriceLine({
        price: 10,
        color: '#FC2D79',
        lineStyle: LineStyle.Dashed,
        lineWidth: 1,
        axisLabelVisible: showLabels,
        title: showLabels ? '10 STRIKE' : '',
      });
      mcdxStrikeLineRef.current = strikeLine;

      // Banker MA Line (overlaying Pane targetPane)
      const bankerMaSeries = chart.addSeries(LineSeries, {
        color: indicatorConfig.mcdx.maColor || '#FFFFFF',
        lineWidth: (indicatorConfig.mcdx.maWidth || 2) as any,
        priceLineVisible: false,
        lastValueVisible: showLabels,
        title: showLabels ? 'Banker MA' : '',
      }, targetPane);
      bankerMaSeriesRef.current = bankerMaSeries;

      // Configure Pane price scale
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

      // Shaded Background Cloud (Baseline 50: Green above 50, Red below 50)
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

      // ARSI Line (Renders only when in Overbought / Oversold zones like TradingView)
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

      // Overbought (80)
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

      // Midline (50)
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

      // Oversold (20)
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

      // Signal Line (Always visible, full trajectory)
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

      // Configure Pane scale
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

      // Base 0 Line
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

    // Sequentially build ONLY active sub-panes in ascending pane order
    activeSubPanes.list.forEach(p => {
      const paneIdx = activeSubPanes.paneMap[p.id]!;
      if (p.id === 'mcdx') createMCDXPane(paneIdx);
      if (p.id === 'ultimateRsi') createRSIPane(paneIdx);
      if (p.id === 'trendSpeed') createTrendSpeedPane(paneIdx);
    });

    // Adjust Sub-Panes Heights according to assigned pane layout & saved state
    applyPaneLayoutHeights(chart, indicatorConfig, maximizedPane);

    // Initialize Markers Plugin for Pane 0 (Candles) and RSI Pane
    const markersPlugin = createSeriesMarkers(candleSeries, pane0Markers);
    markersPluginRef.current = markersPlugin;

    if (rsiSignalSeriesRef.current) {
      const rsiMarkersPlugin = createSeriesMarkers(rsiSignalSeriesRef.current, indicatorConfig.ultimateRsi.visible ? calculatedRsiMarkers : []);
      rsiMarkersPluginRef.current = rsiMarkersPlugin;
    }

    // Crosshair listener for rich header legend + sub-pane live values
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

    // Free 2D Panning & Drawing Tool Handlers
    const handleMouseDown = (e: MouseEvent) => {
      // Middle click: instant delete hovered drawing
      if (e.button === 1) {
        const hovered = useDrawingStore.getState().hoveredLineId;
        if (hovered) {
          useDrawingStore.getState().deleteLine(symbol, hovered);
          return;
        }
      }

      if (e.button !== 0) return; // Only left click
      const container = chartContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // If clicked on right price scale axis (last 60px) or bottom time scale axis (last 26px), let native handlers run
      if (e.clientX > rect.right - 60 || e.clientY > rect.bottom - 26) return;

      const mouseY = e.clientY - rect.top;
      const mouseX = e.clientX - rect.left;
      const candleSeries = candleSeriesRef.current;
      if (!candleSeries) return;

      const store = useDrawingStore.getState();
      const currentTool = store.activeTool;
      const currentDrawings = store.getDrawings(symbol);
      const isMagnet = store.magnetMode;

      // Calculate bar index under cursor
      const logical = chartRef.current?.timeScale().coordinateToLogical(mouseX);
      const barIdx = logical !== null && logical !== undefined ? Math.round(logical) : null;

      // Priority 1: Drawing Tool Active -> Place new line
      if (currentTool === 'horizontalLine') {
        const rawPrice = candleSeries.coordinateToPrice(mouseY);
        if (rawPrice !== null && !isNaN(rawPrice)) {
          let snappedPrice = rawPrice;
          if (isMagnet) {
            const snap = snapToCandleOHLC(rawPrice, mouseY, barIdx, displayBars, candleSeries, 30);
            snappedPrice = snap.price;
          } else {
            snappedPrice = snapToTickSize(rawPrice);
          }

          store.addLine(symbol, { price: snappedPrice });
          setSelectedLineY(mouseY);
          setMagnetIndicator(null);
        }
        return;
      }

      // Priority 2: Hit-test existing line -> Select / Drag / Clone
      const hitLine = hitTestLines(mouseY, currentDrawings, candleSeries, 8);
      if (hitLine) {
        if (e.ctrlKey) {
          // Ctrl+Drag = Clone line
          const clonedId = store.cloneLine(symbol, hitLine.id);
          if (clonedId) {
            isDraggingLineRef.current = { lineId: clonedId, startPrice: hitLine.price };
            store.selectLine(clonedId);
          }
        } else {
          isDraggingLineRef.current = { lineId: hitLine.id, startPrice: hitLine.price };
          store.selectLine(hitLine.id);
        }
        setSelectedLineY(mouseY);
        return; // Block 2D pan
      }

      // Priority 3: Click empty space -> Deselect drawing
      store.selectLine(null);
      setContextMenuData(null);

      // Priority 4: Free 2D Pan
      isDraggingRef.current = true;
      lastYRef.current = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const container = chartContainerRef.current;
      const candleSeries = candleSeriesRef.current;
      if (!container || !candleSeries) return;

      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const mouseX = e.clientX - rect.left;

      const logical = chartRef.current?.timeScale().coordinateToLogical(mouseX);
      const barIdx = logical !== null && logical !== undefined ? Math.round(logical) : null;

      // Case 1: Dragging a horizontal line
      if (isDraggingLineRef.current) {
        const lineId = isDraggingLineRef.current.lineId;
        const store = useDrawingStore.getState();
        const currentDrawings = store.getDrawings(symbol);
        const targetLine = currentDrawings.find((d) => d.id === lineId);

        if (targetLine && !targetLine.locked) {
          const rawPrice = candleSeries.coordinateToPrice(mouseY);
          if (rawPrice !== null && !isNaN(rawPrice)) {
            const isMagnet = store.magnetMode;
            let newPrice = rawPrice;

            if (isMagnet) {
              const snap = snapToCandleOHLC(rawPrice, mouseY, barIdx, displayBars, candleSeries, 30);
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
              newPrice = snapToTickSize(rawPrice);
              setMagnetIndicator(null);
            }

            // Instant update for 60fps responsiveness
            const pl = priceLineMapRef.current.get(lineId);
            if (pl) {
              pl.applyOptions({ price: newPrice });
            }
            store.updateLine(symbol, lineId, { price: newPrice });
            setSelectedLineY(mouseY);
          }
        }
        return; // Block 2D pan
      }

      // Case 2: Free 2D Pan
      if (isDraggingRef.current) {
        const deltaY = e.clientY - lastYRef.current;
        if (Math.abs(deltaY) < 1) return;

        const priceScale = candleSeries.priceScale();
        const range = priceScale.getVisibleRange();
        if (!range) return;

        const relLastY = lastYRef.current - rect.top;
        const relCurrY = e.clientY - rect.top;

        const p1 = candleSeries.coordinateToPrice(relLastY);
        const p2 = candleSeries.coordinateToPrice(relCurrY);

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
          // Update selected line position if visible
          const selId = useDrawingStore.getState().selectedLineId;
          if (selId) {
            const selLine = useDrawingStore.getState().getDrawings(symbol).find((d) => d.id === selId);
            if (selLine) {
              const newY = candleSeries.priceToCoordinate(selLine.price);
              if (newY !== null) setSelectedLineY(newY);
            }
          }
        }
        return;
      }

      // Case 3: Hover detection & Magnet Preview
      const store = useDrawingStore.getState();
      const currentTool = store.activeTool;
      const isMagnet = store.magnetMode;

      if (currentTool === 'horizontalLine') {
        container.style.cursor = 'crosshair';

        // Magnet preview dot
        if (isMagnet) {
          const rawP = candleSeries.coordinateToPrice(mouseY);
          if (rawP !== null && !isNaN(rawP)) {
            const snap = snapToCandleOHLC(rawP, mouseY, barIdx, displayBars, candleSeries, 30);
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
        const hit = hitTestLines(mouseY, currentDrawings, candleSeries, 8);
        if (hit) {
          container.style.cursor = hit.locked ? 'not-allowed' : 'ns-resize';
          store.hoverLine(hit.id);
        } else {
          container.style.cursor = 'default';
          store.hoverLine(null);
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isDraggingLineRef.current = null;
    };

    const handleMouseLeave = () => {
      setMagnetIndicator(null);
    };

    const handleContextMenu = (e: MouseEvent) => {
      const container = chartContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (e.clientX > rect.right - 60 || e.clientY > rect.bottom - 26) return;

      const mouseY = e.clientY - rect.top;
      const candleSeries = candleSeriesRef.current;
      if (candleSeries) {
        const currentDrawings = useDrawingStore.getState().getDrawings(symbol);
        const hit = hitTestLines(mouseY, currentDrawings, candleSeries, 8);
        if (hit) {
          e.preventDefault();
          setContextMenuData({ line: hit, position: { x: e.clientX, y: e.clientY } });
          return;
        }
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      const container = chartContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (e.clientX > rect.right - 60 || e.clientY > rect.bottom - 26) return;

      const mouseY = e.clientY - rect.top;
      const candleSeries = candleSeriesRef.current;
      if (candleSeries) {
        const currentDrawings = useDrawingStore.getState().getDrawings(symbol);
        const hit = hitTestLines(mouseY, currentDrawings, candleSeries, 8);
        if (hit) {
          setPropertiesModalLineId(hit.id);
          return;
        }
      }

      candleSeriesRef.current?.priceScale().setAutoScale(true);
    };

    const containerEl = chartContainerRef.current;
    if (containerEl) {
      containerEl.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      containerEl.addEventListener('mouseleave', handleMouseLeave);
      containerEl.addEventListener('contextmenu', handleContextMenu);
      containerEl.addEventListener('dblclick', handleDblClick);
    }

    // Clean up
    return () => {
      if (containerEl) {
        containerEl.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        containerEl.removeEventListener('mouseleave', handleMouseLeave);
        containerEl.removeEventListener('contextmenu', handleContextMenu);
        containerEl.removeEventListener('dblclick', handleDblClick);
      }
      for (const [, pl] of priceLineMapRef.current.entries()) {
        try {
          candleSeriesRef.current?.removePriceLine(pl);
        } catch (_) {}
      }
      priceLineMapRef.current.clear();
      isDraggingLineRef.current = null;
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema150SeriesRef.current = null;
      ema200SeriesRef.current = null;
      upperEnvSeriesRef.current = null;
      lowerEnvSeriesRef.current = null;
      dynTrendSeriesRef.current = null;
      if (smcPrimitiveRef.current && candleSeriesRef.current) {
        try {
          candleSeriesRef.current.detachPrimitive(smcPrimitiveRef.current);
        } catch (_) {}
      }
      smcPrimitiveRef.current = null;
      smcFastSmaSeriesRef.current = null;
      smcSlowSmaSeriesRef.current = null;
      anchoredVwapSeriesRef.current = null;
      anchoredUpperBandSeriesRef.current = null;
      anchoredLowerBandSeriesRef.current = null;
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
    };
  }, [activeSubPanes, applyPaneLayoutHeights]); // Rebuild chart when active sub-panes or layout changes

  // Update Data when displayBars or calculated markers change
  useEffect(() => {
    if (!chartRef.current || displayBars.length === 0) return;

    // Prepare arrays
    const recolorCandles = indicatorConfig.trendSpeed?.visible &&
      indicatorConfig.trendSpeed?.enableCandles &&
      indicatorConfig.trendSpeed?.plotCandleVisible &&
      trendSpeedResult;

    const candleData = displayBars.map((b, idx) => {
      const spColor = recolorCandles ? trendSpeedResult.barColor[idx] : undefined;
      return {
        time: formatBarTime(b.time),
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        ...(spColor ? {
          color: spColor,
          borderColor: spColor,
          wickColor: spColor,
        } : {}),
      };
    });

    const areaData = displayBars.map(b => ({
      time: formatBarTime(b.time),
      value: b.close,
    }));

    const e50Data = displayBars
      .filter(b => b.ema50 !== null)
      .map(b => ({ time: formatBarTime(b.time), value: b.ema50! }));

    const e150Data = displayBars
      .filter(b => b.ema150 !== null)
      .map(b => ({ time: formatBarTime(b.time), value: b.ema150! }));

    const e200Data = displayBars
      .filter(b => b.ema200 !== null)
      .map(b => ({ time: formatBarTime(b.time), value: b.ema200! }));

    const envPct = (indicatorConfig.envelope.percent || 4.0) / 100;
    const upperEnvData = displayBars
      .filter(b => b.ema200 !== null)
      .map(b => ({ time: formatBarTime(b.time), value: Number((b.ema200! * (1 + envPct)).toFixed(2)) }));

    const lowerEnvData = displayBars
      .filter(b => b.ema200 !== null)
      .map(b => ({ time: formatBarTime(b.time), value: Number((b.ema200! * (1 - envPct)).toFixed(2)) }));

    const mcdxData: BankerMCDXData[] = displayBars.map(b => ({
      time: formatBarTime(b.time),
      banker: b.banker,
      hotMoney: b.hotMoney,
      retail: b.retail,
    }));

    const bMaData = displayBars.map(b => ({
      time: formatBarTime(b.time),
      value: b.bankerMa,
    }));

    candleSeriesRef.current?.setData(candleData);
    areaSeriesRef.current?.setData(areaData);
    ema50SeriesRef.current?.setData(e50Data);
    ema150SeriesRef.current?.setData(e150Data);
    ema200SeriesRef.current?.setData(e200Data);
    upperEnvSeriesRef.current?.setData(upperEnvData);
    lowerEnvSeriesRef.current?.setData(lowerEnvData);
    mcdxSeriesRef.current?.setData(mcdxData as any);
    bankerMaSeriesRef.current?.setData(bMaData);

    if (ultimateRSIResult) {
      const arsiData: any[] = [];
      const arsiRawData: any[] = [];
      const sigData: any[] = [];
      const obVal = indicatorConfig.ultimateRsi.obValue;
      const osVal = indicatorConfig.ultimateRsi.osValue;
      const obColor = indicatorConfig.ultimateRsi.obColor || '#089981';
      const osColor = indicatorConfig.ultimateRsi.osColor || '#F23645';
      const rsiColor = indicatorConfig.ultimateRsi.rsiColor || '#FFFFFF';
      const autoColor = indicatorConfig.ultimateRsi.autoColor !== false;

      for (let i = 0; i < displayBars.length; i++) {
        const t = formatBarTime(displayBars[i].time);
        const aVal = ultimateRSIResult.arsi[i];
        const sVal = ultimateRSIResult.signal[i];

        if (aVal !== null) {
          arsiRawData.push({ time: t, value: aVal });

          if (!autoColor) {
            arsiData.push({ time: t, value: aVal, color: rsiColor });
          } else {
            // TradingView Style: ARSI only renders when in extreme zones (> obValue or < osValue)
            // Above obValue -> uses Overbought color (obColor)
            // Below osValue -> uses Oversold color (osColor)
            const isCurrOb = aVal > obVal;
            const isCurrOs = aVal < osVal;
            const isCurrExtreme = isCurrOb || isCurrOs;

            const prevVal = i > 0 ? ultimateRSIResult.arsi[i - 1] : null;
            const isPrevOb = prevVal !== null && prevVal > obVal;
            const isPrevOs = prevVal !== null && prevVal < osVal;
            const isPrevExtreme = isPrevOb || isPrevOs;

            let pointColor = 'transparent';
            if (isCurrOb || isPrevOb) {
              pointColor = obColor;
            } else if (isCurrOs || isPrevOs) {
              pointColor = osColor;
            }

            // Connect smoothly into and out of extreme zones
            const showLine = isCurrExtreme || isPrevExtreme;
            arsiData.push({
              time: t,
              value: aVal,
              color: showLine ? pointColor : 'transparent',
            });
          }
        }
        if (sVal !== null) {
          sigData.push({ time: t, value: sVal });
        }
      }
      rsiAreaSeriesRef.current?.setData(arsiRawData);
      rsiSeriesRef.current?.setData(arsiData);
      rsiSignalSeriesRef.current?.setData(sigData);
      rsiMarkersPluginRef.current?.setMarkers(indicatorConfig.ultimateRsi.visible ? calculatedRsiMarkers : []);
    }

    if (trendSpeedResult) {
      if (dynTrendSeriesRef.current) {
        const dynData: any[] = [];
        for (let i = 0; i < displayBars.length; i++) {
          const val = trendSpeedResult.dynEma[i];
          if (val !== null) {
            dynData.push({
              time: formatBarTime(displayBars[i].time),
              value: val,
              color: trendSpeedResult.dynTrendColor[i],
            });
          }
        }
        dynTrendSeriesRef.current.setData(dynData);
      }

      if (trendSpeedHistSeriesRef.current) {
        const histData: any[] = [];
        for (let i = 0; i < displayBars.length; i++) {
          const sp = trendSpeedResult.trendSpeed[i];
          if (sp !== null) {
            histData.push({
              time: formatBarTime(displayBars[i].time),
              value: sp,
              color: trendSpeedResult.barColor[i],
            });
          }
        }
        trendSpeedHistSeriesRef.current.setData(histData);
      }
    }

    // SMC Lite Data Feed (Fast SMA, Slow SMA, and Primitive Canvas)
    if (smcLiteResult && indicatorConfig.smcLite?.visible) {
      if (smcFastSmaSeriesRef.current) {
        const fastData: any[] = [];
        for (let i = 0; i < displayBars.length; i++) {
          const val = smcLiteResult.fastSMA[i];
          if (val !== null && !isNaN(val)) {
            fastData.push({ time: formatBarTime(displayBars[i].time), value: val });
          }
        }
        smcFastSmaSeriesRef.current.setData(fastData);
      }
      if (smcSlowSmaSeriesRef.current) {
        const slowData: any[] = [];
        for (let i = 0; i < displayBars.length; i++) {
          const val = smcLiteResult.slowSMA[i];
          if (val !== null && !isNaN(val)) {
            slowData.push({ time: formatBarTime(displayBars[i].time), value: val });
          }
        }
        smcSlowSmaSeriesRef.current.setData(slowData);
      }
      smcPrimitiveRef.current?.setData(smcLiteResult, indicatorConfig.smcLite);
    } else {
      smcFastSmaSeriesRef.current?.setData([]);
      smcSlowSmaSeriesRef.current?.setData([]);
      if (smcPrimitiveRef.current && indicatorConfig.smcLite) {
        smcPrimitiveRef.current.setData(
          {
            activeSupplyZones: [],
            activeDemandZones: [],
            bosLines: [],
            zigzagPoints: [],
            priceActionLabels: [],
            fastSMA: [],
            slowSMA: [],
            signals: [],
          },
          indicatorConfig.smcLite
        );
      }
    }

    // Anchored VWAP Data Feed
    if (anchoredVWAPResult && indicatorConfig.anchoredVwap?.visible) {
      const vwapData: any[] = [];
      const upperData: any[] = [];
      const lowerData: any[] = [];
      for (let i = 0; i < displayBars.length; i++) {
        const t = formatBarTime(displayBars[i].time);
        const v = anchoredVWAPResult.vwap[i];
        const ub = anchoredVWAPResult.upperBand[i];
        const lb = anchoredVWAPResult.lowerBand[i];
        if (v !== null && !isNaN(v)) vwapData.push({ time: t, value: v });
        if (ub !== null && !isNaN(ub)) upperData.push({ time: t, value: ub });
        if (lb !== null && !isNaN(lb)) lowerData.push({ time: t, value: lb });
      }
      anchoredVwapSeriesRef.current?.setData(vwapData);
      anchoredUpperBandSeriesRef.current?.setData(upperData);
      anchoredLowerBandSeriesRef.current?.setData(lowerData);
    } else {
      anchoredVwapSeriesRef.current?.setData([]);
      anchoredUpperBandSeriesRef.current?.setData([]);
      anchoredLowerBandSeriesRef.current?.setData([]);
    }

    markersPluginRef.current?.setMarkers(pane0Markers);

    // Apply current timeframe range
    applyTimeframeRange(timeframe);
  }, [
    displayBars,
    calculatedMarkers,
    calculatedRsiMarkers,
    pane0Markers,
    ultimateRSIResult,
    trendSpeedResult,
    indicatorConfig.signals.visible,
    indicatorConfig.signals.padding,
    indicatorConfig.signals.size,
    indicatorConfig.signals.colors,
    indicatorConfig.ultimateRsi.visible,
    indicatorConfig.ultimateRsi.autoColor,
    indicatorConfig.ultimateRsi.obValue,
    indicatorConfig.ultimateRsi.osValue,
    indicatorConfig.ultimateRsi.obColor,
    indicatorConfig.ultimateRsi.osColor,
    indicatorConfig.ultimateRsi.rsiColor,
    indicatorConfig.ultimateRsi.showArea,
    indicatorConfig.trendSpeed,
    indicatorConfig.envelope.percent,
    timeframe,
    activeSubPanes,
  ]);

  // Handle Style Switching
  useEffect(() => {
    if (!candleSeriesRef.current || !areaSeriesRef.current) return;
    if (chartStyle === 'AREA') {
      candleSeriesRef.current.applyOptions({ visible: false });
      areaSeriesRef.current.applyOptions({ visible: true });
    } else {
      candleSeriesRef.current.applyOptions({ visible: true });
      areaSeriesRef.current.applyOptions({ visible: false });
    }
  }, [chartStyle]);

  // Synchronize dynamic series options when indicatorConfig changes
  useEffect(() => {
    const sSize = indicatorConfig.signals.size ?? 1.2;
    const fSize = sSize <= 0.9 ? 11 : sSize <= 1.2 ? 13 : sSize <= 1.5 ? 15 : 18;
    chartRef.current?.applyOptions({ layout: { fontSize: fSize } });

    const showLabels = indicatorConfig.showAxisLabels;

    ema50SeriesRef.current?.applyOptions({
      color: indicatorConfig.ema1.color,
      lineWidth: indicatorConfig.ema1.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema1.lineStyle),
      visible: indicatorConfig.ema1.visible,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema1.period}` : '',
    });
    ema150SeriesRef.current?.applyOptions({
      color: indicatorConfig.ema2.color,
      lineWidth: indicatorConfig.ema2.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema2.lineStyle),
      visible: indicatorConfig.ema2.visible,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema2.period}` : '',
    });
    ema200SeriesRef.current?.applyOptions({
      color: indicatorConfig.ema3.color,
      lineWidth: indicatorConfig.ema3.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema3.lineStyle),
      visible: indicatorConfig.ema3.visible,
      lastValueVisible: showLabels,
      title: showLabels ? `EMA ${indicatorConfig.ema3.period}` : '',
    });
    upperEnvSeriesRef.current?.applyOptions({
      color: indicatorConfig.envelope.color,
      lineWidth: indicatorConfig.envelope.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.envelope.lineStyle),
      visible: indicatorConfig.envelope.visible,
      title: showLabels ? `+${indicatorConfig.envelope.percent}% Bedrock` : '',
    });
    lowerEnvSeriesRef.current?.applyOptions({
      color: indicatorConfig.envelope.color,
      lineWidth: indicatorConfig.envelope.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.envelope.lineStyle),
      visible: indicatorConfig.envelope.visible,
      title: showLabels ? `-${indicatorConfig.envelope.percent}% Bedrock` : '',
    });
    mcdxSeriesRef.current?.applyOptions({
      visible: indicatorConfig.mcdx.visible,
      lastValueVisible: showLabels,
      title: showLabels ? 'MCDX' : '',
      priceLineVisible: false,
      bankerColor: indicatorConfig.mcdx.bankerColor,
      hotMoneyColor: indicatorConfig.mcdx.hotMoneyColor,
      retailColor: indicatorConfig.mcdx.retailColor,
    } as any);
    // CRITICAL: Custom series (BankerMCDXPlugin) does NOT repaint on applyOptions alone.
    // Must re-call setData to trigger update() -> draw() cycle in the plugin renderer.
    if (mcdxSeriesRef.current && displayBars.length > 0) {
      const mcdxData: BankerMCDXData[] = displayBars.map(b => ({
        time: formatBarTime(b.time),
        banker: b.banker,
        hotMoney: b.hotMoney,
        retail: b.retail,
      }));
      mcdxSeriesRef.current.setData(mcdxData as any);
    }
    bankerMaSeriesRef.current?.applyOptions({
      visible: indicatorConfig.mcdx.visible,
      lastValueVisible: showLabels,
      title: showLabels ? 'Banker MA' : '',
      priceLineVisible: false,
      color: indicatorConfig.mcdx.maColor || '#FFFFFF',
      lineWidth: (indicatorConfig.mcdx.maWidth || 2) as any,
    });
    const obColor = indicatorConfig.ultimateRsi.obColor || '#089981';
    const osColor = indicatorConfig.ultimateRsi.osColor || '#F23645';
    const isRsiVisible = indicatorConfig.ultimateRsi.visible && indicatorConfig.ultimateRsi.rsiVisible !== false;
    const isSigVisible = indicatorConfig.ultimateRsi.visible && indicatorConfig.ultimateRsi.signalVisible !== false;
    const showArea = indicatorConfig.ultimateRsi.showArea !== false;
    const isObVisible = indicatorConfig.ultimateRsi.obVisible !== false;
    const isMidVisible = indicatorConfig.ultimateRsi.midVisible !== false;
    const isOsVisible = indicatorConfig.ultimateRsi.osVisible !== false;

    const midVal = indicatorConfig.ultimateRsi.midValue ?? 50;

    rsiAreaSeriesRef.current?.applyOptions({
      baseValue: { type: 'price', price: midVal },
      topFillColor1: hexToRgba(obColor, 0.35),
      topFillColor2: hexToRgba(obColor, 0.03),
      bottomFillColor1: hexToRgba(osColor, 0.03),
      bottomFillColor2: hexToRgba(osColor, 0.35),
      visible: isRsiVisible && showArea,
    });
    rsiSeriesRef.current?.applyOptions({
      visible: isRsiVisible,
      lastValueVisible: showLabels,
      title: showLabels ? 'ARSI (Extremes)' : '',
      priceLineVisible: false,
    });
    rsiSignalSeriesRef.current?.applyOptions({
      visible: isSigVisible,
      color: indicatorConfig.ultimateRsi.signalColor,
      lastValueVisible: showLabels,
      title: showLabels ? 'Signal' : '',
      priceLineVisible: false,
    });
    mcdxStrikeLineRef.current?.applyOptions({
      axisLabelVisible: showLabels,
      title: showLabels ? '10 STRIKE' : '',
    });
    rsiObLineRef.current?.applyOptions({
      price: indicatorConfig.ultimateRsi.obValue,
      color: isObVisible ? obColor : 'transparent',
      axisLabelVisible: showLabels && isObVisible,
      title: showLabels && isObVisible ? `${indicatorConfig.ultimateRsi.obValue} OB` : '',
    });
    rsiMidLineRef.current?.applyOptions({
      price: indicatorConfig.ultimateRsi.midValue ?? 50,
      color: isMidVisible ? (indicatorConfig.ultimateRsi.midColor || 'rgba(255, 255, 255, 0.25)') : 'transparent',
      axisLabelVisible: false,
      title: showLabels && isMidVisible ? `${indicatorConfig.ultimateRsi.midValue ?? 50} MID` : '',
    });
    rsiOsLineRef.current?.applyOptions({
      price: indicatorConfig.ultimateRsi.osValue,
      color: isOsVisible ? osColor : 'transparent',
      axisLabelVisible: showLabels && isOsVisible,
      title: showLabels && isOsVisible ? `${indicatorConfig.ultimateRsi.osValue} OS` : '',
    });

    const isDynTrendVisible = indicatorConfig.trendSpeed?.visible && indicatorConfig.trendSpeed?.dynamicTrendVisible;
    dynTrendSeriesRef.current?.applyOptions({
      visible: isDynTrendVisible,
      color: indicatorConfig.trendSpeed?.upTrendColor ?? '#F7D02C',
      lineWidth: (indicatorConfig.trendSpeed?.dynamicTrendLineWidth ?? 2) as any,
      lastValueVisible: showLabels,
      title: showLabels ? 'Dyn Trend' : '',
    });

    const isTrendSpeedVisible = indicatorConfig.trendSpeed?.visible && indicatorConfig.trendSpeed?.trendSpeedVisible;
    trendSpeedHistSeriesRef.current?.applyOptions({
      visible: isTrendSpeedVisible,
      lastValueVisible: showLabels,
      title: showLabels ? 'Trend Speed' : '',
    });

    // Update SMC Lite SMAs and Primitive
    const isSmcVisible = indicatorConfig.smcLite?.visible;
    const isSmcFastVisible = isSmcVisible && (indicatorConfig.smcLite?.showFastSMA ?? false) && (indicatorConfig.smcLite?.showSMA ?? true);
    smcFastSmaSeriesRef.current?.applyOptions({
      visible: isSmcFastVisible,
      color: indicatorConfig.smcLite?.fastSMAColor ?? '#3B82F6',
      lineWidth: (indicatorConfig.smcLite?.fastLineWidth ?? 1) as any,
      lastValueVisible: showLabels,
      title: showLabels ? `SMA ${indicatorConfig.smcLite?.smaFastLen ?? 15}` : '',
    });

    const isSmcSlowVisible = isSmcVisible && (indicatorConfig.smcLite?.showSlowSMA ?? true) && (indicatorConfig.smcLite?.showSMA ?? true);
    smcSlowSmaSeriesRef.current?.applyOptions({
      visible: isSmcSlowVisible,
      color: indicatorConfig.smcLite?.slowSMAColor ?? '#F59E0B',
      lineWidth: (indicatorConfig.smcLite?.slowLineWidth ?? 2) as any,
      lastValueVisible: showLabels,
      title: showLabels ? `SMA ${indicatorConfig.smcLite?.smaSlowLen ?? 200}` : '',
    });

    if (smcPrimitiveRef.current && indicatorConfig.smcLite) {
      smcPrimitiveRef.current.setData(
        smcLiteResult || {
          activeSupplyZones: [],
          activeDemandZones: [],
          bosLines: [],
          zigzagPoints: [],
          priceActionLabels: [],
          fastSMA: [],
          slowSMA: [],
          signals: [],
        },
        indicatorConfig.smcLite
      );
    }

    // Update Anchored VWAP options
    const isAvwapVisible = indicatorConfig.anchoredVwap?.visible;
    anchoredVwapSeriesRef.current?.applyOptions({
      visible: isAvwapVisible && (indicatorConfig.anchoredVwap?.vwapVisible ?? true),
      color: indicatorConfig.anchoredVwap?.vwapColor ?? '#FFFFFF',
      lineWidth: (indicatorConfig.anchoredVwap?.vwapLineWidth ?? 3) as any,
      lineStyle: getChartLineStyle(indicatorConfig.anchoredVwap?.vwapLineStyle ?? 'Solid'),
      lastValueVisible: showLabels,
      title: showLabels ? 'VWAP' : '',
    });

    anchoredUpperBandSeriesRef.current?.applyOptions({
      visible: isAvwapVisible && (indicatorConfig.anchoredVwap?.showBands ?? true) && (indicatorConfig.anchoredVwap?.upperBandVisible ?? false),
      color: indicatorConfig.anchoredVwap?.upperBandColor ?? '#94A3B8',
      lineWidth: (indicatorConfig.anchoredVwap?.upperBandLineWidth ?? 2) as any,
      lineStyle: getChartLineStyle(indicatorConfig.anchoredVwap?.upperBandLineStyle ?? 'Dashed'),
      lastValueVisible: showLabels,
      title: showLabels ? 'Upper Band' : '',
    });

    anchoredLowerBandSeriesRef.current?.applyOptions({
      visible: isAvwapVisible && (indicatorConfig.anchoredVwap?.showBands ?? true) && (indicatorConfig.anchoredVwap?.lowerBandVisible ?? false),
      color: indicatorConfig.anchoredVwap?.lowerBandColor ?? '#94A3B8',
      lineWidth: (indicatorConfig.anchoredVwap?.lowerBandLineWidth ?? 2) as any,
      lineStyle: getChartLineStyle(indicatorConfig.anchoredVwap?.lowerBandLineStyle ?? 'Dashed'),
      lastValueVisible: showLabels,
      title: showLabels ? 'Lower Band' : '',
    });

    markersPluginRef.current?.setMarkers(pane0Markers);
    rsiMarkersPluginRef.current?.setMarkers(indicatorConfig.ultimateRsi.visible ? calculatedRsiMarkers : []);

    applyPaneLayoutHeights(chartRef.current, indicatorConfig, maximizedPane);

    // Update pane offsets for floating toolbar positioning after layout paint
    requestAnimationFrame(() => {
      const container = chartContainerRef.current;
      const panes = chartRef.current?.panes();
      if (!container || !panes) return;
      const containerRect = container.getBoundingClientRect();
      const newOffsets: Record<number, { top: number; height: number }> = {};
      for (let i = 1; i < panes.length; i++) {
        try {
          const el = panes[i].getHTMLElement();
          if (el) {
            const paneRect = el.getBoundingClientRect();
            newOffsets[i] = {
              top: Math.max(0, paneRect.top - containerRect.top),
              height: paneRect.height,
            };
          }
        } catch (e) {}
      }
      setPaneOffsets(newOffsets);
    });
  }, [indicatorConfig, displayBars, calculatedMarkers, calculatedRsiMarkers, pane0Markers, smcLiteResult, anchoredVWAPResult, superMoneySignalResult, activeSubPanes, maximizedPane, applyPaneLayoutHeights]);

  // Handle Fullscreen resize trigger
  useEffect(() => {
    if (!chartRef.current) return;
    const timer = setTimeout(() => {
      chartRef.current?.resize(
        chartContainerRef.current?.clientWidth || 800,
        chartContainerRef.current?.clientHeight || 600,
        true
      );
    }, 50);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // ResizeObserver: recalculate pane offsets when container resizes
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

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateOffsets);
    });
    ro.observe(container);

    // CRITICAL: Observe EACH individual pane element so dragging pane splitters immediately updates toolbar positions!
    const panes = chartRef.current?.panes();
    if (panes) {
      panes.forEach(p => {
        try {
          const el = p.getHTMLElement?.();
          if (el) ro.observe(el);
        } catch (e) {}
      });
    }

    // Flag to ensure we ONLY save height when user was actually dragging a splitter
    let isDraggingSplitter = false;

    const handleSplitterGrab = (e: MouseEvent | PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const cursor = target.style?.cursor || window.getComputedStyle(target).cursor;
      const isSplitter = cursor === 'row-resize' || !!target.closest('tr')?.style?.height.includes('1px');
      if (!isSplitter) return;

      isDraggingSplitter = true;
    };

    // Save pane height changes on user mouseup/pointerup ONLY after dragging splitters
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

    // Initial offset calculation
    requestAnimationFrame(updateOffsets);

    return () => {
      ro.disconnect();
      container.removeEventListener('mousedown', handleSplitterGrab, true);
      container.removeEventListener('pointerdown', handleSplitterGrab, true);
      window.removeEventListener('mouseup', handleSplitterRelease);
      window.removeEventListener('pointerup', handleSplitterRelease);
    };
  }, [activeSubPanes, maximizedPane]);

  // -------------------------------------------------------------
  // Adaptive Heartbeat: Real-time Live Candle Polling
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let timer: any = null;

    const pollLiveQuote = async () => {
      // 1. Check tab visibility
      if (document.visibilityState !== 'visible') {
        setIsLiveActive(false);
        return;
      }

      // 2. Check US market hours
      const marketOpen = isUsMarketOpen();
      setIsMarketOpen(marketOpen);

      if (!marketOpen) {
        setIsLiveActive(false);
        return;
      }

      setIsLiveActive(true);

      try {
        const res: any = await api.prices.latest([symbol]);
        const quote = res?.[symbol];

        if (quote && quote.price && isMounted) {
          const newPrice = Number(quote.price);
          setLivePrice(newPrice);
          setLiveChangePercent(quote.percent_change ?? 0);

          // Update the last candle in real-time
          if (candleSeriesRef.current && displayBars.length > 0) {
            const lastBar = displayBars[displayBars.length - 1];
            const updatedHigh = Math.max(lastBar.high, newPrice);
            const updatedLow = Math.min(lastBar.low, newPrice);

            candleSeriesRef.current.update({
              time: lastBar.time as Time,
              open: lastBar.open,
              high: updatedHigh,
              low: updatedLow,
              close: newPrice,
            });

            if (areaSeriesRef.current) {
              areaSeriesRef.current.update({
                time: lastBar.time as Time,
                value: newPrice,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[LWChart] Live pulse failed:', err);
      }
    };

    // Run pulse immediately
    pollLiveQuote();

    // Heartbeat every 30s
    timer = setInterval(pollLiveQuote, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollLiveQuote();
      } else {
        setIsLiveActive(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [symbol, displayBars]);

  // Current active legend data (hovered bar, or latest bar by default)
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

  return (
    <div
      className={`relative flex flex-col bg-[#0A0E17] border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl transition-all select-none ${
        isFullscreen
          ? 'fixed inset-0 z-[100] w-screen h-screen rounded-none border-none p-4'
          : `w-full ${className}`
      }`}
      style={{ fontFamily: TV_FONT_FAMILY }}
    >
      {/* ----------------------------------------------------------- */}
      {/* TOP MASTER CONTROLS BAR                                      */}
      {/* ----------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0D1322] border-b border-slate-800/80">
        
        {/* LEFT: Stock Info + Live Pulse Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-wider text-slate-100">{symbol}</span>
            <span className="text-base font-bold text-amber-400">
              ${(livePrice || currentPrice).toFixed(2)}
            </span>
            <span
              className={`text-sm font-semibold flex items-center gap-0.5 ${
                activePercentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {activePercentChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {activePercentChange >= 0 ? '+' : ''}
              {activePercentChange.toFixed(2)}%
            </span>
          </div>

          {/* Live Heartbeat Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-bold tracking-wide border transition-all ${
              isLiveActive && isMarketOpen
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900 border-slate-700/60 text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveActive && isMarketOpen ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            {isLiveActive && isMarketOpen ? 'LIVE 30s' : 'CLOSED'}
          </div>

          {/* Badge & Scenario Pill */}
          {badge && (
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-md bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[13px] font-bold">
              {badge}
            </span>
          )}

          {trafficLight === 'BUY_ZONE' && (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-[13px] font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> BUY ZONE
            </span>
          )}
        </div>

        {/* RIGHT: Switchers & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Resolution: 4H | 1D | 1W */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/50">
            {canShow4H && (
              <button
                onClick={() => setResolution('4H')}
                className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
                  resolution === '4H'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="4-Hour Intraday Candles (USD/THB)"
              >
                4H
              </button>
            )}
            <button
              onClick={() => setResolution('1D')}
              className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
                resolution === '1D'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setResolution('1W')}
              className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
                resolution === '1W'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Week
            </button>
          </div>

          {/* Chart Style: Candle | Heikin-Ashi | Area */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setChartStyle('CANDLE')}
              className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all ${
                chartStyle === 'CANDLE'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Candle
            </button>
            <button
              onClick={() => setChartStyle('HEIKIN_ASHI')}
              className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all ${
                chartStyle === 'HEIKIN_ASHI'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              HA
            </button>
            <button
              onClick={() => setChartStyle('AREA')}
              className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all ${
                chartStyle === 'AREA'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Area
            </button>
          </div>

          {/* Indicators Dropdown Menu (TradingView Style) */}
          <div className="relative">
            <button
              type="button"
              data-indicator-trigger="true"
              onClick={() => setIsIndicatorOpen(prev => !prev)}
              title="Indicator Manager & Custom Settings"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold border transition-all cursor-pointer ${
                isIndicatorOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)] font-extrabold'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Indicators</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-400 text-[11px] font-black">
                {[
                  indicatorConfig.ema1.visible,
                  indicatorConfig.ema2.visible,
                  indicatorConfig.ema3.visible,
                  indicatorConfig.envelope.visible,
                  indicatorConfig.signals.visible,
                  indicatorConfig.mcdx.visible,
                  indicatorConfig.ultimateRsi.visible,
                  indicatorConfig.trendSpeed?.visible,
                ].filter(Boolean).length}
              </span>
            </button>

            {isIndicatorOpen && (
              <IndicatorManagerPopover
                initialView={indicatorInitialView}
                onClose={() => {
                  setIsIndicatorOpen(false);
                  setIndicatorInitialView('list');
                }}
              />
            )}
          </div>

          {/* Timeframe Presets: 10M | 1Y | 5Y | ALL */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/50">
            {(['10M', '1Y', '5Y', 'ALL'] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => applyTimeframeRange(tf)}
                className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
                title={`View ${tf} Range`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Reset Zoom & Auto-Scale */}
          <button
            onClick={() => applyTimeframeRange('10M')}
            title="Reset Zoom to 10M Default & Auto-Scale (or Double-Click Chart)"
            className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Allocate Inflow (Moved to Top Toolbar for Project 2X) */}
          {onAddInflow && (
            <button
              onClick={onAddInflow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-[13px] font-extrabold shadow-md hover:bg-emerald-400 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Allocate Inflow
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            title="Toggle Fullscreen View (Key: F)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 text-[13px] font-bold hover:bg-cyan-900/60 transition-all shadow-md"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isFullscreen ? 'Exit [ESC]' : 'Full [F]'}
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* REAL-TIME FLOATING LEGEND STRIP                             */}
      {/* ----------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 bg-[#080C14]/95 border-b border-slate-800/50 text-[13px] text-slate-300">
        {activeLegend ? (
          <>
            <span className="font-bold text-slate-100">
              {activeLegend.time.includes('T') ? activeLegend.time.replace('T', ' ').slice(0, 16) + ' UTC' : activeLegend.time}
            </span>
            <span>
              O: <strong className="text-slate-200">${activeLegend.open.toFixed(2)}</strong>
            </span>
            <span>
              H: <strong className="text-slate-200">${activeLegend.high.toFixed(2)}</strong>
            </span>
            <span>
              L: <strong className="text-slate-200">${activeLegend.low.toFixed(2)}</strong>
            </span>
            <span>
              C:{' '}
              <strong className={activePercentChange >= 0 ? 'text-amber-300' : 'text-rose-400'}>
                ${activeLegend.close.toFixed(2)}
              </strong>
            </span>
            {indicatorConfig.ema1.visible && activeLegend.ema50 && (
              <span className="hidden sm:inline">
                EMA{indicatorConfig.ema1.period}: <strong style={{ color: indicatorConfig.ema1.color }}>${activeLegend.ema50.toFixed(2)}</strong>
              </span>
            )}
            {indicatorConfig.ema2.visible && activeLegend.ema150 && (
              <span className="hidden sm:inline">
                EMA{indicatorConfig.ema2.period}: <strong style={{ color: indicatorConfig.ema2.color }}>${activeLegend.ema150.toFixed(2)}</strong>
              </span>
            )}
            {indicatorConfig.ema3.visible && activeLegend.ema200 && (
              <span className="hidden sm:inline">
                EMA{indicatorConfig.ema3.period}: <strong style={{ color: indicatorConfig.ema3.color }}>${activeLegend.ema200.toFixed(2)}</strong>
              </span>
            )}
            {indicatorConfig.superMoneySignal?.visible && superMoneySignalResult && indicatorConfig.superMoneySignal?.showPaneLabels && (
              <span className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
                <span className="text-slate-400">Signal:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold shadow-sm ${
                  superMoneySignalResult.currentDirection === 1
                    ? 'bg-white text-slate-950 font-black'
                    : superMoneySignalResult.currentDirection === 2
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : superMoneySignalResult.currentDirection === -1
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {superMoneySignalResult.currentStatusText}
                </span>
              </span>
            )}
            <span className="flex items-center gap-1">
              Banker:{' '}
              <strong className="font-extrabold" style={{ color: indicatorConfig.mcdx.bankerColor || '#F87171' }}>{activeLegend.banker.toFixed(1)}</strong>
              /20
            </span>
            <span className="hidden md:inline text-slate-300">
              HotMoney: <strong style={{ color: indicatorConfig.mcdx.hotMoneyColor || '#FFF176' }}>{activeLegend.hotMoney.toFixed(1)}</strong>
            </span>
            <span className="hidden md:inline text-slate-300">
              Retail: <strong style={{ color: indicatorConfig.mcdx.retailColor || '#1B5E20' }}>{activeLegend.retail.toFixed(1)}</strong>
            </span>
            {indicatorConfig.ultimateRsi.visible && (
              (() => {
                const rsiInfo = activeLegend ? rsiDataByDate.get(activeLegend.time) : null;
                if (!rsiInfo) return null;
                const arsiVal = rsiInfo.arsi;
                const sigVal = rsiInfo.signal;
                const isOB = arsiVal !== null && arsiVal >= indicatorConfig.ultimateRsi.obValue;
                const isOS = arsiVal !== null && arsiVal <= indicatorConfig.ultimateRsi.osValue;
                const color = isOB ? indicatorConfig.ultimateRsi.obColor : isOS ? indicatorConfig.ultimateRsi.osColor : '#E2E8F0';

                return (
                  <span className="flex items-center gap-2 border-l border-slate-700 pl-3">
                    <span>
                      ARSI({indicatorConfig.ultimateRsi.length}):{' '}
                      <strong style={{ color }}>{arsiVal !== null ? arsiVal.toFixed(2) : '--'}</strong>
                    </span>
                    <span>
                      Sig:{' '}
                      <strong style={{ color: indicatorConfig.ultimateRsi.signalColor }}>
                        {sigVal !== null ? sigVal.toFixed(2) : '--'}
                      </strong>
                    </span>
                    {rsiInfo.buyCross && (
                      <span className="px-1.5 py-0.2 rounded bg-white text-slate-950 font-black text-[11px] shadow-sm animate-pulse">
                        BUY
                      </span>
                    )}
                    {rsiInfo.reversal && (
                      <span className="px-1.5 py-0.2 rounded bg-[#FFE600] text-slate-950 font-black text-[11px] shadow-sm">
                        REV
                      </span>
                    )}
                    {rsiInfo.buyZone && (
                      <span className="px-1.5 py-0.2 rounded bg-[#D0FF00] text-slate-950 font-black text-[11px] shadow-sm">
                        ZONE
                      </span>
                    )}
                  </span>
                );
              })()
            )}
            {indicatorConfig.trendSpeed?.visible && (
              (() => {
                const tsInfo = activeLegend ? trendSpeedDataByDate.get(activeLegend.time) : null;
                if (!tsInfo) return null;
                return (
                  <span className="flex items-center gap-2 border-l border-slate-700 pl-3">
                    <span>
                      Speed:{' '}
                      <strong style={{ color: tsInfo.color }}>
                        {tsInfo.speed !== null ? tsInfo.speed.toFixed(2) : '--'}
                      </strong>
                    </span>
                    {indicatorConfig.trendSpeed?.dynamicTrendVisible && tsInfo.dynEma !== null && (
                      <span className="hidden lg:inline">
                        Dyn:{' '}
                        <strong style={{ color: tsInfo.dynColor }}>
                          ${tsInfo.dynEma.toFixed(2)}
                        </strong>
                      </span>
                    )}
                  </span>
                );
              })()
            )}
          </>
        ) : (
          <span className="text-slate-400 italic text-[13px]">Scroll to zoom • Drag anywhere for 2D Pan • Double-click to reset</span>
        )}
      </div>

      {/* ----------------------------------------------------------- */}
      {/* MAIN BODY: CHART CANVAS + FULLSCREEN WATCHLIST SIDEBAR      */}
      {/* ----------------------------------------------------------- */}
      <div className="relative flex-1 flex overflow-hidden min-h-0 w-full h-full">
        {/* Left Drawing Toolbar (TradingView Style) */}
        <LeftDrawingToolbar symbol={symbol} bars={displayBars} />

        {/* Left: Chart Canvas Container + Floating Pane Toolbars */}
        <div className="relative flex-1 w-full h-full min-h-0">
          <div ref={chartContainerRef} className="w-full h-full min-h-0" />

          {/* Real-time Price Alert Banner */}
          <DrawingAlertBanner />

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
          {indicatorConfig.mcdx.visible && activeSubPanes.paneMap.mcdx && paneOffsets[activeSubPanes.paneMap.mcdx] && (
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
          {indicatorConfig.ultimateRsi.visible && activeSubPanes.paneMap.ultimateRsi && paneOffsets[activeSubPanes.paneMap.ultimateRsi] && (
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
          {indicatorConfig.trendSpeed?.visible && activeSubPanes.paneMap.trendSpeed && paneOffsets[activeSubPanes.paneMap.trendSpeed] && (
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

          {/* Dominance Statistics Floating Table (Zeiierman Dominance Table) */}
          {indicatorConfig.trendSpeed?.visible &&
            indicatorConfig.trendSpeed?.enableTable &&
            indicatorConfig.trendSpeed?.tableVisible &&
            trendSpeedResult?.stats && (
              <div
                className="absolute top-3 right-16 z-20 pointer-events-auto bg-[#090D16]/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-2xl flex flex-col gap-1.5 select-none animate-in fade-in duration-150"
                style={{ fontFamily: TV_FONT_FAMILY }}
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                  <span className="text-[13px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Dominance Wave
                  </span>
                  <span
                    className="text-[13px] font-black px-1.5 py-0.5 rounded"
                    style={{
                      color: trendSpeedResult.stats.dominanceAvgColor,
                      backgroundColor: hexToRgba(trendSpeedResult.stats.dominanceAvgColor, 0.15),
                      border: `1px solid ${hexToRgba(trendSpeedResult.stats.dominanceAvgColor, 0.3)}`,
                    }}
                  >
                    {trendSpeedResult.stats.dominanceAvgText}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Bull Avg:</span>
                    <strong className="text-emerald-400">{trendSpeedResult.stats.bullAvg.toFixed(1)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Bear Avg:</span>
                    <strong className="text-rose-400">{trendSpeedResult.stats.bearAvg.toFixed(1)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Ratio:</span>
                    <strong className="text-slate-200">{trendSpeedResult.stats.waveRatioAvg.toFixed(2)}x</strong>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Current:</span>
                    <strong style={{ color: trendSpeedResult.stats.currentColorAvg }}>
                      {trendSpeedResult.stats.currentTextAvg}
                    </strong>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Right: Quick Watchlist Sidebar (Visible in Fullscreen Mode) */}
        {isFullscreen && watchlist.length > 0 && (
          <div className="w-72 border-l border-slate-800/80 bg-slate-950/60 backdrop-blur-md p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-slate-200">QUICK WATCHLIST</span>
              <span className="text-[13px] font-semibold text-slate-400">{watchlist.length} Stocks</span>
            </div>

            <div className="flex flex-col gap-2">
              {watchlist.map((item) => {
                const isSelected = item.symbol === symbol;
                const isBuy = item.traffic_light === 'BUY_ZONE';

                return (
                  <button
                    key={item.symbol}
                    onClick={() => onSelectSymbol?.(item.symbol)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                        : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-100 text-sm">{item.symbol}</span>
                        {isBuy && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                            BUY
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-slate-300 font-semibold">
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
