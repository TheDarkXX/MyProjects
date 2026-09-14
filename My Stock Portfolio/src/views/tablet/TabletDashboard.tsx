import React, { useEffect, useMemo, useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePriceStore } from '../../stores/priceStore';
import { useUiStore } from '../../stores/uiStore';
import { useHoldings } from '../../hooks/useHoldings';
import { DashboardTimeRange } from '../../components/dashboard/MultiPeriodReturnStrip';
import { MasterPanel } from './components/MasterPanel';
import { DetailInspector } from './components/DetailInspector';

const getStartDateForRange = (range: DashboardTimeRange, earliestDate: string): string => {
  const today = new Date();
  switch (range) {
    case '1D':
      today.setDate(today.getDate() - 1);
      break;
    case '1W':
      today.setDate(today.getDate() - 7);
      break;
    case '1M':
      today.setDate(today.getDate() - 30);
      break;
    case '3M':
      today.setDate(today.getDate() - 90);
      break;
    case 'YTD':
      return `${today.getFullYear()}-01-01`;
    case '1Y':
      today.setFullYear(today.getFullYear() - 1);
      break;
    case 'ALL':
    default:
      return earliestDate || '2024-01-01';
  }
  return today.toISOString().split('T')[0];
};

export const TabletDashboard: React.FC = () => {
  const { portfolios, activePortfolioId } = usePortfolioStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { prices, historical, exchangeRate, fetchPrices, fetchHistorical, fetchExchangeRate } = usePriceStore();
  const { currency } = useUiStore();

  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('ALL');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);

  useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
    }
    fetchExchangeRate('USD', 'THB');
  }, [activePortfolioId, fetchTransactions, fetchExchangeRate]);

  const {
    holdings,
    cashBalance,
    totalNetWorth,
    totalPnl,
    totalPnlPercent,
    todaysProfit,
    todaysProfitPercent,
    netInvested,
    totalDividends,
    dividendYieldOnCost,
  } = useHoldings();

  const activeSymbols = holdings.map((h) => h.symbol);

  const earliestTxDate = useMemo(() => {
    const validTxs = transactions.filter((t) => t.status === 'CONFIRMED' && t.date);
    if (validTxs.length === 0) return '2024-01-01';
    return validTxs.reduce((min, t) => (t.date < min ? t.date : min), validTxs[0].date).split('T')[0];
  }, [transactions]);

  const symbolsToFetch = useMemo(() => {
    return Array.from(new Set([...activeSymbols, 'SPY']));
  }, [activeSymbols]);

  const historyFromDate = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
    if (!earliestTxDate) return oneYearAgoStr;
    return earliestTxDate < oneYearAgoStr ? earliestTxDate : oneYearAgoStr;
  }, [earliestTxDate]);

  useEffect(() => {
    if (symbolsToFetch.length > 0) {
      fetchPrices(symbolsToFetch);
      const to = new Date().toISOString().split('T')[0];
      fetchHistorical(symbolsToFetch, historyFromDate, to);
    }
  }, [JSON.stringify(symbolsToFetch), historyFromDate, fetchPrices, fetchHistorical]);

  // Currency Formatter
  const formatPrimary = (val: number, isChange?: boolean) => {
    const num = typeof val === 'number' && !isNaN(val) ? val : 0;
    const prefix = isChange && num > 0 ? '+' : '';
    if (currency === 'USD') {
      return `${prefix}${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: activePortfolio?.base_currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num)}`;
    }
    return `${prefix}${new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(num * exchangeRate))}`;
  };

  // 1. Calculate All Daily Points for Equity Curve
  const allDailyPoints = useMemo(() => {
    if (activeSymbols.length === 0) return [];

    const dateSet = new Set<string>();
    activeSymbols.forEach((s) => {
      if (historical[s]) historical[s].forEach((d) => dateSet.add(d.date));
    });

    const sortedDates = Array.from(dateSet).sort();
    const validDates = sortedDates.filter((d) => !earliestTxDate || d >= earliestTxDate);
    let lastKnownPrices: Record<string, number> = {};

    const chronologicalTxs = [...transactions]
      .filter((t) => t.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return validDates.map((date) => {
      let dailyCash = activePortfolio?.initial_cash || 0;
      let dailyHolds: Record<string, number> = {};

      for (const tx of chronologicalTxs) {
        const eodTarget = new Date(date);
        eodTarget.setHours(23, 59, 59, 999);
        if (new Date(tx.date) <= eodTarget) {
          const qty = Number(tx.quantity);
          const price = Number(tx.price);
          const fee = Number(tx.fee || 0);

          if (tx.type === 'BUY') {
            dailyCash -= qty * price + fee;
            dailyHolds[tx.symbol] = (dailyHolds[tx.symbol] || 0) + qty;
          } else if (tx.type === 'SELL') {
            dailyCash += qty * price - fee;
            dailyHolds[tx.symbol] = (dailyHolds[tx.symbol] || 0) - qty;
          } else if (tx.type === 'DEPOSIT') {
            dailyCash += Number(tx.amount || 0);
          } else if (tx.type === 'WITHDRAWAL') {
            dailyCash -= Number(tx.amount || 0);
          } else if (tx.type === 'DIVIDEND') {
            dailyCash += Number(tx.amount || 0);
          }
        }
      }

      activeSymbols.forEach((s) => {
        if (historical[s]) {
          const dayMatch = historical[s].find((d) => d.date === date);
          if (dayMatch && typeof dayMatch.close === 'number') {
            lastKnownPrices[s] = dayMatch.close;
          }
        }
        if (!lastKnownPrices[s] && prices[s]) {
          lastKnownPrices[s] = prices[s].price;
        }
      });

      let dailyStockValue = 0;
      Object.entries(dailyHolds).forEach(([sym, qty]) => {
        if (qty > 0) {
          dailyStockValue += qty * (lastKnownPrices[sym] || 0);
        }
      });

      return {
        date,
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: dailyCash + dailyStockValue,
      };
    });
  }, [historical, transactions, activePortfolio, activeSymbols, earliestTxDate, prices]);

  // 2. Filtered Chart Data for selected timeRange
  const chartData = useMemo(() => {
    if (allDailyPoints.length === 0) return [];
    const startDate = getStartDateForRange(timeRange, earliestTxDate);
    const endDate = new Date().toISOString().split('T')[0];
    return allDailyPoints.filter((p) => p.date >= startDate && p.date <= endDate);
  }, [allDailyPoints, timeRange, earliestTxDate]);

  return (
    <div className="w-full h-full flex-1 min-h-0 flex overflow-hidden border border-[#2A2E45] rounded-3xl bg-[#07090E] shadow-2xl select-none">
      {/* Left Master Panel: Watchlist & Search */}
      <MasterPanel
        holdings={holdings}
        cashBalance={cashBalance}
        selectedSymbol={selectedStock}
        onSelectSymbol={(sym) => setSelectedStock(sym)}
        formatCurrency={formatPrimary}
        historical={historical}
      />

      {/* Right Detail Inspector: Stock Detail OR Portfolio Overview */}
      <DetailInspector
        selectedStock={selectedStock}
        onClearSelected={() => setSelectedStock(null)}
        holdings={holdings}
        cashBalance={cashBalance}
        totalNetWorth={totalNetWorth}
        totalPnl={totalPnl}
        totalPnlPercent={totalPnlPercent}
        todaysProfit={todaysProfit}
        todaysProfitPercent={todaysProfitPercent}
        totalDividends={totalDividends}
        dividendYieldOnCost={dividendYieldOnCost}
        netInvested={netInvested}
        chartData={chartData}
        timeRange={timeRange}
        onRangeChange={(r) => setTimeRange(r)}
        formatCurrency={formatPrimary}
        historical={historical}
        transactions={transactions}
      />
    </div>
  );
};
