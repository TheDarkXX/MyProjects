import React, { useMemo, useState } from 'react';
import { Transaction } from '../../stores/transactionStore';
import { useUiStore } from '../../stores/uiStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { DollarSign, Sparkles, TrendingUp, Calendar, Coins, ArrowUpRight, Award } from 'lucide-react';
import clsx from 'clsx';

interface DividendSnowballCardProps {
  transactions: Transaction[];
  exchangeRate: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DividendSnowballCard: React.FC<DividendSnowballCardProps> = ({ transactions, exchangeRate }) => {
  const { currency } = useUiStore();
  const [selectedView, setSelectedView] = useState<'yoy' | 'current' | 'prev' | 'all'>('yoy');

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
    const thisYear = new Date().getFullYear();
    years.add(thisYear);
    years.add(thisYear - 1);
    return Array.from(years).sort((a, b) => b - a); // Descending [2026, 2025, ...]
  }, [divTxs]);

  const currentYear = availableYears[0];
  const prevYear = availableYears[1] || currentYear - 1;

  // Aggregate monthly dividends
  const monthlyData = useMemo(() => {
    const data = MONTH_NAMES.map((month, idx) => {
      const entry: any = { month, monthIdx: idx };
      availableYears.forEach(y => {
        entry[`year_${y}`] = 0;
      });
      entry.allTime = 0;
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
        data[mIdx].allTime += convertedAmt;
      }
    });

    return data;
  }, [divTxs, availableYears, currency, exchangeRate]);

  // Aggregate stats
  const stats = useMemo(() => {
    let currTotal = 0;
    let prevTotal = 0;
    let allTimeTotal = 0;
    const tickerMap: Record<string, { total: number; count: number; lastDate: string }> = {};

    divTxs.forEach(t => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const y = d.getFullYear();
      const amt = currency === 'THB' ? (t.amount || 0) * exchangeRate : (t.amount || 0);

      allTimeTotal += amt;
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
    const monthlyAverage = currTotal > 0 ? currTotal / 12 : 0;
    
    const topPayers = Object.entries(tickerMap)
      .map(([symbol, data]) => ({ 
        symbol, 
        ...data, 
        share: allTimeTotal > 0 ? (data.total / allTimeTotal) * 100 : 0 
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { 
      currTotal, 
      prevTotal, 
      allTimeTotal, 
      yoyGrowth, 
      monthlyAverage, 
      topPayers, 
      totalEvents: divTxs.length 
    };
  }, [divTxs, currentYear, prevYear, currency, exchangeRate]);

  const currSymbol = currency === 'THB' ? '฿' : '$';

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 lg:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all min-w-0 flex flex-col justify-between">
      {/* 1. Header & View Toggle */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg lg:text-xl font-black text-white tracking-tight flex items-center gap-2">
                Cash Flow & Dividend Snowball
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Joseph Carlson
                </span>
              </h3>
              <p className="text-xs text-[#9898C8] mt-0.5">
                กระแสเงินสดปันผลรายเดือน: พลังดอกเบี้ยทบต้น (Snowball Effect)
              </p>
            </div>
          </div>

          {/* Quick Filter Switcher */}
          <div className="flex items-center bg-[#1A1D2D] border border-[#2A2E45] p-1 rounded-2xl text-xs gap-1 self-start sm:self-auto shrink-0 shadow-inner">
            <button
              onClick={() => setSelectedView('yoy')}
              className={clsx(
                "px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer",
                selectedView === 'yoy'
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                  : "text-[#9898C8] hover:text-white"
              )}
            >
              {currentYear} vs {prevYear}
            </button>
            <button
              onClick={() => setSelectedView('current')}
              className={clsx(
                "px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer",
                selectedView === 'current'
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                  : "text-[#9898C8] hover:text-white"
              )}
            >
              {currentYear}
            </button>
            <button
              onClick={() => setSelectedView('all')}
              className={clsx(
                "px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer",
                selectedView === 'all'
                  ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-md"
                  : "text-[#9898C8] hover:text-white"
              )}
            >
              รวมทุกปี
            </button>
          </div>
        </div>

        {/* 2. Key Insights Ribbon (เข้าใจง่ายใน 3 วินาที) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-[#9898C8] font-medium flex items-center justify-between">
              <span>ปันผลรับปี {currentYear} (YTD)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">รับจริง</span>
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight mt-1">
              {currSymbol}{stats.currTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-[#9898C8] mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> นำไป Reinvest สร้างพลังทบต้น
            </span>
          </div>

          <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-[#9898C8] font-medium flex items-center justify-between">
              <span>อัตราเติบโต YoY Velocity</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">vs {prevYear}</span>
            </span>
            <div className={clsx(
              "text-2xl font-black font-mono tracking-tight mt-1 flex items-center gap-1.5",
              stats.yoyGrowth >= 0 ? "text-emerald-400" : "text-rose-400"
            )}>
              {stats.yoyGrowth >= 0 ? `+${stats.yoyGrowth.toFixed(1)}%` : `${stats.yoyGrowth.toFixed(1)}%`}
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[11px] text-[#9898C8] mt-1">
              {stats.prevTotal > 0 ? `เทียบกับ ${currSymbol}${stats.prevTotal.toFixed(2)} ในปี ${prevYear}` : 'ปีแรกของการเก็บสถิติ'}
            </span>
          </div>

          <div className="bg-[#1A1D2D]/70 border border-[#2A2E45] rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs text-[#9898C8] font-medium flex items-center justify-between">
              <span>เฉลี่ยเดือนละ (Monthly Run-rate)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">Cash</span>
            </span>
            <div className="text-2xl font-black text-white font-mono tracking-tight mt-1">
              {currSymbol}{stats.monthlyAverage.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              <span className="text-xs font-normal text-[#9898C8]"> /ด.</span>
            </div>
            <span className="text-[11px] text-[#823AFD] font-semibold mt-1">
              รวมรับเงินปันผลไปแล้ว {stats.totalEvents} ครั้ง
            </span>
          </div>
        </div>

        {/* 3. Main Bar Chart (Enhanced with Value Labels & Proper Padding) */}
        <div className="h-[280px] w-full min-w-0 mb-6 relative">
          <ResponsiveContainer width="100%" height="100%" minWidth={250}>
            <BarChart data={monthlyData} margin={{ top: 25, right: 15, left: 15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2E45" opacity={0.4} vertical={false} />
              <XAxis dataKey="month" stroke="#9898C8" fontSize={11} tickLine={false} />
              <YAxis 
                stroke="#9898C8" 
                fontSize={11} 
                tickLine={false}
                width={55}
                tickFormatter={(v) => `${currSymbol}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}`} 
              />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.04)', radius: 6 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="bg-[#0F111A] border border-[#2A2E45] p-3 rounded-2xl shadow-2xl text-xs z-50">
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
              
              {selectedView === 'yoy' && (
                <>
                  <Bar 
                    dataKey={`year_${prevYear}`} 
                    name={`${prevYear}`} 
                    fill="#4B5563" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={28}
                    minPointSize={6}
                  />
                  <Bar 
                    dataKey={`year_${currentYear}`} 
                    name={`${currentYear}`} 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={28}
                    minPointSize={6}
                    label={({ x, y, width, value }) => {
                      if (!value || value <= 0) return null;
                      const formatted = value < 10 ? value.toFixed(2) : Math.round(value).toString();
                      return (
                        <text 
                          x={x + width / 2} 
                          y={y - 8} 
                          fill="#34D399" 
                          textAnchor="middle" 
                          fontSize={10} 
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {currSymbol}{formatted}
                        </text>
                      );
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(val) => <span className="text-xs text-[#CBD5E1] font-semibold">{val}</span>} 
                  />
                </>
              )}

              {selectedView === 'current' && (
                <Bar 
                  dataKey={`year_${currentYear}`} 
                  name={`${currentYear} Dividends`} 
                  fill="#10B981" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={36}
                  minPointSize={6}
                  label={({ x, y, width, value }) => {
                    if (!value || value <= 0) return null;
                    const formatted = value < 10 ? value.toFixed(2) : Math.round(value).toString();
                    return (
                      <text 
                        x={x + width / 2} 
                        y={y - 8} 
                        fill="#34D399" 
                        textAnchor="middle" 
                        fontSize={11} 
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {currSymbol}{formatted}
                      </text>
                    );
                  }}
                />
              )}

              {selectedView === 'all' && (
                <Bar 
                  dataKey="allTime" 
                  name="ปันผลสะสมทุกปี" 
                  fill="url(#snowballGradient)" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={36}
                  minPointSize={6}
                  label={({ x, y, width, value }) => {
                    if (!value || value <= 0) return null;
                    const formatted = value < 10 ? value.toFixed(2) : Math.round(value).toString();
                    return (
                      <text 
                        x={x + width / 2} 
                        y={y - 8} 
                        fill="#A78BFA" 
                        textAnchor="middle" 
                        fontSize={11} 
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {currSymbol}{formatted}
                      </text>
                    );
                  }}
                />
              )}

              <defs>
                <linearGradient id="snowballGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#823AFD" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Explanation Note */}
        <div className="bg-[#1A1D2D]/50 border border-[#2A2E45]/80 rounded-2xl px-3.5 py-2 -mt-2 mb-4 text-xs text-[#9898C8] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <span>
              💡 <strong className="text-white">คำอธิบายกราฟ:</strong> ปี {currentYear} มีเงินปันผลเข้าพอร์ตจริง 4 เดือน (ก.พ., มี.ค., เม.ย., มิ.ย.) รวม {currSymbol}{stats.currTotal.toFixed(2)} — เดือนอื่นๆ ที่ว่างอยู่คือยังไม่ถึงรอบจ่ายเงินปันผลของบริษัท
            </span>
          </div>
          <span className="text-emerald-400 font-mono font-bold text-[11px] shrink-0">
            {stats.totalEvents} รอบจ่ายจริง
          </span>
        </div>
      </div>

      {/* 4. Top Dividend Contributors (ชัดเจน เข้าใจง่าย) */}
      {stats.topPayers.length > 0 && (
        <div className="border-t border-[#1F2233] pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              แชมป์จ่ายเงินปันผลสะสม (Top Contributors)
            </h4>
            <span className="text-[11px] text-[#9898C8]">เรียงตามยอดเงินสดรวมที่ได้รับจริง</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {stats.topPayers.map((p, idx) => (
              <div key={p.symbol} className="bg-[#1A1D2D]/60 border border-[#2A2E45] rounded-xl p-3 flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-white tracking-wide">{p.symbol}</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-sm font-bold text-emerald-400 font-mono block">
                    {currSymbol}{p.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-[#94A3B8] mt-0.5 font-medium">
                    <span>{p.count} ครั้ง</span>
                    <span className="text-[#CBD5E1] font-mono">{p.share.toFixed(0)}% ของปันผล</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
