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
          <span className="text-sm text-rose-300 font-medium block mt-1">รวมเงินเติมทั้งหมด หักเงินถอน (เส้นประแดง)</span>
        </div>

        <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#CBD5E1]">Current Portfolio Value (มูลค่าปัจจุบัน)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]"></span>
          </div>
          <span className="text-2xl font-black text-amber-400 tabular-nums tracking-tight mt-1 block">
            {formatMoney(latestValue)}
          </span>
          <span className="text-sm text-amber-300 font-medium block mt-1">สินทรัพย์ + เงินสดคงเหลือ (เส้นสีทอง)</span>
        </div>

        <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
          <span className="text-xs font-semibold text-[#CBD5E1] block">Organic Wealth Created (กำไรทบต้นเพียวๆ)</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx("text-2xl font-black tabular-nums tracking-tight", organicGain >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {organicGain >= 0 ? '+' : ''}{formatMoney(organicGain)}
            </span>
            <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-md", organicGain >= 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300")}>
              {organicGain >= 0 ? '+' : ''}{organicGainPct.toFixed(1)}%
            </span>
          </div>
          <span className="text-sm text-slate-300 font-medium block mt-1">ส่วนต่างความมั่งคั่งจากพลังตลาด</span>
        </div>
      </div>

      {/* Chart Header & Mini Legend */}
      <div className="flex items-center justify-between pt-2 px-1">
        <div className="flex items-center gap-5 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 rounded-full bg-[#FACC15] shadow-[0_0_8px_rgba(250,204,21,0.8)]"></span>
            <span className="text-amber-300 font-bold">Portfolio Value (มูลค่าพอร์ต)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#FF4D6D]"></span>
            <span className="text-rose-400 font-bold">Net Invested (เงินต้นสุทธิ)</span>
          </div>
        </div>
        <span className="text-sm text-slate-300 font-medium hidden sm:inline-block">
          ✨ พื้นที่ต่างระดับสีทอง = Organic Wealth (กำไรทบต้นเพียวๆ)
        </span>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-80 w-full pt-1">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="growthValueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FACC15" stopOpacity={0.22} />
                  <stop offset="60%" stopColor="#FACC15" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#FACC15" stopOpacity={0.0} />
                </linearGradient>
                <filter id="goldenGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FACC15" floodOpacity="0.4" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748B" 
                tickLine={false}
                axisLine={{ stroke: '#2A2E45' }}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                stroke="#64748B" 
                width={65}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'monospace' }}
                tickFormatter={(val) => {
                  const rate = currency === 'THB' ? (exchangeRate > 0 ? exchangeRate : 35) : 1;
                  const v = val * rate;
                  return `${currSymbol}${v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}`;
                }}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0]?.payload;
                  if (!data) return null;

                  const invested = data.invested || 0;
                  const value = data.value || 0;
                  const gain = data.gain !== undefined ? data.gain : value - invested;
                  const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
                  const isProfit = gain >= 0;

                  return (
                    <div className="bg-[#0F111A]/95 backdrop-blur-md border border-[#2A2E45] p-3.5 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.6)] min-w-[220px] space-y-2 text-[13px]">
                      {/* Date */}
                      <div className="text-[13px] font-bold text-slate-200 pb-1.5 border-b border-[#2A2E45]/80 flex items-center justify-between">
                        <span>วันที่: {new Date(label).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>

                      {/* 1. Net Invested */}
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-rose-300 font-medium">
                          <span className="w-2.5 h-0.5 border-b-2 border-dashed border-[#FF4D6D]"></span>
                          เงินต้นสุทธิ:
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          {formatMoney(invested)}
                        </span>
                      </div>

                      {/* 2. Portfolio Value */}
                      <div className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#FACC15] shadow-[0_0_6px_#FACC15]"></span>
                          มูลค่ารวม:
                        </span>
                        <span className="font-mono font-bold text-amber-300">
                          {formatMoney(value)}
                        </span>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-[#2A2E45]/80 pt-1.5 space-y-1.5">
                        {/* 3. Profit / Loss Value */}
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-300 font-medium">ส่วนต่างกำไร/ขาดทุน:</span>
                          <span className={clsx("font-mono font-bold", isProfit ? "text-emerald-400" : "text-rose-400")}>
                            {isProfit ? '+' : ''}{formatMoney(gain)}
                          </span>
                        </div>

                        {/* 4. % Profit / Loss */}
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-slate-300 font-medium">อัตราผลตอบแทน (%):</span>
                          <span className={clsx(
                            "text-[12px] font-black px-2 py-0.5 rounded-md font-mono",
                            isProfit 
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          )}>
                            {isProfit ? '+' : ''}{gainPct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              {/* Baseline Invested Line: Clean Crisp Laser Dotted Line without muddy fill */}
              <Area 
                type="monotone" 
                dataKey="invested" 
                stroke="#FF4D6D" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                fillOpacity={0} 
                name="invested"
              />
              {/* Value Area: Golden Glowing Line with translucent luminous gradient */}
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#FACC15" 
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
