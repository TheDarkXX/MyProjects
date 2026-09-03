import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ShieldAlert, TrendingDown, ArrowDown, Award, Calendar, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface UnderwaterDrawdownChartProps {
  seriesData?: { date: string; value: number }[];
}

type DrawdownRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export const UnderwaterDrawdownChart: React.FC<UnderwaterDrawdownChartProps> = ({ seriesData = [] }) => {
  const [range, setRange] = useState<DrawdownRange>('ALL');

  // Calculate drawdowns
  const { drawdownPoints, maxDrawdown, currentDrawdown, longestDaysUnderwater, isAtPeak } = useMemo(() => {
    if (!seriesData || seriesData.length === 0) {
      return { drawdownPoints: [], maxDrawdown: 0, currentDrawdown: 0, longestDaysUnderwater: 0, isAtPeak: true };
    }

    const sorted = [...seriesData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let peak = -Infinity;
    let maxDd = 0;
    let currentStreak = 0;
    let maxStreak = 0;

    const allCalculated = sorted.map(pt => {
      if (pt.value > peak) {
        peak = pt.value;
        currentStreak = 0;
      } else {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      }

      const dd = peak > 0 ? ((pt.value - peak) / peak) * 100 : 0;
      if (dd < maxDd) maxDd = dd;

      return {
        date: pt.date,
        drawdown: Number(dd.toFixed(2)),
        portfolioValue: pt.value,
        peakValue: peak,
      };
    });

    const last = allCalculated[allCalculated.length - 1] || { drawdown: 0 };
    const currDd = last.drawdown;

    // Filter by range
    const now = new Date();
    let filterStart = new Date();
    switch (range) {
      case '1M': filterStart.setMonth(now.getMonth() - 1); break;
      case '3M': filterStart.setMonth(now.getMonth() - 3); break;
      case '6M': filterStart.setMonth(now.getMonth() - 6); break;
      case '1Y': filterStart.setFullYear(now.getFullYear() - 1); break;
      case 'ALL': default: filterStart = new Date('2020-01-01'); break;
    }

    const filterStr = filterStart.toISOString().split('T')[0];
    const filtered = allCalculated.filter(p => p.date >= filterStr);

    return {
      drawdownPoints: filtered,
      maxDrawdown: maxDd,
      currentDrawdown: currDd,
      longestDaysUnderwater: maxStreak,
      isAtPeak: currDd >= -0.05,
    };
  }, [seriesData, range]);

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.25)] space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-[#823AFD] flex items-center justify-center shadow-[0_4px_12px_rgba(244,63,94,0.3)]">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Underwater Drawdown Analysis
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-rose-400 font-semibold">
                  Peak-to-Trough
                </span>
              </h3>
              <p className="text-xs text-[#9898C8]">
                กราฟวัดการย่อตัวจากจุดสูงสุดตลอดประวัติศาสตร์ เพื่อวัดสุขภาพจิตวิทยาและวินัยการลงทุน
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center bg-[#1A1D2D] p-1 rounded-xl border border-[#2A2E45] gap-1 self-start lg:self-auto">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as DrawdownRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={clsx(
                "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                range === r
                  ? "bg-gradient-to-r from-rose-500 to-[#823AFD] text-white shadow-sm"
                  : "text-[#9898C8] hover:text-white"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
          <span className="text-xs font-semibold text-[#9898C8] block">Max Drawdown (แผลลึกสุด)</span>
          <span className="text-2xl font-black text-rose-400 tabular-nums tracking-tight mt-1 block">
            {maxDrawdown.toFixed(2)}%
          </span>
          <span className="text-[11px] text-[#9898C8] block mt-0.5">
            {Math.abs(maxDrawdown) < 15 ? '🟢 ย่อตัวต่ำ แข็งแกร่งกว่าตลาด' : Math.abs(maxDrawdown) < 25 ? '🟡 ย่อตัวปานกลาง สไตล์หุ้นเติบโต' : '🔴 ผันผวนสูงมาก'}
          </span>
        </div>

        <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
          <span className="text-xs font-semibold text-[#9898C8] block">Current Drawdown (สถานะปัจจุบัน)</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx("text-2xl font-black tabular-nums tracking-tight", isAtPeak ? "text-emerald-400" : "text-amber-400")}>
              {currentDrawdown.toFixed(2)}%
            </span>
            {isAtPeak ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                All-Time High 🎉
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/20">
                ย่อตัวจากจุดพีค
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#9898C8] block mt-0.5">
            {isAtPeak ? 'พอร์ตอยู่ที่จุดสูงสุดใหม่' : `ต่ำกว่าจุดสูงสุด ${Math.abs(currentDrawdown).toFixed(2)}%`}
          </span>
        </div>

        <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]">
          <span className="text-xs font-semibold text-[#9898C8] block">Max Underwater Duration</span>
          <span className="text-2xl font-black text-white tabular-nums tracking-tight mt-1 block">
            {longestDaysUnderwater} วัน
          </span>
          <span className="text-[11px] text-[#9898C8] block mt-0.5">ระยะเวลาดำน้ำนานที่สุดก่อนทำ New High</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        {drawdownPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={drawdownPoints} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="underwaterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.05} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
              <XAxis 
                dataKey="date" 
                stroke="#94A3B8" 
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                stroke="#94A3B8" 
                domain={['auto', 0]}
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => `${val.toFixed(0)}%`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#161926', borderColor: '#2A2E45', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
                formatter={(val: any) => [`${Number(val).toFixed(2)}%`, 'ย่อตัวจากจุดพีค']}
                labelFormatter={(label) => `วันที่: ${new Date(label).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`}
              />
              <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1} strokeDasharray="2 2" />
              <Area 
                type="monotone" 
                dataKey="drawdown" 
                stroke="#F43F5E" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#underwaterGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-[#9898C8]">
            No historical drawdown points available yet.
          </div>
        )}
      </div>
    </div>
  );
};
