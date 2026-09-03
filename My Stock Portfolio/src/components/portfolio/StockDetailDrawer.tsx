import React, { useEffect, useMemo, useState } from 'react';
import { X, TrendingUp, TrendingDown, Layers, Calendar, DollarSign, PieChart, Shield, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useHoldings, Holding } from '../../hooks/useHoldings';
import { useTransactionStore } from '../../stores/transactionStore';
import { usePriceStore } from '../../stores/priceStore';
import { useUiStore } from '../../stores/uiStore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

interface StockDetailDrawerProps {
  symbol: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type ChartRange = '1M' | '3M' | '1Y' | 'ALL';

export const StockDetailDrawer: React.FC<StockDetailDrawerProps> = ({ symbol, isOpen, onClose }) => {
  const { holdings } = useHoldings();
  const { transactions } = useTransactionStore();
  const { historical, fetchHistorical } = usePriceStore();
  const { currency, exchangeRate } = useUiStore();
  const [chartRange, setChartRange] = useState<ChartRange>('3M');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Fetch historical if not cached
  useEffect(() => {
    if (symbol && isOpen) {
      if (!historical[symbol] || historical[symbol].length === 0) {
        const to = new Date().toISOString().split('T')[0];
        fetchHistorical([symbol], '2023-01-01', to);
      }
    }
  }, [symbol, isOpen, historical, fetchHistorical]);

  // Find holding details
  const holding: Holding | undefined = useMemo(() => {
    if (!symbol) return undefined;
    return holdings.find(h => h.symbol.toUpperCase() === symbol.toUpperCase());
  }, [symbol, holdings]);

  // Filter transactions for this symbol
  const stockTransactions = useMemo(() => {
    if (!symbol) return [];
    return transactions
      .filter(t => t.symbol?.toUpperCase() === symbol.toUpperCase() && t.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [symbol, transactions]);

  // Filter historical data points for mini-chart
  const chartData = useMemo(() => {
    if (!symbol || !historical[symbol]) return [];
    const pts = historical[symbol];
    if (pts.length === 0) return [];

    const now = new Date();
    let startDate = new Date();
    switch (chartRange) {
      case '1M':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
      default:
        startDate = new Date('2020-01-01');
        break;
    }

    const startStr = startDate.toISOString().split('T')[0];
    return pts
      .filter(p => p.date >= startStr)
      .map(p => ({
        date: p.date,
        price: p.price,
      }));
  }, [symbol, historical, chartRange]);

  if (!isOpen || !symbol) return null;

  const currSymbol = currency === 'THB' ? '฿' : '$';
  const formatMoney = (usd: number) => {
    const val = currency === 'THB' ? usd * exchangeRate : usd;
    return `${currSymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isProfit = (holding?.totalReturn ?? 0) >= 0;
  const isDayProfit = (holding?.dayChangePercent ?? 0) >= 0;

  // Lifecycle stage badge styling
  const getStageBadge = (type?: string | null) => {
    switch (type) {
      case 'Small Cap':
        return { label: 'Small / Mid Cap', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'Hyper Growth':
      case 'Winner':
        return { label: 'Hyper Growth', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'Core Compounder':
      case 'Compound':
        return { label: 'Core Compounder', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'Dividend Growth':
        return { label: 'Dividend Growth', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      default:
        return { label: type || 'Equity', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
    }
  };

  const stageBadge = getStageBadge(holding?.stockType);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl h-full bg-[#0F111A] border-l border-[#2A2E45] shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-[#2A2E45] flex items-center justify-between bg-[#161926]/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#823AFD] via-[#FC2D79] to-[#FD5514] flex items-center justify-center text-white font-black text-lg shadow-[0_4px_16px_rgba(130,58,253,0.3)]">
              {symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-black text-white tracking-tight">{symbol}</h3>
                <span className={clsx("text-xs px-2.5 py-0.5 rounded-full border font-semibold", stageBadge.color)}>
                  {stageBadge.label}
                </span>
              </div>
              <p className="text-xs text-[#9898C8] mt-0.5 font-medium">
                {holding?.sector || 'Multi-Asset'} • {holding?.quantity || 0} Shares Owned
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1A1D2D] text-[#9898C8] hover:text-white hover:bg-[#2A2E45] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Key Metrics Banner */}
          <div className="bg-[#161926] border border-[#2A2E45] rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-[#9898C8]">Current Market Price</span>
                <div className="text-3xl font-black text-white tabular-nums tracking-tight mt-1">
                  {formatMoney(holding?.lastPrice || 0)}
                </div>
                <div className={clsx("inline-flex items-center gap-1 text-xs font-bold mt-1 px-2 py-0.5 rounded-md", 
                  isDayProfit ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                )}>
                  {isDayProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  <span>{holding?.dayChangePercent ? `${holding.dayChangePercent > 0 ? '+' : ''}${holding.dayChangePercent.toFixed(2)}% (Today)` : '0.00%'}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-[#9898C8]">Total Return (All-Time)</span>
                <div className={clsx("text-2xl font-black tabular-nums tracking-tight mt-1", isProfit ? "text-emerald-400" : "text-rose-400")}>
                  {isProfit ? '+' : ''}{formatMoney(holding?.totalReturn || 0)}
                </div>
                <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-md inline-block mt-1", 
                  isProfit ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                )}>
                  {isProfit ? '+' : ''}{(holding?.totalReturnPercent || 0).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Sub-grid of holdings stats */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#2A2E45]/80">
              <div className="bg-[#1A1D2D]/60 p-3 rounded-xl border border-[#2A2E45]/60">
                <span className="text-[11px] font-medium text-[#9898C8] block">Market Value</span>
                <span className="text-sm font-bold text-white tabular-nums mt-0.5 block">
                  {formatMoney(holding?.currentValue || 0)}
                </span>
              </div>
              <div className="bg-[#1A1D2D]/60 p-3 rounded-xl border border-[#2A2E45]/60">
                <span className="text-[11px] font-medium text-[#9898C8] block">Cost Basis (Avg)</span>
                <span className="text-sm font-bold text-white tabular-nums mt-0.5 block">
                  {formatMoney(holding?.avgCost || 0)}
                </span>
              </div>
              <div className="bg-[#1A1D2D]/60 p-3 rounded-xl border border-[#2A2E45]/60">
                <span className="text-[11px] font-medium text-[#9898C8] block">Portfolio Weight</span>
                <span className="text-sm font-bold text-[#823AFD] tabular-nums mt-0.5 block">
                  {(holding?.portfolioPercent || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Mini Price History Chart */}
          <div className="bg-[#161926] border border-[#2A2E45] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#823AFD]" />
                <h4 className="text-sm font-bold text-white">Price Action</h4>
              </div>
              <div className="flex items-center bg-[#1A1D2D] p-1 rounded-xl border border-[#2A2E45] gap-1">
                {(['1M', '3M', '1Y', 'ALL'] as ChartRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className={clsx(
                      "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                      chartRange === r
                        ? "bg-[#823AFD] text-white shadow-sm"
                        : "text-[#9898C8] hover:text-white"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-44 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="drawerPriceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#823AFD" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#823AFD" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1D2D', borderColor: '#2A2E45', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Price']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <YAxis domain={['auto', 'auto']} hide={true} />
                    <Area type="monotone" dataKey="price" stroke="#823AFD" strokeWidth={2} fillOpacity={1} fill="url(#drawerPriceGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#9898C8]">
                  Loading price chart...
                </div>
              )}
            </div>
          </div>

          {/* Buy Lots / Transaction History */}
          <div className="bg-[#161926] border border-[#2A2E45] rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FC2D79]" />
                <h4 className="text-sm font-bold text-white">Buy Lots & Transactions</h4>
              </div>
              <span className="text-xs text-[#9898C8] font-semibold">
                {stockTransactions.length} Events
              </span>
            </div>

            {stockTransactions.length === 0 ? (
              <p className="text-xs text-[#9898C8] text-center py-6">No transactions found for {symbol}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2A2E45] text-[#9898C8]">
                      <th className="text-left pb-2 font-semibold">Date</th>
                      <th className="text-center pb-2 font-semibold">Type</th>
                      <th className="text-right pb-2 font-semibold">Shares</th>
                      <th className="text-right pb-2 font-semibold">Price</th>
                      <th className="text-right pb-2 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2E45]/60">
                    {stockTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 text-white font-medium whitespace-nowrap">
                          {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={clsx("px-2 py-0.5 rounded font-bold text-[10px]", 
                            t.type === 'BUY' ? "bg-blue-500/20 text-blue-400" :
                            t.type === 'SELL' ? "bg-rose-500/20 text-rose-400" :
                            "bg-amber-500/20 text-amber-400"
                          )}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-white tabular-nums">
                          {t.amount}
                        </td>
                        <td className="py-2.5 text-right text-[#CBD5E1] tabular-nums">
                          ${(t.price || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-bold text-white tabular-nums">
                          ${((t.amount || 0) * (t.price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
