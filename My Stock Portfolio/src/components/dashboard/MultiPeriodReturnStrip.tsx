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
    <div className="bg-[#0E111A] border border-[#282E47] rounded-3xl p-5 shadow-[0_16px_40px_rgba(0,0,0,0.75)] space-y-4">
      {/* Top Header: Active Range Label + Active P&L Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#242A42]">
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
                ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_14px_rgba(52,211,153,0.2)]"
                : "text-rose-400 bg-rose-500/15 border-rose-500/30 shadow-[0_0_14px_rgba(244,63,94,0.2)]"
            )}
          >
            {displayPnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> : <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />}
            <span className="font-bold text-sm">
              {formatCurrency(displayPnl, true)} ({displayPnl >= 0 ? '+' : ''}{displayPnlPercent.toFixed(2)}%)
            </span>
          </span>
        </div>
      </div>

      {/* Multi-Period Return Cards Grid (8 columns: 1+1+1+1+1+2+1 = 8) with Pronounced Borders and 3D Shadows */}
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
                  "col-span-1 p-3.5 rounded-2xl transition-all text-left flex flex-col justify-between cursor-pointer select-none group min-h-[86px]",
                  isActive
                    ? "bg-gradient-to-b from-[#241C42] via-[#1B1833] to-[#131526] border-2 border-[#823AFD] ring-1 ring-[#FC2D79]/50 shadow-[0_0_24px_rgba(130,58,253,0.45),inset_0_1px_2px_rgba(252,45,121,0.25),0_8px_20px_rgba(0,0,0,0.6)]"
                    : "bg-gradient-to-b from-[#1C2033] to-[#121422] border border-[#384063] hover:border-[#823AFD] hover:from-[#222842] hover:to-[#16192B] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_6px_18px_rgba(0,0,0,0.55)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_8px_24px_rgba(130,58,253,0.3)] hover:-translate-y-0.5"
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
                  <div className="w-6 h-6 rounded-lg bg-[#22273D] border border-[#384063] flex items-center justify-center">
                    <Calendar className={clsx("w-3.5 h-3.5", isActive ? "text-[#FC2D79]" : "text-[#CBD5E1]")} />
                  </div>
                </div>
                <div className="text-xs font-semibold text-[#CBD5E1] truncate mt-auto">
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
                "p-3.5 rounded-2xl transition-all text-left flex flex-col justify-between cursor-pointer select-none group relative overflow-hidden min-h-[86px]",
                item.isTotal ? "col-span-2 sm:col-span-2 xl:col-span-2" : "col-span-1",
                isActive
                  ? "bg-gradient-to-b from-[#241C42] via-[#1B1833] to-[#131526] border-2 border-[#823AFD] ring-1 ring-[#FC2D79]/50 shadow-[0_0_24px_rgba(130,58,253,0.45),inset_0_1px_2px_rgba(252,45,121,0.25),0_8px_20px_rgba(0,0,0,0.6)]"
                  : "bg-gradient-to-b from-[#1C2033] to-[#121422] border border-[#384063] hover:border-[#823AFD] hover:from-[#222842] hover:to-[#16192B] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_6px_18px_rgba(0,0,0,0.55)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_8px_24px_rgba(130,58,253,0.3)] hover:-translate-y-0.5"
              )}
            >
              {/* Active Indicator Glowing Top Bar */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#FC2D79] via-[#823AFD] to-[#60A5FA]" />
              )}

              {/* Top Row: Period Label (Left) + P&L Currency Amount (Right) */}
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={clsx(
                    "text-xs font-bold uppercase tracking-wider",
                    isActive ? "text-white" : "text-[#CBD5E1] group-hover:text-white"
                  )}
                >
                  {item.label}
                </span>

                {/* +value Badge in Top Right */}
                <span
                  className={clsx(
                    "text-[12px] font-bold px-2 py-0.5 rounded-lg border tabular-nums truncate max-w-[58%] shadow-sm",
                    isPositive 
                      ? "text-emerald-300 bg-emerald-500/20 border-emerald-500/40 shadow-[0_1px_4px_rgba(52,211,153,0.2)]" 
                      : "text-rose-300 bg-rose-500/20 border-rose-500/40 shadow-[0_1px_4px_rgba(244,63,94,0.2)]"
                  )}
                  title={formatCurrency(metric.amount, true)}
                >
                  {formatCurrency(metric.amount, true)}
                </span>
              </div>

              {/* Center / Main Area: Prominent Big Percentage Return with Rich Glow */}
              <div className="flex items-baseline justify-between gap-1 w-full mt-1">
                <div
                  className={clsx(
                    "font-black tabular-nums tracking-tight flex items-center gap-0.5",
                    item.isTotal ? "text-2xl md:text-3xl" : "text-xl md:text-2xl",
                    isPositive 
                      ? "text-emerald-400 drop-shadow-[0_2px_10px_rgba(52,211,153,0.35)]" 
                      : "text-rose-400 drop-shadow-[0_2px_10px_rgba(244,63,94,0.35)]"
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="w-5 h-5 inline-block shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 inline-block shrink-0" />
                  )}
                  <span>{isPositive ? '+' : ''}{metric.percent.toFixed(2)}%</span>
                </div>

                {item.subLabel && (
                  <span className="text-[12px] text-[#9898C8] font-medium truncate shrink-0 ml-1">
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
