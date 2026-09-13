import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { PortfolioSliceItem } from './types';
import { TrendingUp, TrendingDown, Layers, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import clsx from 'clsx';

interface MyPortM1PieProps {
  slices: PortfolioSliceItem[];
  totalNetWorth: number;
  totalValueTHB: number;
  totalUnrealizedProfit: number;
  totalUnrealizedProfitPercent: number;
  todaysProfit: number;
  todaysProfitPercent: number;
  hoveredSymbol: string | null;
  onHoverSymbol: (symbol: string | null) => void;
  onSelectSymbol: (symbol: string) => void;
}

export const MyPortM1Pie: React.FC<MyPortM1PieProps> = ({
  slices,
  totalNetWorth,
  totalValueTHB,
  totalUnrealizedProfit,
  totalUnrealizedProfitPercent,
  todaysProfit,
  todaysProfitPercent,
  hoveredSymbol,
  onHoverSymbol,
  onSelectSymbol,
}) => {
  // Find currently active slice
  const activeSlice = useMemo(() => {
    if (!hoveredSymbol) return null;
    return slices.find((s) => s.symbol.toUpperCase() === hoveredSymbol.toUpperCase()) || null;
  }, [slices, hoveredSymbol]);

  const activeIndex = useMemo(() => {
    if (!hoveredSymbol) return -1;
    return slices.findIndex((s) => s.symbol.toUpperCase() === hoveredSymbol.toUpperCase());
  }, [slices, hoveredSymbol]);

  // Chart data formatted for Recharts
  const chartData = useMemo(() => {
    return slices.map((s) => ({
      name: s.symbol,
      value: s.currentValue > 0 ? s.currentValue : 0.001,
      color: s.color,
      item: s,
    }));
  }, [slices]);

  // Custom active shape rendering expanded glowing slice
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <defs>
          <filter id="m1-slice-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Expanded Glowing Outer Sector */}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 2}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke="#FFFFFF"
          strokeWidth={2}
          filter="url(#m1-slice-glow)"
          style={{ cursor: 'pointer', transition: 'all 0.2s ease-out' }}
        />
      </g>
    );
  };

  const isTodayProfit = todaysProfit >= 0;
  const isTotalProfit = totalUnrealizedProfit >= 0;

  return (
    <div className="flex flex-col h-full bg-[#0D1017] p-4 select-none overflow-y-auto custom-scrollbar">
      {/* Donut Canvas Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded-lg bg-purple-500/20 text-purple-300">
            <Layers className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-extrabold text-white tracking-wide uppercase font-heading">
            M1 Interactive Donut Wheel
          </h2>
        </div>
        <span className="text-[13px] font-medium text-slate-300">
          {slices.length} Portfolio Slices
        </span>
      </div>

      {/* Donut Wheel + Center Core */}
      <div className="relative w-full h-[340px] flex items-center justify-center shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={90}
              outerRadius={135}
              paddingAngle={2.5}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => {
                if (chartData[index]) {
                  onHoverSymbol(chartData[index].name);
                }
              }}
              onMouseLeave={() => onHoverSymbol(null)}
              onClick={(_, index) => {
                if (chartData[index]) {
                  onSelectSymbol(chartData[index].name);
                }
              }}
              stroke="#0D1017"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${entry.name}-${index}`} 
                  fill={entry.color}
                  className="cursor-pointer transition-opacity duration-200"
                  opacity={hoveredSymbol && hoveredSymbol !== entry.name ? 0.6 : 1}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Hub Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
          {!activeSlice ? (
            /* Default Center Core: Entire Portfolio Metrics */
            <div className="animate-fadeIn flex flex-col items-center">
              <span className="text-[13px] font-semibold text-slate-300 tracking-wider uppercase">
                Total Net Worth
              </span>
              <span className="text-2xl font-black text-white font-mono tracking-tight my-0.5">
                ${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[13px] font-medium text-slate-300">
                ≈ ฿{totalValueTHB.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>

              {/* Unrealized Return Badge */}
              <div
                className={clsx(
                  'flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-[13px] font-bold',
                  isTotalProfit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                )}
              >
                {isTotalProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {isTotalProfit ? '+' : ''}${totalUnrealizedProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({totalUnrealizedProfitPercent >= 0 ? '+' : ''}{totalUnrealizedProfitPercent.toFixed(2)}%)
                </span>
              </div>

              {/* Today's Change Mini Text */}
              <div className="text-[13px] text-slate-300 font-medium mt-1">
                Today: {isTodayProfit ? '+' : ''}${todaysProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({isTodayProfit ? '+' : ''}{todaysProfitPercent.toFixed(2)}%)
              </div>
            </div>
          ) : (
            /* Hovered Slice Center Core: Stock Specific Details */
            <div className="animate-fadeIn flex flex-col items-center max-w-[210px]">
              <div className="flex items-center gap-1.5 justify-center">
                <span className="text-xl font-black text-white tracking-wide font-heading">
                  {activeSlice.symbol}
                </span>
                <span className="text-[13px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                  {activeSlice.category}
                </span>
              </div>

              {/* Current Value */}
              <span className="text-xl font-black text-slate-100 font-mono mt-1">
                ${activeSlice.currentValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>

              {/* Slices Actual vs Target Weight & Drift */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[13px] font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                  Weight: {activeSlice.actualWeight.toFixed(1)}%
                </span>
                {activeSlice.targetWeight > 0 && (
                  <span
                    className={clsx(
                      'text-[13px] font-bold px-1.5 py-0.5 rounded',
                      activeSlice.drift >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    )}
                  >
                    {activeSlice.drift >= 0 ? `+${activeSlice.drift.toFixed(1)}% Overweight` : `${activeSlice.drift.toFixed(1)}% Underweight`}
                  </span>
                )}
              </div>

              {/* Unrealized Return */}
              {!activeSlice.isCash && (
                <div
                  className={clsx(
                    'text-[13px] font-bold mt-1.5 flex items-center gap-0.5',
                    activeSlice.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {activeSlice.totalReturn >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>
                    Total P&L: {activeSlice.totalReturn >= 0 ? '+' : ''}${activeSlice.totalReturn.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({activeSlice.totalReturnPercent >= 0 ? '+' : ''}{activeSlice.totalReturnPercent.toFixed(1)}%)
                  </span>
                </div>
              )}

              {/* Price & Cost Basis */}
              {!activeSlice.isCash && (
                <div className="text-[13px] text-slate-300 font-medium mt-0.5">
                  Price ${(activeSlice.lastPrice ?? 0).toFixed(2)} · Cost ${(activeSlice.avgCost ?? 0).toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Slices Grid / Legend */}
      <div className="mt-3 flex-1 flex flex-col min-h-0">
        <div className="text-[13px] font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Portfolio Slices Allocation</span>
          <span className="text-[13px] text-slate-400">Hover slice to inspect · Click for drawer</span>
        </div>

        <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 custom-scrollbar max-h-[220px]">
          {slices.map((slice) => {
            const isHovered = hoveredSymbol?.toUpperCase() === slice.symbol.toUpperCase();
            return (
              <div
                key={slice.symbol}
                onMouseEnter={() => onHoverSymbol(slice.symbol)}
                onMouseLeave={() => onHoverSymbol(null)}
                onClick={() => onSelectSymbol(slice.symbol)}
                className={clsx(
                  'flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border',
                  isHovered
                    ? 'bg-[#1C2235] border-purple-500/80 shadow-md scale-[1.02]'
                    : 'bg-[#121622]/90 border-slate-800 hover:border-slate-700 hover:bg-[#161B28]'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div className="truncate">
                    <div className="text-sm font-extrabold text-white font-heading truncate">
                      {slice.symbol}
                    </div>
                    <div className="text-[13px] text-slate-300 font-medium">
                      {slice.actualWeight.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold text-slate-200 font-mono">
                    ${(slice.currentValue || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  {!slice.isCash ? (
                    <div
                      className={clsx(
                        'text-[13px] font-semibold',
                        slice.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {slice.totalReturnPercent >= 0 ? '+' : ''}
                      {slice.totalReturnPercent.toFixed(1)}%
                    </div>
                  ) : (
                    <div className="text-[13px] text-emerald-400 font-medium flex items-center gap-0.5 justify-end">
                      <Wallet className="w-3 h-3" /> Cash Cushion
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
