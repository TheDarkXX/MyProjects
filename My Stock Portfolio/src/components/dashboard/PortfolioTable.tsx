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

type SortKey = 'symbol' | 'lastPrice' | 'currentValue' | 'totalReturn' | 'periodReturn' | 'weightPercent';
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

  const renderTH = (label: string, sublabel: string, key: SortKey, align: 'left' | 'right' = 'right') => (
    <th 
      className={clsx(
        "px-5 py-4 text-sm font-semibold uppercase tracking-wider cursor-pointer group hover:text-white transition-colors select-none", 
        align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => requestSort(key)}
    >
      <div className={clsx("flex flex-col", align === 'right' ? "items-end" : "items-start")}>
        <div className="flex items-center gap-1 text-white font-bold">
          <span>{label}</span>
          <SortIcon columnKey={key} />
        </div>
        <span className="text-[11px] font-normal text-[#94A3B8] normal-case tracking-normal">{sublabel}</span>
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

      {/* 5-Column Streamlined Top-App Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#161926] border-b border-[#2A2E45]">
            <tr>
              {renderTH('Asset', 'Symbol & Shares', 'symbol', 'left')}
              {renderTH('Portfolio Value', 'Value & Cost', 'currentValue')}
              {renderTH('Total Profit / Loss', 'Overall Return', 'totalReturn')}
              {renderTH(`${rangeLabel} Return`, 'Period Return', 'periodReturn')}
              {renderTH('Portfolio Weight', 'Allocation %', 'weightPercent')}
            </tr>
          </thead>
          <tbody className="text-base divide-y divide-[#2A2E45]/80">
            {sortedHoldings.map((h) => {
              const isProfit = h.totalReturn >= 0;
              const isPeriodProfit = h.periodReturn >= 0;

              return (
                <tr 
                  key={h.symbol} 
                  onClick={() => setSelectedStock(h.symbol)}
                  className="hover:bg-[#1A1D2D]/90 cursor-pointer transition-all duration-150 group"
                  title={`Click to inspect ${h.symbol}`}
                >
                  {/* Column 1: Asset (Symbol + Clean Shares + Current Price) */}
                  <td className="px-6 py-4 text-left whitespace-nowrap">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E2235] to-[#121420] border border-[#2A2E45] flex items-center justify-center font-black text-white text-sm shadow-sm group-hover:border-[#823AFD]/60 transition-colors font-heading">
                        {h.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="font-extrabold text-white text-base tracking-tight font-heading group-hover:text-[#823AFD] transition-colors">
                          {h.symbol}
                        </div>
                        <div className="text-xs font-medium text-[#CBD5E1] tabular-nums mt-0.5 font-body">
                          <span className="text-white font-semibold font-heading">
                            {Number(h.quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </span>
                          {' '}shares{' '}
                          <span className="text-[#94A3B8]">•</span>
                          {' '}
                          <span className="text-white font-semibold font-heading">
                            {formatCurrency(h.lastPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: Current Value vs Total Cost */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="font-black text-white text-base tabular-nums font-heading">
                      {formatCurrency(h.currentValue)}
                    </div>
                    <div className="text-xs font-medium text-[#CBD5E1] tabular-nums mt-0.5 font-body">
                      Cost: <span className="text-slate-300 font-semibold font-heading">{formatCurrency(h.totalCost)}</span>
                    </div>
                  </td>

                  {/* Column 3: Total Profit / Loss (Clean, Elegant, High-Contrast) */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className={clsx(
                      "font-extrabold text-base tabular-nums flex items-center justify-end gap-1 font-heading",
                      isProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isProfit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span>{isProfit ? '+' : ''}{formatCurrency(h.totalReturn)}</span>
                    </div>
                    <div className={clsx(
                      "text-xs font-bold tabular-nums mt-0.5 font-heading",
                      isProfit ? "text-emerald-400/90" : "text-rose-400/90"
                    )}>
                      {isProfit ? '+' : ''}{h.totalReturnPercent.toFixed(2)}%
                    </div>
                  </td>

                  {/* Column 4: Dynamic Period Return ({rangeLabel}) */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className={clsx(
                      "font-extrabold text-base tabular-nums flex items-center justify-end gap-1 font-heading",
                      isPeriodProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isPeriodProfit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span>{isPeriodProfit ? '+' : ''}{formatCurrency(h.periodReturn)}</span>
                    </div>
                    <div className={clsx(
                      "text-xs font-bold tabular-nums mt-0.5 font-heading",
                      isPeriodProfit ? "text-emerald-400/90" : "text-rose-400/90"
                    )}>
                      {isPeriodProfit ? '+' : ''}{h.periodReturnPercent.toFixed(2)}%
                    </div>
                  </td>

                  {/* Column 5: Weight % with sleek glowing progress bar */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="font-extrabold text-white text-base tabular-nums font-heading">
                      {h.weightPercent.toFixed(2)}%
                    </div>
                    <div className="w-20 ml-auto mt-1.5 bg-[#1A1D2D] rounded-full h-1.5 overflow-hidden border border-[#2A2E45]">
                      <div 
                        className="bg-gradient-to-r from-[#823AFD] to-[#FC2D79] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(h.weightPercent * 2.2, 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {/* Summary Row 1: Stocks Total */}
            <tr className="bg-[#141724] border-t-2 border-[#2A2E45]">
              <td className="px-6 py-4 text-left">
                <div className="text-base font-black text-white font-heading">Stocks Total</div>
                <div className="text-xs font-semibold text-[#CBD5E1] font-body">{holdings.length} Active Positions</div>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="text-base font-black text-white tabular-nums font-heading">
                  {formatCurrency(totalSecuritiesValue)}
                </div>
                <div className="text-xs font-medium text-[#CBD5E1] tabular-nums mt-0.5 font-body">
                  Cost: <span className="text-slate-300 font-semibold font-heading">{formatCurrency(totalCostBasis)}</span>
                </div>
              </td>
              {/* Total P/L Summary */}
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className={clsx(
                  "font-extrabold text-base tabular-nums flex items-center justify-end gap-1 font-heading",
                  totalTotalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalTotalPnl >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>{totalTotalPnl >= 0 ? '+' : ''}{formatCurrency(totalTotalPnl)}</span>
                </div>
                <div className={clsx(
                  "text-xs font-bold tabular-nums mt-0.5 font-heading",
                  totalTotalPnl >= 0 ? "text-emerald-400/90" : "text-rose-400/90"
                )}>
                  {totalTotalPnl >= 0 ? '+' : ''}{totalTotalPnlPercent.toFixed(2)}%
                </div>
              </td>
              {/* Period Return Summary */}
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className={clsx(
                  "font-extrabold text-base tabular-nums flex items-center justify-end gap-1 font-heading",
                  totalPeriodReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalPeriodReturn >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>{totalPeriodReturn >= 0 ? '+' : ''}{formatCurrency(totalPeriodReturn)}</span>
                </div>
                <div className={clsx(
                  "text-xs font-bold tabular-nums mt-0.5 font-heading",
                  totalPeriodReturn >= 0 ? "text-emerald-400/90" : "text-rose-400/90"
                )}>
                  {totalPeriodReturn >= 0 ? '+' : ''}{totalPeriodReturnPercent.toFixed(2)}%
                </div>
              </td>
              {/* Weight Summary */}
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="text-base font-black text-white tabular-nums font-heading">
                  {(totalSecuritiesValue / totalNetWorth * 100).toFixed(2)}%
                </div>
                <div className="text-xs font-medium text-[#CBD5E1] font-body">of Portfolio</div>
              </td>
            </tr>

            {/* Summary Row 2: Cash Balance */}
            <tr className="bg-[#121420]">
              <td className="px-6 py-3.5 text-left">
                <div className="text-sm font-bold text-white flex items-center gap-2 font-heading">
                  <span>💵 Cash Balance</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#CBD5E1] font-body">Dime! USD + FCD</span>
                </div>
              </td>
              <td className="px-6 py-3.5 text-right whitespace-nowrap">
                <div className="text-sm font-extrabold text-white tabular-nums font-heading">
                  {formatCurrency(cashBalance)}
                </div>
              </td>
              <td className="px-6 py-3.5 text-right text-sm text-[#94A3B8] font-heading">-</td>
              <td className="px-6 py-3.5 text-right text-sm text-[#94A3B8] font-heading">-</td>
              <td className="px-6 py-3.5 text-right whitespace-nowrap">
                <div className="text-sm font-bold text-[#CBD5E1] tabular-nums font-heading">
                  {(cashBalance / totalNetWorth * 100).toFixed(2)}%
                </div>
              </td>
            </tr>

            {/* Summary Row 3: Total Net Worth Banner */}
            <tr className="bg-gradient-to-r from-[#823AFD]/20 via-[#161926] to-[#FC2D79]/20 border-t-2 border-[#823AFD]/40 shadow-[0_4px_16px_rgba(130,58,253,0.15)]">
              <td className="px-6 py-4 text-left">
                <div className="text-lg font-black text-white tracking-tight font-heading">Total Net Worth</div>
                <div className="text-xs font-semibold text-[#CBD5E1] font-body">Stocks + Cash</div>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#FC2D79] tabular-nums font-heading">
                  {formatCurrency(totalNetWorth)}
                </div>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className={clsx(
                  "font-extrabold text-base tabular-nums flex items-center justify-end gap-1 font-heading",
                  totalTotalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalTotalPnl >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>{totalTotalPnl >= 0 ? '+' : ''}{formatCurrency(totalTotalPnl)}</span>
                </div>
                <div className={clsx(
                  "text-xs font-bold tabular-nums mt-0.5 font-heading",
                  totalTotalPnl >= 0 ? "text-emerald-400/90" : "text-rose-400/90"
                )}>
                  {totalTotalPnl >= 0 ? '+' : ''}{totalTotalPnlPercent.toFixed(2)}%
                </div>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className={clsx(
                  "font-extrabold text-base tabular-nums flex items-center justify-end gap-1 font-heading",
                  totalPeriodReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalPeriodReturn >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>{totalPeriodReturn >= 0 ? '+' : ''}{formatCurrency(totalPeriodReturn)}</span>
                </div>
                <div className={clsx(
                  "text-xs font-bold tabular-nums mt-0.5 font-heading",
                  totalPeriodReturn >= 0 ? "text-emerald-400/90" : "text-rose-400/90"
                )}>
                  {totalPeriodReturn >= 0 ? '+' : ''}{totalPeriodReturnPercent.toFixed(2)}%
                </div>
              </td>
              <td className="px-6 py-4 text-right whitespace-nowrap">
                <div className="text-lg font-black text-white tabular-nums font-heading">
                  100.00%
                </div>
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
