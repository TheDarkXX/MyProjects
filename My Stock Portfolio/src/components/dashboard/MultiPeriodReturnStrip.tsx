import React from 'react';
import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import type { DashboardTimeRange } from './Dashboard';

export interface MultiPeriodMetric {
  amount: number;
  percent: number;
}

export interface MultiPeriodReturnStripProps {
  activeRange: DashboardTimeRange;
  onRangeChange: (range: DashboardTimeRange) => void;
  periodMetrics: Record<string, MultiPeriodMetric>;
  displayPnl: number;
  displayPnlPercent: number;
  inceptionDate: string;
  formatCurrency: (val: number, isPnl?: boolean) => string;
  onCustomClick: () => void;
  customFrom?: string;
  customTo?: string;
}

interface PeriodItem {
  id: DashboardTimeRange;
  label: string;
  subLabel?: string;
  isTotal?: boolean;
  isCustom?: boolean;
}

export const MultiPeriodReturnStrip: React.FC<MultiPeriodReturnStripProps> = ({
  activeRange,
  onRangeChange,
  periodMetrics,
  displayPnl,
  displayPnlPercent,
  inceptionDate,
  formatCurrency,
  onCustomClick,
  customFrom,
  customTo,
}) => {
  const periods: PeriodItem[] = [
    { id: '1D', label: '1D' },
    { id: '1W', label: '1W' },
    { id: '1M', label: '1M' },
    { id: 'YTD', label: 'YTD' },
    { id: '1Y', label: '1Y' },
    { id: 'ALL', label: 'TOTAL RETURN', subLabel: inceptionDate ? `From ${inceptionDate}` : undefined, isTotal: true },
    { id: 'CUSTOM', label: 'CUSTOM', isCustom: true },
  ];

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-4 md:p-5 shadow-xl space-y-4">
      {/* Top Header: Active Range Label + Active P&L Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2A2E45]/60">
        <div className="flex items-center gap-2.5">
          <span className="text-[#CBD5E1] text-sm font-semibold tracking-wide">Timeframe:</span>
          <span className="text-white text-sm font-bold">
            {activeRange === 'CUSTOM' && customFrom && customTo
              ? `${customFrom} → ${customTo}`
              : activeRange === 'ALL'
              ? 'All Time (Since Inception)'
              : activeRange === '1D'
              ? 'Today'
              : activeRange === '1W'
              ? 'Past 7 Days'
              : activeRange === '1M'
              ? 'Past 30 Days'
              : activeRange === 'YTD'
              ? 'Year to Date'
              : activeRange === '1Y'
              ? 'Past Year'
              : activeRange}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1.5 tabular-nums transition-colors",
              displayPnl >= 0
                ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/25 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                : "text-rose-400 bg-rose-400/10 border-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
            )}
          >
            {displayPnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> : <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />}
            <span className="font-bold text-sm">
              {formatCurrency(displayPnl, true)} ({displayPnl >= 0 ? '+' : ''}{displayPnlPercent.toFixed(2)}%)
            </span>
          </span>
        </div>
      </div>

      {/* Multi-Period Return Cards Grid (8 columns layout: 1+1+1+1+1+2+1 = 8) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        {periods.map((item) => {
          const isActive = activeRange === item.id;
          const metric = periodMetrics[item.id] || { amount: 0, percent: 0 };
          const isPositive = metric.amount >= 0;

          if (item.isCustom) {
            return (
              <button
                key={item.id}
                type="button"
                onClick={onCustomClick}
                className={clsx(
                  "col-span-1 p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer select-none group min-h-[76px]",
                  isActive
                    ? "bg-[#181D2E] border-2 border-[#823AFD] shadow-[0_0_20px_rgba(130,58,253,0.35)] ring-1 ring-[#823AFD]/50"
                    : "bg-[#131624]/90 border border-[#2D334D] hover:border-[#823AFD]/60 hover:bg-[#181C2B] shadow-md"
                )}
                title="Custom Date Range"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={clsx(
                    "text-xs font-bold uppercase tracking-wider",
                    isActive ? "text-white" : "text-[#CBD5E1] group-hover:text-white"
                  )}>
                    {item.label}
                  </span>
                  <Calendar className={clsx("w-3.5 h-3.5", isActive ? "text-[#FC2D79]" : "text-[#CBD5E1]")} />
                </div>
                <div className="text-xs font-semibold text-[#CBD5E1] truncate">
                  {customFrom && customTo ? `${customFrom.slice(5)} ~ ${customTo.slice(5)}` : 'Select range'}
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onRangeChange(item.id)}
              className={clsx(
                "p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer select-none group relative overflow-hidden min-h-[76px]",
                item.isTotal ? "col-span-2 sm:col-span-2 xl:col-span-2" : "col-span-1",
                isActive
                  ? "bg-[#181D2E] border-2 border-[#823AFD] shadow-[0_0_20px_rgba(130,58,253,0.35)] ring-1 ring-[#823AFD]/50"
                  : "bg-[#131624]/90 border border-[#2D334D] hover:border-[#823AFD]/60 hover:bg-[#181C2B] shadow-md"
              )}
            >
              {/* Active Indicator Top Accent */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#FC2D79] to-[#823AFD]" />
              )}

              {/* Top Row: Period Label + Percentage Badge */}
              <div className="flex items-center justify-between w-full mb-1.5">
                <span
                  className={clsx(
                    "text-xs font-bold uppercase tracking-wider",
                    isActive ? "text-white" : "text-[#CBD5E1] group-hover:text-white"
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={clsx(
                    "text-xs font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 tabular-nums",
                    isPositive 
                      ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" 
                      : "text-rose-400 bg-rose-500/15 border-rose-500/30"
                  )}
                >
                  {isPositive ? '+' : ''}{metric.percent.toFixed(2)}%
                </span>
              </div>

              {/* Bottom Row: P&L Currency Amount (Dollar/Baht) */}
              <div className="flex items-baseline justify-between gap-1 w-full mt-0.5">
                <div
                  className={clsx(
                    "font-extrabold tabular-nums tracking-tight flex items-center gap-1",
                    item.isTotal ? "text-base md:text-lg" : "text-sm md:text-base",
                    isPositive ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5 inline-block shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 inline-block shrink-0" />
                  )}
                  <span>{formatCurrency(metric.amount, true)}</span>
                </div>

                {item.subLabel && (
                  <span className="text-[12px] text-[#CBD5E1] font-medium truncate shrink-0 ml-1">
                    {item.subLabel}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
