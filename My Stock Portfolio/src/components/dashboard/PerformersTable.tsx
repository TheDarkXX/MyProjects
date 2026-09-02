import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import clsx from 'clsx';
import { Holding } from '../../hooks/useHoldings';

interface PerformersTableProps {
  holdings: Holding[];
  formatCurrency: (val: number, usdOnly?: boolean) => string;
}

export const PerformersTable: React.FC<PerformersTableProps> = ({ holdings, formatCurrency }) => {
  // Sort by Total Return %
  const sortedByReturn = [...holdings].sort((a, b) => b.totalReturnPercent - a.totalReturnPercent);
  
  const topPerformers = sortedByReturn.slice(0, 5);
  const bottomPerformers = [...sortedByReturn].reverse().slice(0, 5).filter(h => h.totalReturnPercent < 0);

  const renderTable = (data: Holding[], title: string, isPositive: boolean) => (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl overflow-hidden flex-1">
      <div className="p-6 border-b border-[#2A2E45] flex items-center gap-3">
        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", isPositive ? "bg-[#FC2D79]/20" : "bg-[#823AFD]/20")}>
          {isPositive ? <ArrowUpRight className="w-5 h-5 text-[#FC2D79]" /> : <ArrowDownRight className="w-5 h-5 text-[#823AFD]" />}
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#1A1D2D]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#9898C8] uppercase">Symbol</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#9898C8] uppercase">Return %</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[#9898C8] uppercase">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2E45]">
            {data.length > 0 ? data.map(h => (
              <tr key={h.symbol} className="hover:bg-[#1A1D2D]/50 transition-colors">
                <td className="px-4 py-3 text-sm font-bold text-white">{h.symbol}</td>
                <td className={clsx("px-4 py-3 text-sm text-right font-medium", h.totalReturnPercent >= 0 ? "text-[#FC2D79]" : "text-[#823AFD]")}>
                  {h.totalReturnPercent >= 0 ? '+' : ''}{h.totalReturnPercent.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-300">
                  {formatCurrency(h.currentValue)}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#9898C8] text-sm">No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 mt-8">
      {renderTable(topPerformers, "Top 5 Performers", true)}
      {renderTable(bottomPerformers, "Bottom 5 Performers", false)}
    </div>
  );
};
