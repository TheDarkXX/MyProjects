import React, { useMemo, useState } from 'react';
import { Transaction } from '../../types';
import { useHoldings } from '../../hooks/useHoldings';
import { usePriceStore } from '../../stores/priceStore';
import { useUiStore } from '../../stores/uiStore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Coins, DollarSign, Sparkles, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';

interface CapitalGrowthChartProps {
  transactions: Transaction[];
  initialCash?: number;
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export const CapitalGrowthChart: React.FC<CapitalGrowthChartProps> = ({ transactions, initialCash = 0 }) => {
  const { historical, exchangeRate, fetchExchangeRate } = usePriceStore();
  const { currency } = useUiStore();
  const [range, setRange] = useState<TimeRange>('ALL');

  React.useEffect(() => {
    if (!exchangeRate || exchangeRate === 0) {
      fetchExchangeRate('USD', 'THB');
    }
  }, [exchangeRate, fetchExchangeRate]);

  const currSymbol = currency === 'THB' ? '฿' : '$';
  const formatMoney = (usd: number) => {
    const rate = currency === 'THB' ? (exchangeRate > 0 ? exchangeRate : 35) : 1;
    const val = usd * rate;
    return `${currSymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Compute daily series: cumulative net invested vs portfolio valuation
  const { chartData, latestInvested, latestValue, organicGain, organicGainPct } = useMemo(() => {
    const confirmedTxs = transactions
      .filter(t => t.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (confirmedTxs.length === 0) {
      return { chartData: [], latestInvested: 0, latestValue: 0, organicGain: 0, organicGainPct: 0 };
    }

    const startDate = new Date(new Date(confirmedTxs[0].date).toISOString().split('T')[0]);
    const today = new Date();

    let runningCash = initialCash;
    let runningNetInvested = initialCash;
    const runningHoldings: Record<string, number> = {};
    const lastKnownPrices: Record<string, number> = {};

    // Get all historical dates across price cache
    const series: { date: string; invested: number; value: number; gain: number }[] = [];

    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      // Process txs on this date
      const daysTxs = confirmedTxs.filter(t => new Date(t.date).toISOString().split('T')[0] === dateStr);
      daysTxs.forEach(t => {
        const amount = t.amount || 0;
        const price = t.price || 0;
        const fee = t.fee || 0;
        const isCash = t.asset === 'Cash' || t.symbol === 'CASH';

        switch (t.type) {
          case 'DEPOSIT':
            runningCash += amount;
            runningNetInvested += amount;
            break;
          case 'WITHDRAW':
            runningCash -= amount;
            runningNetInvested -= amount;
            break;
          case 'BUY':
            if (isCash) {
              runningCash += amount;
              runningNetInvested += amount;
            } else {
              runningCash -= (amount * price + fee);
              runningHoldings[t.symbol] = (runningHoldings[t.symbol] || 0) + amount;
              if (price > 0 && !lastKnownPrices[t.symbol]) lastKnownPrices[t.symbol] = price;
            }
            break;
          case 'SELL':
            if (isCash) {
              runningCash -= amount;
              runningNetInvested -= amount;
            } else {
              runningCash += (amount * price - fee);
              runningHoldings[t.symbol] = (runningHoldings[t.symbol] || 0) - amount;
            }
            break;
          case 'DIVIDEND':
          case 'INTEREST':
            runningCash += (amount - fee);
            break;
        }
      });

      // Update known prices
      Object.keys(runningHoldings).forEach(sym => {
        const history = historical[sym] || [];
        const pt = history.find(p => p.date === dateStr);
        if (pt && pt.price > 0) {
          lastKnownPrices[sym] = pt.price;
        }
      });

      // Calculate total portfolio value today
      let securitiesVal = 0;
      Object.entries(runningHoldings).forEach(([sym, qty]) => {
        if (qty > 0) {
          const p = lastKnownPrices[sym] || 0;
          securitiesVal += qty * p;
        }
      });

      const totalValue = runningCash + securitiesVal;
      const gain = totalValue - runningNetInvested;

      series.push({
        date: dateStr,
        invested: Math.max(0, runningNetInvested),
        value: Math.max(0, totalValue),
        gain: gain,
      });
    }

    // Filter by range
    let filtered = series;
    const now = new Date();
    let filterStart = new Date();
    switch (range) {
      case '1M':
        filterStart.setMonth(now.getMonth() - 1);
        break;
      case '3M':
        filterStart.setMonth(now.getMonth() - 3);
        break;
      case '6M':
        filterStart.setMonth(now.getMonth() - 6);
        break;
      case '1Y':
        filterStart.setFullYear(now.getFullYear() - 1);
        break;
      case 'ALL':
      default:
        filterStart = new Date('2020-01-01');
        break;
    }

    const filterStartStr = filterStart.toISOString().split('T')[0];
    filtered = series.filter(s => s.date >= filterStartStr);

    const lastPt = series[series.length - 1] || { invested: 0, value: 0, gain: 0 };
    const latestInvested = lastPt.invested;
    const latestValue = lastPt.value;
    const organicGain = latestValue - latestInvested;
    const organicGainPct = latestInvested > 0 ? (organicGain / latestInvested) * 100 : 0;

    return {
      chartData: filtered,
      latestInvested,
      latestValue,
      organicGain,
      organicGainPct,
    };
  }, [transactions, initialCash, historical, range]);

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-rose-500 to-amber-600 flex items-center justify-center shadow-[0_4px_12px_rgba(245,158,11,0.3)]">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Capital Growth & Organic Wealth
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
                  Net Invested vs Equity
                </span>
              </h3>
              <p className="text-xs text-[#9898C8]">
                เปรียบเทียบเงินต้นจริงที่เติมเข้าพอร์ต vs มูลค่าสินทรัพย์รวม (ส่วนต่างคือกำไรทบต้นที่แท้จริง)
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center bg-[#1A1D2D] p-1 rounded-xl border border-[#2A2E45] gap-1 self-start lg:self-auto">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={clsx(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                range === r
                  ? "bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm"
                  : "text-[#9898C8] hover:text-white"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Metric Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9898C8]">Net Invested Capital (เงินต้นสุทธิ)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
          </div>
          <span className="text-2xl font-black text-white tabular-nums tracking-tight mt-1 block">
            {formatMoney(latestInvested)}
          </span>
          <span className="text-[11px] text-rose-400/80 block mt-0.5">รวมเงินเติมทั้งหมด หักเงินถอน (เส้นประแดง)</span>
        </div>

        <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9898C8]">Current Portfolio Value (มูลค่าปัจจุบัน)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
          </div>
          <span className="text-2xl font-black text-amber-400 tabular-nums tracking-tight mt-1 block">
            {formatMoney(latestValue)}
          </span>
          <span className="text-[11px] text-amber-300/80 font-medium block mt-0.5">สินทรัพย์ + เงินสดคงเหลือ (เส้นสีทอง)</span>
        </div>

        <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
          <span className="text-xs font-semibold text-[#9898C8] block">Organic Wealth Created (กำไรทบต้นเพียวๆ)</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx("text-2xl font-black tabular-nums tracking-tight", organicGain >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {organicGain >= 0 ? '+' : ''}{formatMoney(organicGain)}
            </span>
            <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-md", organicGain >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
              {organicGain >= 0 ? '+' : ''}{organicGainPct.toFixed(1)}%
            </span>
          </div>
          <span className="text-[11px] text-[#9898C8] block mt-0.5">ส่วนต่างความมั่งคั่งจากพลังตลาด</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-80 w-full pt-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="growthValueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#FBBF24" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" />
              <XAxis 
                dataKey="date" 
                stroke="#94A3B8" 
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                stroke="#94A3B8" 
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => {
                  const rate = currency === 'THB' ? (exchangeRate > 0 ? exchangeRate : 35) : 1;
                  const v = val * rate;
                  return `${currSymbol}${v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}`;
                }}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#161926', borderColor: '#2A2E45', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any, name: string) => [
                  formatMoney(Number(val)),
                  name === 'value' ? 'Portfolio Value (มูลค่ารวม - สีทอง)' : 'Net Invested (เงินต้น - สีแดง)'
                ]}
                labelFormatter={(label) => `วันที่: ${new Date(label).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`}
              />
              <Area 
                type="monotone" 
                dataKey="invested" 
                stroke="#F43F5E" 
                strokeWidth={2} 
                strokeDasharray="4 4"
                fillOpacity={1} 
                fill="url(#investedGradient)" 
                name="invested"
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#FBBF24" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#growthValueGradient)" 
                name="value"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-[#9898C8]">
            No transactions recorded yet to calculate capital growth.
          </div>
        )}
      </div>
    </div>
  );
};
