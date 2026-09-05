import React from 'react';

interface ConsensusBarProps {
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
  recommendationKey?: string;
}

export const ConsensusBar: React.FC<ConsensusBarProps> = ({
  strongBuy = 0,
  buy = 0,
  hold = 0,
  sell = 0,
  strongSell = 0,
  recommendationKey = ''
}) => {
  const totalSell = (sell || 0) + (strongSell || 0);
  const total = (strongBuy || 0) + (buy || 0) + (hold || 0) + totalSell;

  const formatRecKey = (key: string) => {
    if (!key) return null;
    const formatted = key.replace(/_/g, ' ').toUpperCase();
    let badgeStyle = 'bg-slate-700/60 text-slate-200 border-slate-600';

    if (key.includes('strong_buy')) {
      badgeStyle = 'bg-emerald-500/25 text-emerald-300 border-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.4)]';
    } else if (key.includes('buy')) {
      badgeStyle = 'bg-teal-500/25 text-teal-300 border-teal-400/60 shadow-[0_0_10px_rgba(45,212,191,0.3)]';
    } else if (key.includes('hold')) {
      badgeStyle = 'bg-amber-500/25 text-amber-300 border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
    } else if (key.includes('sell') || key.includes('underperform')) {
      badgeStyle = 'bg-rose-500/25 text-rose-300 border-rose-400/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]';
    }

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-black border ${badgeStyle} tracking-wider`}>
        {formatted}
      </span>
    );
  };

  if (total === 0) {
    return (
      <div className="py-2 text-[13px] text-slate-300 italic flex items-center justify-between">
        <span>Wall Street Consensus</span>
        {formatRecKey(recommendationKey) || <span className="text-slate-400">ไม่มีข้อมูล</span>}
      </div>
    );
  }

  const pStrongBuy = (strongBuy / total) * 100;
  const pBuy = (buy / total) * 100;
  const pHold = (hold / total) * 100;
  const pSell = (totalSell / total) * 100;

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <span>👥</span> Wall Street Consensus ({total} ท่าน)
        </span>
        {formatRecKey(recommendationKey)}
      </div>

      {/* Stacked Bar */}
      <div className="h-2.5 w-full bg-slate-800/80 rounded-full overflow-hidden flex border border-[#2A2E45]/80">
        {pStrongBuy > 0 && (
          <div
            style={{ width: `${pStrongBuy}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
            title={`Strong Buy: ${strongBuy} (${pStrongBuy.toFixed(0)}%)`}
          />
        )}
        {pBuy > 0 && (
          <div
            style={{ width: `${pBuy}%` }}
            className="bg-teal-400 h-full transition-all duration-500"
            title={`Buy: ${buy} (${pBuy.toFixed(0)}%)`}
          />
        )}
        {pHold > 0 && (
          <div
            style={{ width: `${pHold}%` }}
            className="bg-amber-400 h-full transition-all duration-500"
            title={`Hold: ${hold} (${pHold.toFixed(0)}%)`}
          />
        )}
        {pSell > 0 && (
          <div
            style={{ width: `${pSell}%` }}
            className="bg-rose-500 h-full transition-all duration-500"
            title={`Sell: ${totalSell} (${pSell.toFixed(0)}%)`}
          />
        )}
      </div>

      {/* Legend & Count */}
      <div className="flex items-center justify-between text-[13px] text-slate-300 pt-0.5">
        <div className="flex items-center gap-2.5">
          {strongBuy > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-200 font-medium">Strong Buy: <b className="text-emerald-400">{strongBuy}</b></span>
            </span>
          )}
          {buy > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
              <span className="text-slate-200 font-medium">Buy: <b className="text-teal-300">{buy}</b></span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {hold > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-slate-200 font-medium">Hold: <b className="text-amber-400">{hold}</b></span>
            </span>
          )}
          {totalSell > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span className="text-slate-200 font-medium">Sell: <b className="text-rose-400">{totalSell}</b></span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
