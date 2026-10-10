import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { 
  PortfolioSliceItem, 
  formatCurrencyVal, 
  formatSecondaryVal,
  MyPortTimeRange,
  MyPortPeriodMetric
} from './types';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
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
  currency: 'USD' | 'THB';
  exchangeRate: number;
  selectedTimeframe?: MyPortTimeRange;
  onSelectTimeframe?: (range: MyPortTimeRange) => void;
  periodMetrics?: Record<string, MyPortPeriodMetric>;
}

const TIMEFRAME_OPTIONS: { id: MyPortTimeRange; label: string }[] = [
  { id: '1D', label: '1D' },
  { id: '1W', label: '1W' },
  { id: '1M', label: '1M' },
  { id: 'YTD', label: 'YTD' },
  { id: '1Y', label: '1Y' },
  { id: 'ALL', label: 'ALL' },
];

export const MyPortM1Pie: React.FC<MyPortM1PieProps> = ({
  slices,
  totalNetWorth,
  totalUnrealizedProfit,
  totalUnrealizedProfitPercent,
  todaysProfit,
  todaysProfitPercent,
  hoveredSymbol,
  onHoverSymbol,
  onSelectSymbol,
  currency,
  exchangeRate,
  selectedTimeframe: propTimeframe,
  onSelectTimeframe,
  periodMetrics,
}) => {
  // Local active timeframe if not controlled from parent
  const [localTimeframe, setLocalTimeframe] = useState<MyPortTimeRange>('1D');
  const activeTimeframe = propTimeframe || localTimeframe;

  const handleTimeframeChange = (tf: MyPortTimeRange) => {
    setLocalTimeframe(tf);
    if (onSelectTimeframe) {
      onSelectTimeframe(tf);
    }
  };

  // Find currently active slice
  const activeSlice = useMemo(() => {
    if (!hoveredSymbol) return null;
    const hUpper = hoveredSymbol.toUpperCase();
    return (slices || []).find((s) => (s.symbol || '').toUpperCase() === hUpper) || null;
  }, [slices, hoveredSymbol]);

  const activeIndex = useMemo(() => {
    if (!hoveredSymbol) return -1;
    const hUpper = hoveredSymbol.toUpperCase();
    return (slices || []).findIndex((s) => (s.symbol || '').toUpperCase() === hUpper);
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

  // Get active period metric
  const currentPeriodMetric = useMemo(() => {
    const metric = periodMetrics?.[activeTimeframe];
    if (metric) return metric;

    if (activeTimeframe === '1D') {
      return { amount: todaysProfit, percent: todaysProfitPercent };
    }
    return { amount: totalUnrealizedProfit, percent: totalUnrealizedProfitPercent };
  }, [periodMetrics, activeTimeframe, todaysProfit, todaysProfitPercent, totalUnrealizedProfit, totalUnrealizedProfitPercent]);

  const isMetricProfit = currentPeriodMetric.amount >= 0;

  return (
    <div className="flex flex-col h-full bg-[#0D1017] p-4 select-none overflow-y-auto custom-scrollbar">
      {/* Subtle Donut Canvas Subheader */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-bold text-slate-300 uppercase tracking-wider">
          Allocation Wheel
        </span>
        <span className="text-[13px] font-semibold text-slate-400">
          {slices.length} Slices · ({currency})
        </span>
      </div>

      {/* Mini Timeframe Hero Strip (Hybrid A & B) */}
      <div className="w-full max-w-[420px] mx-auto mb-2 px-0.5">
        <div className="grid grid-cols-6 gap-1 bg-[#121624] p-1 rounded-xl border border-slate-800 shadow-md">
          {TIMEFRAME_OPTIONS.map((tf) => {
            const m = periodMetrics?.[tf.id] || (
              tf.id === '1D' 
                ? { percent: todaysProfitPercent } 
                : tf.id === 'ALL' 
                ? { percent: totalUnrealizedProfitPercent } 
                : { percent: 0 }
            );
            const isSelected = activeTimeframe === tf.id;
            const isPositive = (m.percent ?? 0) >= 0;

            return (
              <button
                key={tf.id}
                onClick={() => handleTimeframeChange(tf.id)}
                className={clsx(
                  'flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg transition-all cursor-pointer',
                  isSelected
                    ? 'bg-purple-950/70 border border-purple-500/80 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                    : 'bg-transparent border border-transparent hover:bg-slate-800/60'
                )}
              >
                <span className={clsx('text-[13px] font-bold tracking-tight', isSelected ? 'text-white' : 'text-slate-300')}>
                  {tf.label}
                </span>
                <span
                  className={clsx(
                    'text-[12px] font-mono font-bold leading-tight mt-0.5 tabular-nums',
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {isPositive ? '+' : ''}{(m.percent ?? 0).toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Donut Wheel + Ambient Glow + Center Core */}
      <div className="relative w-full h-[360px] xl:h-[380px] flex items-center justify-center shrink-0">
        {/* Ambient background glow behind chart */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.08)_0%,rgba(13,16,23,0)_70%)] pointer-events-none" />

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={114}
              outerRadius={166}
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
                  opacity={hoveredSymbol && hoveredSymbol !== entry.name ? 0.45 : 1}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Hub Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          {!activeSlice ? (
            /* Default Center Core: Entire Portfolio Metrics (Reactive to Active Timeframe) */
            <div className="animate-fadeIn flex flex-col items-center">
              <span className="text-[13px] font-semibold text-slate-300 tracking-wider uppercase">
                Net Worth
              </span>
              <span className="text-2xl font-black text-white font-mono tracking-tight my-0.5">
                {formatCurrencyVal(totalNetWorth, currency, exchangeRate)}
              </span>
              <span className="text-[13px] font-medium text-slate-400">
                ({formatSecondaryVal(totalNetWorth, currency, exchangeRate)})
              </span>

              {/* Dynamic Timeframe Return Badge */}
              <div
                className={clsx(
                  'flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full text-[13px] font-bold border transition-all',
                  isMetricProfit 
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' 
                    : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                )}
              >
                {isMetricProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {activeTimeframe === '1D' ? 'Today: ' : `${activeTimeframe}: `}
                  {formatCurrencyVal(currentPeriodMetric.amount, currency, exchangeRate, true)} ({isMetricProfit ? '+' : ''}{currentPeriodMetric.percent.toFixed(2)}%)
                </span>
              </div>

              {/* S&P 500 Alpha Tag (if available) */}
              {currentPeriodMetric.alpha !== undefined && (
                <div className="flex items-center gap-1.5 mt-1 text-[12px] font-medium">
                  <span className="text-slate-400">S&P:</span>
                  <span className={clsx('font-bold font-mono', (currentPeriodMetric.spyPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {(currentPeriodMetric.spyPercent ?? 0) >= 0 ? '+' : ''}{(currentPeriodMetric.spyPercent ?? 0).toFixed(1)}%
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className={clsx(
                    'px-1.5 py-0.2 rounded font-bold font-mono',
                    currentPeriodMetric.alpha >= 0 ? 'text-emerald-300 bg-emerald-500/20' : 'text-rose-300 bg-rose-500/20'
                  )}>
                    α {currentPeriodMetric.alpha >= 0 ? '+' : ''}{currentPeriodMetric.alpha.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Hovered Slice Center Core: Stock Specific Details */
            <div className="animate-fadeIn flex flex-col items-center max-w-[200px]">
              <div className="flex items-center gap-1.5 justify-center">
                <span className="text-xl font-black text-white tracking-wide font-heading">
                  {activeSlice.symbol}
                </span>
                <span className="text-[13px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                  {activeSlice.category}
                </span>
              </div>

              {/* Current Value in Active Currency */}
              <span className="text-xl font-black text-slate-100 font-mono mt-1">
                {formatCurrencyVal(activeSlice.currentValue, currency, exchangeRate)}
              </span>
              <span className="text-[13px] text-slate-400 font-medium">
                ({formatSecondaryVal(activeSlice.currentValue, currency, exchangeRate)})
              </span>

              {/* Slices Actual vs Target Weight */}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[13px] font-bold text-white bg-slate-800 px-2 py-0.2 rounded">
                  {activeSlice.actualWeight.toFixed(1)}%
                </span>
                {activeSlice.targetWeight > 0 && (
                  <span
                    className={clsx(
                      'text-[13px] font-bold px-1.5 py-0.2 rounded',
                      activeSlice.drift >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    )}
                  >
                    {activeSlice.drift >= 0 ? `+${activeSlice.drift.toFixed(1)}%` : `${activeSlice.drift.toFixed(1)}%`}
                  </span>
                )}
              </div>

              {/* Unrealized Return */}
              {!activeSlice.isCash && (
                <div
                  className={clsx(
                    'text-[13px] font-bold mt-1 flex items-center gap-0.5',
                    activeSlice.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {activeSlice.totalReturn >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>
                    {formatCurrencyVal(activeSlice.totalReturn, currency, exchangeRate, true)} ({activeSlice.totalReturnPercent >= 0 ? '+' : ''}{activeSlice.totalReturnPercent.toFixed(1)}%)
                  </span>
                </div>
              )}

              {/* Price & Cost Basis */}
              {!activeSlice.isCash && (
                <div className="text-[13px] text-slate-300 font-medium mt-0.5">
                  ${(activeSlice.lastPrice ?? 0).toFixed(2)} · Cost ${(activeSlice.avgCost ?? 0).toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Segmented Linear Allocation Bar */}
      <div className="mt-2 px-1">
        <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800 gap-[1px]">
          {slices.map((slice) => (
            <div
              key={`bar-${slice.symbol}`}
              style={{
                width: `${Math.max(slice.actualWeight, 0.5)}%`,
                backgroundColor: slice.color,
              }}
              title={`${slice.symbol}: ${slice.actualWeight.toFixed(1)}%`}
              onMouseEnter={() => onHoverSymbol(slice.symbol)}
              onMouseLeave={() => onHoverSymbol(null)}
              onClick={() => onSelectSymbol(slice.symbol)}
              className={clsx(
                'h-full cursor-pointer transition-opacity duration-150',
                hoveredSymbol && slice.symbol && hoveredSymbol.toUpperCase() !== slice.symbol.toUpperCase()
                  ? 'opacity-35'
                  : 'opacity-100 hover:brightness-125'
              )}
            />
          ))}
        </div>
      </div>

      {/* Minimal Interactive Inline Slice Chips */}
      <div className="mt-2 flex-1 flex flex-col justify-start">
        <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
          {slices.map((slice) => {
            const isHovered = hoveredSymbol && slice.symbol ? hoveredSymbol.toUpperCase() === slice.symbol.toUpperCase() : false;
            return (
              <button
                key={slice.symbol}
                type="button"
                onMouseEnter={() => onHoverSymbol(slice.symbol)}
                onMouseLeave={() => onHoverSymbol(null)}
                onClick={() => onSelectSymbol(slice.symbol)}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] transition-all border font-mono select-none cursor-pointer',
                  isHovered
                    ? 'bg-[#1C2235] border-purple-400 text-white shadow-sm scale-105 z-10'
                    : 'bg-[#121622]/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="font-extrabold text-slate-100">{slice.symbol}</span>
                <span className="text-slate-400 font-medium">{slice.actualWeight.toFixed(1)}%</span>
                <span className="text-slate-300 font-bold">
                  {formatCurrencyVal(slice.currentValue, currency, exchangeRate, false, true)}
                </span>
                {slice.isCash && (
                  <Wallet className="w-3 h-3 text-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[13px] text-slate-400 text-center mt-2">
          Hover slice to inspect · Click for detail drawer
        </p>
      </div>
    </div>
  );
};
