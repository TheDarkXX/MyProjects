import React, { useState, useMemo } from 'react';
import { useHoldings, Holding } from '../../../hooks/useHoldings';
import { usePriceStore } from '../../../stores/priceStore';
import { usePortfolioStore } from '../../../stores/portfolioStore';
import { Search, TrendingUp, TrendingDown, Briefcase, ChevronRight, ShieldAlert, Award } from 'lucide-react';
import clsx from 'clsx';

interface MyPortWatchlistProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
}

export const MyPortWatchlist: React.FC<MyPortWatchlistProps> = ({
  selectedSymbol,
  onSelectSymbol,
}) => {
  const { holdings, totalPortfolioValue, totalUnrealizedProfit, totalUnrealizedProfitPercent, netInvestedCapital } = useHoldings();
  const { exchangeRate } = usePriceStore();
  const { portfolios, activePortfolioId } = usePortfolioStore();
  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'pnl' | 'weight' | 'symbol'>('weight');

  // Filter and sort holdings
  const filteredHoldings = useMemo(() => {
    let list = holdings.filter((h) => h.quantity > 0 && h.symbol !== 'CASH');

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      list = list.filter((h) => h.symbol.toUpperCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === 'pnl') return b.totalReturnPercent - a.totalReturnPercent;
      if (sortBy === 'symbol') return a.symbol.localeCompare(b.symbol);
      return b.weightPercent - a.weightPercent;
    });

    return list;
  }, [holdings, searchQuery, sortBy]);

  const totalValueTHB = totalPortfolioValue * (exchangeRate || 34.5);
  const totalPnLTHB = totalUnrealizedProfit * (exchangeRate || 34.5);

  return (
    <div className="w-[340px] h-full bg-[#0D1017] border-l border-slate-800/80 flex flex-col select-none shrink-0 overflow-hidden">
      {/* Port Header Summary Banner */}
      <div className="p-3.5 border-b border-slate-800/80 bg-[#121622]/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-200 truncate max-w-[170px]">
                {activePortfolio?.name || 'My Portfolio'}
              </div>
              <div className="text-[13px] text-slate-300">
                {filteredHoldings.length} ตัวที่ถือครอง (Holdings)
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-extrabold text-slate-200">
              ${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[13px] text-slate-300 font-medium">
              ≈ ฿{totalValueTHB.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Unrealized Return Strip */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#181D2D] border border-slate-700/60">
          <span className="text-[13px] text-slate-300 font-medium">กำไร/ขาดทุนรวม (P/L)</span>
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                'text-sm font-bold flex items-center gap-0.5',
                totalUnrealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {totalUnrealizedProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {totalUnrealizedProfit >= 0 ? '+' : ''}
              ${totalUnrealizedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={clsx(
                'text-[13px] font-semibold px-1.5 py-0.5 rounded',
                totalUnrealizedProfitPercent >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              )}
            >
              {totalUnrealizedProfitPercent >= 0 ? '+' : ''}
              {totalUnrealizedProfitPercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="p-2.5 border-b border-slate-800/80 flex flex-col gap-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาหุ้นในพอร์ต (Search)..."
            className="w-full bg-[#161B28] border border-slate-700/70 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Sort Pill Tabs */}
        <div className="flex items-center justify-between gap-1 text-[13px] bg-[#141824] p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setSortBy('weight')}
            className={clsx(
              'flex-1 py-1 rounded text-center transition-colors font-medium',
              sortBy === 'weight' ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/40' : 'text-slate-300 hover:text-white'
            )}
          >
            น้ำหนัก (Weight)
          </button>
          <button
            onClick={() => setSortBy('pnl')}
            className={clsx(
              'flex-1 py-1 rounded text-center transition-colors font-medium',
              sortBy === 'pnl' ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/40' : 'text-slate-300 hover:text-white'
            )}
          >
            กำไร (P/L %)
          </button>
          <button
            onClick={() => setSortBy('symbol')}
            className={clsx(
              'flex-1 py-1 rounded text-center transition-colors font-medium',
              sortBy === 'symbol' ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/40' : 'text-slate-300 hover:text-white'
            )}
          >
            ชื่อ (A-Z)
          </button>
        </div>
      </div>

      {/* Holdings List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
        {filteredHoldings.length === 0 ? (
          <div className="p-8 text-center text-slate-300 text-sm">
            {searchQuery ? 'ไม่พบหุ้นที่ค้นหา' : 'ไม่มีรายการหุ้นที่ถือครองในพอร์ตนี้'}
          </div>
        ) : (
          filteredHoldings.map((h) => {
            const isSelected = h.symbol.toUpperCase() === selectedSymbol.toUpperCase();
            const isProfit = h.totalReturnPercent >= 0;
            const dayProfit = h.dayChangePercent >= 0;

            return (
              <div
                key={h.symbol}
                onClick={() => onSelectSymbol(h.symbol)}
                className={clsx(
                  'p-3 cursor-pointer transition-all flex flex-col gap-1.5 relative border-l-2',
                  isSelected
                    ? 'bg-[#1C2235] border-l-purple-500 shadow-sm'
                    : 'bg-transparent border-l-transparent hover:bg-slate-800/40'
                )}
              >
                {/* Row 1: Symbol, Category & Last Price */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-200 tracking-wide font-heading">
                      {h.symbol}
                    </span>
                    {h.stockType && (
                      <span className="text-[12px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium border border-slate-700/60">
                        {h.stockType}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-200">
                      ${h.lastPrice.toFixed(2)}
                    </span>
                    <span
                      className={clsx(
                        'text-[13px] ml-1.5 font-semibold',
                        dayProfit ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {dayProfit ? '+' : ''}
                      {h.dayChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Row 2: Cost Basis, Quantity & Unrealized P/L */}
                <div className="flex items-center justify-between text-[13px]">
                  <div className="text-slate-300">
                    <span>ทุน: </span>
                    <span className="font-semibold text-slate-200">${h.avgCost.toFixed(2)}</span>
                    <span className="mx-1 text-slate-400">·</span>
                    <span>{h.quantity} หุ้น</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={clsx(
                        'font-extrabold text-sm',
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {isProfit ? '+' : ''}
                      {h.totalReturnPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Row 3: Total Value & Port Weight */}
                <div className="flex items-center justify-between text-[12px] text-slate-300 pt-0.5">
                  <div>
                    มูลค่า: <span className="font-semibold text-slate-200">${h.currentValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>สัดส่วน:</span>
                    <span className="font-bold text-purple-400">{h.weightPercent.toFixed(1)}%</span>
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
