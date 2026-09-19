import React from 'react';
import { Target, TrendingUp, Calendar, ShieldCheck, Flame, Sparkles, AlertTriangle } from 'lucide-react';
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

  // Next Earnings Date
  const earningsDate = data?.financialMetrics?.earningsDate || (data?.quarterlyFinancials?.[0]?.report_date) || null;
  const formattedEarnings = earningsDate ? new Date(earningsDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : null;

  // Analyst Consensus Target
  const analystTarget = data?.analystConsensus?.targetMean;
  const analystRec = data?.analystConsensus?.recommendationKey || 'Buy';

  // Base price for doubler milestone
  const basePrice = data?.basePrice && data.basePrice > 0 
    ? data.basePrice 
    : (avgCost > 0 ? avgCost : currentPrice * 0.5);

  const effectiveTarget = targetPrice3Y && targetPrice3Y > 0 
    ? targetPrice3Y 
    : (basePrice * 2);

  // Compute progress with high accuracy
  const computedProgress = effectiveTarget > basePrice
    ? ((currentPrice - basePrice) / (effectiveTarget - basePrice)) * 100
    : doublerProgressPct;

  const displayProgress = Number.isFinite(computedProgress) ? Math.max(0, computedProgress) : doublerProgressPct;
  const clampedTrackProgress = Math.min(100, Math.max(2, displayProgress));

  // Verdict Configuration
  const verdict = data?.verdict || 'HOLD_RIDE';
  const verdictConfig = {
    BUY_ADD: {
      badgeClass: 'bg-gradient-to-r from-violet-900/60 to-purple-900/60 border-violet-500/50 shadow-[0_0_14px_rgba(130,58,253,0.35)]',
      textClass: 'text-violet-200',
      title: 'BUY ADD ZONE',
      subtitle: 'ทยอยสะสมตามโควตา',
      icon: <ShieldCheck className="w-4 h-4 text-violet-300 shrink-0" />
    },
    HOLD_RIDE: {
      badgeClass: 'bg-gradient-to-r from-slate-900/90 to-indigo-950/60 border-slate-600/50 shadow-[0_0_14px_rgba(148,163,184,0.2)]',
      textClass: 'text-slate-200',
      title: 'HOLD & RIDE',
      subtitle: 'ถือทับมือตามระบบ',
      icon: <ShieldCheck className="w-4 h-4 text-slate-300 shrink-0" />
    },
    TRIM_SELL: {
      badgeClass: 'bg-gradient-to-r from-pink-950/80 to-rose-950/80 border-[#FC2D79]/60 shadow-[0_0_16px_rgba(252,45,121,0.35)]',
      textClass: 'text-pink-200',
      title: 'TRIM / SELL ALERT',
      subtitle: 'พักกำไรลดความเสี่ยง',
      icon: <AlertTriangle className="w-4 h-4 text-[#FC2D79] shrink-0" />
    }
  }[verdict] || {
    badgeClass: 'bg-slate-900 border-white/10',
    textClass: 'text-slate-200',
    title: 'HOLD & RIDE',
    subtitle: 'ถือตามระบบ',
    icon: <ShieldCheck className="w-4 h-4 text-slate-300 shrink-0" />
  };

  return (
    <div className="flex-1 w-full bg-[#12162B]/95 p-3.5 rounded-2xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md flex flex-col justify-between gap-3">
      {/* Upper Row: Action Verdict Badge + Executive Meta Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Restored Action Verdict Card/Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${verdictConfig.badgeClass} transition-all`}>
            {verdictConfig.icon}
            <span className={`text-[13px] font-black tracking-wider uppercase font-mono ${verdictConfig.textClass}`}>
              {verdictConfig.title}
            </span>
            <span className="text-[12px] font-medium text-slate-300 hidden md:inline">
              • {verdictConfig.subtitle}
            </span>
          </div>

          {/* Market Cap Chip */}
          {marketCap && marketCap > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0A0E1A] border border-white/10 text-[13px]">
              <span className="text-slate-400 font-normal">Cap:</span>
              <span className="text-white font-bold font-mono">{formatMarketCap(marketCap)}</span>
            </div>
          )}

          {/* Asset Classification */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-950/60 border border-violet-500/30 text-violet-200 text-[13px] font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>{data?.category ? `${data.category} Compounder` : 'Growth Asset'}</span>
          </div>

          {/* Wall St Consensus Target */}
          {analystTarget && analystTarget > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0A0E1A] border border-white/10 text-[13px]">
              <span className="text-slate-400 font-normal">เป้า Wall St:</span>
              <span className="text-emerald-300 font-bold font-mono">${analystTarget.toFixed(0)}</span>
              <span className="text-[11px] text-slate-400 font-medium">({analystRec.toUpperCase()})</span>
            </div>
          )}
        </div>

        {/* Right Side: Earnings & 2X Progress Pill */}
        <div className="flex items-center gap-2">
          {formattedEarnings && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900/80 border border-white/5 text-[12px] font-mono text-slate-300">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>งบ: {formattedEarnings}</span>
            </span>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-violet-900/40 to-orange-900/40 border border-orange-500/40 text-orange-200 text-[13px] font-bold font-mono shadow-[0_0_10px_rgba(253,85,20,0.2)]">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>2X: {displayProgress.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Lower Section: Institutional Milestone Scale Track (หัว-ท้ายครบ ไม่ลอย) */}
      <div className="pt-3 pb-1">
        <div className="flex items-center gap-3 w-full">
          {/* Left Head: Baseline Anchor */}
          <div className="flex flex-col items-start shrink-0 px-2.5 py-1 rounded-xl bg-[#0A0E1A] border border-white/10 shadow-inner">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-tight">
              {avgCost > 0 ? 'ทุนเฉลี่ย (0%)' : 'ราคาฐาน (0%)'}
            </span>
            <span className="text-[14px] font-bold font-mono text-slate-200">
              ${basePrice.toFixed(1)}
            </span>
          </div>

          {/* Center Milestone Track With Floating Pin */}
          <div className="relative flex-1 py-3 flex flex-col justify-center">
            {/* The Rail */}
            <div className="relative w-full h-2.5 bg-slate-950/90 rounded-full border border-white/15 overflow-visible shadow-inner">
              {/* Progress Gradient Fill */}
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isProfit
                    ? 'bg-gradient-to-r from-[#823AFD] via-[#A855F7] to-[#FD5514]'
                    : 'bg-gradient-to-r from-[#FC2D79] to-red-500'
                }`}
                style={{ width: `${clampedTrackProgress}%` }}
              />

              {/* Milestone Ticks (25%, 50%, 75%) */}
              <div className="absolute inset-0 flex justify-between pointer-events-none px-[25%]">
                <div className="w-px h-full bg-white/25" />
                <div className="w-px h-full bg-white/25" />
              </div>

              {/* Glowing Current Price Pin (เข็มปักราคาปัจจุบัน) */}
              <div
                className="absolute -top-7 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-700 z-10"
                style={{ left: `${Math.max(4, Math.min(96, clampedTrackProgress))}%` }}
              >
                <div className="px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-mono text-[12px] font-bold shadow-[0_0_12px_rgba(130,58,253,0.9)] border border-violet-300/80 whitespace-nowrap flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>${currentPrice.toFixed(2)}</span>
                </div>
                <div className="w-0.5 h-2 bg-violet-400 shadow-[0_0_6px_rgba(130,58,253,1)]" />
              </div>
            </div>

            {/* Sub-track Milestone Labels */}
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mt-1 px-1 pointer-events-none">
              <span className="w-1/4 text-center">25%</span>
              <span className="w-1/4 text-center">50%</span>
              <span className="w-1/4 text-center">75%</span>
              <span className="w-1/4 text-right text-orange-300 font-semibold">
                {displayProgress >= 100 ? '🎉 บรรลุ 2X แล้ว!' : '100% (2X)'}
              </span>
            </div>
          </div>

          {/* Right Tail: 3Y Target Goal Box */}
          <div className="flex flex-col items-end shrink-0 px-2.5 py-1 rounded-xl bg-gradient-to-r from-orange-950/40 to-violet-950/40 border border-orange-500/30 shadow-md">
            <span className="text-[11px] font-mono text-orange-300 uppercase tracking-tight flex items-center gap-1">
              <Target className="w-3 h-3 text-orange-400" />
              เป้า 3Y (100%)
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[14px] font-bold font-mono text-orange-200">
                ${effectiveTarget.toFixed(0)}
              </span>
              <span className="text-[11px] font-mono text-slate-300 font-normal">
                (CAGR 26%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoublerPowerTube;
