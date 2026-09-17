import React from 'react';
import { ShieldCheck, AlertOctagon, TrendingUp, ShieldAlert, Award } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';
import { DOSSIER_STATIC_DATA } from '../../../data/project2xDossierData';

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

  const isMoatBreaker = data.moatAutoFlags?.grossMarginDeclining3Q;
  const pnlPct = data.holding?.unrealizedPnlPct || 0;
  const isFreeRideReady = pnlPct >= 100.0;
  const stopLevel = data.radar?.ema200 || (data.holding?.avgCost ? data.holding.avgCost * 0.9 : 0);
  const stopCushionPct = data.currentPrice > 0 && stopLevel > 0 ? ((data.currentPrice - stopLevel) / data.currentPrice) * 100 : 0;

  return (
    <div className={`rounded-2xl p-3.5 shadow-lg border backdrop-blur-md transition-all ${
      isMoatBreaker
        ? 'bg-gradient-to-b from-[#1C0816] to-[#0A1022] border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
        : 'bg-[#0A1022]/90 border-blue-900/40'
    } ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <h4 className="text-[13px] font-medium text-slate-200 tracking-wide uppercase">
            Moat Radar & Defense Protocols
          </h4>
        </div>
        <span className="text-[11px] font-medium text-cyan-200 bg-blue-600/15 px-2 py-0.5 rounded border border-blue-500/30 truncate max-w-[200px]">
          {staticData.businessMoat}
        </span>
      </div>

      {/* 3 Visual Moat Meters (Clean Segmented Bars) */}
      <div className="grid grid-cols-3 gap-2 mb-3 bg-[#060A16]/70 p-2.5 rounded-xl border border-blue-900/30">
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-300">Pricing Power</span>
            <span className="text-emerald-400 font-mono font-medium">9/10</span>
          </div>
          <div className="flex gap-1">
            <div className="h-1.5 flex-1 rounded-sm bg-emerald-400" />
            <div className="h-1.5 flex-1 rounded-sm bg-emerald-400" />
            <div className="h-1.5 flex-1 rounded-sm bg-emerald-400/50" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-300">Market Dominance</span>
            <span className="text-cyan-400 font-mono font-medium">10/10</span>
          </div>
          <div className="flex gap-1">
            <div className="h-1.5 flex-1 rounded-sm bg-cyan-400" />
            <div className="h-1.5 flex-1 rounded-sm bg-cyan-400" />
            <div className="h-1.5 flex-1 rounded-sm bg-cyan-400" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-300">Switching Cost</span>
            <span className="text-indigo-300 font-mono font-medium">8/10</span>
          </div>
          <div className="flex gap-1">
            <div className="h-1.5 flex-1 rounded-sm bg-indigo-400" />
            <div className="h-1.5 flex-1 rounded-sm bg-indigo-400" />
            <div className="h-1.5 flex-1 rounded-sm bg-slate-700" />
          </div>
        </div>
      </div>

      {/* 3 Tactical Protocol Status Strips (Visual Instruments) */}
      <div className="space-y-1.5">
        {/* Protocol 1: Free-Ride 50% */}
        <div className="p-2 bg-[#060A16]/80 rounded-xl border border-blue-900/30 flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isFreeRideReady ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-slate-200 font-medium">Free-Ride 50%:</span>
            <span className="text-slate-300 text-[11px] font-normal">เป้าหมายกำไรแตะ +100%</span>
          </div>
          <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
            isFreeRideReady
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
              : 'bg-slate-800 text-slate-300 border-slate-700 font-medium'
          }`}>
            {isFreeRideReady ? '🚀 READY TO HARVEST' : `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(0)}% PnL`}
          </span>
        </div>

        {/* Protocol 2: Moat Breaker Alert */}
        <div className={`p-2 rounded-xl border flex items-center justify-between text-[12px] ${
          isMoatBreaker ? 'bg-rose-500/15 border-rose-500/40 text-rose-200' : 'bg-[#060A16]/80 border-blue-900/30 text-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isMoatBreaker ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="font-medium">Moat Breaker:</span>
            <span className="text-slate-300 text-[11px] font-normal">Gross Margin ลดลง 3Q ติด</span>
          </div>
          <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
            isMoatBreaker
              ? 'bg-rose-500/30 text-rose-200 border-rose-500/60 font-bold animate-pulse'
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25 font-medium'
          }`}>
            {isMoatBreaker ? '🚨 BREACHED' : '🛡️ SAFE'}
          </span>
        </div>

        {/* Protocol 3: Trailing Stop Cushion */}
        <div className="p-2 bg-[#060A16]/80 rounded-xl border border-blue-900/30 flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${stopCushionPct >= 0 ? 'bg-cyan-400' : 'bg-rose-500'}`} />
            <span className="text-slate-200 font-medium">Trailing Stop:</span>
            <span className="text-slate-300 text-[11px] font-normal">EMA 200 (${stopLevel.toFixed(1)})</span>
          </div>
          <span className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
            stopCushionPct >= 0
              ? 'bg-cyan-500/10 text-cyan-200 border-cyan-500/25 font-medium'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
          }`}>
            {stopCushionPct >= 0 ? `+${stopCushionPct.toFixed(1)}% เหนือเส้น` : `หลุดเส้น ${stopCushionPct.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
