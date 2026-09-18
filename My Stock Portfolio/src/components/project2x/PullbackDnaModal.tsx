import React, { useEffect, useState } from 'react';
import { X, Dna, ShieldCheck, Activity, ArrowDownRight, ArrowUpRight, Flame, Layers } from 'lucide-react';

interface PullbackEvent {
  peakDate: string;
  peakPrice: number;
  troughDate: string;
  troughPrice: number;
  drawdownPct: number;
  reboundGainPct: number;
  bounceCategory: string;
  distEma50: number;
  distEma150: number;
  distEma200: number;
}

interface PullbackDnaData {
  symbol: string;
  totalPullbacks: number;
  stats: {
    ema50: { count: number; percent: number };
    ema150: { count: number; percent: number };
    ema200: { count: number; percent: number };
    breakdown: { count: number; percent: number };
    avgDrawdownPct: number;
    avgReboundGainPct: number;
    safetyScore: number;
  };
  bedrockLine: string;
  summary_th: string;
  recentEvents: PullbackEvent[];
}

interface PullbackDnaModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
}

export const PullbackDnaModal: React.FC<PullbackDnaModalProps> = ({
  isOpen,
  onClose,
  symbol
}) => {
  const [data, setData] = useState<PullbackDnaData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !symbol) return;
    setLoading(true);
    setError(null);

    fetch(`/api/project-2x/pullback-dna/${symbol}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load Pullback DNA');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [isOpen, symbol]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#131722] border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-950/50 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1A1D2D]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <Dna className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white tracking-wide">{symbol}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
                  10-YEAR PULLBACK DNA
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                สถิติการย่อตัวแตะเส้น EMA 50 / 150 / 200 ย้อนหลัง 10 ปี
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Activity className="w-10 h-10 text-cyan-400 animate-spin" />
              <p className="text-sm font-semibold text-slate-300">
                กำลังสแกนประวัติการย่อตัว 2,500+ แท่งเทียนของ {symbol}...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Bedrock Primary Line Hero Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-[#1E2235] to-purple-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>Primary Bedrock Support (แนวรับหินผาแท้จริง):</span>
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {data.bedrockLine}
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed max-w-md">
                    {data.summary_th}
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-black/40 px-4 py-3 rounded-2xl border border-white/10">
                  <div className="text-center">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Safety Score</div>
                    <div className="text-xl font-black text-emerald-400">
                      {data.stats.safetyScore}<span className="text-xs text-slate-400">/10</span>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Pullback Swings</div>
                    <div className="text-xl font-black text-cyan-300">
                      {data.totalPullbacks} <span className="text-xs text-slate-400">Cycles</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Column Bounce Rate Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* EMA 50 */}
                <div className="p-3.5 rounded-2xl bg-[#1A1D2D] border border-emerald-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>⚡ EMA 50</span>
                      <span>{data.stats.ema50.percent}%</span>
                    </div>
                    <div className="text-xl font-black text-white mt-1">
                      {data.stats.ema50.count} <span className="text-xs text-slate-400 font-normal">ครั้ง</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${data.stats.ema50.percent}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">Super Bull Rebounds</span>
                </div>

                {/* EMA 150 */}
                <div className="p-3.5 rounded-2xl bg-[#1A1D2D] border border-cyan-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
                      <span>🛡️ EMA 150</span>
                      <span>{data.stats.ema150.percent}%</span>
                    </div>
                    <div className="text-xl font-black text-white mt-1">
                      {data.stats.ema150.count} <span className="text-xs text-slate-400 font-normal">ครั้ง</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${data.stats.ema150.percent}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">Primary Core Support</span>
                </div>

                {/* EMA 200 */}
                <div className="p-3.5 rounded-2xl bg-[#1A1D2D] border border-purple-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                      <span>🏰 EMA 200</span>
                      <span>{data.stats.ema200.percent}%</span>
                    </div>
                    <div className="text-xl font-black text-white mt-1">
                      {data.stats.ema200.count} <span className="text-xs text-slate-400 font-normal">ครั้ง</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-purple-400 h-full rounded-full" style={{ width: `${data.stats.ema200.percent}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">Bedrock Fortress</span>
                </div>

                {/* Breakdown */}
                <div className="p-3.5 rounded-2xl bg-[#1A1D2D] border border-rose-500/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-rose-400">
                      <span>⚠️ Breakdown</span>
                      <span>{data.stats.breakdown.percent}%</span>
                    </div>
                    <div className="text-xl font-black text-white mt-1">
                      {data.stats.breakdown.count} <span className="text-xs text-slate-400 font-normal">ครั้ง</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-rose-400 h-full rounded-full" style={{ width: `${data.stats.breakdown.percent}%` }} />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">Below EMA 200</span>
                </div>
              </div>

              {/* Averages Banner */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-slate-300">Avg Pullback Drawdown:</span>
                  </div>
                  <span className="text-sm font-black text-rose-400">{data.stats.avgDrawdownPct}%</span>
                </div>

                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-300">Avg Post-Dip Rebound:</span>
                  </div>
                  <span className="text-sm font-black text-emerald-400">+{data.stats.avgReboundGainPct}%</span>
                </div>
              </div>

              {/* Recent Pullbacks Log Table */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Timeline: ประวัติการย่อตัว 6 รอบล่าสุด</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#161926] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-black/30 text-slate-400 font-bold border-b border-white/10">
                        <th className="p-2.5">รอบย่อตัว (Peak → Trough)</th>
                        <th className="p-2.5 text-center">เส้นที่เด้ง</th>
                        <th className="p-2.5 text-right">ความลึก (Drawdown)</th>
                        <th className="p-2.5 text-right">กำไรเด้งสวน (Rebound)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.recentEvents.map((evt, idx) => {
                        const is50 = evt.bounceCategory === 'EMA50';
                        const is150 = evt.bounceCategory === 'EMA150';
                        const is200 = evt.bounceCategory === 'EMA200';
                        const isBreak = evt.bounceCategory === 'BREAKDOWN';

                        return (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-2.5">
                              <div className="font-bold text-white">
                                {evt.troughDate}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                ${evt.peakPrice} → ${evt.troughPrice}
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                                is50
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : is150
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : is200
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                  : isBreak
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-slate-700 text-slate-300'
                              }`}>
                                {evt.bounceCategory}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-rose-400">
                              {evt.drawdownPct}%
                            </td>
                            <td className="p-2.5 text-right font-black text-emerald-400">
                              +{evt.reboundGainPct}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Project 2X Quantitative Algorithm</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
