import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Target, TrendingUp, Sparkles, Clock, Calendar } from 'lucide-react';

interface DoublerConeChartProps {
  symbol: string;
  currentPrice: number;
  basePrice: number; // Thesis Start Price
  targetPrice3Y: number; // 2X Target Price
  anchorDate?: string | null; // Date thesis started (first buy date)
  horizonYears?: number; // Horizon in years (default 3)
  historicalPrices?: Array<{ date: string; price: number }>;
  className?: string;
}

export const DoublerConeChart: React.FC<DoublerConeChartProps> = ({
  symbol,
  currentPrice,
  basePrice,
  targetPrice3Y,
  anchorDate,
  horizonYears = 3,
  historicalPrices = [],
  className = ''
}) => {
  // SVG Dimensions & Margins
  const width = 600;
  const height = 310;
  const margin = { top: 32, right: 88, bottom: 44, left: 56 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Thesis Start & Target Alignment (Decoupled from DCA avgCost)
  const thesisStart = basePrice > 0 ? basePrice : (currentPrice > 0 ? currentPrice : 100);
  const finalTarget = targetPrice3Y > 0 ? targetPrice3Y : Number((thesisStart * 2).toFixed(2));
  const growthFromStartPct = thesisStart > 0 ? ((currentPrice - thesisStart) / thesisStart) * 100 : 0;
  const distToGoalPct = currentPrice > 0 ? ((finalTarget - currentPrice) / currentPrice) * 100 : 0;

  // Interactive Hover & Highlight States
  const [hoverData, setHoverData] = useState<{
    mouseX: number;
    date: Date;
    bull: number;
    base: number;
    bear: number;
    tYears: number;
  } | null>(null);

  const [highlightedCase, setHighlightedCase] = useState<'all' | 'bull' | 'base' | 'bear'>('all');

  // Smooth Continuous 36-Month Exponential Growth Projection from Thesis Anchor Date
  const projection = useMemo(() => {
    let startDate: Date;
    if (anchorDate) {
      startDate = new Date(anchorDate);
      if (isNaN(startDate.getTime())) startDate = new Date();
    } else {
      startDate = new Date();
    }

    const totalYears = horizonYears || 3;
    const totalMonths = Math.round(totalYears * 12);
    const points: Array<{ date: Date; bull: number; base: number; bear: number; t: number }> = [];

    // Generate monthly steps from startDate to endDate
    for (let m = 0; m <= totalMonths; m++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + m, startDate.getDate());
      const t = m / 12; // Time in years
      points.push({
        date: d,
        bull: thesisStart * Math.pow(1.38, t),
        base: thesisStart * Math.pow(1.26, t),
        bear: thesisStart * Math.pow(1.14, t),
        t
      });
    }

    return {
      points,
      startDate,
      endDate: points[points.length - 1].date,
      startPrice: thesisStart
    };
  }, [anchorDate, horizonYears, thesisStart]);

  // Scaled Data & Generator Setup
  const chartData = useMemo(() => {
    const hist = (historicalPrices || []).map(h => ({
      date: new Date(h.date),
      price: h.price
    }));

    const minDate = projection.startDate;
    const maxDate = projection.endDate;
    const today = new Date();

    const allPrices = [
      thesisStart,
      finalTarget,
      currentPrice,
      ...hist.map(h => h.price),
      ...projection.points.map(p => p.bull),
      ...projection.points.map(p => p.bear)
    ];

    const minPrice = Math.max(0, Math.min(...allPrices) * 0.88);
    const maxPrice = Math.max(...allPrices) * 1.10;

    const xScale = d3.scaleTime()
      .domain([minDate, maxDate])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([minPrice, maxPrice])
      .range([innerHeight, 0]);

    // Area generator for the cone (Bull down to Bear)
    const areaGenerator = d3.area<any>()
      .x(d => xScale(d.date))
      .y0(d => yScale(d.bear))
      .y1(d => yScale(d.bull))
      .curve(d3.curveMonotoneX);

    // Curve generators
    const bullLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.bull))
      .curve(d3.curveMonotoneX);

    const baseLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.base))
      .curve(d3.curveMonotoneX);

    const bearLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.bear))
      .curve(d3.curveMonotoneX);

    const historyLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.price))
      .curve(d3.curveMonotoneX);

    const todayX = Math.max(0, Math.min(innerWidth, xScale(today)));
    const todayY = yScale(currentPrice);
    const anchorX = xScale(projection.startDate);
    const anchorY = yScale(thesisStart);

    return {
      xScale,
      yScale,
      areaPath: areaGenerator(projection.points) || '',
      bullPath: bullLine(projection.points) || '',
      basePath: baseLine(projection.points) || '',
      bearPath: bearLine(projection.points) || '',
      histPath: hist.length > 0 ? (historyLine(hist) || '') : '',
      anchorX,
      anchorY,
      todayX,
      todayY,
      targetY: yScale(finalTarget),
      ticksX: xScale.ticks(4),
      ticksY: yScale.ticks(4)
    };
  }, [projection, historicalPrices, thesisStart, finalTarget, currentPrice, innerWidth, innerHeight]);

  // Mouse Move Crosshair Handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - margin.left;
    const boundedX = Math.max(0, Math.min(innerWidth, mouseX));

    const hoverDate = chartData.xScale.invert(boundedX);
    const startDate = projection.startDate;

    // Calculate elapsed projection years from thesis start
    const diffMs = hoverDate.getTime() - startDate.getTime();
    const tYears = Math.max(0, Math.min(3, diffMs / (365.25 * 24 * 60 * 60 * 1000)));

    const bull = thesisStart * Math.pow(1.38, tYears);
    const base = thesisStart * Math.pow(1.26, tYears);
    const bear = thesisStart * Math.pow(1.14, tYears);

    setHoverData({
      mouseX: boundedX,
      date: hoverDate,
      bull,
      base,
      bear,
      tYears
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  const remainingMonths = useMemo(() => {
    const now = new Date();
    const end = projection.endDate;
    const diffMs = end.getTime() - now.getTime();
    return Math.max(0, Math.round(diffMs / (30.4375 * 24 * 60 * 60 * 1000)));
  }, [projection.endDate]);

  return (
    <div className={`relative bg-[#12162B]/95 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md ${className}`}>
      {/* Header Info with Interactive Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(130,58,253,0.8)] flex-shrink-0" />
          <h4 className="text-[15px] font-bold text-slate-100 tracking-wide uppercase">
            3-Year Doubler Cone ({symbol})
          </h4>
        </div>

        {/* Interactive Legend Pills */}
        <div className="flex items-center gap-1.5 text-[12px] flex-wrap">
          <button
            type="button"
            onMouseEnter={() => setHighlightedCase('bull')}
            onMouseLeave={() => setHighlightedCase('all')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all duration-200 cursor-pointer ${
              highlightedCase === 'bull' || highlightedCase === 'all'
                ? 'bg-orange-950/40 text-orange-200 border-orange-500/50 shadow-[0_0_8px_rgba(253,85,20,0.35)]'
                : 'bg-slate-900/40 text-slate-400 border-slate-800/40 opacity-40'
            }`}
          >
            <span className="w-2 h-2 bg-[#FD5514] rounded-full shadow-[0_0_4px_#FD5514]" />
            <span>Bull +38%</span>
          </button>

          <button
            type="button"
            onMouseEnter={() => setHighlightedCase('base')}
            onMouseLeave={() => setHighlightedCase('all')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all duration-200 cursor-pointer ${
              highlightedCase === 'base' || highlightedCase === 'all'
                ? 'bg-violet-950/60 text-violet-200 border-violet-500/60 shadow-[0_0_10px_rgba(130,58,253,0.5)]'
                : 'bg-slate-900/40 text-slate-400 border-slate-800/40 opacity-40'
            }`}
          >
            <span className="w-2 h-2 bg-[#823AFD] rounded-full shadow-[0_0_5px_#823AFD]" />
            <span>Base +26% (2X)</span>
          </button>

          <button
            type="button"
            onMouseEnter={() => setHighlightedCase('bear')}
            onMouseLeave={() => setHighlightedCase('all')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all duration-200 cursor-pointer ${
              highlightedCase === 'bear' || highlightedCase === 'all'
                ? 'bg-pink-950/40 text-pink-200 border-[#FC2D79]/50 shadow-[0_0_8px_rgba(252,45,121,0.35)]'
                : 'bg-slate-900/40 text-slate-400 border-slate-800/40 opacity-40'
            }`}
          >
            <span className="w-2 h-2 bg-[#FC2D79] rounded-full shadow-[0_0_4px_#FC2D79]" />
            <span>Bear +14%</span>
          </button>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-visible">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Elegant Cone Gradient */}
            <linearGradient id="doublerConeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#823AFD" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#A855F7" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#FD5514" stopOpacity="0.10" />
            </linearGradient>

            {/* Neon Glow Filters */}
            <filter id="doublerNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="targetLineGlow" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="2" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Y-Axis Horizontal Grid Lines */}
            {chartData.ticksY.map((tick, i) => (
              <g key={`y-${i}`} transform={`translate(0, ${chartData.yScale(tick)})`}>
                <line x1={0} x2={innerWidth} stroke="#1E293B" strokeDasharray="3,3" strokeOpacity={0.8} />
                <text x={-10} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[12px] font-mono font-medium">
                  ${tick.toFixed(0)}
                </text>
              </g>
            ))}

            {/* 2X Goal Horizontal Guideline (Burnt Orange) */}
            <g transform={`translate(0, ${chartData.targetY})`}>
              <line x1={0} x2={innerWidth} stroke="#FD5514" strokeWidth={1.8} strokeDasharray="6,4" opacity={0.85} filter="url(#targetLineGlow)" />
              {/* Right Margin Badge */}
              <g transform={`translate(${innerWidth + 6}, 0)`}>
                <rect x={0} y={-11} width={76} height={22} rx={6} fill="#1F1510" stroke="#FD5514" strokeWidth={1.2} />
                <text x={38} y={4} textAnchor="middle" className="fill-orange-300 text-[12px] font-mono font-bold">
                  2X ${finalTarget.toFixed(0)}
                </text>
              </g>
            </g>

            {/* Thesis Start Guideline (Violet) */}
            <g transform={`translate(0, ${chartData.anchorY})`}>
              <line x1={0} x2={innerWidth} stroke="#823AFD" strokeWidth={1.2} strokeDasharray="3,3" opacity={0.6} />
              <g transform={`translate(${innerWidth + 6}, 0)`}>
                <rect x={0} y={-10} width={76} height={20} rx={5} fill="#130F26" stroke="#823AFD" strokeWidth={1} />
                <text x={38} y={4} textAnchor="middle" className="fill-violet-300 text-[11px] font-mono font-bold">
                  เริ่ม ${thesisStart.toFixed(0)}
                </text>
              </g>
            </g>

            {/* Shaded Area of the Doubler Cone */}
            <path d={chartData.areaPath} fill="url(#doublerConeGrad)" />

            {/* Historical Price Curve (Past Track) */}
            {chartData.histPath && (
              <path d={chartData.histPath} fill="none" stroke="#C084FC" strokeWidth={2.4} opacity={0.8} />
            )}

            {/* Bull Case Curve */}
            <path
              d={chartData.bullPath}
              fill="none"
              stroke="#FD5514"
              strokeWidth={highlightedCase === 'bull' ? 3.2 : 2.2}
              opacity={highlightedCase === 'all' || highlightedCase === 'bull' ? 0.95 : 0.2}
              filter={highlightedCase === 'bull' ? 'url(#doublerNeonGlow)' : undefined}
              className="transition-all duration-200"
            />

            {/* Base Case Curve (Doubler Path - Highlighted by default) */}
            <path
              d={chartData.basePath}
              fill="none"
              stroke="#823AFD"
              strokeWidth={highlightedCase === 'base' ? 3.6 : 2.8}
              opacity={highlightedCase === 'all' || highlightedCase === 'base' ? 1.0 : 0.2}
              filter="url(#doublerNeonGlow)"
              className="transition-all duration-200"
            />

            {/* Bear Case Curve */}
            <path
              d={chartData.bearPath}
              fill="none"
              stroke="#FC2D79"
              strokeWidth={highlightedCase === 'bear' ? 3.0 : 1.8}
              opacity={highlightedCase === 'all' || highlightedCase === 'bear' ? 0.9 : 0.2}
              filter={highlightedCase === 'bear' ? 'url(#doublerNeonGlow)' : undefined}
              className="transition-all duration-200"
            />

            {/* Today Vertical Timeline Marker */}
            <line
              x1={chartData.todayX}
              x2={chartData.todayX}
              y1={0}
              y2={innerHeight}
              stroke="#06B6D4"
              strokeWidth={1.5}
              strokeDasharray="4,3"
              opacity={0.7}
            />

            {/* Today Label Tag */}
            <g transform={`translate(${chartData.todayX}, -8)`}>
              <text textAnchor="middle" className="fill-cyan-300 text-[10px] font-bold tracking-wider uppercase">
                TODAY
              </text>
            </g>

            {/* Thesis Start Point Marker */}
            <circle
              cx={chartData.anchorX}
              cy={chartData.anchorY}
              r={5}
              fill="#823AFD"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />

            {/* Current Price Beacon (Glow & Pulse at Today) */}
            <circle
              cx={chartData.todayX}
              cy={chartData.todayY}
              r={12}
              fill="#06B6D4"
              opacity={0.35}
              className="animate-ping"
            />
            <circle
              cx={chartData.todayX}
              cy={chartData.todayY}
              r={7}
              fill="#06B6D4"
              stroke="#FFFFFF"
              strokeWidth={2.5}
              filter="url(#doublerNeonGlow)"
            />

            {/* Current Price Tag Badge */}
            <g transform={`translate(${Math.max(40, chartData.todayX - 10)}, ${chartData.todayY - 14})`}>
              <rect x={-36} y={-16} width={72} height={20} rx={5} fill="#0C0F1D" stroke="#06B6D4" strokeWidth={1.5} />
              <text textAnchor="middle" dy="-2" className="fill-white text-[13px] font-bold font-mono">
                ${currentPrice.toFixed(1)}
              </text>
            </g>

            {/* Interactive Crosshair Tracking Line */}
            {hoverData && (
              <g>
                <line
                  x1={hoverData.mouseX}
                  x2={hoverData.mouseX}
                  y1={0}
                  y2={innerHeight}
                  stroke="#A855F7"
                  strokeWidth={1.5}
                  strokeDasharray="3,3"
                  opacity={0.85}
                />
                {/* Indicator Dots on the 3 curves */}
                <circle cx={hoverData.mouseX} cy={chartData.yScale(hoverData.bull)} r={4.5} fill="#FD5514" stroke="#FFF" strokeWidth={1.5} />
                <circle cx={hoverData.mouseX} cy={chartData.yScale(hoverData.base)} r={5} fill="#823AFD" stroke="#FFF" strokeWidth={2} />
                <circle cx={hoverData.mouseX} cy={chartData.yScale(hoverData.bear)} r={4.5} fill="#FC2D79" stroke="#FFF" strokeWidth={1.5} />
              </g>
            )}

            {/* X-Axis Date Ticks (Spaced cleanly with no text overlap) */}
            {chartData.ticksX.map((tick, i) => (
              <g key={`x-${i}`} transform={`translate(${chartData.xScale(tick)}, ${innerHeight})`}>
                <line y1={0} y2={6} stroke="#334155" />
                <text y={22} textAnchor="middle" className="fill-slate-300 text-[12px] font-mono font-medium">
                  {tick.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* Floating Glassmorphism Tooltip on Mouse Tracking */}
        {hoverData && (
          <div
            className="absolute pointer-events-none z-30 transition-transform duration-75"
            style={{
              left: `${hoverData.mouseX + margin.left}px`,
              top: '8px',
              transform: hoverData.mouseX > innerWidth * 0.65 ? 'translateX(-105%)' : 'translateX(12px)'
            }}
          >
            <div className="bg-[#0C0F1D]/95 border border-violet-500/40 shadow-2xl rounded-xl p-3 text-xs backdrop-blur-md min-w-[170px] space-y-1.5 font-mono">
              <div className="flex items-center justify-between border-b border-white/10 pb-1 text-slate-300 font-sans">
                <span className="font-bold">
                  {hoverData.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[11px] text-violet-300 font-bold">
                  Year {hoverData.tYears.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-orange-300">
                <span className="text-[12px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FD5514]" /> Bull (+38%)
                </span>
                <span className="font-bold">${hoverData.bull.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-violet-200">
                <span className="text-[12px] flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#823AFD]" /> Base (+26%)
                </span>
                <span className="font-bold text-white">${hoverData.base.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-pink-300">
                <span className="text-[12px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" /> Bear (+14%)
                </span>
                <span className="font-bold">${hoverData.bear.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-2.5 pt-2.5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[13px] text-slate-300">
        <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
          <div className="text-slate-400 text-[12px] flex items-center gap-1">
            <Calendar className="w-3 h-3 text-violet-400" />
            <span>ราคาเริ่ม Thesis</span>
          </div>
          <div className="font-mono font-bold text-violet-300 mt-0.5">
            ${thesisStart.toFixed(1)}{' '}
            <span className="text-[11px] text-slate-400 font-normal">
              ({anchorDate ? anchorDate.slice(0, 7) : 'Not started'})
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
          <div className="text-slate-400 text-[12px]">ราคาปัจจุบัน</div>
          <div className="font-mono font-bold text-white mt-0.5 flex items-center gap-1">
            <span>${currentPrice.toFixed(1)}</span>
            <span className={`text-[12px] font-semibold ${growthFromStartPct >= 0 ? 'text-emerald-400' : 'text-[#FC2D79]'}`}>
              ({growthFromStartPct >= 0 ? '+' : ''}{growthFromStartPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
          <div className="text-slate-400 text-[12px] flex items-center gap-1">
            <Target className="w-3 h-3 text-orange-400" />
            <span>เป้า 1 เด้ง (2X)</span>
          </div>
          <div className="font-mono font-bold text-orange-300 mt-0.5">
            ${finalTarget.toFixed(0)}{' '}
            <span className="text-[12px] text-slate-400">
              ({distToGoalPct > 0 ? `เหลือ +${distToGoalPct.toFixed(0)}%` : '🏆 ทะลุเป้า!'})
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
          <div className="text-slate-400 text-[12px] flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>เวลาที่เหลือ</span>
          </div>
          <div className="font-mono font-bold text-cyan-300 mt-0.5">
            {remainingMonths > 0 ? `${remainingMonths} เดือน` : 'ครบ 3 ปี'}
            <span className="text-[11px] text-slate-400 font-normal ml-1">(CAGR 26%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
