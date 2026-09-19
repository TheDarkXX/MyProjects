import React from 'react';
import { Target, Flame } from 'lucide-react';
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
  const pnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : unrealizedPnlPct;
  const isProfit = pnlPct >= 0;

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

  const remainingDollar = effectiveTarget - currentPrice;
  const remainingPct = currentPrice > 0 ? ((effectiveTarget - currentPrice) / currentPrice) * 100 : 0;

  return (
    <div className="bg-[#12162B]/95 p-3.5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex flex-col justify-between gap-2.5 h-full transition-all">
      {/* Top: 2X Progress & 3Y Target Goal */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-violet-900/50 to-orange-900/50 border border-orange-500/40 text-orange-200 text-[13px] font-bold font-mono shadow-[0_0_10px_rgba(253,85,20,0.25)]">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>2X: {displayProgress.toFixed(0)}%</span>
          </div>
          <span className="text-[12px] text-slate-300 font-medium">
            {displayProgress >= 100 ? '🎉 บรรลุ 2X แล้ว!' : 'สู่เป้า 1 เด้ง'}
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

      {/* Center: Seamless Horizon Capsule Track */}
      <div className="py-2.5 relative flex flex-col justify-center">
        {/* The Rail */}
        <div className="relative w-full h-3 bg-slate-950/90 rounded-full border border-white/15 overflow-visible shadow-inner">
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
            <div className="w-px h-full bg-white/20" />
            <div className="w-px h-full bg-white/20" />
          </div>

          {/* Glowing Current Price Pin (เข็มปักราคาปัจจุบัน) */}
          <div
            className="absolute -top-7 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-700 z-10"
            style={{ left: `${Math.max(4, Math.min(96, clampedTrackProgress))}%` }}
          >
            <div className="px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-mono text-[12px] font-black shadow-[0_0_12px_rgba(130,58,253,0.9)] border border-violet-300/80 whitespace-nowrap flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>${currentPrice.toFixed(2)}</span>
            </div>
            <div className="w-0.5 h-2 bg-violet-400 shadow-[0_0_6px_rgba(130,58,253,1)]" />
          </div>
        </div>
      </div>

      {/* Bottom: Remaining Upside & Anchor bounds */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[12px] font-mono text-slate-300">
        <span>ฐาน: <strong className="text-white font-mono">${basePrice.toFixed(1)}</strong></span>
        {remainingDollar > 0 ? (
          <span className="text-orange-300 font-semibold">
            เหลืออีก +${remainingDollar.toFixed(2)} (+{remainingPct.toFixed(0)}%) สู่เป้า
          </span>
        ) : (
          <span className="text-emerald-400 font-bold">
            🎉 เกินเป้าหมาย 3Y แล้ว!
          </span>
        )}
      </div>
    </div>
  );
};

export default DoublerPowerTube;
