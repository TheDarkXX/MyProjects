import React, { useState, useMemo, useEffect } from 'react';
import { useHoldings, Holding } from '../../../hooks/useHoldings';
import { usePriceStore } from '../../../stores/priceStore';
import { usePortfolioStore } from '../../../stores/portfolioStore';
import { useTransactionStore } from '../../../stores/transactionStore';
import { useBlueprintStore } from '../../../stores/blueprintStore';
import { useUiStore } from '../../../stores/uiStore';
import { formatCurrencyVal, formatSecondaryVal, formatPriceVal } from './types';
import { 
  Briefcase, 
  Info, 
  X, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Target,
  Layers,
  Clock
} from 'lucide-react';
import clsx from 'clsx';

// Deterministic gradient colors for symbol badges (TradingView style)
const BADGE_GRADIENTS = [
  'from-blue-600 to-indigo-600',
  'from-purple-600 to-pink-600',
  'from-emerald-600 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-600 to-red-600',
  'from-cyan-600 to-blue-600',
  'from-fuchsia-600 to-purple-600'
];

function getSymbolBadgeGradient(sym: string): string {
  let hash = 0;
  for (let i = 0; i < sym.length; i++) {
    hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % BADGE_GRADIENTS.length;
  return BADGE_GRADIENTS[idx];
}

interface MyPortWatchlistProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const MyPortWatchlist: React.FC<MyPortWatchlistProps> = ({
  selectedSymbol,
  onSelectSymbol,
}) => {
  const { 
    holdings = [], 
    totalNetWorth = 0, 
    totalPortfolioValue: rawTotalPortfolioValue,
    loading: holdingsLoading,
  } = useHoldings();

  const totalPortfolioValue = rawTotalPortfolioValue ?? totalNetWorth ?? 0;

  const { exchangeRate, prices } = usePriceStore();
  const { currency } = useUiStore();
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const { transactions, fetchTransactions, loading: txLoading } = useTransactionStore();
  const { blueprints, fetchBlueprints } = useBlueprintStore();
  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);

  const isLoading = holdingsLoading || txLoading;

  // Modal State
  const [detailModalHolding, setDetailModalHolding] = useState<Holding | null>(null);

  // Eagerly fetch blueprints when activePortfolioId is available
  useEffect(() => {
    if (activePortfolioId) {
      fetchBlueprints(activePortfolioId);
    }
  }, [activePortfolioId, fetchBlueprints]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetailModalHolding(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter valid holdings
  const validHoldings = useMemo(() => {
    return (holdings || []).filter((h) => h && h.quantity > 0 && h.symbol !== 'CASH');
  }, [holdings]);

  // Find blueprint and trade history for the modal holding
  const modalData = useMemo(() => {
    if (!detailModalHolding) return null;
    const sym = detailModalHolding.symbol.toUpperCase();
    const bp = (blueprints || []).find((b) => b && b.symbol && b.symbol.toUpperCase() === sym);
    const txList = (transactions || [])
      .filter((t) => t.symbol && t.symbol.toUpperCase() === sym && (!t.status || t.status.toUpperCase() === 'CONFIRMED'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return {
      blueprint: bp,
      tradeLots: txList,
    };
  }, [detailModalHolding, blueprints, transactions]);

  return (
    <div className="w-full h-full flex-1 bg-[#0F111A] flex flex-col select-none overflow-hidden text-[13px]">
      {/* 1. Portfolio Header Bar (Sleek Compact Bar) */}
      <div className="h-7 px-2.5 bg-[#131724]/90 border-b border-[#1F2233]/60 flex items-center justify-between text-xs text-slate-300 select-none shrink-0">
        <div className="flex items-center gap-1.5 flex-1 overflow-hidden">
          <Briefcase className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          {portfolios.length > 1 ? (
            <select
              value={activePortfolioId || ''}
              onChange={(e) => {
                const newId = e.target.value;
                setActivePortfolio(newId);
                fetchTransactions(newId);
              }}
              className="bg-[#0B1220] border border-slate-700/80 rounded px-1.5 py-0.5 text-[13px] font-medium text-slate-200 focus:outline-none focus:border-purple-400 cursor-pointer max-w-[170px] truncate"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#121622] text-white">
                  {p.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="tracking-wide uppercase text-slate-200 truncate font-medium text-[13px]">
              {activePortfolio?.name || 'My Portfolio'}
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-normal shrink-0">
            ({validHoldings.length})
          </span>
        </div>
        <div className="text-right text-[13px] font-mono text-slate-300 shrink-0">
          {formatCurrencyVal(totalPortfolioValue, currency, exchangeRate)}
        </div>
      </div>

      {/* 2. Sort & Table Header Bar (Height: 26px — Identical to Watchlist) */}
      <div className="h-[26px] px-3 bg-[#0E121E] border-b border-[#1F2233] grid grid-cols-12 items-center text-[13px] text-slate-400 font-medium select-none shrink-0">
        <div className="col-span-5 flex items-center gap-1">
          <span>Symbol</span>
        </div>
        <div className="col-span-3 text-right pr-1">
          <span>Last</span>
        </div>
        <div className="col-span-2 text-right">
          <span>Chg</span>
        </div>
        <div className="col-span-2 text-right pr-1">
          <span>Chg%</span>
        </div>
      </div>

      {/* 3. High-Density Holdings Rows (Height: 30px per row — Identical to Watchlist) */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1F2233]/25 custom-scrollbar">
        {isLoading && validHoldings.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-[13px] flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading portfolio holdings...</span>
          </div>
        ) : validHoldings.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-[13px]">
            No holdings in this portfolio
          </div>
        ) : (
          validHoldings.map((h) => {
            const isSelected = h.symbol.toUpperCase() === selectedSymbol.toUpperCase();
            const priceQuote = prices[h.symbol];
            const change = priceQuote?.change ?? 0;
            const percentChange = h.dayChangePercent ?? priceQuote?.percent_change ?? 0;
            const isPositive = percentChange >= 0;
            const isZero = percentChange === 0;

            return (
              <div
                key={h.symbol}
                onClick={() => onSelectSymbol(h.symbol)}
                className={clsx(
                  'h-[30px] px-3 grid grid-cols-12 items-center transition-all cursor-pointer group relative select-none',
                  isSelected
                    ? 'bg-purple-950/40 text-white'
                    : 'hover:bg-white/5 text-slate-200 hover:text-white'
                )}
              >
                {/* Active Neon Left Border Indicator */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#823AFD] to-[#FC2D79]" />
                )}

                {/* Symbol Column: Dot Badge + Ticker */}
                <div className="col-span-5 flex items-center gap-1.5 overflow-hidden pr-1">
                  <div
                    className={clsx(
                      'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gradient-to-tr shadow-sm',
                      getSymbolBadgeGradient(h.symbol)
                    )}
                  >
                    {h.symbol.slice(0, 1)}
                  </div>
                  <span className="text-[13px] font-normal tracking-tight truncate font-mono text-slate-100 group-hover:text-white">
                    {h.symbol}
                  </span>
                </div>

                {/* Last Price Column */}
                <div className="col-span-3 text-right font-mono text-[13px] font-normal text-slate-200 group-hover:text-white pr-1">
                  {formatPriceVal(h.lastPrice, currency, exchangeRate)}
                </div>

                {/* Change Column */}
                <div
                  className={clsx(
                    'col-span-2 text-right font-mono text-[13px] font-normal truncate',
                    isZero ? 'text-slate-400' : isPositive ? 'text-emerald-400' : 'text-rose-400'
                  )}
                >
                  {isZero ? '0.00' : `${isPositive ? '+' : ''}${change.toFixed(2)}`}
                </div>

                {/* Change % Column + Info Button on Hover */}
                <div className="col-span-2 text-right relative flex items-center justify-end pr-0.5">
                  <span
                    className={clsx(
                      'font-mono text-[13px] font-normal group-hover:opacity-20 transition-opacity',
                      isZero ? 'text-slate-400' : isPositive ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {isZero ? '0.00%' : `${isPositive ? '+' : ''}${percentChange.toFixed(2)}%`}
                  </span>

                  {/* Inspect Details Button (Visible on hover, replaces % text) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailModalHolding(h);
                    }}
                    className="absolute right-0 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-white hover:bg-purple-600/30 rounded transition-all cursor-pointer"
                    title="View Portfolio Position Details (ℹ️)"
                  >
                    <Info className="w-3.5 h-3.5 text-purple-300" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Holding Details Modal */}
      {detailModalHolding && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <div 
            onClick={() => setDetailModalHolding(null)} 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-150" 
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-lg bg-[#0E121E] border border-slate-700/80 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] flex flex-col z-10 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-[#121624] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 bg-gradient-to-tr shadow-md',
                    getSymbolBadgeGradient(detailModalHolding.symbol)
                  )}
                >
                  {detailModalHolding.symbol.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white tracking-wide font-heading">
                      {detailModalHolding.symbol}
                    </h3>
                    {detailModalHolding.stockType && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium border border-purple-500/30">
                        {detailModalHolding.stockType}
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-slate-400 font-normal">
                    {activePortfolio?.name || 'My Portfolio'} · Position Detail
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDetailModalHolding(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh] custom-scrollbar">
              {/* Position Key Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* Quantity */}
                <div className="p-3 rounded-xl bg-[#141826] border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-normal mb-1">Shares Held</div>
                  <div className="text-base font-bold text-white font-mono">
                    {detailModalHolding.quantity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                  </div>
                </div>

                {/* Avg Cost */}
                <div className="p-3 rounded-xl bg-[#141826] border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-normal mb-1">Avg Cost</div>
                  <div className="text-base font-normal text-slate-100 font-mono">
                    {formatPriceVal(detailModalHolding.avgCost, currency, exchangeRate)}
                  </div>
                </div>

                {/* Last Market Price */}
                <div className="p-3 rounded-xl bg-[#141826] border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-normal mb-1">Market Price</div>
                  <div className="text-base font-normal text-slate-100 font-mono">
                    {formatPriceVal(detailModalHolding.lastPrice, currency, exchangeRate)}
                  </div>
                </div>

                {/* Holding Value */}
                <div className="p-3 rounded-xl bg-[#141826] border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-normal mb-1">Holding Value</div>
                  <div className="text-base font-normal text-slate-100 font-mono">
                    {formatCurrencyVal(detailModalHolding.currentValue, currency, exchangeRate)}
                  </div>
                  <div className="text-xs text-slate-400 font-normal mt-0.5">
                    ({formatSecondaryVal(detailModalHolding.currentValue, currency, exchangeRate)})
                  </div>
                </div>

                {/* Unrealized P&L */}
                <div className="p-3 rounded-xl bg-[#141826] border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-normal mb-1">Total Return (P&L)</div>
                  <div className={clsx(
                    'text-base font-normal font-mono flex items-center gap-1',
                    detailModalHolding.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {detailModalHolding.totalReturn >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{formatCurrencyVal(detailModalHolding.totalReturn, currency, exchangeRate, true)}</span>
                  </div>
                  <div className={clsx(
                    'text-xs font-medium mt-0.5',
                    detailModalHolding.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {detailModalHolding.totalReturnPercent >= 0 ? '+' : ''}
                    {detailModalHolding.totalReturnPercent.toFixed(2)}%
                  </div>
                </div>

                {/* Portfolio Weight & Blueprint Target */}
                <div className="p-3 rounded-xl bg-[#141826] border border-slate-800/80">
                  <div className="text-xs text-slate-400 font-normal mb-1">Portfolio Weight</div>
                  <div className="text-base font-bold text-purple-300 font-mono">
                    {detailModalHolding.weightPercent.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-400 font-normal mt-0.5 truncate">
                    {modalData.blueprint ? `Target: ${modalData.blueprint.target_percent}%` : 'No Blueprint'}
                  </div>
                </div>
              </div>

              {/* Trade Execution Lots Section */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Trade Execution History ({modalData.tradeLots.length} transactions)</span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#121622]/60 divide-y divide-slate-800/60 max-h-48 overflow-y-auto custom-scrollbar">
                  {modalData.tradeLots.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      No transaction records found for this symbol.
                    </div>
                  ) : (
                    modalData.tradeLots.map((tx) => {
                      const isBuy = tx.type === 'BUY';
                      const txDate = tx.date ? new Date(tx.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
                      return (
                        <div key={tx.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              'px-1.5 py-0.5 rounded text-[11px] font-bold font-mono',
                              isBuy ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            )}>
                              {tx.type}
                            </span>
                            <span className="text-slate-300 font-mono">{txDate}</span>
                          </div>

                          <div className="text-right font-mono">
                            <div className="text-slate-100 font-normal">
                              {tx.amount} shs @ ${tx.price?.toFixed(2) ?? '0.00'}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              Total: ${(tx.amount * (tx.price || 0) + (tx.fee || 0)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-[#121624] flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  onSelectSymbol(detailModalHolding.symbol);
                  setDetailModalHolding(null);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-[13px] transition-all shadow-md shadow-purple-600/30 cursor-pointer"
              >
                <BarChart2 className="w-4 h-4" />
                <span>Switch Chart to {detailModalHolding.symbol}</span>
              </button>

              <button
                onClick={() => setDetailModalHolding(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-[13px] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
