import React, { useState, useMemo } from 'react';
import { Holding } from '../../../hooks/useHoldings';
import { Transaction } from '../../../types';
import { DashboardTimeRange } from '../../../components/dashboard/MultiPeriodReturnStrip';
import { 
  ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis 
} from 'recharts';
import { 
  ArrowLeft, TrendingUp, TrendingDown, Layers, Landmark, 
  Activity, Coins, ArrowUpRight, ArrowDownRight, Clock, FileText 
} from 'lucide-react';
import clsx from 'clsx';

interface DetailInspectorProps {
  selectedStock: string | null;
  onClearSelected: () => void;
  holdings: Holding[];
  cashBalance: number;
  totalNetWorth: number;
  totalPnl: number;
  totalPnlPercent: number;
  todaysProfit: number;
  todaysProfitPercent: number;
  totalDividends: number;
  dividendYieldOnCost: number;
  netInvested: number;
  chartData: Array<{ date: string; value: number }>;
  timeRange: DashboardTimeRange;
  onRangeChange: (r: DashboardTimeRange) => void;
  formatCurrency: (val: number, isChange?: boolean) => string;
  historical: Record<string, any[]>;
  transactions: Transaction[];
}

const STOCK_TIME_RANGES = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as const;

export const DetailInspector: React.FC<DetailInspectorProps> = ({
  selectedStock,
  onClearSelected,
  holdings,
  cashBalance,
  totalNetWorth,
  totalPnl,
  totalPnlPercent,
  todaysProfit,
  todaysProfitPercent,
  totalDividends,
  dividendYieldOnCost,
  netInvested,
  chartData,
  timeRange,
  onRangeChange,
  formatCurrency,
  historical,
  transactions,
}) => {
  const [stockRange, setStockRange] = useState<string>('1M');

  // If a stock is selected, get its holding & transaction history
  const activeHolding = useMemo(() => {
    if (!selectedStock) return null;
    return holdings.find((h) => h.symbol === selectedStock) || null;
  }, [selectedStock, holdings]);

  // Stock historical chart data
  const stockChartData = useMemo(() => {
    if (!selectedStock || !historical[selectedStock]) return [];
    const hist = historical[selectedStock];
    if (!hist || hist.length === 0) return [];

    let sliceDays = 30;
    if (stockRange === '1W') sliceDays = 7;
    else if (stockRange === '1M') sliceDays = 30;
    else if (stockRange === '3M') sliceDays = 90;
    else if (stockRange === 'YTD') {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      sliceDays = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    } else if (stockRange === '1Y') sliceDays = 365;
    else if (stockRange === 'ALL') sliceDays = 9999;

    const sliced = hist.slice(-sliceDays);
    return sliced.map((d) => ({
      date: d.date,
      name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: typeof d.close === 'number' ? d.close : d.adj_close || d.price || 0,
    }));
  }, [selectedStock, historical, stockRange]);

  // Stock transactions
  const stockTransactions = useMemo(() => {
    if (!selectedStock) return [];
    return transactions
      .filter((t) => t.symbol === selectedStock)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [selectedStock, transactions]);

  // Top Movers
  const topWinners = useMemo(
    () => [...holdings].filter((h) => h.dayChangePercent > 0).sort((a, b) => b.dayChangePercent - a.dayChangePercent).slice(0, 3),
    [holdings]
  );
  const topLosers = useMemo(
    () => [...holdings].filter((h) => h.dayChangePercent < 0).sort((a, b) => a.dayChangePercent - b.dayChangePercent).slice(0, 3),
    [holdings]
  );

  // ==========================================
  // MODE B: STOCK INSPECTOR
  // ==========================================
  if (activeHolding) {
    const isPositive = activeHolding.dayChangePercent >= 0;
    const isTotalPos = activeHolding.totalReturn >= 0;
    const strokeColor = isPositive ? '#10B981' : '#F43F5E';

    return (
      <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 space-y-6 select-none animate-fade-in">
        {/* Top Bar: Back Button & Symbol Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClearSelected}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer font-heading"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Watchlist Overview</span>
          </button>

          <span className="text-xs px-2.5 py-1 rounded-full bg-[#823AFD]/20 text-[#823AFD] font-mono font-bold border border-[#823AFD]/30">
            {activeHolding.weightPercent.toFixed(1)}% of Portfolio
          </span>
        </div>

        {/* Stock Title & Live Price */}
        <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-400 font-heading">SELECTED ASSET</div>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight mt-0.5">
                {activeHolding.symbol}
              </h1>
              <div className="text-xs text-slate-400 mt-0.5">
                Holding {activeHolding.quantity} shares
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tabular-nums">
                {formatCurrency(activeHolding.lastPrice)}
              </div>
              <div className={clsx(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold font-mono tracking-tight mt-1 border",
                isPositive
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              )}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {formatCurrency(activeHolding.dayChange, true)} ({isPositive ? '+' : ''}{activeHolding.dayChangePercent.toFixed(2)}%) Today
                </span>
              </div>
            </div>
          </div>

          {/* Price Chart */}
          <div className="w-full h-56 sm:h-64 mt-6">
            {stockChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockChartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                      <stop offset="90%" stopColor={strokeColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#0D1019',
                      borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val: number) => [formatCurrency(val), 'Price']}
                  />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} domain={['dataMin - 1', 'dataMax + 1']} orientation="right" tickLine={false} />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={strokeColor} 
                    strokeWidth={2.5}
                    fill="url(#stockGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                Loading stock chart data...
              </div>
            )}
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center justify-end gap-1.5 mt-4 pt-3 border-t border-white/[0.04]">
            {STOCK_TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setStockRange(r)}
                className={clsx(
                  "px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer",
                  stockRange === r
                    ? "bg-[#823AFD] text-white shadow-sm"
                    : "text-slate-400 hover:text-white bg-white/[0.04]"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Position Details 4-Card Grid */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 font-heading">
            📋 Position Details
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-4">
              <div className="text-[11px] text-slate-400">Shares Owned</div>
              <div className="text-lg font-black text-white font-mono mt-1">
                {activeHolding.quantity}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Val: {formatCurrency(activeHolding.currentValue)}
              </div>
            </div>

            <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-4">
              <div className="text-[11px] text-slate-400">Avg Cost</div>
              <div className="text-lg font-black text-white font-mono mt-1">
                {formatCurrency(activeHolding.avgCost)}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Total: {formatCurrency(activeHolding.totalCost)}
              </div>
            </div>

            <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-4">
              <div className="text-[11px] text-slate-400">Total Return</div>
              <div className={clsx("text-lg font-black font-mono mt-1", isTotalPos ? "text-emerald-400" : "text-rose-400")}>
                {isTotalPos ? '+' : ''}{formatCurrency(activeHolding.totalReturn, true)}
              </div>
              <div className={clsx("text-[10px] font-mono font-bold mt-0.5", isTotalPos ? "text-emerald-400" : "text-rose-400")}>
                {isTotalPos ? '+' : ''}{activeHolding.totalReturnPercent.toFixed(2)}%
              </div>
            </div>

            <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-4">
              <div className="text-[11px] text-slate-400">Portfolio Weight</div>
              <div className="text-lg font-black text-[#823AFD] font-mono mt-1">
                {activeHolding.weightPercent.toFixed(2)}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Allocation
              </div>
            </div>
          </div>
        </div>

        {/* Recent Orders for this stock */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-400 font-heading">
            🕒 Recent Orders
          </div>
          <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl overflow-hidden shadow-sm">
            {stockTransactions.length > 0 ? (
              <div className="divide-y divide-white/[0.04]">
                {stockTransactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-md font-bold font-mono text-[10px]",
                        tx.type === 'BUY' ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      )}>
                        {tx.type}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {tx.date.split('T')[0]}
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-white font-bold">{tx.quantity} sh</span>
                      <span className="text-slate-400 ml-2">@ {formatCurrency(tx.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 font-mono">
                No recent transaction history recorded
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MODE A: PORTFOLIO OVERVIEW (Default)
  // ==========================================
  const isPositive = totalPnl >= 0;
  const strokeColor = isPositive ? '#10B981' : '#F43F5E';
  const TIME_RANGES: { id: DashboardTimeRange; label: string }[] = [
    { id: '1D', label: '1D' },
    { id: '1W', label: '1W' },
    { id: '1M', label: '1M' },
    { id: '3M', label: '3M' },
    { id: 'YTD', label: 'YTD' },
    { id: 'ALL', label: 'ALL' },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 space-y-6 select-none animate-fade-in">
      {/* 1. Large Net Worth Hero Card */}
      <div className="bg-[#0D1019]/95 border border-white/[0.08] rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-400 font-heading">
              PORTFOLIO OVERVIEW
            </div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-heading tracking-tight mt-1 tabular-nums">
              {formatCurrency(totalNetWorth)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className={clsx(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold font-mono tracking-tight border",
                isPositive
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              )}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {formatCurrency(totalPnl, true)} ({isPositive ? '+' : ''}{totalPnlPercent.toFixed(2)}%) Total Return
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Today: {todaysProfit >= 0 ? '+' : ''}{formatCurrency(todaysProfit, true)} ({todaysProfitPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Timeframe pills */}
          <div className="flex items-center gap-1 bg-[#07090E] p-1 rounded-2xl border border-white/[0.06]">
            {TIME_RANGES.map((item) => (
              <button
                key={item.id}
                onClick={() => onRangeChange(item.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer",
                  timeRange === item.id
                    ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Equity Area Chart */}
        <div className="w-full h-56 sm:h-64 mt-6">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35}/>
                    <stop offset="90%" stopColor={strokeColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0D1019',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: number) => [formatCurrency(val), 'Net Worth']}
                />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} domain={['dataMin - 100', 'dataMax + 100']} orientation="right" tickLine={false} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={strokeColor} 
                  strokeWidth={2.5}
                  fill="url(#overviewGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
              No chart data available
            </div>
          )}
        </div>
      </div>

      {/* 2. Key Metrics 4-Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Net Invested</span>
            <Landmark className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-white font-mono">
            {formatCurrency(netInvested)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Principal Base</div>
        </div>

        <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Total Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className={clsx("text-base sm:text-lg font-black font-mono", isPositive ? "text-emerald-400" : "text-rose-400")}>
            {isPositive ? '+' : ''}{formatCurrency(totalPnl, true)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {totalPnlPercent.toFixed(2)}% ROI
          </div>
        </div>

        <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Dividends</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-amber-400 font-mono">
            {formatCurrency(totalDividends)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {dividendYieldOnCost.toFixed(2)}% Yield
          </div>
        </div>

        <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Cash Reserves</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base sm:text-lg font-black text-white font-mono">
            {formatCurrency(cashBalance)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {totalNetWorth > 0 ? ((cashBalance / totalNetWorth) * 100).toFixed(1) : 0}% Liquid
          </div>
        </div>
      </div>

      {/* 3. Top Movers (Winners & Losers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Winners */}
        <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400 font-heading">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" />
              Top Gainers Today
            </span>
          </div>
          <div className="space-y-1.5">
            {topWinners.length > 0 ? (
              topWinners.map((w) => (
                <div key={w.symbol} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/[0.02]">
                  <span className="font-black text-white font-heading">{w.symbol}</span>
                  <span className="font-bold text-emerald-400 font-mono">+{w.dayChangePercent.toFixed(2)}%</span>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-slate-500 py-2 text-center">No gainers today</div>
            )}
          </div>
        </div>

        {/* Losers */}
        <div className="bg-[#0D1019]/90 border border-white/[0.08] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-rose-400 font-heading">
            <span className="flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4" />
              Top Decliners Today
            </span>
          </div>
          <div className="space-y-1.5">
            {topLosers.length > 0 ? (
              topLosers.map((l) => (
                <div key={l.symbol} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/[0.02]">
                  <span className="font-black text-white font-heading">{l.symbol}</span>
                  <span className="font-bold text-rose-400 font-mono">{l.dayChangePercent.toFixed(2)}%</span>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-slate-500 py-2 text-center">No decliners today</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
