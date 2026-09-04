import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { BlueprintEntry } from '../../stores/blueprintStore';
import { CATEGORY_CONFIG, STRATEGY_CATEGORIES, StrategyCategory } from './StrategyConfigs';
import { ShieldAlert, CheckCircle2, AlertTriangle, Layers, PieChart as PieIcon, Wallet } from 'lucide-react';

interface BlueprintPieChartProps {
  blueprints: BlueprintEntry[];
}

interface CategoryGroup {
  name: string;
  value: number;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  symbols: { symbol: string; percent: number; status: 'OWNED' | 'WATCHLIST' }[];
}

export const BlueprintPieChart: React.FC<BlueprintPieChartProps> = ({ blueprints }) => {
  // Aggregate data by category
  const { chartData, healthMetrics, totalPercent } = useMemo(() => {
    const groups: Record<string, CategoryGroup> = {};
    let total = 0;

    blueprints.forEach(bp => {
      const cat = bp.category || 'Compounders';
      const pct = Number(bp.target_percent) || 0;
      total += pct;

      if (!groups[cat]) {
        const isStandard = STRATEGY_CATEGORIES.includes(cat as StrategyCategory);
        const config = isStandard 
          ? CATEGORY_CONFIG[cat as StrategyCategory] 
          : {
              hex: '#64748B',
              bg: 'bg-slate-700/40',
              text: 'text-slate-200',
              border: 'border-slate-600/40',
              dot: 'bg-slate-400',
              label: cat,
            };

        groups[cat] = {
          name: cat,
          value: 0,
          color: config.hex,
          textColor: config.text,
          bgColor: config.bg,
          borderColor: config.border,
          dotColor: config.dot,
          symbols: []
        };
      }

      groups[cat].value = parseFloat((groups[cat].value + pct).toFixed(2));
      groups[cat].symbols.push({
        symbol: bp.symbol,
        percent: pct,
        status: bp.status
      });
    });

    // Sort categories: put higher % first, then standard order
    const chartList = Object.values(groups).sort((a, b) => b.value - a.value);

    // Health Diagnostic calculations
    const sortedBlueprints = [...blueprints].sort((a, b) => (b.target_percent || 0) - (a.target_percent || 0));
    const maxHolding = sortedBlueprints[0] || null;
    const top2Sum = (sortedBlueprints[0]?.target_percent || 0) + (sortedBlueprints[1]?.target_percent || 0);
    const categoryCount = chartList.length;
    const ownedCount = blueprints.filter(b => b.status === 'OWNED').length;
    const watchlistCount = blueprints.filter(b => b.status === 'WATCHLIST').length;
    const cashEntry = chartList.find(c => c.name.toLowerCase() === 'cash');
    const cashPercent = cashEntry ? cashEntry.value : 0;

    return {
      chartData: chartList,
      totalPercent: parseFloat(total.toFixed(2)),
      healthMetrics: {
        categoryCount,
        maxHolding,
        top2Sum: parseFloat(top2Sum.toFixed(2)),
        ownedCount,
        watchlistCount,
        cashPercent
      }
    };
  }, [blueprints]);

  if (blueprints.length === 0) {
    return null;
  }

  const isTotal100 = Math.abs(totalPercent - 100) < 0.1;

  // Custom tooltip for slice hover
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: CategoryGroup = payload[0].payload;
      return (
        <div className="bg-[#181B2A] border border-[#2A2E45] rounded-xl p-3.5 shadow-2xl min-w-[200px] z-50">
          <div className="flex items-center justify-between gap-2 border-b border-[#2A2E45] pb-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
              <span className="font-bold text-white text-sm">{data.name}</span>
            </div>
            <span className="font-extrabold text-sm" style={{ color: data.color }}>
              {data.value}%
            </span>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {data.symbols.map(s => (
              <div key={s.symbol} className="flex items-center justify-between text-xs gap-3">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'OWNED' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {s.symbol}
                </span>
                <span className="font-medium text-slate-300">{s.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-8 bg-[#12141F] border border-[#232738] rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232738] pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#823AFD]/20 text-[#A855F7] border border-[#823AFD]/30">
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              Blueprint Health Diagnostic
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              การกระจายตัวตามกลยุทธ์ Category และการตรวจสุขภาพพอร์ตเชิงปริมาณ
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`self-start sm:self-auto px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
          isTotal100 
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
        }`}>
          {isTotal100 ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>สัดส่วนครบ 100% พอดี</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>รวม {totalPercent}% (ต่างจาก 100% อยู่ {(100 - totalPercent).toFixed(1)}%)</span>
            </>
          )}
        </div>
      </div>

      {/* Grid: Donut Chart + Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Donut Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[260px]">
          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#12141F"
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip />} 
                  wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                  position={{ x: 220, y: 0 }}
                  allowEscapeViewBox={{ x: true, y: true }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Center Text inside Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-white tracking-tight">
              {totalPercent}%
            </span>
            <span className="text-[13px] font-semibold text-slate-300 mt-0.5">
              Target Blueprint
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="text-[13px] font-bold text-slate-300 mb-3 flex items-center justify-between">
            <span>หมวดหมู่กลยุทธ์ ({chartData.length} กลุ่ม)</span>
            <span className="text-xs text-slate-400">ชี้ที่กราฟเพื่อดูหุ้นรายตัว</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {chartData.map(group => (
              <div
                key={group.name}
                className="flex flex-col p-3 rounded-xl bg-[#181B2A] border border-[#262B3F] hover:border-[#383E58] transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${group.dotColor}`} />
                    <span className="font-bold text-sm text-slate-200 truncate">{group.name}</span>
                  </div>
                  <span className={`font-extrabold text-sm shrink-0 ${group.textColor}`}>
                    {group.value}%
                  </span>
                </div>

                {/* Stock Symbols preview */}
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {group.symbols.map(s => (
                    <span
                      key={s.symbol}
                      className="px-1.5 py-0.5 rounded bg-[#12141F] text-slate-300 text-xs font-semibold border border-white/5"
                      title={`${s.symbol}: ${s.percent}% (${s.status})`}
                    >
                      {s.symbol} <span className="text-slate-400">{s.percent}%</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Health Diagnostic Metrics Strip */}
      <div className="mt-6 pt-5 border-t border-[#232738] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Category Balance */}
        <div className="p-3.5 rounded-xl bg-[#181B2A] border border-[#262B3F] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0 mt-0.5">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300">Category Balance</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {healthMetrics.categoryCount >= 3 ? (
                <span className="text-emerald-300 flex items-center gap-1">
                  ✓ กระจาย {healthMetrics.categoryCount} กลุ่ม
                </span>
              ) : (
                <span className="text-amber-300 flex items-center gap-1">
                  ⚠️ กระจุกตัว ({healthMetrics.categoryCount} กลุ่ม)
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              เกณฑ์แนะนำ ≥ 3 กลุ่มกลยุทธ์
            </div>
          </div>
        </div>

        {/* Metric 2: Max Concentration */}
        <div className="p-3.5 rounded-xl bg-[#181B2A] border border-[#262B3F] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300">Concentration Risk</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {healthMetrics.maxHolding ? (
                healthMetrics.maxHolding.target_percent > 30 ? (
                  <span className="text-rose-400">
                    ⚠️ {healthMetrics.maxHolding.symbol} {healthMetrics.maxHolding.target_percent}%
                  </span>
                ) : (
                  <span className="text-emerald-300">
                    ✓ สูงสุด {healthMetrics.maxHolding.symbol} ({healthMetrics.maxHolding.target_percent}%)
                  </span>
                )
              ) : '-'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              หุ้นเดี่ยวไม่ควรเกิน 25-30%
            </div>
          </div>
        </div>

        {/* Metric 3: Top-Heavy */}
        <div className="p-3.5 rounded-xl bg-[#181B2A] border border-[#262B3F] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 mt-0.5">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300">Top 2 Weight</div>
            <div className="text-sm font-bold text-white mt-0.5">
              {healthMetrics.top2Sum > 50 ? (
                <span className="text-amber-300">
                  ⚠️ Top 2 รวม {healthMetrics.top2Sum}%
                </span>
              ) : (
                <span className="text-emerald-300">
                  ✓ Top 2 รวม {healthMetrics.top2Sum}%
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Top 2 รวมกันไม่ควรเกิน 50%
            </div>
          </div>
        </div>

        {/* Metric 4: Cash & Readiness */}
        <div className="p-3.5 rounded-xl bg-[#181B2A] border border-[#262B3F] flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 mt-0.5">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300">Cash & Execution</div>
            <div className="text-sm font-bold text-white mt-0.5">
              <span className="text-slate-200">
                {healthMetrics.cashPercent > 0 ? `💵 Cash ${healthMetrics.cashPercent}%` : 'ไม่มี Cash'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {healthMetrics.ownedCount} Owned / {healthMetrics.watchlistCount} Watchlist
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
