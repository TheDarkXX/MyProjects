import React, { useEffect, useMemo, useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePriceStore } from '../../stores/priceStore';
import { useUiStore } from '../../stores/uiStore';
import { useHoldings } from '../../hooks/useHoldings';
import { useXChartStore } from '../../stores/xchartStore';
import { useProject2xStore } from '../../stores/project2xStore';
import { DashboardTimeRange } from '../../components/dashboard/MultiPeriodReturnStrip';
import { PortfolioHero } from './components/PortfolioHero';
import { QuickStatsStrip } from './components/QuickStatsStrip';
import { StockDetailDrawer } from '../../components/portfolio/StockDetailDrawer';
import { TierBadgeIndicator, getTierVisualInfo } from '../../components/xchart/TierBadgeIndicator';
import { Wallet, Briefcase, CandlestickChart } from 'lucide-react';
import clsx from 'clsx';

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

export const MobileMyPortPage: React.FC = () => {
  const { portfolios, activePortfolioId } = usePortfolioStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { prices, historical, exchangeRate, fetchPrices, fetchHistorical, fetchExchangeRate } = usePriceStore();
  const { currency, setActiveTab } = useUiStore();
  const { changeSymbolOnActiveTab, watchlistPrices } = useXChartStore();
  const { compactTiers, radar } = useProject2xStore();

  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('ALL');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const activePortfolio = (portfolios || []).find((p) => p.id === activePortfolioId);

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
    const d = new Date(earliestTxDate);
    d.setDate(d.getDate() - 14);
    const safeEarliest = d.toISOString().split('T')[0];
    return safeEarliest < oneYearAgoStr ? safeEarliest : oneYearAgoStr;
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

    const stockSymbols = activeSymbols.filter(s => s !== 'SPY');
    const hasStockHistorical = stockSymbols.length === 0 || stockSymbols.some(s => historical[s] && historical[s].length > 0);
    if (!hasStockHistorical) return [];

    const dateSet = new Set<string>();
    activeSymbols.forEach((s) => {
      if (historical[s]) historical[s].forEach((d) => dateSet.add(d.date));
    });

    const sortedDates = Array.from(dateSet).sort();
    const validDates = sortedDates.filter((d) => !earliestTxDate || d >= earliestTxDate);

    const chronologicalTxs = [...transactions]
      .filter((t) => t.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const defaultSymbolPrices: Record<string, number> = {};
    chronologicalTxs.forEach((tx) => {
      if (tx.symbol && tx.price && tx.price > 0 && tx.asset !== 'Cash') {
        defaultSymbolPrices[tx.symbol] = tx.price;
      }
    });

    let lastKnownPrices: Record<string, number> = {};

    return validDates.map((date) => {
      let dailyCash = activePortfolio?.initial_cash || 0;
      let dailyHolds: Record<string, number> = {};

      for (const tx of chronologicalTxs) {
        const eodTarget = new Date(date);
        eodTarget.setHours(23, 59, 59, 999);
        if (new Date(tx.date) <= eodTarget) {
          const isCash = tx.asset === 'Cash' || tx.symbol === 'CASH';
          const qty = Number(tx.amount || 0);
          const price = Number(tx.price || 0);
          const fee = Number(tx.fee || 0);

          if (tx.type === 'BUY') {
            if (isCash) {
              dailyCash += qty;
            } else {
              dailyCash -= (qty * price) + fee;
              dailyHolds[tx.symbol] = (dailyHolds[tx.symbol] || 0) + qty;
            }
          } else if (tx.type === 'SELL') {
            if (isCash) {
              dailyCash -= qty;
            } else {
              dailyCash += (qty * price) - fee;
              dailyHolds[tx.symbol] = (dailyHolds[tx.symbol] || 0) - qty;
            }
          } else if (tx.type === 'DEPOSIT') {
            dailyCash += qty;
          } else if (tx.type === 'WITHDRAW' || (tx.type as string) === 'WITHDRAWAL') {
            dailyCash -= qty;
          } else if (tx.type === 'DIVIDEND' || tx.type === 'INTEREST') {
            dailyCash += (qty - fee);
          }
        }
      }

      activeSymbols.forEach((s) => {
        if (Array.isArray(historical[s])) {
          const dayMatch = historical[s].find((d) => d.date === date);
          if (dayMatch) {
            const p = typeof dayMatch.price === 'number' ? dayMatch.price : dayMatch.close;
            if (typeof p === 'number' && !isNaN(p)) {
              lastKnownPrices[s] = p;
            }
          }
        }
        if (!lastKnownPrices[s]) {
          if (prices[s]) {
            lastKnownPrices[s] = prices[s].price;
          } else if (defaultSymbolPrices[s]) {
            lastKnownPrices[s] = defaultSymbolPrices[s];
          }
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

  // Display PnL for active timeRange
  const { displayPnl, displayPnlPercent } = useMemo(() => {
    if (timeRange === '1D') {
      return {
        displayPnl: typeof todaysProfit === 'number' && !isNaN(todaysProfit) ? todaysProfit : 0,
        displayPnlPercent: typeof todaysProfitPercent === 'number' && !isNaN(todaysProfitPercent) ? todaysProfitPercent : 0,
      };
    }
    if (timeRange === 'ALL') {
      const stockSymbols = activeSymbols.filter(s => s !== 'SPY');
      const hasStockHistorical = stockSymbols.length === 0 || stockSymbols.some(s => historical[s] && historical[s].length > 0);

      const cachedTwr = activePortfolioId && typeof window !== 'undefined'
        ? (() => {
            try {
              const raw = localStorage.getItem(`stock_portfolio_twr_${activePortfolioId}`);
              const num = raw ? parseFloat(raw) : null;
              return num !== null && !isNaN(num) ? num : null;
            } catch {
              return null;
            }
          })()
        : null;

      if (allDailyPoints.length >= 2 && hasStockHistorical) {
        let cumTwr = 1.0;
        let validDays = 0;
        for (let i = 1; i < allDailyPoints.length; i++) {
          const prevVal = allDailyPoints[i - 1].value;
          const currVal = allDailyPoints[i].value;
          const currDate = allDailyPoints[i].date;

          let dayCf = 0;
          for (const tx of transactions) {
            if (tx.status !== 'CANCELLED' && tx.date && tx.date.split('T')[0] === currDate) {
              const isCash = tx.asset === 'Cash' || tx.symbol === 'CASH';
              const type = (tx.type || '').toUpperCase();
              if (type === 'DEPOSIT' || (type === 'BUY' && isCash)) {
                dayCf += tx.amount;
              } else if (type === 'WITHDRAW' || (type === 'SELL' && isCash)) {
                dayCf -= tx.amount;
              }
            }
          }

          if (prevVal >= 10.0) {
            const dayReturn = (currVal - dayCf - prevVal) / prevVal;
            if (isFinite(dayReturn) && dayReturn > -0.99 && dayReturn < 3.0) {
              cumTwr *= (1 + dayReturn);
              validDays++;
            }
          }
        }

        const rawPct = validDays > 0 ? (cumTwr - 1) * 100 : (cachedTwr ?? totalPnlPercent);
        const finalPct = isFinite(rawPct) && Math.abs(rawPct) < 10000 ? rawPct : (cachedTwr ?? totalPnlPercent);

        return {
          displayPnl: typeof totalPnl === 'number' && !isNaN(totalPnl) ? totalPnl : 0,
          displayPnlPercent: finalPct,
        };
      }
      return {
        displayPnl: typeof totalPnl === 'number' && !isNaN(totalPnl) ? totalPnl : 0,
        displayPnlPercent: cachedTwr ?? (typeof totalPnlPercent === 'number' && !isNaN(totalPnlPercent) ? totalPnlPercent : 0),
      };
    }
    if (chartData.length > 0) {
      const startVal = chartData[0].value;
      const endVal = chartData[chartData.length - 1].value;
      const diff = endVal - startVal;
      const pct = startVal > 0 ? (diff / startVal) * 100 : 0;
      return { 
        displayPnl: !isNaN(diff) ? diff : 0, 
        displayPnlPercent: !isNaN(pct) ? pct : 0 
      };
    }
    return { 
      displayPnl: typeof totalPnl === 'number' && !isNaN(totalPnl) ? totalPnl : 0, 
      displayPnlPercent: typeof totalPnlPercent === 'number' && !isNaN(totalPnlPercent) ? totalPnlPercent : 0 
    };
  }, [timeRange, todaysProfit, todaysProfitPercent, chartData, totalPnl, totalPnlPercent, allDailyPoints, transactions, activePortfolioId]);

  // Sort holdings by weight descending
  const sortedHoldings = useMemo(() => {
    return [...holdings].filter(h => h.quantity > 0 && h.symbol !== 'CASH').sort((a, b) => b.weightPercent - a.weightPercent);
  }, [holdings]);

  // Radar map
  const radarMap = useMemo(() => {
    const map: Record<string, any> = { ...compactTiers };
    if (radar?.rows) {
      for (const row of radar.rows) {
        if (row && row.symbol) {
          map[row.symbol.toUpperCase()] = row;
        }
      }
    }
    return map;
  }, [radar?.rows, compactTiers]);

  return (
    <div className="space-y-4 animate-fade-in-up pb-8 max-w-2xl mx-auto select-none">
      {/* 1. Hero Net Worth & Chart */}
      <PortfolioHero
        totalNetWorth={totalNetWorth}
        displayPnl={displayPnl}
        displayPnlPercent={displayPnlPercent}
        chartData={chartData}
        timeRange={timeRange}
        onRangeChange={(r) => setTimeRange(r)}
        formatPrimary={formatPrimary}
      />

      {/* 2. Quick Stats Strip */}
      <QuickStatsStrip
        netInvested={netInvested}
        totalPnl={totalPnl}
        totalPnlPercent={totalPnlPercent}
        todaysProfit={todaysProfit}
        todaysProfitPercent={todaysProfitPercent}
        totalDividends={totalDividends}
        dividendYieldOnCost={dividendYieldOnCost}
        cashBalance={cashBalance}
        formatPrimary={formatPrimary}
      />

      {/* 3. Holdings Positions Breakdown */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        {/* Section Header */}
        <div className="p-3.5 sm:p-4 bg-[#0E121E] border-b border-[#2A2E45] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-purple-400" />
            <span className="text-white font-black text-sm sm:text-base font-heading">
              Portfolio Holdings
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 font-mono">
              {sortedHoldings.length} Positions
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Sorted by weight
          </span>
        </div>

        {/* Table Column Headers */}
        <div className="h-8 px-3 bg-[#080A10] border-b border-[#1F2233] grid grid-cols-12 items-center text-[12px] font-bold uppercase tracking-wider text-slate-300 select-none">
          <div className="col-span-5 text-left">Position</div>
          <div className="col-span-3 text-right pr-1">Last / Value</div>
          <div className="col-span-2 text-right">Chg ($)</div>
          <div className="col-span-2 text-right">Chg (%)</div>
        </div>

        {/* Holdings Rows */}
        <div className="divide-y divide-[#1F2233]/30">
          {sortedHoldings.map((h) => {
            const quote = watchlistPrices[h.symbol] || { price: h.lastPrice, change: 0, percentChange: h.dayChangePercent };
            const radarData = h.symbol ? radarMap[h.symbol.toUpperCase()] : null;
            const tierInfo = getTierVisualInfo(radarData, h.symbol, false);

            const price = quote?.price ?? h.lastPrice ?? 0;
            const change = quote?.change ?? 0;
            const percentChange = quote?.percentChange ?? h.dayChangePercent ?? 0;
            const isPositive = percentChange >= 0;
            const isZero = percentChange === 0;

            let formattedPrice = price.toFixed(2);
            if (price > 1000) {
              formattedPrice = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            return (
              <div
                key={h.symbol}
                onClick={() => setSelectedSymbol(h.symbol)}
                className="h-[46px] px-3 grid grid-cols-12 items-center hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer group relative select-none"
              >
                {/* Left Indicator */}
                {tierInfo.isFireOrb ? (
                  <div className={clsx('absolute left-[1px] top-1/2 -translate-y-1/2 transition-all z-10', tierInfo.spineClass)} />
                ) : (
                  <div className={clsx('absolute left-[2px] top-[6px] bottom-[6px] rounded-full transition-all z-10 w-[4px]', tierInfo.spineClass)} />
                )}

                {/* Col 1: Symbol, Weight & Shares */}
                <div className="col-span-5 flex flex-col justify-center overflow-hidden pr-1">
                  <div className="flex items-center gap-1.5">
                    <TierBadgeIndicator symbol={h.symbol} radarData={radarData} />
                    <span className="text-[13px] font-bold tracking-tight truncate font-mono text-slate-100 group-hover:text-white">
                      {h.symbol}
                    </span>
                    <span className="text-[11px] px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono font-bold">
                      {h.weightPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate pl-5">
                    {Number(h.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })} shares
                  </div>
                </div>

                {/* Col 2: Price & Total Current Value */}
                <div className="col-span-3 text-right flex flex-col justify-center font-mono pr-1">
                  <span className="text-[13px] font-normal text-slate-200 group-hover:text-white">
                    {formattedPrice}
                  </span>
                  <span className="text-[11px] text-[#CBD5E1] truncate">
                    {formatPrimary(h.currentValue)}
                  </span>
                </div>

                {/* Col 3: Change */}
                <div className={clsx("col-span-2 text-right font-mono text-[13px] font-normal truncate", isZero ? "text-slate-300" : isPositive ? "text-emerald-400" : "text-rose-400")}>
                  {isZero ? '0.00' : `${isPositive && change > 0 ? '+' : ''}${change.toFixed(2)}`}
                </div>

                {/* Col 4: Percent Change & Jump Icon */}
                <div className="col-span-2 text-right flex items-center justify-end">
                  <span className={clsx("font-mono text-[13px] font-bold px-1.5 py-0.5 rounded-lg", 
                    isPositive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                  )}>
                    {isPositive ? '+' : ''}{percentChange.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}

          {/* Pinned Cash Row */}
          <div className="h-[46px] px-3 bg-[#0A0D15] flex items-center justify-between border-t border-[#2A2E45]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[13px] font-bold text-white font-heading">CASH</div>
                <div className="text-[11px] text-[#CBD5E1]">Available Liquid Funds</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-emerald-400 font-mono">
                {formatPrimary(cashBalance)}
              </div>
              <div className="text-[11px] text-slate-400">Unallocated</div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Stock Detail Drawer */}
      <StockDetailDrawer
        symbol={selectedSymbol}
        isOpen={!!selectedSymbol}
        onClose={() => setSelectedSymbol(null)}
      />
    </div>
  );
};
