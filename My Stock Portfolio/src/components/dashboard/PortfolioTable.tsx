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
  activeReturn: number;
  activeReturnPercent: number;
  nextReturn: number;
  nextReturnPercent: number;
}

type SortKey = 
  | 'symbol' 
  | 'quantity' 
  | 'avgCost'
  | 'lastPrice' 
  | 'totalCost' 
  | 'currentValue' 
  | 'totalReturn' 
  | 'totalReturnPercent' 
  | 'activeReturn' 
  | 'activeReturnPercent' 
  | 'nextReturn' 
  | 'nextReturnPercent' 
  | 'weightPercent';
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

// Returns the timeframe that is exactly 1 step larger on the ladder
const getNextStepRange = (range: HoldingTimeRange): HoldingTimeRange => {
  switch (range) {
    case '1D': return '1W';
    case '1W': return '1M';
    case '1M': return '3M';
    case '3M': return 'YTD';
    case 'YTD': return '1Y';
    case '1Y': return 'ALL';
    case 'ALL': return '1M';
    case 'CUSTOM': return '1M';
    default: return '1W';
  }
};

const getRangeLabel = (range: HoldingTimeRange): string => {
  switch (range) {
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

  const activeRangeLabel = useMemo(() => getRangeLabel(timeRange), [timeRange]);
  const nextRange = useMemo(() => getNextStepRange(timeRange), [timeRange]);
  const nextRangeLabel = useMemo(() => getRangeLabel(nextRange), [nextRange]);

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

  // Helper to compute return and return percent for any specific range
  const computeReturnForRange = (
    h: Holding, 
    range: HoldingTimeRange, 
    customDate?: string
  ): { returnVal: number; returnPercent: number } => {
    if (range === '1D') {
      return {
        returnVal: h.dayReturn || 0,
        returnPercent: h.dayChangePercent || 0,
      };
    }
    if (range === 'ALL') {
      return {
        returnVal: h.totalReturn || 0,
        returnPercent: h.totalReturnPercent || 0,
      };
    }

    const symHistory = historical[h.symbol] || [];
    const targetStartDate = getStartDateForRange(range, customDate);
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
      basePrice = h.avgCost || h.lastPrice;
    }

    const diff = h.lastPrice - basePrice;
    const returnVal = h.quantity * diff;
    const returnPercent = basePrice > 0 ? (diff / basePrice) * 100 : 0;
    return { returnVal, returnPercent };
  };

  // Compute active range return and next step comparison return for each holding
  const processedHoldings = useMemo<HoldingWithPeriod[]>(() => {
    return holdings.map(h => {
      const activeData = computeReturnForRange(h, timeRange, customFrom);
      const nextData = computeReturnForRange(h, nextRange);

      return {
        ...h,
        periodReturn: activeData.returnVal,
        periodReturnPercent: activeData.returnPercent,
        activeReturn: activeData.returnVal,
        activeReturnPercent: activeData.returnPercent,
        nextReturn: nextData.returnVal,
        nextReturnPercent: nextData.returnPercent,
      };
    });
  }, [holdings, historical, timeRange, nextRange, customFrom]);

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

  const totalActiveReturn = useMemo(() => {
    return processedHoldings.reduce((sum, h) => sum + (h.activeReturn || 0), 0);
  }, [processedHoldings]);

  const totalActiveReturnPercent = useMemo(() => {
    const baseVal = totalSecuritiesValue - totalActiveReturn;
    return baseVal > 0 ? (totalActiveReturn / baseVal) * 100 : 0;
  }, [totalSecuritiesValue, totalActiveReturn]);

  const totalNextReturn = useMemo(() => {
    return processedHoldings.reduce((sum, h) => sum + (h.nextReturn || 0), 0);
  }, [processedHoldings]);

  const totalNextReturnPercent = useMemo(() => {
    const baseVal = totalSecuritiesValue - totalNextReturn;
    return baseVal > 0 ? (totalNextReturn / baseVal) * 100 : 0;
  }, [totalSecuritiesValue, totalNextReturn]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' 
        ? <ArrowUpRight className="w-3.5 h-3.5 inline text-[#823AFD]" /> 
        : <ArrowDownRight className="w-3.5 h-3.5 inline text-[#FC2D79]" />;
    }
    return <ArrowUpDown className="w-3 h-3 inline opacity-30 group-hover:opacity-100 text-[#CBD5E1]" />;
  };

  const renderTH = (label: string, key: SortKey, align: 'left' | 'right' = 'right', extraClass?: string) => (
    <th 
      className={clsx(
        "px-3 py-3 text-[13px] font-bold uppercase tracking-wider cursor-pointer group hover:text-white transition-colors select-none text-slate-300", 
        align === 'right' ? 'text-right' : 'text-left',
        extraClass
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
              totalActiveReturn >= 0 
                ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/20" 
                : "text-rose-400 bg-rose-400/10 border-rose-500/20"
            )}>
              {activeRangeLabel}: {totalActiveReturn >= 0 ? '+' : ''}{formatCurrency(totalActiveReturn, true)} ({totalActiveReturn >= 0 ? '+' : ''}{totalActiveReturnPercent.toFixed(2)}%)
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

      {/* Flat Single-Line 4-Section Professional Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#161926] border-b border-[#2A2E45]">
            <tr>
              {/* Section 1: Investor's Cost Basis (Left Aligned) */}
              {renderTH('Symbol', 'symbol', 'left')}
              {renderTH('Shares', 'quantity', 'left')}
              {renderTH('Avg Cost', 'avgCost', 'left')}
              {renderTH('Total Cost', 'totalCost', 'left', 'border-r border-[#2A2E45]/70')}

              {/* Section 2: Current Valuation & Total P/L (Right Aligned) */}
              {renderTH('Value', 'currentValue', 'right')}
              {renderTH('Total P/L', 'totalReturn', 'right')}
              {renderTH('Total %', 'totalReturnPercent', 'right', 'border-r border-[#2A2E45]/70')}

              {/* Section 3 (Amber Box): Active Focus Dynamic Range (Soft Warm Amber Highlight) */}
              {renderTH('Price', 'lastPrice', 'right', 'bg-amber-400/[0.12] text-amber-300 font-black border-l border-amber-500/30')}
              {renderTH(`${activeRangeLabel} Return`, 'activeReturn', 'right', 'bg-amber-400/[0.12] text-amber-300 font-black')}
              {renderTH(`${activeRangeLabel} %`, 'activeReturnPercent', 'right', 'bg-amber-400/[0.12] text-amber-300 font-black border-r border-[#2A2E45]/70')}

              {/* Section 4 (Green Box): Next-Step Ladder Benchmark & Weight */}
              {renderTH(`${nextRangeLabel} Return`, 'nextReturn', 'right')}
              {renderTH(`${nextRangeLabel} %`, 'nextReturnPercent', 'right')}
              {renderTH('Weight', 'weightPercent', 'right')}
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-[#2A2E45]/80">
            {sortedHoldings.map((h) => {
              const isProfit = h.totalReturn >= 0;
              const isActiveProfit = (h.activeReturn || 0) >= 0;
              const isNextProfit = (h.nextReturn || 0) >= 0;

              return (
                <tr 
                  key={h.symbol} 
                  onClick={() => setSelectedStock(h.symbol)}
                  className="hover:bg-[#1A1D2D]/90 cursor-pointer transition-all duration-150 group h-12"
                  title={`Click to inspect ${h.symbol}`}
                >
                  {/* === Section 1: Cost Basis (Left Aligned) === */}
                  {/* Column 1: Symbol */}
                  <td className="px-3 py-3 text-left whitespace-nowrap">
                    <span className="font-black text-white text-base tracking-tight font-heading group-hover:text-[#823AFD] transition-colors">
                      {h.symbol}
                    </span>
                  </td>

                  {/* Column 2: Shares */}
                  <td className="px-3 py-3 text-left whitespace-nowrap">
                    <span className="font-semibold text-slate-300 text-[14px] tabular-nums font-heading">
                      {Number(h.quantity).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Column 3: Avg Cost */}
                  <td className="px-3 py-3 text-left whitespace-nowrap">
                    <span className="font-semibold text-slate-300 text-[14px] tabular-nums font-heading">
                      {formatClean(h.avgCost)}
                    </span>
                  </td>

                  {/* Column 4: Total Cost + Subtle Border Divider */}
                  <td className="px-3 py-3 text-left whitespace-nowrap border-r border-[#2A2E45]/70">
                    <span className="font-semibold text-slate-300 text-[14px] tabular-nums font-heading">
                      {formatClean(h.totalCost)}
                    </span>
                  </td>

                  {/* === Section 2: Current Valuation & All-Time Return === */}
                  {/* Column 5: Current Value */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <span className="font-black text-white text-[14px] tabular-nums font-heading">
                      {formatClean(h.currentValue)}
                    </span>
                  </td>

                  {/* Column 6: Total P/L (Amount) */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <span className={clsx(
                      "font-bold text-[14px] tabular-nums font-heading",
                      isProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isProfit ? '+' : '-'}{formatClean(h.totalReturn)}
                    </span>
                  </td>

                  {/* Column 7: Total P/L % + Subtle Border Divider */}
                  <td className="px-3 py-3 text-right whitespace-nowrap border-r border-[#2A2E45]/70">
                    <span className={clsx(
                      "font-bold text-[14px] tabular-nums font-heading",
                      isProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isProfit ? '+' : ''}{h.totalReturnPercent.toFixed(2)}%
                    </span>
                  </td>

                  {/* === Section 3: Active Focus Dynamic Range (Distinct BG Highlight) === */}
                  {/* Column 8: Current Market Price (Moved to 1D section) */}
                  <td className="px-3 py-3 text-right whitespace-nowrap bg-amber-400/[0.08] group-hover:bg-amber-400/[0.14] transition-colors border-l border-amber-500/20">
                    <span className="font-bold text-white text-[14px] tabular-nums font-heading">
                      {formatClean(h.lastPrice)}
                    </span>
                  </td>

                  {/* Column 9: Active Range Return (Amount) */}
                  <td className="px-3 py-3 text-right whitespace-nowrap bg-amber-400/[0.08] group-hover:bg-amber-400/[0.14] transition-colors">
                    <span className={clsx(
                      "font-bold text-[14px] tabular-nums font-heading",
                      isActiveProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isActiveProfit ? '+' : '-'}{formatClean(h.activeReturn)}
                    </span>
                  </td>

                  {/* Column 10: Active Range % */}
                  <td className="px-3 py-3 text-right whitespace-nowrap bg-amber-400/[0.08] group-hover:bg-amber-400/[0.14] transition-colors border-r border-[#2A2E45]/70">
                    <span className={clsx(
                      "font-bold text-[14px] tabular-nums font-heading",
                      isActiveProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isActiveProfit ? '+' : ''}{(h.activeReturnPercent || 0).toFixed(2)}%
                    </span>
                  </td>

                  {/* === Section 4: Next-Step Ladder Benchmark & Weight === */}
                  {/* Column 10: Next Step Return (Amount) */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <span className={clsx(
                      "font-bold text-[14px] tabular-nums font-heading",
                      isNextProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isNextProfit ? '+' : '-'}{formatClean(h.nextReturn)}
                    </span>
                  </td>

                  {/* Column 11: Next Step % */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <span className={clsx(
                      "font-bold text-[14px] tabular-nums font-heading",
                      isNextProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isNextProfit ? '+' : ''}{(h.nextReturnPercent || 0).toFixed(2)}%
                    </span>
                  </td>

                  {/* Column 12: Portfolio Weight % */}
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <span className="font-bold text-slate-200 text-[14px] tabular-nums font-heading">
                      {h.weightPercent.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
            
            {/* Summary Row 1: Stocks Total */}
            <tr className="bg-[#141724] border-t-2 border-[#2A2E45] h-12">
              {/* Section 1 Total */}
              <td className="px-3 py-3 text-left whitespace-nowrap">
                <span className="text-sm font-black text-white font-heading">Stocks Total</span>
                <span className="text-[13px] text-slate-400 font-body ml-1.5">({holdings.length})</span>
              </td>
              <td className="px-3 py-3 text-left text-slate-400 font-heading">-</td>
              <td className="px-3 py-3 text-left text-slate-400 font-heading">-</td>
              <td className="px-3 py-3 text-left whitespace-nowrap border-r border-[#2A2E45]/70">
                <span className="text-[14px] font-semibold text-slate-300 tabular-nums font-heading">
                  {formatClean(totalCostBasis)}
                </span>
              </td>

              {/* Section 2 Total */}
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-[14px] font-black text-white tabular-nums font-heading">
                  {formatClean(totalSecuritiesValue)}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalTotalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalTotalPnl >= 0 ? '+' : '-'}{formatClean(totalTotalPnl)}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap border-r border-[#2A2E45]/70">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalTotalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalTotalPnl >= 0 ? '+' : ''}{totalTotalPnlPercent.toFixed(2)}%
                </span>
              </td>

              {/* Section 3 Total (Highlighted BG) */}
              <td className="px-3 py-3 text-right text-slate-400 font-heading bg-amber-400/[0.10] border-l border-amber-500/25">-</td>
              <td className="px-3 py-3 text-right whitespace-nowrap bg-amber-400/[0.10]">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalActiveReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalActiveReturn >= 0 ? '+' : '-'}{formatClean(totalActiveReturn)}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap bg-amber-400/[0.10] border-r border-[#2A2E45]/70">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalActiveReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalActiveReturn >= 0 ? '+' : ''}{totalActiveReturnPercent.toFixed(2)}%
                </span>
              </td>

              {/* Section 4 Total */}
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalNextReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalNextReturn >= 0 ? '+' : '-'}{formatClean(totalNextReturn)}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalNextReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalNextReturn >= 0 ? '+' : ''}{totalNextReturnPercent.toFixed(2)}%
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-[14px] font-bold text-slate-200 tabular-nums font-heading">
                  {(totalSecuritiesValue / totalNetWorth * 100).toFixed(2)}%
                </span>
              </td>
            </tr>

            {/* Summary Row 2: Cash Balance */}
            <tr className="bg-[#121420] h-12">
              <td className="px-3 py-3 text-left whitespace-nowrap border-r border-[#2A2E45]/70" colSpan={4}>
                <div className="text-sm font-bold text-white flex items-center gap-2 font-heading">
                  <span>💵 Cash Balance</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[#CBD5E1] font-body">
                    Dime! USD + FCD
                  </span>
                </div>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-[14px] font-extrabold text-white tabular-nums font-heading">
                  {formatClean(cashBalance)}
                </span>
              </td>
              <td className="px-3 py-3 text-right text-sm text-slate-400 font-heading">-</td>
              <td className="px-3 py-3 text-right text-sm text-slate-400 font-heading border-r border-[#2A2E45]/70">-</td>
              <td className="px-3 py-3 text-right text-sm text-slate-400 font-heading bg-amber-400/[0.04] border-l border-amber-500/15">-</td>
              <td className="px-3 py-3 text-right text-sm text-slate-400 font-heading bg-amber-400/[0.04]">-</td>
              <td className="px-3 py-3 text-right text-sm text-slate-400 font-heading bg-amber-400/[0.04] border-r border-[#2A2E45]/70">-</td>
              <td className="px-3 py-3 text-right text-sm text-slate-400 font-heading">-</td>
              <td className="px-3 py-3 text-right text-sm text-slate-400 font-heading">-</td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-[14px] font-bold text-slate-300 tabular-nums font-heading">
                  {(cashBalance / totalNetWorth * 100).toFixed(2)}%
                </span>
              </td>
            </tr>

            {/* Summary Row 3: Total Net Worth Banner */}
            <tr className="bg-gradient-to-r from-[#823AFD]/20 via-[#161926] to-[#FC2D79]/20 border-t-2 border-[#823AFD]/40 shadow-[0_4px_16px_rgba(130,58,253,0.15)] h-14">
              <td className="px-3 py-3 text-left whitespace-nowrap border-r border-[#823AFD]/30" colSpan={4}>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white tracking-tight font-heading">Total Net Worth</span>
                  <span className="text-xs font-semibold text-slate-300 font-body">(Stocks + Cash in {currency})</span>
                </div>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#FC2D79] tabular-nums font-heading">
                  {formatCurrency(totalNetWorth)}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalTotalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalTotalPnl >= 0 ? '+' : '-'}{formatClean(totalTotalPnl)}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap border-r border-[#823AFD]/30">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalTotalPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalTotalPnl >= 0 ? '+' : ''}{totalTotalPnlPercent.toFixed(2)}%
                </span>
              </td>
              <td className="px-3 py-3 text-right text-slate-400 font-heading bg-[#181D33]/70 border-l border-[#823AFD]/20">-</td>
              <td className="px-3 py-3 text-right whitespace-nowrap bg-[#181D33]/70">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalActiveReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalActiveReturn >= 0 ? '+' : '-'}{formatClean(totalActiveReturn)}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap bg-[#181D33]/70 border-r border-[#823AFD]/30">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalActiveReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalActiveReturn >= 0 ? '+' : ''}{totalActiveReturnPercent.toFixed(2)}%
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalNextReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalNextReturn >= 0 ? '+' : '-'}{formatClean(totalNextReturn)}
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className={clsx(
                  "font-bold text-[14px] tabular-nums font-heading",
                  totalNextReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {totalNextReturn >= 0 ? '+' : ''}{totalNextReturnPercent.toFixed(2)}%
                </span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
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
