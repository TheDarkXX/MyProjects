import React, { useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { api } from '../../../../services/api';
import { Shield, Flame, Target } from 'lucide-react';

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
  const [candles, setCandles] = useState<Array<{ date: Date; close: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const res = await api.chart.get(symbol, 365, '1D');
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
          setCandles(valid);
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

  // Dimensions
  const width = 500;
  const height = 120;
  const margin = { top: 12, right: 60, bottom: 20, left: 10 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Math & Scales
  const { pathD, areaD, currentX, currentY, costY, low52, high52, rangePct } = useMemo(() => {
    if (candles.length === 0) {
      return { pathD: '', areaD: '', currentX: 0, currentY: 0, costY: null, low52: 0, high52: 0, rangePct: 0 };
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
      low52: low,
      high52: high,
      rangePct: pct
    };
  }, [candles, currentPrice, avgCost, innerWidth, innerHeight]);

  // Distance from EMAs
  const ema50Cushion = ema50 && currentPrice > 0 ? ((currentPrice - ema50) / ema50) * 100 : null;
  const ema200Cushion = ema200 && currentPrice > 0 ? ((currentPrice - ema200) / ema200) * 100 : null;

  // Crosshair Hover State
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
    <div className={`bg-[#0B1226]/95 border border-blue-900/60 rounded-2xl p-4 shadow-xl backdrop-blur-md ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <div>
            <h4 className="text-base font-bold text-slate-100 tracking-wide">
              TACTICAL PRICE PULSE — 52 Week
            </h4>
            <p className="text-xs text-slate-400">
              ย้อนหลัง 1 ปี {candles.length > 0 ? `• ${candles.length} วันทำการ` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {bankerFlow > 0 && (
            <span
              className={`flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg border ${
                bankerFlow >= 50
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : bankerFlow >= 25
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Banker {bankerFlow.toFixed(0)}%</span>
            </span>
          )}
          {avgCost > 0 && (
            <span className="flex items-center gap-1 text-amber-300 font-semibold bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/35">
              <Target className="w-4 h-4 text-amber-400" />
              <span>ทุนเฉลี่ย ${avgCost.toFixed(2)}</span>
            </span>
          )}
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full h-[130px]">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-normal">
            กำลังโหลดข้อมูลราคา 52 สัปดาห์...
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
                <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#0284C7" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#0B1226" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Shaded Area (Deep Blue) */}
              {areaD && <path d={areaD} fill="url(#tacticalMiniGrad)" />}

              {/* Cost Basis Reference Line (Yellow Gold) */}
              {costY !== null && (
                <g transform={`translate(0, ${costY})`}>
                  <line x1={0} x2={innerWidth} stroke="#FACC15" strokeDasharray="4,3" strokeWidth={1.5} />
                  <text x={innerWidth + 6} dy="0.32em" className="fill-amber-300 text-[12px] font-mono font-semibold">
                    ${avgCost.toFixed(1)}
                  </text>
                </g>
              )}

              {/* Price Line (Cyan Glow on Deep Blue) */}
              {pathD && <path d={pathD} fill="none" stroke="#38BDF8" strokeWidth={2.4} />}

              {/* Current Price Dot & Label */}
              {currentX > 0 && hoveredIndex === null && (
                <>
                  <circle cx={currentX} cy={currentY} r={4.5} fill="#FFFFFF" stroke="#0284C7" strokeWidth={2.5} />
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
                        <line x1={hX} x2={hX} y1={0} y2={innerHeight} stroke="#38BDF8" strokeDasharray="2,2" strokeWidth={1} />
                        <circle cx={hX} cy={hY} r={5} fill="#38BDF8" stroke="#FFFFFF" strokeWidth={2} />
                        <rect
                          x={Math.min(innerWidth - 80, Math.max(0, hX - 40))}
                          y={Math.max(0, hY - 26)}
                          width={80}
                          height={20}
                          rx={4}
                          fill="#141E38"
                          stroke="#38BDF8"
                          strokeWidth={1}
                        />
                        <text
                          x={Math.min(innerWidth - 80, Math.max(0, hX - 40)) + 40}
                          y={Math.max(0, hY - 26) + 14}
                          textAnchor="middle"
                          className="fill-slate-100 font-mono text-[11px] font-bold"
                        >
                          ${hoveredCandle.close.toFixed(1)}
                        </text>
                        <text
                          x={Math.min(innerWidth - 80, Math.max(0, hX - 40)) + 40}
                          y={innerHeight + 14}
                          textAnchor="middle"
                          className="fill-slate-300 font-mono text-[11px]"
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

      {/* 52-Week Range Bar & EMA Cushions */}
      <div className="mt-2 pt-2.5 border-t border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-sm text-slate-200">
        {/* 52W Range Visual Slider */}
        <div className="flex items-center gap-2.5 flex-1">
          <span className="font-mono text-rose-300 font-medium">${low52.toFixed(1)}</span>
          <div className="relative flex-1 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-rose-600 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${rangePct}%` }}
            />
          </div>
          <span className="font-mono text-emerald-300 font-medium">${high52.toFixed(1)}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950/60 text-cyan-300 border border-blue-800/60">
            52W Range
          </span>
        </div>

        {/* EMA Cushions */}
        <div className="flex items-center gap-2 flex-shrink-0 text-sm">
          {ema50Cushion !== null && (
            <span
              className={`px-2.5 py-1 rounded-lg font-mono font-medium border ${
                ema50Cushion >= 0
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              EMA50: {ema50Cushion >= 0 ? '+' : ''}{ema50Cushion.toFixed(1)}%
            </span>
          )}
          {ema200Cushion !== null && (
            <span
              className={`px-2.5 py-1 rounded-lg font-mono font-medium flex items-center gap-1.5 border ${
                ema200Cushion >= 0
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-600/25 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
              }`}
            >
              <Shield className={`w-4 h-4 ${ema200Cushion >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span>EMA200: {ema200Cushion >= 0 ? '+' : ''}{ema200Cushion.toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
