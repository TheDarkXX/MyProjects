import React from 'react';
import { TrendingUp, TrendingDown, Clock, X } from 'lucide-react';
import { TV_FONT_FAMILY } from '../../types/chart';

export interface RulerPoint {
  x: number;
  y: number;
  price: number;
  time: string;
  barIndex: number;
}

export interface PriceRangeRulerProps {
  startPoint: RulerPoint;
  currentPoint: RulerPoint;
  onDismiss?: () => void;
}

export const PriceRangeRuler: React.FC<PriceRangeRulerProps> = ({
  startPoint,
  currentPoint,
  onDismiss,
}) => {
  const left = Math.min(startPoint.x, currentPoint.x);
  const top = Math.min(startPoint.y, currentPoint.y);
  const width = Math.max(2, Math.abs(currentPoint.x - startPoint.x));
  const height = Math.max(2, Math.abs(currentPoint.y - startPoint.y));

  const startPrice = startPoint.price;
  const endPrice = currentPoint.price;
  const priceDelta = endPrice - startPrice;
  const percentChange = startPrice > 0 ? (priceDelta / startPrice) * 100 : 0;
  const isGain = priceDelta >= 0;

  const barCount = Math.abs(currentPoint.barIndex - startPoint.barIndex);

  let timeDurationStr = '';
  try {
    const t1 = new Date(startPoint.time).getTime();
    const t2 = new Date(currentPoint.time).getTime();
    if (!isNaN(t1) && !isNaN(t2)) {
      const days = Math.round(Math.abs(t2 - t1) / (1000 * 60 * 60 * 24));
      if (days >= 14) {
        timeDurationStr = `${(days / 7).toFixed(1)} Weeks (${days}d)`;
      } else {
        timeDurationStr = `${days} Days`;
      }
    }
  } catch (e) {
    timeDurationStr = `${barCount} Bars`;
  }

  // Positioning the floating badge near the current cursor position
  const badgeX = currentPoint.x >= startPoint.x ? currentPoint.x + 12 : currentPoint.x - 220;
  const badgeY = currentPoint.y >= startPoint.y ? currentPoint.y + 12 : currentPoint.y - 80;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" style={{ fontFamily: TV_FONT_FAMILY }}>
      {/* Semi-transparent bounding measurement rectangle */}
      <div
        className={`absolute border transition-all duration-75 ${
          isGain
            ? 'bg-emerald-500/15 border-emerald-400/70 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            : 'bg-rose-500/15 border-rose-400/70 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
        }`}
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      />

      {/* Center diagonal connecting arrow line */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <line
          x1={startPoint.x}
          y1={startPoint.y}
          x2={currentPoint.x}
          y2={currentPoint.y}
          stroke={isGain ? '#10B981' : '#EF4444'}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        {/* Start point anchor dot */}
        <circle cx={startPoint.x} cy={startPoint.y} r="3.5" fill={isGain ? '#10B981' : '#EF4444'} />
        {/* End point cursor anchor dot */}
        <circle cx={currentPoint.x} cy={currentPoint.y} r="4.5" fill={isGain ? '#10B981' : '#EF4444'} stroke="#FFFFFF" strokeWidth="1.5" />
      </svg>

      {/* Floating Measurement Info Badge */}
      <div
        className={`pointer-events-auto absolute z-40 flex flex-col gap-1 p-2.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-75 select-none ${
          isGain
            ? 'bg-[#081C15]/95 border-emerald-500/60 text-emerald-100'
            : 'bg-[#220B0E]/95 border-rose-500/60 text-rose-100'
        }`}
        style={{
          left: `${Math.max(10, Math.min(window.innerWidth - 240, badgeX))}px`,
          top: `${Math.max(10, Math.min(window.innerHeight - 120, badgeY))}px`,
          minWidth: '200px',
        }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
          <span className="text-[13px] font-mono text-slate-300">
            ${startPrice.toFixed(2)} → ${endPrice.toFixed(2)}
          </span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
              title="Close Measure Box"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-sm font-black">
          {isGain ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
          <span className={isGain ? 'text-emerald-400' : 'text-rose-400'}>
            {isGain ? '+' : ''}
            {priceDelta.toFixed(2)} ({isGain ? '+' : ''}
            {percentChange.toFixed(2)}%)
          </span>
        </div>

        <div className="flex items-center gap-3 text-[13px] text-slate-300">
          <span className="font-semibold">{barCount} Bars</span>
          {timeDurationStr && (
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3 h-3" />
              {timeDurationStr}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
