import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import { Holding } from '../../hooks/useHoldings';

interface PortfolioTableProps {
  holdings: Holding[];
  formatCurrency: (val: number, usdOnly?: boolean) => string;
  cashBalance: number;
  totalSecuritiesValue: number;
  totalNetWorth: number;
}

type SortConfig = { key: keyof Holding; direction: 'asc' | 'desc' } | null;

export const PortfolioTable: React.FC<PortfolioTableProps> = ({
  holdings,
  formatCurrency,
  cashBalance,
  totalSecuritiesValue,
  totalNetWorth
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const requestSort = (key: keyof Holding) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedHoldings = React.useMemo(() => {
    let sortableItems = [...holdings];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [holdings, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: keyof Holding }) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />;
    }
    return <ArrowUpDown className="w-3 h-3 inline opacity-30 group-hover:opacity-100" />;
  };

  const renderTH = (label: string, key: keyof Holding, align: 'left' | 'right' = 'right') => (
    <th 
      className={clsx("px-4 py-3 text-xs font-medium text-[#9898C8] uppercase tracking-wider cursor-pointer group hover:text-white transition-colors", align === 'right' ? 'text-right' : 'text-left')}
      onClick={() => requestSort(key)}
    >
      <div className={clsx("flex items-center gap-1", align === 'right' && "justify-end")}>
        {label}
        <SortIcon columnKey={key} />
      </div>
    </th>
  );

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl overflow-hidden mt-8">
      <div className="p-6 border-b border-[#2A2E45] flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Holdings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#1A1D2D]">
            <tr>
              {renderTH('Symbol', 'symbol', 'left')}
              {renderTH('Price', 'lastPrice')}
              {renderTH('Day %', 'dayChangePercent')}
              {renderTH('Day $', 'dayReturn')}
              {renderTH('Total %', 'totalReturnPercent')}
              {renderTH('Total $', 'totalReturn')}
              {renderTH('Qty', 'quantity')}
              {renderTH('Avg Cost', 'avgCost')}
              {renderTH('Total Cost', 'totalCost')}
              {renderTH('Value', 'currentValue')}
              {renderTH('Weight', 'weightPercent')}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2E45]">
            {sortedHoldings.map((h) => (
              <tr key={h.symbol} className="hover:bg-[#1A1D2D]/50 transition-colors">
                <td className="px-4 py-3 text-sm font-bold text-white whitespace-nowrap">{h.symbol}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-300 whitespace-nowrap">{formatCurrency(h.lastPrice, true)}</td>
                <td className={clsx("px-4 py-3 text-sm text-right whitespace-nowrap", h.dayChangePercent >= 0 ? 'text-[#FC2D79]' : 'text-[#823AFD]')}>
                  {h.dayChangePercent >= 0 ? '+' : ''}{h.dayChangePercent.toFixed(2)}%
                </td>
                <td className={clsx("px-4 py-3 text-sm text-right whitespace-nowrap", h.dayReturn >= 0 ? 'text-[#FC2D79]' : 'text-[#823AFD]')}>
                  {h.dayReturn >= 0 ? '+' : ''}{formatCurrency(h.dayReturn, true)}
                </td>
                <td className={clsx("px-4 py-3 text-sm text-right whitespace-nowrap", h.totalReturnPercent >= 0 ? 'text-[#FC2D79]' : 'text-[#823AFD]')}>
                  {h.totalReturnPercent >= 0 ? '+' : ''}{h.totalReturnPercent.toFixed(2)}%
                </td>
                <td className={clsx("px-4 py-3 text-sm text-right whitespace-nowrap", h.totalReturn >= 0 ? 'text-[#FC2D79]' : 'text-[#823AFD]')}>
                  {h.totalReturn >= 0 ? '+' : ''}{formatCurrency(h.totalReturn, true)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-white whitespace-nowrap">{h.quantity}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-400 whitespace-nowrap">{formatCurrency(h.avgCost, true)}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-400 whitespace-nowrap">{formatCurrency(h.totalCost, true)}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-white whitespace-nowrap">{formatCurrency(h.currentValue, true)}</td>
                <td className="px-4 py-3 text-sm text-right text-white whitespace-nowrap">{h.weightPercent.toFixed(2)}%</td>
              </tr>
            ))}
            
            {/* Summary Rows */}
            <tr className="bg-[#1A1D2D]/30 border-t-2 border-[#2A2E45]">
              <td colSpan={8} className="px-4 py-3 text-sm font-medium text-[#9898C8] text-right">Stocks Total</td>
              <td className="px-4 py-3 text-sm font-bold text-white text-right">{formatCurrency(holdings.reduce((sum, h) => sum + h.totalCost, 0), true)}</td>
              <td className="px-4 py-3 text-sm font-bold text-white text-right">{formatCurrency(totalSecuritiesValue, true)}</td>
              <td className="px-4 py-3 text-sm font-medium text-white text-right">{(totalSecuritiesValue / totalNetWorth * 100).toFixed(2)}%</td>
            </tr>
            <tr className="bg-[#1A1D2D]/30">
              <td colSpan={8} className="px-4 py-3 text-sm font-medium text-[#9898C8] text-right">Cash Balance</td>
              <td className="px-4 py-3 text-sm font-bold text-white text-right">-</td>
              <td className="px-4 py-3 text-sm font-bold text-white text-right">{formatCurrency(cashBalance, true)}</td>
              <td className="px-4 py-3 text-sm font-medium text-white text-right">{(cashBalance / totalNetWorth * 100).toFixed(2)}%</td>
            </tr>
            <tr className="bg-[#823AFD]/20 border-t-2 border-[#823AFD]">
              <td colSpan={8} className="px-4 py-3 text-base font-bold text-white text-right">Total Portfolio Value</td>
              <td className="px-4 py-3 text-base font-bold text-white text-right">-</td>
              <td className="px-4 py-3 text-base font-bold text-white text-right">{formatCurrency(totalNetWorth, true)}</td>
              <td className="px-4 py-3 text-base font-bold text-white text-right">100.00%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
