import React from 'react';
import { ShieldCheck, Shield } from 'lucide-react';
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

  // Calculate Average Moat Index (out of 10)
  const avgMoatScore = dynamicMoats.length > 0
    ? dynamicMoats.reduce((sum, m) => sum + (m.score / m.maxScore) * 10, 0) / dynamicMoats.length
    : 9.0;

  // Colors & Configuration for 3 Distinct Gauges
  const gaugeConfigs = [
    { color: '#823AFD', glow: 'rgba(130,58,253,0.7)', labelColor: 'text-violet-300' },
    { color: '#FD5514', glow: 'rgba(253,85,20,0.7)', labelColor: 'text-orange-300' },
    { color: '#FC2D79', glow: 'rgba(252,45,121,0.7)', labelColor: 'text-pink-300' },
  ];

  return (
    <div
      className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all ${
        isMoatBreaker
          ? 'bg-[#1A0A14]/95 border-[#FC2D79]/70 shadow-[0_0_20px_rgba(252,45,121,0.25)]'
          : 'bg-[#0E1326]/95 border-white/10'
      } ${className}`}
    >
      {/* Header with Total Moat Index Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" />
          <h4 className="text-[15px] font-bold text-slate-100 tracking-wide uppercase">
            Moat Radar & Defense Protocols
          </h4>
          <span className="flex items-center gap-1 font-mono text-[12px] font-bold px-2 py-0.5 rounded-md bg-violet-600/20 text-violet-200 border border-violet-500/40">
            <Shield className="w-3 h-3 text-violet-400" />
            Index: {avgMoatScore.toFixed(1)}/10
          </span>
        </div>
        <span className="text-[12px] font-semibold text-violet-200 bg-violet-600/20 px-2.5 py-1 rounded-lg border border-violet-500/30 truncate max-w-[240px]">
          {staticData.businessMoat}
        </span>
      </div>

      {/* 3 Separate Individual Moat Gauges (Side-by-Side) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {dynamicMoats.slice(0, 3).map((m, idx) => {
          const cfg = gaugeConfigs[idx] || gaugeConfigs[0];
          const pct = Math.min(100, Math.max(0, (m.score / m.maxScore) * 100));
          const arcLen = Math.PI * 46; // ~144.5
          const dashOffset = arcLen * (1 - pct / 100);

          return (
            <div
              key={idx}
              className="bg-[#0A0E1A] p-3 rounded-xl border border-white/5 hover:border-white/15 transition-all flex flex-col items-center justify-between text-center shadow-inner"
            >
              {/* Individual SVG Semi-Circular Gauge */}
              <div className="relative w-32 h-18 flex items-end justify-center">
                <svg className="w-32 h-18 overflow-visible" viewBox="0 0 120 68">
                  <defs>
                    <filter id={`moatGlow-${idx}`} x="-25%" y="-25%" width="150%" height="150%">
                      <feGaussianBlur stdDeviation="2.5" result="glow" />
                      <feMerge>
                        <feMergeNode in="glow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Track Arc */}
                  <path
                    d="M 14 62 A 46 46 0 0 1 106 62"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Active Neon Progress Arc */}
                  <path
                    d="M 14 62 A 46 46 0 0 1 106 62"
                    fill="none"
                    stroke={cfg.color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={arcLen}
                    strokeDashoffset={dashOffset}
                    filter={`url(#moatGlow-${idx})`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Value Inside Arc Center */}
                <div className="absolute bottom-0 text-center flex flex-col items-center">
                  <div className="text-lg font-black font-mono text-white leading-tight">
                    {m.score}<span className="text-[12px] text-slate-400 font-normal">/{m.maxScore}</span>
                  </div>
                </div>
              </div>

              {/* Title & Percentage Badge */}
              <div className="mt-2 w-full">
                <div className="text-[13px] font-bold text-slate-100 truncate px-1" title={m.title}>
                  {m.title}
                </div>
                <div className="mt-0.5">
                  <span className={`text-[12px] font-mono font-bold ${cfg.labelColor}`}>
                    {pct.toFixed(0)}% Power
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3 Tactical Defense Protocol Strips */}
      <div className="space-y-2">
        {/* Protocol 1: Free-Ride 50% */}
        <div className="p-2.5 bg-[#0A0E1A] rounded-xl border border-white/5 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isFreeRideReady ? 'bg-orange-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-slate-200 font-semibold">Free-Ride 50%:</span>
            <span className="text-slate-300 font-normal">เป้ากำไรแตะ +100% ขาย 50% ดึงทุนคืน</span>
          </div>
          <span
            className={`font-mono text-[12px] px-2.5 py-0.5 rounded border ${
              isFreeRideReady
                ? 'bg-orange-500/20 text-orange-200 border-orange-500/40 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 font-medium'
            }`}
          >
            {isFreeRideReady ? '🚀 READY TO HARVEST' : `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(0)}% PnL`}
          </span>
        </div>

        {/* Protocol 2: Moat Breaker Alert */}
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-between text-[13px] ${
            isMoatBreaker ? 'bg-[#FC2D79]/20 border-[#FC2D79]/60 text-rose-200' : 'bg-[#0A0E1A] border-white/5 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isMoatBreaker ? 'bg-[#FC2D79] animate-pulse' : 'bg-violet-400'}`} />
            <span className="font-semibold">Moat Breaker:</span>
            <span className="text-slate-300 font-normal">Gross Margin ลดลง 3Q ติด = ลดเสี่ยง</span>
          </div>
          <span
            className={`font-mono text-[12px] px-2.5 py-0.5 rounded border ${
              isMoatBreaker
                ? 'bg-[#FC2D79]/30 text-rose-200 border-[#FC2D79]/60 font-bold animate-pulse'
                : 'bg-violet-600/20 text-violet-300 border-violet-500/30 font-medium'
            }`}
          >
            {isMoatBreaker ? '🚨 BREACHED' : '🛡️ SAFE'}
          </span>
        </div>

        {/* Protocol 3: Trailing Stop Cushion */}
        <div className="p-2.5 bg-[#0A0E1A] rounded-xl border border-white/5 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${stopCushionPct >= 0 ? 'bg-violet-400' : 'bg-[#FC2D79]'}`} />
            <span className="text-slate-200 font-semibold">Trailing Stop:</span>
            <span className="text-slate-300 font-normal">EMA 200 (${stopLevel.toFixed(1)})</span>
          </div>
          <span
            className={`font-mono text-[12px] px-2.5 py-0.5 rounded border ${
              stopCushionPct >= 0
                ? 'bg-violet-600/15 text-violet-200 border-violet-500/30 font-medium'
                : 'bg-[#FC2D79]/20 text-[#FC2D79] border-[#FC2D79]/40 font-bold'
            }`}
          >
            {stopCushionPct >= 0 ? `+${stopCushionPct.toFixed(1)}% เหนือเส้น` : `หลุดเส้น ${stopCushionPct.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
