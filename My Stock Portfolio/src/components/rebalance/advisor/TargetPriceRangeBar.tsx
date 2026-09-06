import React from 'react';

interface TargetPriceRangeBarProps {
  currentPrice: number;
  targetLow?: number;
  targetMean?: number;
  targetHigh?: number;
  aiTargetPrice?: number | string;
  aiTimeframe?: string;
  currency?: string;
}

export const TargetPriceRangeBar: React.FC<TargetPriceRangeBarProps> = ({
  currentPrice,
  targetLow = 0,
  targetMean = 0,
  targetHigh = 0,
  aiTargetPrice,
  aiTimeframe,
  currency = '$'
}) => {
  // If we don't have enough target data, do not render
  if (!targetLow || !targetHigh || targetHigh <= targetLow) {
    return null;
  }

  // Parse numeric AI Target if present
  let numAiTarget: number | null = null;
  if (typeof aiTargetPrice === 'number' && aiTargetPrice > 0) {
    numAiTarget = aiTargetPrice;
  } else if (typeof aiTargetPrice === 'string') {
    const cleaned = aiTargetPrice.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      numAiTarget = parsed;
    }
  }

  // Determine domain bounds with 4% buffer so markers don't clip at edges
  const allPoints = [targetLow, targetHigh];
  if (targetMean > 0) allPoints.push(targetMean);
  if (currentPrice > 0) allPoints.push(currentPrice);
  if (numAiTarget && numAiTarget > 0) allPoints.push(numAiTarget);

  const minDomain = Math.min(...allPoints) * 0.96;
  const maxDomain = Math.max(...allPoints) * 1.04;
  const range = maxDomain - minDomain;

  const toPct = (val: number) => {
    if (range <= 0) return 50;
    return Math.max(3, Math.min(97, ((val - minDomain) / range) * 100));
  };

  const lowPct = toPct(targetLow);
  const highPct = toPct(targetHigh);
  const meanPct = targetMean > 0 ? toPct(targetMean) : null;
  const currPct = currentPrice > 0 ? toPct(currentPrice) : null;
  const aiPct = numAiTarget ? toPct(numAiTarget) : null;

  return (
    <div className="py-2.5 px-3 bg-[#151828] border border-[#2A2E45] rounded-lg mt-2 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-2">
        <span className="flex items-center gap-1.5 text-slate-200">
          <span>🎯</span> Wall St Target Range
        </span>
        {numAiTarget && (
          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
            <span>🤖</span> AI Target: {currency}{numAiTarget.toFixed(2)} {aiTimeframe ? `(${aiTimeframe})` : ''}
          </span>
        )}
      </div>

      {/* Target Price Track */}
      <div className="relative pt-4 pb-5">
        {/* Background track */}
        <div className="h-2 bg-slate-800 rounded-full relative overflow-hidden">
          {/* Target range highlight span */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-sky-500/40 via-emerald-500/50 to-purple-500/50 rounded-full"
            style={{
              left: `${lowPct}%`,
              width: `${Math.max(4, highPct - lowPct)}%`
            }}
          />
        </div>

        {/* Low Marker */}
        <div
          className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${lowPct}%` }}
        >
          <span className="text-[11px] font-bold text-slate-400">Low</span>
          <div className="w-1.5 h-3 bg-slate-500 rounded-full mt-0.5" />
          <span className="text-[11px] font-semibold text-slate-300 mt-1 whitespace-nowrap">
            {currency}{targetLow.toFixed(0)}
          </span>
        </div>

        {/* Mean Marker */}
        {meanPct !== null && (
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-10"
            style={{ left: `${meanPct}%` }}
          >
            <span className="text-[11px] font-bold text-sky-300">Mean</span>
            <div className="w-2 h-3.5 bg-sky-400 rounded-full mt-0.5 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
            <span className="text-[12px] font-black text-white mt-1 whitespace-nowrap bg-slate-900/90 px-1 rounded border border-sky-500/30">
              {currency}{targetMean.toFixed(0)}
            </span>
          </div>
        )}

        {/* High Marker */}
        <div
          className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${highPct}%` }}
        >
          <span className="text-[11px] font-bold text-emerald-400">High</span>
          <div className="w-1.5 h-3 bg-emerald-500 rounded-full mt-0.5" />
          <span className="text-[11px] font-semibold text-emerald-300 mt-1 whitespace-nowrap">
            {currency}{targetHigh.toFixed(0)}
          </span>
        </div>

        {/* Current Price Pin */}
        {currPct !== null && (
          <div
            className="absolute top-1.5 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${currPct}%` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#151828] shadow-[0_0_10px_rgba(251,191,36,0.9)] animate-pulse" />
            <div className="bg-amber-500/25 border border-amber-400/60 text-amber-200 text-[11px] font-black px-1.5 py-0.2 rounded mt-2.5 whitespace-nowrap shadow-md">
              Current: {currency}{currentPrice.toFixed(2)}
            </div>
          </div>
        )}

        {/* AI Target Pin if exists */}
        {aiPct !== null && numAiTarget && Math.abs(aiPct - (meanPct || 0)) > 6 && (
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-15"
            style={{ left: `${aiPct}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-purple-400 border border-white shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
          </div>
        )}
      </div>
    </div>
  );
};
