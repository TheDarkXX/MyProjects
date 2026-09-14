import React, { useMemo } from 'react';
import { Holding } from '../../../hooks/useHoldings';
import clsx from 'clsx';

interface WatchlistCardProps {
  holding: Holding;
  formatCurrency: (val: number, isChange?: boolean) => string;
  historicalData?: any[];
  onClick: () => void;
}

export const WatchlistCard: React.FC<WatchlistCardProps> = ({
  holding,
  formatCurrency,
  historicalData,
  onClick,
}) => {
  const isPositive = holding.dayChangePercent >= 0;

  // Generate 7-day sparkline coordinates (width 64, height 24, padding 2)
  const sparklinePath = useMemo(() => {
    const w = 64;
    const h = 24;
    const p = 2;

    let points: number[] = [];
    if (historicalData && historicalData.length >= 3) {
      // Take last 7 days or all if less
      const slice = historicalData.slice(-7);
      points = slice.map((d) => (typeof d.close === 'number' ? d.close : d.adj_close || d.price || 0)).filter(v => v > 0);
    }

    // Fallback: smooth synthesized curve matching dayChangePercent
    if (points.length < 3) {
      const base = holding.lastPrice;
      const chg = (base * (holding.dayChangePercent || 0)) / 100;
      points = [base - chg * 1.5, base - chg * 0.8, base - chg * 0.4, base - chg * 0.1, base];
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;

    const coords = points.map((val, idx) => {
      const x = p + (idx / (points.length - 1)) * (w - p * 2);
      const y = h - p - ((val - min) / range) * (h - p * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${coords.join(' L ')}`;
  }, [historicalData, holding.lastPrice, holding.dayChangePercent]);

  return (
    <div
      onClick={onClick}
      className="bg-[#111418] border border-[#2A2E45]/80 hover:border-[#823AFD]/60 rounded-2xl p-3.5 sm:p-4 shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer flex items-center justify-between gap-3 group select-none"
    >
      {/* Left: Symbol & Weight */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-black text-base font-heading group-hover:text-[#FC2D79] transition-colors">
            {holding.symbol}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#1A1D2D] border border-[#2A2E45] text-slate-300 font-mono">
            {holding.weightPercent.toFixed(1)}%
          </span>
        </div>
        <div className="text-[11px] text-[#CBD5E1] mt-0.5 truncate font-mono">
          {holding.quantity} shares • {formatCurrency(holding.currentValue)}
        </div>
      </div>

      {/* Middle: 7-Day Mini Sparkline (PC Candle Colors: #FFE600 Gold / #C62828 Red) */}
      <div className="w-16 h-7 shrink-0 flex items-center justify-center">
        <svg width="64" height="24" className="overflow-visible">
          <path
            d={sparklinePath}
            fill="none"
            stroke={isPositive ? '#FFE600' : '#C62828'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={clsx(
              "filter",
              isPositive ? "drop-shadow-[0_0_4px_rgba(255,230,0,0.35)]" : "drop-shadow-[0_0_4px_rgba(198,40,40,0.35)]"
            )}
          />
        </svg>
      </div>

      {/* Right: Price & Day Change Badge */}
      <div className="text-right shrink-0">
        <div className="text-sm font-black text-white font-mono">
          {formatCurrency(holding.lastPrice)}
        </div>
        <div
          className={clsx(
            "inline-flex items-center justify-end px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono mt-0.5 tracking-tight",
            isPositive
              ? "bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/30 shadow-[0_0_8px_rgba(255,230,0,0.15)]"
              : "bg-[#C62828]/15 text-[#FF5252] border border-[#C62828]/30 shadow-[0_0_8px_rgba(198,40,40,0.15)]"
          )}
        >
          {isPositive ? '+' : ''}{holding.dayChangePercent.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};
