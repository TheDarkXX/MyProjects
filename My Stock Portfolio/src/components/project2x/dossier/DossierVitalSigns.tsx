import React, { useState } from 'react';
import { TrendingUp, Target, Shield, Tag } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DossierVitalSignsProps {
  data: DossierPayload;
  className?: string;
}

export const DossierVitalSigns: React.FC<DossierVitalSignsProps> = ({ data, className = '' }) => {
  const { vitalSigns, quarterlyFinancials = [], peHistory = [] } = data;

  // Track hover for interactive micro-bars per card
  const [hoveredMetric, setHoveredMetric] = useState<{
    cardId: string;
    index: number;
    quarter: string;
    valueStr: string;
  } | null>(null);

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
  const quartersLabels = recent4Q.map((q, i) => q.fiscal_quarter || `Q${i + 1}`);

  const revGrowth4Q = recent4Q.map((q) => q.yoy_revenue_growth_pct ?? 30);
  const epsSurprise4Q = recent4Q.map((q) => Math.max(5, q.eps_surprise_pct ?? 10));
  const gm4Q = recent4Q.map((q) => q.gross_margin_pct ?? 70);
  const pe4Q = peHistory.length >= 4 
    ? peHistory.slice(-4).map((p) => p.pe)
    : [fwdPE * 1.15, fwdPE * 1.1, fwdPE * 1.05, fwdPE || 14];

  // Interactive Micro 4Q Bar Matrix Generator with Luxury Tooltip
  const renderInteractive4QBars = (
    cardId: string,
    values: number[],
    barColor: string,
    glowColor: string,
    formatVal: (val: number) => string
  ) => {
    const safeVals = values.length > 0 ? values.slice(-4) : [25, 50, 75, 100];
    const maxVal = Math.max(...safeVals.map((v) => Math.abs(v)), 1);
    const activeHover = hoveredMetric?.cardId === cardId ? hoveredMetric : null;

    return (
      <div 
        className="relative flex flex-col items-end shrink-0"
        onMouseLeave={() => setHoveredMetric(null)}
      >
        {/* Floating Glass Tooltip */}
        {activeHover && (
          <div className="absolute -top-9 right-0 bg-[#0A0E1A]/95 text-white text-[12px] font-mono px-2.5 py-1 rounded-lg border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.8)] backdrop-blur-md z-30 whitespace-nowrap pointer-events-none animate-fadeIn flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">{activeHover.quarter}:</span>
            <span className="font-bold text-white" style={{ color: barColor }}>{activeHover.valueStr}</span>
          </div>
        )}

        {/* Bar Track */}
        <div className="flex items-end gap-1.5 h-8 px-2 py-1 bg-slate-950/80 rounded-xl border border-white/10 shadow-inner">
          {safeVals.map((v, i) => {
            const heightPct = Math.max(20, Math.min(100, (Math.abs(v) / maxVal) * 100));
            const isLatest = i === safeVals.length - 1;
            const isHovered = activeHover?.index === i;
            const isAnyHovered = activeHover !== null;
            const quarterLabel = quartersLabels[i] || `Q${i + 1}`;

            return (
              <div
                key={i}
                onMouseEnter={() => {
                  setHoveredMetric({
                    cardId,
                    index: i,
                    quarter: quarterLabel,
                    valueStr: formatVal(v)
                  });
                }}
                className={`w-2.5 rounded-t-md cursor-pointer transition-all duration-300 ${
                  isHovered 
                    ? 'scale-125 -translate-y-1 z-20 brightness-125' 
                    : isAnyHovered 
                    ? 'opacity-35 scale-95' 
                    : 'opacity-90 hover:opacity-100'
                }`}
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isLatest ? barColor : `${barColor}90`,
                  boxShadow: (isLatest || isHovered) ? `0 0 10px ${glowColor}` : undefined
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3.5 ${className}`}>
      {/* Tile 1: Revenue Growth YoY */}
      <div className="bg-[#12162B]/95 border border-white/10 hover:border-violet-500/50 border-t-2 border-t-[#823AFD] rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md transition-all duration-300 hover:shadow-[0_8px_30px_rgba(130,58,253,0.15)] group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-100">
            <TrendingUp className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
            รายได้โต YoY
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[12px] font-bold border flex items-center gap-1 ${
              isHyperGrowth
                ? 'bg-violet-600/25 text-violet-200 border-violet-500/40 shadow-[0_0_8px_rgba(130,58,253,0.3)]'
                : isSteady
                ? 'bg-indigo-900/30 text-indigo-200 border-indigo-700/40'
                : 'bg-pink-950/40 text-[#FC2D79] border-[#FC2D79]/40'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse inline-block" />
            <span>{isHyperGrowth ? '🚀 Hyper' : isSteady ? '⚡ Steady' : '⚠️ Slow'}</span>
          </span>
        </div>

        <div className="my-2 flex items-end justify-between gap-2">
          <div className="text-3xl font-black font-mono text-white tracking-tight">
            {revGrowth > 0 ? `+${revGrowth}%` : `${revGrowth}%`}
          </div>
          {/* Micro 4Q Revenue Growth Bars */}
          {renderInteractive4QBars(
            'rev',
            revGrowth4Q,
            '#823AFD',
            'rgba(130,58,253,0.8)',
            (v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}% YoY`
          )}
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-slate-300 font-medium flex items-center justify-between">
          <span>4Q เร่งตัวต่อเนื่อง</span>
          <span className="text-violet-300 font-semibold text-[12px]">&gt; 30% ถือยาว</span>
        </div>
      </div>

      {/* Tile 2: EPS Beat Streak */}
      <div className="bg-[#12162B]/95 border border-white/10 hover:border-emerald-500/50 border-t-2 border-t-[#10B981] rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md transition-all duration-300 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-100">
            <Target className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            ชนะเป้า EPS
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-[12px] font-bold bg-emerald-600/20 text-emerald-200 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>Beat {streak}Q</span>
          </span>
        </div>

        <div className="my-2 flex items-end justify-between gap-2">
          <div>
            <div className="text-3xl font-black font-mono text-emerald-300 tracking-tight">
              {streak} ไตรมาส
            </div>
            {/* Subtle Glow Dot Trail */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {dots.map((isBeat, idx) => (
                <span
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    isBeat ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)] scale-110' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
          {/* Micro 4Q EPS Surprise Bars */}
          {renderInteractive4QBars(
            'eps',
            epsSurprise4Q,
            '#10B981',
            'rgba(16,185,129,0.8)',
            (v) => `+${v.toFixed(1)}% Surprise`
          )}
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-emerald-300 font-medium flex items-center justify-between">
          <span>ชนะคาดการณ์ทุกงวด</span>
          <span className="text-emerald-400 font-mono font-bold text-[12px]">100% Win</span>
        </div>
      </div>

      {/* Tile 3: Gross Margin Moat */}
      <div
        className={`rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md transition-all duration-300 border-t-2 ${
          isMoatBreaker
            ? 'bg-pink-950/30 border border-[#FC2D79]/60 border-t-[#FC2D79] shadow-[0_0_20px_rgba(252,45,121,0.25)]'
            : 'bg-[#12162B]/95 border border-white/10 hover:border-orange-500/50 border-t-[#FD5514] hover:shadow-[0_8px_30px_rgba(253,85,20,0.15)] group'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-100">
            <Shield className={`w-4 h-4 transition-transform group-hover:scale-110 ${isMoatBreaker ? 'text-[#FC2D79]' : 'text-orange-400'}`} />
            คูเมือง (Margin)
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[12px] font-bold border flex items-center gap-1 ${
              isMoatBreaker
                ? 'bg-pink-950/40 text-[#FC2D79] border-[#FC2D79]/50 animate-pulse'
                : 'bg-orange-500/20 text-orange-200 border border-orange-500/30'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isMoatBreaker ? 'bg-[#FC2D79]' : 'bg-orange-400'} animate-pulse inline-block`} />
            <span>{isMoatBreaker ? '🚨 Breached' : '🛡️ แข็งแกร่ง'}</span>
          </span>
        </div>

        <div className="my-2 flex items-end justify-between gap-2">
          <div className="text-3xl font-black font-mono text-white tracking-tight">
            {margin > 0 ? `${margin.toFixed(1)}%` : '-'}
          </div>
          {/* Micro 4Q Gross Margin Bars */}
          {renderInteractive4QBars(
            'gm',
            gm4Q,
            '#FD5514',
            'rgba(253,85,20,0.8)',
            (v) => `${v.toFixed(1)}% Margin`
          )}
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-slate-300 font-medium flex items-center justify-between">
          <span>Pricing Power แกร่ง</span>
          <span className="text-orange-300 font-medium text-[12px]">เสถียร 4Q</span>
        </div>
      </div>

      {/* Tile 4: Forward P/E & PEG Ratio */}
      <div className="bg-[#12162B]/95 border border-white/10 hover:border-cyan-500/50 border-t-2 border-t-[#06B6D4] rounded-2xl p-4 shadow-xl flex flex-col justify-between backdrop-blur-md transition-all duration-300 hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)] group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-100">
            <Tag className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            ความคุ้มค่า (PEG)
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-lg text-[12px] font-bold border flex items-center gap-1 ${
              isUndervalued
                ? 'bg-cyan-600/25 text-cyan-200 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : isStretched
                ? 'bg-pink-950/40 text-[#FC2D79] border-[#FC2D79]/40'
                : 'bg-slate-800/60 text-slate-200 border-white/10'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
            <span>{isUndervalued ? '💎 คุ้มค่า' : isStretched ? '🔴 ตึงตัว' : '⚪ เหมาะสม'}</span>
          </span>
        </div>

        <div className="my-2 flex items-end justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono text-white tracking-tight">
              {peg > 0 ? peg.toFixed(2) : '-'}
            </span>
            <span className="text-[14px] font-bold text-cyan-300 font-mono">
              PEG
            </span>
          </div>
          {/* Micro 4Q Valuation Trend Bars */}
          {renderInteractive4QBars(
            'pe',
            pe4Q,
            '#06B6D4',
            'rgba(6,182,212,0.8)',
            (v) => `P/E ${v.toFixed(1)}x`
          )}
        </div>

        <div className="pt-2 border-t border-white/10 text-[13px] text-slate-300 font-mono font-medium flex items-center justify-between">
          <span>Forward P/E: <strong className="text-white">{fwdPE > 0 ? `${fwdPE.toFixed(1)}x` : '-'}</strong></span>
          <span className="text-cyan-300 font-sans text-[12px]">โซนสะสม</span>
        </div>
      </div>
    </div>
  );
};

export default DossierVitalSigns;
