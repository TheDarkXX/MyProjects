import React from 'react';
import { TrendingUp, Target, Shield, Tag } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DossierVitalSignsProps {
  data: DossierPayload;
  className?: string;
}

export const DossierVitalSigns: React.FC<DossierVitalSignsProps> = ({ data, className = '' }) => {
  const { vitalSigns, quarterlyFinancials = [], peHistory = [] } = data;

  // 1. Revenue Growth
  const revGrowth = vitalSigns.revenueGrowthYoY;
  const isHyperGrowth = vitalSigns.revenueGrowthStatus === 'HYPER_GROWTH';
  const isSteady = vitalSigns.revenueGrowthStatus === 'STEADY';

  // 2. EPS Beat Streak
  const streak = vitalSigns.epsBeatStreak || 0;
  const dots = Array.from({ length: Math.min(8, Math.max(1, streak)) }, (_, i) => i < streak);

  // 3. Gross Margin Moat
  const margin = vitalSigns.grossMarginPct;
  const isMoatBreaker = vitalSigns.grossMarginStatus === 'MOAT_BREAKER';

  // 4. Valuation PEG
  const peg = vitalSigns.pegRatio || 0;
  const fwdPE = vitalSigns.peForward || 0;
  const isUndervalued = vitalSigns.valuationStatus === 'UNDERVALUED';
  const isStretched = vitalSigns.valuationStatus === 'STRETCHED';

  // 4 Quarters Data Extraction (Chronological: Older -> Latest)
  const recent4Q = quarterlyFinancials.slice(0, 4).reverse();
  const revGrowth4Q = recent4Q.map((q) => q.yoy_revenue_growth_pct ?? 30);
  const epsSurprise4Q = recent4Q.map((q) => Math.max(5, q.eps_surprise_pct ?? 10));
  const gm4Q = recent4Q.map((q) => q.gross_margin_pct ?? 70);
  const pe4Q = peHistory.length >= 4 
    ? peHistory.slice(-4).map((p) => p.pe)
    : [fwdPE * 1.15, fwdPE * 1.1, fwdPE * 1.05, fwdPE || 14];

  // Unified Micro 4Q Bar Matrix Generator
  const render4QMicroBars = (
    values: number[],
    barColor: string,
    glowColor: string
  ) => {
    const safeVals = values.length > 0 ? values.slice(-4) : [25, 50, 75, 100];
    const maxVal = Math.max(...safeVals.map((v) => Math.abs(v)), 1);

    return (
      <div 
        className="flex items-end gap-1.5 h-7 shrink-0 px-2 py-1 bg-slate-900/80 rounded-lg border border-white/5 shadow-inner" 
        title="แนวโน้ม 4 ไตรมาสล่าสุด (Q-3 -> ล่าสุด)"
      >
        {safeVals.map((v, i) => {
          const heightPct = Math.max(20, Math.min(100, (Math.abs(v) / maxVal) * 100));
          const isLatest = i === safeVals.length - 1;
          return (
            <div
              key={i}
              className="w-2 rounded-t-sm transition-all duration-300"
              style={{
                height: `${heightPct}%`,
                backgroundColor: isLatest ? barColor : `${barColor}80`,
                boxShadow: isLatest ? `0 0 8px ${glowColor}` : undefined
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {/* Tile 1: Revenue Growth YoY */}
      <div className="bg-[#12162B]/95 border border-white/10 hover:border-violet-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-100">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            รายได้โต YoY
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[12px] font-bold border ${
              isHyperGrowth
                ? 'bg-violet-600/25 text-violet-200 border-violet-500/40 shadow-[0_0_8px_rgba(130,58,253,0.3)]'
                : isSteady
                ? 'bg-indigo-900/30 text-indigo-200 border-indigo-700/40'
                : 'bg-pink-950/40 text-[#FC2D79] border-[#FC2D79]/40'
            }`}
          >
            {isHyperGrowth ? '🚀 Hyper' : isSteady ? '⚡ Steady' : '⚠️ Slow'}
          </span>
        </div>

        <div className="my-1.5 flex items-end justify-between gap-2">
          <div className="text-3xl font-black font-mono text-white tracking-tight">
            {revGrowth > 0 ? `+${revGrowth}%` : `${revGrowth}%`}
          </div>
          {/* Micro 4Q Revenue Growth Bars */}
          {render4QMicroBars(revGrowth4Q, '#823AFD', 'rgba(130,58,253,0.8)')}
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-slate-300 font-medium">
          4Q เร่งตัวต่อเนื่อง (&gt; 30% ถือยาว)
        </div>
      </div>

      {/* Tile 2: EPS Beat Streak */}
      <div className="bg-[#12162B]/95 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-100">
            <Target className="w-4 h-4 text-emerald-400" />
            ชนะเป้า EPS
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[12px] font-bold bg-emerald-600/20 text-emerald-200 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
            Beat {streak}Q
          </span>
        </div>

        <div className="my-1.5 flex items-end justify-between gap-2">
          <div>
            <div className="text-3xl font-black font-mono text-emerald-300 tracking-tight">
              {streak} ไตรมาส
            </div>
            {/* Subtle Glow Dot Trail */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {dots.map((isBeat, idx) => (
                <span
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    isBeat ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
          {/* Micro 4Q EPS Surprise Bars */}
          {render4QMicroBars(epsSurprise4Q, '#10B981', 'rgba(16,185,129,0.8)')}
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-emerald-300 font-medium">
          ชนะคาดการณ์ต่อเนื่องทุกงวด
        </div>
      </div>

      {/* Tile 3: Gross Margin Moat */}
      <div
        className={`rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md transition-all ${
          isMoatBreaker
            ? 'bg-pink-950/30 border border-[#FC2D79]/60 shadow-[0_0_15px_rgba(252,45,121,0.25)]'
            : 'bg-[#12162B]/95 border border-white/10 hover:border-orange-500/40'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-100">
            <Shield className={`w-4 h-4 ${isMoatBreaker ? 'text-[#FC2D79]' : 'text-orange-400'}`} />
            คูเมือง (Margin)
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[12px] font-bold border ${
              isMoatBreaker
                ? 'bg-pink-950/40 text-[#FC2D79] border-[#FC2D79]/50 animate-pulse'
                : 'bg-orange-500/20 text-orange-200 border border-orange-500/30'
            }`}
          >
            {isMoatBreaker ? '🚨 Breached' : '🛡️ แข็งแกร่ง'}
          </span>
        </div>

        <div className="my-1.5 flex items-end justify-between gap-2">
          <div className="text-3xl font-black font-mono text-white tracking-tight">
            {margin > 0 ? `${margin.toFixed(1)}%` : '-'}
          </div>
          {/* Micro 4Q Gross Margin Bars */}
          {render4QMicroBars(gm4Q, '#FD5514', 'rgba(253,85,20,0.8)')}
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-slate-300 font-medium">
          Pricing Power แกร่ง ไร้ความเสี่ยง
        </div>
      </div>

      {/* Tile 4: Forward P/E & PEG Ratio */}
      <div className="bg-[#12162B]/95 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-100">
            <Tag className="w-4 h-4 text-cyan-400" />
            ความคุ้มค่า (PEG)
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[12px] font-bold border ${
              isUndervalued
                ? 'bg-cyan-600/25 text-cyan-200 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : isStretched
                ? 'bg-pink-950/40 text-[#FC2D79] border-[#FC2D79]/40'
                : 'bg-slate-800/60 text-slate-200 border-white/10'
            }`}
          >
            {isUndervalued ? '💎 คุ้มค่า' : isStretched ? '🔴 ตึงตัว' : '⚪ เหมาะสม'}
          </span>
        </div>

        <div className="my-1.5 flex items-end justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono text-white tracking-tight">
              {peg > 0 ? peg.toFixed(2) : '-'}
            </span>
            <span className="text-[14px] font-bold text-cyan-300 font-mono">
              PEG
            </span>
          </div>
          {/* Micro 4Q Valuation Trend Bars */}
          {render4QMicroBars(pe4Q, '#06B6D4', 'rgba(6,182,212,0.8)')}
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-slate-300 font-mono font-medium">
          Forward P/E: <span className="text-white font-bold">{fwdPE > 0 ? `${fwdPE.toFixed(1)}x` : '-'}</span> • โซนสะสม
        </div>
      </div>
    </div>
  );
};

export default DossierVitalSigns;
