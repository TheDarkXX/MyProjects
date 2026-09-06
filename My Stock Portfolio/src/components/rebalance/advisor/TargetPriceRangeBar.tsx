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

  // Determine domain bounds with 5% buffer so markers don't clip at edges
  const allPoints = [targetLow, targetHigh].filter(p => p > 0);
  if (targetMean > 0) allPoints.push(targetMean);
  if (currentPrice > 0) allPoints.push(currentPrice);
  if (numAiTarget && numAiTarget > 0) allPoints.push(numAiTarget);

  const minDomain = Math.min(...allPoints) * 0.95;
  const maxDomain = Math.max(...allPoints) * 1.05;
  const range = maxDomain - minDomain;

  const toPct = (val: number) => {
    if (range <= 0) return 50;
    return Math.max(4, Math.min(96, ((val - minDomain) / range) * 100));
  };

  const lowPct = toPct(targetLow);
  const highPct = toPct(targetHigh);
  const meanPct = targetMean > 0 ? toPct(targetMean) : null;
  const currPct = currentPrice > 0 ? toPct(currentPrice) : null;
  const aiPct = numAiTarget ? toPct(numAiTarget) : null;

  return (
    <div className="py-3 px-3.5 bg-[#151828] border border-[#2A2E45] rounded-xl mt-2 mb-3.5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between text-xs text-slate-300 font-semibold mb-3">
        <span className="flex items-center gap-1.5 text-slate-200 font-bold">
          <span>🎯</span> Wall St Target Range
        </span>
        {numAiTarget && (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/40 font-bold flex items-center gap-1">
            <span>🤖</span> AI Target: {currency}{numAiTarget.toFixed(2)} {aiTimeframe ? `(${aiTimeframe})` : ''}
          </span>
        )}
      </div>

      {/* Target Price Track Container */}
      <div className="relative pt-7 pb-6 select-none">
        {/* Top Floating Badge: Current Price Pin */}
        {currPct !== null && (
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
            style={{ left: `${currPct}%` }}
          >
            <div className="bg-amber-400 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.6)] whitespace-nowrap">
              ปัจจุบัน {currency}{currentPrice.toFixed(2)}
            </div>
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-amber-400" />
          </div>
        )}

        {/* Top Floating Badge: AI Target Pin if significantly different from Current */}
        {aiPct !== null && numAiTarget && currPct !== null && Math.abs(aiPct - currPct) > 8 && (
          <div
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-15 pointer-events-none"
            style={{ left: `${aiPct}%` }}
          >
            <div className="bg-purple-600 text-purple-100 text-xs font-black px-2 py-0.5 rounded-full border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.5)] whitespace-nowrap">
              AI {currency}{numAiTarget.toFixed(0)}
            </div>
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-purple-500" />
          </div>
        )}

        {/* The Track */}
        <div className="h-2.5 bg-slate-800/90 rounded-full relative overflow-hidden border border-[#2A2E45]">
          {/* Target range highlight span (Low to High) */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-sky-500/40 via-emerald-500/50 to-purple-500/40 rounded-full"
            style={{
              left: `${lowPct}%`,
              width: `${Math.max(4, highPct - lowPct)}%`
            }}
          />
        </div>

        {/* Current Price Dot on the track */}
        {currPct !== null && (
          <div
            className="absolute top-[31px] -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-slate-900 shadow-[0_0_10px_rgba(251,191,36,0.9)] z-20 pointer-events-none"
            style={{ left: `${currPct}%` }}
          />
        )}

        {/* Mean Indicator Dot on the track */}
        {meanPct !== null && (
          <div
            className="absolute top-[31px] -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-sky-400 border-2 border-slate-900 shadow-[0_0_8px_rgba(56,189,248,0.8)] z-10"
            style={{ left: `${meanPct}%` }}
          />
        )}

        {/* Bottom Markers: Low Target */}
        <div
          className="absolute top-[42px] -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${lowPct}%` }}
        >
          <div className="w-1 h-1.5 bg-slate-600 rounded-full mb-0.5" />
          <span className="text-xs font-bold text-slate-300 whitespace-nowrap">
            Low {currency}{targetLow.toFixed(0)}
          </span>
        </div>

        {/* Bottom Markers: Mean Target */}
        {meanPct !== null && (
          <div
            className="absolute top-[42px] -translate-x-1/2 flex flex-col items-center z-10"
            style={{ left: `${meanPct}%` }}
          >
            <div className="w-1 h-1.5 bg-sky-500 rounded-full mb-0.5" />
            <span className="text-xs font-black text-sky-300 whitespace-nowrap bg-[#12141F] px-1.5 py-0.5 rounded border border-sky-500/30">
              Mean {currency}{targetMean.toFixed(0)}
            </span>
          </div>
        )}

        {/* Bottom Markers: High Target */}
        <div
          className="absolute top-[42px] -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${highPct}%` }}
        >
          <div className="w-1 h-1.5 bg-emerald-600 rounded-full mb-0.5" />
          <span className="text-xs font-bold text-emerald-300 whitespace-nowrap">
            High {currency}{targetHigh.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  );
};
