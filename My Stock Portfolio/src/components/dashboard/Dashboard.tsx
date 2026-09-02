import React, { useEffect, useMemo } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePriceStore } from '../../stores/priceStore';
import { useHoldings } from '../../hooks/useHoldings';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Activity, DollarSign, PieChart } from 'lucide-react';
import clsx from 'clsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PortfolioTable } from './PortfolioTable';
import { PerformersTable } from './PerformersTable';

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
      <h3 className="text-[#9898C8] font-medium mb-1">{title}</h3>
      <div className="text-3xl font-bold text-white tabular-nums tracking-tight">
        {value}
      </div>
      {subValue && (
        <div className="text-[#9898C8] text-sm mt-1">
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
    todaysProfitPercent 
  } = useHoldings();

  const activeSymbols = holdings.map(h => h.symbol);
  
  useEffect(() => {
    if (activeSymbols.length > 0) {
      fetchPrices(activeSymbols);
      const to = new Date().toISOString().split('T')[0];
      const fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - 6);
      const from = fromDate.toISOString().split('T')[0];
      fetchHistorical(activeSymbols, from, to);
    }
  }, [JSON.stringify(activeSymbols), fetchPrices, fetchHistorical]);

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

    return sortedDates.map(date => {
      let dailyCash = activePortfolio?.initial_cash || 0;
      let dailyHolds: Record<string, number> = {};

      for (const tx of chronologicalTxs) {
        const eodTarget = new Date(date);
        eodTarget.setHours(23, 59, 59, 999);
        if (new Date(tx.date).getTime() > eodTarget.getTime()) break;

        if (tx.type === 'BUY') {
          dailyCash -= (tx.amount * tx.price) + (tx.fee || 0);
          dailyHolds[tx.symbol] = (dailyHolds[tx.symbol] || 0) + tx.amount;
        } else if (tx.type === 'SELL') {
          dailyCash += (tx.amount * tx.price) - (tx.fee || 0);
          dailyHolds[tx.symbol] = (dailyHolds[tx.symbol] || 0) - tx.amount;
        } else if (tx.type === 'DEPOSIT' || tx.type === 'DIVIDEND' || tx.type === 'INTEREST') {
          dailyCash += tx.amount;
        } else if (tx.type === 'WITHDRAW') {
          dailyCash -= tx.amount;
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
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: dailyCash + dailyStockValue
      };
    });
  }, [historical, transactions, activePortfolio, activeSymbols]);

  const formatCurrency = (val: number, usdOnly = false) => {
    const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: activePortfolio?.base_currency || 'USD' }).format(val);
    if (usdOnly || !exchangeRate) return usd;
    const thb = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val * exchangeRate);
    return `${usd} (${thb})`;
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Net Worth" 
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: activePortfolio?.base_currency || 'USD' }).format(totalNetWorth)} 
          subValue={exchangeRate ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(totalNetWorth * exchangeRate) : ''}
          change={todaysProfitPercent} 
          isPositive={todaysProfit >= 0}
          icon={TrendingUp}
          gradient="bg-[#FC2D79]"
        />
        <StatCard 
          title="Securities Value" 
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: activePortfolio?.base_currency || 'USD' }).format(totalSecuritiesValue)} 
          subValue={exchangeRate ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(totalSecuritiesValue * exchangeRate) : ''}
          change={securitiesReturnPercent}
          isPositive={securitiesReturnPercent >= 0}
          icon={PieChart}
          gradient="bg-[#823AFD]"
        />
        <StatCard 
          title="Cash Balance" 
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: activePortfolio?.base_currency || 'USD' }).format(cashBalance)} 
          subValue={exchangeRate ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(cashBalance * exchangeRate) : ''}
          isPositive={true}
          icon={Wallet}
          gradient="bg-[#FC2D79]"
        />
        <StatCard 
          title="Total P/L" 
          value={`${totalPnl >= 0 ? '+' : ''}${new Intl.NumberFormat('en-US', { style: 'currency', currency: activePortfolio?.base_currency || 'USD' }).format(totalPnl)}`} 
          subValue={exchangeRate ? `${totalPnl >= 0 ? '+' : ''}${new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(totalPnl * exchangeRate)}` : ''}
          change={totalPnlPercent}
          isPositive={totalPnl >= 0}
          icon={DollarSign}
          gradient="bg-[#823AFD]"
        />
      </div>

      {/* Ratio Bar */}
      <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6">
        <div className="flex justify-between items-center mb-2 text-sm font-medium">
          <span className="text-[#823AFD]">Securities {securitiesWeight.toFixed(1)}%</span>
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
            <h3 className="text-xl font-bold text-white">Performance Overview (6M)</h3>
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
                  <XAxis dataKey="name" stroke="#9898C8" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} minTickGap={30} />
                  <YAxis stroke="#9898C8" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111418', borderColor: '#2A2E45', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#823AFD', fontWeight: 'bold' }}
                    formatter={(val: number) => formatCurrency(val, true)}
                  />
                  <Area type="monotone" dataKey="value" stroke="#823AFD" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#9898C8]">
                <Activity className="w-12 h-12 mb-4 opacity-50" />
                <p>No historical data available.</p>
                <p className="text-sm">Add stock transactions to see performance.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
          <div className="space-y-4 overflow-y-auto max-h-[320px] pr-2 custom-scrollbar">
            {recentTxs.length > 0 ? recentTxs.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-[#1A1D2D] border border-[#2A2E45] hover:border-[#823AFD] transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0F111A] flex items-center justify-center border border-[#2A2E45]">
                    <span className="text-[#9898C8] text-xs font-bold">{tx.symbol || tx.type.slice(0, 3)}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium group-hover:text-[#823AFD] transition-colors">
                      {tx.type === 'BUY' ? 'Bought' : tx.type === 'SELL' ? 'Sold' : tx.type} {tx.symbol}
                    </p>
                    <p className="text-[#9898C8] text-xs">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={clsx("font-bold tabular-nums", tx.type === 'SELL' || tx.type === 'DEPOSIT' ? "text-green-400" : "text-white")}>
                    {tx.type === 'SELL' || tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(tx.amount * (tx.price || 1), true)}
                  </p>
                  {tx.symbol && <p className="text-[#823AFD] text-xs font-medium">{tx.amount} Shares</p>}
                </div>
              </div>
            )) : (
              <p className="text-center text-[#9898C8] mt-10">No recent activity.</p>
            )}
          </div>
        </div>
      </div>

      <PortfolioTable 
        holdings={holdings} 
        formatCurrency={formatCurrency} 
        cashBalance={cashBalance}
        totalSecuritiesValue={totalSecuritiesValue}
        totalNetWorth={totalNetWorth}
      />
      <PerformersTable 
        holdings={holdings} 
        formatCurrency={formatCurrency} 
      />
    </div>
  );
};
