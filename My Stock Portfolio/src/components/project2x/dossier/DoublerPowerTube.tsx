import React from 'react';
import { Zap, Flame, Trophy } from 'lucide-react';

interface DoublerPowerTubeProps {
  currentPrice: number;
  avgCost: number;
  targetPrice3Y: number;
  marketCap?: number;
  doublerProgressPct: number;
  unrealizedPnlPct?: number;
}

function formatMarketCap(cap?: number): string {
  if (!cap || cap <= 0) return '-';
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(1)}M`;
  return `$${cap.toLocaleString()}`;
}

export const DoublerPowerTube: React.FC<DoublerPowerTubeProps> = ({
  currentPrice,
  avgCost,
  targetPrice3Y,
  marketCap,
  doublerProgressPct,
  unrealizedPnlPct = 0
}) => {
  // Safe calculations
  const effectiveCost = avgCost > 0 ? avgCost : currentPrice;
  const pnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : unrealizedPnlPct;
  const isProfit = pnlPct >= 0;

  // Normalized position on tube: 0% = Cost, 100% = Target
  let tubeFillPct = 0;
  if (targetPrice3Y > effectiveCost) {
    const rawRatio = (currentPrice - effectiveCost) / (targetPrice3Y - effectiveCost);
    tubeFillPct = Math.min(100, Math.max(0, rawRatio * 100));
  } else {
    tubeFillPct = Math.min(100, Math.max(0, doublerProgressPct));
  }

  return (
    <div className="flex-1 w-full bg-[#0B1226]/95 p-3 rounded-2xl border border-blue-900/60 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
      {/* Top Indicators Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-950/70 border border-blue-700/50 text-slate-100 text-[14px] font-semibold">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>2X Power Tube</span>
          </div>
          {marketCap && marketCap > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#070D1F] border border-blue-900/50 text-slate-300 text-[14px]">
              <span className="text-slate-400 font-normal">Mkt Cap:</span>
              <span className="text-slate-100 font-semibold font-mono">{formatMarketCap(marketCap)}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[12px] font-medium">
            <span>CAGR 26% / 3Y</span>
          </div>
        </div>

        {/* Right Metric Pill */}
        <div className="flex items-center gap-3 text-[14px]">
          {avgCost > 0 && (
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400 font-normal">จากทุน:</span>
              <span className={`font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfit ? '+' : ''}{pnlPct.toFixed(1)}%
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-700/40 text-cyan-300 text-[14px] font-semibold font-mono">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>{doublerProgressPct.toFixed(0)}% สู่เป้าหมาย</span>
          </div>
        </div>
      </div>

      {/* The Neon Glass Power Tube */}
      <div className="relative w-full h-8 bg-[#040815] rounded-xl p-1 border border-blue-900/80 shadow-inner flex items-center overflow-hidden">
        {/* Glow backdrop behind bar */}
        <div
          className={`absolute left-0 top-0 bottom-0 blur-md transition-all duration-1000 ${
            isProfit
              ? 'bg-gradient-to-r from-blue-600/30 via-cyan-500/35 to-emerald-500/45'
              : 'bg-gradient-to-r from-rose-700/30 via-rose-600/30 to-amber-500/30'
          }`}
          style={{ width: `${Math.max(5, tubeFillPct)}%` }}
        />

        {/* The active liquid fill */}
        <div
          className={`relative h-full rounded-lg shadow-[0_0_16px_rgba(56,189,248,0.5)] transition-all duration-1000 flex items-center justify-end px-2.5 ${
            isProfit
              ? 'bg-gradient-to-r from-blue-700 via-cyan-400 to-emerald-400'
              : 'bg-gradient-to-r from-rose-700 via-rose-500 to-amber-400'
          }`}
          style={{ width: `${Math.max(4, tubeFillPct)}%` }}
        >
          {tubeFillPct > 15 && (
            <span className="text-slate-950 font-black text-xs font-mono tracking-tight whitespace-nowrap drop-shadow">
              ${currentPrice.toFixed(1)}
            </span>
          )}
        </div>

        {/* Milestone Pin: Cost (Yellow Gold) */}
        {avgCost > 0 && (
          <div className="absolute left-2.5 flex items-center gap-1 z-10 pointer-events-none">
            <span className="text-amber-300 text-xs font-mono font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              ทุน ${avgCost.toFixed(1)}
            </span>
          </div>
        )}

        {/* Milestone Pin: 2X Goal (Light Green / Emerald) */}
        <div className="absolute right-2.5 flex items-center gap-1 z-10 pointer-events-none">
          <Trophy className="w-4 h-4 text-amber-300 drop-shadow" />
          <span className="text-emerald-300 text-sm font-bold font-mono drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            เป้า 2X: ${targetPrice3Y.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Tube Step Sub-Labels */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-200 mt-2 px-1 font-mono">
        <span className="font-semibold text-amber-300">
          {avgCost > 0 ? `ทุนเฉลี่ย: $${avgCost.toFixed(2)}` : `Base: $${effectiveCost.toFixed(2)}`}
        </span>
        <span className="text-cyan-300 font-bold">ราคาปัจจุบัน: ${currentPrice.toFixed(2)}</span>
        <span className="text-emerald-400 font-bold">เป้าหมาย 1 เด้ง: ${targetPrice3Y.toFixed(2)}</span>
      </div>
    </div>
  );
};
