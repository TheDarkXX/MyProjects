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
          <TrendingUp className="w-4 h-4 text-cyan-400" />
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
      color: metrics.revenueCagr >= targetCagr ? 'from-blue-700 via-blue-600 to-cyan-400' : 'from-blue-900 to-blue-700',
      textColor: metrics.revenueCagr >= targetCagr ? 'text-cyan-300' : 'text-blue-300',
    },
    {
      label: 'EPS Growth YoY',
      value: metrics.epsCagr,
      color: metrics.epsCagr >= targetCagr ? 'from-emerald-700 via-emerald-500 to-emerald-400' : 'from-amber-700 to-amber-500',
      textColor: metrics.epsCagr >= targetCagr ? 'text-emerald-300' : 'text-amber-300',
    },
    {
      label: `2X Threshold Benchmark`,
      value: targetCagr,
      color: 'from-amber-600 to-yellow-400',
      textColor: 'text-amber-300',
      isTarget: true,
    },
  ];

  return (
    <div className="bg-[#0B1226]/95 p-4 rounded-2xl border border-blue-900/60 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <span className="text-slate-100 text-[16px] font-semibold">CAGR Trajectory vs 2X Target</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[12px] font-semibold border ${
              isDoublerPaced
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            {isDoublerPaced ? '🔥 On Track 2X' : '⚠️ Slower Pace'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-950/60 text-cyan-300 border border-blue-800/60 text-[12px] font-medium font-mono">
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
                <span className={`text-[14px] font-medium ${bar.isTarget ? 'text-amber-300' : 'text-slate-300'}`}>
                  {bar.label}
                </span>
                <span className={`text-[15px] font-semibold font-mono ${bar.textColor}`}>
                  {bar.value >= 0 ? '+' : ''}{bar.value.toFixed(1)}%
                </span>
              </div>
              <div className="relative w-full h-5 bg-[#070D1F] rounded-lg overflow-hidden border border-blue-900/40">
                <div
                  className={`h-full bg-gradient-to-r ${bar.color} rounded-lg transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(56,189,248,0.2)]`}
                  style={{
                    width: `${widthPct}%`,
                    ...(bar.isTarget ? { opacity: 0.85, borderRight: '2px dashed rgba(250,204,21,0.9)' } : {}),
                  }}
                />
                {/* 2X threshold marker line */}
                {!bar.isTarget && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-400/90 shadow-[0_0_6px_rgba(250,204,21,0.8)]"
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
      <div className="mt-3 pt-2 border-t border-blue-900/40 flex items-center justify-between text-xs text-slate-400">
        <span>เป้าหมาย 2X ต้องการ CAGR $\ge$ 26% ต่อปี ต่อเนื่อง 3 ปี</span>
        <span className="font-mono text-emerald-400">Avg GM: {metrics.grossMargin.toFixed(1)}%</span>
      </div>
    </div>
  );
};
