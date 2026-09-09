import React, { useState, useRef } from 'react';
import { Activity, Zap, ExternalLink } from 'lucide-react';

interface TradingViewChartProps {
  symbol: string;
  closes: number[];
  ema150?: (number | null)[];
  ema200?: (number | null)[];
  banker?: number;
  currentPrice: number;
  scenario?: number;
  badge?: string;
  trafficLight?: 'BUY_ZONE' | 'WAIT' | 'DANGER';
  distEma150?: number;
  distEma200?: number;
  height?: number;
  className?: string;
  onAddInflow?: () => void;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  closes = [],
  ema150 = [],
  ema200 = [],
  banker = 0,
  currentPrice,
  scenario = 1,
  badge = 'Setup',
  trafficLight = 'BUY_ZONE',
  distEma150 = 0,
  distEma200 = 0,
  height = 360,
  className = '',
  onAddInflow
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const validCloses = (closes || []).filter(c => typeof c === 'number' && !isNaN(c));

  if (validCloses.length < 2) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-white/5 bg-[#131722] text-slate-400 text-sm ${className}`}
        style={{ height }}
      >
        Waiting for {symbol} candle data...
      </div>
    );
  }

  // Calculate scales
  let allVals: number[] = [...validCloses];
  ema150.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allVals.push(v); });
  ema200.forEach(v => { if (typeof v === 'number' && !isNaN(v)) allVals.push(v); });

  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const paddingMargin = (rawMax - rawMin) * 0.08 || 1;
  const min = Math.max(0, rawMin - paddingMargin);
  const max = rawMax + paddingMargin;
  const range = max - min || 1;

  const vbWidth = 800;
  const vbHeight = 320;
  const padL = 15;
  const padR = 65; // room for right price axis labels
  const padT = 20;
  const padB = 30;

  const chartW = vbWidth - padL - padR;
  const chartH = vbHeight - padT - padB;

  const getY = (val: number) => {
    const norm = (val - min) / range;
    return padT + chartH - norm * chartH;
  };

  const getX = (idx: number, total: number) => {
    return padL + (idx / Math.max(1, total - 1)) * chartW;
  };

  // Build Price Path
  const pricePoints = validCloses.map((c, i) => `${getX(i, validCloses.length)},${getY(c)}`);
  const pricePath = `M ${pricePoints.join(' L ')}`;
  const lastX = getX(validCloses.length - 1, validCloses.length);
  const firstX = getX(0, validCloses.length);
  const areaPath = `M ${firstX},${padT + chartH} L ${pricePoints.join(' L ')} L ${lastX},${padT + chartH} Z`;

  // Color theme: Bullish vs Bearish
  const isUp = validCloses[validCloses.length - 1] >= validCloses[0];
  const priceColor = isUp ? '#26A69A' : '#EF5350';
  const gradId = `tv-grad-${symbol}-${isUp ? 'up' : 'down'}`;

  // EMA paths
  let ema150Path = '';
  if (ema150.length === closes.length) {
    const pts: string[] = [];
    ema150.forEach((val, i) => {
      if (val !== null && !isNaN(val)) pts.push(`${getX(i, closes.length)},${getY(val)}`);
    });
    if (pts.length > 1) ema150Path = `M ${pts.join(' L ')}`;
  }

  let ema200Path = '';
  if (ema200.length === closes.length) {
    const pts: string[] = [];
    ema200.forEach((val, i) => {
      if (val !== null && !isNaN(val)) pts.push(`${getX(i, closes.length)},${getY(val)}`);
    });
    if (pts.length > 1) ema200Path = `M ${pts.join(' L ')}`;
  }

  // Horizontal Grid Lines (4 levels)
  const gridLevels = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const price = min + ratio * range;
    const y = padT + chartH - ratio * chartH;
    return { price, y };
  });

  // Current Price Y
  const curY = getY(currentPrice);

  // Mouse hover calculation
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const normX = (mouseX / rect.width) * vbWidth;
    const relX = Math.max(0, Math.min(chartW, normX - padL));
    const idx = Math.round((relX / chartW) * (validCloses.length - 1));
    setHoverIdx(idx);
  };

  const activeIdx = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < validCloses.length ? hoverIdx : validCloses.length - 1;
  const activeClose = validCloses[activeIdx];
  const activeEma150 = ema150[activeIdx];
  const activeEma200 = ema200[activeIdx];
  const activeX = getX(activeIdx, validCloses.length);
  const activeY = getY(activeClose);

  // Traffic Light Styling (Cyan for Buy Zone)
  const getTrafficBadge = () => {
    if (trafficLight === 'BUY_ZONE') {
      return {
        icon: '🔷',
        text: 'BUY ZONE',
        bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
        glow: 'shadow-[0_0_12px_rgba(0,229,255,0.25)]'
      };
    }
    if (trafficLight === 'WAIT') {
      return {
        icon: '🟡',
        text: 'WAIT ZONE',
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
        glow: ''
      };
    }
    return {
      icon: '🔴',
      text: 'DANGER ZONE',
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      glow: ''
    };
  };

  const badgeInfo = getTrafficBadge();

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-3xl border border-white/10 bg-[#131722] p-5 shadow-2xl overflow-hidden backdrop-blur-xl ${className}`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-white">{symbol}</span>
            <span className="text-xl font-bold text-slate-200">${currentPrice.toFixed(2)}</span>
          </div>

          {/* Traffic Light Badge (Electric Cyan) */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${badgeInfo.bg} ${badgeInfo.glow}`}>
            <span>{badgeInfo.icon}</span>
            <span>{badgeInfo.text}</span>
          </div>

          {/* Scenario Tag */}
          <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
            {badge}
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-0.5 rounded-full bg-[#26A69A]" />
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
          <a
            href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Open in TradingView"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main SVG Chart Area */}
      <div className="relative w-full flex-1 min-h-[260px] cursor-crosshair select-none my-2">
        <svg
          viewBox={`0 0 ${vbWidth} ${vbHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={priceColor} stopOpacity="0.32" />
              <stop offset="50%" stopColor={priceColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={priceColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and right price scale */}
          {gridLevels.map((g, i) => (
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

          {/* Current Price Reference Line */}
          <line
            x1={padL}
            y1={curY}
            x2={vbWidth - padR}
            y2={curY}
            stroke={priceColor}
            strokeDasharray="2 2"
            strokeOpacity="0.6"
          />

          {/* Current Price Badge on Right Axis */}
          <g transform={`translate(${vbWidth - padR + 6}, ${curY - 9})`}>
            <rect
              width="54"
              height="18"
              rx="4"
              fill={priceColor}
            />
            <text
              x="27"
              y="13"
              fill="#FFFFFF"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              ${currentPrice.toFixed(1)}
            </text>
          </g>

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#${gradId})`} />

          {/* EMA 200 Path (Golden Yellow) */}
          {ema200Path && (
            <path
              d={ema200Path}
              fill="none"
              stroke="#FFD740"
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.9"
            />
          )}

          {/* EMA 150 Path (Electric Blue) */}
          {ema150Path && (
            <path
              d={ema150Path}
              fill="none"
              stroke="#2962FF"
              strokeWidth="2.2"
              opacity="0.95"
            />
          )}

          {/* Main Price Line */}
          <path
            d={pricePath}
            fill="none"
            stroke={priceColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Crosshair */}
          {hoverIdx !== null && (
            <g>
              <line
                x1={activeX}
                y1={padT}
                x2={activeX}
                y2={padT + chartH}
                stroke="#64748B"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <line
                x1={padL}
                y1={activeY}
                x2={vbWidth - padR}
                y2={activeY}
                stroke="#64748B"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle
                cx={activeX}
                cy={activeY}
                r="5"
                fill={priceColor}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Technical Radar Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs text-slate-300">
        <div className="flex items-center gap-4 flex-wrap">
          {/* EMA distances */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">vs EMA 150:</span>
            <span className={`font-semibold ${distEma150 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {distEma150 >= 0 ? `+${distEma150}%` : `${distEma150}%`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">vs EMA 200:</span>
            <span className={`font-semibold ${distEma200 >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {distEma200 >= 0 ? `+${distEma200}%` : `${distEma200}%`}
            </span>
          </div>

          {/* Banker Flow Gauge */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Banker Flow:</span>
            <div className="flex items-center gap-1">
              <div className="w-20 h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (banker / 20) * 100)}%` }}
                />
              </div>
              <span className="font-bold text-amber-300">{banker}/20</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {onAddInflow && (
          <button
            onClick={onAddInflow}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>คำนวณเติมเงินตัวนี้ →</span>
          </button>
        )}
      </div>
    </div>
  );
};
