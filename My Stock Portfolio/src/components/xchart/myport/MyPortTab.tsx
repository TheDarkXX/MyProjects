import React, { useState, useMemo, useEffect } from 'react';
import { useHoldings } from '../../../hooks/useHoldings';
import { useTransactionStore } from '../../../stores/transactionStore';
import { useBlueprintStore } from '../../../stores/blueprintStore';
import { usePortfolioStore } from '../../../stores/portfolioStore';
import { usePriceStore } from '../../../stores/priceStore';
import { XChartPanel } from '../XChartPanel';
import { MyPortWatchlist } from './MyPortWatchlist';
import { PortfolioOverlayConfig } from '../../project2x/LWChart';

interface MyPortTabProps {
  tabId: string;
}

export const MyPortTab: React.FC<MyPortTabProps> = ({ tabId }) => {
  const { holdings } = useHoldings();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { blueprints, fetchBlueprints } = useBlueprintStore();
  const { portfolios, activePortfolioId, fetchPortfolios } = usePortfolioStore();
  const { fetchPrices, fetchExchangeRate } = usePriceStore();

  // Ensure portfolios are fetched
  useEffect(() => {
    if (portfolios.length === 0) {
      fetchPortfolios();
    }
  }, [portfolios.length, fetchPortfolios]);

  // Fetch transactions and blueprints for active portfolio
  useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
      fetchBlueprints(activePortfolioId);
      fetchExchangeRate('USD', 'THB');
    }
  }, [activePortfolioId, fetchTransactions, fetchBlueprints, fetchExchangeRate]);

  // Fetch live market prices for all held symbols
  useEffect(() => {
    const activeSymbols = (holdings || [])
      .map((h) => h.symbol)
      .filter((s) => s && s !== 'CASH');
    if (activeSymbols.length > 0) {
      fetchPrices(activeSymbols);
    }
  }, [holdings, fetchPrices]);

  // Default to first holding or 'VRT'
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    const validHoldings = (holdings || []).filter((h) => h && h.quantity > 0 && h.symbol !== 'CASH');
    return validHoldings.length > 0 ? validHoldings[0].symbol : 'VRT';
  });

  // Keep selectedSymbol synced if holdings load asynchronously
  useEffect(() => {
    const validHoldings = (holdings || []).filter((h) => h && h.quantity > 0 && h.symbol !== 'CASH');
    if (validHoldings.length > 0) {
      const hasCurrent = validHoldings.some((h) => h.symbol.toUpperCase() === selectedSymbol.toUpperCase());
      if (!hasCurrent || !selectedSymbol || selectedSymbol === 'MYPORT') {
        setSelectedSymbol(validHoldings[0].symbol);
      }
    }
  }, [holdings, selectedSymbol]);

  // Compute portfolio overlay for selected symbol
  const portfolioOverlay: PortfolioOverlayConfig = useMemo(() => {
    const sym = (selectedSymbol || 'VRT').toUpperCase().trim();
    const holding = (holdings || []).find((h) => h && h.symbol && h.symbol.toUpperCase() === sym);

    const stockTxs = (transactions || [])
      .filter((t) => t && t.symbol && t.symbol.toUpperCase() === sym && t.status === 'CONFIRMED' && (t.type === 'BUY' || t.type === 'SELL'))
      .map((t) => ({
        date: t.date,
        type: t.type as 'BUY' | 'SELL',
        price: t.price,
        amount: t.amount,
      }));

    const bp = (blueprints || []).find((b: any) => b && b.symbol && b.symbol.toUpperCase() === sym);

    return {
      avgCost: holding?.avgCost,
      totalQuantity: holding?.quantity,
      unrealizedPnLPercent: holding?.totalReturnPercent,
      transactions: stockTxs,
      blueprint: bp
        ? {
            targetPrice: bp.target_price,
            ceilingPrice: bp.ceiling_price,
          }
        : undefined,
    };
  }, [selectedSymbol, holdings, transactions, blueprints]);

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full relative select-none">
      {/* Chart Canvas with Portfolio Overlay (Cost basis line, Trade markers, Blueprints) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-h-0">
        <XChartPanel
          key={`myport_${selectedSymbol}`}
          symbol={selectedSymbol}
          tabId={tabId}
          portfolioOverlay={portfolioOverlay}
        />
      </div>

      {/* Right Holdings Watchlist Dock */}
      <MyPortWatchlist
        selectedSymbol={selectedSymbol}
        onSelectSymbol={(sym) => setSelectedSymbol(sym)}
      />
    </div>
  );
};
