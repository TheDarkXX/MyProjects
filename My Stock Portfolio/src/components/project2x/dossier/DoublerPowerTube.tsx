import React, { useState, useMemo } from 'react';
import { Target, Flame, Sparkles, Clock, CheckCircle2, Trophy, Compass, RotateCcw } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';
import { usePortfolioStore } from '../../../stores/portfolioStore';
import { useProject2xStore } from '../../../stores/project2xStore';
import { useDossierStore } from '../../../stores/dossierStore';

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
  const [isRenewing, setIsRenewing] = useState(false);

  const { activePortfolioId } = usePortfolioStore();
  const renewThesisEpoch = useProject2xStore((s) => s.renewThesisEpoch);
  const openDossier = useDossierStore((s) => s.openDossier);

  const handleRenew = async () => {
    if (!data?.symbol || !activePortfolioId) return;
    const confirmed = window.confirm(
      `ยืนยันการ Reset / ต่ออายุ Thesis Epoch สำหรับ ${data.symbol}?\n\n• วันเริ่มนับใหม่: วันนี้ (${new Date().toLocaleDateString('th-TH')})\n• ราคาเริ่มใหม่: $${currentPrice.toFixed(2)}\n• เป้าหมาย 1 เด้ง (2X) ใหม่: $${(currentPrice * 2).toFixed(2)}\n• กรอบเวลานับใหม่: 3 ปี (36 เดือน)`
    );
    if (!confirmed) return;

    try {
      setIsRenewing(true);
      await renewThesisEpoch(activePortfolioId, data.symbol, {
        start_price: currentPrice,
        anchor_date: new Date().toISOString().slice(0, 10),
        horizon_years: 3.0
      });
      await openDossier(activePortfolioId, data.symbol);
    } catch (err: any) {
      alert(`ต่ออายุ Thesis ไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsRenewing(false);
    }
  };

  // 1. Base price for doubler milestone: prioritize thesis start price
  const basePrice = (data as any)?.thesis?.startPrice 
    || (data?.basePrice && data.basePrice > 0 ? data.basePrice : (avgCost > 0 ? avgCost : currentPrice * 0.5));

  const effectiveTarget = (data as any)?.thesis?.targetPrice
    || (targetPrice3Y && targetPrice3Y > 0 ? targetPrice3Y : (basePrice * 2));

  const pnlDollar = currentPrice - basePrice;
  const pnlPct = basePrice > 0 ? (pnlDollar / basePrice) * 100 : unrealizedPnlPct;
  const isProfit = pnlDollar >= 0;

  // 2. Compute progress on 2X track (0% to 100%)
  const computedProgress = effectiveTarget > basePrice
    ? ((currentPrice - basePrice) / (effectiveTarget - basePrice)) * 100
    : doublerProgressPct;

  const displayProgress = Number.isFinite(computedProgress) ? Math.max(0, computedProgress) : doublerProgressPct;
  const clampedTrackProgress = Math.min(100, Math.max(2, displayProgress));

  // 3. 3 Annual Stepping Milestones (Compound Growth ~26% CAGR)
  // Year 1: +26.0% (1.26^1)
  // Year 2: +58.8% (1.26^2)
  // Year 3: +100.0% (2X Doubler Boss)
  const targetY1 = Number((basePrice * 1.26).toFixed(2));
  const targetY2 = Number((basePrice * 1.5876).toFixed(2));
  const targetY3 = Number(effectiveTarget.toFixed(2));

  // 4. First Buy Date & Thesis Horizon Telemetry
  const firstBuyDateStr = (data as any)?.thesis?.anchorDate
    || data?.holding?.firstBuyDate 
    || (data?.holding?.lots && data.holding.lots.length > 0 
        ? [...data.holding.lots].sort((a, b) => a.date.localeCompare(b.date))[0]?.date 
        : null);

  const hasStarted = Boolean(firstBuyDateStr && (data?.holding?.shares || 0) > 0.0001);
  const horizonYears = (data as any)?.thesis?.horizonYears || 3;

  const timeTelemetry = useMemo(() => {
    if (!hasStarted || !firstBuyDateStr) {
      return {
        hasStarted: false,
        daysHeld: 0,
        monthsHeld: 0,
        yearsHeld: 0,
        daysRemaining: Math.round(horizonYears * 365.25),
        monthsRemaining: Math.round(horizonYears * 12),
        heldText: '—',
        remainingText: `${Math.round(horizonYears * 12)}M (ยังไม่เริ่ม)`
      };
    }

    const now = new Date();
    const startDate = new Date(firstBuyDateStr);
    const diffMs = Math.max(0, now.getTime() - startDate.getTime());
    const daysHeld = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const monthsHeld = Math.floor(daysHeld / 30.4375);
    const yearsHeld = Number((daysHeld / 365.25).toFixed(1));

    const totalDays = Math.round(horizonYears * 365.25);
    const daysRemaining = Math.max(0, totalDays - daysHeld);
    const monthsRemaining = Math.max(0, Math.round(daysRemaining / 30.4375));

    let heldText = '';
    if (monthsHeld >= 12) {
      const y = Math.floor(monthsHeld / 12);
      const m = monthsHeld % 12;
      heldText = m > 0 ? `${y}Y ${m}M` : `${y}Y`;
    } else {
      heldText = `${monthsHeld || 1}M`;
    }

    let remainingText = '';
    if (daysRemaining <= 0) {
      remainingText = `ครบ ${horizonYears}Y`;
    } else if (monthsRemaining >= 12) {
      const y = Math.floor(monthsRemaining / 12);
      const m = monthsRemaining % 12;
      remainingText = m > 0 ? `${y}Y ${m}M` : `${y}Y`;
    } else {
      remainingText = `${monthsRemaining}M`;
    }

    return {
      hasStarted: true,
      daysHeld,
      monthsHeld,
      yearsHeld,
      daysRemaining,
      monthsRemaining,
      heldText,
      remainingText
    };
  }, [firstBuyDateStr, hasStarted, horizonYears]);

  // 5. Pace Telemetry (Current Price vs Ideal Exponential Pace Curve)
  const paceAnalysis = useMemo(() => {
    if (!timeTelemetry.hasStarted) {
      return {
        idealPrice: basePrice,
        paceDeltaPct: 0,
        status: 'ON_TRACK' as const,
        label: '⏳ Not Started',
        badgeClass: 'text-slate-300 bg-white/5 border-white/10'
      };
    }

    if (currentPrice >= targetY3) {
      const gainPct = basePrice > 0 ? ((currentPrice - basePrice) / basePrice) * 100 : 100;
      return {
        idealPrice: targetY3,
        paceDeltaPct: gainPct - 100,
        status: 'AHEAD' as const,
        label: `🏆 Doubled (+${gainPct.toFixed(0)}%)`,
        badgeClass: 'text-amber-300 bg-amber-950/60 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
      };
    }

    const tYears = Math.min(horizonYears, Math.max(0.08, timeTelemetry.yearsHeld));
    const idealPrice = basePrice * Math.pow(1.26, tYears);
    const paceDeltaPct = idealPrice > 0 ? ((currentPrice - idealPrice) / idealPrice) * 100 : 0;

    let status: 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'OVERDUE' = 'ON_TRACK';
    let label = '🟢 On Track';
    let badgeClass = 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40';

    if (timeTelemetry.daysRemaining <= 0 && currentPrice < targetY3) {
      status = 'OVERDUE';
      label = `🔴 Time Expired (>${horizonYears}Y)`;
      badgeClass = 'text-rose-300 bg-rose-950/60 border-rose-500/40';
    } else if (paceDeltaPct >= 6) {
      status = 'AHEAD';
      label = `🚀 Ahead of Pace (+${paceDeltaPct.toFixed(0)}%)`;
      badgeClass = 'text-amber-300 bg-amber-950/60 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]';
    } else if (paceDeltaPct <= -6) {
      status = 'BEHIND';
      label = `🟡 Behind Schedule (${paceDeltaPct.toFixed(0)}%)`;
      badgeClass = 'text-orange-300 bg-orange-950/60 border-orange-500/40';
    }

    return { idealPrice, paceDeltaPct, status, label, badgeClass };
  }, [basePrice, currentPrice, timeTelemetry, targetY3, horizonYears]);

  // 6. Determine Active Mission Stage
  const activeMission = useMemo(() => {
    if (currentPrice >= targetY3) {
      return {
        stage: 3,
        stepName: 'Stage 3 (2X)',
        title: '🎉 บรรลุเป้าหมาย 2X แล้ว!',
        targetPrice: targetY3,
        remainingToStage: 0,
        isComplete: true
      };
    }
    if (currentPrice >= targetY2) {
      return {
        stage: 3,
        stepName: 'Stage 3 (2X Boss)',
        title: 'กำลังล่าเป้าใหญ่ 2X',
        targetPrice: targetY3,
        remainingToStage: targetY3 - currentPrice,
        isComplete: false
      };
    }
    if (currentPrice >= targetY1) {
      return {
        stage: 2,
        stepName: 'Stage 2 (Y2)',
        title: 'กำลังพิชิตเป้า Y2 (+59%)',
        targetPrice: targetY2,
        remainingToStage: targetY2 - currentPrice,
        isComplete: false
      };
    }
    return {
      stage: 1,
      stepName: 'Stage 1 (Y1)',
      title: 'กำลังพิชิตเป้า Y1 (+26%)',
      targetPrice: targetY1,
      remainingToStage: targetY1 - currentPrice,
      isComplete: false
    };
  }, [currentPrice, targetY1, targetY2, targetY3]);

  return (
    <div className="bg-[#12162B]/95 p-3.5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex flex-col justify-between gap-2.5 h-full transition-all group select-none">
      {/* Top Header: 2X Progress Milestone, Pace Velocity Pill & Time Dimension */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: 2X Progress & Pace Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-violet-900/50 to-orange-900/50 border border-orange-500/40 text-orange-200 text-[13px] font-bold font-mono shadow-[0_0_12px_rgba(253,85,20,0.25)]">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>2X: {displayProgress.toFixed(0)}%</span>
          </div>

          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-mono font-bold tracking-tight ${paceAnalysis.badgeClass}`}>
            <span>{paceAnalysis.label}</span>
          </div>
        </div>

        {/* Right: Time Dimension Telemetry & Renew 3Y Epoch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-mono text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-white/10 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-slate-400 text-[11px]">ถือ:</span>
            <strong className="text-white font-bold">{timeTelemetry.heldText}</strong>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 text-[11px]">เหลือ:</span>
            <strong className="text-orange-300 font-bold">{timeTelemetry.remainingText}</strong>
          </div>

          <button
            onClick={handleRenew}
            disabled={isRenewing}
            title="รีเซ็ต/ต่ออายุรอบ Thesis 3 ปีใหม่จากราคาวันนี้"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-orange-950/60 border border-white/10 hover:border-orange-500/50 text-slate-300 hover:text-orange-200 text-[12px] font-mono font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-orange-400 ${isRenewing ? 'animate-spin' : ''}`} />
            <span>{isRenewing ? 'กำลังต่ออายุ...' : 'Renew 3Y'}</span>
          </button>
        </div>
      </div>

      {/* Center: Seamless Horizon Capsule Track with 3 Annual Stepping Milestones */}
      <div 
        className="pt-7 pb-2 relative flex flex-col justify-center select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Floating Tooltip when Track is Hovered */}
        {isHovered && (
          <div className="absolute top-0 right-0 bg-[#0A0E1A]/95 text-white text-[11px] font-mono px-2.5 py-0.5 rounded-lg border border-orange-500/30 shadow-[0_4px_16px_rgba(0,0,0,0.8)] backdrop-blur-md z-30 pointer-events-none animate-fadeIn flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-orange-400" />
            <span className="text-orange-300 font-bold">{displayProgress.toFixed(1)}% สู่ 2X</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-300">เหลืออีก ${activeMission.remainingToStage > 0 ? activeMission.remainingToStage.toFixed(2) : '0'}</span>
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

          {/* Annual Milestone Ticks on Rail (Y1 at 26%, Y2 at 58.8%) */}
          <div className="absolute inset-0 pointer-events-none">
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white/25 z-10" 
              style={{ left: '26%' }}
              title="Y1 Benchmark (+26%)"
            />
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-white/25 z-10" 
              style={{ left: '58.8%' }}
              title="Y2 Benchmark (+59%)"
            />
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

        {/* 3 Annual Stepping Milestones Under Track (Y1 ➔ Y2 ➔ Y3 2X Boss) */}
        <div className="flex justify-between items-start text-[11px] font-mono mt-2.5 px-0.5 select-none">
          {/* Milestone 1: Y1 (+26%) */}
          <div className={`flex flex-col items-start transition-colors ${currentPrice >= targetY1 ? 'text-emerald-300' : 'text-slate-400'}`}>
            <div className="flex items-center gap-1 font-bold">
              {currentPrice >= targetY1 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
              )}
              <span>Y1: +26%</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">${targetY1.toFixed(0)}</span>
          </div>

          {/* Milestone 2: Y2 (+59%) */}
          <div className={`flex flex-col items-center transition-colors ${currentPrice >= targetY2 ? 'text-emerald-300' : activeMission.stage === 2 ? 'text-orange-300' : 'text-slate-400'}`}>
            <div className="flex items-center gap-1 font-bold">
              {currentPrice >= targetY2 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : activeMission.stage === 2 ? (
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
              )}
              <span>Y2: +59%</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">${targetY2.toFixed(0)}</span>
          </div>

          {/* Milestone 3: Y3 2X Boss */}
          <div className={`flex flex-col items-end transition-colors ${currentPrice >= targetY3 ? 'text-amber-300' : 'text-orange-400'}`}>
            <div className="flex items-center gap-1 font-bold">
              {currentPrice >= targetY3 ? (
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Flame className="w-3.5 h-3.5 text-orange-400" />
              )}
              <span>Y3: 100% (2X)</span>
            </div>
            <span className="text-[10px] text-orange-300 font-medium">${targetY3.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Mission Control & Stepping Target Storytelling */}
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

        {/* Step 2: Active Stepping Mission */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">ภารกิจ:</span>
          {activeMission.isComplete ? (
            <span className="text-amber-300 font-bold flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              สำเร็จเป้าหมาย 2X แล้ว!
            </span>
          ) : (
            <span className="text-orange-300 font-bold flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-orange-400" />
              <span>{activeMission.title}: เหลืออีก +${activeMission.remainingToStage.toFixed(2)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoublerPowerTube;
