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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
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
                'rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between border relative backdrop-blur-md',
                isHovered
                  ? 'bg-[#181F33] border-purple-500 shadow-lg shadow-purple-900/20 scale-[1.01]'
                  : 'bg-[#101422]/90 border-slate-800 hover:border-slate-700 hover:bg-[#14192B]'
              )}
            >
              {/* Top Accent Strip with Slice Color */}
              <div
                className="absolute top-0 left-4 right-4 h-[2.5px] rounded-t-full opacity-80"
                style={{ backgroundColor: slice.color }}
              />

              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 pt-1 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-white font-heading tracking-wide">
                      {slice.symbol}
                    </span>
                    <span className="text-[13px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700/60">
                      {slice.category}
                    </span>
                  </div>
                  {slice.isCash ? (
                    <div className="text-[13px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                      <Wallet className="w-3.5 h-3.5" /> Available Cash Cushion
                    </div>
                  ) : (
                    <div className="text-[13px] text-slate-300 mt-0.5">
                      {slice.quantity.toLocaleString()} shares · Cost ${(slice.avgCost ?? 0).toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Actual Weight Pill */}
                <div className="text-right">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#192237] border border-slate-700">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-sm font-black text-white font-mono">
                      {slice.actualWeight.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Market Price & 24h Change */}
              {!slice.isCash && (
                <div className="flex items-baseline justify-between mb-3 bg-[#131826] p-2 rounded-xl border border-slate-800/80">
                  <span className="text-base font-bold text-slate-100 font-mono">
                    ${(slice.lastPrice ?? 0).toFixed(2)}
                  </span>
                  <span
                    className={clsx(
                      'text-[13px] font-bold flex items-center gap-0.5',
                      isDayProfit ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {isDayProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isDayProfit ? '+' : ''}
                    {(slice.dayChangePercent ?? 0).toFixed(2)}%
                  </span>
                </div>
              )}

              {/* Holding Value & Total Return */}
              <div className="grid grid-cols-2 gap-2 mb-3 bg-[#131826] p-2.5 rounded-xl border border-slate-800/80">
                <div>
                  <div className="text-[13px] text-slate-300 font-medium">Holding Value</div>
                  <div className="text-sm font-extrabold text-white font-mono">
                    ${(slice.currentValue ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[13px] text-slate-400">
                    ≈ ฿{valueTHB.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[13px] text-slate-300 font-medium">Total Return</div>
                  {!slice.isCash ? (
                    <>
                      <div
                        className={clsx(
                          'text-sm font-extrabold font-mono',
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        )}
                      >
                        {isProfit ? '+' : ''}${slice.totalReturn.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                      <div
                        className={clsx(
                          'text-[13px] font-bold',
                          isProfit ? 'text-emerald-300' : 'text-rose-300'
                        )}
                      >
                        {isProfit ? '+' : ''}{slice.totalReturnPercent.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-[13px] text-slate-400 mt-1">Constant</div>
                  )}
                </div>
              </div>

              {/* Target & Drift Bar */}
              {slice.targetWeight > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[13px] mb-1">
                    <span className="text-slate-300 font-medium">Target: {slice.targetWeight.toFixed(1)}%</span>
                    <span
                      className={clsx(
                        'font-bold px-1.5 py-0.2 rounded-full',
                        slice.drift >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      )}
                    >
                      {slice.drift >= 0 ? `+${slice.drift.toFixed(1)}% Overweight` : `${slice.drift.toFixed(1)}% Underweight`}
                    </span>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (slice.actualWeight / (slice.targetWeight || 1)) * 100)}%`,
                        backgroundColor: slice.color,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Blueprint Target Milestone */}
              {slice.blueprintTargetPrice && (
                <div className="flex items-center justify-between text-[13px] mb-3 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="text-purple-300 font-medium flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> Target ${slice.blueprintTargetPrice.toFixed(2)}
                  </span>
                  {bpDistancePercent !== null && (
                    <span className="font-bold text-slate-200">
                      {bpDistancePercent <= 0 ? 'Target Hit' : `+${bpDistancePercent.toFixed(1)}% to go`}
                    </span>
                  )}
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSymbol(slice.symbol);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors text-[13px] font-bold border border-slate-700/80"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>
                {!slice.isCash && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChart(slice.symbol);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 hover:text-white transition-all text-[13px] font-bold border border-purple-500/40 shadow-sm"
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
