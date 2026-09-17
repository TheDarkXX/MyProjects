import React, { useMemo } from 'react';
import * as d3 from 'd3';

interface DoublerConeChartProps {
  symbol: string;
  currentPrice: number;
  basePrice: number;
  targetPrice3Y: number;
  historicalPrices?: Array<{ date: string; price: number }>;
  className?: string;
}

export const DoublerConeChart: React.FC<DoublerConeChartProps> = ({
  symbol,
  currentPrice,
  basePrice,
  targetPrice3Y,
  historicalPrices = [],
  className = ''
}) => {
  // SVG Dimensions
  const width = 600;
  const height = 280;
  const margin = { top: 30, right: 65, bottom: 40, left: 55 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Cone Math: 3-Year Projection
  // Year 0 (Now) -> Year 1 -> Year 2 -> Year 3
  // Base Case: 26% CAGR -> Doubler (2.0x) in ~3 years
  // Bull Case: 38% CAGR -> 2.6x in 3 years
  // Bear Case: 14% CAGR -> 1.48x in 3 years
  const projection = useMemo(() => {
    const startP = currentPrice > 0 ? currentPrice : basePrice;
    const now = new Date();
    const y1 = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const y2 = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    const y3 = new Date(now.getFullYear() + 3, now.getMonth(), now.getDate());

    const bullY1 = startP * 1.38;
    const bullY2 = startP * Math.pow(1.38, 2);
    const bullY3 = startP * Math.pow(1.38, 3);

    const baseY1 = startP * 1.26;
    const baseY2 = startP * Math.pow(1.26, 2);
    const baseY3 = startP * Math.pow(1.26, 3);

    const bearY1 = startP * 1.14;
    const bearY2 = startP * Math.pow(1.14, 2);
    const bearY3 = startP * Math.pow(1.14, 3);

    return {
      points: [
        { date: now, bull: startP, base: startP, bear: startP, actual: startP },
        { date: y1, bull: bullY1, base: baseY1, bear: bearY1, actual: null },
        { date: y2, bull: bullY2, base: baseY2, bear: bearY2, actual: null },
        { date: y3, bull: bullY3, base: baseY3, bear: bearY3, actual: null }
      ],
      finalTarget: targetPrice3Y > 0 ? targetPrice3Y : startP * 2,
      startDate: now,
      endDate: y3,
      startPrice: startP
    };
  }, [currentPrice, basePrice, targetPrice3Y]);

  // Merge with historical points (last 6-12 months)
  const chartData = useMemo(() => {
    const hist = (historicalPrices || []).slice(-12).map(h => ({
      date: new Date(h.date),
      price: h.price
    }));

    const minDate = hist.length > 0 ? hist[0].date : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const maxDate = projection.endDate;

    const allPrices = [
      ...hist.map(h => h.price),
      projection.startPrice,
      projection.finalTarget,
      ...projection.points.map(p => p.bull),
      ...projection.points.map(p => p.bear)
    ];

    const minPrice = Math.max(0, Math.min(...allPrices) * 0.85);
    const maxPrice = Math.max(...allPrices) * 1.12;

    const xScale = d3.scaleTime()
      .domain([minDate, maxDate])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([minPrice, maxPrice])
      .range([innerHeight, 0]);

    // Area generator for the cone (between Bull and Bear)
    const areaGenerator = d3.area<any>()
      .x(d => xScale(d.date))
      .y0(d => yScale(d.bear))
      .y1(d => yScale(d.bull))
      .curve(d3.curveMonotoneX);

    // Line generator for Base Case
    const baseLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.base))
      .curve(d3.curveMonotoneX);

    // Line generator for Bull Case
    const bullLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.bull))
      .curve(d3.curveMonotoneX);

    // Line generator for Bear Case
    const bearLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.bear))
      .curve(d3.curveMonotoneX);

    // Line generator for History
    const historyLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.price))
      .curve(d3.curveMonotoneX);

    return {
      xScale,
      yScale,
      areaPath: areaGenerator(projection.points) || '',
      basePath: baseLine(projection.points) || '',
      bullPath: bullLine(projection.points) || '',
      bearPath: bearLine(projection.points) || '',
      histPath: hist.length > 0 ? (historyLine(hist) || '') : '',
      currentX: xScale(projection.startDate),
      currentY: yScale(projection.startPrice),
      targetY: yScale(projection.finalTarget),
      ticksX: xScale.ticks(5),
      ticksY: yScale.ticks(4)
    };
  }, [projection, historicalPrices, innerWidth, innerHeight]);

  return (
    <div className={`relative bg-[#0B1226]/95 border border-blue-900/50 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md ${className}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <h4 className="text-[13px] font-medium text-slate-200 uppercase tracking-wide">
            3-Year Doubler Cone ({symbol})
          </h4>
        </div>
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="flex items-center gap-1 text-emerald-300 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" /> Bull +38%
          </span>
          <span className="flex items-center gap-1 text-cyan-200 font-medium bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full inline-block" /> Base +26% (2X)
          </span>
          <span className="flex items-center gap-1 text-slate-300 font-normal bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/60">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full inline-block" /> Bear +14%
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[450px]"
        >
          <defs>
            <linearGradient id="coneGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="historyGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid Lines */}
            {chartData.ticksY.map((tick, i) => (
              <g key={`y-${i}`} transform={`translate(0, ${chartData.yScale(tick)})`}>
                <line x1={0} x2={innerWidth} stroke="#1E293B" strokeDasharray="3,3" strokeOpacity={0.8} />
                <text x={-10} dy="0.32em" textAnchor="end" className="fill-slate-100 text-[13px] font-mono font-bold">
                  ${tick.toFixed(0)}
                </text>
              </g>
            ))}

            {/* Target 2X Horizontal Reference Line */}
            <g transform={`translate(0, ${chartData.targetY})`}>
              <line x1={0} x2={innerWidth} stroke="#10B981" strokeWidth={2} strokeDasharray="5,4" />
              <text x={innerWidth - 110} dy="-8" className="fill-emerald-300 text-[13px] font-black font-mono">
                2X Goal (${projection.finalTarget.toFixed(0)})
              </text>
            </g>

            {/* The Shaded Cone */}
            <path d={chartData.areaPath} fill="url(#coneGradient)" />

            {/* Cone Outline Lines */}
            <path d={chartData.bullPath} fill="none" stroke="#10B981" strokeWidth={1.5} strokeOpacity={0.9} />
            <path d={chartData.basePath} fill="none" stroke="#38BDF8" strokeWidth={3} filter="url(#glow)" />
            <path d={chartData.bearPath} fill="none" stroke="#94A3B8" strokeWidth={1.5} strokeOpacity={0.8} />

            {/* Historical Price Line */}
            {chartData.histPath && (
              <path d={chartData.histPath} fill="none" stroke="url(#historyGradient)" strokeWidth={2.5} />
            )}

            {/* Current Price Dot & Pulse */}
            <circle
              cx={chartData.currentX}
              cy={chartData.currentY}
              r={8}
              fill="#38BDF8"
              className="animate-ping opacity-60"
            />
            <circle
              cx={chartData.currentX}
              cy={chartData.currentY}
              r={5}
              fill="#FFFFFF"
              stroke="#0284C7"
              strokeWidth={3}
            />

            {/* Label for Current Price */}
            <g transform={`translate(${chartData.currentX}, ${chartData.currentY - 14})`}>
              <rect x={-34} y={-18} width={68} height={22} rx={6} fill="#060A16" stroke="#38BDF8" strokeWidth={1.5} />
              <text textAnchor="middle" dy="-2" className="fill-white text-[13px] font-black font-mono">
                ${currentPrice.toFixed(1)}
              </text>
            </g>

            {/* X-Axis Ticks */}
            {chartData.ticksX.map((tick, i) => (
              <g key={`x-${i}`} transform={`translate(${chartData.xScale(tick)}, ${innerHeight})`}>
                <line y1={0} y2={6} stroke="#334155" />
                <text y={20} textAnchor="middle" className="fill-slate-100 text-[13px] font-mono font-bold">
                  {tick.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-1 pt-2 border-t border-blue-900/30 flex items-center justify-between text-[12px] text-slate-300 font-normal">
        <div>
          ฐาน: <span className="font-mono font-medium text-white">${basePrice.toFixed(1)}</span>
        </div>
        <div>
          เป้า 1 เด้ง: <span className="font-mono font-bold text-emerald-300">${targetPrice3Y.toFixed(0)}</span> (+100%)
        </div>
        <div>
          CAGR ฐาน: <span className="font-mono font-medium text-cyan-200">26.0% / ปี</span>
        </div>
      </div>
    </div>
  );
};
