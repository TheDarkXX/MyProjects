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

  return (
    <div className="w-full select-none">
      <div className="bg-[#0B0F17]/95 border border-white/[0.08] rounded-2xl p-3 shadow-xl">
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          {/* Pillar 1: Net Invested */}
          <div className="px-2 text-center flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">Net Invested</span>
            <div className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight my-1">
              {formatPrimary(netInvested)}
            </div>
            <span className="text-xs text-slate-400 truncate">เงินต้นสุทธิ</span>
          </div>

          {/* Pillar 2: Period Return (Dynamic to selected timeRange) */}
          <div className="px-2 text-center flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium truncate">
              {timeRange === 'ALL' ? 'Total P&L' : `${timeRange} Return`}
            </span>
            <div className={clsx(
              "text-sm sm:text-base font-bold font-mono tracking-tight my-1",
              isPeriodPos ? "text-emerald-400" : "text-rose-400"
            )}>
              {isPeriodPos ? '+' : ''}{formatPrimary(activePeriodPnl, true)}
            </div>
            <span className={clsx(
              "text-xs font-semibold truncate",
              isPeriodPos ? "text-emerald-400/90" : "text-rose-400/90"
            )}>
              {isPeriodPos ? '+' : ''}{activePeriodPct.toFixed(2)}%
            </span>
          </div>

          {/* Pillar 3: Today's P&L (or Lifetime if timeRange is 1D) */}
          <div className="px-2 text-center flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium truncate">
              {timeRange === '1D' ? 'Lifetime P&L' : "Today's P&L"}
            </span>
            <div className={clsx(
              "text-sm sm:text-base font-bold font-mono tracking-tight my-1",
              (timeRange === '1D' ? isTotalPos : isTodayPos) ? "text-emerald-400" : "text-rose-400"
            )}>
              {timeRange === '1D'
                ? `${isTotalPos ? '+' : ''}${formatPrimary(totalPnl, true)}`
                : `${isTodayPos ? '+' : ''}${formatPrimary(todaysProfit, true)}`}
            </div>
            <span className={clsx(
              "text-xs font-semibold truncate",
              (timeRange === '1D' ? isTotalPos : isTodayPos) ? "text-emerald-400/90" : "text-rose-400/90"
            )}>
              {timeRange === '1D'
                ? `${isTotalPos ? '+' : ''}${totalPnlPercent.toFixed(2)}%`
                : `${isTodayPos ? '+' : ''}${todaysProfitPercent.toFixed(2)}%`}
            </span>
          </div>
        </div>

        {/* Optional Dividends Sub-Bar */}
        {totalDividends > 0 && (
          <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between px-2 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span>🪙 ปันผลสะสม:</span>
              <span className="text-amber-400 font-mono font-bold">{formatPrimary(totalDividends)}</span>
            </span>
            <span className="text-slate-400 font-mono">
              Yield: <span className="text-slate-200 font-bold">{dividendYieldOnCost.toFixed(2)}%</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
