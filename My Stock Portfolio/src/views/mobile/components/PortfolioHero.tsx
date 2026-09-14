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

  return (
    <div className="relative overflow-hidden bg-[#111418] border border-[#2A2E45] rounded-3xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.5)] select-none">
      {/* Background Radial Glow (PC Signature Purple & Pink) */}
      <div 
        className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-[80px] pointer-events-none opacity-20 bg-gradient-to-br from-[#823AFD] to-[#FC2D79]" 
      />

      {/* 1. Header & Net Worth */}
      <div className="relative z-10 space-y-1">
        <div className="flex items-center justify-between text-xs text-[#CBD5E1] font-medium font-heading">
          <span className="flex items-center gap-1.5 text-[#CBD5E1]">
            <Layers className="w-3.5 h-3.5 text-[#823AFD]" />
            Portfolio Net Worth
          </span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-slate-300 font-mono">
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
              ? "bg-[#10B981]/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              : "bg-[#EF4444]/15 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
          )}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>
              {formatPrimary(displayPnl, true)} ({isPositive ? '+' : ''}{displayPnlPercent.toFixed(2)}%)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {timeRange === '1D' ? 'Today' : 'Total Return'}
          </span>
        </div>
      </div>

      {/* 2. Interactive Area Chart (PC Tone: #823AFD Purple Curve) */}
      <div className="w-full h-44 sm:h-52 my-3 relative z-10 -mx-1">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="heroEquityGradPC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#823AFD" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#823AFD" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#111418',
                  borderColor: '#2A2E45',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '8px 12px',
                }}
                itemStyle={{ color: '#FC2D79', fontWeight: 700 }}
                formatter={(val: number) => [formatPrimary(val), 'Net Worth']}
                labelStyle={{ color: '#CBD5E1', fontSize: '11px', marginBottom: '2px' }}
              />
              <XAxis dataKey="date" hide={true} />
              <YAxis hide={true} domain={['dataMin - 100', 'dataMax + 100']} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#823AFD" 
                strokeWidth={2.8}
                fill="url(#heroEquityGradPC)"
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
