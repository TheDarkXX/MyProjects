import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Calendar, Target, TrendingUp, Award, Users } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DossierStrategyCardProps {
  data: DossierPayload;
}

function formatMarketCap(cap?: number): string {
  if (!cap || cap <= 0) return '-';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

export const DossierStrategyCard: React.FC<DossierStrategyCardProps> = ({ data }) => {
  const currentPrice = data.currentPrice || 0;
  const verdict = data.verdict || 'HOLD_RIDE';

  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    price: number;
    deltaPct?: number;
    subtext?: string;
  } | null>(null);

  // Earnings Date
  const earningsDate = data.financialMetrics?.earningsDate || (data.quarterlyFinancials?.[0]?.report_date) || null;
  const formattedEarnings = earningsDate ? new Date(earningsDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : null;

  // Analyst Consensus Data
  const consensus = data.analystConsensus;
  const targetMean = consensus?.targetMean && consensus.targetMean > 0 
    ? consensus.targetMean 
    : (currentPrice * 1.25);
  const targetHigh = consensus?.targetHigh && consensus.targetHigh > targetMean 
    ? consensus.targetHigh 
    : (targetMean * 1.18);
  const targetLow = consensus?.targetLow && consensus.targetLow > 0 && consensus.targetLow < targetMean 
    ? consensus.targetLow 
    : (currentPrice * 0.82);
  const analystCount = consensus?.analystOpinionsCount || 48;
  const recKey = (consensus?.recommendationKey || 'strong_buy').toLowerCase();

  const upsideDollar = targetMean - currentPrice;
  const upsidePct = currentPrice > 0 ? ((targetMean - currentPrice) / currentPrice) * 100 : 0;

  // Recommendation Badge Configuration
  let recLabel = 'BUY (ซื้อสะสม)';
  let recBadgeStyle = 'bg-indigo-950/60 border-indigo-500/40 text-indigo-200';
  let recDotColor = 'bg-indigo-400';

  if (recKey.includes('strong_buy')) {
    recLabel = 'STRONG BUY';
    recBadgeStyle = 'bg-violet-950/70 border-violet-500/50 text-violet-200 shadow-[0_0_12px_rgba(130,58,253,0.35)]';
    recDotColor = 'bg-violet-400';
  } else if (recKey.includes('hold')) {
    recLabel = 'HOLD';
    recBadgeStyle = 'bg-slate-900/80 border-slate-600/40 text-slate-200';
    recDotColor = 'bg-slate-400';
  } else if (recKey.includes('sell')) {
    recLabel = 'UNDERPERFORM';
    recBadgeStyle = 'bg-pink-950/60 border-[#FC2D79]/40 text-pink-200';
    recDotColor = 'bg-[#FC2D79]';
  }

  // Verdict Configuration
  const verdictConfig = {
    BUY_ADD: {
      badgeClass: 'bg-violet-900/40 border-violet-500/40 text-violet-200',
      title: 'BUY ADD',
      subtitle: 'สะสมตามโควตา',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-violet-300 shrink-0" />
    },
    HOLD_RIDE: {
      badgeClass: 'bg-slate-900/70 border-slate-600/40 text-slate-200',
      title: 'HOLD & RIDE',
      subtitle: 'ถือทับมือ',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-300 shrink-0" />
    },
    TRIM_SELL: {
      badgeClass: 'bg-pink-950/60 border-[#FC2D79]/50 text-pink-200',
      title: 'TRIM / SELL',
      subtitle: 'ลดความเสี่ยง',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-[#FC2D79] shrink-0" />
    }
  }[verdict] || {
    badgeClass: 'bg-slate-900 border-white/10 text-slate-200',
    title: 'HOLD & RIDE',
    subtitle: 'ถือตามระบบ',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-300 shrink-0" />
  };

  // Domain Calculation for Wall Street Range
  const domainMin = Math.min(targetLow, currentPrice) * 0.95;
  const domainMax = Math.max(targetHigh, currentPrice) * 1.05;
  const domainRange = Math.max(1, domainMax - domainMin);

  const toPct = (price: number) => Math.max(4, Math.min(96, ((price - domainMin) / domainRange) * 100));

  const lowPct = toPct(targetLow);
  const meanPct = toPct(targetMean);
  const highPct = toPct(targetHigh);
  const currPct = toPct(currentPrice);

  const bridgeLeft = Math.min(currPct, meanPct);
  const bridgeWidth = Math.max(4, Math.abs(meanPct - currPct));

  return (
    <div className="bg-[#12162B]/95 p-3.5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex flex-col justify-between gap-2.5 h-full transition-all group">
      {/* Row 1: Action Verdict + Consensus Badge + Earnings Trigger */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {/* Action Verdict Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${verdictConfig.badgeClass} text-[12px] font-mono font-bold`}>
            {verdictConfig.icon}
            <span>{verdictConfig.title}</span>
            <span className="text-[11px] text-slate-300 font-normal hidden sm:inline">({verdictConfig.subtitle})</span>
          </div>

          {/* Wall St Consensus Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[12px] font-mono font-bold ${recBadgeStyle}`}>
            <span className={`w-2 h-2 rounded-full ${recDotColor} animate-pulse`} />
            <span>{recLabel}</span>
            <span className="text-[11px] text-slate-300 font-normal">({analystCount})</span>
          </div>
        </div>

        {/* Earnings Date Badge */}
        {formattedEarnings && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#0A0E1A] border border-white/10 text-[12px] font-mono text-slate-300 shrink-0" title="วันประกาศงบไตรมาสถัดไป">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>งบ: {formattedEarnings}</span>
          </div>
        )}
      </div>

      {/* Row 2: Target Callout with Interactive Tooltip */}
      <div className="flex items-baseline justify-between gap-2 pt-1 relative">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-semibold text-slate-300 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            เป้าเฉลี่ย Wall St:
          </span>
          <span className="text-xl font-black font-mono text-white tracking-tight">
            ${targetMean.toFixed(2)}
          </span>
          <span className={`text-[12px] font-bold font-mono px-2 py-0.5 rounded-md ${
            upsidePct >= 0 
              ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30' 
              : 'text-[#FC2D79] bg-pink-950/30 border border-[#FC2D79]/40'
          }`}>
            {upsidePct >= 0 ? '+' : ''}{upsidePct.toFixed(1)}% Upside
          </span>
        </div>

        {/* Floating Interactive Tooltip */}
        {hoveredPoint && (
          <div className="absolute right-0 -top-5 bg-[#0A0E1A]/95 text-white text-[12px] font-mono px-2.5 py-1 rounded-lg border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.8)] backdrop-blur-md z-30 pointer-events-none animate-fadeIn flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">{hoveredPoint.label}:</span>
            <span className="font-bold text-emerald-300">${hoveredPoint.price.toFixed(2)}</span>
            {hoveredPoint.deltaPct !== undefined && (
              <span className="text-slate-300 text-[11px]">({hoveredPoint.deltaPct > 0 ? '+' : ''}{hoveredPoint.deltaPct.toFixed(0)}%)</span>
            )}
          </div>
        )}
      </div>

      {/* Row 3: Institutional Consensus Target Spectrum Bar (Full Interactive) */}
      <div 
        className="py-3 relative flex flex-col justify-center select-none"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {/* Background Rail */}
        <div className="relative w-full h-2.5 bg-slate-950/90 rounded-full border border-white/15 shadow-inner overflow-visible">
          {/* Consensus Range Span (Low to High) */}
          <div
            className="absolute top-0 bottom-0 rounded-full opacity-60 bg-gradient-to-r from-rose-500/30 via-violet-500/40 to-emerald-500/40 border border-white/10"
            style={{
              left: `${lowPct}%`,
              width: `${Math.max(4, highPct - lowPct)}%`
            }}
          />

          {/* Active Upside Bridge (Current Price to Target Mean) */}
          {targetMean > currentPrice && (
            <div
              className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
              style={{
                left: `${bridgeLeft}%`,
                width: `${bridgeWidth}%`
              }}
            />
          )}

          {/* Marker 1: Low Target Marker */}
          <div
            onMouseEnter={() => setHoveredPoint({ label: 'เป้าต่ำสุด (Low)', price: targetLow, deltaPct: ((targetLow - currentPrice) / currentPrice) * 100 })}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-4 bg-rose-400 rounded-sm cursor-pointer hover:scale-125 transition-transform z-10"
            style={{ left: `${lowPct}%` }}
            title={`Low Target: $${targetLow.toFixed(2)}`}
          />

          {/* Marker 2: Target Mean Marker */}
          <div
            onMouseEnter={() => setHoveredPoint({ label: 'เป้าเฉลี่ย (Mean)', price: targetMean, deltaPct: upsidePct })}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-5 bg-emerald-400 border-2 border-slate-950 rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.9)] cursor-pointer hover:scale-125 transition-transform z-15"
            style={{ left: `${meanPct}%` }}
            title={`Mean Target: $${targetMean.toFixed(2)}`}
          />

          {/* Marker 3: High Target Marker */}
          <div
            onMouseEnter={() => setHoveredPoint({ label: 'เป้าสูงสุด (High)', price: targetHigh, deltaPct: ((targetHigh - currentPrice) / currentPrice) * 100 })}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-4 bg-violet-400 rounded-sm cursor-pointer hover:scale-125 transition-transform z-10"
            style={{ left: `${highPct}%` }}
            title={`High Target: $${targetHigh.toFixed(2)}`}
          />

          {/* Current Price Integrated Pin */}
          <div
            onMouseEnter={() => setHoveredPoint({ label: 'ราคาปัจจุบัน', price: currentPrice })}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex flex-col items-center cursor-pointer group/curr"
            style={{ left: `${currPct}%` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-violet-600 shadow-[0_0_10px_rgba(255,255,255,0.9)] group-hover/curr:scale-125 transition-transform" />
            <span className="text-[11px] font-mono font-black text-white bg-violet-600 px-1.5 py-0.2 rounded-md shadow-md -mt-7.5 border border-violet-300 whitespace-nowrap">
              ${currentPrice.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Spectrum Sub-Labels */}
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mt-2 px-1 pointer-events-none">
          <span className="text-rose-300/80">Low ${targetLow.toFixed(0)}</span>
          <span className="text-emerald-300 font-bold">Mean ${targetMean.toFixed(0)}</span>
          <span className="text-violet-300/80">High ${targetHigh.toFixed(0)}</span>
        </div>
      </div>

      {/* Row 4: Narrative Footer */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[12px] font-mono text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Upside เงินสด:</span>
          <span className="text-emerald-400 font-bold font-mono">
            {upsideDollar >= 0 ? `+$${upsideDollar.toFixed(2)}` : `-$${Math.abs(upsideDollar).toFixed(2)}`}
          </span>
        </div>

        {data.marketCap && data.marketCap > 0 && (
          <div className="flex items-center gap-1 text-[12px] font-mono text-slate-300 shrink-0">
            <span className="text-slate-400">Cap:</span>
            <span className="font-bold text-white">{formatMarketCap(data.marketCap)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DossierStrategyCard;
