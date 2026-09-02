import React, { useEffect } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePriceStore } from '../../stores/priceStore';
import { useHoldings } from '../../hooks/useHoldings';
import { AllocationPieChart } from './AllocationPieChart';
import { DistributionPieChart } from './DistributionPieChart';
import { CostValueBars } from './CostValueBars';
import { Heatmap } from './Heatmap';
import { PerformersTable } from '../dashboard/PerformersTable';

export const AnalysisPage = () => {
  const { activePortfolioId } = usePortfolioStore();
  const { fetchTransactions } = useTransactionStore();
  const { fetchPrices, fetchHistorical, fetchExchangeRate } = usePriceStore();

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
      // For heatmap 1D vs Total, we need current prices.
      // Heatmap uses holdings which already uses prices from priceStore.
    }
  }, [JSON.stringify(activeSymbols), fetchPrices]);

  const formatCurrency = (val: number, usdOnly = true) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Portfolio Analysis</h2>
          <p className="text-[#9898C8] mt-2">Deep dive into your portfolio allocation and performance metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllocationPieChart holdings={holdings} />
        <DistributionPieChart holdings={holdings} />
      </div>

      <div className="w-full">
        <CostValueBars holdings={holdings} />
      </div>

      <div className="w-full">
        <Heatmap holdings={holdings} />
      </div>

      <PerformersTable holdings={holdings} formatCurrency={formatCurrency} />
    </div>
  );
};
