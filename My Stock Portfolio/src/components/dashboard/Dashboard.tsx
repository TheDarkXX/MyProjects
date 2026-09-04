import React, { useEffect, useMemo, useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePriceStore } from '../../stores/priceStore';
import { useUiStore } from '../../stores/uiStore';
import { useHoldings } from '../../hooks/useHoldings';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Activity, DollarSign, PieChart, Calendar, Landmark, Coins } from 'lucide-react';
import clsx from 'clsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PortfolioTable } from './PortfolioTable';
import { PerformersTable } from './PerformersTable';

export type DashboardTimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL' | 'CUSTOM';

const getStartDateForRange = (range: DashboardTimeRange, earliestDate: string, customStartDate?: string): string => {
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
    case 'CUSTOM':
      if (customStartDate) return customStartDate;
      today.setDate(today.getDate() - 30);
      break;
    case 'ALL':
    default:
      return earliestDate || '2024-01-01';
  }
  return today.toISOString().split('T')[0];
};

const LongZigzagTrendUp = ({ className = "w-5 h-3.5 text-emerald-400" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 14" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.4" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={clsx("shrink-0", className)}
  >
    <polyline points="1 12 6 6 11 10 16 4 23 2" />
    <polyline points="16 2 23 2 23 8" />
  </svg>
);

const LongZigzagTrendDown = ({ className = "w-5 h-3.5 text-rose-400" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 14" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.4" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={clsx("shrink-0", className)}
  >
    <polyline points="1 2 6 8 11 4 16 10 23 12" />
    <polyline points="16 12 23 12 23 6" />
  </svg>
);

const formatDateYYYYMMDD = (dStr?: string) => {
  if (!dStr) return '-';
  const clean = dStr.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  try {
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch {}
  return clean;
};

const StatCard = ({ title, value, change, isPositive, subValue, icon: Icon, gradient }: any) => (
  <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 relative overflow-hidden group">
    <div className={clsx("absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-20 group-hover:opacity-40 transition-opacity", gradient)}></div>
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className="w-12 h-12 rounded-xl bg-[#1A1D2D] border border-[#2A2E45] flex items-center justify-center">
        <Icon className={clsx("w-6 h-6", isPositive ? "text-[#FC2D79]" : "text-[#823AFD]")} />
      </div>
      {change !== undefined && (
        <div className={clsx("flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg", 
          isPositive ? "text-[#FC2D79] bg-[#FC2D79]/10" : "text-[#823AFD] bg-[#823AFD]/10"
        )}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{Math.abs(change).toFixed(2)}%</span>
        </div>
      )}
    </div>
    <div className="relative z-10">
      <h3 className="text-[#CBD5E1] font-semibold text-base mb-1">{title}</h3>
      <div className="text-3xl font-bold text-white tabular-nums tracking-tight">
        {value}
      </div>
      {subValue && (
        <div className="text-[#CBD5E1] text-base mt-1 font-medium">
          {subValue}
        </div>
      )}
    </div>
  </div>
);

export const Dashboard = () => {
  const { activePortfolioId, portfolios } = usePortfolioStore();
  const { transactions, fetchTransactions } = useTransactionStore();
  const { prices, historical, exchangeRate, fetchPrices, fetchHistorical, fetchExchangeRate } = usePriceStore();
  const { currency, setCurrency } = useUiStore();

  const activePortfolio = portfolios.find(p => p.id === activePortfolioId);

  useEffect(() => {
    if (activePortfolioId) {
      fetchTransactions(activePortfolioId);
    }
    fetchExchangeRate('USD', 'THB');
  }, [activePortfolioId, fetchTransactions, fetchExchangeRate]);

  const { 
    holdings, 
    cashBalance, 
    totalSecuritiesValue, 
    securitiesReturnPercent,
    totalNetWorth, 
    totalPnl, 
    totalPnlPercent, 
    cashWeight, 
    securitiesWeight, 
    todaysProfit,
    todaysProfitPercent,
    netInvested,
    totalDividends
  } = useHoldings();

  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('ALL');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [tempCustomFrom, setTempCustomFrom] = useState<string>('');
  const [tempCustomTo, setTempCustomTo] = useState<string>('');
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  const topWinners = useMemo(() => 
    [...holdings].filter(h => h.dayChangePercent > 0).sort((a, b) => b.dayChangePercent - a.dayChangePercent).slice(0, 3),
    [holdings]
  );
  const topLosers = useMemo(() => 
    [...holdings].filter(h => h.dayChangePercent < 0).sort((a, b) => a.dayChangePercent - b.dayChangePercent).slice(0, 3),
    [holdings]
  );

  const earliestTxDate = useMemo(() => {
    const validTxs = transactions.filter(t => t.status === 'CONFIRMED' && t.date);
    if (validTxs.length === 0) return '2024-01-01';
    return validTxs.reduce((min, t) => (t.date < min ? t.date : min), validTxs[0].date).split('T')[0];
  }, [transactions]);

  const activeSymbols = holdings.map(h => h.symbol);
  
  useEffect(() => {
    if (activeSymbols.length > 0) {
      fetchPrices(activeSymbols);
      const to = new Date().toISOString().split('T')[0];
      const from = earliestTxDate || '2024-01-01';
      fetchHistorical(activeSymbols, from, to);
    }
  }, [JSON.stringify(activeSymbols), earliestTxDate, fetchPrices, fetchHistorical]);

  // Recent Txs (new to old)
  const recentTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

  // Chart Data
  const chartData = useMemo(() => {
    if (activeSymbols.length === 0) return [];
    
    const dateSet = new Set<string>();
    activeSymbols.forEach(s => {
      if (historical[s]) historical[s].forEach(d => dateSet.add(d.date));
    });
    
    const sortedDates = Array.from(dateSet).sort();
    let lastKnownPrices: Record<string, number> = {};

    const chronologicalTxs = [...transactions]
      .filter(t => t.status === 'CONFIRMED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const allDailyPoints = sortedDates.map(date => {
      let dailyCash = activePortfolio?.initial_cash || 0;
      let dailyHolds: Record<string, number> = {};

      for (const tx of chronologicalTxs) {
        const eodTarget = new Date(date);
        eodTarget.setHours(23, 59, 59, 999);
        if (new Date(tx.date).getTime() > eodTarget.getTime()) break;

        const isCash = tx.asset === 'Cash' || tx.symbol === 'CASH';
        if (tx.type === 'BUY') {
          if (isCash) {
            dailyCash += tx.amount;
          } else {
            dailyCash -= (tx.amount * tx.price) + (tx.fee || 0);
            dailyHolds[tx.symbol] = (dailyHolds[tx.symbol] || 0) + tx.amount;
          }
        } else if (tx.type === 'SELL') {
          if (isCash) {
            dailyCash -= tx.amount;
          } else {
            dailyCash += (tx.amount * tx.price) - (tx.fee || 0);
            dailyHolds[tx.symbol] = (dailyHolds[tx.symbol] || 0) - tx.amount;
          }
        } else if (tx.type === 'DEPOSIT') {
          dailyCash += tx.amount;
        } else if (tx.type === 'WITHDRAW') {
          dailyCash -= tx.amount;
        } else if (tx.type === 'DIVIDEND' || tx.type === 'INTEREST') {
          dailyCash += (tx.amount - (tx.fee || 0));
        }
      }

      let dailyStockValue = 0;
      activeSymbols.forEach(symbol => {
        if (historical[symbol]) {
          const point = historical[symbol].find(d => d.date === date);
          if (point) {
            lastKnownPrices[symbol] = point.price;
          }
        }
        if (lastKnownPrices[symbol] && dailyHolds[symbol]) {
          dailyStockValue += dailyHolds[symbol] * lastKnownPrices[symbol];
        }
      });
      return {
        date,
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: dailyCash + dailyStockValue
      };
    });

    const startDate = getStartDateForRange(timeRange, earliestTxDate, customFrom);
    const endDate = customTo || new Date().toISOString().split('T')[0];

    return allDailyPoints.filter(p => p.date >= startDate && p.date <= endDate);
  }, [historical, transactions, activePortfolio, activeSymbols, timeRange, earliestTxDate, customFrom, customTo]);

  const periodStartValue = chartData.length > 0 ? chartData[0].value : totalNetWorth;
  const periodEndValue = chartData.length > 0 ? chartData[chartData.length - 1].value : totalNetWorth;
  const periodPnl = periodEndValue - periodStartValue;
  const periodPnlPercent = periodStartValue > 0 ? (periodPnl / periodStartValue) * 100 : 0;

  const getRangeLabel = (range: DashboardTimeRange) => {
    switch (range) {
      case '1D': return 'Today';
      case '1W': return 'Past 7 Days';
      case '1M': return 'Past 30 Days';
      case '3M': return 'Past 3 Months';
      case 'YTD': return 'Year to Date';
      case '1Y': return 'Past Year';
      case 'ALL': return 'All Time';
      case 'CUSTOM': return 'Custom Range';
      default: return range;
    }
  };

  const displayPnl = useMemo(() => {
    if (timeRange === 'ALL') return totalPnl;
    if (timeRange === '1D') return todaysProfit;
    return periodPnl;
  }, [timeRange, totalPnl, todaysProfit, periodPnl]);

  const displayPnlPercent = useMemo(() => {
    if (timeRange === 'ALL') return totalPnlPercent;
    if (timeRange === '1D') return todaysProfitPercent;
    return periodPnlPercent;
  }, [timeRange, totalPnlPercent, todaysProfitPercent, periodPnlPercent]);

  const filteredTxs = useMemo(() => {
    const startDate = getStartDateForRange(timeRange, earliestTxDate, customFrom);
    const endDate = customTo || new Date().toISOString().split('T')[0];

    return transactions
      .filter(t => {
        if (t.status === 'CANCELLED') return false;
        if (!t.date) return false;
        const txDate = t.date.split('T')[0];
        return txDate >= startDate && txDate <= endDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, timeRange, earliestTxDate, customFrom, customTo]);

  const applyCustomRange = () => {
    if (tempCustomFrom && tempCustomTo) {
      setCustomFrom(tempCustomFrom);
      setCustomTo(tempCustomTo);
      setTimeRange('CUSTOM');
      setShowCustomModal(false);
    }
  };

  const formatPrimary = (val: number, isPnl = false) => {
    const prefix = isPnl && val > 0 ? '+' : '';
    if (currency === 'THB' && exchangeRate) {
      return `${prefix}${new Intl.NumberFormat('th-TH', { 
        style: 'currency', 
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(Math.round(val * exchangeRate))}`;
    }
    return `${prefix}${new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: activePortfolio?.base_currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val)}`;
  };

  const formatSecondary = (val: number, isPnl = false) => {
    if (!exchangeRate) return '';
    const prefix = isPnl && val > 0 ? '+' : '';
    if (currency === 'THB') {
      return `${prefix}${new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: activePortfolio?.base_currency || 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val)}`;
    }
    return `${prefix}${new Intl.NumberFormat('th-TH', { 
      style: 'currency', 
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(val * exchangeRate))}`;
  };

  const formatCurrency = (val: number) => {
    return formatPrimary(val);
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Global Time Range & Currency Selector Bar */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-4 px-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[#CBD5E1] text-sm font-semibold">Timeframe:</span>
          <span className="text-white text-sm font-bold">
            {timeRange === 'CUSTOM' && customFrom && customTo ? `${customFrom} to ${customTo}` : getRangeLabel(timeRange)}
          </span>
          <span className={clsx(
            "text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 tabular-nums",
            displayPnl >= 0 
              ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/20" 
              : "text-rose-400 bg-rose-400/10 border-rose-500/20"
          )}>
            {displayPnl >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{displayPnl >= 0 ? '+' : ''}{formatCurrency(displayPnl)} ({displayPnl >= 0 ? '+' : ''}{displayPnlPercent.toFixed(2)}%)</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
          {/* Time Range Pills */}
          <div className="flex items-center bg-[#1A1D2D] border border-[#2A2E45] p-1 rounded-2xl text-xs gap-1 overflow-x-auto custom-scrollbar">
            {(['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as DashboardTimeRange[]).map(range => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  setShowCustomModal(false);
                }}
                className={clsx(
                  "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap select-none",
                  timeRange === range
                    ? "bg-gradient-to-r from-[#FC2D79] to-[#823AFD] text-white shadow-[0_0_12px_rgba(252,45,121,0.45)]"
                    : "text-[#CBD5E1] hover:text-white hover:bg-[#2A2E45]/50"
                )}
              >
                {range}
              </button>
            ))}
            <button
              onClick={() => setShowCustomModal(!showCustomModal)}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap select-none",
                timeRange === 'CUSTOM'
                  ? "bg-gradient-to-r from-[#FC2D79] to-[#823AFD] text-white shadow-[0_0_12px_rgba(252,45,121,0.45)]"
                  : "text-[#CBD5E1] hover:text-white hover:bg-[#2A2E45]/50"
              )}
              title="Custom date range"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Custom</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Picker Inline Form */}
      {showCustomModal && (
        <div className="p-4 bg-[#111418] border border-[#2A2E45] rounded-2xl flex flex-wrap items-center gap-3 animate-fade-in text-xs shadow-md">
          <span className="text-[#CBD5E1] font-medium">From:</span>
          <input
            type="date"
            value={tempCustomFrom}
            onChange={e => setTempCustomFrom(e.target.value)}
            className="bg-[#1A1D2D] border border-[#2A2E45] text-white px-3 py-1.5 rounded-xl focus:outline-none focus:border-[#823AFD]"
          />
          <span className="text-[#CBD5E1] font-medium">To:</span>
          <input
            type="date"
            value={tempCustomTo}
            onChange={e => setTempCustomTo(e.target.value)}
            className="bg-[#1A1D2D] border border-[#2A2E45] text-white px-3 py-1.5 rounded-xl focus:outline-none focus:border-[#823AFD]"
          />
          <button
            onClick={applyCustomRange}
            disabled={!tempCustomFrom || !tempCustomTo}
            className="px-4 py-1.5 bg-gradient-to-r from-[#FC2D79] to-[#823AFD] text-white rounded-xl font-semibold cursor-pointer disabled:opacity-50 transition-all hover:opacity-90 shadow-sm"
          >
            Apply
          </button>
          <button
            onClick={() => setShowCustomModal(false)}
            className="px-4 py-1.5 bg-[#2A2E45] text-[#CBD5E1] hover:text-white rounded-xl cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 xl:gap-6">
        <StatCard 
          title="Total Net Worth" 
          value={formatPrimary(totalNetWorth)} 
          subValue={formatSecondary(totalNetWorth)}
          change={displayPnlPercent} 
          isPositive={displayPnl >= 0}
          icon={TrendingUp}
          gradient="bg-[#FC2D79]"
        />
        <StatCard 
          title="Net Invested" 
          value={formatPrimary(netInvested)} 
          subValue={formatSecondary(netInvested)}
          isPositive={true}
          icon={Landmark}
          gradient="bg-[#00E5FF]"
        />
        <StatCard 
          title={displayPnl >= 0 ? (timeRange === 'ALL' ? 'Total Profit' : `${timeRange} Profit`) : (timeRange === 'ALL' ? 'Total Loss' : `${timeRange} Loss`)} 
          value={formatPrimary(displayPnl, true)} 
          subValue={formatSecondary(displayPnl, true)}
          change={displayPnlPercent}
          isPositive={displayPnl >= 0}
          icon={DollarSign}
          gradient={displayPnl >= 0 ? "bg-[#10B981]" : "bg-[#EF4444]"}
        />
        <StatCard 
          title="Total Dividends" 
          value={formatPrimary(totalDividends)} 
          subValue={formatSecondary(totalDividends)}
          isPositive={true}
          icon={Coins}
          gradient="bg-[#F5A623]"
        />
        <StatCard 
          title="Stocks Value" 
          value={formatPrimary(totalSecuritiesValue)} 
          subValue={formatSecondary(totalSecuritiesValue)}
          change={securitiesReturnPercent}
          isPositive={securitiesReturnPercent >= 0}
          icon={PieChart}
          gradient="bg-[#823AFD]"
        />
        <StatCard 
          title="Cash" 
          value={formatPrimary(cashBalance)} 
          subValue={formatSecondary(cashBalance)}
          isPositive={true}
          icon={Wallet}
          gradient="bg-[#FC2D79]"
        />
      </div>

      {/* Ratio Bar */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6">
        <div className="flex justify-between items-center mb-2 text-sm font-medium">
          <span className="text-[#823AFD]">Stocks {securitiesWeight.toFixed(1)}%</span>
          <span className="text-[#FC2D79]">Cash {cashWeight.toFixed(1)}%</span>
        </div>
        <div className="w-full h-3 bg-[#1A1D2D] rounded-full overflow-hidden flex">
          <div className="h-full bg-gradient-to-r from-[#823AFD] to-[#6128C3] transition-all duration-1000" style={{ width: `${securitiesWeight}%` }}></div>
          <div className="h-full bg-gradient-to-r from-[#FC2D79] to-[#E0266B] transition-all duration-1000" style={{ width: `${cashWeight}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Performance Overview</h3>
              <p className="text-xs text-[#9898C8] mt-0.5">{getRangeLabel(timeRange)}</p>
            </div>
            {chartData.length > 1 && (
              <span className={clsx(
                "text-xs font-semibold px-2.5 py-1 rounded-full border",
                displayPnl >= 0 
                  ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/20" 
                  : "text-rose-400 bg-rose-400/10 border-rose-500/20"
              )}>
                {displayPnl >= 0 ? '+' : ''}{formatCurrency(displayPnl)} ({displayPnl >= 0 ? '+' : ''}{displayPnlPercent.toFixed(2)}%)
              </span>
            )}
          </div>
          <div className="w-full h-72 mt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#823AFD" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#823AFD" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2E45" vertical={false} />
                  <XAxis dataKey="name" stroke="#CBD5E1" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#CBD5E1' }} dy={10} minTickGap={30} />
                  <YAxis 
                    stroke="#CBD5E1" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 13, fill: '#CBD5E1' }} 
                    tickFormatter={(val) => {
                      if (currency === 'THB' && exchangeRate) {
                        return `฿${Math.round((val * exchangeRate) / 1000)}k`;
                      }
                      return `$${(val / 1000).toFixed(0)}k`;
                    }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111418', borderColor: '#2A2E45', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#823AFD', fontWeight: 'bold' }}
                    formatter={(val: number) => [formatCurrency(val), 'Portfolio Value']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#823AFD" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#9898C8]">
                <Activity className="w-12 h-12 mb-4 opacity-50" />
                <p>No historical data available for this timeframe.</p>
                <p className="text-sm">Try selecting a wider timeframe.</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Movers Today */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#823AFD]/20 to-[#FC2D79]/20 border border-[#2A2E45] flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#FC2D79]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Top Movers Today</h3>
                  <p className="text-xs text-[#9898C8]">หุ้นที่ผันผวนสูงสุดในรอบวัน</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-slate-300 font-semibold">
                1D Live
              </span>
            </div>

            {/* Winners */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-2 px-1">
                <LongZigzagTrendUp className="w-4.5 h-3 text-emerald-400" />
                <span>Top Gainers</span>
              </div>
              <div className="space-y-1.5">
                {topWinners.length > 0 ? topWinners.map(h => (
                  <div key={h.symbol} className="flex justify-between items-center px-3.5 py-2.5 rounded-xl bg-[#1A1D2D]/60 border border-[#2A2E45]/60 hover:border-emerald-500/40 transition-all group">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-white text-sm font-bold font-heading group-hover:text-emerald-300 transition-colors">{h.symbol}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LongZigzagTrendUp className="w-5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-white text-sm font-black tabular-nums font-prompt">
                        {formatCurrency(h.lastPrice)}
                      </span>
                      <span className="text-emerald-400 text-[13px] font-bold tabular-nums font-prompt px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        +{h.dayChangePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-xs text-[#9898C8] px-3 py-2 bg-[#1A1D2D]/40 rounded-xl">ไม่มีหุ้นที่เป็นบวกวันนี้</div>
                )}
              </div>
            </div>

            {/* Losers */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-2 px-1">
                <LongZigzagTrendDown className="w-4.5 h-3 text-rose-400" />
                <span>Top Decliners</span>
              </div>
              <div className="space-y-1.5">
                {topLosers.length > 0 ? topLosers.map(h => (
                  <div key={h.symbol} className="flex justify-between items-center px-3.5 py-2.5 rounded-xl bg-[#1A1D2D]/60 border border-[#2A2E45]/60 hover:border-rose-500/40 transition-all group">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      <span className="text-white text-sm font-bold font-heading group-hover:text-rose-300 transition-colors">{h.symbol}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LongZigzagTrendDown className="w-5 h-3.5 text-rose-400 shrink-0" />
                      <span className="text-white text-sm font-black tabular-nums font-prompt">
                        {formatCurrency(h.lastPrice)}
                      </span>
                      <span className="text-rose-400 text-[13px] font-bold tabular-nums font-prompt px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20">
                        {h.dayChangePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-xs text-[#9898C8] px-3 py-2 bg-[#1A1D2D]/40 rounded-xl">ไม่มีหุ้นที่เป็นลบวันนี้</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Full-Width Holdings Table */}
      <PortfolioTable 
        holdings={holdings} 
        formatCurrency={formatCurrency} 
        cashBalance={cashBalance}
        totalSecuritiesValue={totalSecuritiesValue}
        totalNetWorth={totalNetWorth}
      />

      {/* Row 5: Performers (2/3) + Activity (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2">
          <PerformersTable 
            holdings={holdings} 
            formatCurrency={formatCurrency} 
          />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold text-white">Activity</h3>
            <span className="text-xs text-[#9898C8] px-2 py-0.5 rounded-full bg-[#1A1D2D] border border-[#2A2E45]">
              {filteredTxs.length} {filteredTxs.length === 1 ? 'tx' : 'txs'}
            </span>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[380px] pr-2 custom-scrollbar flex-1">
            {filteredTxs.length > 0 ? filteredTxs.slice(0, 10).map(tx => {
              const typeBadge = () => {
                switch (tx.type) {
                  case 'BUY':
                    return <span className="text-[12px] font-black px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase font-prompt">BUY</span>;
                  case 'SELL':
                    return <span className="text-[12px] font-black px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/25 uppercase font-prompt">SELL</span>;
                  case 'DIVIDEND':
                    return <span className="text-[12px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25 uppercase font-prompt">DIV</span>;
                  case 'INTEREST':
                    return <span className="text-[12px] font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25 uppercase font-prompt">INT</span>;
                  case 'DEPOSIT':
                    return <span className="text-[12px] font-black px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 uppercase font-prompt">DEP</span>;
                  case 'WITHDRAW':
                    return <span className="text-[12px] font-black px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25 uppercase font-prompt">WTH</span>;
                  default:
                    return <span className="text-[12px] font-black px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-300 border border-slate-500/25 uppercase font-prompt">{tx.type.slice(0, 4)}</span>;
                }
              };

              const formattedDate = formatDateYYYYMMDD(tx.date);

              return (
                <div key={tx.id} className="p-3 rounded-2xl bg-[#1A1D2D]/70 border border-[#2A2E45]/80 hover:border-[#823AFD]/50 transition-all group">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-slate-300 font-mono tracking-tight tabular-nums font-semibold">
                        {formattedDate}
                      </span>
                      <span className="text-white text-sm font-black font-heading group-hover:text-[#823AFD] transition-colors">
                        {tx.symbol || (tx.asset === 'Cash' ? 'CASH' : tx.type)}
                      </span>
                      {typeBadge()}
                    </div>
                    <span className={clsx("font-black text-sm tabular-nums font-prompt", tx.type === 'SELL' || tx.type === 'DEPOSIT' || tx.type === 'DIVIDEND' ? "text-emerald-400" : "text-white")}>
                      {tx.type === 'SELL' || tx.type === 'DEPOSIT' || tx.type === 'DIVIDEND' ? '+' : '-'}{formatCurrency(tx.amount * (tx.price || 1))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] text-slate-300 pt-1 border-t border-[#2A2E45]/40 font-prompt">
                    <span className="tabular-nums">
                      {tx.symbol && tx.amount ? `${Number(tx.amount).toLocaleString('en-US', { maximumFractionDigits: 4 })} shares` : (tx.asset || 'Cash Flow')}
                    </span>
                    {tx.price > 0 && tx.symbol ? (
                      <span className="tabular-nums text-slate-200 font-semibold">
                        @ {formatCurrency(tx.price)}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="py-12 text-center text-[#9898C8]">
                <p className="text-sm">No transactions during {getRangeLabel(timeRange).toLowerCase()}.</p>
                <button
                  onClick={() => setTimeRange('ALL')}
                  className="mt-3 text-xs text-[#823AFD] hover:underline cursor-pointer font-medium"
                >
                  View all transactions
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
