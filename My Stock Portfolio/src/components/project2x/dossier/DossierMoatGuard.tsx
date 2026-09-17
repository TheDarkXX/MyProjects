import React from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';
import { DOSSIER_STATIC_DATA } from '../../../data/project2xDossierData';

interface DossierMoatGuardProps {
  data: DossierPayload;
}

export const DossierMoatGuard: React.FC<DossierMoatGuardProps> = ({ data }) => {
  const staticData = DOSSIER_STATIC_DATA[data.symbol] || {
    shortStory: 'หนึ่งในสุดยอดหุ้นแกนนำของ Project 2X ที่คัดสรรด้วยเกณฑ์ Hyper-Growth',
    businessMoat: 'Leading Market Position & Scale Advantage',
    moatChecklist: [
      'Gross Margin ยังคงรักษาระดับสูง ไม่โดนสงครามราคาเล่นงาน',
      'รายได้และกำไรยังเติบโตสอดคล้องกับแนวโน้มอุตสาหกรรม',
      'ส่วนแบ่งการตลาดยังเป็นผู้นำอันดับ 1 หรือ 2 ในกลุ่ม'
    ],
    sellingProtocol: {
      stopLossRule: 'หลุดเส้นแนวรับ EMA 200 หรือพื้นฐานเปลี่ยนทิศทาง',
      freeRideRule: 'กำไรถึง +100% ให้ขาย 50% ดึงเงินต้นออก ถือฟรีตลอดกาล',
      moatBreakerCondition: 'Gross Margin ลดลง 3 ไตรมาสติดต่อกัน'
    }
  };

  const isMoatBreaker = data.moatAutoFlags?.grossMarginDeclining3Q;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
      {/* Left: Short Story & Moat Thesis */}
      <div className="lg:col-span-7 bg-[#0B0F1A] border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Moat Thesis & Short Story (เหตุผลที่ถือยาว)
            </h4>
          </div>

          {/* 3-line Short Story */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 mb-3">
            <p className="text-[13px] text-slate-200 leading-relaxed font-normal">
              "{staticData.shortStory}"
            </p>
          </div>

          {/* Moat Type Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] text-slate-400 font-semibold">ประเภทคูเมือง:</span>
            <span className="text-[13px] font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
              {staticData.businessMoat}
            </span>
          </div>

          {/* Checklist */}
          <div>
            <h5 className="text-[13px] font-bold text-slate-300 mb-1.5 uppercase tracking-wide">
              3 สิ่งที่ต้องเฝ้าระวัง (Watchlist Checklist)
            </h5>
            <ul className="space-y-1.5">
              {staticData.moatChecklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[13px] text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Right: 5-Pillar Selling Protocol Guard */}
      <div className={`lg:col-span-5 rounded-2xl p-4 shadow-xl border flex flex-col justify-between ${
        isMoatBreaker 
          ? 'bg-rose-950/20 border-rose-500/60' 
          : 'bg-[#0B0F1A] border-slate-800/80'
      }`}>
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className={`w-5 h-5 ${isMoatBreaker ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
              <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                5-Pillar Selling Protocol
              </h4>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[13px] font-bold ${
              isMoatBreaker 
                ? 'bg-rose-500 text-white animate-pulse' 
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            }`}>
              {isMoatBreaker ? '🚨 Moat Breaker!' : '🟢 คูเมืองสมบูรณ์'}
            </span>
          </div>

          {/* The 3 Core Rules */}
          <div className="space-y-2.5">
            {/* Rule 1: Free-Ride 50% */}
            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <div className="text-[13px] font-bold text-emerald-400 flex items-center justify-between">
                <span>เสาที่ 1: กฎ Free-Ride เมื่อกำไร 100%</span>
                <span className="text-slate-400 text-[13px]">กันขายหมู</span>
              </div>
              <p className="text-[13px] text-slate-300 mt-1 leading-snug">
                {staticData.sellingProtocol.freeRideRule}
              </p>
            </div>

            {/* Rule 2: Moat Breaker */}
            <div className={`p-2.5 rounded-xl border ${
              isMoatBreaker 
                ? 'bg-rose-500/20 border-rose-500/50' 
                : 'bg-slate-900/60 border-slate-800/80'
            }`}>
              <div className="text-[13px] font-bold text-rose-400 flex items-center justify-between">
                <span>เสาที่ 4: Moat Breaker (คูเมืองพัง)</span>
                <span className="text-[13px] font-mono font-bold">
                  {isMoatBreaker ? 'TRIGGERED 🚨' : 'SAFE 🟢'}
                </span>
              </div>
              <p className="text-[13px] text-slate-300 mt-1 leading-snug">
                {staticData.sellingProtocol.moatBreakerCondition}
              </p>
            </div>

            {/* Rule 3: Stoploss Rule */}
            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <div className="text-[13px] font-bold text-amber-400 flex items-center justify-between">
                <span>เสาที่ 3: เส้นตาย Trailing Stop</span>
                <span className="text-slate-400 text-[13px]">หลุด EMA200</span>
              </div>
              <p className="text-[13px] text-slate-300 mt-1 leading-snug">
                {staticData.sellingProtocol.stopLossRule}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
