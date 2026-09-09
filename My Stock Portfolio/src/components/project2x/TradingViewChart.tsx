import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Activity, Zap, ExternalLink, BarChart3, TrendingUp, RotateCcw, MoveHorizontal, ZoomIn } from 'lucide-react';

interface TradingViewChartProps {
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
}

export type TimeFrame = '7D' | '1M' | '3M' | '6M' | '10M' | '1Y' | '5Y' | 'ALL';
export type ChartStyle = 'AREA' | 'CANDLE';

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
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
  onAddInflow
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Load initial settings from localStorage
  const [timeframe, setTimeframe] = useState<TimeFrame>(() => {
    try {
      const saved = localStorage.getItem('p2x_chart_timeframe');
      if (saved && ['10M', '1Y', '5Y', 'ALL'].includes(saved)) {
        return saved as TimeFrame;
      }
    } catch (e) {}
    return '10M';
  });

  const [chartStyle, setChartStyle] = useState<ChartStyle>(() => {
    try {
      const saved = localStorage.getItem('p2x_chart_style');
      if (saved === 'CANDLE' || saved === 'AREA') return saved;
    } catch (e) {}
    return 'CANDLE';
  });

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showZoomHint, setShowZoomHint] = useState<boolean>(false);
  const zoomHintTimer = useRef<any>(null);

  // Custom Zoom & Pan Window: [startIdx, endIdx] into raw arrays
  const [customRange, setCustomRange] = useState<{ start: number; end: number } | null>(() => {
    try {
      const saved = localStorage.getItem(`p2x_chart_range_${symbol}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.start === 'number' && typeof parsed.end === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  // Signals Toggle (3-Step Super Money Signals)
  const [showSignals, setShowSignals] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('p2x_chart_show_signals');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true;
  });

  // Dynamic Scale States (Drag to stretch/compress)
  const [priceScale, setPriceScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('p2x_chart_price_scale');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.35 && val <= 4.5) return val;
      }
    } catch (e) {}
    return 1.0;
  });
  const [priceCenterShift, setPriceCenterShift] = useState<number>(0);
  type DragMode = 'PAN' | 'Y_AXIS' | 'X_AXIS' | null;
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragInitialPriceScale, setDragInitialPriceScale] = useState<number>(1.0);
  const [dragInitialRange, setDragInitialRange] = useState<{ start: number; end: number } | null>(null);

  const rawCloses = useMemo(() => (closes || []).filter(c => typeof c === 'number' && !isNaN(c)), [closes]);
  const totalBars = rawCloses.length;

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('p2x_chart_timeframe', timeframe);
    } catch (e) {}
  }, [timeframe]);

  useEffect(() => {
    try {
      localStorage.setItem('p2x_chart_style', chartStyle);
    } catch (e) {}
  }, [chartStyle]);

  useEffect(() => {
    try {
      localStorage.setItem('p2x_chart_show_signals', String(showSignals));
    } catch (e) {}
  }, [showSignals]);

  useEffect(() => {
    try {
      localStorage.setItem('p2x_chart_price_scale', priceScale.toFixed(3));
    } catch (e) {}
  }, [priceScale]);

  useEffect(() => {
    try {
      if (customRange) {
        localStorage.setItem(`p2x_chart_range_${symbol}`, JSON.stringify(customRange));
      } else {
        localStorage.removeItem(`p2x_chart_range_${symbol}`);
      }
    } catch (e) {}
  }, [customRange, symbol]);

  // When symbol changes, load range for that symbol or reset to null
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`p2x_chart_range_${symbol}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.start === 'number' && typeof parsed.end === 'number') {
          setCustomRange(parsed);
          setPriceCenterShift(0);
          return;
        }
      }
    } catch (e) {}
    setCustomRange(null);
    setPriceCenterShift(0);
  }, [symbol]);

  useEffect(() => {
    setCustomRange(null);
  }, [timeframe]);

  // Determine lookback based on timeframe (Macro compounder focus: 10M, 1Y, 5Y, ALL)
  const defaultLookback = useMemo(() => {
    switch (timeframe) {
      case '10M': return 215; // ~10 months (~21.5 trading days/mo)
      case '1Y': return 252;
      case '5Y': return 1260;
      case 'ALL': return totalBars;
      default: return 215;
    }
  }, [timeframe, totalBars]);

  // Default empty bar buffer on the right (~40-50px breathing room)
  const defaultEmptyBars = 8;

  // Active slice range: allows extending past totalBars into future space for free dragging
  const activeRange = useMemo(() => {
    if (customRange && customRange.end > customRange.start) {
      const start = Math.max(0, customRange.start);
      const end = Math.max(start + 7, customRange.end);
      return { start, end };
    }
    const count = Math.min(totalBars, defaultLookback);
    return { start: Math.max(0, totalBars - count), end: totalBars + defaultEmptyBars };
  }, [customRange, defaultLookback, totalBars, defaultEmptyBars]);

  // Sliced data arrays (clamped to totalBars so future buffer bars don't cause undefined lookups)
  const sliceCloses = useMemo(() => rawCloses.slice(activeRange.start, Math.min(totalBars, activeRange.end)), [rawCloses, activeRange, totalBars]);
  const sliceOpens = useMemo(() => (opens && opens.length === totalBars) ? opens.slice(activeRange.start, Math.min(totalBars, activeRange.end)) : [], [opens, totalBars, activeRange]);
  const sliceHighs = useMemo(() => (highs && highs.length === totalBars) ? highs.slice(activeRange.start, Math.min(totalBars, activeRange.end)) : [], [highs, totalBars, activeRange]);
  const sliceLows = useMemo(() => (lows && lows.length === totalBars) ? lows.slice(activeRange.start, Math.min(totalBars, activeRange.end)) : [], [lows, totalBars, activeRange]);
  const sliceDates = useMemo(() => (dates || []).slice(activeRange.start, Math.min(totalBars, activeRange.end)), [dates, activeRange, totalBars]);
  const sliceEma50 = useMemo(() => (ema50 || []).slice(activeRange.start, Math.min(totalBars, activeRange.end)), [ema50, activeRange, totalBars]);
  const sliceEma150 = useMemo(() => (ema150 || []).slice(activeRange.start, Math.min(totalBars, activeRange.end)), [ema150, activeRange, totalBars]);
  const sliceEma200 = useMemo(() => (ema200 || []).slice(activeRange.start, Math.min(totalBars, activeRange.end)), [ema200, activeRange, totalBars]);
  const sliceBanker = useMemo(() => (bankerSeries || []).slice(activeRange.start, Math.min(totalBars, activeRange.end)), [bankerSeries, activeRange, totalBars]);
  const sliceHotMoney = useMemo(() => (hotMoneySeries || []).slice(activeRange.start, Math.min(totalBars, activeRange.end)), [hotMoneySeries, activeRange, totalBars]);
  const sliceRetail = useMemo(() => (retailSeries || []).slice(activeRange.start, Math.min(totalBars, activeRange.end)), [retailSeries, activeRange, totalBars]);
  const sliceBankerMa = useMemo(() => (bankerMaSeries || []).slice(activeRange.start, Math.min(totalBars, activeRange.end)), [bankerMaSeries, activeRange, totalBars]);

  if (sliceCloses.length < 2) {
    return (
      <div className={`flex items-center justify-center rounded-3xl border border-white/10 bg-[#131722] text-slate-300 text-sm h-[680px] ${className}`}>
        Waiting for {symbol} chart data...
      </div>
    );
  }

  // Calculate price scale min/max with dynamic priceScale
  let allPriceVals: number[] = [...sliceCloses];
  if (sliceHighs.length > 0) sliceHighs.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPriceVals.push(v); });
  if (sliceLows.length > 0) sliceLows.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPriceVals.push(v); });
  sliceEma150.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPriceVals.push(v); });
  sliceEma200.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPriceVals.push(v); });

  const rawMin = Math.min(...allPriceVals);
  const rawMax = Math.max(...allPriceVals);
  const rawMid = (rawMax + rawMin) / 2;
  const rawHalfSpan = Math.max(1, (rawMax - rawMin) / 2);
  const baseMargin = rawHalfSpan * 0.10;

  // Apply dynamic priceScale (drag Y-axis to stretch/compress candle height)
  const effectiveHalfSpan = Math.max(0.5, (rawHalfSpan / priceScale) + baseMargin);
  const minPrice = Math.max(0, rawMid - effectiveHalfSpan + priceCenterShift);
  const maxPrice = rawMid + effectiveHalfSpan + priceCenterShift;
  const priceRange = maxPrice - minPrice || 1;

  // ViewBox layout dimensions (Main Chart ~557px + Dates 26px + Banker 116px = 730px Total)
  const vbWidth = 920;
  const vbHeight = 730; // Boosted by +80px for superior vertical candle aspect ratio
  const padL = 15;
  const padR = 75; // room for right price axis labels
  const padT = 15;
  const dateAxisH = 26; // X-axis date area
  const bankerTitleH = 16; // Header space for MCDX Title
  const bankerBarsH = 100; // Banker histogram height
  const paneGap = 16; // Gap between date axis and banker sub-pane

  const priceChartH = vbHeight - padT - dateAxisH - bankerTitleH - bankerBarsH - paneGap; // ~557px (+80px taller)
  const chartW = vbWidth - padL - padR;

  // Total horizontal slots for coordinate mapping (including right margin buffer)
  const totalSlotCount = Math.max(7, activeRange.end - activeRange.start);

  // Coordinate functions
  const getPriceY = (val: number) => {
    const norm = (val - minPrice) / priceRange;
    return padT + priceChartH - norm * priceChartH;
  };

  const getX = (idx: number, _total?: number) => {
    return padL + (idx / Math.max(1, totalSlotCount - 1)) * chartW;
  };

  const bankerTopY = padT + priceChartH + dateAxisH + paneGap;
  const bankerBarsTopY = bankerTopY + bankerTitleH;
  const getBankerY = (score: number) => {
    const clamped = Math.max(0, Math.min(20, score));
    return bankerBarsTopY + bankerBarsH - (clamped / 20) * bankerBarsH;
  };

  // Build Price Area & Line
  const pricePoints = sliceCloses.map((c, i) => `${getX(i, sliceCloses.length)},${getPriceY(c)}`);
  const pricePath = `M ${pricePoints.join(' L ')}`;
  const firstX = getX(0, sliceCloses.length);
  const lastX = getX(sliceCloses.length - 1, sliceCloses.length);
  const areaPath = `M ${firstX},${padT + priceChartH} L ${pricePoints.join(' L ')} L ${lastX},${padT + priceChartH} Z`;

  // Colors based on user's specification:
  // Bull = Yellow (#FFE600), Bear = Vivid Red + Dark 30% (#C62828)
  const bullColor = '#FFE600';
  const bearColor = '#C62828'; // แดงสด + Dark 30% (Deep Crimson)
  const isUp = sliceCloses[sliceCloses.length - 1] >= sliceCloses[0];
  const priceColor = isUp ? bullColor : bearColor;
  const gradId = `tv-grad-${symbol}-${isUp ? 'bull' : 'bear'}`;

  // EMA series paths
  const buildEmaPath = (series: (number | null)[], multiplier: number = 1.0) => {
    if (!series || series.length !== sliceCloses.length) return '';
    const pts: string[] = [];
    series.forEach((val, i) => {
      if (val !== null && !isNaN(val)) pts.push(`${getX(i, sliceCloses.length)},${getPriceY(val * multiplier)}`);
    });
    return pts.length > 1 ? `M ${pts.join(' L ')}` : '';
  };

  const ema50Path = buildEmaPath(sliceEma50);
  const ema150Path = buildEmaPath(sliceEma150);
  const ema200Path = buildEmaPath(sliceEma200);
  const ema200UpperPath = buildEmaPath(sliceEma200, 1.04);
  const ema200LowerPath = buildEmaPath(sliceEma200, 0.96);

  // Banker Moving Average curve path
  const bankerMaPath = useMemo(() => {
    if (sliceCloses.length < 2) return '';
    const pts = sliceCloses.map((_, i) => {
      const maVal = sliceBankerMa[i] !== undefined && !isNaN(sliceBankerMa[i])
        ? sliceBankerMa[i]
        : (sliceBanker[i] ?? 0);
      return `${getX(i, sliceCloses.length).toFixed(1)},${getBankerY(maVal).toFixed(1)}`;
    });
    return `M ${pts.join(' L ')}`;
  }, [sliceCloses, sliceBankerMa, sliceBanker, priceChartH, dateAxisH, paneGap, padT]);

  // Dynamic Auto-Adjusting Price Grid Levels (TradingView Nice Numbers Algorithm)
  const priceGridLevels = useMemo(() => {
    if (priceRange <= 0) return [];

    // Target vertical spacing ~40-45px for dense professional price scale
    const targetCount = Math.max(7, Math.min(16, Math.floor(priceChartH / 42)));
    const rawStep = priceRange / targetCount;

    // Find the nearest "Nice Round Number" (1, 2, 2.5, 5, 10, 20, 25, 50, 100...)
    const power = Math.floor(Math.log10(rawStep));
    const magnitude = Math.pow(10, power);
    const fraction = rawStep / magnitude;

    let niceStep: number;
    if (fraction < 1.4) {
      niceStep = 1 * magnitude;
    } else if (fraction < 2.8) {
      niceStep = 2 * magnitude;
    } else if (fraction < 4.5) {
      niceStep = 2.5 * magnitude;
    } else if (fraction < 7.5) {
      niceStep = 5 * magnitude;
    } else {
      niceStep = 10 * magnitude;
    }

    const firstTick = Math.ceil(minPrice / niceStep) * niceStep;
    const levels: { price: number; y: number; label: string }[] = [];

    // Format based on step precision
    const decimals = niceStep >= 1 ? 2 : (niceStep >= 0.1 ? 2 : 3);

    for (let p = firstTick; p <= maxPrice + niceStep * 0.01; p += niceStep) {
      const y = getPriceY(p);
      if (y >= padT - 2 && y <= padT + priceChartH + 2) {
        levels.push({
          price: p,
          y,
          label: p.toFixed(decimals)
        });
      }
    }

    return levels;
  }, [minPrice, maxPrice, priceRange, priceChartH, padT]);

  const curPriceY = getPriceY(currentPrice);

  // Bar step and width calculations based on actual slot distance
  const slotStep = chartW / Math.max(1, totalSlotCount - 1);

  // Dynamic candle geometry matching TradingView precision
  const candleBarWidth = useMemo(() => {
    if (slotStep >= 14) return Math.min(18, slotStep * 0.70);
    if (slotStep >= 8) return Math.min(14, slotStep * 0.72);
    if (slotStep >= 4.5) return Math.max(2.5, slotStep - 1.4);
    if (slotStep >= 2.5) return Math.max(1.4, slotStep - 0.8);
    if (slotStep >= 1.5) return Math.max(1.0, slotStep - 0.4);
    return Math.max(0.75, slotStep * 0.8);
  }, [slotStep]);

  const wickWidth = useMemo(() => {
    if (slotStep >= 6) return 1.4;
    if (slotStep >= 3) return 1.0;
    return 0.75;
  }, [slotStep]);

  const hasCandleStroke = slotStep >= 10;
  const candleRadius = slotStep >= 10 ? 1 : 0;

  // Hairline gap matching TradingView histogram (ultra-thin hairline slit ~0.75px)
  const mcdxBarWidth = Math.max(
    0.75,
    slotStep >= 8 ? slotStep - 1 : (slotStep >= 3.5 ? slotStep - 0.75 : (slotStep >= 2 ? slotStep - 0.5 : slotStep * 0.85))
  );

  // Candlestick calculation with real wicks and width
  const candles = sliceCloses.map((close, i) => {
    let rawOpen = sliceOpens[i] !== undefined && !isNaN(sliceOpens[i]) ? sliceOpens[i] : (i > 0 ? sliceCloses[i - 1] : close * 0.998);
    let rawHigh = sliceHighs[i] !== undefined && !isNaN(sliceHighs[i]) ? sliceHighs[i] : Math.max(rawOpen, close);
    let rawLow = sliceLows[i] !== undefined && !isNaN(sliceLows[i]) ? sliceLows[i] : Math.min(rawOpen, close);

    // If rawHigh === rawLow (historical OHLC not yet populated in DB), synthesize realistic wicks
    if (rawHigh <= rawLow) {
      const prevC = i > 0 ? sliceCloses[i - 1] : close;
      const spread = Math.max(close * 0.015, Math.abs(close - prevC) * 1.4);
      rawHigh = Math.max(rawOpen, close) + spread * 0.6;
      rawLow = Math.min(rawOpen, close) - spread * 0.6;
    }

    const open = rawOpen;
    const high = Math.max(rawHigh, open, close);
    const low = Math.min(rawLow, open, close);
    const isBull = close >= open;

    const x = getX(i, sliceCloses.length);
    const yHigh = getPriceY(high);
    const yLow = getPriceY(low);
    const yTop = getPriceY(Math.max(open, close));
    const yBottom = getPriceY(Math.min(open, close));
    // Crisp body height: ensure minimum 1px for visible doji lines
    const bodyH = Math.max(1, yBottom - yTop);

    return {
      x,
      open,
      high,
      low,
      close,
      isBull,
      yHigh,
      yLow,
      yTop,
      yBottom,
      bodyH,
      candleColor: isBull ? bullColor : bearColor
    };
  });

  // 3-Step Super Money Tactical Signals (••• READY, ▲ BUY, ★ SUPER, ▼ EXIT) - Icon Only, No Text
  const signals = useMemo(() => {
    if (!showSignals || sliceCloses.length < 2) return [];

    const sigList: {
      index: number;
      type: 'READY' | 'BUY' | 'SUPER' | 'EXIT';
      icon: string;
      title: string;
      color: string;
      x: number;
      y: number;
      position: 'above' | 'below';
    }[] = [];

    let lastType: string | null = null;

    for (let i = 0; i < sliceCloses.length; i++) {
      const close = sliceCloses[i];
      const open = sliceOpens[i] !== undefined && !isNaN(sliceOpens[i]) ? sliceOpens[i] : (i > 0 ? sliceCloses[i - 1] : close);
      const high = sliceHighs[i] !== undefined && !isNaN(sliceHighs[i]) ? sliceHighs[i] : Math.max(open, close);
      const low = sliceLows[i] !== undefined && !isNaN(sliceLows[i]) ? sliceLows[i] : Math.min(open, close);
      const isBull = close >= open;

      const e50 = sliceEma50[i];
      const e150 = sliceEma150[i];
      const e200 = sliceEma200[i];
      const bVal = sliceBanker[i] ?? 0;
      const prevBVal = i > 0 ? (sliceBanker[i - 1] ?? 0) : 0;

      const dist200 = e200 ? ((close - e200) / e200) * 100 : 0;
      const dist150 = e150 ? ((close - e150) / e150) * 100 : 0;
      const nearSupport = (e200 && dist200 >= -4 && dist200 <= 3.5) || (e150 && dist150 >= -3 && dist150 <= 3.5);

      const x = getX(i, sliceCloses.length);
      const yHigh = getPriceY(high);
      const yLow = getPriceY(low);

      // STEP 3: ★ SUPER MONEY (Banker crosses >= 10, in trend) -> White Star below candle
      if (bVal >= 10 && prevBVal < 10 && close > (e50 || close * 0.98)) {
        if (lastType !== 'SUPER') {
          sigList.push({
            index: i,
            type: 'SUPER',
            icon: '★',
            title: `★ SUPER MONEY ACCELERATION (Banker: ${bVal.toFixed(1)})`,
            color: '#FFFFFF', // User requested: White color
            x,
            y: yLow, // Placed below lowest wick
            position: 'below'
          });
          lastType = 'SUPER';
          continue;
        }
      }

      // STEP 2: ▲ BUY ZONE (At/near EMA support + Banker emerges > 0 on green bar) -> Yellow Triangle below candle
      if (nearSupport && bVal > 0 && prevBVal === 0 && isBull) {
        if (lastType !== 'BUY') {
          sigList.push({
            index: i,
            type: 'BUY',
            icon: '▲',
            title: `▲ BUY STRIKE (EMA Bedrock Hold + Banker Flow: ${bVal.toFixed(1)})`,
            color: '#FFE600', // User requested: Yellow color
            x,
            y: yLow, // Placed below lowest wick
            position: 'below'
          });
          lastType = 'BUY';
          continue;
        }
      }

      // STEP 1: ••• READY (Near EMA support, Banker = 0, setup forming) -> Amber dots below candle
      if (nearSupport && bVal === 0) {
        if (lastType !== 'READY' && lastType !== 'BUY') {
          const lastSame = sigList.filter(s => s.type === 'READY').pop();
          if (!lastSame || (i - lastSame.index >= 8)) {
            sigList.push({
              index: i,
              type: 'READY',
              icon: '•••',
              title: '••• READY SETUP (EMA Bedrock Test, Banker = 0)',
              color: '#FBBF24',
              x,
              y: yLow, // Placed below lowest wick
              position: 'below'
            });
            lastType = 'READY';
            continue;
          }
        }
      }

      // EXIT: ▼ DANGER / STOP LOSS (Breakdown below EMA 200 or Banker collapse) -> Red Triangle above candle
      if ((dist200 < -4 && bVal === 0 && e200) || (prevBVal >= 10 && bVal < 5 && close < (e50 || close))) {
        if (lastType !== 'EXIT') {
          sigList.push({
            index: i,
            type: 'EXIT',
            icon: '▼',
            title: '▼ EXIT SIGNAL (Bedrock Breakdown or Flow Collapse)',
            color: '#FF1744',
            x,
            y: yHigh, // Placed above highest wick
            position: 'above'
          });
          lastType = 'EXIT';
          continue;
        }
      }
    }

    // Ensure signals don't collide horizontally on screen when zoomed out (min 22px spacing)
    const minPixelDist = 22;
    const finalSignals: typeof sigList = [];
    for (const sig of sigList) {
      const prevSig = finalSignals[finalSignals.length - 1];
      if (!prevSig || Math.abs(sig.x - prevSig.x) >= minPixelDist) {
        finalSignals.push(sig);
      } else if (sig.type === 'SUPER' || sig.type === 'BUY' || sig.type === 'EXIT') {
        if (prevSig.type === 'READY') {
          finalSignals[finalSignals.length - 1] = sig;
        } else {
          finalSignals.push(sig);
        }
      }
    }

    return finalSignals;
  }, [sliceCloses, sliceOpens, sliceHighs, sliceLows, sliceEma50, sliceEma150, sliceEma200, sliceBanker, showSignals, minPrice, maxPrice, priceChartH, padT, chartW]);

  // Dynamic Auto-Adjusting Date Ticks (TradingView Style ~48px spacing)
  const dateTicks = useMemo(() => {
    if (sliceDates.length === 0) return [];
    const N = sliceDates.length;

    // Target horizontal pixel spacing between date ticks (~48px)
    const targetCount = Math.max(8, Math.min(22, Math.floor(chartW / 48)));
    const step = Math.max(1, Math.round((N - 1) / (targetCount - 1)));

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const ticks: { index: number; x: number; label: string; isYear: boolean; isMonth: boolean }[] = [];

    let prevYear: string | null = null;
    let prevMonth: string | null = null;

    for (let i = 0; i < N; i += step) {
      const dateStr = sliceDates[i];
      if (!dateStr) continue;

      const parts = dateStr.split('-');
      const yr = parts[0] || '';
      const mIdx = parts.length >= 2 ? parseInt(parts[1], 10) - 1 : 0;
      const day = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
      const monthName = monthNames[mIdx] || '';

      const isNewYear = prevYear !== null && yr !== prevYear;
      const isNewMonth = prevMonth !== null && parts[1] !== prevMonth;

      let label = '';
      let isYear = false;
      let isMonth = false;

      if (timeframe === '5Y' || timeframe === 'ALL' || N > 400) {
        // Multi-year view: show Year on year boundaries, Month otherwise
        if (isNewYear || i === 0) {
          label = yr;
          isYear = true;
        } else {
          label = monthName;
          isMonth = true;
        }
      } else if (timeframe === '1Y' || N > 150) {
        // 1 Year view: show Month names, Year on year change
        if (isNewYear) {
          label = yr;
          isYear = true;
        } else {
          label = monthName;
          isMonth = true;
        }
      } else {
        // 6M / 3M / 1M daily views: show Month on month change, Day number inside month
        if (isNewYear) {
          label = yr;
          isYear = true;
        } else if (isNewMonth || i === 0) {
          label = monthName;
          isMonth = true;
        } else {
          label = `${monthName} ${day}`;
        }
      }

      ticks.push({
        index: i,
        x: getX(i, N),
        label,
        isYear,
        isMonth
      });

      prevYear = yr;
      prevMonth = parts[1] || null;
    }

    // Always ensure the very last bar has a tick if space permits
    const lastIdx = N - 1;
    if (ticks.length > 0 && lastIdx - ticks[ticks.length - 1].index > step * 0.5) {
      const dateStr = sliceDates[lastIdx];
      if (dateStr) {
        const parts = dateStr.split('-');
        const mIdx = parts.length >= 2 ? parseInt(parts[1], 10) - 1 : 0;
        const day = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
        const monthName = monthNames[mIdx] || '';
        ticks.push({
          index: lastIdx,
          x: getX(lastIdx, N),
          label: (timeframe === '5Y' || timeframe === 'ALL') ? parts[0] : `${monthName} ${day}`,
          isYear: false,
          isMonth: true
        });
      }
    }

    return ticks;
  }, [sliceDates, chartW, timeframe]);

  // Interactive Mouse Move (Hover Crosshair & Dragging)
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const normX = (mouseX / rect.width) * vbWidth;
    const relX = Math.max(0, Math.min(chartW, normX - padL));
    const idx = Math.round((relX / chartW) * (sliceCloses.length - 1));
    if (!dragMode) {
      setHoverIdx(idx);
    }
  };

  // Global window listeners for drag so user can drag outside SVG smoothly
  useEffect(() => {
    if (!dragMode) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      if (dragMode === 'Y_AXIS') {
        const deltaY = dragStartY - e.clientY; // dragging up = stretch taller
        const newScale = Math.max(0.35, Math.min(4.5, dragInitialPriceScale * Math.pow(1.008, deltaY)));
        setPriceScale(newScale);
      } else if (dragMode === 'X_AXIS') {
        const deltaX = e.clientX - dragStartX; // dragging right = stretch bars
        const currentSpan = dragInitialRange ? (dragInitialRange.end - dragInitialRange.start) : defaultLookback;
        const scaleFactor = Math.pow(1.005, -deltaX);
        const newSpan = Math.max(7, Math.min(totalBars, Math.round(currentSpan * scaleFactor)));
        const anchorEnd = dragInitialRange ? dragInitialRange.end : totalBars;
        const newStart = Math.max(0, anchorEnd - newSpan);
        setCustomRange({ start: newStart, end: anchorEnd });
      } else if (dragMode === 'PAN' && dragInitialRange && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const deltaX = e.clientX - dragStartX;
        const rangeSpan = dragInitialRange.end - dragInitialRange.start;
        const barsDelta = Math.round((deltaX / rect.width) * rangeSpan);

        let newStart = dragInitialRange.start - barsDelta;
        let newEnd = dragInitialRange.end - barsDelta;

        if (newStart < 0) {
          newEnd += -newStart;
          newStart = 0;
        }

        // Unfixed right boundary: allow pulling chart left to reveal future empty space
        // Allows the last candle to detach and float away from the right border
        const maxAllowedEnd = totalBars + Math.round(rangeSpan * 0.8);
        if (newEnd > maxAllowedEnd) {
          newEnd = maxAllowedEnd;
          newStart = Math.max(0, newEnd - rangeSpan);
        }

        setCustomRange({ start: newStart, end: newEnd });
      }
    };

    const onWindowMouseUp = () => {
      setDragMode(null);
      setDragInitialRange(null);
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [dragMode, dragStartY, dragStartX, dragInitialPriceScale, dragInitialRange, defaultLookback, totalBars]);

  // Zoom on Wheel (ONLY when Ctrl or Meta is held!) via non-passive listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const currentSpan = activeRange.end - activeRange.start;
        const zoomStep = Math.max(2, Math.round(currentSpan * 0.15));

        if (e.deltaY < 0) {
          // Zoom in: shrink range
          if (currentSpan <= 7) return;
          const newStart = Math.min(activeRange.end - 7, activeRange.start + Math.floor(zoomStep / 2));
          const newEnd = Math.max(newStart + 7, activeRange.end - Math.ceil(zoomStep / 2));
          setCustomRange({ start: newStart, end: newEnd });
        } else {
          // Zoom out: expand range
          if (currentSpan >= totalBars) return;
          const newStart = Math.max(0, activeRange.start - Math.floor(zoomStep / 2));
          const newEnd = Math.min(totalBars, activeRange.end + Math.ceil(zoomStep / 2));
          setCustomRange({ start: newStart, end: newEnd });
        }
      } else {
        // Allow natural page scrolling! Show helpful hint to hold Ctrl
        setShowZoomHint(true);
        if (zoomHintTimer.current) clearTimeout(zoomHintTimer.current);
        zoomHintTimer.current = setTimeout(() => {
          setShowZoomHint(false);
        }, 1600);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [activeRange, totalBars]);

  const activeIdx = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < sliceCloses.length
    ? hoverIdx
    : sliceCloses.length - 1;
  const activeClose = sliceCloses[activeIdx];
  const activeOpen = candles[activeIdx]?.open ?? activeClose;
  const activeHigh = candles[activeIdx]?.high ?? activeClose;
  const activeLow = candles[activeIdx]?.low ?? activeClose;
  const activeDate = sliceDates[activeIdx] || '';
  const activeEma50 = sliceEma50[activeIdx];
  const activeEma150 = sliceEma150[activeIdx];
  const activeEma200 = sliceEma200[activeIdx];
  const activeBanker = sliceBanker[activeIdx] ?? banker;
  const activeX = getX(activeIdx, sliceCloses.length);
  const activePriceY = getPriceY(activeClose);

  // Traffic Light Styling
  const getTrafficBadge = () => {
    if (trafficLight === 'BUY_ZONE') {
      return {
        icon: '🔷',
        text: 'BUY ZONE',
        bg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
      };
    }
    if (trafficLight === 'WAIT') {
      return {
        icon: '🟡',
        text: 'WAIT ZONE',
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300'
      };
    }
    return {
      icon: '🔴',
      text: 'DANGER ZONE',
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300'
    };
  };

  const badgeInfo = getTrafficBadge();

  return (
    <div
      className={`relative flex flex-col rounded-3xl border border-white/10 bg-[#131722] p-5 shadow-2xl overflow-hidden select-none backdrop-blur-2xl ${className}`}
    >
      {/* Top Header Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-black tracking-tight text-white">{symbol}</span>
            <span className="text-xl font-black text-slate-100 tabular-nums">${currentPrice.toFixed(2)}</span>
          </div>

          {/* Traffic Light Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black ${badgeInfo.bg}`}>
            <span>{badgeInfo.icon}</span>
            <span>{badgeInfo.text}</span>
          </div>

          <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300 font-semibold">
            {badge}
          </span>

          {(customRange || priceScale !== 1.0) && (
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30">
              {customRange ? `${sliceCloses.length} bars` : ''} {priceScale !== 1.0 ? `Scale: ${(priceScale * 100).toFixed(0)}%` : ''}
            </span>
          )}
        </div>

        {/* Timeframe & Chart Style Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Signals Toggle Button */}
          <button
            onClick={() => setShowSignals(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              showSignals
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'bg-[#1E222D] text-slate-400 border-white/10 hover:text-white'
            }`}
            title="Toggle 3-Step Super Money Signals (••• Ready, ▲ Buy, ⭐ Super)"
          >
            <Zap className={`w-3.5 h-3.5 ${showSignals ? 'text-amber-400' : 'text-slate-400'}`} />
            <span>Signals {showSignals ? 'ON' : 'OFF'}</span>
          </button>

          {/* Reset Zoom & Scale Button */}
          <button
            onClick={() => {
              setTimeframe('10M');
              setCustomRange(null);
              setPriceScale(1.0);
              setPriceCenterShift(0);
              try {
                localStorage.setItem('p2x_chart_timeframe', '10M');
                localStorage.setItem('p2x_chart_price_scale', '1.0');
                localStorage.removeItem(`p2x_chart_range_${symbol}`);
              } catch (e) {}
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#1E222D] hover:bg-[#2A2E39] border border-white/10 text-slate-300 hover:text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
            title="Reset to 10M timeframe and auto-scale"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset 10M</span>
          </button>

          {/* Chart Style Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-[#1E222D] border border-white/10 text-xs">
            <button
              onClick={() => setChartStyle('CANDLE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartStyle === 'CANDLE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Candle
            </button>
            <button
              onClick={() => setChartStyle('AREA')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                chartStyle === 'AREA' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Area
            </button>
          </div>

          {/* Timeframe Zoom Buttons: 10M | 1Y | 5Y | ALL */}
          <div className="flex items-center p-1 rounded-xl bg-[#1E222D] border border-white/10 text-xs">
            {(['10M', '1Y', '5Y', 'ALL'] as TimeFrame[]).map(tf => (
              <button
                key={tf}
                onClick={() => {
                  setTimeframe(tf);
                  setCustomRange(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeframe === tf && !customRange ? 'bg-blue-600 text-white font-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* External TradingView Link */}
          <a
            href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 p-2 rounded-xl bg-[#1E222D] hover:bg-[#2A2E39] border border-white/10 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Open in TradingView Web"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Interactive Legend Bar with Real OHLC + EMA Legends */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-xs text-slate-300">
        <div className="flex items-center gap-3.5 flex-wrap">
          {/* OHLC Pills */}
          <div className="flex items-center gap-2 text-slate-400">
            <span>O: <strong className="text-white">${activeOpen.toFixed(2)}</strong></span>
            <span>H: <strong className="text-emerald-400">${activeHigh.toFixed(2)}</strong></span>
            <span>L: <strong className="text-rose-400">${activeLow.toFixed(2)}</strong></span>
            <span>C: <strong style={{ color: activeClose >= activeOpen ? bullColor : bearColor }}>${activeClose.toFixed(2)}</strong></span>
          </div>

          {/* EMA 50 (White) */}
          <div className="flex items-center gap-1 text-slate-200 font-semibold">
            <span className="w-2.5 h-0.5 rounded-full bg-white" />
            <span>EMA 50: <strong>{activeEma50 ? `$${activeEma50.toFixed(1)}` : 'N/A'}</strong></span>
          </div>

          {/* EMA 150 (Electric Blue) */}
          <div className="flex items-center gap-1 text-blue-400 font-semibold">
            <span className="w-2.5 h-0.5 rounded-full bg-[#2962FF]" />
            <span>EMA 150: <strong>{activeEma150 ? `$${activeEma150.toFixed(1)}` : 'N/A'}</strong></span>
          </div>

          {/* EMA 200 (Orange/Gold) */}
          <div className="flex items-center gap-1 text-[#FFB300] font-semibold">
            <span className="w-2.5 h-0.5 rounded-full bg-[#FFB300]" />
            <span>EMA 200: <strong>{activeEma200 ? `$${activeEma200.toFixed(1)}` : 'N/A'}</strong></span>
          </div>

          {/* Banker MCDX Score */}
          <div className="flex items-center gap-1 font-bold">
            <span className={`w-2 h-2 rounded ${activeBanker >= 10 ? 'bg-[#FF3B30]' : activeBanker >= 5 ? 'bg-[#FFD600]' : 'bg-[#4CAF50]'}`} />
            <span className="text-slate-200">Banker: <strong className="text-white">{activeBanker.toFixed(1)}/20</strong></span>
          </div>
        </div>

        {activeDate && (
          <div className="text-slate-400 font-medium">
            Date: <strong className="text-slate-200">{activeDate}</strong>
          </div>
        )}
      </div>

      {/* Main Multi-Pane SVG Chart (Price ~557px + Banker ~116px = 730px Total) */}
      <div 
        ref={containerRef}
        className="relative w-full h-[640px] cursor-crosshair select-none"
      >
        {/* Floating Zoom Hint when user scrolls without Ctrl */}
        {showZoomHint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/50 text-cyan-300 text-xs font-bold shadow-2xl backdrop-blur-md pointer-events-none transition-all animate-pulse">
            💡 กด Ctrl + Scroll เพื่อซูมกราฟ / Hold Ctrl + Scroll to Zoom
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseDown={(e) => {
            // Main chart body pan
            setDragMode('PAN');
            setDragStartX(e.clientX);
            setDragInitialRange({ ...activeRange });
          }}
          onMouseLeave={() => {
            setHoverIdx(null);
          }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={priceColor} stopOpacity="0.35" />
              <stop offset="60%" stopColor={priceColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={priceColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* ============================================================ */}
          {/* PANE 1: PRICE CHART AREA */}
          {/* ============================================================ */}

          {/* Subtle Vertical Grid Lines for Date Ticks */}
          {dateTicks.map((tick, tIdx) => (
            <line
              key={`vgrid-${tIdx}`}
              x1={tick.x}
              y1={padT}
              x2={tick.x}
              y2={padT + priceChartH}
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="2 3"
            />
          ))}

          {/* Right Axis Sidebar Divider Line */}
          <line
            x1={vbWidth - padR}
            y1={padT}
            x2={vbWidth - padR}
            y2={padT + priceChartH}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {/* Dynamic Auto-Adjusting Price Grid Lines & Right Axis Labels */}
          {priceGridLevels.map((g, i) => (
            <g key={i}>
              {/* Horizontal Grid Line across chart */}
              <line
                x1={padL}
                y1={g.y}
                x2={vbWidth - padR}
                y2={g.y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
              />
              {/* Tick Notch on Right Axis */}
              <line
                x1={vbWidth - padR}
                y1={g.y}
                x2={vbWidth - padR + 4}
                y2={g.y}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1"
              />
              {/* Price Label */}
              <text
                x={vbWidth - padR + 8}
                y={g.y + 3.5}
                fill="#94A3B8"
                fontSize="10"
                fontFamily="sans-serif"
              >
                ${g.label}
              </text>
            </g>
          ))}

          {/* Interactive Y-Axis Price Drag Surface (Right Scale) */}
          <rect
            x={vbWidth - padR}
            y={padT}
            width={padR}
            height={priceChartH}
            fill="transparent"
            style={{ cursor: 'ns-resize' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDragMode('Y_AXIS');
              setDragStartY(e.clientY);
              setDragInitialPriceScale(priceScale);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setPriceScale(1.0);
              setPriceCenterShift(0);
              try {
                localStorage.setItem('p2x_chart_price_scale', '1.0');
              } catch (err) {}
            }}
          />

          {/* Current Price Reference Line */}
          <line
            x1={padL}
            y1={curPriceY}
            x2={vbWidth - padR}
            y2={curPriceY}
            stroke={priceColor}
            strokeDasharray="2 2"
            strokeOpacity="0.65"
          />

          {/* Current Price Badge on Right Axis */}
          <g transform={`translate(${vbWidth - padR + 6}, ${curPriceY - 10})`}>
            <rect width="60" height="20" rx="4" fill={priceColor} />
            <text
              x="30"
              y="14"
              fill="#0F172A"
              fontSize="11"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              ${currentPrice.toFixed(1)}
            </text>
          </g>

          {/* Chart Style: AREA */}
          {chartStyle === 'AREA' && (
            <>
              <path d={areaPath} fill={`url(#${gradId})`} />
              {/* EMA 200 (Orange/Gold Dashed Major Support) */}
              {ema200Path && (
                <path d={ema200Path} fill="none" stroke="#FFB300" strokeWidth="2.8" strokeDasharray="5 3" opacity="0.95" strokeLinecap="round" />
              )}
              {/* EMA 150 (Electric Blue Solid) */}
              {ema150Path && (
                <path d={ema150Path} fill="none" stroke="#2962FF" strokeWidth="2.2" opacity="0.95" />
              )}
              {/* EMA 50 (White Solid) */}
              {ema50Path && (
                <path d={ema50Path} fill="none" stroke="#FFFFFF" strokeWidth="1.6" opacity="0.9" />
              )}
              {/* Main Price Line */}
              <path d={pricePath} fill="none" stroke={priceColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Chart Style: CANDLESTICK */}
          {chartStyle === 'CANDLE' && (
            <>
              {/* EMA Ribbon Envelopes (Dashed bands) */}
              {ema200UpperPath && (
                <path d={ema200UpperPath} fill="none" stroke="#FFB300" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.45" />
              )}
              {ema200LowerPath && (
                <path d={ema200LowerPath} fill="none" stroke="#FFB300" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.45" />
              )}
              {/* EMA 200 (Slow - Gold Major Support Line) */}
              {ema200Path && (
                <path d={ema200Path} fill="none" stroke="#FFB300" strokeWidth="3.6" opacity="1.0" strokeLinecap="round" strokeLinejoin="round" />
              )}
              {/* EMA 150 (Medium - Royal Blue) */}
              {ema150Path && (
                <path d={ema150Path} fill="none" stroke="#2962FF" strokeWidth="2.5" opacity="0.95" />
              )}
              {/* EMA 50 (Fast - White) */}
              {ema50Path && (
                <path d={ema50Path} fill="none" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.95" />
              )}

              {/* Real Candlesticks (Yellow #FFE600 for Bull, Deep Crimson #C62828 for Bear) */}
              {candles.map((cdl, i) => (
                <g key={i} shapeRendering="crispEdges">
                  {/* Full Central Spine Wick (from yHigh to yLow) */}
                  <line
                    x1={cdl.x}
                    y1={cdl.yHigh}
                    x2={cdl.x}
                    y2={cdl.yLow}
                    stroke={cdl.candleColor}
                    strokeWidth={wickWidth}
                  />
                  {/* Candle Body (drawn directly over central wick) */}
                  <rect
                    x={cdl.x - candleBarWidth / 2}
                    y={cdl.yTop}
                    width={candleBarWidth}
                    height={cdl.bodyH}
                    rx={candleRadius}
                    fill={cdl.candleColor}
                    stroke={hasCandleStroke ? cdl.candleColor : 'none'}
                    strokeWidth={hasCandleStroke ? 1 : 0}
                  />
                </g>
              ))}

              {/* 3-Step Super Money Tactical Signals (Icon-Only, No Text) */}
              {showSignals && signals.map((sig, sIdx) => {
                const isBelow = sig.position === 'below';
                // Smart Wick Padding: +10px boost! (28px below lowest wick tip, 24px above highest wick tip)
                const renderY = isBelow ? sig.y + 28 : sig.y - 24;

                return (
                  <g key={`sig-${sIdx}`} className="pointer-events-auto cursor-pointer">
                    <title>{sig.title}</title>
                    {/* Subtle micro stem dot connecting to candle wick tip */}
                    <circle
                      cx={sig.x}
                      cy={isBelow ? sig.y + 6 : sig.y - 6}
                      r="1.4"
                      fill={sig.color}
                      opacity="0.75"
                    />
                    {/* Bold Icon Glyph (+3 size levels: 18px - 20px) */}
                    <text
                      x={sig.x}
                      y={renderY}
                      fill={sig.color}
                      fontSize={sig.type === 'SUPER' ? '20' : (sig.type === 'READY' ? '15' : '18')}
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="sans-serif, system-ui"
                      style={{
                        filter: 'drop-shadow(0px 2px 5px rgba(0, 0, 0, 0.95))',
                        userSelect: 'none'
                      }}
                    >
                      {sig.icon}
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {/* ============================================================ */}
          {/* X-AXIS DATE LABELS (TradingView Dense Auto-Adjusting Ticks) */}
          {/* ============================================================ */}
          {dateTicks.map((tick, dIdx) => (
            <g key={`dtick-${dIdx}`}>
              {/* Tick Notch */}
              <line
                x1={tick.x}
                y1={padT + priceChartH}
                x2={tick.x}
                y2={padT + priceChartH + 4}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
              />
              {/* Date Label */}
              <text
                x={tick.x}
                y={padT + priceChartH + 17}
                fill={tick.isYear ? '#F8FAFC' : (tick.isMonth ? '#CBD5E1' : '#94A3B8')}
                fontSize={tick.isYear ? '10.5' : '10'}
                fontWeight={tick.isYear ? 'bold' : (tick.isMonth ? '600' : 'normal')}
                fontFamily="sans-serif"
                textAnchor="middle"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Interactive X-Axis Date Drag Surface (Bottom Date Scale) */}
          <rect
            x={padL}
            y={padT + priceChartH}
            width={chartW}
            height={dateAxisH}
            fill="transparent"
            style={{ cursor: 'ew-resize' }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDragMode('X_AXIS');
              setDragStartX(e.clientX);
              setDragInitialRange({ ...activeRange });
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setCustomRange(null);
              try {
                localStorage.removeItem(`p2x_chart_range_${symbol}`);
              } catch (err) {}
            }}
          />

          {/* ============================================================ */}
          {/* PANE 2: BANKER MCDX FLOW SUB-CHART */}
          {/* ============================================================ */}
          <g>
            {/* Sub-pane divider */}
            <line
              x1={padL}
              y1={bankerTopY - 4}
              x2={vbWidth - padR}
              y2={bankerTopY - 4}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />

            {/* Sub-pane Title */}
            <text
              x={padL}
              y={bankerTopY + 10}
              fill="#F59E0B"
              fontSize="10"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              BANKER MCDX FLOW (SUPER MONEY) • 20 SCALE
            </text>

            {/* Threshold Line 10 (Pink #FC2D79 Entry Signal) */}
            <line
              x1={padL}
              y1={getBankerY(10)}
              x2={vbWidth - padR}
              y2={getBankerY(10)}
              stroke="#FC2D79"
              strokeDasharray="3 3"
              strokeWidth="1.2"
              strokeOpacity="0.8"
            />
            <text
              x={vbWidth - padR + 8}
              y={getBankerY(10) + 3}
              fill="#FC2D79"
              fontSize="10"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              10
            </text>

            {/* Baseline 0 */}
            <line
              x1={padL}
              y1={getBankerY(0)}
              x2={vbWidth - padR}
              y2={getBankerY(0)}
              stroke="rgba(255,255,255,0.08)"
            />
            <text
              x={vbWidth - padR + 8}
              y={getBankerY(0) + 3}
              fill="#64748B"
              fontSize="10"
              fontFamily="sans-serif"
            >
              0
            </text>

            {/* Continuous 3-tier stacked histogram matching TradingView Super Money MCDX */}
            {sliceCloses.map((_, i) => {
              let bVal = sliceBanker[i] ?? 0;
              let hVal = sliceHotMoney[i] ?? 0;

              // Fallback synthesis if hotMoney array is empty
              if (hVal === 0 && bVal > 0) {
                hVal = Math.min(20, bVal * 1.6);
              }

              const barX = getX(i, sliceCloses.length);
              const barW = mcdxBarWidth;

              // 1. Red Base (Banker Institutional Flow): 0 to bVal
              const yBase = getBankerY(0);
              const yBanker = getBankerY(bVal);
              const redH = Math.max(0, yBase - yBanker);

              // 2. Yellow Mid (Hot Money Speculative Flow): bVal to Math.max(bVal, hVal)
              const topYellow = Math.max(bVal, hVal);
              const yYellowTop = getBankerY(topYellow);
              const yellowH = Math.max(0, yBanker - yYellowTop);

              // 3. Green Top (Retail Floating Supply): Math.max(bVal, hVal) to 20
              const yGreenTop = getBankerY(20);
              const greenH = Math.max(0, yYellowTop - yGreenTop);

              return (
                <g key={i} shapeRendering="crispEdges">
                  {/* Green Retail (Top Floating Supply) */}
                  {greenH > 0 && (
                    <rect
                      x={barX - barW / 2}
                      y={yGreenTop}
                      width={barW}
                      height={greenH}
                      fill="#2E7D32"
                      fillOpacity={0.88}
                    />
                  )}
                  {/* Yellow Hot Money (Mid Speculative Flow) */}
                  {yellowH > 0 && (
                    <rect
                      x={barX - barW / 2}
                      y={yYellowTop}
                      width={barW}
                      height={yellowH}
                      fill="#FFD600"
                      fillOpacity={0.92}
                    />
                  )}
                  {/* Red Banker (Base Institutional Flow) */}
                  {redH > 0 && (
                    <rect
                      x={barX - barW / 2}
                      y={yBanker}
                      width={barW}
                      height={redH}
                      fill="#FF3D00"
                      fillOpacity={0.96}
                    />
                  )}
                </g>
              );
            })}

            {/* Banker Moving Average Curve (White Line running across all bars) */}
            {bankerMaPath && (
              <path
                d={bankerMaPath}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            )}
          </g>

          {/* ============================================================ */}
          {/* INTERACTIVE HOVER CROSSHAIR */}
          {/* ============================================================ */}
          {hoverIdx !== null && (
            <g>
              {/* Vertical line through all panes */}
              <line
                x1={activeX}
                y1={padT}
                x2={activeX}
                y2={bankerBarsTopY + bankerBarsH}
                stroke="#64748B"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              {/* Horizontal line at price */}
              <line
                x1={padL}
                y1={activePriceY}
                x2={vbWidth - padR}
                y2={activePriceY}
                stroke="#64748B"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              {/* Highlight Circle on price */}
              <circle
                cx={activeX}
                cy={activePriceY}
                r="5"
                fill={priceColor}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Footer Info, Banker Status & Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-white/10 text-xs text-slate-300">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-slate-400">vs EMA 150: </span>
            <span className={`font-bold ${distEma150 >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
              {distEma150 >= 0 ? `+${distEma150}%` : `${distEma150}%`}
            </span>
          </div>
          <div>
            <span className="text-slate-400">vs EMA 200: </span>
            <span className={`font-bold ${distEma200 >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
              {distEma200 >= 0 ? `+${distEma200}%` : `${distEma200}%`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Banker Status: </span>
            <span className="font-black text-amber-300">
              {banker >= 10 ? '🔥 Institutional Super Money (>=10)' : banker >= 5 ? '🟡 Moderate Momentum' : banker > 0 ? '🟢 Light Flow' : '⚪ Zero Flow'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            💡 ลากแกนราคา (Y) ยืดความสูง • ลากแกนวันที่ (X) ยืดความอ้วน • ดับเบิ้ลคลิกเพื่อ Reset
          </span>
          {onAddInflow && (
            <button
              onClick={onAddInflow}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Fill via Inflow Slip →</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
