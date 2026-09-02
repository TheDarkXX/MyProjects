import React, { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import { Portfolio, HistoricalDataPoint } from '../types';

interface AnalysisPageProps {
  portfolios: Portfolio[];
  currency: 'USD' | 'THB';
  exchangeRate: number;
  rawPriceDataCache: Record<string, Record<string, Record<string, number>>>;
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;
  onUpdatePortfolioGoal: (portfolioId: string, goalData: { goal_amount: number; goal_currency: 'USD' | 'THB' }) => void;
}

const AnalysisPage: React.FC<AnalysisPageProps> = ({ portfolios, currency, exchangeRate, rawPriceDataCache, selectedPortfolioId, setSelectedPortfolioId, onUpdatePortfolioGoal }) => {
  const dashboardContainerRef = useRef<HTMLElement>(null);

  // Handle case where the selected portfolio is deleted or not set
  useEffect(() => {
    if (portfolios.length > 0 && (!selectedPortfolioId || !portfolios.some(p => p.id === selectedPortfolioId))) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolioId, setSelectedPortfolioId]);

  const portfolioPriceData = rawPriceDataCache[selectedPortfolioId || ''] || {};
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-80px)]">
      <Sidebar
        portfolios={portfolios}
        selectedPortfolioId={selectedPortfolioId || ''}
        setSelectedPortfolioId={setSelectedPortfolioId}
        showTopMovers={true}
      />
      <main ref={dashboardContainerRef} className="flex-1 md:p-6 bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-lg shadow-inner shadow-black/30 overflow-y-auto">
        {selectedPortfolio ? (
            <Dashboard 
              portfolio={selectedPortfolio} 
              portfolioName={selectedPortfolio.name} 
              currency={currency} 
              exchangeRate={exchangeRate} 
              dashboardContainerRef={dashboardContainerRef}
              portfolioPriceData={portfolioPriceData}
              onUpdatePortfolioGoal={onUpdatePortfolioGoal}
            />
        ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-center p-10">
                <p>No portfolios available. <br/>Add a portfolio and some transactions to see the analysis.</p>
            </div>
        )}
      </main>
    </div>
  );
};

export default AnalysisPage;