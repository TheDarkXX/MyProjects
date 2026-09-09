import React, { useState, useRef, useMemo } from 'react';
import { Activity, Zap, ExternalLink, BarChart3, TrendingUp } from 'lucide-react';

interface TradingViewChartProps {
  symbol: string;
  dates?: string[];
  closes: number[];
  ema150?: (number | null)[];
  ema200?: (number | null)[];
  bankerSeries?: number[];
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

type TimeFrame = '7D' | '1M' | '3M' | 'ALL';
type ChartStyle = 'AREA' | 'CANDLE';

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  dates = [],
  closes = [],
  ema150 = [],
  ema200 = [],
  bankerSeries = [],
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
  const [timeframe, setTimeframe] = useState<TimeFrame>('1M');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('AREA');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const rawCloses = (closes || []).filter(c => typeof c === 'number' && !isNaN(c));

  // Determine lookback based on timeframe
  const lookbackDays = useMemo(() => {
    switch (timeframe) {
      case '7D': return 7;
      case '1M': return 30;
      case '3M': return 60;
      case 'ALL': return rawCloses.length;
      default: return 30;
    }
  }, [timeframe, rawCloses.length]);

  // Slice data based on timeframe
  const sliceCloses = useMemo(() => rawCloses.slice(-lookbackDays), [rawCloses, lookbackDays]);
  const sliceDates = useMemo(() => (dates || []).slice(-lookbackDays), [dates, lookbackDays]);
  const sliceEma150 = useMemo(() => (ema150 || []).slice(-lookbackDays), [ema150, lookbackDays]);
  const sliceEma200 = useMemo(() => (ema200 || []).slice(-lookbackDays), [ema200, lookbackDays]);
  const sliceBanker = useMemo(() => (bankerSeries || []).slice(-lookbackDays), [bankerSeries, lookbackDays]);

  if (sliceCloses.length < 2) {
    return (
      <div className={`flex items-center justify-center rounded-3xl border border-white/10 bg-[#131722] text-slate-400 text-sm h-[420px] ${className}`}>
        Waiting for {symbol} chart data...
      </div>
    );
  }

  // Calculate price scale
  let allPriceVals: number[] = [...sliceCloses];
  sliceEma150.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPriceVals.push(v); });
  sliceEma200.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allPriceVals.push(v); });

  const rawMin = Math.min(...allPriceVals);
  const rawMax = Math.max(...allPriceVals);
  const paddingMargin = (rawMax - rawMin) * 0.08 || 1;
  const minPrice = Math.max(0, rawMin - paddingMargin);
  const maxPrice = rawMax + paddingMargin;
  const priceRange = maxPrice - minPrice || 1;

  // ViewBox layout dimensions
  const vbWidth = 840;
  const vbHeight = 440;
  const padL = 15;
  const padR = 65; // room for right price axis labels
  const padT = 15;
  const dateAxisH = 25; // X-axis date area
  const bankerPaneH = 80; // Banker sub-pane height
  const paneGap = 15;

  const priceChartH = vbHeight - padT - dateAxisH - bankerPaneH - paneGap;
  const chartW = vbWidth - padL - padR;

  // Coordinate functions
  const getPriceY = (val: number) => {
    const norm = (val - minPrice) / priceRange;
    return padT + priceChartH - norm * priceChartH;
  };

  const getX = (idx: number, total: number) => {
    return padL + (idx / Math.max(1, total - 1)) * chartW;
  };

  const bankerTopY = padT + priceChartH + paneGap;
  const getBankerY = (score: number) => {
    const clamped = Math.max(0, Math.min(20, score));
    return bankerTopY + bankerPaneH - (clamped / 20) * bankerPaneH;
  };

  // Build Price Area & Path
  const pricePoints = sliceCloses.map((c, i) => `${getX(i, sliceCloses.length)},${getPriceY(c)}`);
  const pricePath = `M ${pricePoints.join(' L ')}`;
  const firstX = getX(0, sliceCloses.length);
  const lastX = getX(sliceCloses.length - 1, sliceCloses.length);
  const areaPath = `M ${firstX},${padT + priceChartH} L ${pricePoints.join(' L ')} L ${lastX},${padT + priceChartH} Z`;

  // Color theme: Bullish vs Bearish
  const isUp = sliceCloses[sliceCloses.length - 1] >= sliceCloses[0];
  const priceColor = isUp ? '#00E5FF' : '#EF5350';
  const gradId = `tv-grad-${symbol}-${isUp ? 'up' : 'down'}`;

  // EMA paths
  let ema150Path = '';
  if (sliceEma150.length === sliceCloses.length) {
    const pts: string[] = [];
    sliceEma150.forEach((val, i) => {
      if (val !== null && !isNaN(val)) pts.push(`${getX(i, sliceCloses.length)},${getPriceY(val)}`);
    });
    if (pts.length > 1) ema150Path = `M ${pts.join(' L ')}`;
  }

  let ema200Path = '';
  if (sliceEma200.length === sliceCloses.length) {
    const pts: string[] = [];
    sliceEma200.forEach((val, i) => {
      if (val !== null && !isNaN(val)) pts.push(`${getX(i, sliceCloses.length)},${getPriceY(val)}`);
    });
    if (pts.length > 1) ema200Path = `M ${pts.join(' L ')}`;
  }

  // Price Grid Lines (4 levels)
  const priceGridLevels = [0, 0.33, 0.66, 1].map(ratio => {
    const price = minPrice + ratio * priceRange;
    const y = padT + priceChartH - ratio * priceChartH;
    return { price, y };
  });

  // Current Price Y
  const curPriceY = getPriceY(currentPrice);

  // Candlestick calculation
  const candleBarWidth = Math.max(3, Math.min(18, (chartW / sliceCloses.length) * 0.65));
  const candles = sliceCloses.map((close, i) => {
    const open = i > 0 ? sliceCloses[i - 1] : close * 0.997;
    const isBull = close >= open;
    const spread = Math.abs(close - open);
    const high = Math.max(open, close) + spread * 0.4 + close * 0.001;
    const low = Math.min(open, close) - spread * 0.4 - close * 0.001;
    const x = getX(i, sliceCloses.length);
    const yHigh = getPriceY(high);
    const yLow = getPriceY(low);
    const yTop = getPriceY(Math.max(open, close));
    const yBottom = getPriceY(Math.min(open, close));
    const bodyH = Math.max(2, yBottom - yTop);
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
      bodyH
    };
  });

  // X-Axis Date ticks (4-5 evenly distributed)
  const dateTickIndices = useMemo(() => {
    if (sliceDates.length === 0) return [];
    const count = Math.min(5, sliceDates.length);
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
      return `${monthNames[mIdx] || ''} ${day}`;
    }
    return dateStr;
  };

  // Mouse hover calculation
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const normX = (mouseX / rect.width) * vbWidth;
    const relX = Math.max(0, Math.min(chartW, normX - padL));
    const idx = Math.round((relX / chartW) * (sliceCloses.length - 1));
    setHoverIdx(idx);
  };

  const activeIdx = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < sliceCloses.length
    ? hoverIdx
    : sliceCloses.length - 1;
  const activeClose = sliceCloses[activeIdx];
  const activeDate = sliceDates[activeIdx] || '';
  const activeEma150 = sliceEma150[activeIdx];
  const activeEma200 = sliceEma200[activeIdx];
  const activeBanker = sliceBanker[activeIdx] ?? banker;
  const activeX = getX(activeIdx, sliceCloses.length);
  const activePriceY = getPriceY(activeClose);

  // Traffic Light Styling (Electric Cyan)
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
      ref={containerRef}
      className={`relative flex flex-col rounded-3xl border border-white/10 bg-[#131722] p-5 shadow-2xl overflow-hidden backdrop-blur-2xl ${className}`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-white">{symbol}</span>
            <span className="text-xl font-bold text-slate-200 tabular-nums">${currentPrice.toFixed(2)}</span>
          </div>

          {/* Traffic Light Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black ${badgeInfo.bg}`}>
            <span>{badgeInfo.icon}</span>
            <span>{badgeInfo.text}</span>
          </div>

          <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300 font-semibold">
            {badge}
          </span>
        </div>

        {/* Timeframe & Chart Style Toggles */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Chart Style Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-[#1E222D] border border-white/10 text-xs">
            <button
              onClick={() => setChartStyle('AREA')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                chartStyle === 'AREA' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setChartStyle('CANDLE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                chartStyle === 'CANDLE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Candle
            </button>
          </div>

          {/* Timeframe Zoom Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-[#1E222D] border border-white/10 text-xs">
            {(['7D', '1M', '3M', 'ALL'] as TimeFrame[]).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  timeframe === tf ? 'bg-blue-600 text-white font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <a
            href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 p-2 rounded-xl bg-[#1E222D] hover:bg-[#2A2E39] border border-white/10 text-slate-400 hover:text-cyan-300 transition-colors"
            title="Open in TradingView Desktop/Web"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Interactive Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs text-slate-300">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full bg-[#00E5FF]" />
            <span>Price: <strong className="text-white">${activeClose.toFixed(2)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-0.5 rounded-full bg-[#2962FF]" />
            <span>EMA 150: <strong>{activeEma150 ? `$${activeEma150.toFixed(1)}` : 'N/A'}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-0.5 rounded-full bg-[#FFD740]" />
            <span>EMA 200: <strong>{activeEma200 ? `$${activeEma200.toFixed(1)}` : 'N/A'}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <span className="w-2 h-2 rounded bg-amber-400" />
            <span>Banker: {activeBanker.toFixed(1)}/20</span>
          </div>
        </div>

        {activeDate && (
          <span className="text-slate-400 font-medium">
            Date: <strong className="text-slate-200">{activeDate}</strong>
          </span>
        )}
      </div>

      {/* Main Multi-Pane SVG Chart (Price Area + Banker MCDX) */}
      <div className="relative w-full h-[380px] cursor-crosshair select-none">
        <svg
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={priceColor} stopOpacity="0.30" />
              <stop offset="60%" stopColor={priceColor} stopOpacity="0.06" />
              <stop offset="100%" stopColor={priceColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* ============================================================ */}
          {/* PANE 1: PRICE CHART AREA */}
          {/* ============================================================ */}

          {/* Price Grid lines & Right Y-Axis Scale */}
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
                fontSize="10"
                fontFamily="sans-serif"
              >
                ${g.price.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Current Price Dashed Reference Line */}
          <line
            x1={padL}
            y1={curPriceY}
            x2={vbWidth - padR}
            y2={curPriceY}
            stroke={priceColor}
            strokeDasharray="2 2"
            strokeOpacity="0.6"
          />

          {/* Current Price Badge on Right Axis */}
          <g transform={`translate(${vbWidth - padR + 6}, ${curPriceY - 9})`}>
            <rect width="54" height="18" rx="4" fill={priceColor} />
            <text
              x="27"
              y="13"
              fill="#0F172A"
              fontSize="10"
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
              {/* EMA 200 (Yellow) */}
              {ema200Path && (
                <path d={ema200Path} fill="none" stroke="#FFD740" strokeWidth="2" strokeDasharray="4 2" opacity="0.9" />
              )}
              {/* EMA 150 (Blue) */}
              {ema150Path && (
                <path d={ema150Path} fill="none" stroke="#2962FF" strokeWidth="2.2" opacity="0.95" />
              )}
              {/* Main Price Line */}
              <path d={pricePath} fill="none" stroke={priceColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Chart Style: CANDLESTICK */}
          {chartStyle === 'CANDLE' && (
            <>
              {/* EMA Underlays */}
              {ema200Path && (
                <path d={ema200Path} fill="none" stroke="#FFD740" strokeWidth="1.8" strokeDasharray="4 2" opacity="0.8" />
              )}
              {ema150Path && (
                <path d={ema150Path} fill="none" stroke="#2962FF" strokeWidth="2" opacity="0.85" />
              )}

              {/* Candles */}
              {candles.map((cdl, i) => (
                <g key={i}>
                  {/* Wick */}
                  <line
                    x1={cdl.x}
                    y1={cdl.yHigh}
                    x2={cdl.x}
                    y2={cdl.yLow}
                    stroke={cdl.isBull ? '#00E5FF' : '#EF5350'}
                    strokeWidth="1.2"
                  />
                  {/* Body */}
                  <rect
                    x={cdl.x - candleBarWidth / 2}
                    y={cdl.yTop}
                    width={candleBarWidth}
                    height={cdl.bodyH}
                    rx="1.5"
                    fill={cdl.isBull ? '#00E5FF' : '#EF5350'}
                    fillOpacity={cdl.isBull ? 0.9 : 0.9}
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
                y={padT + priceChartH + 16}
                fill="#94A3B8"
                fontSize="10"
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
              y1={bankerTopY - 6}
              x2={vbWidth - padR}
              y2={bankerTopY - 6}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />

            {/* Sub-pane Title */}
            <text
              x={padL}
              y={bankerTopY + 12}
              fill="#F59E0B"
              fontSize="9"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              BANKER MCDX FLOW (SUPER MONEY)
            </text>

            {/* Threshold Line 10 (Banker Entry) */}
            <line
              x1={padL}
              y1={getBankerY(10)}
              x2={vbWidth - padR}
              y2={getBankerY(10)}
              stroke="#F59E0B"
              strokeDasharray="2 3"
              strokeOpacity="0.4"
            />
            <text
              x={vbWidth - padR + 8}
              y={getBankerY(10) + 3}
              fill="#F59E0B"
              fontSize="9"
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
              stroke="rgba(255,255,255,0.06)"
            />
            <text
              x={vbWidth - padR + 8}
              y={getBankerY(0) + 3}
              fill="#64748B"
              fontSize="9"
              fontFamily="sans-serif"
            >
              0
            </text>

            {/* Banker Bars */}
            {sliceCloses.map((_, i) => {
              const bScore = sliceBanker[i] ?? 0;
              const barX = getX(i, sliceCloses.length);
              const barY = getBankerY(bScore);
              const barH = Math.max(1, (bankerTopY + bankerPaneH) - barY);
              const isHeavy = bScore >= 10;
              const barW = Math.max(2, candleBarWidth * 0.9);

              return (
                <rect
                  key={i}
                  x={barX - barW / 2}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx="1"
                  fill={isHeavy ? '#F59E0B' : bScore > 0 ? '#FCD34D' : '#334155'}
                  fillOpacity={isHeavy ? 0.95 : bScore > 0 ? 0.7 : 0.3}
                />
              );
            })}
          </g>

          {/* ============================================================ */}
          {/* INTERACTIVE HOVER CROSSHAIR */}
          {/* ============================================================ */}
          {hoverIdx !== null && (
            <g>
              {/* Vertical line through both panes */}
              <line
                x1={activeX}
                y1={padT}
                x2={activeX}
                y2={bankerTopY + bankerPaneH}
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

      {/* Footer Info & Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs text-slate-300">
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
            <span className="font-extrabold text-amber-300">
              {banker >= 10 ? '🔥 Institutional Inflow' : banker > 0 ? '🟡 Light Flow' : '⚪ Zero Banker'}
            </span>
          </div>
        </div>

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
  );
};
