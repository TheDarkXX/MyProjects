import React from 'react';
import { Target, TrendingUp, Calendar, ShieldCheck, Flame, Sparkles } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DoublerPowerTubeProps {
  currentPrice: number;
  avgCost: number;
  targetPrice3Y: number;
  marketCap?: number;
  doublerProgressPct: number;
  unrealizedPnlPct?: number;
  data?: DossierPayload;
}

function formatMarketCap(cap?: number): string {
  if (!cap || cap <= 0) return '-';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

export const DoublerPowerTube: React.FC<DoublerPowerTubeProps> = ({
  currentPrice,
  avgCost,
  targetPrice3Y,
  marketCap,
  doublerProgressPct,
  unrealizedPnlPct = 0,
  data
}) => {
  const pnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : unrealizedPnlPct;
  const isProfit = pnlPct >= 0;

  // Next Earnings Date (compact micro-pill as requested)
  const earningsDate = data?.financialMetrics?.earningsDate || (data?.quarterlyFinancials?.[0]?.report_date) || null;
  const formattedEarnings = earningsDate ? new Date(earningsDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : null;

  // Analyst Consensus Target if available
  const analystTarget = data?.analystConsensus?.targetMean;
  const analystRec = data?.analystConsensus?.recommendationKey || 'Buy';

  return (
    <div className="flex-1 w-full bg-[#12162B]/95 p-3.5 rounded-2xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md flex flex-col justify-between gap-2.5">
      {/* Upper Row: Executive Metric Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Market Cap & Scale Badge */}
          {marketCap && marketCap > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0A0E1A] border border-white/10 text-[13px]">
              <span className="text-slate-400 font-normal">Market Cap:</span>
              <span className="text-white font-bold font-mono">{formatMarketCap(marketCap)}</span>
            </div>
          )}

          {/* Sector / Moat Anchor Tag */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-950/60 border border-violet-500/30 text-violet-200 text-[13px] font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>{data?.category ? `${data.category} Compounder` : 'Growth Asset'}</span>
          </div>

          {/* Analyst Consensus Target */}
          {analystTarget && analystTarget > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0A0E1A] border border-white/10 text-[13px]">
              <span className="text-slate-400 font-normal">เป้า Wall St:</span>
              <span className="text-emerald-300 font-bold font-mono">${analystTarget.toFixed(0)}</span>
              <span className="text-[11px] text-slate-400 font-medium">({analystRec.toUpperCase()})</span>
            </div>
          )}
        </div>

        {/* Right Side: Discreet Micro-Earnings Date & 2X Progress */}
        <div className="flex items-center gap-2">
          {formattedEarnings && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900/80 border border-white/5 text-[12px] font-mono text-slate-300">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>งบ: {formattedEarnings}</span>
            </span>
          )}

          {/* Compact 2X Milestone Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-violet-900/40 to-orange-900/40 border border-orange-500/40 text-orange-200 text-[13px] font-bold font-mono shadow-[0_0_10px_rgba(253,85,20,0.2)]">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>2X Progress: {doublerProgressPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Lower Row: Ultra-Sleek Micro-ProgressBar (Non-Redundant & Elegant) */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 h-2 bg-slate-900/90 rounded-full border border-white/10 overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isProfit
                ? 'bg-gradient-to-r from-[#823AFD] via-[#A855F7] to-[#FD5514]'
                : 'bg-gradient-to-r from-[#FC2D79] to-red-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, doublerProgressPct))}%` }}
          />
        </div>

        {/* Compact Range Boundaries */}
        <div className="flex items-center gap-2 text-[12px] font-mono font-medium text-slate-300 shrink-0">
          <span>เป้าหมาย 3Y:</span>
          <span className="text-orange-300 font-bold font-mono">${targetPrice3Y.toFixed(0)}</span>
          <span className="text-slate-400 font-normal">(CAGR 26%/ปี)</span>
        </div>
      </div>
    </div>
  );
};
