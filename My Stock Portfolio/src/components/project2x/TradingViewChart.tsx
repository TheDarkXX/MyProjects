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

export type TimeFrame = '7D' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';
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

  // Timeframe default is 6M (per explicit user instruction)
  const [timeframe, setTimeframe] = useState<TimeFrame>('6M');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('CANDLE');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showZoomHint, setShowZoomHint] = useState<boolean>(false);
  const zoomHintTimer = useRef<any>(null);

  // Custom Zoom & Pan Window: [startIdx, endIdx] into raw arrays
  const [customRange, setCustomRange] = useState<{ start: number; end: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragInitialRange, setDragInitialRange] = useState<{ start: number; end: number } | null>(null);

  const rawCloses = useMemo(() => (closes || []).filter(c => typeof c === 'number' && !isNaN(c)), [closes]);
  const totalBars = rawCloses.length;

  // Determine lookback based on timeframe
  const defaultLookback = useMemo(() => {
    switch (timeframe) {
      case '7D': return 7;
      case '1M': return 22;
      case '3M': return 65;
      case '6M': return 130;
      case '1Y': return 252;
      case '5Y': return 1260;
      case 'ALL': return totalBars;
      default: return 130;
    }
  }, [timeframe, totalBars]);

  // Reset custom range when symbol or timeframe buttons clicked
  useEffect(() => {
    setCustomRange(null);
  }, [timeframe, symbol]);

  // Active slice range
  const activeRange = useMemo(() => {
    if (customRange && customRange.end > customRange.start) {
      const start = Math.max(0, Math.min(totalBars - 7, customRange.start));
      const end = Math.max(start + 7, Math.min(totalBars, customRange.end));
      return { start, end };
    }
    const count = Math.min(totalBars, defaultLookback);
    return { start: Math.max(0, totalBars - count), end: totalBars };
  }, [customRange, defaultLookback, totalBars]);

  // Sliced data arrays
  const sliceCloses = useMemo(() => rawCloses.slice(activeRange.start, activeRange.end), [rawCloses, activeRange]);
  const sliceOpens = useMemo(() => (opens && opens.length === totalBars) ? opens.slice(activeRange.start, activeRange.end) : [], [opens, totalBars, activeRange]);
  const sliceHighs = useMemo(() => (highs && highs.length === totalBars) ? highs.slice(activeRange.start, activeRange.end) : [], [highs, totalBars, activeRange]);
  const sliceLows = useMemo(() => (lows && lows.length === totalBars) ? lows.slice(activeRange.start, activeRange.end) : [], [lows, totalBars, activeRange]);
  const sliceDates = useMemo(() => (dates || []).slice(activeRange.start, activeRange.end), [dates, activeRange]);
  const sliceEma50 = useMemo(() => (ema50 || []).slice(activeRange.start, activeRange.end), [ema50, activeRange]);
  const sliceEma150 = useMemo(() => (ema150 || []).slice(activeRange.start, activeRange.end), [ema150, activeRange]);
  const sliceEma200 = useMemo(() => (ema200 || []).slice(activeRange.start, activeRange.end), [ema200, activeRange]);
  const sliceBanker = useMemo(() => (bankerSeries || []).slice(activeRange.start, activeRange.end), [bankerSeries, activeRange]);
  const sliceHotMoney = useMemo(() => (hotMoneySeries || []).slice(activeRange.start, activeRange.end), [hotMoneySeries, activeRange]);
  const sliceRetail = useMemo(() => (retailSeries || []).slice(activeRange.start, activeRange.end), [retailSeries, activeRange]);
  const sliceBankerMa = useMemo(() => (bankerMaSeries || []).slice(activeRange.start, activeRange.end), [bankerMaSeries, activeRange]);

  if (sliceCloses.length < 2) {
    return (
      <div className={`flex items-center justify-center rounded-3xl border border-white/10 bg-[#131722] text-slate-300 text-sm h-[600px] ${className}`}>
        Waiting for {symbol} chart data...
      </div>
    );
  }

  // Calculate price scale min/max
  let allPriceVals: number[] = [...sliceCloses];
  if (sliceHighs.length > 0) sliceHighs.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPriceVals.push(v); });
  if (sliceLows.length > 0) sliceLows.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPriceVals.push(v); });
  sliceEma150.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPriceVals.push(v); });
  sliceEma200.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPriceVals.push(v); });

  const rawMin = Math.min(...allPriceVals);
  const rawMax = Math.max(...allPriceVals);
  const paddingMargin = (rawMax - rawMin) * 0.08 || 1;
  const minPrice = Math.max(0, rawMin - paddingMargin);
  const maxPrice = rawMax + paddingMargin;
  const priceRange = maxPrice - minPrice || 1;

  // ViewBox layout dimensions (Main Chart ~460px + Dates 26px + Banker 120px = 650px Total)
  const vbWidth = 920;
  const vbHeight = 650;
  const padL = 15;
  const padR = 75; // room for right price axis labels
  const padT = 15;
  const dateAxisH = 26; // X-axis date area
  const bankerTitleH = 16; // Header space for MCDX Title
  const bankerBarsH = 100; // Banker histogram height
  const paneGap = 16; // Gap between date axis and banker sub-pane

  const priceChartH = vbHeight - padT - dateAxisH - bankerTitleH - bankerBarsH - paneGap; // ~477px
  const chartW = vbWidth - padL - padR;

  // Coordinate functions
  const getPriceY = (val: number) => {
    const norm = (val - minPrice) / priceRange;
    return padT + priceChartH - norm * priceChartH;
  };

  const getX = (idx: number, total: number) => {
    return padL + (idx / Math.max(1, total - 1)) * chartW;
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

  // Colors based on user's screenshot:
  // Bull = Yellow (#FFE600), Bear = Pink (#FF2A6D)
  const isUp = sliceCloses[sliceCloses.length - 1] >= sliceCloses[0];
  const priceColor = isUp ? '#FFE600' : '#FF2A6D';
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

  // Price Grid Lines (5 horizontal levels)
  const priceGridLevels = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const price = minPrice + ratio * priceRange;
    const y = padT + priceChartH - ratio * priceChartH;
    return { price, y };
  });

  const curPriceY = getPriceY(currentPrice);

  // Bar step and width calculations
  const barStep = chartW / Math.max(1, sliceCloses.length - 1);
  // Hairline gap matching TradingView histogram (ultra-thin hairline slit ~0.75px)
  const mcdxBarWidth = Math.max(
    1.2,
    barStep >= 8 ? barStep - 1 : (barStep >= 3.5 ? barStep - 0.75 : (barStep >= 2 ? barStep - 0.5 : barStep * 0.95))
  );

  // Candlestick calculation with real wicks and width
  const candleBarWidth = Math.max(3.5, Math.min(18, (chartW / sliceCloses.length) * 0.72));
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
    const bodyH = Math.max(2.5, yBottom - yTop);

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
      candleColor: isBull ? '#FFE600' : '#FF2A6D' // Bull = Yellow, Bear = Hot Pink
    };
  });

  // Date ticks (5-6 evenly spaced)
  const dateTickIndices = useMemo(() => {
    if (sliceDates.length === 0) return [];
    const count = Math.min(6, sliceDates.length);
    const step = Math.floor((sliceDates.length - 1) / (count - 1)) || 1;
    const indices: number[] = [];
    for (let i = 0; i < sliceDates.length; i += step) {
      indices.push(i);
    }
    if (indices[indices.length - 1] !== sliceDates.length - 1) {
      indices.push(sliceDates.length - 1);
    }
    return indices;
  }, [sliceDates]);

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const yr = parts[0].slice(2);
      return timeframe === '5Y' || timeframe === 'ALL'
        ? `${monthNames[mIdx] || ''} '${yr}`
        : `${monthNames[mIdx] || ''} ${day}`;
    }
    return dateStr;
  };

  // Interactive Mouse Move (Hover Crosshair)
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const normX = (mouseX / rect.width) * vbWidth;
    const relX = Math.max(0, Math.min(chartW, normX - padL));
    const idx = Math.round((relX / chartW) * (sliceCloses.length - 1));
    setHoverIdx(idx);

    // If dragging to pan
    if (isDragging && dragInitialRange) {
      const deltaX = e.clientX - dragStartX;
      const barsDelta = Math.round((deltaX / rect.width) * (dragInitialRange.end - dragInitialRange.start));
      const rangeSpan = dragInitialRange.end - dragInitialRange.start;

      let newStart = dragInitialRange.start - barsDelta;
      let newEnd = dragInitialRange.end - barsDelta;

      if (newStart < 0) {
        newStart = 0;
        newEnd = rangeSpan;
      }
      if (newEnd > totalBars) {
        newEnd = totalBars;
        newStart = Math.max(0, totalBars - rangeSpan);
      }

      setCustomRange({ start: newStart, end: newEnd });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragInitialRange({ ...activeRange });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragInitialRange(null);
  };

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

          {customRange && (
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30">
              Zoom: {sliceCloses.length} bars
            </span>
          )}
        </div>

        {/* Timeframe & Chart Style Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Reset Zoom Button */}
          <button
            onClick={() => {
              setTimeframe('6M');
              setCustomRange(null);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#1E222D] hover:bg-[#2A2E39] border border-white/10 text-slate-300 hover:text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
            title="Reset to 6M default timeframe"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset 6M</span>
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

          {/* Timeframe Zoom Buttons: 7D | 1M | 3M | 6M | 1Y | 5Y | ALL */}
          <div className="flex items-center p-1 rounded-xl bg-[#1E222D] border border-white/10 text-xs">
            {(['7D', '1M', '3M', '6M', '1Y', '5Y', 'ALL'] as TimeFrame[]).map(tf => (
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
            <span>C: <strong className={activeClose >= activeOpen ? 'text-[#FFE600]' : 'text-[#FF2A6D]'}>${activeClose.toFixed(2)}</strong></span>
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

      {/* Main Multi-Pane SVG Chart (Price ~460px + Banker ~110px) */}
      <div 
        ref={containerRef}
        className="relative w-full h-[560px] cursor-crosshair select-none"
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
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setHoverIdx(null);
            setIsDragging(false);
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

          {/* Price Grid Lines & Right Axis Labels */}
          {priceGridLevels.map((g, i) => (
            <g key={i}>
              <line
                x1={padL}
                y1={g.y}
                x2={vbWidth - padR}
                y2={g.y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
              />
              <text
                x={vbWidth - padR + 8}
                y={g.y + 4}
                fill="#94A3B8"
                fontSize="11"
                fontFamily="sans-serif"
              >
                ${g.price.toFixed(1)}
              </text>
            </g>
          ))}

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
              {/* EMA 200 (Orange/Gold Dashed) */}
              {ema200Path && (
                <path d={ema200Path} fill="none" stroke="#FFB300" strokeWidth="2" strokeDasharray="4 2" opacity="0.9" />
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
              {/* EMA 200 (Slow - Gold) */}
              {ema200Path && (
                <path d={ema200Path} fill="none" stroke="#FFB300" strokeWidth="2.5" opacity="0.95" />
              )}
              {/* EMA 150 (Medium - Royal Blue) */}
              {ema150Path && (
                <path d={ema150Path} fill="none" stroke="#2962FF" strokeWidth="2.5" opacity="0.95" />
              )}
              {/* EMA 50 (Fast - White) */}
              {ema50Path && (
                <path d={ema50Path} fill="none" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.95" />
              )}

              {/* Real Candlesticks (Yellow #FFE600 for Bull, Hot Pink #FF2A6D for Bear) */}
              {candles.map((cdl, i) => (
                <g key={i}>
                  {/* Upper Wick */}
                  <line
                    x1={cdl.x}
                    y1={cdl.yHigh}
                    x2={cdl.x}
                    y2={cdl.yTop}
                    stroke={cdl.candleColor}
                    strokeWidth="1.5"
                  />
                  {/* Lower Wick */}
                  <line
                    x1={cdl.x}
                    y1={cdl.yTop + cdl.bodyH}
                    x2={cdl.x}
                    y2={cdl.yLow}
                    stroke={cdl.candleColor}
                    strokeWidth="1.5"
                  />
                  {/* Candle Body */}
                  <rect
                    x={cdl.x - candleBarWidth / 2}
                    y={cdl.yTop}
                    width={candleBarWidth}
                    height={cdl.bodyH}
                    rx="1"
                    fill={cdl.candleColor}
                    stroke={cdl.candleColor}
                    strokeWidth="1"
                  />
                </g>
              ))}
            </>
          )}

          {/* ============================================================ */}
          {/* X-AXIS DATE LABELS */}
          {/* ============================================================ */}
          {dateTickIndices.map((dIdx) => {
            const dateX = getX(dIdx, sliceCloses.length);
            const label = formatDateLabel(sliceDates[dIdx]);
            return (
              <text
                key={dIdx}
                x={dateX}
                y={padT + priceChartH + 18}
                fill="#94A3B8"
                fontSize="11"
                fontFamily="sans-serif"
                textAnchor="middle"
              >
                {label}
              </text>
            );
          })}

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
                <g key={i}>
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
            💡 Scroll / Drag to Pan & Zoom
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
