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
  const height = 290;
  const margin = { top: 32, right: 70, bottom: 42, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Real Cost Basis and 2X Target Alignment
  const costBasis = basePrice > 0 ? basePrice : (currentPrice > 0 ? currentPrice : 100);
  const finalTarget = targetPrice3Y > 0 ? targetPrice3Y : costBasis * 2;
  const startP = currentPrice > 0 ? currentPrice : costBasis;
  const pnlPct = costBasis > 0 ? ((startP - costBasis) / costBasis) * 100 : 0;

  // 3-Year Projection from current position toward investment horizon
  // Base Case: 26% CAGR -> Doubler (2.0x) from base
  // Bull Case: 38% CAGR -> 2.6x
  // Bear Case: 14% CAGR -> 1.48x
  const projection = useMemo(() => {
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
      startDate: now,
      endDate: y3,
      startPrice: startP
    };
  }, [startP]);

  // Merge with historical prices (simulated or real last 6-12 months)
  const chartData = useMemo(() => {
    const hist = (historicalPrices || []).slice(-12).map(h => ({
      date: new Date(h.date),
      price: h.price
    }));

    // Inception point (simulated 6 months ago for cost basis anchor)
    const costDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const minDate = hist.length > 0 ? (hist[0].date < costDate ? hist[0].date : costDate) : costDate;
    const maxDate = projection.endDate;

    const allPrices = [
      costBasis,
      finalTarget,
      startP,
      ...hist.map(h => h.price),
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

    // Area generator for the cone (Bull to Bear)
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
      costY: yScale(costBasis),
      targetY: yScale(finalTarget),
      ticksX: xScale.ticks(5),
      ticksY: yScale.ticks(4)
    };
  }, [projection, historicalPrices, costBasis, finalTarget, startP, innerWidth, innerHeight]);

  return (
    <div className={`relative bg-[#0B1226]/95 border border-blue-900/60 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md ${className}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <h4 className="text-[15px] font-semibold text-slate-100 uppercase tracking-wide">
            3-Year Doubler Cone ({symbol})
          </h4>
        </div>
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="flex items-center gap-1 text-blue-200 font-medium bg-blue-900/40 px-2 py-0.5 rounded border border-blue-700/50">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block" /> Bull +38%
          </span>
          <span className="flex items-center gap-1 text-slate-200 font-medium bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/50">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" /> Base +26% (2X)
          </span>
          <span className="flex items-center gap-1 text-rose-300 font-normal bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
            <span className="w-1.5 h-1.5 bg-rose-400 rounded-full inline-block" /> Bear +14%
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
            <linearGradient id="doublerConeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#1E40AF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="historyLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="1" />
            </linearGradient>
            <filter id="doublerGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid Lines */}
            {chartData.ticksY.map((tick, i) => (
              <g key={`y-${i}`} transform={`translate(0, ${chartData.yScale(tick)})`}>
                <line x1={0} x2={innerWidth} stroke="#1E293B" strokeDasharray="3,3" strokeOpacity={0.8} />
                <text x={-10} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[13px] font-mono font-medium">
                  ${tick.toFixed(0)}
                </text>
              </g>
            ))}

            {/* Target 2X Horizontal Reference Line (Steel Blue) */}
            <g transform={`translate(0, ${chartData.targetY})`}>
              <line x1={0} x2={innerWidth} stroke="#3B82F6" strokeWidth={2} strokeDasharray="5,4" />
              <text x={innerWidth - 125} dy="-8" className="fill-blue-400 text-[13px] font-bold font-mono">
                2X Goal (${finalTarget.toFixed(1)})
              </text>
            </g>

            {/* Cost Basis Reference Line (Muted Slate) */}
            <g transform={`translate(0, ${chartData.costY})`}>
              <line x1={0} x2={innerWidth} stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4,3" strokeOpacity={0.85} />
              <text x={innerWidth - 125} dy="15" className="fill-slate-300 text-[12px] font-medium font-mono">
                My Cost (${costBasis.toFixed(1)})
              </text>
            </g>

            {/* The Shaded Cone */}
            <path d={chartData.areaPath} fill="url(#doublerConeGrad)" />

            {/* Cone Outline Lines: Bull = Light Blue, Base = Primary Blue, Bear = Deep Red */}
            <path d={chartData.bullPath} fill="none" stroke="#60A5FA" strokeWidth={2} strokeOpacity={0.95} />
            <path d={chartData.basePath} fill="none" stroke="#3B82F6" strokeWidth={2.5} filter="url(#doublerGlow)" />
            <path d={chartData.bearPath} fill="none" stroke="#DC2626" strokeWidth={1.8} strokeOpacity={0.85} />

            {/* Historical Price Line */}
            {chartData.histPath && (
              <path d={chartData.histPath} fill="none" stroke="url(#historyLineGrad)" strokeWidth={2.5} />
            )}

            {/* Current Price Dot & Glow */}
            <circle
              cx={chartData.currentX}
              cy={chartData.currentY}
              r={8}
              fill="#60A5FA"
              className="animate-ping opacity-60"
            />
            <circle
              cx={chartData.currentX}
              cy={chartData.currentY}
              r={5}
              fill="#FFFFFF"
              stroke="#1D4ED8"
              strokeWidth={3}
            />

            {/* Label for Current Price */}
            <g transform={`translate(${chartData.currentX}, ${chartData.currentY - 14})`}>
              <rect x={-42} y={-18} width={84} height={22} rx={6} fill="#060A16" stroke="#3B82F6" strokeWidth={1.5} />
              <text textAnchor="middle" dy="-2" className="fill-white text-[13px] font-semibold font-mono">
                ${startP.toFixed(1)}
              </text>
            </g>

            {/* X-Axis Ticks */}
            {chartData.ticksX.map((tick, i) => (
              <g key={`x-${i}`} transform={`translate(${chartData.xScale(tick)}, ${innerHeight})`}>
                <line y1={0} y2={6} stroke="#334155" />
                <text y={20} textAnchor="middle" className="fill-slate-300 text-[13px] font-mono font-medium">
                  {tick.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-1 pt-2.5 border-t border-blue-900/40 flex flex-wrap items-center justify-between gap-2 text-[14px] text-slate-300 font-normal">
        <div>
          ทุนเฉลี่ย: <span className="font-mono font-semibold text-slate-200">${costBasis.toFixed(1)}</span>
        </div>
        <div>
          ราคาปัจจุบัน:{' '}
          <span className="font-mono font-semibold text-white">${startP.toFixed(1)}</span>{' '}
          <span className={`text-[12px] font-mono font-medium ${pnlPct >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
            ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
          </span>
        </div>
        <div>
          เป้า 1 เด้ง:{' '}
          <span className="font-mono font-semibold text-blue-300">${finalTarget.toFixed(0)}</span>{' '}
          <span className="text-blue-400/80 text-[12px]">(+100%)</span>
        </div>
        <div>
          CAGR ฐาน: <span className="font-mono font-semibold text-slate-200">26.0% / ปี</span>
        </div>
      </div>
    </div>
  );
};
