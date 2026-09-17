import React from 'react';
import { TrendingUp, Target, Shield, Tag } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DossierVitalSignsProps {
  data: DossierPayload;
}

export const DossierVitalSigns: React.FC<DossierVitalSignsProps> = ({ data }) => {
  const { vitalSigns } = data;

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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {/* Tile 1: Revenue Growth YoY */}
      <div className="bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-3 shadow-lg flex flex-col justify-between backdrop-blur-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-medium tracking-wide uppercase flex items-center gap-1.5 text-slate-200">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            รายได้โต YoY
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
            isHyperGrowth 
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
              : isSteady 
                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' 
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
          }`}>
            {isHyperGrowth ? '🔥 Hyper' : isSteady ? '⚡ Steady' : '⚠️ Slow'}
          </span>
        </div>

        <div className="my-1.5">
          <div className="text-3xl font-bold font-mono text-white tracking-tight">
            {revGrowth > 0 ? `+${revGrowth}%` : `${revGrowth}%`}
          </div>
          <p className="text-[11px] text-slate-300 font-normal mt-0.5">
            YoY Revenue Acceleration
          </p>
        </div>

        <div className="pt-1.5 border-t border-blue-900/30 text-[11px] text-slate-300 flex items-center justify-between">
          <span>เกณฑ์:</span>
          <span className="font-medium text-emerald-400">&gt; 30% ถือยาว</span>
        </div>
      </div>

      {/* Tile 2: EPS Beat Streak */}
      <div className="bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-3 shadow-lg flex flex-col justify-between backdrop-blur-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-medium tracking-wide uppercase flex items-center gap-1.5 text-slate-200">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            ชนะเป้า EPS
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Beat {streak}Q
          </span>
        </div>

        <div className="my-1.5">
          <div className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            {streak} ไตรมาส
          </div>
          {/* Dot Trail Visual */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {dots.map((isBeat, idx) => (
              <span
                key={idx}
                className={`w-2.5 h-2.5 rounded-full flex items-center justify-center ${
                  isBeat ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-slate-700'
                }`}
                title={`ไตรมาสที่ -${idx + 1}`}
              />
            ))}
            <span className="text-[11px] text-slate-400 font-normal ml-0.5">ล่าสุด</span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-blue-900/30 text-[11px] text-slate-300 flex items-center justify-between">
          <span>สถิติ:</span>
          <span className="font-medium text-emerald-300">ชนะเป้าต่อเนื่อง</span>
        </div>
      </div>

      {/* Tile 3: Gross Margin Moat */}
      <div className={`rounded-2xl p-3 shadow-lg flex flex-col justify-between backdrop-blur-md ${
        isMoatBreaker 
          ? 'bg-gradient-to-b from-[#1C0816] to-[#0A1022] border border-rose-500/60' 
          : 'bg-[#0A1022]/90 border border-blue-900/40'
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-medium tracking-wide uppercase flex items-center gap-1.5 text-slate-200">
            <Shield className={`w-3.5 h-3.5 ${isMoatBreaker ? 'text-rose-400' : 'text-cyan-400'}`} />
            คูเมือง (Margin)
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
            isMoatBreaker
              ? 'bg-rose-500/25 text-rose-200 border border-rose-500/50 animate-pulse'
              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
          }`}>
            {isMoatBreaker ? '🚨 Breached' : '🛡️ แข็งแกร่ง'}
          </span>
        </div>

        <div className="my-1.5">
          <div className="text-3xl font-bold font-mono text-white tracking-tight">
            {margin > 0 ? `${margin.toFixed(1)}%` : '-'}
          </div>
          <p className="text-[11px] text-slate-300 font-normal mt-0.5">
            Pricing Power Moat
          </p>
        </div>

        <div className="pt-1.5 border-t border-blue-900/30 text-[11px] text-slate-300 flex items-center justify-between">
          <span>ระวัง:</span>
          <span className="font-medium text-slate-200">ลด 3Q ติด = ลดเสี่ยง</span>
        </div>
      </div>

      {/* Tile 4: Forward P/E & PEG Ratio */}
      <div className="bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-3 shadow-lg flex flex-col justify-between backdrop-blur-md">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] font-medium tracking-wide uppercase flex items-center gap-1.5 text-slate-200">
            <Tag className="w-3.5 h-3.5 text-purple-400" />
            คุ้มค่า (PEG)
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
            isUndervalued
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : isStretched
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
          }`}>
            {isUndervalued ? '🟢 ถูกเทียบโต' : isStretched ? '⚠️ ตึงตัว' : '🟡 เหมาะสม'}
          </span>
        </div>

        <div className="my-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono text-white tracking-tight">
              {peg > 0 ? peg.toFixed(2) : '-'}
            </span>
            <span className="text-[12px] font-medium text-cyan-300 font-mono">
              PEG
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-mono mt-0.5">
            Forward P/E: <span className="text-white font-medium">{fwdPE > 0 ? `${fwdPE.toFixed(1)}x` : '-'}</span>
          </p>
        </div>

        <div className="pt-1.5 border-t border-blue-900/30 text-[11px] text-slate-300 flex items-center justify-between">
          <span>ทยอยเก็บ:</span>
          <span className="font-medium text-emerald-400">PEG &lt; 1.5</span>
        </div>
      </div>
    </div>
  );
};
