import React, { useEffect, useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePriceStore } from '../../stores/priceStore';
import { useUiStore } from '../../stores/uiStore';
import { useHoldings } from '../../hooks/useHoldings';
import { AllocationPieChart } from './AllocationPieChart';
import { DistributionPieChart } from './DistributionPieChart';
import { CostValueBars } from './CostValueBars';
import { Heatmap, HeatmapTimeRange } from './Heatmap';
import { Calendar, Layers } from 'lucide-react';
import clsx from 'clsx';

const TIME_RANGES: HeatmapTimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'Total'];

export const AnalysisPage = () => {
  const { activePortfolioId } = usePortfolioStore();
  const { fetchTransactions } = useTransactionStore();
  const { fetchPrices, fetchHistorical, fetchExchangeRate } = usePriceStore();
  const { currency } = useUiStore();

  const [timeRange, setTimeRange] = useState<HeatmapTimeRange>('1D');

  useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
    }
    fetchExchangeRate('USD', 'THB');
  }, [activePortfolioId, fetchTransactions, fetchExchangeRate]);

  const { holdings } = useHoldings();
  const activeSymbols = holdings.map(h => h.symbol);
  
  useEffect(() => {
    if (activeSymbols.length > 0) {
      fetchPrices(activeSymbols);
      const to = new Date().toISOString().split('T')[0];
      const from = '2024-01-01';
      fetchHistorical(activeSymbols, from, to);
    }
  }, [JSON.stringify(activeSymbols), fetchPrices, fetchHistorical]);

  const getTimeRangeLabel = (range: HeatmapTimeRange) => {
    switch (range) {
      case '1D': return 'Today';
      case '1W': return 'Past 7 Days';
      case '1M': return 'Past 30 Days';
      case '3M': return 'Past 3 Months';
      case 'YTD': return 'Year to Date';
      case '1Y': return 'Past Year';
      case 'Total': return 'All Time';
      default: return range;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* 1. Header & Unified Timeframe Bar */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-5 px-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-white tracking-tight">Portfolio Analysis</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-[#CBD5E1] font-semibold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#823AFD]" />
              Multi-Asset Analytics
            </span>
          </div>
          <p className="text-[#CBD5E1] text-sm mt-1">
            Deep dive into your portfolio allocation, distribution, cost basis, and interactive treemap.
          </p>
        </div>

        {/* Global Page-Level Timeframe Selector Bar */}
        <div className="flex items-center bg-[#1A1D2D] border border-[#2A2E45] p-1.5 rounded-2xl gap-1.5 shadow-inner self-start xl:self-auto overflow-x-auto custom-scrollbar">
          <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#CBD5E1] border-r border-[#2A2E45]">
            <Calendar className="w-3.5 h-3.5 text-[#823AFD]" />
            <span>Timeframe:</span>
            <span className="text-white font-bold ml-1">{getTimeRangeLabel(timeRange)}</span>
          </div>
          {TIME_RANGES.map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap",
                timeRange === range
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_0_12px_rgba(130,58,253,0.4)]"
                  : "text-[#CBD5E1] hover:text-white hover:bg-[#2A2E45]/50"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Allocation Pie Chart & Distribution Pie Chart (2 Columns Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationPieChart holdings={holdings} timeRange={timeRange} />
        <DistributionPieChart holdings={holdings} />
      </div>

      {/* Row 2: Cost vs Market Value Bars (Full Width) */}
      <div className="w-full">
        <CostValueBars holdings={holdings} timeRange={timeRange} />
      </div>

      {/* Row 3: Finviz Interactive Treemap / Heatmap (Full Width) */}
      <div className="w-full">
        <Heatmap 
          holdings={holdings} 
          timeRange={timeRange} 
          onTimeRangeChange={setTimeRange} 
        />
      </div>
    </div>
  );
};
