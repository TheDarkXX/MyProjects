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
        const candleData = await api.chart.get(symbol, 365, '1D');
        if (!isMounted || !Array.isArray(candleData) || candleData.length === 0) {
          setIsLoading(false);
          return;
        }

        const valid = candleData
          .filter((c: any) => c.close != null && c.date && !isNaN(Number(c.close)))
          .map((c: any) => ({
            date: new Date(c.date),
            close: Number(c.close)
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());

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
  const margin = { top: 12, right: 55, bottom: 20, left: 10 };
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

  return (
    <div className={`bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-3.5 shadow-lg backdrop-blur-md ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <h4 className="text-[13px] font-medium text-slate-200 tracking-wide uppercase">
            Tactical Price Pulse (1Y)
          </h4>
        </div>

        <div className="flex items-center gap-1.5 text-[13px]">
          {bankerFlow > 0 && (
            <span className="flex items-center gap-1 text-rose-300 font-medium bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
              <Flame className="w-3 h-3 text-rose-400" />
              <span>Banker {bankerFlow.toFixed(0)}%</span>
            </span>
          )}
          {avgCost > 0 && (
            <span className="flex items-center gap-1 text-amber-200 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
              <Target className="w-3 h-3 text-amber-400" />
              <span>ทุน ${avgCost.toFixed(1)}</span>
            </span>
          )}
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full h-[120px]">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-[13px] font-normal">
            กำลังโหลดข้อมูลราคา 1 ปี...
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="miniPulseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Shaded Area */}
              {areaD && <path d={areaD} fill="url(#miniPulseGradient)" />}

              {/* Cost Basis Reference Line */}
              {costY !== null && (
                <g transform={`translate(0, ${costY})`}>
                  <line x1={0} x2={innerWidth} stroke="#F59E0B" strokeDasharray="3,3" strokeWidth={1.2} />
                  <text x={innerWidth + 6} dy="0.32em" className="fill-amber-300 text-[11px] font-mono font-medium">
                    ${avgCost.toFixed(0)}
                  </text>
                </g>
              )}

              {/* Price Line */}
              {pathD && <path d={pathD} fill="none" stroke="#38BDF8" strokeWidth={2} />}

              {/* Current Price Dot & Label */}
              {currentX > 0 && (
                <>
                  <circle cx={currentX} cy={currentY} r={4} fill="#FFFFFF" stroke="#0284C7" strokeWidth={2} />
                  <text
                    x={innerWidth + 6}
                    y={currentY}
                    dy="0.32em"
                    className="fill-white text-[12px] font-mono font-bold"
                  >
                    ${currentPrice.toFixed(1)}
                  </text>
                </>
              )}
            </g>
          </svg>
        )}
      </div>

      {/* 52-Week Range Bar & EMA Cushions */}
      <div className="mt-1 pt-2 border-t border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px] text-slate-200">
        {/* 52W Range Visual Slider */}
        <div className="flex items-center gap-2 flex-1">
          <span className="font-mono text-slate-300">${low52.toFixed(0)}</span>
          <div className="relative flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
              style={{ width: `${rangePct}%` }}
            />
          </div>
          <span className="font-mono text-slate-300">${high52.toFixed(0)}</span>
          <span className="text-[11px] text-slate-300 font-medium">52W</span>
        </div>

        {/* EMA Cushions */}
        <div className="flex items-center gap-2 flex-shrink-0 text-[12px]">
          {ema50Cushion !== null && (
            <span className={`px-2 py-0.5 rounded font-mono font-medium ${ema50Cushion >= 0 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25' : 'bg-rose-500/10 text-rose-300 border border-rose-500/25'}`}>
              EMA50: {ema50Cushion >= 0 ? '+' : ''}{ema50Cushion.toFixed(1)}%
            </span>
          )}
          {ema200Cushion !== null && (
            <span className={`px-2 py-0.5 rounded font-mono font-medium flex items-center gap-1 ${ema200Cushion >= 0 ? 'bg-cyan-500/10 text-cyan-200 border border-cyan-500/25' : 'bg-rose-500/20 text-rose-200 border border-rose-500/40'}`}>
              <Shield className="w-3 h-3" />
              <span>EMA200: {ema200Cushion >= 0 ? '+' : ''}{ema200Cushion.toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
