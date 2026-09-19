import React, { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { api } from '../../../../services/api';
import { Shield, Flame, Target } from 'lucide-react';

export type TimeframeOption = '6M' | '1Y' | '3Y' | 'MAX';

interface TacticalMiniPulseProps {
  symbol: string;
  currentPrice: number;
  avgCost?: number;
  ema50?: number | null;
  ema150?: number | null;
  ema200?: number | null;
  bankerFlow?: number;
  className?: string;
}

export const TacticalMiniPulse: React.FC<TacticalMiniPulseProps> = ({
  symbol,
  currentPrice,
  avgCost = 0,
  ema50,
  ema200,
  bankerFlow = 0,
  className = ''
}) => {
  const [masterCandles, setMasterCandles] = useState<Array<{ date: Date; close: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeframeOption>('1Y');

  // Fetch full historical candles once (enabling 0ms instant client-side switching)
  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const res = await api.chart.get(symbol, 36500, '1D');
        if (!isMounted || !res || !Array.isArray(res.dates) || !Array.isArray(res.closes) || res.dates.length === 0) {
          setIsLoading(false);
          return;
        }

        const valid: Array<{ date: Date; close: number }> = [];
        for (let i = 0; i < res.dates.length; i++) {
          const d = res.dates[i];
          const c = res.closes[i];
          if (d && c != null && !isNaN(Number(c))) {
            valid.push({ date: new Date(d), close: Number(c) });
          }
        }
        valid.sort((a, b) => a.date.getTime() - b.date.getTime());

        if (isMounted) {
          setMasterCandles(valid);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [symbol]);

  // 0ms Instant client-side filtering according to active timeframe
  const candles = useMemo(() => {
    if (masterCandles.length === 0) return [];
    if (timeframe === 'MAX') return masterCandles;

    const latestDate = masterCandles[masterCandles.length - 1].date;
    const cutoff = new Date(latestDate);

    if (timeframe === '6M') {
      cutoff.setMonth(cutoff.getMonth() - 6);
    } else if (timeframe === '1Y') {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    } else if (timeframe === '3Y') {
      cutoff.setFullYear(cutoff.getFullYear() - 3);
    }

    const filtered = masterCandles.filter((c) => c.date >= cutoff);
    if (filtered.length > 0) return filtered;

    // Fallback if data points are sparse or recent IPO
    const sliceCountMap: Record<TimeframeOption, number> = {
      '6M': 126,
      '1Y': 252,
      '3Y': 756,
      'MAX': masterCandles.length,
    };
    return masterCandles.slice(-sliceCountMap[timeframe]);
  }, [masterCandles, timeframe]);

  // Timeframe Header Metadata & Range Labels
  const currentMeta = useMemo(() => {
    const metaMap: Record<TimeframeOption, { title: string; subtitle: string; rangeLabel: string }> = {
      '6M': {
        title: 'TACTICAL PRICE PULSE — 6 Month',
        subtitle: `ย้อนหลัง 6 เดือน • ${candles.length} วันทำการ`,
        rangeLabel: '6M Range',
      },
      '1Y': {
        title: 'TACTICAL PRICE PULSE — 52 Week',
        subtitle: `ย้อนหลัง 52 สัปดาห์ • ${candles.length} วันทำการ`,
        rangeLabel: '52W Range',
      },
      '3Y': {
        title: 'TACTICAL PRICE PULSE — 3 Year',
        subtitle: `ย้อนหลัง 3 ปี • ${candles.length} วันทำการ`,
        rangeLabel: '3Y Range',
      },
      'MAX': {
        title: 'TACTICAL PRICE PULSE — Max Lifetime',
        subtitle: `ย้อนหลังทั้งหมด (ตั้งแต่ IPO) • ${candles.length} วันทำการ`,
        rangeLabel: 'MAX Range',
      },
    };
    return metaMap[timeframe];
  }, [timeframe, candles.length]);

  // Dimensions
  const width = 500;
  const height = 120;
  const margin = { top: 12, right: 60, bottom: 20, left: 10 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Math & Scales
  const { pathD, areaD, currentX, currentY, costY, rangeLow, rangeHigh, rangePct } = useMemo(() => {
    if (candles.length === 0) {
      return { pathD: '', areaD: '', currentX: 0, currentY: 0, costY: null, rangeLow: 0, rangeHigh: 0, rangePct: 0 };
    }

    const closes = candles.map((d) => d.close);
    const low = Math.min(...closes);
    const high = Math.max(...closes);

    const xScale = d3.scaleTime()
      .domain(d3.extent(candles, (d) => d.date) as [Date, Date])
      .range([0, innerWidth]);

    const yMin = Math.min(low, avgCost > 0 ? avgCost : low) * 0.96;
    const yMax = Math.max(high, avgCost > 0 ? avgCost : high) * 1.04;

    const yScale = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([innerHeight, 0]);

    const lineGenerator = d3.line<{ date: Date; close: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.close))
      .curve(d3.curveMonotoneX);

    const areaGenerator = d3.area<{ date: Date; close: number }>()
      .x((d) => xScale(d.date))
      .y0(innerHeight)
      .y1((d) => yScale(d.close))
      .curve(d3.curveMonotoneX);

    const last = candles[candles.length - 1];
    const cX = xScale(last.date);
    const cY = yScale(currentPrice > 0 ? currentPrice : last.close);
    const cYCost = avgCost > 0 ? yScale(avgCost) : null;

    const pct = high > low ? Math.min(100, Math.max(0, ((currentPrice - low) / (high - low)) * 100)) : 50;

    return {
      pathD: lineGenerator(candles) || '',
      areaD: areaGenerator(candles) || '',
      currentX: cX,
      currentY: cY,
      costY: cYCost,
      rangeLow: low,
      rangeHigh: high,
      rangePct: pct,
    };
  }, [candles, currentPrice, avgCost, innerWidth, innerHeight]);

  // Distance from EMAs
  const ema50Cushion = ema50 && currentPrice > 0 ? ((currentPrice - ema50) / ema50) * 100 : null;
  const ema200Cushion = ema200 && currentPrice > 0 ? ((currentPrice - ema200) / ema200) * 100 : null;

  // Crosshair Hover State
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleTimeframeChange = (newTf: TimeframeOption) => {
    setHoveredIndex(null);
    setTimeframe(newTf);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (candles.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - margin.left;
    const boundedX = Math.max(0, Math.min(innerWidth, mouseX));
    const idx = Math.min(candles.length - 1, Math.max(0, Math.round((boundedX / innerWidth) * (candles.length - 1))));
    setHoveredIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const hoveredCandle = hoveredIndex !== null ? candles[hoveredIndex] : null;

  return (
    <div className={`bg-[#12162B]/95 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(130,58,253,0.8)] flex-shrink-0" />
          <div>
            <h4 className="text-base font-bold text-slate-100 tracking-wide">
              {currentMeta.title}
            </h4>
            <p className="text-[13px] text-slate-300">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-sm">
          {/* Interactive Timeframe Selector (Pill Controls) */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-white/10 shadow-inner">
            {(['6M', '1Y', '3Y', 'MAX'] as TimeframeOption[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => handleTimeframeChange(tf)}
                className={`px-2 py-0.5 text-[12px] font-bold rounded-md transition-all duration-150 ${
                  timeframe === tf
                    ? 'bg-violet-600 text-white shadow-[0_0_10px_rgba(130,58,253,0.7)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {tf === '1Y' ? '1Y (52W)' : tf}
              </button>
            ))}
          </div>

          {bankerFlow > 0 && (
            <span
              className={`flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg border text-[13px] ${
                bankerFlow >= 50
                  ? 'bg-orange-950/40 text-orange-200 border-orange-500/50 shadow-[0_0_8px_rgba(253,85,20,0.35)]'
                  : bankerFlow >= 25
                  ? 'bg-orange-950/30 text-orange-300 border-orange-700/40'
                  : 'bg-slate-800/40 text-slate-300 border-slate-700/40'
              }`}
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Banker {bankerFlow.toFixed(0)}%</span>
            </span>
          )}
          {avgCost > 0 && (
            <span className="flex items-center gap-1 text-slate-200 font-semibold bg-slate-800/80 px-2.5 py-1 rounded-lg border border-white/10 text-[13px]">
              <Target className="w-4 h-4 text-slate-300" />
              <span>ทุนเฉลี่ย ${avgCost.toFixed(2)}</span>
            </span>
          )}
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full h-[130px]">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm font-normal">
            กำลังโหลดข้อมูลราคา...
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="tacticalMiniGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#823AFD" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#C090FF" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#12162B" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Shaded Area (Electric Violet) */}
              {areaD && <path d={areaD} fill="url(#tacticalMiniGrad)" />}

              {/* Cost Basis Reference Line (Muted Slate) */}
              {costY !== null && (
                <g transform={`translate(0, ${costY})`}>
                  <line x1={0} x2={innerWidth} stroke="#9898C8" strokeDasharray="4,3" strokeWidth={1.5} />
                  <text x={innerWidth + 6} dy="0.32em" className="fill-slate-300 text-[12px] font-mono font-semibold">
                    ${avgCost.toFixed(1)}
                  </text>
                </g>
              )}

              {/* Price Line (Electric Violet) */}
              {pathD && <path d={pathD} fill="none" stroke="#823AFD" strokeWidth={2.4} />}

              {/* Current Price Dot & Label */}
              {currentX > 0 && hoveredIndex === null && (
                <>
                  <circle cx={currentX} cy={currentY} r={4.5} fill="#FFFFFF" stroke="#823AFD" strokeWidth={2.5} />
                  <text
                    x={innerWidth + 6}
                    y={currentY}
                    dy="0.32em"
                    className="fill-white text-[13px] font-mono font-bold"
                  >
                    ${currentPrice.toFixed(1)}
                  </text>
                </>
              )}

              {/* Hover Crosshair */}
              {hoveredCandle && (
                <>
                  {(() => {
                    const hX = (hoveredIndex! / (candles.length - 1)) * innerWidth;
                    const closes = candles.map((c) => c.close);
                    const low = Math.min(...closes);
                    const high = Math.max(...closes);
                    const yMin = Math.min(low, avgCost > 0 ? avgCost : low) * 0.96;
                    const yMax = Math.max(high, avgCost > 0 ? avgCost : high) * 1.04;
                    const hY = innerHeight - ((hoveredCandle.close - yMin) / (yMax - yMin)) * innerHeight;
                    const dateStr = hoveredCandle.date.toISOString().split('T')[0];

                    return (
                      <g>
                        <line x1={hX} x2={hX} y1={0} y2={innerHeight} stroke="#823AFD" strokeDasharray="2,2" strokeWidth={1} />
                        <circle cx={hX} cy={hY} r={5} fill="#823AFD" stroke="#FFFFFF" strokeWidth={2} />
                        <rect
                          x={Math.min(innerWidth - 80, Math.max(0, hX - 40))}
                          y={Math.max(0, hY - 26)}
                          width={80}
                          height={20}
                          rx={4}
                          fill="#141430"
                          stroke="#823AFD"
                          strokeWidth={1}
                        />
                        <text
                          x={Math.min(innerWidth - 80, Math.max(0, hX - 40)) + 40}
                          y={Math.max(0, hY - 26) + 14}
                          textAnchor="middle"
                          className="fill-slate-100 font-mono text-[12px] font-bold"
                        >
                          ${hoveredCandle.close.toFixed(1)}
                        </text>
                        <text
                          x={Math.min(innerWidth - 80, Math.max(0, hX - 40)) + 40}
                          y={innerHeight + 14}
                          textAnchor="middle"
                          className="fill-slate-300 font-mono text-[12px]"
                        >
                          {dateStr}
                        </text>
                      </g>
                    );
                  })()}
                </>
              )}
            </g>
          </svg>
        )}
      </div>

      {/* Dynamic Range Bar & EMA Cushions */}
      <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm text-slate-200">
        {/* Visual Range Gauge with Ticks & Needle */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Low Price */}
          <span className="font-mono text-[#FC2D79] text-[13px] font-semibold whitespace-nowrap">
            ${rangeLow.toFixed(1)}
          </span>

          {/* Gauge Track */}
          <div className="relative flex-1 h-3 bg-slate-900/90 rounded-full border border-white/10 shadow-inner flex items-center">
            {/* Background gradient spectrum */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#FC2D79]/20 via-[#823AFD]/20 to-[#FD5514]/20 rounded-full" />

            {/* Active Fill up to current price */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#FC2D79] via-[#823AFD] to-[#FD5514] rounded-full opacity-85 transition-all duration-300"
              style={{ width: `${rangePct}%` }}
            />

            {/* Scale Ticks: 25%, 50% (Mid), 75% */}
            <div className="absolute left-[25%] top-0 bottom-0 w-[1px] bg-white/20 pointer-events-none" title="25% (Q1)" />
            <div className="absolute left-[50%] -top-0.5 -bottom-0.5 w-[1.5px] bg-white/45 pointer-events-none" title="50% (Midpoint)" />
            <div className="absolute left-[75%] top-0 bottom-0 w-[1px] bg-white/20 pointer-events-none" title="75% (Q3)" />

            {/* Glowing Needle Marker for Current Price */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300 z-10"
              style={{ left: `${Math.min(99, Math.max(1, rangePct))}%` }}
            >
              <div className="w-2 h-4.5 bg-white rounded-full shadow-[0_0_10px_#823AFD,0_0_4px_#FFF] border border-violet-300 ring-2 ring-violet-500/60" />
            </div>
          </div>

          {/* High Price */}
          <span className="font-mono text-orange-300 text-[13px] font-semibold whitespace-nowrap">
            ${rangeHigh.toFixed(1)}
          </span>

          {/* Current Position Tag */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-950/70 text-violet-200 border border-violet-700/60 whitespace-nowrap shadow-sm">
            <span className="text-[13px] font-bold font-mono text-white">${currentPrice.toFixed(1)}</span>
            <span className="text-[12px] font-semibold text-violet-300">({rangePct.toFixed(0)}%)</span>
            <span className="text-[12px] font-semibold text-slate-300 pl-1 border-l border-violet-500/40">
              {currentMeta.rangeLabel}
            </span>
          </div>
        </div>

        {/* EMA Cushions */}
        <div className="flex items-center gap-2 flex-shrink-0 text-sm">
          {ema50Cushion !== null && (
            <span
              className={`px-2.5 py-1 rounded-lg font-mono text-[13px] font-medium border ${
                ema50Cushion >= 0
                  ? 'bg-violet-600/20 text-violet-200 border-violet-500/30'
                  : 'bg-pink-950/30 text-[#FC2D79] border-[#FC2D79]/40'
              }`}
            >
              EMA50: {ema50Cushion >= 0 ? '+' : ''}{ema50Cushion.toFixed(1)}%
            </span>
          )}
          {ema200Cushion !== null && (
            <span
              className={`px-2.5 py-1 rounded-lg font-mono text-[13px] font-medium flex items-center gap-1.5 border ${
                ema200Cushion >= 0
                  ? 'bg-violet-600/20 text-violet-200 border-violet-500/30'
                  : 'bg-pink-950/40 text-[#FC2D79] border-[#FC2D79]/50 shadow-[0_0_8px_rgba(252,45,121,0.4)]'
              }`}
            >
              <Shield className={`w-4 h-4 ${ema200Cushion >= 0 ? 'text-violet-400' : 'text-[#FC2D79]'}`} />
              <span>EMA200: {ema200Cushion >= 0 ? '+' : ''}{ema200Cushion.toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
