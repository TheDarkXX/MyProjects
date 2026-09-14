import React, { useState, useMemo } from 'react';
import { Holding } from '../../../hooks/useHoldings';
import { Search, Wallet, ChevronRight, Layers } from 'lucide-react';
import clsx from 'clsx';

interface MasterPanelProps {
  holdings: Holding[];
  cashBalance: number;
  selectedSymbol: string | null;
  onSelectSymbol: (symbol: string | null) => void;
  formatCurrency: (val: number, isChange?: boolean) => string;
  historical: Record<string, any[]>;
}

export const MasterPanel: React.FC<MasterPanelProps> = ({
  holdings,
  cashBalance,
  selectedSymbol,
  onSelectSymbol,
  formatCurrency,
  historical,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter & sort holdings
  const filteredHoldings = useMemo(() => {
    const sorted = [...holdings].sort((a, b) => b.weightPercent - a.weightPercent);
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase().trim();
    return sorted.filter((h) => h.symbol.toLowerCase().includes(q));
  }, [holdings, searchQuery]);

  return (
    <div className="w-[340px] lg:w-[380px] h-full flex flex-col bg-[#0A0D15] border-r border-white/[0.08] select-none shrink-0">
      {/* 1. Header & Search Bar */}
      <div className="p-4 border-b border-white/[0.06] space-y-3 bg-[#0D1019]/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-black text-base font-heading">
              Watchlist
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 font-mono">
              {holdings.length}
            </span>
          </div>

          <button
            onClick={() => onSelectSymbol(null)}
            className={clsx(
              "text-xs px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer font-heading",
              selectedSymbol === null
                ? "bg-[#823AFD] text-white shadow-sm"
                : "text-slate-400 hover:text-white bg-white/[0.04]"
            )}
          >
            Overview
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stock symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#07090E] border border-white/[0.08] focus:border-[#823AFD] rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all font-mono"
          />
        </div>
      </div>

      {/* 2. Scrollable Holdings List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {filteredHoldings.map((h) => {
          const isSelected = selectedSymbol === h.symbol;
          const isPositive = h.dayChangePercent >= 0;

          // Mini 7-day sparkline
          const hist = historical[h.symbol];
          let points: number[] = [];
          if (hist && hist.length >= 3) {
            points = hist.slice(-7).map((d) => (typeof d.close === 'number' ? d.close : d.adj_close || d.price || 0)).filter(v => v > 0);
          }
          if (points.length < 3) {
            const base = h.lastPrice;
            const chg = h.dayChange;
            points = [base - chg * 1.5, base - chg * 0.8, base - chg * 0.4, base - chg * 0.1, base];
          }
          const min = Math.min(...points);
          const max = Math.max(...points);
          const range = max - min || 1;
          const coords = points.map((val, idx) => {
            const x = 2 + (idx / (points.length - 1)) * 52;
            const y = 20 - ((val - min) / range) * 16;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          });
          const pathD = `M ${coords.join(' L ')}`;

          return (
            <div
              key={h.symbol}
              onClick={() => onSelectSymbol(h.symbol)}
              className={clsx(
                "p-3 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.99]",
                isSelected
                  ? "bg-[#823AFD]/20 border-[#823AFD] shadow-[0_0_20px_rgba(130,58,253,0.25)] ring-1 ring-[#823AFD]/50"
                  : "bg-[#0D1019]/90 border-white/[0.06] hover:border-white/[0.15] hover:bg-[#11141E]"
              )}
            >
              {/* Symbol & Shares */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-black text-sm font-heading">
                    {h.symbol}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 font-mono">
                    {h.weightPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                  {h.quantity} sh • {formatCurrency(h.currentValue)}
                </div>
              </div>

              {/* Sparkline */}
              <div className="w-14 h-6 shrink-0 flex items-center justify-center">
                <svg width="56" height="22" className="overflow-visible">
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isPositive ? '#10B981' : '#F43F5E'}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Price & Day Change */}
              <div className="text-right shrink-0">
                <div className="text-xs font-black text-white font-mono">
                  {formatCurrency(h.lastPrice)}
                </div>
                <div
                  className={clsx(
                    "text-[10px] font-bold font-mono",
                    isPositive ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {isPositive ? '+' : ''}{h.dayChangePercent.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Pinned Cash Card at Bottom */}
      <div className="p-3 border-t border-white/[0.08] bg-[#07090E]/90">
        <div className="bg-[#0D1019] border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-white font-heading">CASH</div>
              <div className="text-[10px] text-slate-400">Liquid Funds</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-emerald-400 font-mono">
              {formatCurrency(cashBalance)}
            </div>
            <div className="text-[9px] text-slate-500">Available</div>
          </div>
        </div>
      </div>
    </div>
  );
};
