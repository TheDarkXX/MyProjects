import React from 'react';
import { Landmark, TrendingUp, TrendingDown, Activity, Coins, Wallet } from 'lucide-react';
import clsx from 'clsx';

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
}) => {
  const isTotalPos = totalPnl >= 0;
  const isTodayPos = todaysProfit >= 0;

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
      title: 'Total P&L',
      value: `${isTotalPos ? '+' : ''}${formatPrimary(totalPnl, true)}`,
      subtext: `${isTotalPos ? '+' : ''}${totalPnlPercent.toFixed(2)}% Return`,
      icon: isTotalPos ? TrendingUp : TrendingDown,
      color: isTotalPos ? 'text-emerald-400' : 'text-rose-400',
      bgColor: isTotalPos ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      borderColor: isTotalPos ? 'border-emerald-500/20' : 'border-rose-500/20',
    },
    {
      title: "Today's P&L",
      value: `${isTodayPos ? '+' : ''}${formatPrimary(todaysProfit, true)}`,
      subtext: `${isTodayPos ? '+' : ''}${todaysProfitPercent.toFixed(2)}% Today`,
      icon: Activity,
      color: isTodayPos ? 'text-emerald-400' : 'text-rose-400',
      bgColor: isTodayPos ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      borderColor: isTodayPos ? 'border-emerald-500/20' : 'border-rose-500/20',
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
              className="min-w-[145px] sm:min-w-[160px] flex-1 bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-3.5 shadow-sm snap-start shrink-0 flex flex-col justify-between"
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
