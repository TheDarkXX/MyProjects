import React from 'react';
import { ShieldCheck, AlertOctagon, TrendingUp, ShieldAlert, Award } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';
import { DOSSIER_STATIC_DATA } from '../../../data/project2xDossierData';
import { THESIS_MAP } from './tabs/DossierThesisTab';

interface DossierMoatGuardProps {
  data: DossierPayload;
  className?: string;
}

export const DossierMoatGuard: React.FC<DossierMoatGuardProps> = ({ data, className = '' }) => {
  const staticData = DOSSIER_STATIC_DATA[data.symbol] || {
    businessMoat: 'Market Leadership & High Switching Cost',
    sellingProtocol: {
      stopLossRule: 'EMA 200 Trailing Stop',
      freeRideRule: 'กำไรแตะ +100% ขาย 50% ดึงทุนคืน',
      moatBreakerCondition: 'Gross Margin ลดลง 3Q ติดต่อกัน'
    }
  };

  const thesisProfile = THESIS_MAP[data.symbol];
  const dynamicMoats = thesisProfile?.moats || [
    { title: 'Pricing Power', score: 9, maxScore: 10 },
    { title: 'Market Dominance', score: 9, maxScore: 10 },
    { title: 'Switching Cost', score: 8, maxScore: 10 }
  ];

  const isMoatBreaker = data.moatAutoFlags?.grossMarginDeclining3Q;
  const pnlPct = data.holding?.unrealizedPnlPct || 0;
  const isFreeRideReady = pnlPct >= 100.0;
  const stopLevel = data.radar?.ema200 || (data.holding?.avgCost ? data.holding.avgCost * 0.9 : 0);
  const stopCushionPct = data.currentPrice > 0 && stopLevel > 0 ? ((data.currentPrice - stopLevel) / data.currentPrice) * 100 : 0;

  return (
    <div
      className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all ${
        isMoatBreaker
          ? 'bg-[#1A0A10]/95 border-rose-600/70 shadow-[0_0_20px_rgba(239,68,68,0.25)]'
          : 'bg-[#0B1226]/95 border-blue-900/60'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-bold text-slate-100 tracking-wide uppercase">
            Moat Radar & Defense Protocols
          </h4>
        </div>
        <span className="text-xs font-semibold text-blue-200 bg-blue-600/20 px-2.5 py-1 rounded-lg border border-blue-500/30 truncate max-w-[220px]">
          {staticData.businessMoat}
        </span>
      </div>

      {/* Dynamic Visual Moat Meters */}
      <div className="grid grid-cols-3 gap-2.5 mb-3 bg-[#070D1F] p-3 rounded-xl border border-blue-900/40">
        {dynamicMoats.slice(0, 3).map((m, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium truncate">{m.title}</span>
              <span className="text-slate-200 font-mono font-bold">{m.score}/{m.maxScore}</span>
            </div>
            <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (m.score / m.maxScore) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 3 Tactical Protocol Status Strips */}
      <div className="space-y-1.5">
        {/* Protocol 1: Free-Ride 50% */}
        <div className="p-2.5 bg-[#070D1F] rounded-xl border border-blue-900/40 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isFreeRideReady ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-slate-200 font-medium">Free-Ride 50%:</span>
            <span className="text-slate-300 text-[13px] font-normal">เป้าหมายกำไรแตะ +100%</span>
          </div>
          <span
            className={`font-mono text-[12px] px-2.5 py-0.5 rounded border ${
              isFreeRideReady
                ? 'bg-blue-600/20 text-blue-200 border-blue-500/40 font-semibold'
                : 'bg-slate-800 text-slate-300 border-slate-700 font-medium'
            }`}
          >
            {isFreeRideReady ? '🚀 READY TO HARVEST' : `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(0)}% PnL`}
          </span>
        </div>

        {/* Protocol 2: Moat Breaker Alert */}
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-between text-[13px] ${
            isMoatBreaker ? 'bg-rose-950/40 border-rose-500/50 text-rose-200' : 'bg-[#070D1F] border-blue-900/40 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isMoatBreaker ? 'bg-rose-500 animate-pulse' : 'bg-blue-400'}`} />
            <span className="font-medium">Moat Breaker:</span>
            <span className="text-slate-300 text-[13px] font-normal">Gross Margin ลดลง 3Q ติด</span>
          </div>
          <span
            className={`font-mono text-[12px] px-2.5 py-0.5 rounded border ${
              isMoatBreaker
                ? 'bg-rose-500/30 text-rose-200 border-rose-500/60 font-semibold animate-pulse'
                : 'bg-blue-600/20 text-blue-300 border-blue-500/30 font-medium'
            }`}
          >
            {isMoatBreaker ? '🚨 BREACHED' : '🛡️ SAFE'}
          </span>
        </div>

        {/* Protocol 3: Trailing Stop Cushion */}
        <div className="p-2.5 bg-[#070D1F] rounded-xl border border-blue-900/40 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${stopCushionPct >= 0 ? 'bg-blue-400' : 'bg-rose-500'}`} />
            <span className="text-slate-200 font-medium">Trailing Stop:</span>
            <span className="text-slate-300 text-[13px] font-normal">EMA 200 (${stopLevel.toFixed(1)})</span>
          </div>
          <span
            className={`font-mono text-[12px] px-2.5 py-0.5 rounded border ${
              stopCushionPct >= 0
                ? 'bg-blue-600/15 text-blue-200 border-blue-500/30 font-medium'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
            }`}
          >
            {stopCushionPct >= 0 ? `+${stopCushionPct.toFixed(1)}% เหนือเส้น` : `หลุดเส้น ${stopCushionPct.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
