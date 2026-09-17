import React, { useMemo, useState } from 'react';
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
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 440;
  const height = 160;
  const margin = { top: 16, right: 52, bottom: 24, left: 36 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const chartData = useMemo(() => {
    if (!peHistory || peHistory.length < 3) return null;

    const sorted = [...peHistory]
      .filter((p) => p.pe > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sorted.length < 3) return null;

    const peValues = sorted.map((p) => p.pe);
    const meanPE = d3.mean(peValues) || 30;
    const stdDev = d3.deviation(peValues) || 5;
    const upperBand = meanPE + stdDev;
    const lowerBand = Math.max(0, meanPE - stdDev);

    const xScale = d3.scaleTime()
      .domain(d3.extent(sorted, (d) => new Date(d.date)) as [Date, Date])
      .range([0, innerW]);

    const allPE = sorted.flatMap((p) => [p.pe, p.pe_forward || p.pe]);
    const yMin = Math.max(0, (d3.min(allPE) || 10) * 0.85);
    const yMax = (d3.max(allPE) || 50) * 1.1;

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([innerH, 0]);

    // PE trailing line
    const peLine = d3.line<PEHistoryItem>()
      .x((d) => xScale(new Date(d.date)))
      .y((d) => yScale(d.pe))
      .curve(d3.curveMonotoneX)(sorted) || '';

    // Forward PE line
    const fwdSorted = sorted.filter((p) => p.pe_forward && p.pe_forward > 0);
    const fwdLine = fwdSorted.length > 2
      ? d3.line<PEHistoryItem>()
          .x((d) => xScale(new Date(d.date)))
          .y((d) => yScale(d.pe_forward || d.pe))
          .curve(d3.curveMonotoneX)(fwdSorted) || ''
      : '';

    // Band area
    const bandArea = d3.area<PEHistoryItem>()
      .x((d) => xScale(new Date(d.date)))
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
      <div className="bg-[#0B1226]/95 p-4 rounded-2xl border border-blue-900/60 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-100 text-[16px] font-semibold">PE Valuation Corridor (3Y)</span>
        </div>
        <div className="h-20 flex items-center justify-center text-slate-400 text-[14px]">
          ข้อมูล PE History ไม่เพียงพอ ({peHistory?.length || 0} snapshots)
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B1226]/95 p-4 rounded-2xl border border-blue-900/60 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <span className="text-slate-100 text-[16px] font-semibold">PE Valuation Corridor (3Y)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-950/70 text-cyan-300 border border-blue-800/60 text-[12px] font-mono font-medium">
            {chartData.totalPoints} snapshots
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-[170px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left - margin.left;
            const boundedX = Math.max(0, Math.min(innerW, mouseX));
            const idx = Math.min(peHistory.length - 1, Math.max(0, Math.round((boundedX / innerW) * (peHistory.length - 1))));
            setHoverIdx(idx);
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={`corridorBand_${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#0B1226" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Mean Band Shading (Deep Blue) */}
            <path d={chartData.bandArea} fill={`url(#corridorBand_${symbol})`} />

            {/* Mean Line (Yellow Gold) */}
            <line
              x1={0}
              x2={innerW}
              y1={chartData.meanLineY}
              y2={chartData.meanLineY}
              stroke="#FACC15"
              strokeDasharray="4,4"
              strokeWidth={1.4}
              opacity={0.85}
            />
            <text x={innerW + 6} y={chartData.meanLineY} dy="0.35em" className="fill-amber-300 text-xs font-mono font-semibold">
              Mean {chartData.meanPE}x
            </text>

            {/* Forward PE Line (Cyan Dashed) */}
            {chartData.fwdLine && (
              <path d={chartData.fwdLine} fill="none" stroke="#38BDF8" strokeWidth={1.8} strokeDasharray="3,3" opacity={0.85} />
            )}

            {/* Trailing PE Line (Orange Vibrant) */}
            <path d={chartData.peLine} fill="none" stroke="#F97316" strokeWidth={2.4} />

            {/* Latest PE Dot */}
            {hoverIdx === null && (
              <>
                <circle cx={chartData.lastX} cy={chartData.lastY} r={4.5} fill="#FFFFFF" stroke="#F97316" strokeWidth={2.5} />
                <text x={innerW + 6} y={chartData.lastY} dy="0.35em" className="fill-white text-sm font-mono font-bold">
                  {chartData.lastPE}x
                </text>
              </>
            )}

            {/* Hover Indicator */}
            {hoverIdx !== null && peHistory[hoverIdx] && (
              <g>
                {(() => {
                  const item = peHistory[hoverIdx];
                  const hX = (hoverIdx / (peHistory.length - 1)) * innerW;
                  return (
                    <>
                      <line x1={hX} x2={hX} y1={0} y2={innerH} stroke="#F97316" strokeDasharray="2,2" strokeWidth={1} />
                      <circle cx={hX} cy={chartData.lastY} r={5} fill="#F97316" stroke="#FFFFFF" strokeWidth={2} />
                      <rect
                        x={Math.min(innerW - 80, Math.max(0, hX - 40))}
                        y={Math.max(0, chartData.lastY - 26)}
                        width={80}
                        height={20}
                        rx={4}
                        fill="#141E38"
                        stroke="#F97316"
                        strokeWidth={1}
                      />
                      <text
                        x={Math.min(innerW - 80, Math.max(0, hX - 40)) + 40}
                        y={Math.max(0, chartData.lastY - 26) + 14}
                        textAnchor="middle"
                        className="fill-slate-100 font-mono text-[11px] font-bold"
                      >
                        PE {item.pe.toFixed(1)}x
                      </text>
                    </>
                  );
                })()}
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-900/40 text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-1 rounded bg-orange-500 inline-block shadow-sm" />
            <span className="text-slate-300">Trailing PE</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-1 rounded bg-cyan-400 inline-block" style={{ borderTop: '1px dashed' }} />
            <span className="text-slate-300">Forward PE</span>
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-sm font-semibold">
          <span className="text-slate-400">Band:</span>
          <span className="text-emerald-400">{chartData.lowerBand}x</span>
          <span className="text-slate-500">–</span>
          <span className="text-rose-400">{chartData.upperBand}x</span>
        </div>
      </div>
    </div>
  );
};
