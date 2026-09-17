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
      .filter(q => q.yoy_revenue_growth_pct != null)
      .map(q => q.yoy_revenue_growth_pct!);

    const avgRevenueGrowth = yoyGrowths.length > 0
      ? yoyGrowths.reduce((sum, g) => sum + g, 0) / yoyGrowths.length
      : 0;

    // EPS CAGR estimation from recent quarters
    const epsActuals = data
      .filter(q => q.eps_actual != null && q.eps_actual > 0)
      .map(q => q.eps_actual!);

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
      .filter(q => q.gross_margin_pct != null)
      .map(q => q.gross_margin_pct!);
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
      <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-200 text-[16px] font-medium">CAGR Trajectory</span>
        </div>
        <div className="h-16 flex items-center justify-center text-slate-400 text-[14px]">
          ข้อมูลไตรมาสไม่เพียงพอ
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

  const bars = [
    {
      label: 'Revenue CAGR',
      value: metrics.revenueCagr,
      color: metrics.revenueCagr >= targetCagr ? 'from-blue-600 to-cyan-400' : 'from-blue-800 to-blue-500',
      textColor: metrics.revenueCagr >= targetCagr ? 'text-cyan-300' : 'text-blue-300',
    },
    {
      label: 'EPS Growth YoY',
      value: metrics.epsCagr,
      color: metrics.epsCagr >= targetCagr ? 'from-emerald-600 to-emerald-400' : 'from-indigo-800 to-indigo-500',
      textColor: metrics.epsCagr >= targetCagr ? 'text-emerald-300' : 'text-indigo-300',
    },
    {
      label: `2X Threshold`,
      value: targetCagr,
      color: 'from-rose-700 to-rose-500',
      textColor: 'text-rose-300',
      isTarget: true,
    },
  ];

  return (
    <div className="bg-[#060B1C]/90 p-4 rounded-2xl border border-blue-900/40 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-200 text-[16px] font-medium">CAGR Trajectory vs 2X Target</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-cyan-300 border border-blue-500/30 text-[12px] font-medium">
          {metrics.quartersUsed}Q Data
        </span>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="space-y-3">
        {bars.map((bar, idx) => {
          const widthPct = Math.min(100, Math.max(3, (Math.abs(bar.value) / maxValue) * 100));
          return (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[14px] font-medium ${bar.isTarget ? 'text-rose-300' : 'text-slate-300'}`}>
                  {bar.label}
                </span>
                <span className={`text-[15px] font-semibold font-mono ${bar.textColor}`}>
                  {bar.value >= 0 ? '+' : ''}{bar.value.toFixed(1)}%
                </span>
              </div>
              <div className="relative w-full h-5 bg-[#081024] rounded-lg overflow-hidden border border-blue-900/30">
                <div
                  className={`h-full bg-gradient-to-r ${bar.color} rounded-lg transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(56,189,248,0.2)]`}
                  style={{
                    width: `${widthPct}%`,
                    ...(bar.isTarget ? { opacity: 0.7, borderRight: '2px dashed rgba(244,63,94,0.8)' } : {}),
                  }}
                />
                {/* 2X threshold marker line */}
                {!bar.isTarget && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500/80"
                    style={{ left: `${Math.min(98, (targetCagr / maxValue) * 100)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div className="mt-3 p-2.5 rounded-xl bg-[#081126]/60 border border-blue-900/30 flex items-center justify-between text-[14px]">
        <span className="text-slate-300">
          {metrics.revenueCagr >= targetCagr
            ? '✅ Revenue Growth อยู่เหนือเป้า 2X Threshold'
            : '⚠️ Revenue Growth ยังไม่ถึงเป้า 2X — ต้องเร่งตัว'}
        </span>
        <span className="text-slate-400 font-mono text-[14px]">
          Avg GM: {metrics.grossMargin.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};
