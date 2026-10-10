import React, { useState, useMemo } from 'react';
import { 
  PortfolioSliceItem, 
  formatCurrencyVal, 
  formatPriceVal 
} from './types';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  Eye, 
  Target, 
  BarChart2, 
  Scale,
  Layers
} from 'lucide-react';
import clsx from 'clsx';

interface MyPortTableViewProps {
  slices: PortfolioSliceItem[];
  exchangeRate: number;
  hoveredSymbol: string | null;
  onHoverSymbol: (symbol: string | null) => void;
  onSelectSymbol: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
  currency: 'USD' | 'THB';
}

type SortField = 'weight' | 'pnl' | 'drift' | 'price' | 'value' | 'symbol' | 'dayChange';

export const MyPortTableView: React.FC<MyPortTableViewProps> = ({
  slices,
  exchangeRate,
  hoveredSymbol,
  onHoverSymbol,
  onSelectSymbol,
  onOpenChart,
  currency,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'winners' | 'losers' | 'overweight' | 'underweight'>('all');
  const [sortField, setSortField] = useState<SortField>('weight');
  const [sortAsc, setSortAsc] = useState(false);

  // Handle column header sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Filter & Sort Logic
  const filteredSlices = useMemo(() => {
    let list = [...slices];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      list = list.filter((s) => (s.symbol || '').toUpperCase().includes(q) || (s.category || '').toUpperCase().includes(q));
    }

    // Quick category filters
    if (filterMode === 'winners') {
      list = list.filter((s) => !s.isCash && s.totalReturnPercent > 0);
    } else if (filterMode === 'losers') {
      list = list.filter((s) => !s.isCash && s.totalReturnPercent < 0);
    } else if (filterMode === 'overweight') {
      list = list.filter((s) => s.targetWeight > 0 && s.drift > 0.5);
    } else if (filterMode === 'underweight') {
      list = list.filter((s) => s.targetWeight > 0 && s.drift < -0.5);
    }

    // Sort
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          comparison = (a.lastPrice || 0) - (b.lastPrice || 0);
          break;
        case 'dayChange':
          comparison = (a.dayReturn || 0) - (b.dayReturn || 0);
          break;
        case 'value':
          comparison = (a.currentValue || 0) - (b.currentValue || 0);
          break;
        case 'pnl':
          comparison = (a.totalReturn || 0) - (b.totalReturn || 0);
          break;
        case 'drift':
          comparison = (a.drift || 0) - (b.drift || 0);
          break;
        case 'weight':
        default:
          comparison = a.actualWeight - b.actualWeight;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return list;
  }, [slices, searchQuery, filterMode, sortField, sortAsc]);

  // Aggregate totals for the sticky footer
  const totals = useMemo(() => {
    const totalHoldingValue = filteredSlices.reduce((sum, s) => sum + (s.currentValue || 0), 0);
    const totalDayReturn = filteredSlices.reduce((sum, s) => sum + (s.dayReturn || 0), 0);
    const totalReturn = filteredSlices.reduce((sum, s) => sum + (s.totalReturn || 0), 0);
    const totalWeight = filteredSlices.reduce((sum, s) => sum + (s.actualWeight || 0), 0);
    const totalCost = filteredSlices.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    
    // Day return percent based on prior value
    const prevValue = totalHoldingValue - totalDayReturn;
    const totalDayChangePercent = prevValue > 0 ? (totalDayReturn / prevValue) * 100 : 0;

    // Total return percent based on total cost
    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

    return {
      totalHoldingValue,
      totalDayReturn,
      totalDayChangePercent,
      totalReturn,
      totalReturnPercent,
      totalWeight,
    };
  }, [filteredSlices]);

  const winnersCount = useMemo(() => slices.filter((s) => !s.isCash && s.totalReturnPercent > 0).length, [slices]);
  const losersCount = useMemo(() => slices.filter((s) => !s.isCash && s.totalReturnPercent < 0).length, [slices]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B1220] border-l border-slate-800/80 select-none overflow-hidden min-h-0">
      {/* Top Filter and Search Bar: Ultra-compact Single Row */}
      <div className="px-3 py-2 border-b border-slate-800/80 bg-[#0D1017] flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Search Box */}
        <div className="relative w-48 sm:w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search asset..."
            className="w-full bg-[#141824] border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1 text-[13px] text-slate-100 placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setFilterMode('all')}
            className={clsx(
              'px-2.5 py-1 rounded-md text-[13px] font-semibold transition-all shrink-0 cursor-pointer',
              filterMode === 'all'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            )}
          >
            All ({slices.length})
          </button>
          <button
            onClick={() => setFilterMode('winners')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-semibold transition-all shrink-0 cursor-pointer',
              filterMode === 'winners'
                ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Winners ({winnersCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('losers')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-semibold transition-all shrink-0 cursor-pointer',
              filterMode === 'losers'
                ? 'bg-rose-600/30 text-rose-200 border border-rose-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            )}
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Drawdowns ({losersCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('overweight')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-semibold transition-all shrink-0 cursor-pointer',
              filterMode === 'overweight'
                ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            )}
          >
            <Scale className="w-3.5 h-3.5 text-blue-400" />
            <span>Overweight</span>
          </button>
          <button
            onClick={() => setFilterMode('underweight')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-semibold transition-all shrink-0 cursor-pointer',
              filterMode === 'underweight'
                ? 'bg-amber-600/30 text-amber-200 border border-amber-500/50 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            )}
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>Underweight</span>
          </button>
        </div>
      </div>

      {/* Main Data Table: Clean High-Contrast Grid with Sticky Total Footer */}
      <div className="flex-1 overflow-auto custom-scrollbar relative flex flex-col">
        <table className="w-full border-collapse text-left text-sm">
          {/* Table Header */}
          <thead className="bg-[#121622] text-slate-300 sticky top-0 z-10 border-b border-slate-800 text-[13px] font-bold">
            <tr>
              <th
                onClick={() => handleSort('symbol')}
                className="py-2.5 px-3.5 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Asset</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('weight')}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Weight / Target</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('price')}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Price</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('dayChange')}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>1 Day Change</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('value')}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Holding Value</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th
                onClick={() => handleSort('pnl')}
                className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Return</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="py-2.5 px-3 text-center">
                <span>Actions</span>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60">
            {filteredSlices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-300 text-sm">
                  {searchQuery ? 'No assets match the search query' : 'No assets found'}
                </td>
              </tr>
            ) : (
              filteredSlices.map((slice) => {
                const isHovered = hoveredSymbol && slice.symbol ? hoveredSymbol.toUpperCase() === slice.symbol.toUpperCase() : false;
                const isProfit = slice.totalReturn >= 0;
                const isDayProfit = slice.dayChangePercent >= 0;

                return (
                  <tr
                    key={slice.symbol}
                    onMouseEnter={() => onHoverSymbol(slice.symbol)}
                    onMouseLeave={() => onHoverSymbol(null)}
                    className={clsx(
                      'transition-all cursor-pointer group',
                      isHovered
                        ? 'bg-[#1C2337] border-l-4 border-l-purple-500 shadow-sm'
                        : 'bg-transparent border-l-4 border-l-transparent hover:bg-slate-800/30'
                    )}
                  >
                    {/* 1. Asset / Symbol & Category Subtitle */}
                    <td className="py-2.5 px-3.5" onClick={() => onSelectSymbol(slice.symbol)}>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: slice.color }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white tracking-wide">
                            {slice.symbol}
                          </span>
                          <span className="text-[13px] text-slate-400 font-medium">
                            {slice.isCash ? 'Cash Cushion' : (slice.category || 'Asset')}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Weight (Actual vs Target + Micro Allocation Bar) */}
                    <td className="py-2.5 px-3 text-right" onClick={() => onSelectSymbol(slice.symbol)}>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-bold text-slate-100 font-mono">
                            {slice.actualWeight.toFixed(1)}%
                          </span>
                          {slice.targetWeight > 0 && (
                            <span className="text-[13px] text-slate-400 font-normal">
                              / {slice.targetWeight.toFixed(1)}%
                            </span>
                          )}
                        </div>

                        {/* M1 Finance Micro Progress Bar & Drift Indicator */}
                        {slice.targetWeight > 0 ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                              <div
                                className={clsx(
                                  'h-full rounded-full transition-all duration-300',
                                  slice.drift > 0.5 
                                    ? 'bg-blue-400' 
                                    : slice.drift < -0.5 
                                    ? 'bg-amber-400' 
                                    : 'bg-emerald-400'
                                )}
                                style={{ width: `${Math.min(100, Math.max(10, (slice.actualWeight / slice.targetWeight) * 50))}%` }}
                              />
                            </div>
                            <span
                              className={clsx(
                                'text-[12px] font-mono font-medium',
                                slice.drift > 0.5 
                                  ? 'text-blue-300' 
                                  : slice.drift < -0.5 
                                  ? 'text-amber-300' 
                                  : 'text-emerald-300'
                              )}
                            >
                              {slice.drift >= 0 ? `+${slice.drift.toFixed(1)}%` : `${slice.drift.toFixed(1)}%`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-slate-500 font-mono mt-0.5">--</span>
                        )}
                      </div>
                    </td>

                    {/* 3. Market Price: Clean Single-line Mono */}
                    <td className="py-2.5 px-3 text-right" onClick={() => onSelectSymbol(slice.symbol)}>
                      {!slice.isCash ? (
                        <span className="text-sm font-bold text-slate-100 font-mono">
                          {formatPriceVal(slice.lastPrice ?? 0, currency, exchangeRate)}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400 font-mono font-normal">--</span>
                      )}
                    </td>

                    {/* 4. 1 Day Change: Single-line Bloomberg Inline */}
                    <td className="py-2.5 px-3 text-right" onClick={() => onSelectSymbol(slice.symbol)}>
                      {!slice.isCash ? (
                        <div className="flex items-center justify-end gap-1.5 font-mono whitespace-nowrap">
                          <span
                            className={clsx(
                              'text-sm font-bold',
                              isDayProfit ? 'text-emerald-400' : 'text-rose-400'
                            )}
                          >
                            {formatCurrencyVal(slice.dayReturn, currency, exchangeRate, true)}
                          </span>
                          <span
                            className={clsx(
                              'text-[13px] font-semibold',
                              isDayProfit ? 'text-emerald-300' : 'text-rose-300'
                            )}
                          >
                            ({isDayProfit ? '+' : ''}{(slice.dayChangePercent ?? 0).toFixed(2)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 font-mono font-normal">--</span>
                      )}
                    </td>

                    {/* 5. Holding Value: Clean Single-line Mono */}
                    <td className="py-2.5 px-3 text-right" onClick={() => onSelectSymbol(slice.symbol)}>
                      <span className="text-sm font-bold text-slate-100 font-mono">
                        {formatCurrencyVal(slice.currentValue, currency, exchangeRate)}
                      </span>
                    </td>

                    {/* 6. Total Return: Single-line Bloomberg Inline */}
                    <td className="py-2.5 px-3 text-right" onClick={() => onSelectSymbol(slice.symbol)}>
                      {!slice.isCash ? (
                        <div className="flex items-center justify-end gap-1.5 font-mono whitespace-nowrap">
                          <span
                            className={clsx(
                              'text-sm font-bold',
                              isProfit ? 'text-emerald-400' : 'text-rose-400'
                            )}
                          >
                            {formatCurrencyVal(slice.totalReturn, currency, exchangeRate, true)}
                          </span>
                          <span
                            className={clsx(
                              'text-[13px] font-semibold',
                              isProfit ? 'text-emerald-300' : 'text-rose-300'
                            )}
                          >
                            ({isProfit ? '+' : ''}{slice.totalReturnPercent.toFixed(2)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 font-mono font-normal">--</span>
                      )}
                    </td>

                    {/* 7. Action Buttons */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSymbol(slice.symbol);
                          }}
                          title="Inspect Details"
                          className="p-1.5 rounded-lg bg-slate-800/90 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/80 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!slice.isCash && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenChart(slice.symbol);
                            }}
                            title="Open Candlestick Chart in X-Chart"
                            className="p-1.5 rounded-lg bg-purple-600/25 text-purple-200 hover:bg-purple-600/50 hover:text-white transition-all border border-purple-500/40 shadow-sm cursor-pointer"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky TOTAL ROW (Footer) */}
          <tfoot className="sticky bottom-0 z-20 bg-[#0F1424] border-t-2 border-purple-500/70 shadow-[0_-8px_24px_rgba(0,0,0,0.7)] text-slate-100">
            <tr>
              {/* Asset Total */}
              <td className="py-3 px-3.5">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    <Layers className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white tracking-wide uppercase">
                      Total
                    </span>
                    <span className="text-[12px] text-slate-400 font-medium">
                      {filteredSlices.length} Slices
                    </span>
                  </div>
                </div>
              </td>

              {/* Weight Total */}
              <td className="py-3 px-3 text-right">
                <span className="text-sm font-black text-purple-300 font-mono">
                  {totals.totalWeight.toFixed(1)}%
                </span>
              </td>

              {/* Price placeholder */}
              <td className="py-3 px-3 text-right">
                <span className="text-sm text-slate-500 font-mono">--</span>
              </td>

              {/* 1 Day Change Total */}
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-1.5 font-mono whitespace-nowrap">
                  <span
                    className={clsx(
                      'text-sm font-black',
                      totals.totalDayReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {formatCurrencyVal(totals.totalDayReturn, currency, exchangeRate, true)}
                  </span>
                  <span
                    className={clsx(
                      'text-[13px] font-bold',
                      totals.totalDayChangePercent >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    )}
                  >
                    ({totals.totalDayChangePercent >= 0 ? '+' : ''}{totals.totalDayChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </td>

              {/* Holding Value Total */}
              <td className="py-3 px-3 text-right">
                <span className="text-sm font-black text-white font-mono tracking-tight">
                  {formatCurrencyVal(totals.totalHoldingValue, currency, exchangeRate)}
                </span>
              </td>

              {/* Total Return Total */}
              <td className="py-3 px-3 text-right">
                <div className="flex items-center justify-end gap-1.5 font-mono whitespace-nowrap">
                  <span
                    className={clsx(
                      'text-sm font-black',
                      totals.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}
                  >
                    {formatCurrencyVal(totals.totalReturn, currency, exchangeRate, true)}
                  </span>
                  <span
                    className={clsx(
                      'text-[13px] font-bold',
                      totals.totalReturnPercent >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    )}
                  >
                    ({totals.totalReturnPercent >= 0 ? '+' : ''}{totals.totalReturnPercent.toFixed(2)}%)
                  </span>
                </div>
              </td>

              {/* Actions placeholder */}
              <td className="py-3 px-3 text-center">
                <span className="text-sm text-slate-500 font-mono">--</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
