import React, { useState, useMemo } from 'react';
import { useHoldings, Holding } from '../../../hooks/useHoldings';
import { usePriceStore } from '../../../stores/priceStore';
import { usePortfolioStore } from '../../../stores/portfolioStore';
import { useTransactionStore } from '../../../stores/transactionStore';
import { useUiStore } from '../../../stores/uiStore';
import { formatCurrencyVal, formatSecondaryVal, formatPriceVal } from './types';
import { Search, TrendingUp, TrendingDown, Briefcase } from 'lucide-react';
import clsx from 'clsx';

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
    totalPnl = 0, 
    totalPnlPercent = 0,
    totalPortfolioValue: rawTotalPortfolioValue,
    totalUnrealizedProfit: rawTotalUnrealizedProfit,
    totalUnrealizedProfitPercent: rawTotalUnrealizedProfitPercent,
    loading: holdingsLoading,
  } = useHoldings();

  const { fetchTransactions, loading: txLoading } = useTransactionStore();
  const isLoading = holdingsLoading || txLoading;

  const totalPortfolioValue = rawTotalPortfolioValue ?? totalNetWorth ?? 0;
  const totalUnrealizedProfit = rawTotalUnrealizedProfit ?? totalPnl ?? 0;
  const totalUnrealizedProfitPercent = rawTotalUnrealizedProfitPercent ?? totalPnlPercent ?? 0;

  const { exchangeRate } = usePriceStore();
  const { currency } = useUiStore();
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'pnl' | 'weight' | 'symbol'>('weight');

  // Filter and sort holdings
  const filteredHoldings = useMemo(() => {
    let list = (holdings || []).filter((h) => h && h.quantity > 0 && h.symbol !== 'CASH');

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      list = list.filter((h) => h.symbol.toUpperCase().includes(q));
    }

    list.sort((a, b) => {
      const aPnl = a.totalReturnPercent ?? 0;
      const bPnl = b.totalReturnPercent ?? 0;
      const aWeight = a.weightPercent ?? 0;
      const bWeight = b.weightPercent ?? 0;
      if (sortBy === 'pnl') return bPnl - aPnl;
      if (sortBy === 'symbol') return (a.symbol || '').localeCompare(b.symbol || '');
      return bWeight - aWeight;
    });

    return list;
  }, [holdings, searchQuery, sortBy]);

  return (
    <div className="w-full h-full flex-1 bg-[#0F111A] flex flex-col select-none overflow-hidden">
      {/* Port Header Summary Banner */}
      <div className="p-3 border-b border-[#1F2233] bg-[#121520]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              {portfolios.length > 1 ? (
                <select
                  value={activePortfolioId || ''}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setActivePortfolio(newId);
                    fetchTransactions(newId);
                  }}
                  className="bg-[#1C2235] border border-slate-700/80 rounded-md px-1.5 py-0.5 text-[13px] font-bold text-slate-200 focus:outline-none focus:border-purple-400 cursor-pointer max-w-[150px] truncate"
                >
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#121622] text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-[13px] font-bold text-slate-200 truncate max-w-[150px]">
                  {activePortfolio?.name || 'My Portfolio'}
                </div>
              )}
              <div className="text-[13px] text-slate-300 font-medium">
                {filteredHoldings.length} Holdings
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-normal text-slate-100 font-mono">
              {formatCurrencyVal(totalPortfolioValue, currency, exchangeRate)}
            </div>
            <div className="text-[13px] text-slate-400 font-normal">
              ({formatSecondaryVal(totalPortfolioValue, currency, exchangeRate)})
            </div>
          </div>
        </div>

        {/* Unrealized Return Strip */}
        <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-[#181D2D] border border-slate-700/60">
          <span className="text-[13px] text-slate-300 font-medium">Total Return</span>
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'text-sm font-normal font-mono flex items-center gap-0.5',
                (totalUnrealizedProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {(totalUnrealizedProfit ?? 0) >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {formatCurrencyVal(totalUnrealizedProfit, currency, exchangeRate, true)}
            </span>
            <span
              className={clsx(
                'text-[13px] font-medium px-1.5 py-0.2 rounded',
                (totalUnrealizedProfitPercent ?? 0) >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              )}
            >
              {(totalUnrealizedProfitPercent ?? 0) >= 0 ? '+' : ''}
              {(totalUnrealizedProfitPercent ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="p-2 border-b border-[#1F2233] flex flex-col gap-1.5 bg-[#121520]/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search holdings..."
            className="w-full bg-[#161B28] border border-slate-700/70 rounded-lg pl-8 pr-2.5 py-1 text-[13px] text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Sort Pill Tabs */}
        <div className="flex items-center justify-between gap-1 text-[13px] bg-[#141824] p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setSortBy('weight')}
            className={clsx(
              'flex-1 py-0.5 rounded text-center transition-colors font-medium',
              sortBy === 'weight' ? 'bg-purple-600/30 text-purple-200 font-bold border border-purple-500/40' : 'text-slate-300 hover:text-white'
            )}
          >
            Weight
          </button>
          <button
            onClick={() => setSortBy('pnl')}
            className={clsx(
              'flex-1 py-0.5 rounded text-center transition-colors font-medium',
              sortBy === 'pnl' ? 'bg-purple-600/30 text-purple-200 font-bold border border-purple-500/40' : 'text-slate-300 hover:text-white'
            )}
          >
            P&L %
          </button>
          <button
            onClick={() => setSortBy('symbol')}
            className={clsx(
              'flex-1 py-0.5 rounded text-center transition-colors font-medium',
              sortBy === 'symbol' ? 'bg-purple-600/30 text-purple-200 font-bold border border-purple-500/40' : 'text-slate-300 hover:text-white'
            )}
          >
            A-Z
          </button>
        </div>
      </div>

      {/* Holdings List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
        {isLoading && filteredHoldings.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading portfolio holdings...</span>
          </div>
        ) : filteredHoldings.length === 0 ? (
          <div className="p-8 text-center text-slate-300 text-sm">
            {searchQuery ? 'No holdings match the search query' : 'No holdings in this portfolio'}
          </div>
        ) : (
          filteredHoldings.map((h) => {
            const isSelected = h.symbol.toUpperCase() === selectedSymbol.toUpperCase();
            const isProfit = (h.totalReturnPercent ?? 0) >= 0;
            const dayProfit = (h.dayChangePercent ?? 0) >= 0;

            return (
              <div
                key={h.symbol}
                onClick={() => onSelectSymbol(h.symbol)}
                className={clsx(
                  'p-2.5 cursor-pointer transition-all flex flex-col gap-1.5 relative border-l-2',
                  isSelected
                    ? 'bg-[#1C2235] border-l-purple-500 shadow-sm'
                    : 'bg-transparent border-l-transparent hover:bg-slate-800/40'
                )}
              >
                {/* Row 1: Symbol, Category & Last Price */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white tracking-wide font-heading">
                      {h.symbol}
                    </span>
                    {h.stockType && (
                      <span className="text-[13px] px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300 font-normal border border-slate-700/60">
                        {h.stockType}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-normal text-slate-200 font-mono">
                      {formatPriceVal(h.lastPrice ?? 0, currency, exchangeRate)}
                    </span>
                    <span
                      className={clsx(
                        'text-[13px] ml-1.5 font-medium',
                        dayProfit ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {dayProfit ? '+' : ''}
                      {(h.dayChangePercent ?? 0).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Row 2: Cost Basis, Quantity & Unrealized P/L */}
                <div className="flex items-center justify-between text-[13px]">
                  <div className="text-slate-400 font-normal">
                    <span>Avg ${(h.avgCost ?? 0).toFixed(2)}</span>
                    <span className="mx-1 text-slate-500">·</span>
                    <span>{h.quantity ?? 0} shares</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={clsx(
                        'font-normal text-sm font-mono',
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {isProfit ? '+' : ''}
                      {(h.totalReturnPercent ?? 0).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Row 3: Total Value & Port Weight */}
                <div className="flex items-center justify-between text-[13px] text-slate-300 pt-0.5">
                  <div className="text-slate-300 font-normal font-mono">
                    Val: <span className="text-slate-200">{formatCurrencyVal(h.currentValue ?? 0, currency, exchangeRate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-normal">Weight:</span>
                    <span className="font-normal text-purple-300 font-mono">{(h.weightPercent ?? 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
