import React from 'react';
import { ArrowUpRight, ArrowDownRight, Briefcase } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DossierHoldingProfileProps {
  data: DossierPayload;
}

export const DossierHoldingProfile: React.FC<DossierHoldingProfileProps> = ({ data }) => {
  const currentPrice = data.currentPrice || 0;
  const change = data.liveQuote?.change || 0;
  const changePct = data.liveQuote?.percent_change || 0;
  const isUp = change >= 0;

  const holding = data.holding;
  const shares = holding?.shares || 0;
  const avgCost = holding?.avgCost || 0;
  const marketValue = holding?.marketValue || (shares * currentPrice);
  const pnlDollar = holding?.unrealizedPnl ?? (shares > 0 ? (currentPrice - avgCost) * shares : 0);
  const pnlPct = holding?.unrealizedPnlPct ?? (avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0);
  const isPnlPositive = pnlDollar >= 0;

  return (
    <div className="bg-[#12162B]/95 p-3.5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md flex flex-col justify-between gap-3 h-full transition-all">
      {/* Top: Symbol + Category + Live Price */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
              {data.symbol}
            </h2>
            <span className={`px-2.5 py-0.5 rounded text-[12px] font-semibold ${
              data.category === 'Core'
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
            }`}>
              {data.category === 'Core' ? 'Core 👑' : 'Moonshot 🚀'}
            </span>
          </div>
          <p className="text-[13px] text-slate-300 font-normal mt-0.5 truncate max-w-[200px]">
            {data.name}
          </p>
        </div>

        {/* Live Price Box */}
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            ${currentPrice.toFixed(2)}
          </div>
          <div className={`flex items-center justify-end gap-1 text-[13px] font-semibold font-mono mt-0.5 ${isUp ? 'text-emerald-400' : 'text-[#FC2D79]'}`}>
            {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>{isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      {/* Bottom: Holding Status Strip */}
      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[13px]">
        {shares > 0 ? (
          <>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Briefcase className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>
                ถือ <strong className="text-white font-mono">{shares.toLocaleString()}</strong> หุ้น 
                <span className="text-slate-400 text-[12px] ml-1">(ทุน ${avgCost.toFixed(1)})</span>
              </span>
            </div>
            <div className={`font-mono font-bold text-[13px] flex items-center gap-1 shrink-0 ${isPnlPositive ? 'text-emerald-400' : 'text-[#FC2D79]'}`}>
              <span>{isPnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%</span>
              <span className="text-[11px] font-normal opacity-90">
                (${Math.abs(pnlDollar) >= 1000 ? `${(pnlDollar / 1000).toFixed(1)}k` : pnlDollar.toFixed(0)})
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between w-full text-slate-400 text-[13px]">
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span>ยังไม่มีหุ้นในพอร์ต</span>
            </span>
            <span className="text-[12px] text-violet-300 font-semibold px-2 py-0.5 rounded bg-violet-950/40 border border-violet-500/30">
              รอจังหวะสะสม
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DossierHoldingProfile;
