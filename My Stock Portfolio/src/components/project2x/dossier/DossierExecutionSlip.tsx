import React, { useState } from 'react';
import { ShoppingCart, PauseCircle, ShieldAlert, History } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DossierExecutionSlipProps {
  data: DossierPayload;
}

export const DossierExecutionSlip: React.FC<DossierExecutionSlipProps> = ({ data }) => {
  const { holding, currentPrice, radar } = data;
  const [activeAction, setActiveAction] = useState<'BUY' | 'HOLD' | 'FREERIDE' | null>(null);

  const ownedShares = holding.shares || 0;
  const targetShares = holding.targetShares || 0;
  const missingShares = holding.quotaSharesRemaining || 0;
  const avgCost = holding.avgCost || 0;
  const marketVal = holding.marketValue || 0;
  const pnl = holding.unrealizedPnl || 0;
  const pnlPct = holding.unrealizedPnlPct || 0;
  const isPnlPositive = pnl >= 0;

  // Cost needed to complete quota
  const buyCostNeeded = missingShares * currentPrice;

  // Free-Ride 50% calculation
  const freeRideShares = Math.floor(ownedShares / 2);
  const freeRideCashReturn = freeRideShares * currentPrice;
  const isFreeRideEligible = pnlPct >= 100.0;

  // Trailing stop cushion
  const stopPrice = radar.ema200 || (avgCost * 0.9);
  const stopCushionPct = currentPrice > 0 ? ((currentPrice - stopPrice) / currentPrice) * 100 : 0;

  return (
    <div className="bg-[#0E1326]/95 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(130,58,253,0.8)]" />
          <h4 className="text-base font-bold text-slate-100 tracking-wide uppercase">
            Execution Slip & Actions
          </h4>
        </div>
        <div className="text-sm text-slate-300 font-mono flex items-center gap-2">
          <span>โควตาเป้าหมาย:</span>
          <span className="text-violet-300 font-bold text-base">{ownedShares}</span>
          <span>/ {targetShares} หุ้น</span>
          <span className="px-2 py-0.5 rounded-md bg-violet-600/20 text-violet-200 font-bold text-xs border border-violet-500/40">
            {holding.quotaProgressPct}%
          </span>
        </div>
      </div>

      {/* Position Snapshot Bar */}
      {ownedShares === 0 ? (
        <div className="p-3.5 bg-violet-950/20 rounded-xl border border-violet-800/30 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🎯</span>
            <div>
              <div className="text-sm font-bold text-slate-200">ยังไม่มีสถานะถือครองในพอร์ทนี้</div>
              <div className="text-xs text-slate-400">โควตาแนะนำ {targetShares} หุ้น (${buyCostNeeded.toLocaleString('en-US', { maximumFractionDigits: 0 })})</div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-600/50 text-slate-200 text-xs font-semibold">
            รอจังหวะสะสมโควตา
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2.5 p-3 bg-[#0A0E1A] rounded-xl border border-white/10 mb-3">
          <div>
            <span className="text-xs text-slate-400 font-medium">หุ้นที่ถือ:</span>
            <div className="text-lg font-bold text-white font-mono">
              {ownedShares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">ต้นทุนเฉลี่ย:</span>
            <div className="text-lg font-bold text-slate-200 font-mono">
              {avgCost > 0 ? `$${avgCost.toFixed(2)}` : (
                <span className="text-xs text-slate-300 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                  ไม่ได้กำหนด
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">มูลค่าตลาด:</span>
            <div className="text-lg font-bold text-slate-100 font-mono">
              ${marketVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">กำไร/ขาดทุน (PnL):</span>
            <div className={`text-lg font-bold font-mono ${isPnlPositive ? 'text-emerald-400' : 'text-[#FC2D79]'}`}>
              {isPnlPositive ? '+' : ''}${pnl.toFixed(0)} ({isPnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%)
            </div>
          </div>
        </div>
      )}

      {/* 3 Intelligent Action Instruments */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {/* Action 1: Sniper Buy */}
        <button
          onClick={() => setActiveAction(activeAction === 'BUY' ? null : 'BUY')}
          disabled={missingShares <= 0}
          className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            missingShares <= 0
              ? 'bg-[#060A16]/30 border-slate-800 opacity-40 cursor-not-allowed'
              : activeAction === 'BUY'
                ? 'bg-violet-600/20 border-violet-400 shadow-md shadow-violet-500/10'
                : 'bg-[#0A0E1A] hover:bg-[#12162B] border-white/10 hover:border-violet-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[14px] font-semibold text-violet-200 flex items-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5" />
              1. เติมโควตา
            </span>
            <span className="text-[12px] font-mono font-medium px-1.5 py-0.5 rounded bg-violet-600/20 text-violet-200 border border-violet-500/30">
              {holding.quotaProgressPct}%
            </span>
          </div>
          <div className="text-[13px] text-slate-300 font-mono">
            {missingShares > 0 ? `ขาดอีก ${missingShares.toFixed(0)} หุ้น ($${buyCostNeeded.toFixed(0)})` : 'ครบ 100%'}
          </div>
        </button>

        {/* Action 2: Hold & Ride */}
        <button
          onClick={() => setActiveAction(activeAction === 'HOLD' ? null : 'HOLD')}
          className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeAction === 'HOLD'
              ? 'bg-orange-500/20 border-orange-400 shadow-md shadow-orange-500/10'
              : 'bg-[#0A0E1A] hover:bg-[#12162B] border-white/10 hover:border-orange-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[14px] font-semibold text-orange-200 flex items-center gap-1">
              <PauseCircle className="w-3.5 h-3.5" />
              2. ถือตามแผน
            </span>
            <span className="text-[12px] font-mono font-medium px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
              Safe
            </span>
          </div>
          <div className="text-[13px] text-slate-300 font-mono">
            Cushion: <span className="text-orange-300 font-semibold">+{stopCushionPct.toFixed(1)}%</span>
          </div>
        </button>

        {/* Action 3: Free-Ride 50% */}
        <button
          onClick={() => setActiveAction(activeAction === 'FREERIDE' ? null : 'FREERIDE')}
          className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeAction === 'FREERIDE'
              ? 'bg-[#FC2D79]/20 border-[#FC2D79]/60 shadow-md shadow-[#FC2D79]/15'
              : isFreeRideEligible
                ? 'bg-[#1A0A14] border-[#FC2D79]/60 animate-pulse'
                : 'bg-[#0A0E1A] hover:bg-[#12162B] border-white/10 hover:border-[#FC2D79]/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[14px] font-semibold text-[#FF5388] flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              3. Free-Ride
            </span>
            <span className={`text-[12px] font-mono font-medium px-1.5 py-0.5 rounded border ${
              isFreeRideEligible
                ? 'bg-[#FC2D79]/30 text-rose-200 border-[#FC2D79]/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {isFreeRideEligible ? 'พร้อม 🚀' : 'รอ +100%'}
            </span>
          </div>
          <div className="text-[13px] text-slate-300 font-mono">
            {isFreeRideEligible ? `ดึงทุน $${freeRideCashReturn.toFixed(0)}` : 'ขาย 50% ดึงทุนออก'}
          </div>
        </button>
      </div>

      {/* Expanded Slip Panel */}
      {activeAction === 'BUY' && missingShares > 0 && (
        <div className="p-2.5 bg-violet-950/30 border border-violet-500/40 rounded-xl mb-2 flex items-center justify-between text-[13px]">
          <div>
            <span className="text-violet-300 font-medium">คำนวณเติมโควตา:</span>
            <span className="text-slate-200 font-mono ml-1.5">
              ซื้อ <span className="font-semibold text-white">{missingShares.toFixed(0)} หุ้น</span> @ ~${currentPrice.toFixed(1)} = <span className="text-violet-200 font-semibold">${buyCostNeeded.toFixed(0)}</span>
            </span>
          </div>
          <span className="text-[12px] text-slate-300 font-mono bg-slate-900 px-2.5 py-0.5 rounded border border-slate-700">
            จะครบ 100%
          </span>
        </div>
      )}

      {activeAction === 'HOLD' && (
        <div className="p-2.5 bg-orange-950/20 border border-orange-500/35 rounded-xl mb-2 text-[13px] text-slate-200">
          <span className="text-orange-400 font-medium">จุดตัดขาดทุน Stoploss:</span>
          <span className="font-mono text-slate-100 ml-1.5 font-semibold">${stopPrice.toFixed(2)}</span>
          <span className="text-slate-300 ml-2 font-normal">ตราบใดที่ไม่หลุด EMA 200 และ Gross Margin ไม่ตก 3Q ติด ให้นั่งทับมือ</span>
        </div>
      )}

      {activeAction === 'FREERIDE' && (
        <div className="p-2.5 bg-[#FC2D79]/10 border border-[#FC2D79]/35 rounded-xl mb-2 text-[13px] text-slate-200">
          <span className="text-[#FF5388] font-medium">ดึงเงินต้นคืน:</span>
          <span className="text-slate-200 font-mono ml-1.5">
            ขาย <span className="font-semibold text-white">{freeRideShares} หุ้น</span> ได้เงินสดคืน <span className="text-rose-200 font-semibold">${freeRideCashReturn.toFixed(0)}</span> เหลืออีก <span className="text-violet-300 font-semibold">{ownedShares - freeRideShares} หุ้น</span> ต้นทุนเป็น $0.00 ตลอดไป
          </span>
        </div>
      )}

      {holding.lots && holding.lots.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1 text-[13px] font-medium text-slate-300 mb-1.5">
            <History className="w-3.5 h-3.5 text-violet-400" />
            <span>ประวัติการทำรายการ ({holding.lots.length} รายการล่าสุด)</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {holding.lots.slice(0, 3).map((lot) => (
              <div key={lot.id} className="p-1.5 bg-[#0A0E1A] rounded-lg border border-white/10 text-[12px] flex items-center justify-between">
                <div>
                  <span className={`font-semibold ${lot.type === 'BUY' ? 'text-violet-400' : 'text-[#FC2D79]'}`}>
                    {lot.type}
                  </span>
                  <span className="text-slate-200 font-mono ml-1">{lot.shares} หุ้น</span>
                </div>
                <div className="text-slate-200 font-mono">
                  @${lot.price.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
