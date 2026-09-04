import React, { useState, useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowUpDown, Calendar, X } from 'lucide-react';
import clsx from 'clsx';
import { Holding } from '../../hooks/useHoldings';
import { usePriceStore } from '../../stores/priceStore';
import { useUiStore } from '../../stores/uiStore';
import { StockDetailDrawer } from '../portfolio/StockDetailDrawer';

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

type SortKey = 'symbol' | 'quantity' | 'lastPrice' | 'totalCost' | 'currentValue' | 'totalReturn' | 'periodReturn' | 'weightPercent';
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
  const { currency, exchangeRate } = useUiStore();
  const [timeRange, setTimeRange] = useState<HoldingTimeRange>('1D');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

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

  // Clean numeric formatter without repeated currency symbols (Bloomberg/TradingView style)
  const formatClean = (usdVal: number, decimals: number = 2) => {
    if (usdVal === undefined || usdVal === null || isNaN(usdVal)) return '0.00';
    const isThb = currency === 'THB';
    const rate = isThb ? (exchangeRate || 35.0) : 1;
    const finalVal = usdVal * rate;
    const absVal = Math.abs(finalVal);
    return absVal.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

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

      const symHistory = historical[h.symbol] || [];
      let basePrice = 0;

      if (symHistory.length > 0) {
        const filtered = symHistory.filter(pt => pt.date <= targetStartDate);
        if (filtered.length > 0) {
          basePrice = filtered[filtered.length - 1].price;
        } else {
          basePrice = symHistory[0].price;
        }
      }

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
        let aVal = a[sortConfig.key] ?? 0;
        let bVal = b[sortConfig.key] ?? 0;
        if (typeof aVal === 'string') {
          return sortConfig.direction === 'asc' 
            ? (aVal as string).localeCompare(bVal as string) 
            : (bVal as string).localeCompare(aVal as string);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [processedHoldings, sortConfig]);

  const totalCostBasis = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.totalCost, 0);
  }, [holdings]);

  const totalTotalPnl = useMemo(() => {
    return totalSecuritiesValue - totalCostBasis;
  }, [totalSecuritiesValue, totalCostBasis]);

  const totalTotalPnlPercent = useMemo(() => {
    return totalCostBasis > 0 ? (totalTotalPnl / totalCostBasis) * 100 : 0;
  }, [totalTotalPnl, totalCostBasis]);

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
        "px-4 py-3 text-[13px] font-bold uppercase tracking-wider cursor-pointer group hover:text-white transition-colors select-none text-slate-300", 
        align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => requestSort(key)}
    >
      <div className={clsx("inline-flex items-center gap-1.5", align === 'right' ? "justify-end" : "justify-start")}>
        <span>{label}</span>
        <SortIcon columnKey={key} />
      </div>
    </th>
  );

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl overflow-hidden mt-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      {/* Holdings Header with Pill Buttons */}
      <div className="p-6 border-b border-[#2A2E45] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white tracking-tight">Holdings</h3>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-[#1A1D2D] border border-[#2A2E45] text-slate-300 font-heading">
              Values in {currency}
            </span>
            <span className={clsx(
              "text-xs font-semibold px-2.5 py-1 rounded-full border transition-all tabular-nums",
              totalPeriodReturn >= 0 
                ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/20" 
                : "text-rose-400 bg-rose-400/10 border-rose-500/20"
            )}>
              {rangeLabel}: {totalPeriodReturn >= 0 ? '+' : ''}{formatCurrency(totalPeriodReturn, true)} ({totalPeriodReturn >= 0 ? '+' : ''}{totalPeriodReturnPercent.toFixed(2)}%)
            </span>
          </div>
          <p className="text-sm text-[#CBD5E1] mt-1">
            คลิกดู <span className="font-semibold text-white">ต้นทุนจริง</span> เทียบ <span className="font-semibold text-white">มูลค่าปัจจุบัน</span> และ <span className="font-semibold text-emerald-400">กำไรสุทธิ</span> แว้บเดียวจบ
          </p>
        </div>

        {/* Dedicated Pill Buttons */}
        <div className="flex items-center gap-1.5 bg-[#1A1D2D] p-1.5 rounded-2xl border border-[#2A2E45] self-start md:self-auto shadow-inner">
          {(['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as HoldingTimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={clsx(
                "px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 select-none",
                timeRange === range
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_2px_12px_rgba(130,58,253,0.4)] scale-[1.02]"
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
                ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_2px_12px_rgba(130,58,253,0.4)] scale-[1.02]"
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

      {/* Flat Single-Line Professional Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#161926] border-b border-[#2A2E45]">
            <tr>
              {renderTH('Symbol', 'symbol', 'left')}
              {renderTH('Shares', 'quantity')}
              {renderTH('Price', 'lastPrice')}
              {renderTH('Total Cost', 'totalCost')}
              {renderTH('Value', 'currentValue')}
              {renderTH('Total P/L', 'totalReturn')}
              {renderTH(`${rangeLabel} Return`, 'periodReturn')}
              {renderTH('Weight', 'weightPercent')}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-[#2A2E45]/80">
            {sortedHoldings.map((h) => {
              const isProfit = h.totalReturn >= 0;
              const isPeriodProfit = h.periodReturn >= 0;

              return (
                <tr 
                  key={h.symbol} 
                  onClick={() => setSelectedStock(h.symbol)}
                  className="hover:bg-[#1A1D2D]/90 cursor-pointer transition-all duration-150 group h-12"
                  title={`Click to inspect ${h.symbol}`}
                >
                  {/* Column 1: Symbol (Clean, High Contrast, Bold, No Box) */}
                  <td className="px-4 py-3 text-left whitespace-nowrap">
                    <span className="font-black text-white text-base tracking-tight font-heading group-hover:text-[#823AFD] transition-colors">
                      {h.symbol}
                    </span>
                  </td>

                  {/* Column 2: Shares */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-semibold text-slate-300 text-[14px] tabular-nums font-heading">
                      {Number(h.quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Column 3: Price */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-bold text-white text-[14px] tabular-nums font-heading">
                      {formatClean(h.lastPrice)}
                    </span>
                  </td>

                  {/* Column 4: Total Cost */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-semibold text-slate-300 text-[14px] tabular-nums font-heading">
                      {formatClean(h.totalCost)}
                    </span>
                  </td>

                  {/* Column 5: Current Value */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-black text-white text-[14px] tabular-nums font-heading">
                      {formatClean(h.currentValue)}
                    </span>
                  </td>

                  {/* Column 6: Total P/L (Single line: Amount + %) */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className={clsx(
                      "font-bold text-[14px] tabular-nums inline-flex items-center gap-1 font-heading",
                      isProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isProfit ? '+' : '-'}{formatClean(h.totalReturn)}
                      <span className="text-[13px] font-semibold opacity-90">
                        ({isProfit ? '+' : ''}{h.totalReturnPercent.toFixed(2)}%)
                      </span>
                    </span>
                  </td>

                  {/* Column 7: Period Return (Single line: Amount + %) */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className={clsx(
                      "font-bold text-[14px] tabular-nums inline-flex items-center gap-1 font-heading",
                      isPeriodProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isPeriodProfit ? '+' : '-'}{formatClean(h.periodReturn)}
                      <span className="text-[13px] font-semibold opacity-90">
                        ({isPeriodProfit ? '+' : ''}{h.periodReturnPercent.toFixed(2)}%)
                      </span>
                    </span>
                  </td>

                  {/* Column 8: Portfolio Weight % (Clean, No Progress Bar) */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-bold text-slate-200 text-[14px] tabular-nums font-heading">
                      {h.weightPercent.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
            
            {/* Summary Row 1: Stocks Total */}
            <tr className="bg-[#141724] border-t-2 border-[#2A2E45] h-12">
              <td className="px-4 py-3 text-left whitespace-nowrap">
                <span className="text-sm font-black text-white font-heading">Stocks Total</span>
                <span className="text-[13px] text-slate-400 font-body ml-2">({holdings.length})</span>
              </td>
              <td className="px-4 py-3 text-right text-slate-400 font-heading">-</td>
              <td className="px-4 py-3 text-right text-slate-400 font-heading">-</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="text-[14px] font-semibold text-slate-300 tabular-nums font-heading">
                  {formatClean(totalCostBasis)}
                </span>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="text-[14px] font-black text-white tabular-nums font-heading">
                  {formatClean(totalSecuritiesValue)}
                </span>
              </td>
              {/* Total P/L Summary */}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums inline-flex items-center gap-1 font-heading",
                  totalTotalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalTotalPnl >= 0 ? '+' : '-'}{formatClean(totalTotalPnl)}
                  <span className="text-[13px] font-semibold opacity-90">
                    ({totalTotalPnl >= 0 ? '+' : ''}{totalTotalPnlPercent.toFixed(2)}%)
                  </span>
                </span>
              </td>
              {/* Period Return Summary */}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums inline-flex items-center gap-1 font-heading",
                  totalPeriodReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalPeriodReturn >= 0 ? '+' : '-'}{formatClean(totalPeriodReturn)}
                  <span className="text-[13px] font-semibold opacity-90">
                    ({totalPeriodReturn >= 0 ? '+' : ''}{totalPeriodReturnPercent.toFixed(2)}%)
                  </span>
                </span>
              </td>
              {/* Weight Summary */}
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="text-[14px] font-bold text-slate-200 tabular-nums font-heading">
                  {(totalSecuritiesValue / totalNetWorth * 100).toFixed(2)}%
                </span>
              </td>
            </tr>

            {/* Summary Row 2: Cash Balance */}
            <tr className="bg-[#121420] h-12">
              <td className="px-4 py-3 text-left whitespace-nowrap" colSpan={4}>
                <div className="text-sm font-bold text-white flex items-center gap-2 font-heading">
                  <span>💵 Cash Balance</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#CBD5E1] font-body">
                    Dime! USD + FCD
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="text-[14px] font-extrabold text-white tabular-nums font-heading">
                  {formatClean(cashBalance)}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-sm text-slate-400 font-heading">-</td>
              <td className="px-4 py-3 text-right text-sm text-slate-400 font-heading">-</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="text-[14px] font-bold text-slate-300 tabular-nums font-heading">
                  {(cashBalance / totalNetWorth * 100).toFixed(2)}%
                </span>
              </td>
            </tr>

            {/* Summary Row 3: Total Net Worth Banner */}
            <tr className="bg-gradient-to-r from-[#823AFD]/20 via-[#161926] to-[#FC2D79]/20 border-t-2 border-[#823AFD]/40 shadow-[0_4px_16px_rgba(130,58,253,0.15)] h-14">
              <td className="px-4 py-3 text-left whitespace-nowrap" colSpan={4}>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white tracking-tight font-heading">Total Net Worth</span>
                  <span className="text-xs font-semibold text-slate-300 font-body">(Stocks + Cash in {currency})</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#FC2D79] tabular-nums font-heading">
                  {formatCurrency(totalNetWorth)}
                </span>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums inline-flex items-center gap-1 font-heading",
                  totalTotalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalTotalPnl >= 0 ? '+' : '-'}{formatClean(totalTotalPnl)}
                  <span className="text-[13px] font-semibold opacity-90">
                    ({totalTotalPnl >= 0 ? '+' : ''}{totalTotalPnlPercent.toFixed(2)}%)
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums inline-flex items-center gap-1 font-heading",
                  totalPeriodReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalPeriodReturn >= 0 ? '+' : '-'}{formatClean(totalPeriodReturn)}
                  <span className="text-[13px] font-semibold opacity-90">
                    ({totalPeriodReturn >= 0 ? '+' : ''}{totalPeriodReturnPercent.toFixed(2)}%)
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <span className="text-[14px] font-black text-white tabular-nums font-heading">
                  100.00%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Stock Detail Drawer */}
      <StockDetailDrawer 
        symbol={selectedStock} 
        isOpen={!!selectedStock} 
        onClose={() => setSelectedStock(null)} 
      />
    </div>
  );
};
