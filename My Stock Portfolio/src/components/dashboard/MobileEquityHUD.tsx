import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Clock, ShieldCheck, Coins, PieChart } from 'lucide-react';
import { DashboardTimeRange } from './Dashboard';
import { useUiStore } from '../../stores/uiStore';
import { usePriceStore } from '../../stores/priceStore';
import clsx from 'clsx';

interface MobileEquityHUDProps {
  totalNetWorth: number;
  displayPnl: number;
  displayPnlPercent: number;
  chartData: { name: string; value: number }[];
  timeRange: DashboardTimeRange;
  onRangeChange: (range: DashboardTimeRange) => void;
  formatPrimary: (val: number, isChange?: boolean) => string;
  cashWeight: number;
  securitiesWeight: number;
  cashBalance: number;
  isMarketOpen?: boolean;
  isTabletLandscape?: boolean;
}

const TIMEFRAMES: { label: string; value: DashboardTimeRange }[] = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: 'YTD', value: 'YTD' },
  { label: '1Y', value: '1Y' },
  { label: 'ALL', value: 'ALL' },
];

export const MobileEquityHUD: React.FC<MobileEquityHUDProps> = ({
  totalNetWorth,
  displayPnl,
  displayPnlPercent,
  chartData,
  timeRange,
  onRangeChange,
  formatPrimary,
  cashWeight,
  securitiesWeight,
  cashBalance,
  isMarketOpen,
  isTabletLandscape = false,
}) => {
  const { currency, exchangeRate } = useUiStore();
  const isPositive = displayPnl >= 0;

  // Compute stroke and gradient colors
  const strokeColor = isPositive ? '#10B981' : '#F43F5E';
  const gradientId = isPositive ? 'equityGradGreen' : 'equityGradRed';

  return (
    <div className={clsx(
      "w-full bg-[#0D1019]/90 border border-white/[0.08] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden backdrop-blur-xl transform-gpu",
      isTabletLandscape ? "p-6 lg:p-7 border-white/[0.1] shadow-[0_12px_40px_rgba(0,0,0,0.5)]" : "p-5 sm:p-6"
    )}>
      {/* Background Ambient Glow */}
      <div 
        className={clsx(
          "absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none",
          isPositive ? "bg-emerald-500" : "bg-rose-500"
        )} 
      />

      {/* 1. Header: Net Worth & P&L Badge */}
      <div className="space-y-1 relative z-10">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium font-heading">
          <span className="flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-[#823AFD]" />
            มูลค่าพอร์ตรวม (Total Net Worth)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {timeRange === '1D' ? 'Today' : timeRange}
          </span>
        </div>

        {/* Big Net Worth Number */}
        <div className={clsx(
          "font-black tracking-tight text-white tabular-nums font-heading",
          isTabletLandscape ? "text-4xl sm:text-5xl lg:text-[54px] leading-tight" : "text-3xl sm:text-4xl"
        )}>
          {formatPrimary(totalNetWorth)}
        </div>

        {/* P&L Badge */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className={clsx(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold font-mono tracking-tight border",
            isPositive
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
          )}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>
              {formatPrimary(displayPnl, true)} ({isPositive ? '+' : ''}{displayPnlPercent.toFixed(2)}%)
            </span>
          </div>

          {/* Market Status Dot */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.04] text-[11px] text-slate-400">
            <span className={clsx("w-1.5 h-1.5 rounded-full", isMarketOpen ? "bg-emerald-400 animate-pulse" : "bg-slate-500")} />
            <span>{isMarketOpen ? "ตลาดเปิด" : "ตลาดปิด"}</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Area Chart */}
      <div className={clsx(
        "w-full my-3 relative z-10",
        isTabletLandscape ? "h-60 sm:h-72 lg:h-[310px]" : "h-44 sm:h-52"
      )}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35}/>
                  <stop offset="90%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="equityGradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.35}/>
                  <stop offset="90%" stopColor="#F43F5E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#0D1019',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '8px 12px',
                }}
                itemStyle={{ color: strokeColor, fontWeight: 700 }}
                formatter={(val: number) => [formatPrimary(val), 'พอร์ต']}
                labelStyle={{ color: '#94A3B8', fontSize: '11px', marginBottom: '2px' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={strokeColor} 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill={`url(#${gradientId})`} 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <span>ไม่มีข้อมูลประวัติในช่วงเวลานี้</span>
          </div>
        )}
      </div>

      {/* 3. Timeframe Pills (Horizontal Scroll) */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1 relative z-10">
        {TIMEFRAMES.map(tf => {
          const isSelected = timeRange === tf.value;
          return (
            <button
              key={tf.value}
              onClick={() => onRangeChange(tf.value)}
              className={clsx(
                "px-3 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer font-heading shrink-0",
                isSelected
                  ? "bg-white text-black shadow-md shadow-white/10"
                  : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]"
              )}
            >
              {tf.label}
            </button>
          );
        })}
      </div>

      {/* 4. Asset Allocation Slim Bar */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] relative z-10">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#823AFD]" />
            หุ้น ({securitiesWeight.toFixed(1)}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            เงินสด ({cashWeight.toFixed(1)}%) • {formatPrimary(cashBalance)}
          </span>
        </div>
        <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-gradient-to-r from-[#823AFD] to-[#FC2D79] transition-all duration-500"
            style={{ width: `${Math.max(2, Math.min(98, securitiesWeight))}%` }}
          />
          <div 
            className="h-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${Math.max(2, Math.min(98, cashWeight))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
