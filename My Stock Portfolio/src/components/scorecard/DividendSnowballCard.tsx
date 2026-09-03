import React, { useMemo, useState } from 'react';
import { Transaction } from '../../stores/transactionStore';
import { useUiStore } from '../../stores/uiStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { DollarSign, Sparkles, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface DividendSnowballCardProps {
  transactions: Transaction[];
  exchangeRate: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DividendSnowballCard: React.FC<DividendSnowballCardProps> = ({ transactions, exchangeRate }) => {
  const { currency } = useUiStore();
  const [viewMode, setViewMode] = useState<'yoy' | 'combined'>('yoy');

  // Filter only dividend transactions
  const divTxs = useMemo(() => {
    return transactions.filter(t => t.type === 'DIVIDEND' && t.status !== 'CANCELLED');
  }, [transactions]);

  // Extract years present in data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    divTxs.forEach(t => {
      if (t.date) {
        const y = new Date(t.date).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    // Ensure current and previous year are present
    const thisYear = new Date().getFullYear();
    years.add(thisYear);
    years.add(thisYear - 1);
    return Array.from(years).sort((a, b) => b - a); // Descending [2026, 2025, ...]
  }, [divTxs]);

  const currentYear = availableYears[0];
  const prevYear = availableYears[1] || currentYear - 1;

  // Aggregate monthly dividends by year
  const monthlyData = useMemo(() => {
    const data = MONTH_NAMES.map((month, idx) => {
      const entry: any = { month, monthIdx: idx };
      availableYears.forEach(y => {
        entry[`year_${y}`] = 0;
      });
      entry.combined = 0;
      return entry;
    });

    divTxs.forEach(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const mIdx = d.getMonth();
      const y = d.getFullYear();
      const rawAmt = t.amount || 0;
      const convertedAmt = currency === 'THB' ? rawAmt * exchangeRate : rawAmt;

      if (data[mIdx]) {
        if (data[mIdx][`year_${y}`] !== undefined) {
          data[mIdx][`year_${y}`] += convertedAmt;
        }
        data[mIdx].combined += convertedAmt;
      }
    });

    return data;
  }, [divTxs, availableYears, currency, exchangeRate]);

  // Aggregate stats
  const stats = useMemo(() => {
    let currTotal = 0;
    let prevTotal = 0;
    const tickerMap: Record<string, { total: number; count: number; lastDate: string }> = {};

    divTxs.forEach(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const y = d.getFullYear();
      const amt = currency === 'THB' ? (t.amount || 0) * exchangeRate : (t.amount || 0);

      if (y === currentYear) currTotal += amt;
      if (y === prevYear) prevTotal += amt;

      const sym = t.symbol || 'OTHER';
      if (!tickerMap[sym]) {
        tickerMap[sym] = { total: 0, count: 0, lastDate: t.date };
      }
      tickerMap[sym].total += amt;
      tickerMap[sym].count += 1;
      if (new Date(t.date) > new Date(tickerMap[sym].lastDate)) {
        tickerMap[sym].lastDate = t.date;
      }
    });

    const yoyGrowth = prevTotal > 0 ? ((currTotal - prevTotal) / prevTotal) * 100 : 0;
    const topPayers = Object.entries(tickerMap)
      .map(([symbol, data]) => ({ symbol, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { currTotal, prevTotal, yoyGrowth, topPayers, totalEvents: divTxs.length };
  }, [divTxs, currentYear, prevYear, currency, exchangeRate]);

  const currSymbol = currency === 'THB' ? '฿' : '$';

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 lg:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg lg:text-xl font-black text-white tracking-tight flex items-center gap-2">
                Cash Flow & Dividend Snowball
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-[#823AFD]/20 to-[#FC2D79]/20 text-[#FC2D79] border border-[#FC2D79]/30">
                  Joseph Carlson Engine
                </span>
              </h3>
              <p className="text-xs text-[#9898C8] mt-0.5">
                Proof of compounding: Track monthly cash payout progression year-over-year
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-[#1A1D2D] border border-[#2A2E45] p-1 rounded-2xl text-xs gap-1 self-start md:self-auto">
          <button
            onClick={() => setViewMode('yoy')}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer",
              viewMode === 'yoy'
                ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                : "text-[#9898C8] hover:text-white"
            )}
          >
            {currentYear} vs {prevYear} (YoY)
          </button>
          <button
            onClick={() => setViewMode('combined')}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer",
              viewMode === 'combined'
                ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                : "text-[#9898C8] hover:text-white"
            )}
          >
            All-Time Combined
          </button>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4">
          <span className="text-xs text-[#9898C8] font-medium block mb-1">
            {currentYear} Dividends YTD
          </span>
          <div className="text-xl lg:text-2xl font-black text-emerald-400 tabular-nums">
            {currSymbol}{stats.currTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-300 font-semibold mt-1 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Reinvested automatically
          </span>
        </div>

        <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4">
          <span className="text-xs text-[#9898C8] font-medium block mb-1">
            Year-over-Year Growth
          </span>
          <div className={clsx(
            "text-xl lg:text-2xl font-black tabular-nums flex items-center gap-1.5",
            stats.yoyGrowth >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {stats.yoyGrowth >= 0 ? `+${stats.yoyGrowth.toFixed(1)}%` : `${stats.yoyGrowth.toFixed(1)}%`}
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[11px] text-[#9898C8] mt-1 block">
            vs {currSymbol}{stats.prevTotal.toFixed(2)} in {prevYear}
          </span>
        </div>

        <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4">
          <span className="text-xs text-[#9898C8] font-medium block mb-1">
            Total Payout Events
          </span>
          <div className="text-xl lg:text-2xl font-black text-white tabular-nums">
            {stats.totalEvents} <span className="text-xs font-normal text-[#9898C8]">times</span>
          </div>
          <span className="text-[11px] text-[#823AFD] font-semibold mt-1 block">
            Across {stats.topPayers.length} assets
          </span>
        </div>
      </div>

      {/* Main Bar Chart */}
      <div className="h-[280px] w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2E45" opacity={0.5} vertical={false} />
            <XAxis dataKey="month" stroke="#9898C8" fontSize={12} tickLine={false} />
            <YAxis 
              stroke="#9898C8" 
              fontSize={12} 
              tickLine={false}
              tickFormatter={(v) => `${currSymbol}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`} 
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="bg-[#0F111A] border border-[#2A2E45] p-3 rounded-2xl shadow-xl text-xs">
                    <p className="font-bold text-white mb-2">{label}</p>
                    {payload.map((entry: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                        <span className="flex items-center gap-1.5 text-[#CBD5E1]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          {entry.name}:
                        </span>
                        <span className="font-mono font-bold text-white">
                          {currSymbol}{Number(entry.value).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {viewMode === 'yoy' ? (
              <>
                <Bar dataKey={`year_${prevYear}`} name={`${prevYear}`} fill="#4B5563" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey={`year_${currentYear}`} name={`${currentYear}`} fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(val) => <span className="text-xs text-[#CBD5E1] font-semibold">{val}</span>} 
                />
              </>
            ) : (
              <Bar 
                dataKey="combined" 
                name="Combined Monthly Income" 
                fill="url(#snowballGradient)" 
                radius={[6, 6, 0, 0]} 
                maxBarSize={36} 
              />
            )}
            <defs>
              <linearGradient id="snowballGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#823AFD" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.7} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Dividend Contributors Mini-Table */}
      {stats.topPayers.length > 0 && (
        <div className="border-t border-[#1F2233] pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">
              Top Dividend Contributors
            </h4>
            <span className="text-[11px] text-[#9898C8]">Ranked by total payout cash received</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {stats.topPayers.map((p, idx) => (
              <div key={p.symbol} className="bg-[#1A1D2D]/60 border border-[#2A2E45] rounded-xl p-2.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-white">{p.symbol}</span>
                  <span className="text-[10px] text-[#9898C8] font-mono font-bold">#{idx + 1}</span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-emerald-400 font-mono block">
                    {currSymbol}{p.total.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">
                    {p.count} payout{p.count > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
