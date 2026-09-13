import React from 'react';
import { PortfolioSliceItem, formatCurrencyVal, formatSecondaryVal } from './types';
import { Transaction } from '../../../stores/transactionStore';
import { BlueprintEntry } from '../../../stores/blueprintStore';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  BarChart2, 
  FileText 
} from 'lucide-react';
import clsx from 'clsx';

interface MyPortHoldingDrawerProps {
  symbol: string | null;
  slice?: PortfolioSliceItem;
  transactions: Transaction[];
  blueprint?: BlueprintEntry;
  exchangeRate: number;
  onClose: () => void;
  onOpenChart: (symbol: string) => void;
  currency: 'USD' | 'THB';
}

export const MyPortHoldingDrawer: React.FC<MyPortHoldingDrawerProps> = ({
  symbol,
  slice,
  transactions,
  blueprint,
  exchangeRate,
  onClose,
  onOpenChart,
  currency,
}) => {
  if (!symbol || !slice) return null;

  const isProfit = slice.totalReturn >= 0;
  const valueTHB = slice.currentValue * (exchangeRate || 34.5);

  // Filter and sort transactions for this symbol
  const stockTxs = transactions
    .filter((t) => t.symbol && t.symbol.toUpperCase() === symbol.toUpperCase() && t.status === 'CONFIRMED')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Blueprint target distance
  let bpDistancePercent: number | null = null;
  if (blueprint?.target_price && slice.lastPrice > 0) {
    bpDistancePercent = ((blueprint.target_price - slice.lastPrice) / slice.lastPrice) * 100;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
      />

      {/* Drawer Container */}
      <div className="relative w-full sm:w-[460px] h-full bg-[#0D1017] border-l border-slate-800 shadow-2xl flex flex-col z-10 overflow-hidden animate-slideLeft">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-[#121622] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: slice.color }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-wide font-heading">
                  {slice.symbol}
                </h3>
                <span className="text-[13px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                  {slice.category}
                </span>
              </div>
              <div className="text-[13px] text-slate-300 font-medium">
                {slice.isCash ? 'Liquid Cash Cushion' : `${slice.quantity.toLocaleString()} Shares Held`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!slice.isCash && (
              <button
                onClick={() => onOpenChart(slice.symbol)}
                title="Launch Full Candlestick Chart in X-Chart"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 hover:text-white transition-all text-[13px] font-bold border border-purple-500/40 shadow-sm"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Chart</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Section 1: Executive KPI Card */}
          <div className="bg-[#141824] rounded-2xl p-4 border border-slate-800 space-y-3">
            <div className="text-[13px] font-semibold text-slate-300 uppercase tracking-wider">
              Holdings Overview
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Current Value */}
              <div className="bg-[#191F30] p-3 rounded-xl border border-slate-800/80">
                <div className="text-[13px] text-slate-300 font-medium">Current Market Value</div>
                <div className="text-base font-black text-white font-mono mt-0.5">
                  {formatCurrencyVal(slice.currentValue ?? 0, currency, exchangeRate)}
                </div>
                <div className="text-[13px] text-slate-400">
                  ({formatSecondaryVal(slice.currentValue ?? 0, currency, exchangeRate)})
                </div>
              </div>

              {/* Total Cost Basis */}
              <div className="bg-[#191F30] p-3 rounded-xl border border-slate-800/80">
                <div className="text-[13px] text-slate-300 font-medium">Total Cost Basis</div>
                <div className="text-base font-black text-slate-200 font-mono mt-0.5">
                  {formatCurrencyVal(slice.totalCost ?? 0, currency, exchangeRate)}
                </div>
                <div className="text-[13px] text-slate-400">
                  Avg ${(slice.avgCost ?? 0).toFixed(2)} · {slice.quantity.toLocaleString()} shares
                </div>
              </div>
            </div>

            {/* Total Return & Weight Strip */}
            {!slice.isCash && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#191F30] border border-slate-800/80">
                <div>
                  <div className="text-[13px] text-slate-300 font-medium">Net Unrealized P&L</div>
                  <div
                    className={clsx(
                      'text-base font-black font-mono flex items-center gap-1',
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {formatCurrencyVal(slice.totalReturn, currency, exchangeRate, true)} ({isProfit ? '+' : ''}{slice.totalReturnPercent.toFixed(2)}%)
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[13px] text-slate-300 font-medium">Portfolio Weight</div>
                  <div className="text-base font-black text-purple-300 font-mono">
                    {slice.actualWeight.toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Blueprint Targets & Strategy Notes */}
          {blueprint && (
            <div className="bg-[#141824] rounded-2xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span>Blueprint Strategy & Milestones</span>
                </div>
                {slice.targetWeight > 0 && (
                  <span
                    className={clsx(
                      'text-[13px] font-bold px-2 py-0.5 rounded-full',
                      slice.drift >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    )}
                  >
                    {slice.drift >= 0 ? `+${slice.drift.toFixed(1)}% Overweight` : `${slice.drift.toFixed(1)}% Underweight`}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#191F30] p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[13px] text-slate-300 font-medium">Target Price</div>
                  <div className="text-base font-bold text-purple-300 font-mono mt-0.5">
                    {blueprint.target_price ? `$${blueprint.target_price.toFixed(2)}` : 'Not Set'}
                  </div>
                  {bpDistancePercent !== null && (
                    <div className={clsx('text-[13px] font-semibold mt-0.5', bpDistancePercent <= 0 ? 'text-emerald-400' : 'text-slate-300')}>
                      {bpDistancePercent <= 0 ? '🎯 Target Achieved!' : `+${bpDistancePercent.toFixed(1)}% Remaining`}
                    </div>
                  )}
                </div>

                <div className="bg-[#191F30] p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[13px] text-slate-300 font-medium">Ceiling Price</div>
                  <div className="text-base font-bold text-slate-200 font-mono mt-0.5">
                    {blueprint.ceiling_price ? `$${blueprint.ceiling_price.toFixed(2)}` : 'No Ceiling'}
                  </div>
                  <div className="text-[13px] text-slate-400">
                    Target Allocation: {blueprint.target_percent}%
                  </div>
                </div>
              </div>

              {blueprint.notes && (
                <div className="bg-[#191F30] p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[13px] text-slate-300 font-medium flex items-center gap-1 mb-1">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Investment Thesis & Notes</span>
                  </div>
                  <p className="text-[13px] text-slate-200 leading-relaxed font-sans">
                    {blueprint.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Trade Lots History (Chronological) */}
          <div className="bg-[#141824] rounded-2xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Trade Lots Execution History</span>
              </div>
              <span className="text-[13px] text-slate-400">{stockTxs.length} Transactions</span>
            </div>

            {stockTxs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm bg-[#191F30] rounded-xl border border-slate-800">
                No transaction records found
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 border border-slate-800/80 rounded-xl overflow-hidden bg-[#191F30]">
                {stockTxs.map((tx) => {
                  const isBuy = tx.type === 'BUY';
                  const txTotal = (tx.amount || 0) * (tx.price || 0) + (tx.fee || 0);

                  return (
                    <div key={tx.id} className="p-3 flex items-center justify-between text-[13px]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded font-bold text-[13px]',
                              isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            )}
                          >
                            {tx.type}
                          </span>
                          <span className="text-slate-200 font-semibold font-mono">
                            {tx.date}
                          </span>
                        </div>
                        <div className="text-slate-300 mt-1">
                          {tx.amount} shares @ ${tx.price?.toFixed(2)}
                          {tx.fee ? ` (Fee: $${tx.fee.toFixed(2)})` : ''}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-slate-100 font-mono">
                          ${txTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {tx.note && (
                          <div className="text-[13px] text-slate-400 truncate max-w-[120px]" title={tx.note}>
                            {tx.note}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer CTA */}
        {!slice.isCash && (
          <div className="p-4 border-t border-slate-800 bg-[#121622] shrink-0">
            <button
              onClick={() => onOpenChart(slice.symbol)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-purple-900/30"
            >
              <BarChart2 className="w-4 h-4" />
              <span>Launch Full {slice.symbol} Candlestick Chart in X-Chart</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
