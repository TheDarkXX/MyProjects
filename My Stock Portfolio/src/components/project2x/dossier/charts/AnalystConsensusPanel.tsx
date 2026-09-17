import React from 'react';
import { Target, TrendingUp, Users, Calendar, Award } from 'lucide-react';
import type { AnalystConsensus, FinancialMetrics } from '../../../../stores/dossierStore';

interface AnalystConsensusPanelProps {
  consensus?: AnalystConsensus;
  financialMetrics?: FinancialMetrics;
  currentPrice: number;
}

export const AnalystConsensusPanel: React.FC<AnalystConsensusPanelProps> = ({
  consensus,
  financialMetrics,
  currentPrice
}) => {
  const targetMean = consensus?.targetMean || 0;
  const targetHigh = consensus?.targetHigh || 0;
  const targetLow = consensus?.targetLow || 0;
  const recMean = consensus?.recommendationMean || 2.5;
  const recKey = (consensus?.recommendationKey || 'hold').toLowerCase();
  const analystCount = consensus?.analystOpinionsCount || 0;
  const epsGrowth = (consensus?.epsGrowthNextYear || 0) * 100;
  const revGrowth = (consensus?.revenueGrowthEstimate || 0) * 100;
  const earningsDate = financialMetrics?.earningsDate;

  // Calculate Upside % to Target Mean
  const upsidePct = (currentPrice > 0 && targetMean > 0)
    ? Number((((targetMean - currentPrice) / currentPrice) * 100).toFixed(1))
    : 0;

  // Determine Recommendation Badge
  let recLabel = 'HOLD (ถือรอจังหวะ)';
  let recBadgeBg = 'bg-amber-500/15 border-amber-500/40 text-amber-300';
  let recDotColor = '#FACC15';

  if (recKey.includes('strong_buy') || recMean <= 1.5) {
    recLabel = 'STRONG BUY (ซื้อเชิงรุก)';
    recBadgeBg = 'bg-blue-600/25 border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(56,189,248,0.3)]';
    recDotColor = '#38BDF8';
  } else if (recKey.includes('buy') || recMean <= 2.5) {
    recLabel = 'BUY (ซื้อสะสม)';
    recBadgeBg = 'bg-blue-900/30 border-blue-500/50 text-cyan-300';
    recDotColor = '#0284C7';
  } else if (recKey.includes('sell') || recMean >= 3.5) {
    recLabel = 'UNDERPERFORM / SELL (ลดน้ำหนัก)';
    recBadgeBg = 'bg-rose-500/20 border-rose-400/50 text-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    recDotColor = '#EF4444';
  }

  // Position of current price on Low -> High scale
  const rangeSpan = Math.max(1, targetHigh - targetLow);
  const currentPosPct = targetHigh > targetLow
    ? Math.min(100, Math.max(0, ((currentPrice - targetLow) / rangeSpan) * 100))
    : 50;
  const meanPosPct = targetHigh > targetLow
    ? Math.min(100, Math.max(0, ((targetMean - targetLow) / rangeSpan) * 100))
    : 50;

  return (
    <div className="bg-[#0B1226]/95 border border-blue-900/60 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between hover:border-blue-700/60 transition-all duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Analyst Consensus
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-cyan-300 border border-cyan-500/30">
                  Wall Street
                </span>
              </h3>
              <p className="text-sm text-slate-400">เป้าหมายราคาและมุมมองนักวิเคราะห์สถาบัน</p>
            </div>
          </div>

          {/* Recommendation Pill */}
          <div className={`px-3 py-1.5 rounded-xl border text-sm font-bold flex items-center gap-2 ${recBadgeBg}`}>
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: recDotColor }} />
            {recLabel}
          </div>
        </div>

        {/* Target Price Highlight */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-[#141E38]/80 border border-blue-900/40 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-cyan-400" />
              เป้าหมายเฉลี่ย (Mean Target)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-slate-100">
                ${targetMean > 0 ? targetMean.toFixed(2) : '-'}
              </span>
              {upsidePct !== 0 && (
                <span
                  className={`text-sm font-bold font-mono px-2 py-0.5 rounded-md ${
                    upsidePct >= 0
                      ? 'text-cyan-300 bg-blue-500/15 border border-blue-500/30'
                      : 'text-rose-300 bg-rose-500/15 border border-rose-500/30'
                  }`}
                >
                  {upsidePct >= 0 ? `+${upsidePct}%` : `${upsidePct}%`}
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#141E38]/80 border border-blue-900/40 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-cyan-400" />
              สถาบันวิเคราะห์ (Coverage)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-slate-100">
                {analystCount > 0 ? analystCount : '-'}
              </span>
              <span className="text-sm text-slate-400 font-medium">สถาบัน</span>
            </div>
          </div>
        </div>

        {/* Visual Target Range Bar (Deep Red -> Orange -> Amber Gold) */}
        {targetHigh > targetLow && (
          <div className="mb-5 bg-[#141E38]/50 border border-blue-900/50 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm text-slate-300 mb-2 font-medium">
              <span className="text-rose-300">
                Low: <strong className="font-mono text-slate-100">${targetLow.toFixed(2)}</strong>
              </span>
              <span className="text-amber-300 font-semibold">
                Mean: <strong className="font-mono text-white">${targetMean.toFixed(2)}</strong>
              </span>
              <span className="text-orange-300">
                High: <strong className="font-mono text-slate-100">${targetHigh.toFixed(2)}</strong>
              </span>
            </div>

            {/* Range Track */}
            <div className="relative h-3 w-full bg-slate-900 rounded-full overflow-hidden my-2 shadow-inner">
              {/* Gradient Track: Deep Red -> Orange -> Amber Gold */}
              <div
                className="absolute top-0 bottom-0 left-0 right-0 rounded-full opacity-90"
                style={{
                  background: 'linear-gradient(90deg, #DC2626 0%, #EA580C 50%, #FBBF24 100%)'
                }}
              />
            </div>

            {/* Range Markers */}
            <div className="relative w-full h-6">
              {/* Mean Marker (Yellow) */}
              <div
                className="absolute -top-3 transform -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${meanPosPct}%` }}
              >
                <div className="w-0.5 h-3 bg-amber-400 shadow-[0_0_4px_rgba(250,204,21,0.8)]" />
                <span className="text-[11px] font-mono text-amber-300 font-bold">Mean</span>
              </div>

              {/* Current Price Marker */}
              <div
                className="absolute -top-3 transform -translate-x-1/2 flex flex-col items-center z-10"
                style={{ left: `${currentPosPct}%` }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                <span className="text-xs font-mono font-black text-cyan-200 mt-0.5 whitespace-nowrap">
                  Current ${currentPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Growth Forecast Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#141E38]/70 border border-blue-900/40 rounded-xl p-3">
            <span className="text-sm text-slate-400 block mb-1">EPS Est. Growth (Next FY)</span>
            <span className="text-base font-bold font-mono text-orange-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {epsGrowth !== 0 ? `+${epsGrowth.toFixed(1)}%` : 'N/A'}
            </span>
          </div>

          <div className="bg-[#141E38]/70 border border-blue-900/40 rounded-xl p-3">
            <span className="text-sm text-slate-400 block mb-1">Rev Est. Growth (Next FY)</span>
            <span className="text-base font-bold font-mono text-cyan-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {revGrowth !== 0 ? `+${revGrowth.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Earnings Countdown */}
      {earningsDate && (
        <div className="mt-4 pt-3 border-t border-blue-900/40 flex items-center justify-between text-sm">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" />
            วันประกาศงบไตรมาสถัดไป:
          </span>
          <span className="font-mono font-bold text-slate-200 bg-blue-950/70 px-2.5 py-1 rounded-lg border border-blue-800/60">
            {earningsDate}
          </span>
        </div>
      )}
    </div>
  );
};

export default AnalystConsensusPanel;
