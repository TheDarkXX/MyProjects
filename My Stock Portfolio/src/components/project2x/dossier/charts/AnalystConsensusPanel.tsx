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
  let recDotColor = '#F59E0B';

  if (recKey.includes('strong_buy') || recMean <= 1.5) {
    recLabel = 'STRONG BUY (ซื้อเชิงรุก)';
    recBadgeBg = 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]';
    recDotColor = '#10B981';
  } else if (recKey.includes('buy') || recMean <= 2.5) {
    recLabel = 'BUY (ซื้อสะสม)';
    recBadgeBg = 'bg-blue-500/20 border-blue-400/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
    recDotColor = '#3B82F6';
  } else if (recKey.includes('sell') || recMean >= 3.5) {
    recLabel = 'UNDERPERFORM / SELL (ลดน้ำหนัก)';
    recBadgeBg = 'bg-rose-500/20 border-rose-400/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]';
    recDotColor = '#F43F5E';
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
    <div className="bg-[#0B132B]/80 border border-slate-700/60 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col justify-between hover:border-slate-600 transition-all duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Analyst Consensus
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-cyan-500/30">
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
          <div className="bg-[#141E38]/70 border border-slate-700/50 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
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
                      ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30'
                      : 'text-rose-300 bg-rose-500/15 border border-rose-500/30'
                  }`}
                >
                  {upsidePct >= 0 ? `+${upsidePct}%` : `${upsidePct}%`}
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#141E38]/70 border border-slate-700/50 rounded-xl p-3.5 flex flex-col justify-between">
            <span className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              สถาบันวิเคราะห์ (Opinions)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-slate-100">
                {analystCount > 0 ? analystCount : '-'}
              </span>
              <span className="text-sm text-slate-400 font-medium">สถาบัน</span>
            </div>
          </div>
        </div>

        {/* Visual Target Range Bar */}
        {targetHigh > targetLow && (
          <div className="mb-5 bg-[#141E38]/40 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm text-slate-400 mb-2 font-medium">
              <span>Low: <strong className="text-slate-200 font-mono">${targetLow.toFixed(2)}</strong></span>
              <span className="text-cyan-400 font-semibold">
                Mean: <strong className="font-mono text-slate-100">${targetMean.toFixed(2)}</strong>
              </span>
              <span>High: <strong className="text-slate-200 font-mono">${targetHigh.toFixed(2)}</strong></span>
            </div>

            {/* Range Track */}
            <div className="relative h-3 w-full bg-slate-800 rounded-full overflow-hidden my-2 shadow-inner">
              {/* Gradient Track */}
              <div
                className="absolute top-0 bottom-0 left-0 right-0 rounded-full opacity-80"
                style={{
                  background: 'linear-gradient(90deg, #1E3A8A 0%, #3B82F6 50%, #10B981 100%)'
                }}
              />
            </div>

            {/* Range Markers */}
            <div className="relative w-full h-6">
              {/* Mean Marker */}
              <div
                className="absolute -top-3 transform -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${meanPosPct}%` }}
              >
                <div className="w-0.5 h-3 bg-cyan-400" />
                <span className="text-[11px] font-mono text-cyan-300 font-bold">Mean</span>
              </div>

              {/* Current Price Marker */}
              <div
                className="absolute -top-3 transform -translate-x-1/2 flex flex-col items-center z-10"
                style={{ left: `${currentPosPct}%` }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                <span className="text-xs font-mono font-black text-amber-300 mt-0.5 whitespace-nowrap">
                  Current ${currentPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Growth Forecast Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#141E38]/60 border border-slate-700/40 rounded-xl p-3">
            <span className="text-sm text-slate-400 block mb-1">EPS Est. Growth (Next FY)</span>
            <span className="text-base font-bold font-mono text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {epsGrowth !== 0 ? `+${epsGrowth.toFixed(1)}%` : 'N/A'}
            </span>
          </div>

          <div className="bg-[#141E38]/60 border border-slate-700/40 rounded-xl p-3">
            <span className="text-sm text-slate-400 block mb-1">Rev Est. Growth (Next FY)</span>
            <span className="text-base font-bold font-mono text-blue-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {revGrowth !== 0 ? `+${revGrowth.toFixed(1)}%` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Earnings Countdown */}
      {earningsDate && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-sm">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" />
            วันประกาศงบไตรมาสถัดไป:
          </span>
          <span className="font-mono font-bold text-slate-200 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
            {earningsDate}
          </span>
        </div>
      )}
    </div>
  );
};

export default AnalystConsensusPanel;
