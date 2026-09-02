import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Portfolio, Transaction, SupabaseLatestPrice } from '../types';
import Sidebar from './Sidebar';
import { populateHistoricalData } from '../lib/historicalPopulation';

interface SnapshotGeneratorPageProps {
  portfolios: Portfolio[];
  transactions: Transaction[];
  latestPrices: Record<string, SupabaseLatestPrice>;
}

const SnapshotGeneratorPage: React.FC<SnapshotGeneratorPageProps> = ({ portfolios, transactions, latestPrices }) => {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  
  const [status, setStatus] = useState<{
    phase: string;
    message: string;
    progress: number;
    details?: { processedDays: number; totalDays: number; warnings: string[] };
  } | null>(null);

  useEffect(() => {
    if (!selectedPortfolioId && portfolios.length > 0) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolioId]);

  const isRunning = useMemo(() => status?.phase !== 'complete' && status?.phase !== 'error' && status !== null, [status]);

  const dateRange = useMemo(() => {
    if (!selectedPortfolioId) return { from: 'N/A', to: 'N/A' };
    const portfolioTxs = transactions.filter(tx => tx.portfolioId === selectedPortfolioId);
    if (portfolioTxs.length === 0) return { from: 'N/A', to: 'N/A' };

    const sortedTxs = portfolioTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const from = new Date(sortedTxs[0].date).toISOString().split('T')[0];
    const to = new Date().toISOString().split('T')[0];
    return { from, to };
  }, [selectedPortfolioId, transactions]);

  const handleGenerate = useCallback(async () => {
    if (!selectedPortfolioId) return;
    
    setStatus({
        phase: 'starting',
        message: 'Initializing...',
        progress: 0,
    });

    const portfolioTxs = transactions.filter(tx => tx.portfolioId === selectedPortfolioId);
    const symbolsInPortfolio = Array.from(new Set(portfolioTxs.map(t => t.symbol).filter(s => s !== 'CASH')));
    
    const missingSymbols = symbolsInPortfolio.filter(symbol => !Object.prototype.hasOwnProperty.call(latestPrices, symbol));

    if (missingSymbols.length > 0) {
        setStatus({
            phase: 'error',
            message: `Current prices are missing for some symbols: ${missingSymbols.join(', ')}. Please go to the 'Portfolio' page and click the refresh button to fetch the latest prices before generating snapshots.`,
            progress: 0,
        });
        return;
    }

    const priceMap: Record<string, number> = {};
    for (const symbol in latestPrices) {
      if (Object.prototype.hasOwnProperty.call(latestPrices, symbol)) {
        const priceInfo = latestPrices[symbol];
        if (priceInfo && typeof priceInfo.price === 'number') {
          priceMap[symbol] = priceInfo.price;
        }
      }
    }

    try {
        const result = await populateHistoricalData(
            selectedPortfolioId,
            transactions,
            priceMap,
            (progressStatus) => {
                setStatus(progressStatus);
            }
        );

        setStatus({
            phase: result.success ? 'complete' : 'error',
            message: result.message,
            progress: 100,
            details: { processedDays: 0, totalDays: 0, warnings: result.warnings }
        });

        if (result.success) {
            window.dispatchEvent(new CustomEvent('snapshotsUpdated', { detail: { portfolioId: selectedPortfolioId } }));
        }
    } catch (e) {
        const err = e as Error;
        setStatus({
            phase: 'error',
            message: `An unexpected error occurred: ${err.message}`,
            progress: 0,
        });
    }
  }, [selectedPortfolioId, transactions, latestPrices]);

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-80px)]">
      <Sidebar
        portfolios={portfolios}
        selectedPortfolioId={selectedPortfolioId || ''}
        setSelectedPortfolioId={setSelectedPortfolioId}
        showTopMovers={false}
      />
      <main className="flex-1 p-4 md:p-6 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Portfolio Snapshot Generator</h1>
        <p className="text-gray-400 mb-6 max-w-2xl">
          This tool calculates and saves a complete history of daily portfolio values from your first transaction to the present day. This data is essential for accurate performance tracking on the main Portfolio Overview page.
        </p>

        <div className="bg-[#111827] rounded-lg shadow-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold mb-2">Configuration</h2>
              <p className="text-gray-400 text-sm mb-4">Select a portfolio to generate snapshot data for. This process can be lengthy but only needs to be run once, or re-run to update with the latest data.</p>
              <div className="bg-gray-900/50 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>Portfolio:</strong> {portfolios.find(p => p.id === selectedPortfolioId)?.name || 'N/A'}
                </p>
                <p className="text-sm">
                  <strong>Processing Range:</strong> From {dateRange.from} to {dateRange.to}
                </p>
              </div>
            </div>
            <div>
              <button 
                onClick={handleGenerate} 
                disabled={!selectedPortfolioId || isRunning}
                className="w-full px-4 py-3 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.414l2.26-2.26A4 4 0 1011 5z" clipRule="evenodd" /></svg>
                )}
                <span>{isRunning ? 'Generating...' : 'Generate Daily Snapshots'}</span>
              </button>
            </div>
          </div>
          
          {status && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className="text-lg font-semibold mb-2">Progress</h3>
              <div className="space-y-3">
                 {status.phase === 'error' ? (
                    <p className="text-sm text-red-400 bg-red-900/50 p-3 rounded-md">{status.message}</p>
                 ) : status.phase === 'complete' ? (
                     <p className="text-sm text-green-400 bg-green-900/50 p-3 rounded-md">{status.message}</p>
                 ) : (
                    <p className="text-sm font-semibold">
                      Status: <span className="font-mono text-yellow-300">{status.message}</span>
                    </p>
                 )}

                <div className="w-full bg-gray-700 rounded-full h-4 relative overflow-hidden border border-black/20 shadow-inner">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-linear flex items-center justify-end pr-2" 
                    style={{ width: `${status.progress}%` }}
                  >
                     {status.progress > 10 && (
                        <span className="text-xs font-bold text-white/80" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                            {Math.round(status.progress)}%
                        </span>
                    )}
                  </div>
                </div>
                {status.details?.warnings && status.details.warnings.length > 0 && (
                    <div className="max-h-40 overflow-y-auto bg-black/30 p-3 mt-2 rounded-md">
                        <p className="text-sm text-yellow-300 font-semibold mb-2">Data Quality Warnings Encountered:</p>
                        <ul className="text-xs text-yellow-400 list-disc list-inside space-y-1">
                            {[...new Set(status.details.warnings)].map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SnapshotGeneratorPage;