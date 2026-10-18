import React from 'react';
import { Landmark, TrendingUp, TrendingDown, Activity, Coins, Wallet } from 'lucide-react';
import clsx from 'clsx';

import { DashboardTimeRange } from '../../../components/dashboard/MultiPeriodReturnStrip';

interface QuickStatsStripProps {
  netInvested: number;
  totalPnl: number;
  totalPnlPercent: number;
  todaysProfit: number;
  todaysProfitPercent: number;
  totalDividends: number;
  dividendYieldOnCost: number;
  cashBalance: number;
  formatPrimary: (val: number, isChange?: boolean) => string;
  timeRange?: DashboardTimeRange;
  periodPnl?: number;
  periodPnlPercent?: number;
}

export const QuickStatsStrip: React.FC<QuickStatsStripProps> = ({
  netInvested,
  totalPnl,
  totalPnlPercent,
  todaysProfit,
  todaysProfitPercent,
  totalDividends,
  dividendYieldOnCost,
  cashBalance,
  formatPrimary,
  timeRange = '1W',
  periodPnl,
  periodPnlPercent,
}) => {
  const isTotalPos = totalPnl >= 0;
  const isTodayPos = todaysProfit >= 0;

  const activePeriodPnl = periodPnl !== undefined ? periodPnl : (timeRange === '1D' ? todaysProfit : totalPnl);
  const activePeriodPct = periodPnlPercent !== undefined ? periodPnlPercent : (timeRange === '1D' ? todaysProfitPercent : totalPnlPercent);
  const isPeriodPos = activePeriodPnl >= 0;

  const STATS = [
    {
      title: 'Net Invested',
      value: formatPrimary(netInvested),
      subtext: 'Principal Capital',
      icon: Landmark,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      title: timeRange === 'ALL' ? 'Total P&L' : `${timeRange} Return`,
      value: `${isPeriodPos ? '+' : ''}${formatPrimary(activePeriodPnl, true)}`,
      subtext: `${isPeriodPos ? '+' : ''}${activePeriodPct.toFixed(2)}% ${timeRange === 'ALL' ? 'Return' : 'in ' + timeRange}`,
      icon: isPeriodPos ? TrendingUp : TrendingDown,
      color: isPeriodPos ? 'text-emerald-400' : 'text-rose-400',
      bgColor: isPeriodPos ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      borderColor: isPeriodPos ? 'border-emerald-500/20' : 'border-rose-500/20',
    },
    {
      title: timeRange === '1D' ? 'Total P&L' : "Today's P&L",
      value: timeRange === '1D'
        ? `${isTotalPos ? '+' : ''}${formatPrimary(totalPnl, true)}`
        : `${isTodayPos ? '+' : ''}${formatPrimary(todaysProfit, true)}`,
      subtext: timeRange === '1D'
        ? `${isTotalPos ? '+' : ''}${totalPnlPercent.toFixed(2)}% Lifetime`
        : `${isTodayPos ? '+' : ''}${todaysProfitPercent.toFixed(2)}% Today`,
      icon: Activity,
      color: (timeRange === '1D' ? isTotalPos : isTodayPos) ? 'text-emerald-400' : 'text-rose-400',
      bgColor: (timeRange === '1D' ? isTotalPos : isTodayPos) ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      borderColor: (timeRange === '1D' ? isTotalPos : isTodayPos) ? 'border-emerald-500/20' : 'border-rose-500/20',
    },
    {
      title: 'Dividends',
      value: formatPrimary(totalDividends),
      subtext: `${dividendYieldOnCost.toFixed(2)}% Yield on Cost`,
      icon: Coins,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
  ];

  return (
    <div className="w-full space-y-2 select-none">
      <div className="text-xs font-bold text-slate-400 px-1 font-heading">
        📊 Portfolio Highlights
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
        {STATS.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="min-w-[145px] sm:min-w-[160px] flex-1 bg-[#111418] border border-[#2A2E45]/80 rounded-2xl p-3.5 shadow-sm snap-start shrink-0 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-slate-400 truncate">
                  {s.title}
                </span>
                <div className={clsx("w-6 h-6 rounded-lg flex items-center justify-center border", s.bgColor, s.borderColor, s.color)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className={clsx("text-sm sm:text-base font-black font-mono tracking-tight", s.color)}>
                  {s.value}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                  {s.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
