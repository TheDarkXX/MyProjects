import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { QuarterlyFinancialItem } from '../../../../stores/dossierStore';

interface CagrTrajectoryChartProps {
  symbol: string;
  data: QuarterlyFinancialItem[];
  targetCagr?: number;
}

export const CagrTrajectoryChart: React.FC<CagrTrajectoryChartProps> = ({
  symbol,
  data,
  targetCagr = 26,
}) => {
  const metrics = useMemo(() => {
    if (!data || data.length < 4) return null;

    // Calculate Revenue CAGR from quarterly YoY growth
    const yoyGrowths = data
      .filter((q) => q.yoy_revenue_growth_pct != null)
      .map((q) => q.yoy_revenue_growth_pct!);

    const avgRevenueGrowth = yoyGrowths.length > 0
      ? yoyGrowths.reduce((sum, g) => sum + g, 0) / yoyGrowths.length
      : 0;

    // EPS CAGR estimation from recent quarters
    const epsActuals = data
      .filter((q) => q.eps_actual != null && q.eps_actual > 0)
      .map((q) => q.eps_actual!);

    let epsGrowthPct = 0;
    if (epsActuals.length >= 4) {
      const latestEps = epsActuals[0];
      const yearAgoEps = epsActuals[Math.min(3, epsActuals.length - 1)];
      if (yearAgoEps > 0) {
        epsGrowthPct = ((latestEps - yearAgoEps) / yearAgoEps) * 100;
      }
    }

    // Gross Margin trajectory
    const gmValues = data
      .filter((q) => q.gross_margin_pct != null)
      .map((q) => q.gross_margin_pct!);
    const avgGM = gmValues.length > 0
      ? gmValues.reduce((sum, v) => sum + v, 0) / gmValues.length
      : 0;

    return {
      revenueCagr: avgRevenueGrowth,
      epsCagr: epsGrowthPct,
      grossMargin: avgGM,
      quartersUsed: data.length,
    };
  }, [data]);

  if (!metrics) {
    return (
      <div className="bg-[#0B1226]/95 p-4 rounded-2xl border border-blue-900/60 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span className="text-slate-100 text-[16px] font-semibold">CAGR Trajectory</span>
        </div>
        <div className="h-16 flex items-center justify-center text-slate-400 text-[14px]">
          ข้อมูลไตรมาสไม่เพียงพอสำหรับคำนวณ CAGR
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    Math.abs(metrics.revenueCagr),
    Math.abs(metrics.epsCagr),
    targetCagr,
    50
  );

  const isDoublerPaced = metrics.revenueCagr >= targetCagr && metrics.epsCagr >= targetCagr;

  const bars = [
    {
      label: 'Revenue CAGR',
      value: metrics.revenueCagr,
      color: metrics.revenueCagr >= targetCagr ? 'from-violet-800 via-violet-600 to-violet-400' : 'from-violet-950 to-violet-800',
      textColor: metrics.revenueCagr >= targetCagr ? 'text-violet-300' : 'text-slate-300',
    },
    {
      label: 'EPS Growth YoY',
      value: metrics.epsCagr,
      color: metrics.epsCagr >= targetCagr ? 'from-orange-700 via-orange-500 to-amber-400' : 'from-pink-950 via-pink-700 to-rose-600',
      textColor: metrics.epsCagr >= targetCagr ? 'text-orange-300' : 'text-[#FC2D79]',
    },
    {
      label: `2X Threshold Benchmark`,
      value: targetCagr,
      color: 'from-slate-700 to-slate-400',
      textColor: 'text-slate-200',
      isTarget: true,
    },
  ];

  return (
    <div className="bg-[#12162B]/95 p-4 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(130,58,253,0.8)]" />
          <span className="text-slate-100 text-[16px] font-semibold">CAGR Trajectory vs 2X Target</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[12px] font-semibold border ${
              isDoublerPaced
                ? 'bg-violet-600/20 text-violet-200 border-violet-500/40'
                : 'bg-pink-950/40 text-[#FC2D79] border-[#FC2D79]/40'
            }`}
          >
            {isDoublerPaced ? '🚀 On Track 2X' : '⚠️ Slower Pace'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-violet-950/60 text-violet-200 border border-violet-800/60 text-[12px] font-medium font-mono">
            {metrics.quartersUsed}Q
          </span>
        </div>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="space-y-3">
        {bars.map((bar, idx) => {
          const widthPct = Math.min(100, Math.max(3, (Math.abs(bar.value) / maxValue) * 100));
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[14px] font-medium ${bar.isTarget ? 'text-slate-200' : 'text-slate-300'}`}>
                  {bar.label}
                </span>
                <span className={`text-[15px] font-semibold font-mono ${bar.textColor}`}>
                  {bar.value >= 0 ? '+' : ''}{bar.value.toFixed(1)}%
                </span>
              </div>
              <div className="relative w-full h-5 bg-[#080818] rounded-lg overflow-hidden border border-white/10">
                <div
                  className={`h-full bg-gradient-to-r ${bar.color} rounded-lg transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(130,58,253,0.2)]`}
                  style={{
                    width: `${widthPct}%`,
                    ...(bar.isTarget ? { opacity: 0.85, borderRight: '2px dashed rgba(255,255,255,0.7)' } : {}),
                  }}
                />
                {/* 2X threshold marker line */}
                {!bar.isTarget && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-300/90 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                    style={{ left: `${Math.min(98, (targetCagr / maxValue) * 100)}%` }}
                    title={`2X Target Threshold: ${targetCagr}%`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <span>เป้าหมาย 2X ต้องการ CAGR $\ge$ 26% ต่อปี ต่อเนื่อง 3 ปี</span>
        <span className="font-mono text-orange-300 font-semibold">Avg GM: {metrics.grossMargin.toFixed(1)}%</span>
      </div>
    </div>
  );
};
