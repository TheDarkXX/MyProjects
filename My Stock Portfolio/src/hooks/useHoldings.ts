import { useMemo, useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { useTransactionStore } from '../stores/transactionStore';
import { usePriceStore } from '../stores/priceStore';
import { resolveStockCategory } from '../components/rebalance/StrategyConfigs';

export interface Holding {
  symbol: string;
  quantity: number;
  avgCost: number;
  totalCost: number;
  currentValue: number;
  lastPrice: number;
  dayChangePercent: number;
  dayReturn: number;
  totalReturn: number;
  totalReturnPercent: number;
  weightPercent: number;
  stockType?: string;
  sector?: string;
}

export function useHoldings() {
  const { activePortfolioId, portfolios, fetchPortfolios, setActivePortfolio } = usePortfolioStore();
  const { transactions, fetchTransactions, loading: txLoading } = useTransactionStore();
  const { prices, fetchPrices, fetchExchangeRate } = usePriceStore();
  const activePortfolio = portfolios.find(p => p.id === activePortfolioId);

  // 1. Ensure portfolios are loaded if empty
  useEffect(() => {
    if (portfolios.length === 0) {
      fetchPortfolios();
    }
  }, [portfolios.length, fetchPortfolios]);

  // 2. Ensure activePortfolioId is valid if portfolios exist
  useEffect(() => {
    if (portfolios.length > 0 && (!activePortfolioId || !portfolios.some(p => p.id === activePortfolioId))) {
      setActivePortfolio(portfolios[0].id);
    }
  }, [portfolios, activePortfolioId, setActivePortfolio]);

  // 3. Ensure transactions & exchange rate are fetched whenever activePortfolioId is ready
  useEffect(() => {
    if (activePortfolioId && activePortfolioId !== 'null' && activePortfolioId !== 'undefined') {
      fetchTransactions(activePortfolioId);
      fetchExchangeRate();
    }
  }, [activePortfolioId, fetchTransactions, fetchExchangeRate]);

  const holdingsData = useMemo(() => {
    let cash = activePortfolio?.initial_cash || 0;
    let netInvested = activePortfolio?.initial_cash || 0;
    let totalDividends = 0;
    const holds: Record<string, { quantity: number; totalCost: number }> = {};
    
    // Process transactions chronologically (strictly scoped to active portfolio)
    const sortedTxs = [...transactions]
      .filter(t => t && (!t.status || t.status.toUpperCase() === 'CONFIRMED') && (!activePortfolioId || !t.portfolio_id || t.portfolio_id === activePortfolioId))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    const symbolMeta: Record<string, { stockType?: string; sector?: string }> = {};

    sortedTxs.forEach(tx => {
      const amount = tx.amount || 0;
      const price = tx.price || 0;
      const fee = tx.fee || 0;
      const isCash = tx.asset === 'Cash' || tx.symbol === 'CASH';
      
      if (tx.symbol) {
        if (!symbolMeta[tx.symbol]) {
          symbolMeta[tx.symbol] = {};
        }
        symbolMeta[tx.symbol].stockType = resolveStockCategory(tx.symbol, tx.stock_type, tx.type, tx.asset);
        if (tx.sector) symbolMeta[tx.symbol].sector = tx.sector;
      }

      if (!holds[tx.symbol]) {
        holds[tx.symbol] = { quantity: 0, totalCost: 0 };
      }

      if (tx.type === 'BUY') {
        if (isCash) {
          cash += amount;
          netInvested += amount;
        } else {
          cash -= (amount * price) + fee;
          holds[tx.symbol].quantity += amount;
          holds[tx.symbol].totalCost += (amount * price) + fee;
        }
      } else if (tx.type === 'SELL') {
        if (isCash) {
          cash -= amount;
          netInvested -= amount;
        } else {
          cash += (amount * price) - fee;
          // Reduce cost basis proportionally
          if (holds[tx.symbol].quantity > 0) {
            const avgCost = holds[tx.symbol].totalCost / holds[tx.symbol].quantity;
            holds[tx.symbol].quantity -= amount;
            holds[tx.symbol].totalCost = holds[tx.symbol].quantity * avgCost;
          }
        }
      } else if (tx.type === 'DEPOSIT') {
        cash += amount;
        netInvested += amount;
      } else if (tx.type === 'WITHDRAW') {
        cash -= amount;
        netInvested -= amount;
      } else if (tx.type === 'DIVIDEND' || tx.type === 'INTEREST') {
        cash += (amount - fee);
        totalDividends += (amount - fee);
      }
    });

    let totalSecuritiesValue = 0;
    let totalSecuritiesCost = 0;
    let todaysProfit = 0;
    const holdingsArray: Holding[] = [];

    // Calculate current values
    Object.keys(holds).forEach(symbol => {
      const quantity = holds[symbol].quantity;
      if (quantity <= 0.0001) return; // Skip zero, negative, or residual dust holdings (< 0.0001)

      const totalCost = holds[symbol].totalCost;
      const avgCost = totalCost / quantity;
      
      const priceData = prices[symbol] || { price: 0, change: 0, percent_change: 0 };
      // Fallback to avgCost if price not yet loaded or offline
      const lastPrice = (priceData.price && priceData.price > 0) ? priceData.price : (avgCost || 0);
      const dayChangePercent = priceData.percent_change || 0;
      
      const currentValue = quantity * lastPrice;
      const dayReturn = quantity * (priceData.change || 0);
      const totalReturn = currentValue - totalCost;
      const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
      
      totalSecuritiesValue += currentValue;
      totalSecuritiesCost += totalCost;
      todaysProfit += dayReturn;

      if (symbol !== 'CASH' && symbol !== '') {
        holdingsArray.push({
          symbol,
          quantity,
          avgCost,
          totalCost,
          currentValue,
          lastPrice,
          dayChangePercent,
          dayReturn,
          totalReturn,
          totalReturnPercent,
          weightPercent: 0, // Will calculate below
          stockType: symbolMeta[symbol]?.stockType || resolveStockCategory(symbol) || 'Compounders',
          sector: symbolMeta[symbol]?.sector || 'Technology',
        });
      }
    });

    const totalNetWorth = cash + totalSecuritiesValue;
    const totalPnl = totalNetWorth - netInvested;
    const totalPnlPercent = netInvested > 0 ? (totalPnl / netInvested) * 100 : 0;

    const previousNetWorth = totalNetWorth - todaysProfit;
    const todaysProfitPercent = previousNetWorth > 0 ? (todaysProfit / previousNetWorth) * 100 : 0;

    const securitiesReturn = totalSecuritiesValue - totalSecuritiesCost;
    const securitiesReturnPercent = totalSecuritiesCost > 0 ? (securitiesReturn / totalSecuritiesCost) * 100 : 0;

    const dividendYieldOnCost = netInvested > 0 ? (totalDividends / netInvested) * 100 : 0;

    // Calculate weights
    holdingsArray.forEach(h => {
      h.weightPercent = totalNetWorth > 0 ? (h.currentValue / totalNetWorth) * 100 : 0;
    });
    
    const cashWeight = totalNetWorth > 0 ? (cash / totalNetWorth) * 100 : 0;
    const securitiesWeight = totalNetWorth > 0 ? (totalSecuritiesValue / totalNetWorth) * 100 : 0;

    // Sort by weight by default
    holdingsArray.sort((a, b) => b.weightPercent - a.weightPercent);

    return {
      holdings: holdingsArray,
      cashBalance: cash,
      totalSecuritiesValue,
      totalSecuritiesCost,
      securitiesReturn,
      securitiesReturnPercent,
      totalNetWorth,
      netInvested,
      totalDividends,
      dividendYieldOnCost,
      totalPnl,
      totalPnlPercent,
      cashWeight,
      securitiesWeight,
      todaysProfit,
      todaysProfitPercent,
      // Compatibility aliases
      totalPortfolioValue: totalNetWorth,
      totalUnrealizedProfit: totalPnl,
      totalUnrealizedProfitPercent: totalPnlPercent,
      netInvestedCapital: netInvested,
    };
  }, [transactions, activePortfolio, prices, activePortfolioId]);

  // 4. Eagerly fetch live market prices for all held symbols
  const activeSymbols = useMemo(() => {
    return holdingsData.holdings.map(h => h.symbol).filter(s => s && s !== 'CASH');
  }, [holdingsData.holdings]);

  useEffect(() => {
    if (activeSymbols.length > 0) {
      fetchPrices(activeSymbols);
    }
  }, [activeSymbols.join(','), fetchPrices]);

  return {
    ...holdingsData,
    loading: txLoading,
  };
}

