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
import PerformanceChartPage from '../PerformanceChartPage';
import { Calendar, Layers, PieChart, LineChart } from 'lucide-react';
import clsx from 'clsx';

const TIME_RANGES: HeatmapTimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'Total'];

interface AnalysisPageProps {
  defaultTab?: 'allocation' | 'performance';
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({ defaultTab = 'allocation' }) => {
  const { activePortfolioId } = usePortfolioStore();
  const { fetchTransactions } = useTransactionStore();
  const { fetchPrices, fetchHistorical, fetchExchangeRate } = usePriceStore();
  const { currency } = useUiStore();

  const [activeTab, setActiveTab] = useState<'allocation' | 'performance'>(defaultTab);

  // 1. Global Page-Level Timeframe defaults to '1M' (Past 30 Days) as requested
  const [globalTimeRange, setGlobalTimeRange] = useState<HeatmapTimeRange>('1M');

  // 2. Market Treemap Timeframe defaults independently to '1D' (Today) as requested
  const [treemapTimeRange, setTreemapTimeRange] = useState<HeatmapTimeRange>('1D');

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
    <div className="space-y-6 animate-fade-in-up pb-12">
      {/* 1. Page Header & Tab Selector */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Portfolio Analysis</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-cyan-400 font-semibold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#823AFD]" />
              Multi-Asset Analytics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            วิเคราะห์โครงสร้างพอร์ตการลงทุน (Allocation & Treemap) และเปรียบเทียบผลตอบแทนกับตลาด (Benchmark & Growth)
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-[#1A1D2D] p-1.5 rounded-2xl border border-[#2A2E45] gap-1 self-start xl:self-auto">
          <button
            onClick={() => setActiveTab('allocation')}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'allocation'
                ? "bg-gradient-to-r from-[#823AFD] to-[#06B6D4] text-white shadow-md"
                : "text-slate-300 hover:text-white"
            )}
          >
            <PieChart className="w-4 h-4" />
            Allocation & Breakdown
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer",
              activeTab === 'performance'
                ? "bg-gradient-to-r from-[#06B6D4] to-[#10B981] text-white shadow-md"
                : "text-slate-300 hover:text-white"
            )}
          >
            <LineChart className="w-4 h-4" />
            Performance & Benchmark
          </button>
        </div>
      </div>

      {activeTab === 'allocation' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Timeframe Selector Bar for Allocation Breakdown */}
          <div className="flex items-center justify-between bg-[#111418] border border-[#2A2E45] p-3 px-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Calendar className="w-4 h-4 text-[#823AFD]" />
              <span>Timeframe:</span>
              <span className="text-white font-bold ml-1">{getTimeRangeLabel(globalTimeRange)}</span>
            </div>
            <div className="flex items-center bg-[#1A1D2D] border border-[#2A2E45] p-1 rounded-xl gap-1 overflow-x-auto custom-scrollbar">
              {TIME_RANGES.map(range => (
                <button
                  key={range}
                  onClick={() => setGlobalTimeRange(range)}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap",
                    globalTimeRange === range
                      ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_0_12px_rgba(130,58,253,0.4)]"
                      : "text-slate-300 hover:text-white hover:bg-[#2A2E45]/50"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Row 1: Allocation Pie Chart & Distribution Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AllocationPieChart holdings={holdings} timeRange={globalTimeRange} />
            <DistributionPieChart holdings={holdings} />
          </div>

          {/* Row 2: Cost vs Market Value Bars */}
          <div className="w-full">
            <CostValueBars holdings={holdings} timeRange={globalTimeRange} />
          </div>

          {/* Row 3: Finviz Interactive Treemap / Heatmap */}
          <div className="w-full">
            <Heatmap 
              holdings={holdings} 
              timeRange={treemapTimeRange} 
              onTimeRangeChange={setTreemapTimeRange} 
            />
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <PerformanceChartPage />
        </div>
      )}
    </div>
  );
};

export default AnalysisPage;
