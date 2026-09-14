import React, { useState } from 'react';
import { Holding } from '../../hooks/useHoldings';
import { StockDetailDrawer } from '../portfolio/StockDetailDrawer';
import { TrendingUp, TrendingDown, Layers, Wallet, ArrowUpDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface HoldingsMobileListProps {
  holdings: Holding[];
  formatCurrency: (val: number, isChange?: boolean) => string;
  cashBalance: number;
}

type MetricMode = 'return' | 'today' | 'value' | 'shares';

const METRIC_MODES: { id: MetricMode; label: string; shortLabel: string }[] = [
  { id: 'return', label: 'กำไรรวม %', shortLabel: 'Total %' },
  { id: 'today', label: 'วันนี้ %', shortLabel: 'Today %' },
  { id: 'value', label: 'มูลค่ารวม', shortLabel: 'Value' },
  { id: 'shares', label: 'หุ้น & ทุน', shortLabel: 'Shares' },
];

export const HoldingsMobileList: React.FC<HoldingsMobileListProps> = ({
  holdings,
  formatCurrency,
  cashBalance,
}) => {
  const [metricMode, setMetricMode] = useState<MetricMode>('return');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  // Sort by weight % descending
  const sortedHoldings = [...holdings].sort((a, b) => b.weightPercent - a.weightPercent);

  return (
    <div className="w-full space-y-3 select-none">
      {/* 1. Header with One-Tap Metric Toggle */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-base font-heading">⚡ รายการหุ้น</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 font-mono">
            {holdings.length}
          </span>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex items-center bg-[#0D1019] border border-white/[0.08] p-0.5 rounded-xl">
          {METRIC_MODES.map((mode) => {
            const isSelected = metricMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setMetricMode(mode.id)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer font-heading",
                  isSelected
                    ? "bg-[#823AFD] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {mode.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Holdings Card Grid: 1 col on phone (vivo X80 Pro), 2 cols on tablet (iPad Air M2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {sortedHoldings.map((h) => {
          const isTotalPos = h.totalReturn >= 0;
          const isDayPos = h.dayReturn >= 0;

          // Render dynamic metric pill based on active mode
          const renderMetricBadge = () => {
            switch (metricMode) {
              case 'return':
                return (
                  <span className={clsx(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold font-mono tracking-tight border",
                    isTotalPos 
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                      : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  )}>
                    {isTotalPos ? '+' : ''}{h.totalReturnPercent.toFixed(2)}%
                  </span>
                );
              case 'today':
                return (
                  <span className={clsx(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold font-mono tracking-tight border",
                    isDayPos 
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                      : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                  )}>
                    {isDayPos ? '+' : ''}{h.dayChangePercent.toFixed(2)}%
                  </span>
                );
              case 'value':
                return (
                  <span className="px-2 py-1 rounded-xl text-xs font-bold font-mono text-white bg-white/[0.06] border border-white/[0.08]">
                    {formatCurrency(h.currentValue)}
                  </span>
                );
              case 'shares':
                return (
                  <span className="px-2 py-1 rounded-xl text-xs font-bold font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20">
                    {h.quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })} sh
                  </span>
                );
            }
          };

          // Render secondary info line based on active mode
          const renderSecondaryInfo = () => {
            switch (metricMode) {
              case 'return':
                return (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.04]">
                    <span>ราคา {formatCurrency(h.lastPrice)} • มูลค่า {formatCurrency(h.currentValue)}</span>
                    <span className={isTotalPos ? "text-emerald-400 font-mono" : "text-rose-400 font-mono"}>
                      {isTotalPos ? '+' : ''}{formatCurrency(h.totalReturn, true)}
                    </span>
                  </div>
                );
              case 'today':
                return (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.04]">
                    <span>ราคา {formatCurrency(h.lastPrice)}</span>
                    <span className={isDayPos ? "text-emerald-400 font-mono" : "text-rose-400 font-mono"}>
                      วันนี้: {isDayPos ? '+' : ''}{formatCurrency(h.dayReturn, true)}
                    </span>
                  </div>
                );
              case 'value':
                return (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.04]">
                    <span>{h.quantity} หุ้น @ ทุน {formatCurrency(h.avgCost)}</span>
                    <span className={isTotalPos ? "text-emerald-400 font-mono font-bold" : "text-rose-400 font-mono font-bold"}>
                      {isTotalPos ? '+' : ''}{h.totalReturnPercent.toFixed(1)}%
                    </span>
                  </div>
                );
              case 'shares':
                return (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-white/[0.04]">
                    <span>ทุนเฉลี่ย {formatCurrency(h.avgCost)} (รวม {formatCurrency(h.totalCost)})</span>
                    <span>ราคาปัจจุบัน {formatCurrency(h.lastPrice)}</span>
                  </div>
                );
            }
          };

          return (
            <div
              key={h.symbol}
              onClick={() => setSelectedSymbol(h.symbol)}
              className="bg-[#0D1019]/90 border border-white/[0.07] hover:border-[#823AFD]/50 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer group"
            >
              {/* Row 1: Symbol & Weight Badge + Metric Pill */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white font-black text-base font-heading group-hover:text-[#FC2D79] transition-colors">
                    {h.symbol}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-400 font-mono">
                    {h.weightPercent.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {renderMetricBadge()}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition-colors" />
                </div>
              </div>

              {/* Row 2: Secondary Info */}
              {renderSecondaryInfo()}
            </div>
          );
        })}

        {/* Cash Position Card (Pinned at the bottom) */}
        <div className="bg-[#0D1019]/70 border border-emerald-500/20 rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-black text-white font-heading">CASH (เงินสด)</div>
              <div className="text-[11px] text-slate-400">Available Liquid Funds</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black text-emerald-400 font-mono">
              {formatCurrency(cashBalance)}
            </div>
            <div className="text-[10px] text-slate-500">Unallocated</div>
          </div>
        </div>
      </div>

      {/* Stock Detail Bottom Sheet Modal */}
      <StockDetailDrawer
        symbol={selectedSymbol}
        isOpen={!!selectedSymbol}
        onClose={() => setSelectedSymbol(null)}
      />
    </div>
  );
};
