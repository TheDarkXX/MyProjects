import React from 'react';
import { TrendingUp, Target, Shield, Tag } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DossierVitalSignsProps {
  data: DossierPayload;
}

export const DossierVitalSigns: React.FC<DossierVitalSignsProps> = ({ data }) => {
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

  // Sparkline generator helper
  const renderMiniSparkline = (values: number[], strokeColor: string, fillColor: string) => {
    if (values.length < 2) return null;
    const w = 48;
    const h = 20;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = Math.max(1, maxVal - minVal);
    
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - minVal) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const areaPoints = `0,${h} ${points} ${w},${h}`;

    return (
      <svg width={w} height={h} className="overflow-visible shrink-0">
        <polygon points={areaPoints} fill={fillColor} opacity={0.3} />
        <polyline points={points} fill="none" stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={w} cy={h - ((values[values.length - 1] - minVal) / range) * (h - 4) - 2} r={2.5} fill={strokeColor} />
      </svg>
    );
  };

  const rev4Q = quarterlyFinancials.slice(0, 4).reverse().map(q => q.revenue_usd || 0);
  const gm4Q = quarterlyFinancials.slice(0, 4).reverse().map(q => q.gross_margin_pct || 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Tile 1: Revenue Growth YoY */}
      <div className="bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between backdrop-blur-md hover:border-blue-700/50 transition-all">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-200">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            รายได้โต YoY
          </span>
          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
            isHyperGrowth 
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
              : isSteady 
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' 
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
          }`}>
            {isHyperGrowth ? '🔥 Hyper' : isSteady ? '⚡ Steady' : '⚠️ Slow'}
          </span>
        </div>

        <div className="my-2 flex items-end justify-between gap-2">
          <div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {revGrowth > 0 ? `+${revGrowth}%` : `${revGrowth}%`}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              YoY Revenue Acceleration
            </p>
          </div>
          {renderMiniSparkline(rev4Q, '#38BDF8', '#0284C7')}
        </div>

        <div className="pt-2 border-t border-blue-900/30 text-xs text-slate-300 flex items-center justify-between">
          <span className="text-slate-400">เกณฑ์:</span>
          <span className="font-bold text-emerald-400">&gt; 30% ถือยาว</span>
        </div>
      </div>

      {/* Tile 2: EPS Beat Streak */}
      <div className="bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between backdrop-blur-md hover:border-blue-700/50 transition-all">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-200">
            <Target className="w-4 h-4 text-emerald-400" />
            ชนะเป้า EPS
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Beat {streak}Q
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
            {streak} ไตรมาส
          </div>
          {/* Dot Trail Visual */}
          <div className="flex items-center gap-1.5 mt-2">
            {dots.map((isBeat, idx) => (
              <span
                key={idx}
                className={`w-2.5 h-2.5 rounded-full flex items-center justify-center ${
                  isBeat ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-700'
                }`}
                title={`ไตรมาสที่ -${idx + 1}`}
              />
            ))}
            <span className="text-xs text-slate-400 font-medium ml-1">ล่าสุด</span>
          </div>
        </div>

        <div className="pt-2 border-t border-blue-900/30 text-xs text-slate-300 flex items-center justify-between">
          <span className="text-slate-400">สถิติ:</span>
          <span className="font-bold text-emerald-300">ชนะเป้าต่อเนื่อง</span>
        </div>
      </div>

      {/* Tile 3: Gross Margin Moat */}
      <div className={`rounded-2xl p-4 shadow-lg flex flex-col justify-between backdrop-blur-md transition-all ${
        isMoatBreaker 
          ? 'bg-gradient-to-b from-[#1C0816] to-[#0A1022] border border-rose-500/60' 
          : 'bg-[#0A1022]/90 border border-blue-900/40 hover:border-blue-700/50'
      }`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-200">
            <Shield className={`w-4 h-4 ${isMoatBreaker ? 'text-rose-400' : 'text-cyan-400'}`} />
            คูเมือง (Margin)
          </span>
          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
            isMoatBreaker
              ? 'bg-rose-500/25 text-rose-200 border border-rose-500/50 animate-pulse'
              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
          }`}>
            {isMoatBreaker ? '🚨 Breached' : '🛡️ แข็งแกร่ง'}
          </span>
        </div>

        <div className="my-2 flex items-end justify-between gap-2">
          <div>
            <div className="text-3xl font-black font-mono text-white tracking-tight">
              {margin > 0 ? `${margin.toFixed(1)}%` : '-'}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Pricing Power Moat
            </p>
          </div>
          {renderMiniSparkline(gm4Q, '#10B981', '#059669')}
        </div>

        <div className="pt-2 border-t border-blue-900/30 text-xs text-slate-300 flex items-center justify-between">
          <span className="text-slate-400">ระวัง:</span>
          <span className="font-bold text-slate-200">ลด 3Q ติด = ลดเสี่ยง</span>
        </div>
      </div>

      {/* Tile 4: Forward P/E & PEG Ratio */}
      <div className="bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between backdrop-blur-md hover:border-blue-700/50 transition-all">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-bold tracking-wide uppercase flex items-center gap-1.5 text-slate-200">
            <Tag className="w-4 h-4 text-purple-400" />
            ความคุ้มค่า (PEG)
          </span>
          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
            isUndervalued
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : isStretched
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
          }`}>
            {isUndervalued ? '🟢 ถูกเทียบโต' : isStretched ? '⚠️ ตึงตัว' : '🟡 เหมาะสม'}
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white tracking-tight">
              {peg > 0 ? peg.toFixed(2) : '-'}
            </span>
            <span className="text-sm font-bold text-cyan-300 font-mono">
              PEG
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Forward P/E: <span className="text-slate-100 font-bold">{fwdPE > 0 ? `${fwdPE.toFixed(1)}x` : '-'}</span>
          </p>
        </div>

        <div className="pt-2 border-t border-blue-900/30 text-xs text-slate-300 flex items-center justify-between">
          <span className="text-slate-400">เกณฑ์เก็บ:</span>
          <span className="font-bold text-emerald-400">PEG &lt; 1.5</span>
        </div>
      </div>
    </div>
  );
};

export default DossierVitalSigns;
