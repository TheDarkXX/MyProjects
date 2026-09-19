import React, { useState } from 'react';
import { Target, Flame, Sparkles } from 'lucide-react';
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

export const DoublerPowerTube: React.FC<DoublerPowerTubeProps> = ({
  currentPrice,
  avgCost,
  targetPrice3Y,
  doublerProgressPct,
  unrealizedPnlPct = 0,
  data
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Base price for doubler milestone
  const basePrice = data?.basePrice && data.basePrice > 0 
    ? data.basePrice 
    : (avgCost > 0 ? avgCost : currentPrice * 0.5);

  const effectiveTarget = targetPrice3Y && targetPrice3Y > 0 
    ? targetPrice3Y 
    : (basePrice * 2);

  const pnlDollar = currentPrice - basePrice;
  const pnlPct = basePrice > 0 ? (pnlDollar / basePrice) * 100 : unrealizedPnlPct;
  const isProfit = pnlDollar >= 0;

  // Compute progress with high accuracy
  const computedProgress = effectiveTarget > basePrice
    ? ((currentPrice - basePrice) / (effectiveTarget - basePrice)) * 100
    : doublerProgressPct;

  const displayProgress = Number.isFinite(computedProgress) ? Math.max(0, computedProgress) : doublerProgressPct;
  const clampedTrackProgress = Math.min(100, Math.max(2, displayProgress));

  const remainingDollar = effectiveTarget - currentPrice;
  const remainingPct = currentPrice > 0 ? ((effectiveTarget - currentPrice) / currentPrice) * 100 : 0;

  return (
    <div className="bg-[#12162B]/95 p-3.5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex flex-col justify-between gap-2.5 h-full transition-all group">
      {/* Top: 2X Progress Milestone & 3Y Target Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-violet-900/50 to-orange-900/50 border border-orange-500/40 text-orange-200 text-[13px] font-bold font-mono shadow-[0_0_12px_rgba(253,85,20,0.25)]">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>2X: {displayProgress.toFixed(0)}%</span>
          </div>
          <span className="text-[12px] text-slate-300 font-medium hidden sm:inline">
            {displayProgress >= 100 ? '🎉 บรรลุเป้าหมาย 2X แล้ว!' : displayProgress >= 50 ? '⚡ ผ่านครึ่งทางแล้ว' : '🚀 เริ่มต้นเร่งความเร็ว'}
          </span>
        </div>

        {/* Target 3Y Tag */}
        <div className="flex items-center gap-1.5 text-[13px] font-mono">
          <Target className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-slate-400 font-normal">เป้า 3Y:</span>
          <span className="text-orange-300 font-bold font-mono text-[14px]">
            ${effectiveTarget.toFixed(0)}
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            (CAGR 26%)
          </span>
        </div>
      </div>

      {/* Center: Seamless Horizon Capsule Track (Modern Elegance with Perfectly Anchored Marker) */}
      <div 
        className="pt-7 pb-3 relative flex flex-col justify-center select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Floating Tooltip when Track is Hovered */}
        {isHovered && (
          <div className="absolute top-0 right-0 bg-[#0A0E1A]/95 text-white text-[11px] font-mono px-2.5 py-0.5 rounded-lg border border-orange-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.8)] backdrop-blur-md z-30 pointer-events-none animate-fadeIn flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-orange-400" />
            <span className="text-orange-300 font-bold">{displayProgress.toFixed(1)}%</span>
            <span className="text-slate-300">• เหลืออีก ${remainingDollar > 0 ? remainingDollar.toFixed(2) : '0'}</span>
          </div>
        )}

        {/* The Rail (Thicker h-4 power tube) */}
        <div className="relative w-full h-4 bg-slate-950/90 rounded-full border border-white/20 overflow-visible shadow-inner">
          {/* Progress Gradient Fill: Deep Orange to Deep Red */}
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isProfit
                ? 'bg-gradient-to-r from-[#FF6A00] via-[#FD3A18] to-[#B91C1C] shadow-[0_0_18px_rgba(253,58,24,0.45)]'
                : 'bg-gradient-to-r from-[#7F1D1D] to-[#DC2626]'
            }`}
            style={{ width: `${clampedTrackProgress}%` }}
          />

          {/* Milestone Ticks (25%, 50%, 75%) */}
          <div className="absolute inset-0 flex justify-between pointer-events-none px-[25%]">
            <div className="w-px h-full bg-white/20" />
            <div className="w-px h-full bg-white/20" />
          </div>

          {/* Integrated Glowing Marker on Track (Elevated with ample breathing space) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex items-center justify-center cursor-pointer group/orb"
            style={{ left: `${clampedTrackProgress}%` }}
          >
            {/* Glowing Orb */}
            <div className="relative flex items-center justify-center">
              <span className="absolute w-5 h-5 rounded-full bg-orange-500/40 animate-ping" />
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-200 via-[#FF6A00] to-[#FD3A18] border-2 border-slate-950 shadow-[0_0_14px_rgba(253,58,24,0.9)] z-10 group-hover/orb:scale-125 transition-transform" />
            </div>

            {/* Anchored Speech Bubble Price Tag with % (Elevated to -top-9 for generous clearance) */}
            <div className="absolute -top-9 flex flex-col items-center pointer-events-none transition-all duration-300 group-hover/orb:-translate-y-0.5">
              <div className="px-2.5 py-0.5 rounded-md bg-[#1C0F0A] text-white font-mono text-[12px] font-black border border-orange-500/80 shadow-[0_0_14px_rgba(253,58,24,0.6)] flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                <span>${currentPrice.toFixed(2)}</span>
                <span className="text-orange-300/90 text-[11px] font-bold">({displayProgress.toFixed(0)}%)</span>
              </div>
              <div className="w-1.5 h-1.5 bg-[#1C0F0A] border-r border-b border-orange-500/80 rotate-45 -mt-1 shadow-sm" />
            </div>
          </div>
        </div>

        {/* Milestone Labels Under Track */}
        <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mt-2 px-1 pointer-events-none">
          <span className="text-slate-400">25%</span>
          <span className="text-slate-300 font-medium">50%</span>
          <span className="text-slate-400">75%</span>
          <span className="text-orange-400 font-bold">100% (2X)</span>
        </div>
      </div>

      {/* Bottom: Cohesive Narrative Storytelling (เลิกงง 100%) */}
      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between text-[12px] font-mono text-slate-300 gap-1.5">
        {/* Step 1: Origin & Current Gain */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">ต้นทุน:</span>
          <strong className="text-white">${basePrice.toFixed(1)}</strong>
          <span className="text-slate-500">•</span>
          <span className={isProfit ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            กำไร {isProfit ? '+' : ''}{pnlPct.toFixed(1)}% ({isProfit ? '+' : ''}${pnlDollar.toFixed(1)})
          </span>
        </div>

        {/* Step 2: Distance to 3Y Goal */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">สู่เป้า 3Y:</span>
          {remainingDollar > 0 ? (
            <span className="text-orange-300 font-bold">
              เหลืออีก +${remainingDollar.toFixed(2)} (+{remainingPct.toFixed(0)}%)
            </span>
          ) : (
            <span className="text-emerald-400 font-bold">
              🎉 บรรลุเป้าหมาย 2X แล้ว!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoublerPowerTube;
