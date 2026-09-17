import React from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';
import { DOSSIER_STATIC_DATA } from '../../../data/project2xDossierData';

interface DossierMoatGuardProps {
  data: DossierPayload;
  className?: string;
}

export const DossierMoatGuard: React.FC<DossierMoatGuardProps> = ({ data, className = '' }) => {
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
    <div className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all ${
      isMoatBreaker 
        ? 'bg-gradient-to-b from-[#1F0816] to-[#0B1226] border-rose-500/80 shadow-[0_0_24px_rgba(244,63,94,0.25)]' 
        : 'bg-[#0B1226]/95 border-blue-900/50'
    } ${className || ''}`}>
      {/* Moat Thesis Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <h4 className="text-sm font-black text-white uppercase tracking-wider">
            Moat Thesis & Defense Guard
          </h4>
        </div>
        <span className="text-[13px] font-black text-cyan-200 bg-blue-600/20 px-2.5 py-0.5 rounded-lg border border-blue-500/40">
          {staticData.businessMoat}
        </span>
      </div>

      {/* 3 Watchlist Check Items */}
      <div className="space-y-1.5 mb-3 bg-[#060A16]/80 p-2.5 rounded-xl border border-blue-900/40">
        {staticData.moatChecklist.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-[13px] text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{item}</span>
          </div>
        ))}
      </div>

      {/* 5-Pillar Selling Protocols (Sleek Compact Rows) */}
      <div className="space-y-2">
        {/* Rule 1: Free-Ride */}
        <div className="p-2.5 bg-[#060A16]/90 rounded-xl border border-blue-900/40 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-black text-emerald-300">Free-Ride 50%:</span>
            <span className="text-slate-100 font-medium">{staticData.sellingProtocol.freeRideRule}</span>
          </div>
          <span className="text-emerald-400 font-mono font-bold shrink-0">+100% PnL</span>
        </div>

        {/* Rule 2: Moat Breaker */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[13px] ${
          isMoatBreaker ? 'bg-rose-500/20 border-rose-500 text-rose-200' : 'bg-[#060A16]/90 border-blue-900/40 text-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isMoatBreaker ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="font-black text-rose-300">Moat Breaker:</span>
            <span className="font-medium">{staticData.sellingProtocol.moatBreakerCondition}</span>
          </div>
          <span className={`font-mono font-black shrink-0 ${isMoatBreaker ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {isMoatBreaker ? 'BREACHED 🚨' : 'SAFE 🟢'}
          </span>
        </div>

        {/* Rule 3: Trailing Stop */}
        <div className="p-2.5 bg-[#060A16]/90 rounded-xl border border-blue-900/40 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-black text-amber-300">Trailing Stop:</span>
            <span className="text-slate-100 font-medium">{staticData.sellingProtocol.stopLossRule}</span>
          </div>
          <span className="text-amber-300 font-mono font-bold shrink-0">EMA 200</span>
        </div>
      </div>
    </div>
  );
};
