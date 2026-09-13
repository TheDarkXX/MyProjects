import React from 'react';
import { PortfolioSliceItem } from './types';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  BarChart2, 
  Target, 
  Wallet 
} from 'lucide-react';
import clsx from 'clsx';

interface MyPortBentoGridViewProps {
  slices: PortfolioSliceItem[];
  exchangeRate: number;
  hoveredSymbol: string | null;
  onHoverSymbol: (symbol: string | null) => void;
  onSelectSymbol: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
}

export const MyPortBentoGridView: React.FC<MyPortBentoGridViewProps> = ({
  slices,
  exchangeRate,
  hoveredSymbol,
  onHoverSymbol,
  onSelectSymbol,
  onOpenChart,
}) => {
  return (
    <div className="flex-1 h-full bg-[#0B1220] p-4 overflow-y-auto custom-scrollbar select-none">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
        {slices.map((slice) => {
          const isHovered = hoveredSymbol?.toUpperCase() === slice.symbol.toUpperCase();
          const isProfit = slice.totalReturn >= 0;
          const isDayProfit = slice.dayChangePercent >= 0;
          const valueTHB = slice.currentValue * (exchangeRate || 34.5);

          // Blueprint distance
          let bpDistancePercent: number | null = null;
          if (slice.blueprintTargetPrice && slice.lastPrice > 0) {
            bpDistancePercent = ((slice.blueprintTargetPrice - slice.lastPrice) / slice.lastPrice) * 100;
          }

          return (
            <div
              key={slice.symbol}
              onMouseEnter={() => onHoverSymbol(slice.symbol)}
              onMouseLeave={() => onHoverSymbol(null)}
              onClick={() => onSelectSymbol(slice.symbol)}
              className={clsx(
                'rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between border relative',
                isHovered
                  ? 'bg-[#181F33] border-purple-500 shadow-xl shadow-purple-950/30 scale-[1.01]'
                  : 'bg-[#101422] border-slate-800/80 hover:border-slate-700 hover:bg-[#131828]'
              )}
            >
              {/* Top Accent Strip */}
              <div
                className="absolute top-0 left-4 right-4 h-[2px] rounded-t-full opacity-70"
                style={{ backgroundColor: slice.color }}
              />

              {/* 1. Header: Asset Identity & Weight */}
              <div>
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white font-heading tracking-wide">
                      {slice.symbol}
                    </span>
                    <span className="text-[13px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700/60">
                      {slice.category}
                    </span>
                  </div>

                  {/* Weight Pill */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#161D2E] border border-slate-700/80">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-sm font-black text-white font-mono">
                      {slice.actualWeight.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Subtitle / Holdings Details */}
                <div className="text-[13px] text-slate-400 mt-1">
                  {slice.isCash ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5" /> Liquid Cash Cushion
                    </span>
                  ) : (
                    <span>{slice.quantity.toLocaleString()} shares · Cost ${(slice.avgCost ?? 0).toFixed(2)}</span>
                  )}
                </div>

                {/* 2. Hero Metric: Value & P&L in Clean Inline Flow */}
                <div className="mt-3.5 flex items-baseline justify-between">
                  <div>
                    <div className="text-xl font-black text-white font-mono">
                      ${(slice.currentValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[13px] text-slate-400 font-medium">
                      ≈ ฿{valueTHB.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  {!slice.isCash && (
                    <div className="text-right">
                      <div
                        className={clsx(
                          'text-sm font-bold font-mono',
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {isProfit ? '+' : ''}${slice.totalReturn.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                      <span
                        className={clsx(
                          'text-[13px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5',
                          isProfit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        )}
                      >
                        {isProfit ? '+' : ''}{slice.totalReturnPercent.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Market Price & Target Drift Row */}
                {!slice.isCash && (
                  <div className="mt-3 flex items-center justify-between text-[13px] pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200 font-mono">
                        ${(slice.lastPrice ?? 0).toFixed(2)}
                      </span>
                      <span
                        className={clsx(
                          'font-semibold flex items-center gap-0.5',
                          isDayProfit ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {isDayProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isDayProfit ? '+' : ''}{(slice.dayChangePercent ?? 0).toFixed(2)}%
                      </span>
                    </div>

                    {slice.targetWeight > 0 && (
                      <span
                        className={clsx(
                          'font-bold px-1.5 py-0.2 rounded-full text-[13px]',
                          slice.drift >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                        )}
                      >
                        {slice.drift >= 0 ? `+${slice.drift.toFixed(1)}% Over` : `${slice.drift.toFixed(1)}% Under`}
                      </span>
                    )}
                  </div>
                )}

                {/* Target Progress Bar */}
                {slice.targetWeight > 0 && (
                  <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (slice.actualWeight / (slice.targetWeight || 1)) * 100)}%`,
                        backgroundColor: slice.color,
                      }}
                    />
                  </div>
                )}

                {/* Blueprint Milestone Chip (if defined) */}
                {slice.blueprintTargetPrice && (
                  <div className="mt-2.5 flex items-center justify-between text-[13px] px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <span className="text-purple-300 font-medium flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> Target ${slice.blueprintTargetPrice.toFixed(2)}
                    </span>
                    {bpDistancePercent !== null && (
                      <span className="font-bold text-slate-200">
                        {bpDistancePercent <= 0 ? '🎯 Target Hit' : `+${bpDistancePercent.toFixed(1)}% to go`}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Footer Actions */}
              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSymbol(slice.symbol);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors text-[13px] font-bold border border-slate-700/80 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
                {!slice.isCash && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChart(slice.symbol);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-600/25 text-purple-200 hover:bg-purple-600/45 hover:text-white transition-all text-[13px] font-bold border border-purple-500/40 shadow-sm cursor-pointer"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Chart</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
