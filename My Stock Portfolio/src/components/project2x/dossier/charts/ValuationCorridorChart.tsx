import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { BarChart3 } from 'lucide-react';
import type { PEHistoryItem } from '../../../../stores/dossierStore';

interface ValuationCorridorChartProps {
  symbol: string;
  peHistory: PEHistoryItem[];
  currentPE?: number;
  currentPEG?: number;
}

export const ValuationCorridorChart: React.FC<ValuationCorridorChartProps> = ({
  symbol,
  peHistory,
  currentPE = 0,
  currentPEG = 0,
}) => {
  const width = 440;
  const height = 160;
  const margin = { top: 16, right: 48, bottom: 24, left: 36 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const chartData = useMemo(() => {
    if (!peHistory || peHistory.length < 3) return null;

    const sorted = [...peHistory]
      .filter(p => p.pe > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sorted.length < 3) return null;

    const peValues = sorted.map(p => p.pe);
    const meanPE = d3.mean(peValues) || 30;
    const stdDev = d3.deviation(peValues) || 5;
    const upperBand = meanPE + stdDev;
    const lowerBand = Math.max(0, meanPE - stdDev);

    const xScale = d3.scaleTime()
      .domain(d3.extent(sorted, d => new Date(d.date)) as [Date, Date])
      .range([0, innerW]);

    const allPE = sorted.flatMap(p => [p.pe, p.pe_forward || p.pe]);
    const yMin = Math.max(0, (d3.min(allPE) || 10) * 0.85);
    const yMax = (d3.max(allPE) || 50) * 1.1;

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([innerH, 0]);

    // PE trailing line
    const peLine = d3.line<PEHistoryItem>()
      .x(d => xScale(new Date(d.date)))
      .y(d => yScale(d.pe))
      .curve(d3.curveMonotoneX)(sorted) || '';

    // Forward PE line
    const fwdSorted = sorted.filter(p => p.pe_forward && p.pe_forward > 0);
    const fwdLine = fwdSorted.length > 2
      ? d3.line<PEHistoryItem>()
          .x(d => xScale(new Date(d.date)))
          .y(d => yScale(d.pe_forward || d.pe))
          .curve(d3.curveMonotoneX)(fwdSorted) || ''
      : '';

    // Band area
    const bandArea = d3.area<PEHistoryItem>()
      .x(d => xScale(new Date(d.date)))
      .y0(() => yScale(lowerBand))
      .y1(() => yScale(upperBand))
      .curve(d3.curveMonotoneX)(sorted) || '';

    // Mean line
    const meanLineY = yScale(meanPE);

    // Latest point
    const lastItem = sorted[sorted.length - 1];
    const lastX = xScale(new Date(lastItem.date));
    const lastY = yScale(lastItem.pe);

    return {
      peLine,
      fwdLine,
      bandArea,
      meanLineY,
      meanPE: meanPE.toFixed(1),
      lastX,
      lastY,
      lastPE: lastItem.pe.toFixed(1),
      upperBand: upperBand.toFixed(1),
      lowerBand: lowerBand.toFixed(1),
      totalPoints: sorted.length,
    };
  }, [peHistory, innerW, innerH]);

  if (!chartData) {
    return (
      <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span className="text-slate-200 text-[16px] font-medium">PE Valuation Corridor (3Y)</span>
        </div>
        <div className="h-20 flex items-center justify-center text-slate-400 text-[14px]">
          ข้อมูล PE History ไม่เพียงพอ ({peHistory?.length || 0} snapshots)
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span className="text-slate-200 text-[16px] font-medium">PE Valuation Corridor (3Y)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[12px] font-medium">
            {chartData.totalPoints} snapshots
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-[160px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`corridorBand_${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Mean Band Shading */}
            <path d={chartData.bandArea} fill={`url(#corridorBand_${symbol})`} />

            {/* Mean Line */}
            <line
              x1={0} x2={innerW}
              y1={chartData.meanLineY} y2={chartData.meanLineY}
              stroke="#A78BFA" strokeDasharray="4,4" strokeWidth={1} opacity={0.6}
            />
            <text x={innerW + 4} y={chartData.meanLineY} dy="0.35em" className="fill-purple-300 text-[12px] font-mono font-medium">
              Mean {chartData.meanPE}x
            </text>

            {/* Forward PE Line */}
            {chartData.fwdLine && (
              <path d={chartData.fwdLine} fill="none" stroke="#38BDF8" strokeWidth={1.5} strokeDasharray="3,3" opacity={0.7} />
            )}

            {/* Trailing PE Line */}
            <path d={chartData.peLine} fill="none" stroke="#C084FC" strokeWidth={2} />

            {/* Latest PE Dot */}
            <circle cx={chartData.lastX} cy={chartData.lastY} r={4} fill="#fff" stroke="#C084FC" strokeWidth={2} />
            <text x={innerW + 4} y={chartData.lastY} dy="0.35em" className="fill-white text-[13px] font-mono font-semibold">
              {chartData.lastPE}x
            </text>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-1 text-[14px]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-purple-400 inline-block" />
            <span className="text-slate-300">Trailing PE</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-cyan-400 inline-block" style={{ borderTop: '1px dashed' }} />
            <span className="text-slate-300">Forward PE</span>
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[14px]">
          <span className="text-purple-300">Band: {chartData.lowerBand}x – {chartData.upperBand}x</span>
        </div>
      </div>
    </div>
  );
};
