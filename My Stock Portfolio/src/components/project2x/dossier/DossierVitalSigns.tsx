import React from 'react';
import { TrendingUp, Target, Shield, Tag } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DossierVitalSignsProps {
  data: DossierPayload;
  className?: string;
}

export const DossierVitalSigns: React.FC<DossierVitalSignsProps> = ({ data, className = '' }) => {
  const { vitalSigns, quarterlyFinancials = [] } = data;

  // 1. Revenue Growth Styling
  const revGrowth = vitalSigns.revenueGrowthYoY;
  const isHyperGrowth = vitalSigns.revenueGrowthStatus === 'HYPER_GROWTH';
  const isSteady = vitalSigns.revenueGrowthStatus === 'STEADY';

  // 2. EPS Beat Streak Dot Trail
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

  // Elegant Mini Sparkline Helper
  const renderMiniSparkline = (values: number[], strokeColor: string, fillColor: string) => {
    if (values.length < 2) return null;
    const w = 52;
    const h = 24;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = Math.max(1, maxVal - minVal);

    const points = values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - minVal) / range) * (h - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const areaPoints = `0,${h} ${points} ${w},${h}`;

    return (
      <svg width={w} height={h} className="overflow-visible shrink-0">
        <polygon points={areaPoints} fill={fillColor} opacity={0.25} />
        <polyline points={points} fill="none" stroke={strokeColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={w} cy={h - ((values[values.length - 1] - minVal) / range) * (h - 6) - 3} r={3} fill={strokeColor} />
      </svg>
    );
  };

  const rev4Q = quarterlyFinancials.slice(0, 4).reverse().map((q) => q.revenue_usd || 0);
  const gm4Q = quarterlyFinancials.slice(0, 4).reverse().map((q) => q.gross_margin_pct || 0);

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
          {renderMiniSparkline(rev4Q, '#823AFD', '#3A0090')}
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-slate-300 font-medium">
          4Q เร่งตัวต่อเนื่อง (&gt; 30% ถือยาว)
        </div>
      </div>

      {/* Tile 2: EPS Beat Streak */}
      <div className="bg-[#12162B]/95 border border-white/10 hover:border-violet-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-100">
            <Target className="w-4 h-4 text-violet-400" />
            ชนะเป้า EPS
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[12px] font-bold bg-violet-600/20 text-violet-200 border border-violet-500/40 shadow-[0_0_8px_rgba(130,58,253,0.3)]">
            Beat {streak}Q
          </span>
        </div>

        <div className="my-1.5">
          <div className="text-3xl font-black font-mono text-violet-200 tracking-tight">
            {streak} ไตรมาส
          </div>
          {/* Subtle Glow Dot Trail */}
          <div className="flex items-center gap-1.5 mt-2">
            {dots.map((isBeat, idx) => (
              <span
                key={idx}
                className={`w-2.5 h-2.5 rounded-full ${
                  isBeat ? 'bg-[#823AFD] shadow-[0_0_8px_rgba(130,58,253,0.8)]' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-violet-300 font-medium">
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
          {renderMiniSparkline(gm4Q, '#FD5514', '#9A3412')}
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-slate-300 font-medium">
          Pricing Power แกร่ง ไร้ความเสี่ยง
        </div>
      </div>

      {/* Tile 4: Forward P/E & PEG Ratio */}
      <div className="bg-[#12162B]/95 border border-white/10 hover:border-violet-500/40 rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-100">
            <Tag className="w-4 h-4 text-violet-400" />
            ความคุ้มค่า (PEG)
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[12px] font-bold border ${
              isUndervalued
                ? 'bg-violet-600/25 text-violet-200 border-violet-500/40 shadow-[0_0_8px_rgba(130,58,253,0.3)]'
                : isStretched
                ? 'bg-pink-950/40 text-[#FC2D79] border-[#FC2D79]/40'
                : 'bg-slate-800/60 text-slate-200 border-white/10'
            }`}
          >
            {isUndervalued ? '💎 คุ้มค่า' : isStretched ? '🔴 ตึงตัว' : '⚪ เหมาะสม'}
          </span>
        </div>

        <div className="my-1.5 flex items-baseline gap-2">
          <span className="text-3xl font-black font-mono text-white tracking-tight">
            {peg > 0 ? peg.toFixed(2) : '-'}
          </span>
          <span className="text-[14px] font-bold text-violet-300 font-mono">
            PEG
          </span>
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-slate-300 font-mono font-medium">
          Forward P/E: <span className="text-white font-bold">{fwdPE > 0 ? `${fwdPE.toFixed(1)}x` : '-'}</span> • โซนสะสม
        </div>
      </div>
    </div>
  );
};

export default DossierVitalSigns;
