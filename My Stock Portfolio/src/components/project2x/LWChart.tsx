import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  AreaSeries,
  LineSeries,
  createSeriesMarkers,
  ColorType,
  CrosshairMode,
  LineStyle,
  Time,
  SeriesMarker,
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
import { computeEMA } from '../../utils/computeEMA';
import { IndicatorManagerPopover } from '../xchart/IndicatorManagerPopover';
import { LineStyleOption } from '../../types/indicatorConfig';

export const TV_FONT_FAMILY = "'Trebuchet MS', 'Segoe UI Symbol', 'Segoe UI Emoji', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const getChartLineStyle = (opt: LineStyleOption): LineStyle => {
  switch (opt) {
    case 'Dashed': return LineStyle.Dashed;
    case 'Dotted': return LineStyle.Dotted;
    case 'Solid':
    default: return LineStyle.Solid;
  }
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
}

export type TimeFrame = '7D' | '1M' | '3M' | '6M' | '10M' | '1Y' | '5Y' | 'ALL';
export type ChartStyle = 'CANDLE' | 'HEIKIN_ASHI' | 'AREA';
export type Resolution = '1D' | '1W';

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
  const markersPluginRef = useRef<any>(null);
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

  const [resolution, setResolution] = useState<Resolution>(() => {
    try {
      const saved = localStorage.getItem('p2x_lw_resolution');
      if (saved === '1D' || saved === '1W') return saved;
    } catch (e) {}
    return '1D';
  });

  const [isIndicatorOpen, setIsIndicatorOpen] = useState<boolean>(false);
  const indicatorConfig = useIndicatorStore((s) => s.config);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Live Pulse state
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(isUsMarketOpen());
  const [livePrice, setLivePrice] = useState<number>(currentPrice);
  const [liveChangePercent, setLiveChangePercent] = useState<number>(0);

  // Hover Crosshair Legend data
  const [hoveredBar, setHoveredBar] = useState<RawBarItem | null>(null);

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
      const bMaVal = bankerMaSeries[i] ?? bVal;

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
  }, [dates, closes, opens, highs, lows, volumes, activeEma1, activeEma2, activeEma3, bankerSeries, hotMoneySeries, retailSeries, bankerMaSeries]);

  // Aggregate into Weekly bars (if resolution === '1W')
  const aggregatedBars: RawBarItem[] = useMemo(() => {
    if (resolution === '1D' || rawCleanBars.length === 0) return rawCleanBars;

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

  // Map for O(1) hover lookup by date string
  const rawBarsByDate = useMemo(() => {
    const map = new Map<string, RawBarItem>();
    for (const b of aggregatedBars) {
      map.set(b.time, b);
    }
    return map;
  }, [aggregatedBars]);

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
        // Uniform offset measured directly from wick tips (barHigh / barLow)
        const offset = avgRange * (padding * 0.12);
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
          markers.push(makeMarker(bar.time as Time, 'below', bar.high, bar.low, sigColors.goldenStar, 'arrowUp', '★ SUPER', 1.35));
          lastType = 'SUPER';
          continue;
        }
      }

      // STEP 2: ▲ BUY ZONE (At/near EMA support + Banker emerges > 0 on green bar) -> Yellow Triangle below candle
      if (breakout && nearSupport && bVal > 0 && prevBVal === 0 && isBull) {
        if (lastType !== 'BUY') {
          markers.push(makeMarker(bar.time as Time, 'below', bar.high, bar.low, sigColors.breakout, 'arrowUp', '▲ BUY', 1.15));
          lastType = 'BUY';
          continue;
        }
      }

      // STEP 1: ● ● ● READY (Near EMA support, Banker = 0, setup forming) -> 3 dots (● ● ●) below candle
      if (rebound && nearSupport && bVal === 0) {
        if (lastType !== 'READY' && lastType !== 'BUY' && lastType !== 'SUPER') {
          if (i - lastReadyIdx >= 14) {
            markers.push(makeMarker(bar.time as Time, 'below', bar.high, bar.low, sigColors.rebound, 'circle', '', 0, '● ● ●'));
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
        markers.push(makeMarker(bar.time as Time, 'above', bar.high, bar.low, sigColors.pullback, 'arrowDown', '▼ EXIT', 1.15));
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

    // 2. Area Series (for Area Mode)
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: isBullTrend ? 'rgba(255, 230, 0, 0.38)' : 'rgba(198, 40, 40, 0.38)',
      bottomColor: 'rgba(0, 0, 0, 0.0)',
      lineColor: isBullTrend ? '#FFE600' : '#C62828',
      lineWidth: 2,
      visible: chartStyle === 'AREA',
    }, 0);
    areaSeriesRef.current = areaSeries;

    // 3. EMA 1 (Customizable)
    const ema50Series = chart.addSeries(LineSeries, {
      color: indicatorConfig.ema1.color,
      lineWidth: indicatorConfig.ema1.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema1.lineStyle),
      priceLineVisible: false,
      lastValueVisible: true,
      title: `EMA ${indicatorConfig.ema1.period}`,
      visible: indicatorConfig.ema1.visible,
    }, 0);
    ema50SeriesRef.current = ema50Series;

    // 4. EMA 2 (Customizable)
    const ema150Series = chart.addSeries(LineSeries, {
      color: indicatorConfig.ema2.color,
      lineWidth: indicatorConfig.ema2.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema2.lineStyle),
      priceLineVisible: false,
      lastValueVisible: true,
      title: `EMA ${indicatorConfig.ema2.period}`,
      visible: indicatorConfig.ema2.visible,
    }, 0);
    ema150SeriesRef.current = ema150Series;

    // 5. EMA 3 (Customizable Core Bedrock)
    const ema200Series = chart.addSeries(LineSeries, {
      color: indicatorConfig.ema3.color,
      lineWidth: indicatorConfig.ema3.lineWidth as any,
      lineStyle: getChartLineStyle(indicatorConfig.ema3.lineStyle),
      priceLineVisible: false,
      lastValueVisible: true,
      title: `EMA ${indicatorConfig.ema3.period}`,
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
      title: `+${indicatorConfig.envelope.percent}% Bedrock`,
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
      title: `-${indicatorConfig.envelope.percent}% Bedrock`,
      visible: indicatorConfig.envelope.visible,
    }, 0);
    lowerEnvSeriesRef.current = lowerEnvSeries;

    // -------------------------------------------------------------
    // PANE 1: Banker MCDX Sub-Chart
    // -------------------------------------------------------------
    const mcdxSeries = chart.addCustomSeries(
      new BankerMCDXSeriesView(),
      {
        title: 'MCDX',
        priceFormat: {
          type: 'custom',
          minMove: 1,
          formatter: (val: number) => val.toFixed(0),
        },
      },
      1 // Pane index 1!
    );
    mcdxSeriesRef.current = mcdxSeries;

    // Pink Threshold Line (10 Entry Strike)
    mcdxSeries.createPriceLine({
      price: 10,
      color: '#FC2D79',
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      axisLabelVisible: true,
      title: '10 STRIKE',
    });

    // Banker MA Line (White #FFFFFF, overlaying Pane 1)
    const bankerMaSeries = chart.addSeries(LineSeries, {
      color: '#FFFFFF',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: 'Banker MA',
    }, 1);
    bankerMaSeriesRef.current = bankerMaSeries;

    // Configure Pane 1 price scale (maximize vertical bar span from base to ceiling)
    chart.priceScale('right', 1).applyOptions({
      borderColor: 'rgba(255, 255, 255, 0.12)',
      scaleMargins: {
        top: 0.02,
        bottom: 0.0,
      },
    });

    // Adjust Pane 1 Height
    const panes = chart.panes();
    if (panes.length > 1) {
      panes[1].setHeight(135);
    }

    // Initialize Markers Plugin
    const markersPlugin = createSeriesMarkers(candleSeries, indicatorConfig.signals.visible ? calculatedMarkers : []);
    markersPluginRef.current = markersPlugin;

    // Crosshair listener for rich header legend
    chart.subscribeCrosshairMove(param => {
      if (!param.point || !param.time) {
        setHoveredBar(null);
        return;
      }
      const timeStr = String(param.time);
      const raw = rawBarsByDate.get(timeStr);
      if (raw) {
        setHoveredBar(raw);
      }
    });

    // Free 2D Panning (Simultaneous X Time & Y Price Drag)
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      const container = chartContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      // If clicked on right price scale axis (last 60px) or bottom time scale axis (last 26px), let native handlers run
      if (e.clientX > rect.right - 60 || e.clientY > rect.bottom - 26) return;

      isDraggingRef.current = true;
      lastYRef.current = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const container = chartContainerRef.current;
      const candleSeries = candleSeriesRef.current;
      if (!container || !candleSeries) return;

      const deltaY = e.clientY - lastYRef.current;
      if (Math.abs(deltaY) < 1) return;

      const priceScale = candleSeries.priceScale();
      const range = priceScale.getVisibleRange();
      if (!range) return;

      const rect = container.getBoundingClientRect();
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
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleDblClick = (e: MouseEvent) => {
      const container = chartContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (e.clientX > rect.right - 60 || e.clientY > rect.bottom - 26) return;
      candleSeriesRef.current?.priceScale().setAutoScale(true);
    };

    const containerEl = chartContainerRef.current;
    if (containerEl) {
      containerEl.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      containerEl.addEventListener('dblclick', handleDblClick);
    }

    // Clean up
    return () => {
      if (containerEl) {
        containerEl.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        containerEl.removeEventListener('dblclick', handleDblClick);
      }
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema150SeriesRef.current = null;
      ema200SeriesRef.current = null;
      upperEnvSeriesRef.current = null;
      lowerEnvSeriesRef.current = null;
      mcdxSeriesRef.current = null;
      bankerMaSeriesRef.current = null;
      markersPluginRef.current = null;
    };
  }, []); // Run once on mount

  // Update Data when displayBars or calculated markers change
  useEffect(() => {
    if (!chartRef.current || displayBars.length === 0) return;

    // Prepare arrays
    const candleData = displayBars.map(b => ({
      time: b.time as Time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

    const areaData = displayBars.map(b => ({
      time: b.time as Time,
      value: b.close,
    }));

    const e50Data = displayBars
      .filter(b => b.ema50 !== null)
      .map(b => ({ time: b.time as Time, value: b.ema50! }));

    const e150Data = displayBars
      .filter(b => b.ema150 !== null)
      .map(b => ({ time: b.time as Time, value: b.ema150! }));

    const e200Data = displayBars
      .filter(b => b.ema200 !== null)
      .map(b => ({ time: b.time as Time, value: b.ema200! }));

    const envPct = (indicatorConfig.envelope.percent || 4.0) / 100;
    const upperEnvData = displayBars
      .filter(b => b.ema200 !== null)
      .map(b => ({ time: b.time as Time, value: Number((b.ema200! * (1 + envPct)).toFixed(2)) }));

    const lowerEnvData = displayBars
      .filter(b => b.ema200 !== null)
      .map(b => ({ time: b.time as Time, value: Number((b.ema200! * (1 - envPct)).toFixed(2)) }));

    const mcdxData: BankerMCDXData[] = displayBars.map(b => ({
      time: b.time as Time,
      banker: b.banker,
      hotMoney: b.hotMoney,
      retail: b.retail,
    }));

    const bMaData = displayBars.map(b => ({
      time: b.time as Time,
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

    markersPluginRef.current?.setMarkers(indicatorConfig.signals.visible ? calculatedMarkers : []);

    // Apply current timeframe range
    applyTimeframeRange(timeframe);
  }, [displayBars, calculatedMarkers, indicatorConfig.signals.visible, indicatorConfig.envelope.percent, applyTimeframeRange, timeframe]);

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

    ema50SeriesRef.current?.applyOptions({ color: indicatorConfig.ema1.color, lineWidth: indicatorConfig.ema1.lineWidth as any, lineStyle: getChartLineStyle(indicatorConfig.ema1.lineStyle), visible: indicatorConfig.ema1.visible, title: `EMA ${indicatorConfig.ema1.period}` });
    ema150SeriesRef.current?.applyOptions({ color: indicatorConfig.ema2.color, lineWidth: indicatorConfig.ema2.lineWidth as any, lineStyle: getChartLineStyle(indicatorConfig.ema2.lineStyle), visible: indicatorConfig.ema2.visible, title: `EMA ${indicatorConfig.ema2.period}` });
    ema200SeriesRef.current?.applyOptions({ color: indicatorConfig.ema3.color, lineWidth: indicatorConfig.ema3.lineWidth as any, lineStyle: getChartLineStyle(indicatorConfig.ema3.lineStyle), visible: indicatorConfig.ema3.visible, title: `EMA ${indicatorConfig.ema3.period}` });
    upperEnvSeriesRef.current?.applyOptions({ color: indicatorConfig.envelope.color, lineWidth: indicatorConfig.envelope.lineWidth as any, lineStyle: getChartLineStyle(indicatorConfig.envelope.lineStyle), visible: indicatorConfig.envelope.visible, title: `+${indicatorConfig.envelope.percent}% Bedrock` });
    lowerEnvSeriesRef.current?.applyOptions({ color: indicatorConfig.envelope.color, lineWidth: indicatorConfig.envelope.lineWidth as any, lineStyle: getChartLineStyle(indicatorConfig.envelope.lineStyle), visible: indicatorConfig.envelope.visible, title: `-${indicatorConfig.envelope.percent}% Bedrock` });
    mcdxSeriesRef.current?.applyOptions({ visible: indicatorConfig.mcdx.visible });
    bankerMaSeriesRef.current?.applyOptions({ visible: indicatorConfig.mcdx.visible });
    markersPluginRef.current?.setMarkers(indicatorConfig.signals.visible ? calculatedMarkers : []);
  }, [indicatorConfig, calculatedMarkers]);

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
          
          {/* Resolution: 1D | 1W */}
          <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/50">
            <button
              onClick={() => setResolution('1D')}
              className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all ${
                resolution === '1D'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setResolution('1W')}
              className={`px-2.5 py-1 rounded-md text-[13px] font-bold transition-all ${
                resolution === '1W'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
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
                ].filter(Boolean).length}
              </span>
            </button>

            {isIndicatorOpen && (
              <IndicatorManagerPopover onClose={() => setIsIndicatorOpen(false)} />
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
            <span className="font-bold text-slate-100">{activeLegend.time}</span>
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
            <span className="flex items-center gap-1">
              Banker:{' '}
              <strong className="text-rose-400 font-extrabold">{activeLegend.banker.toFixed(1)}</strong>
              /20
            </span>
            <span className="hidden md:inline text-slate-300">
              HotMoney: <strong className="text-[#FFF176]">{activeLegend.hotMoney.toFixed(1)}</strong>
            </span>
            <span className="hidden md:inline text-slate-300">
              Retail: <strong className="text-[#1B5E20]">{activeLegend.retail.toFixed(1)}</strong>
            </span>
          </>
        ) : (
          <span className="text-slate-400 italic text-[13px]">Scroll to zoom • Drag anywhere for 2D Pan • Double-click to reset</span>
        )}
      </div>

      {/* ----------------------------------------------------------- */}
      {/* MAIN BODY: CHART CANVAS + FULLSCREEN WATCHLIST SIDEBAR      */}
      {/* ----------------------------------------------------------- */}
      <div className="relative flex-1 flex overflow-hidden min-h-0 w-full h-full">
        {/* Left: Chart Canvas Container */}
        <div ref={chartContainerRef} className="flex-1 w-full h-full min-h-0" />

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
