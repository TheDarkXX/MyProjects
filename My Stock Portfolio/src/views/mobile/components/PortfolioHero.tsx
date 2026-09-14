import React from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis 
} from 'recharts';
import { TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { DashboardTimeRange } from '../../../components/dashboard/MultiPeriodReturnStrip';
import clsx from 'clsx';

interface PortfolioHeroProps {
  totalNetWorth: number;
  displayPnl: number;
  displayPnlPercent: number;
  chartData: Array<{ date: string; value: number }>;
  timeRange: DashboardTimeRange;
  onRangeChange: (range: DashboardTimeRange) => void;
  formatPrimary: (val: number, isChange?: boolean) => string;
}

const TIME_RANGES: { id: DashboardTimeRange; label: string }[] = [
  { id: '1D', label: '1D' },
  { id: '1W', label: '1W' },
  { id: '1M', label: '1M' },
  { id: '3M', label: '3M' },
  { id: 'YTD', label: 'YTD' },
  { id: 'ALL', label: 'ALL' },
];

export const PortfolioHero: React.FC<PortfolioHeroProps> = ({
  totalNetWorth,
  displayPnl,
  displayPnlPercent,
  chartData,
  timeRange,
  onRangeChange,
  formatPrimary,
}) => {
  const isPositive = displayPnl >= 0;
  const strokeColor = isPositive ? '#10B981' : '#F43F5E';
  const gradId = isPositive ? 'heroEquityGradGreen' : 'heroEquityGradRed';

  return (
    <div className="relative overflow-hidden bg-[#0D1019]/95 border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.5)] select-none">
      {/* Background Radial Glow */}
      <div 
        className={clsx(
          "absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none opacity-25",
          isPositive ? "bg-emerald-500" : "bg-rose-500"
        )} 
      />

      {/* 1. Header & Net Worth */}
      <div className="relative z-10 space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium font-heading">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-[#823AFD]" />
            Portfolio Net Worth
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 font-mono">
            {timeRange === '1D' ? 'Today' : timeRange}
          </span>
        </div>

        {/* Big Net Worth Number */}
        <div className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-white tabular-nums font-heading leading-tight pt-0.5">
          {formatPrimary(totalNetWorth)}
        </div>

        {/* P&L Badge */}
        <div className="flex items-center gap-2 pt-1">
          <div className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold font-mono tracking-tight border",
            isPositive
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              : "bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
          )}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>
              {formatPrimary(displayPnl, true)} ({isPositive ? '+' : ''}{displayPnlPercent.toFixed(2)}%)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {timeRange === '1D' ? 'Today' : 'Total Return'}
          </span>
        </div>
      </div>

      {/* 2. Interactive Area Chart */}
      <div className="w-full h-44 sm:h-52 my-3 relative z-10 -mx-1">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="heroEquityGradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.4}/>
                  <stop offset="90%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="heroEquityGradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.4}/>
                  <stop offset="90%" stopColor="#F43F5E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#0D1019',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '8px 12px',
                }}
                itemStyle={{ color: strokeColor, fontWeight: 700 }}
                formatter={(val: number) => [formatPrimary(val), 'Net Worth']}
                labelStyle={{ color: '#94A3B8', fontSize: '11px', marginBottom: '2px' }}
              />
              <XAxis dataKey="date" hide={true} />
              <YAxis hide={true} domain={['dataMin - 100', 'dataMax + 100']} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={strokeColor} 
                strokeWidth={2.5}
                fill={`url(#${gradId})`}
                animationDuration={600}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            No chart data available for this timeframe
          </div>
        )}
      </div>

      {/* 3. Time Range Selector Pills */}
      <div className="relative z-10 flex items-center justify-between gap-1 bg-[#07090E]/80 border border-white/[0.06] p-1 rounded-2xl">
        {TIME_RANGES.map((item) => {
          const isActive = timeRange === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onRangeChange(item.id)}
              className={clsx(
                "flex-1 py-1.5 rounded-xl text-xs font-bold font-mono transition-all active:scale-95 cursor-pointer text-center",
                isActive
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
