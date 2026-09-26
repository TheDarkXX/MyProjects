import React, { useState, useMemo } from 'react';
import { Target, Flame, Sparkles, Clock, CheckCircle2, Trophy, Compass, RotateCcw, Lock, Zap, Shield } from 'lucide-react';
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

  // Multi-Bagger Exponential Milestones (1X ➔ 2X ➔ 4X ➔ 8X)
  const target1X = basePrice;
  const target2X = Number((basePrice * 2).toFixed(2));
  const target4X = Number((basePrice * 4).toFixed(2));
  const target8X = Number((basePrice * 8).toFixed(2));

  const multiplier = basePrice > 0 ? currentPrice / basePrice : 1;
  const pnlDollar = currentPrice - basePrice;
  const pnlPct = basePrice > 0 ? (pnlDollar / basePrice) * 100 : unrealizedPnlPct;
  const isProfit = pnlDollar >= 0;

  // 2. Compute Active Multi-Bagger Level & Pod Progress
  let activeLevel = 1;
  if (currentPrice >= target8X) activeLevel = 4;
  else if (currentPrice >= target4X) activeLevel = 3;
  else if (currentPrice >= target2X) activeLevel = 2;

  // Pod 1 Progress (1X ➔ 2X)
  let pod1Pct = 0;
  if (currentPrice >= target2X) {
    pod1Pct = 100;
  } else if (currentPrice > target1X) {
    pod1Pct = Math.min(100, Math.max(0, ((currentPrice - target1X) / (target2X - target1X)) * 100));
  }

  // Pod 2 Progress (2X ➔ 4X)
  let pod2Pct = 0;
  if (currentPrice >= target4X) {
    pod2Pct = 100;
  } else if (currentPrice > target2X) {
    pod2Pct = Math.min(100, Math.max(0, ((currentPrice - target2X) / (target4X - target2X)) * 100));
  }

  // Pod 3 Progress (4X ➔ 8X)
  let pod3Pct = 0;
  if (currentPrice >= target8X) {
    pod3Pct = 100;
  } else if (currentPrice > target4X) {
    pod3Pct = Math.min(100, Math.max(0, ((currentPrice - target4X) / (target8X - target4X)) * 100));
  }

  // 3. First Buy Date & Thesis Horizon Telemetry
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

  // 4. Pace Telemetry (Current Price vs Ideal Exponential Pace Curve)
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

    if (currentPrice >= target2X) {
      const gainPct = basePrice > 0 ? ((currentPrice - basePrice) / basePrice) * 100 : 100;
      return {
        idealPrice: target2X,
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
    let badgeClass = 'text-amber-300 bg-amber-950/60 border-amber-500/40';

    if (timeTelemetry.daysRemaining <= 0 && currentPrice < target2X) {
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
  }, [basePrice, currentPrice, timeTelemetry, target2X, horizonYears]);

  return (
    <div className="bg-[#12162B] p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md flex flex-col justify-between gap-3.5 h-full transition-all group select-none">
      {/* 1. Top Header: Symbol, Tier, Multi-Bagger Level Title & Total Gain */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Symbol & Compounder Category */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1A1D2D] border border-white/10 text-white font-black font-heading text-sm shadow-md">
            <span>{data?.symbol || 'STOCK'}</span>
            <span className="text-[#9898C8] text-[11px] font-bold">•</span>
            <span className="text-amber-300 text-[12px] font-extrabold">TIER {data?.category || 'S'}</span>
            <span className="text-[#9898C8] text-[11px] font-bold">•</span>
            <span className="text-[#FC2D79] text-[12px] font-bold tracking-tight">
              {activeLevel >= 3 ? 'DYNASTY COMPOUNDER' : activeLevel === 2 ? 'MONSTER COMPOUNDER' : 'LEVEL 1 RUNNER'}
            </span>
          </div>

          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-mono font-bold tracking-tight ${paceAnalysis.badgeClass}`}>
            <span>{paceAnalysis.label}</span>
          </div>
        </div>

        {/* Right: Total Gain in Hot Pink & Renew 3Y Action */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[#9898C8] text-[11px] font-bold uppercase tracking-wider">TOTAL GAIN</span>
            <span className="text-[#FC2D79] font-mono font-black text-lg tabular-nums drop-shadow-[0_0_12px_rgba(252,45,121,0.4)]">
              {isProfit ? '+' : ''}{pnlPct.toFixed(1)}%
            </span>
          </div>

          <button
            onClick={handleRenew}
            disabled={isRenewing}
            title="รีเซ็ต/ต่ออายุรอบ Thesis 3 ปีใหม่จากราคาวันนี้"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1A1D2D] hover:bg-orange-950/60 border border-white/10 hover:border-orange-500/50 text-slate-300 hover:text-orange-200 text-[12px] font-mono font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-orange-400 ${isRenewing ? 'animate-spin' : ''}`} />
            <span>{isRenewing ? 'กำลังต่ออายุ...' : 'Renew 3Y'}</span>
          </button>
        </div>
      </div>

      {/* 2. Middle Hero: MULTI-BAGGER COMBO GAUGE (3 Horizontal Segmented Pods) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[#9898C8] text-[12px] font-mono font-bold px-0.5">
          <span className="tracking-wide text-slate-200 uppercase font-heading">
            MULTI-BAGGER COMBO GAUGE
          </span>
          <span className="text-[12px] text-[#9898C8] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-orange-400 inline" />
            <span>ถือ: <strong className="text-white font-bold">{timeTelemetry.heldText}</strong></span>
            <span className="text-slate-500">•</span>
            <span>เหลือ: <strong className="text-orange-300 font-bold">{timeTelemetry.remainingText}</strong></span>
          </span>
        </div>

        {/* The 3 Segmented Pods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* ========================================================
              POD 1: LEVEL 1 (1X ➔ 2X)
              Range: $target1X ➔ $target2X
             ======================================================== */}
          <div className="flex flex-col gap-1.5 bg-[#0D111F]/80 p-2.5 rounded-xl border border-white/10 shadow-inner">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-300 font-bold">LEVEL 1: 1X ➔ 2X</span>
              <span className="text-[#9898C8]">${target1X.toFixed(0)} ➔ ${target2X.toFixed(0)}</span>
            </div>

            {/* Pod 1 Rail */}
            <div className="relative h-10 w-full rounded-xl bg-slate-950/90 border border-white/15 overflow-hidden flex items-center p-1 shadow-inner">
              <div
                className={`h-full rounded-lg transition-all duration-700 flex items-center justify-center ${
                  pod1Pct >= 100
                    ? 'bg-gradient-to-r from-[#FD5514] to-[#B91C1C] shadow-[0_0_16px_rgba(253,58,24,0.45)]'
                    : 'bg-gradient-to-r from-[#FD5514]/70 to-[#B91C1C]/70 shadow-[0_0_12px_rgba(253,58,24,0.25)]'
                }`}
                style={{ width: `${Math.max(8, pod1Pct)}%` }}
              >
                <span className="font-mono font-black text-white text-[12px] tracking-wider px-1">
                  {pod1Pct.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Pod 1 Bottom Badge */}
            <div className="pt-0.5">
              {pod1Pct >= 100 ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FC2D79]/15 border border-[#FC2D79]/40 text-[#FC2D79] text-[11px] font-bold font-mono shadow-sm">
                  <Trophy className="w-3 h-3 text-[#FC2D79]" />
                  <span>ACHIEVED in {timeTelemetry.heldText}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-950/40 border border-orange-500/40 text-orange-300 text-[11px] font-bold font-mono">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span>RACING TO 2X (${target2X.toFixed(0)})</span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              POD 2: LEVEL 2 (2X ➔ 4X)
              Range: $target2X ➔ $target4X
             ======================================================== */}
          <div className="flex flex-col gap-1.5 bg-[#0D111F]/80 p-2.5 rounded-xl border border-white/10 shadow-inner">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-300 font-bold">LEVEL 2: 2X ➔ 4X</span>
              <span className="text-[#9898C8]">${target2X.toFixed(0)} ➔ ${target4X.toFixed(0)}</span>
            </div>

            {/* Pod 2 Rail */}
            <div className="relative h-10 w-full rounded-xl bg-slate-950/90 border border-white/15 overflow-hidden flex items-center p-1 shadow-inner">
              {pod2Pct > 0 ? (
                <div
                  className={`h-full rounded-lg transition-all duration-700 flex items-center justify-center ${
                    pod2Pct >= 100
                      ? 'bg-gradient-to-r from-[#823AFD] to-[#FC2D79] shadow-[0_0_18px_rgba(252,45,121,0.5)]'
                      : 'bg-gradient-to-r from-[#823AFD] via-[#FC2D79] to-[#FD5514] shadow-[0_0_18px_rgba(252,45,121,0.4)]'
                  }`}
                  style={{ width: `${Math.max(12, pod2Pct)}%` }}
                >
                  <span className="font-mono font-black text-white text-[12px] tracking-wider px-1">
                    {pod2Pct.toFixed(0)}%
                  </span>
                </div>
              ) : (
                <div className="w-full h-full rounded-lg bg-[#1A1D2D]/60 flex items-center justify-center text-[#9898C8] text-[11px] font-mono">
                  <Lock className="w-3 h-3 mr-1 text-[#9898C8]" />
                  <span>LOCKED (รอแตะ ${target2X.toFixed(0)})</span>
                </div>
              )}
            </div>

            {/* Pod 2 Bottom Badge */}
            <div className="pt-0.5">
              {pod2Pct >= 100 ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FC2D79]/20 border border-[#FC2D79]/50 text-white text-[11px] font-bold font-mono shadow-sm">
                  <Trophy className="w-3 h-3 text-[#FC2D79]" />
                  <span>4X ACHIEVED!</span>
                </div>
              ) : pod2Pct > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-950/60 border border-violet-500/40 text-violet-200 text-[11px] font-bold font-mono shadow-sm">
                  <Zap className="w-3 h-3 text-violet-400" />
                  <span>RACING TO 4X TARGET (${target4X.toFixed(0)})</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-medium font-mono">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>NEXT TARGET (${target4X.toFixed(0)})</span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================
              POD 3: LEVEL 3 (4X ➔ 8X)
              Range: $target4X ➔ $target8X
             ======================================================== */}
          <div className="flex flex-col gap-1.5 bg-[#0D111F]/80 p-2.5 rounded-xl border border-white/10 shadow-inner">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-300 font-bold">LEVEL 3: 4X ➔ 8X</span>
              <span className="text-[#9898C8]">${target4X.toFixed(0)} ➔ ${target8X.toFixed(0)}</span>
            </div>

            {/* Pod 3 Rail */}
            <div className="relative h-10 w-full rounded-xl bg-slate-950/90 border border-white/15 overflow-hidden flex items-center p-1 shadow-inner">
              {pod3Pct > 0 ? (
                <div
                  className="h-full rounded-lg bg-gradient-to-r from-amber-400 via-rose-500 to-[#FC2D79] shadow-[0_0_18px_rgba(251,191,36,0.4)] flex items-center justify-center transition-all duration-700"
                  style={{ width: `${Math.max(12, pod3Pct)}%` }}
                >
                  <span className="font-mono font-black text-white text-[12px] tracking-wider px-1">
                    {pod3Pct.toFixed(0)}%
                  </span>
                </div>
              ) : (
                <div className="w-full h-full rounded-lg bg-[#1A1D2D]/60 flex items-center justify-center text-[#9898C8] text-[11px] font-mono">
                  <Lock className="w-3 h-3 mr-1 text-[#9898C8]" />
                  <span>NEXT DYNASTY (${target8X.toFixed(0)})</span>
                </div>
              )}
            </div>

            {/* Pod 3 Bottom Badge */}
            <div className="pt-0.5">
              {pod3Pct >= 100 ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-200 text-[11px] font-bold font-mono">
                  <Trophy className="w-3 h-3 text-amber-300" />
                  <span>8X DYNASTY ACHIEVED!</span>
                </div>
              ) : pod3Pct > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[11px] font-bold font-mono">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>RACING TO 8X TARGET (${target8X.toFixed(0)})</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-medium font-mono">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>NEXT DYNASTY (${target8X.toFixed(0)})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Footer: Origin Base, Current Market Price & Multiplier Telemetry */}
      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between text-[13px] font-mono text-slate-300 gap-2">
        {/* Origin Base & Live Market Price */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#9898C8]">ทุนตั้งต้น (1X):</span>
          <strong className="text-white font-bold">${basePrice.toFixed(2)}</strong>
          <span className="text-slate-500">•</span>
          <span className="text-[#9898C8]">ราคาตลาด:</span>
          <strong className="text-white font-bold">${currentPrice.toFixed(2)}</strong>
          <span className="text-slate-500">•</span>
          <span className="text-[#FC2D79] font-bold">
            กำไร {isProfit ? '+' : ''}${pnlDollar.toFixed(2)} ({isProfit ? '+' : ''}{pnlPct.toFixed(1)}%)
          </span>
        </div>

        {/* Multiplier Badge & Compounding Rule */}
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-violet-900/50 to-pink-900/50 border border-[#FC2D79]/40 text-white font-mono font-bold text-[12px] flex items-center gap-1.5 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-[#FC2D79]" />
            <span>{multiplier.toFixed(2)}X MULTIPLIER</span>
          </div>
          <span className="text-[#9898C8] text-[12px] font-medium hidden sm:inline">
            (ถือทบตามกฎ 20-Year Dynasty ไม่ขายผู้ชนะ)
          </span>
        </div>
      </div>
    </div>
  );
};

export default DoublerPowerTube;
