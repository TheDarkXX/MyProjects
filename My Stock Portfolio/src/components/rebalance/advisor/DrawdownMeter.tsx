import React from 'react';

interface DrawdownMeterProps {
  scenario: string;
  estDrawdown: string;
  impact: string;
}

export const DrawdownMeter: React.FC<DrawdownMeterProps> = ({ scenario, estDrawdown, impact }) => {
  // Extract numbers from estDrawdown string (e.g., "-22% ถึง -32%" -> [22, 32])
  const matches = estDrawdown.match(/\d+(\.\d+)?/g);
  const nums = matches ? matches.map(Number) : [15];
  const minVal = nums[0] || 10;
  const maxVal = nums.length > 1 ? nums[1] : minVal;

  // Maximum scale is 50% drawdown
  const leftPct = Math.min(100, Math.max(0, (minVal / 50) * 100));
  const widthPct = Math.min(100 - leftPct, Math.max(4, ((maxVal - minVal) / 50) * 100));

  const getSeverity = (val: number) => {
    if (val > 25) {
      return {
        label: 'วิกฤตรุนแรง (Critical)',
        badge: 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.4)]',
        color: '#F43F5E'
      };
    }
    if (val > 15) {
      return {
        label: 'ผลกระทบสูง (Severe)',
        badge: 'bg-orange-500/25 text-orange-300 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]',
        color: '#F97316'
      };
    }
    return {
      label: 'ผลกระทบปานกลาง (Moderate)',
      badge: 'bg-amber-500/25 text-amber-300 border-amber-500/50',
      color: '#F59E0B'
    };
  };

  const severity = getSeverity(maxVal);

  return (
    <div className="border border-rose-500/20 bg-gradient-to-b from-[#181B2A] to-rose-950/15 rounded-xl p-4 md:p-5 flex flex-col justify-between hover:border-rose-500/40 transition-colors shadow-md">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <h4 className="font-bold text-rose-200 text-[14px] flex items-center gap-2">
            <span>⚡</span> {scenario}
          </h4>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-black px-2.5 py-0.5 rounded border ${severity.badge}`}>
              {severity.label}
            </span>
            <span className="text-[13px] font-black px-2.5 py-0.5 bg-rose-500/20 text-rose-300 rounded border border-rose-500/40 whitespace-nowrap">
              {estDrawdown}
            </span>
          </div>
        </div>

        {/* Severity Track */}
        <div className="py-2 mb-3">
          <div className="flex justify-between text-xs text-slate-400 font-medium mb-1">
            <span>0% (ปกติ)</span>
            <span>-15% (ผันผวน)</span>
            <span>-30% (วิกฤต)</span>
            <span>-50%+ (ล่มสลาย)</span>
          </div>
          <div className="h-3 bg-slate-800/80 rounded-full relative overflow-hidden border border-[#2A2E45]">
            {/* Background heat gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-amber-500/30 via-orange-500/30 to-rose-600/40" />

            {/* Drawdown indicator bar */}
            <div
              className="absolute top-0 bottom-0 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(244,63,94,0.7)]"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                backgroundColor: severity.color
              }}
            />
          </div>
        </div>

        {/* Impact Description */}
        <p className="text-[13px] text-slate-200 leading-relaxed font-normal pt-1 border-t border-[#232738]/80">
          {impact}
        </p>
      </div>
    </div>
  );
};
