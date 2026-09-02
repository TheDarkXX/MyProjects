import React, { useState, useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowUpDown, Calendar, X } from 'lucide-react';
import clsx from 'clsx';
import { Holding } from '../../hooks/useHoldings';
import { usePriceStore } from '../../stores/priceStore';

export type HoldingTimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL' | 'CUSTOM';

interface PortfolioTableProps {
  holdings: Holding[];
  formatCurrency: (val: number, usdOnly?: boolean) => string;
  cashBalance: number;
  totalSecuritiesValue: number;
  totalNetWorth: number;
}

export interface HoldingWithPeriod extends Holding {
  periodReturn: number;
  periodReturnPercent: number;
}

type SortKey = keyof HoldingWithPeriod;
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

const getStartDateForRange = (range: HoldingTimeRange, customStartDate?: string): string => {
  const today = new Date();
  switch (range) {
    case '1D':
      today.setDate(today.getDate() - 1);
      break;
    case '1W':
      today.setDate(today.getDate() - 7);
      break;
    case '1M':
      today.setDate(today.getDate() - 30);
      break;
    case '3M':
      today.setDate(today.getDate() - 90);
      break;
    case 'YTD':
      return `${today.getFullYear()}-01-01`;
    case '1Y':
      today.setFullYear(today.getFullYear() - 1);
      break;
    case 'CUSTOM':
      if (customStartDate) return customStartDate;
      today.setDate(today.getDate() - 30);
      break;
    case 'ALL':
    default:
      return '2020-01-01';
  }
  return today.toISOString().split('T')[0];
};

export const PortfolioTable: React.FC<PortfolioTableProps> = ({
  holdings,
  formatCurrency,
  cashBalance,
  totalSecuritiesValue,
  totalNetWorth
}) => {
  const { historical } = usePriceStore();
  const [timeRange, setTimeRange] = useState<HoldingTimeRange>('1D');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const rangeLabel = useMemo(() => {
    switch (timeRange) {
      case '1D': return '1D';
      case '1W': return '1W';
      case '1M': return '1M';
      case '3M': return '3M';
      case 'YTD': return 'YTD';
      case '1Y': return '1Y';
      case 'ALL': return 'Total';
      case 'CUSTOM': return 'Custom';
      default: return '1D';
    }
  }, [timeRange]);

  // Compute period return for each holding based on selected timeRange
  const processedHoldings = useMemo<HoldingWithPeriod[]>(() => {
    const targetStartDate = getStartDateForRange(timeRange, customFrom);

    return holdings.map(h => {
      if (timeRange === '1D') {
        return {
          ...h,
          periodReturn: h.dayReturn,
          periodReturnPercent: h.dayChangePercent
        };
      }

      if (timeRange === 'ALL') {
        return {
          ...h,
          periodReturn: h.totalReturn,
          periodReturnPercent: h.totalReturnPercent
        };
      }

      // Look up historical price at targetStartDate
      const symHistory = historical[h.symbol] || [];
      let basePrice = 0;

      if (symHistory.length > 0) {
        // Find closest date on or before targetStartDate
        const filtered = symHistory.filter(pt => pt.date <= targetStartDate);
        if (filtered.length > 0) {
          basePrice = filtered[filtered.length - 1].price;
        } else {
          // If all historical points are after targetStartDate, use earliest available point
          basePrice = symHistory[0].price;
        }
      }

      // If no valid historical price, fallback to average cost basis
      if (!basePrice || basePrice <= 0) {
        basePrice = h.avgCost;
      }

      const diff = h.lastPrice - basePrice;
      const periodReturn = h.quantity * diff;
      const periodReturnPercent = basePrice > 0 ? (diff / basePrice) * 100 : 0;

      return {
        ...h,
        periodReturn,
        periodReturnPercent
      };
    });
  }, [holdings, historical, timeRange, customFrom]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedHoldings = useMemo(() => {
    let sortableItems = [...processedHoldings];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? 0;
        const bVal = b[sortConfig.key] ?? 0;
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [processedHoldings, sortConfig]);

  const totalPeriodReturn = useMemo(() => {
    return processedHoldings.reduce((sum, h) => sum + h.periodReturn, 0);
  }, [processedHoldings]);

  const totalPeriodReturnPercent = useMemo(() => {
    const baseValue = totalSecuritiesValue - totalPeriodReturn;
    return baseValue > 0 ? (totalPeriodReturn / baseValue) * 100 : 0;
  }, [totalSecuritiesValue, totalPeriodReturn]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' 
        ? <ArrowUpRight className="w-3.5 h-3.5 inline text-[#823AFD]" /> 
        : <ArrowDownRight className="w-3.5 h-3.5 inline text-[#FC2D79]" />;
    }
    return <ArrowUpDown className="w-3 h-3 inline opacity-30 group-hover:opacity-100 text-[#CBD5E1]" />;
  };

  const renderTH = (label: string, key: SortKey, align: 'left' | 'right' = 'right') => (
    <th 
      className={clsx(
        "px-4 py-3.5 text-sm font-semibold text-[#CBD5E1] uppercase tracking-wider cursor-pointer group hover:text-white transition-colors select-none", 
        align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => requestSort(key)}
    >
      <div className={clsx("flex items-center gap-1", align === 'right' && "justify-end")}>
        <span>{label}</span>
        <SortIcon columnKey={key} />
      </div>
    </th>
  );

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl overflow-hidden mt-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      {/* Holdings Header with Dedicated Pill Buttons */}
      <div className="p-6 border-b border-[#2A2E45] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white tracking-tight">Holdings</h3>
            <span className={clsx(
              "text-xs font-semibold px-2.5 py-1 rounded-full border transition-all tabular-nums",
              totalPeriodReturn >= 0 
                ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/20" 
                : "text-rose-400 bg-rose-400/10 border-rose-500/20"
            )}>
              {rangeLabel}: {totalPeriodReturn >= 0 ? '+' : ''}{formatCurrency(totalPeriodReturn, true)} ({totalPeriodReturn >= 0 ? '+' : ''}{totalPeriodReturnPercent.toFixed(2)}%)
            </span>
          </div>
          <p className="text-sm text-[#CBD5E1] mt-1">Individual asset allocation & performance breakdown</p>
        </div>

        {/* Dedicated Pill Buttons */}
        <div className="flex items-center gap-1.5 bg-[#1A1D2D] p-1.5 rounded-2xl border border-[#2A2E45] self-start md:self-auto">
          {(['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as HoldingTimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={clsx(
                "px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 select-none",
                timeRange === range
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_2px_12px_rgba(130,58,253,0.35)] scale-[1.02]"
                  : "text-[#CBD5E1] hover:text-white hover:bg-white/5"
              )}
            >
              {range}
            </button>
          ))}
          <button
            onClick={() => setShowCustomModal(!showCustomModal)}
            className={clsx(
              "px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-1.5 select-none",
              timeRange === 'CUSTOM'
                ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_2px_12px_rgba(130,58,253,0.35)] scale-[1.02]"
                : "text-[#CBD5E1] hover:text-white hover:bg-white/5"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Custom</span>
          </button>
        </div>
      </div>

      {/* Inline Custom Date Picker for Holdings */}
      {showCustomModal && (
        <div className="bg-[#161926] border-b border-[#2A2E45] px-6 py-4 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-sm font-semibold text-[#CBD5E1]">Holdings Range:</span>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#823AFD]"
            />
            <span className="text-[#CBD5E1] text-sm">to</span>
            <input 
              type="date" 
              value={customTo || new Date().toISOString().split('T')[0]}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#823AFD]"
            />
          </div>
          <button
            onClick={() => {
              if (customFrom) {
                setTimeRange('CUSTOM');
                setShowCustomModal(false);
              }
            }}
            disabled={!customFrom}
            className="px-4 py-1.5 bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white text-xs font-bold rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
          <button
            onClick={() => setShowCustomModal(false)}
            className="p-1.5 text-[#CBD5E1] hover:text-white rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Holdings Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#1A1D2D]">
            <tr>
              {renderTH('Symbol', 'symbol', 'left')}
              {renderTH('Price', 'lastPrice')}
              {renderTH(`${rangeLabel} %`, 'periodReturnPercent')}
              {renderTH(`${rangeLabel} $`, 'periodReturn')}
              {timeRange !== 'ALL' && renderTH('Total %', 'totalReturnPercent')}
              {timeRange !== 'ALL' && renderTH('Total $', 'totalReturn')}
              {renderTH('Qty', 'quantity')}
              {renderTH('Avg Cost', 'avgCost')}
              {renderTH('Total Cost', 'totalCost')}
              {renderTH('Value', 'currentValue')}
              {renderTH('Weight', 'weightPercent')}
            </tr>
          </thead>
          <tbody className="text-base text-[#F1F5F9] divide-y divide-[#2A2E45]">
            {sortedHoldings.map((h) => (
              <tr key={h.symbol} className="hover:bg-[#1A1D2D]/50 transition-colors">
                <td className="px-4 py-3.5 text-left whitespace-nowrap">
                  <div className="font-bold text-white text-base">{h.symbol}</div>
                  <div className="text-xs text-[#CBD5E1] opacity-80">Holding</div>
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap font-medium text-white">
                  {formatCurrency(h.lastPrice, true)}
                </td>
                
                {/* Dynamic Period Return % */}
                <td className={clsx(
                  "px-4 py-3.5 text-right whitespace-nowrap font-bold tabular-nums", 
                  h.periodReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {h.periodReturnPercent >= 0 ? '+' : ''}{h.periodReturnPercent.toFixed(2)}%
                </td>

                {/* Dynamic Period Return $ */}
                <td className={clsx(
                  "px-4 py-3.5 text-right whitespace-nowrap font-bold tabular-nums", 
                  h.periodReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {h.periodReturn >= 0 ? '+' : ''}{formatCurrency(h.periodReturn, true)}
                </td>

                {/* Total Cost-Basis Return (When timeRange is not ALL) */}
                {timeRange !== 'ALL' && (
                  <td className={clsx(
                    "px-4 py-3.5 text-right whitespace-nowrap font-semibold tabular-nums", 
                    h.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {h.totalReturnPercent >= 0 ? '+' : ''}{h.totalReturnPercent.toFixed(2)}%
                  </td>
                )}
                {timeRange !== 'ALL' && (
                  <td className={clsx(
                    "px-4 py-3.5 text-right whitespace-nowrap font-semibold tabular-nums", 
                    h.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {h.totalReturn >= 0 ? '+' : ''}{formatCurrency(h.totalReturn, true)}
                  </td>
                )}

                <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums text-[#CBD5E1]">{h.quantity}</td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums text-[#CBD5E1]">{formatCurrency(h.avgCost, true)}</td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums text-[#CBD5E1]">{formatCurrency(h.totalCost, true)}</td>
                <td className="px-4 py-3.5 text-right font-bold text-white whitespace-nowrap tabular-nums">{formatCurrency(h.currentValue, true)}</td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums font-semibold text-[#CBD5E1]">{h.weightPercent.toFixed(2)}%</td>
              </tr>
            ))}
            
            {/* Summary Rows */}
            <tr className="bg-black/25 border-t-2 border-[#2A2E45]">
              <td colSpan={2} className="px-4 py-3.5 text-base font-bold text-white text-left">Stocks Total</td>
              <td className={clsx("px-4 py-3.5 text-base font-bold text-right tabular-nums", totalPeriodReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {totalPeriodReturnPercent >= 0 ? '+' : ''}{totalPeriodReturnPercent.toFixed(2)}%
              </td>
              <td className={clsx("px-4 py-3.5 text-base font-bold text-right tabular-nums", totalPeriodReturn >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {totalPeriodReturn >= 0 ? '+' : ''}{formatCurrency(totalPeriodReturn, true)}
              </td>
              {timeRange !== 'ALL' && (
                <>
                  <td className={clsx(
                    "px-4 py-3.5 text-base font-bold text-right tabular-nums",
                    (totalSecuritiesValue - holdings.reduce((sum, h) => sum + h.totalCost, 0)) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {(((totalSecuritiesValue - holdings.reduce((sum, h) => sum + h.totalCost, 0)) / holdings.reduce((sum, h) => sum + h.totalCost, 0)) * 100).toFixed(2)}%
                  </td>
                  <td className={clsx(
                    "px-4 py-3.5 text-base font-bold text-right tabular-nums",
                    (totalSecuritiesValue - holdings.reduce((sum, h) => sum + h.totalCost, 0)) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  )}>
                    {formatCurrency(totalSecuritiesValue - holdings.reduce((sum, h) => sum + h.totalCost, 0), true)}
                  </td>
                </>
              )}
              <td className="px-4 py-3.5 text-base font-bold text-white text-right tabular-nums">-</td>
              <td className="px-4 py-3.5 text-base font-bold text-white text-right tabular-nums">-</td>
              <td className="px-4 py-3.5 text-base font-bold text-white text-right tabular-nums">{formatCurrency(holdings.reduce((sum, h) => sum + h.totalCost, 0), true)}</td>
              <td className="px-4 py-3.5 text-base font-bold text-white text-right tabular-nums">{formatCurrency(totalSecuritiesValue, true)}</td>
              <td className="px-4 py-3.5 text-base font-bold text-white text-right tabular-nums">{(totalSecuritiesValue / totalNetWorth * 100).toFixed(2)}%</td>
            </tr>

            <tr className="bg-black/25">
              <td colSpan={timeRange !== 'ALL' ? 9 : 7} className="px-4 py-3.5 text-base font-semibold text-[#CBD5E1] text-right">Cash Balance</td>
              <td className="px-4 py-3.5 text-base font-bold text-white text-right tabular-nums">-</td>
              <td className="px-4 py-3.5 text-base font-bold text-white text-right tabular-nums">{formatCurrency(cashBalance, true)}</td>
              <td className="px-4 py-3.5 text-base font-semibold text-[#CBD5E1] text-right tabular-nums">{(cashBalance / totalNetWorth * 100).toFixed(2)}%</td>
            </tr>

            <tr className="bg-gradient-to-r from-[#823AFD]/10 to-[#FC2D79]/10 border-t-2 border-[#823AFD]/30 shadow-[0_2px_8px_rgba(130,58,253,0.15)]">
              <td colSpan={timeRange !== 'ALL' ? 9 : 7} className="px-4 py-4 text-lg font-bold text-white text-right">Total Net Worth</td>
              <td className="px-4 py-4 text-lg font-bold text-white text-right tabular-nums">-</td>
              <td className="px-4 py-4 text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#FC2D79] text-right tabular-nums">
                {formatCurrency(totalNetWorth, true)}
              </td>
              <td className="px-4 py-4 text-lg font-bold text-white text-right tabular-nums">100.00%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
