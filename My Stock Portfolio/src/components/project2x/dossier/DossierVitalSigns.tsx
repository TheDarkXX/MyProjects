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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {/* Tile 1: Revenue Growth YoY */}
      <div className="bg-[#0B0F1A] border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[13px] font-bold tracking-wider uppercase flex items-center gap-1.5 text-slate-300">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            รายได้เติบโต YoY
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[13px] font-bold ${
            isHyperGrowth 
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
              : isSteady 
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' 
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
          }`}>
            {isHyperGrowth ? '🔥 Hyper Growth' : isSteady ? '⚡ Steady' : '⚠️ ชะลอตัว'}
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl font-black font-mono text-slate-100">
            {revGrowth > 0 ? `+${revGrowth}%` : `${revGrowth}%`}
          </div>
          <p className="text-[13px] text-slate-400 mt-0.5">
            อัตราเร่งเทียบไตรมาสเดียวกันของปีก่อน
          </p>
        </div>

        <div className="pt-2 border-t border-slate-800/60 text-[13px] text-slate-300 flex items-center justify-between">
          <span>เกณฑ์ตัดสินใจ:</span>
          <span className="font-semibold text-emerald-400">&gt; 30% ถือยาวสบายใจ</span>
        </div>
      </div>

      {/* Tile 2: EPS Beat Streak */}
      <div className="bg-[#0B0F1A] border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[13px] font-bold tracking-wider uppercase flex items-center gap-1.5 text-slate-300">
            <Target className="w-4 h-4 text-emerald-400" />
            สถิติชนะเป้ากำไร
          </span>
          <span className="px-2 py-0.5 rounded-full text-[13px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            🟢 Beat {streak}Q ซ้อน
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl font-black font-mono text-emerald-400">
            {streak} ไตรมาส
          </div>
          {/* Dot Trail Visual */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {dots.map((isBeat, idx) => (
              <span
                key={idx}
                className={`w-3 h-3 rounded-full flex items-center justify-center ${
                  isBeat ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-700'
                }`}
                title={`ไตรมาสที่ -${idx + 1}`}
              />
            ))}
            <span className="text-[13px] text-slate-400 ml-1">ย้อนหลัง</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/60 text-[13px] text-slate-300 flex items-center justify-between">
          <span>ความน่าเชื่อถือ:</span>
          <span className="font-semibold text-emerald-300">ผู้บริหารทำได้ตามเป้า</span>
        </div>
      </div>

      {/* Tile 3: Gross Margin Moat */}
      <div className={`bg-[#0B0F1A] border rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between ${
        isMoatBreaker ? 'border-rose-500/60 shadow-rose-950/30' : 'border-slate-800/80 hover:border-cyan-500/40'
      }`}>
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[13px] font-bold tracking-wider uppercase flex items-center gap-1.5 text-slate-300">
            <Shield className={`w-4 h-4 ${isMoatBreaker ? 'text-rose-400' : 'text-cyan-400'}`} />
            คูเมือง (Gross Margin)
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[13px] font-bold ${
            isMoatBreaker
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
              : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
          }`}>
            {isMoatBreaker ? '🚨 Moat Breaker' : '🛡️ แข็งแกร่ง'}
          </span>
        </div>

        <div className="my-2">
          <div className="text-3xl font-black font-mono text-slate-100">
            {margin > 0 ? `${margin.toFixed(1)}%` : '-'}
          </div>
          <p className="text-[13px] text-slate-400 mt-0.5">
            อำนาจการตั้งราคา (Pricing Power)
          </p>
        </div>

        <div className="pt-2 border-t border-slate-800/60 text-[13px] text-slate-300 flex items-center justify-between">
          <span>เงื่อนไขขาย:</span>
          <span className="font-semibold text-slate-300">ลดลง 3Q ติด = ขายลดเสี่ยง</span>
        </div>
      </div>

      {/* Tile 4: Forward P/E & PEG Ratio */}
      <div className="bg-[#0B0F1A] border border-slate-800/80 hover:border-purple-500/40 rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[13px] font-bold tracking-wider uppercase flex items-center gap-1.5 text-slate-300">
            <Tag className="w-4 h-4 text-purple-400" />
            ความคุ้มค่า (PEG / P/E)
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[13px] font-bold ${
            isUndervalued
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : isStretched
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
          }`}>
            {isUndervalued ? '🟢 ราคาถูกเทียบโต' : isStretched ? '⚠️ ตึงตัว ห้ามไล่' : '🟡 ราคาสมเหตุผล'}
          </span>
        </div>

        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-slate-100">
              {peg > 0 ? peg.toFixed(2) : '-'}
            </span>
            <span className="text-sm font-bold text-slate-400 font-mono">
              PEG
            </span>
          </div>
          <p className="text-[13px] text-slate-400 mt-0.5 font-mono">
            Forward P/E: <span className="text-slate-200 font-bold">{fwdPE > 0 ? `${fwdPE.toFixed(1)}x` : '-'}</span>
          </p>
        </div>

        <div className="pt-2 border-t border-slate-800/60 text-[13px] text-slate-300 flex items-center justify-between">
          <span>จุดซื้อเพิ่ม:</span>
          <span className="font-semibold text-emerald-400">PEG &lt; 1.5 น่าสะสม</span>
        </div>
      </div>
    </div>
  );
};
