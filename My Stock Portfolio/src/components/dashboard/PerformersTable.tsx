import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import clsx from 'clsx';
import { Holding } from '../../hooks/useHoldings';

interface PerformersTableProps {
  holdings: Holding[];
  formatCurrency: (val: number, usdOnly?: boolean) => string;
  timeRange?: string;
}

export const PerformersTable: React.FC<PerformersTableProps> = ({ holdings, formatCurrency, timeRange = 'Total' }) => {
  const is1D = timeRange === '1D';

  // Sort by Return % according to timeframe
  const sortedByReturn = [...holdings].sort((a, b) => {
    const returnA = is1D ? a.dayChangePercent : a.totalReturnPercent;
    const returnB = is1D ? b.dayChangePercent : b.totalReturnPercent;
    return returnB - returnA;
  });
  
  const topPerformers = sortedByReturn.slice(0, 5);
  const bottomPerformers = [...sortedByReturn].reverse().slice(0, 5).filter(h => {
    const ret = is1D ? h.dayChangePercent : h.totalReturnPercent;
    return ret < 0;
  });

  const returnLabel = is1D ? "1D Return" : "Total Return";

  const renderTable = (data: Holding[], title: string, isPositive: boolean) => (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl overflow-hidden flex-1">
      <div className="p-6 border-b border-[#2A2E45] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", isPositive ? "bg-[#FC2D79]/20" : "bg-[#823AFD]/20")}>
            {isPositive ? <ArrowUpRight className="w-5 h-5 text-[#FC2D79]" /> : <ArrowDownRight className="w-5 h-5 text-[#823AFD]" />}
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-[#CBD5E1] font-semibold">
          {timeRange}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#1A1D2D]">
            <tr>
              <th className="px-3.5 py-3 text-left text-xs font-bold text-[#CBD5E1] uppercase">Asset</th>
              <th className="px-3.5 py-3 text-right text-xs font-bold text-[#CBD5E1] uppercase">{returnLabel}</th>
              <th className="px-3.5 py-3 text-right text-xs font-bold text-[#CBD5E1] uppercase">Return %</th>
              <th className="px-3.5 py-3 text-right text-xs font-bold text-[#CBD5E1] uppercase">Market Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2E45]">
            {data.length > 0 ? data.map(h => {
              const returnVal = is1D ? h.dayReturn : h.totalReturn;
              const returnPct = is1D ? h.dayChangePercent : h.totalReturnPercent;

              return (
                <tr key={h.symbol} className="hover:bg-[#1A1D2D]/50 transition-colors">
                  <td className="px-3.5 py-3 text-sm font-bold text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#823AFD]"></span>
                      <span className="font-heading">{h.symbol}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-right whitespace-nowrap">
                    <span className={clsx("text-sm font-bold tabular-nums font-prompt", returnVal >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {returnVal >= 0 ? '+' : ''}{formatCurrency(returnVal)}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-right whitespace-nowrap">
                    <span className={clsx("text-xs font-bold tabular-nums font-prompt px-2 py-0.5 rounded-md", 
                      returnPct >= 0 ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                    )}>
                      {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-sm text-right font-black text-white tabular-nums font-prompt whitespace-nowrap">
                    {formatCurrency(h.currentValue)}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#9898C8] text-sm">No data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 h-full">
      {renderTable(topPerformers, "Top 5 Performers", true)}
      {renderTable(bottomPerformers, "Bottom 5 Performers", false)}
    </div>
  );
};
