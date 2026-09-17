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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
      {/* Tile 1: Revenue Growth YoY */}
      <div className="bg-[#0B1226]/95 border border-blue-900/50 hover:border-cyan-500/60 rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between backdrop-blur-md">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-black tracking-wider uppercase flex items-center gap-1.5 text-white">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            รายได้โต YoY
          </span>
          <span className={`px-2.5 py-0.5 rounded-md text-[13px] font-black ${
            isHyperGrowth 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
              : isSteady 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' 
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {isHyperGrowth ? '🔥 Hyper Growth' : isSteady ? '⚡ Steady' : '⚠️ Slowing'}
          </span>
        </div>

        <div className="my-2">
          <div className="text-4xl font-black font-mono text-white tracking-tight drop-shadow-md">
            {revGrowth > 0 ? `+${revGrowth}%` : `${revGrowth}%`}
          </div>
          <p className="text-[13px] text-slate-200 font-semibold mt-0.5">
            YoY Revenue Acceleration
          </p>
        </div>

        <div className="pt-2 border-t border-blue-900/40 text-[13px] text-slate-200 flex items-center justify-between">
          <span className="text-slate-300">เกณฑ์ตัดสินใจ:</span>
          <span className="font-bold text-emerald-400">&gt; 30% ถือยาวสบายใจ</span>
        </div>
      </div>

      {/* Tile 2: EPS Beat Streak */}
      <div className="bg-[#0B1226]/95 border border-blue-900/50 hover:border-emerald-500/60 rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between backdrop-blur-md">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-black tracking-wider uppercase flex items-center gap-1.5 text-white">
            <Target className="w-4 h-4 text-emerald-400" />
            สถิติชนะเป้า EPS
          </span>
          <span className="px-2.5 py-0.5 rounded-md text-[13px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            🟢 Beat {streak}Q ซ้อน
          </span>
        </div>

        <div className="my-2">
          <div className="text-4xl font-black font-mono text-emerald-400 tracking-tight drop-shadow-md">
            {streak} ไตรมาส
          </div>
          {/* Dot Trail Visual */}
          <div className="flex items-center gap-1.5 mt-2">
            {dots.map((isBeat, idx) => (
              <span
                key={idx}
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                  isBeat ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-slate-700'
                }`}
                title={`ไตรมาสที่ -${idx + 1}`}
              />
            ))}
            <span className="text-[13px] text-slate-200 font-bold ml-1">ล่าสุด</span>
          </div>
        </div>

        <div className="pt-2 border-t border-blue-900/40 text-[13px] text-slate-200 flex items-center justify-between">
          <span className="text-slate-300">ความน่าเชื่อถือ:</span>
          <span className="font-bold text-emerald-300">ชนะคาดการณ์ต่อเนื่อง</span>
        </div>
      </div>

      {/* Tile 3: Gross Margin Moat */}
      <div className={`rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between backdrop-blur-md ${
        isMoatBreaker 
          ? 'bg-gradient-to-b from-[#1E0915] to-[#0B1226] border border-rose-500/80 shadow-[0_0_24px_rgba(244,63,94,0.25)]' 
          : 'bg-[#0B1226]/95 border border-blue-900/50 hover:border-cyan-500/60'
      }`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-black tracking-wider uppercase flex items-center gap-1.5 text-white">
            <Shield className={`w-4 h-4 ${isMoatBreaker ? 'text-rose-400' : 'text-cyan-400'}`} />
            คูเมือง (Margin)
          </span>
          <span className={`px-2.5 py-0.5 rounded-md text-[13px] font-black ${
            isMoatBreaker
              ? 'bg-rose-500/30 text-rose-200 border border-rose-500/60 animate-pulse'
              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
          }`}>
            {isMoatBreaker ? '🚨 Moat Breaker' : '🛡️ แข็งแกร่ง'}
          </span>
        </div>

        <div className="my-2">
          <div className="text-4xl font-black font-mono text-white tracking-tight drop-shadow-md">
            {margin > 0 ? `${margin.toFixed(1)}%` : '-'}
          </div>
          <p className="text-[13px] text-slate-200 font-semibold mt-0.5">
            Pricing Power Moat
          </p>
        </div>

        <div className="pt-2 border-t border-blue-900/40 text-[13px] text-slate-200 flex items-center justify-between">
          <span className="text-slate-300">จุดระวัง:</span>
          <span className="font-bold text-slate-100">ลดลง 3Q ติด = ขายลดเสี่ยง</span>
        </div>
      </div>

      {/* Tile 4: Forward P/E & PEG Ratio */}
      <div className="bg-[#0B1226]/95 border border-blue-900/50 hover:border-purple-500/60 rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between backdrop-blur-md">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-black tracking-wider uppercase flex items-center gap-1.5 text-white">
            <Tag className="w-4 h-4 text-purple-400" />
            ความคุ้มค่า (PEG)
          </span>
          <span className={`px-2.5 py-0.5 rounded-md text-[13px] font-black ${
            isUndervalued
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : isStretched
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
          }`}>
            {isUndervalued ? '🟢 ราคาถูกเทียบโต' : isStretched ? '⚠️ ตึงตัว ห้ามไล่' : '🟡 สมเหตุสมผล'}
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white tracking-tight drop-shadow-md">
              {peg > 0 ? peg.toFixed(2) : '-'}
            </span>
            <span className="text-sm font-black text-cyan-300 font-mono">
              PEG
            </span>
          </div>
          <p className="text-[13px] text-slate-200 font-bold mt-0.5 font-mono">
            Forward P/E: <span className="text-white">{fwdPE > 0 ? `${fwdPE.toFixed(1)}x` : '-'}</span>
          </p>
        </div>

        <div className="pt-2 border-t border-blue-900/40 text-[13px] text-slate-200 flex items-center justify-between">
          <span className="text-slate-300">จุดสะสม:</span>
          <span className="font-bold text-emerald-400">PEG &lt; 1.5 น่าทยอยเก็บ</span>
        </div>
      </div>
    </div>
  );
};
