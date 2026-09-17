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
    <div className="bg-[#0A1022]/90 border border-blue-900/40 rounded-2xl p-3.5 shadow-lg backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <h4 className="text-[13px] font-medium text-slate-200 tracking-wide uppercase">
            Execution Slip & Actions
          </h4>
        </div>
        <div className="text-[12px] text-slate-300 font-mono">
          โควตา: <span className="text-cyan-300 font-bold">{ownedShares}</span> / {targetShares} หุ้น ({holding.quotaProgressPct}%)
        </div>
      </div>

      {/* Position Snapshot Bar (Subtle, Clean Tiles) */}
      <div className="grid grid-cols-4 gap-2 p-2.5 bg-[#060A16]/80 rounded-xl border border-blue-900/30 mb-3">
        <div>
          <span className="text-[11px] text-slate-300">หุ้นที่ถือ:</span>
          <div className="text-[15px] font-bold text-white font-mono">
            {ownedShares.toLocaleString()}
          </div>
        </div>
        <div>
          <span className="text-[11px] text-slate-300">ต้นทุน:</span>
          <div className="text-[15px] font-bold text-amber-300 font-mono">
            ${avgCost.toFixed(2)}
          </div>
        </div>
        <div>
          <span className="text-[11px] text-slate-300">มูลค่าตลาด:</span>
          <div className="text-[15px] font-bold text-white font-mono">
            ${marketVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
        <div>
          <span className="text-[11px] text-slate-300">PnL รวม:</span>
          <div className={`text-[15px] font-bold font-mono ${isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPnlPositive ? '+' : ''}${pnl.toFixed(0)} ({isPnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%)
          </div>
        </div>
      </div>

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
                ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md shadow-emerald-500/10'
                : 'bg-[#060A16]/70 hover:bg-[#0B152C] border-blue-900/30 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-medium text-emerald-300 flex items-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5" />
              1. เติมโควตา
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {holding.quotaProgressPct}%
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono">
            {missingShares > 0 ? `ขาดอีก ${missingShares.toFixed(0)} หุ้น ($${buyCostNeeded.toFixed(0)})` : 'ครบ 100%'}
          </div>
        </button>

        {/* Action 2: Hold & Ride */}
        <button
          onClick={() => setActiveAction(activeAction === 'HOLD' ? null : 'HOLD')}
          className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeAction === 'HOLD'
              ? 'bg-cyan-500/15 border-cyan-500/60 shadow-md shadow-cyan-500/10'
              : 'bg-[#060A16]/70 hover:bg-[#0B152C] border-blue-900/30 hover:border-cyan-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-medium text-cyan-200 flex items-center gap-1">
              <PauseCircle className="w-3.5 h-3.5" />
              2. ถือตามแผน
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200 border border-cyan-500/30">
              Safe
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono">
            Cushion: <span className="text-emerald-300 font-bold">+{stopCushionPct.toFixed(1)}%</span>
          </div>
        </button>

        {/* Action 3: Free-Ride 50% */}
        <button
          onClick={() => setActiveAction(activeAction === 'FREERIDE' ? null : 'FREERIDE')}
          className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeAction === 'FREERIDE'
              ? 'bg-rose-500/15 border-rose-500/60 shadow-md shadow-rose-500/10'
              : isFreeRideEligible
                ? 'bg-[#180814] border-rose-500/60 animate-pulse'
                : 'bg-[#060A16]/70 hover:bg-[#0B152C] border-blue-900/30 hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-medium text-rose-300 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              3. Free-Ride
            </span>
            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
              isFreeRideEligible
                ? 'bg-rose-500/30 text-rose-200 border-rose-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {isFreeRideEligible ? 'พร้อม 🚀' : 'รอ +100%'}
            </span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono">
            {isFreeRideEligible ? `ดึงทุน $${freeRideCashReturn.toFixed(0)}` : 'ขาย 50% ดึงทุนออก'}
          </div>
        </button>
      </div>

      {/* Expanded Slip Panel based on active selection (Clean & Visual) */}
      {activeAction === 'BUY' && missingShares > 0 && (
        <div className="p-2.5 bg-emerald-950/25 border border-emerald-500/30 rounded-xl mb-2 flex items-center justify-between text-[12px]">
          <div>
            <span className="text-emerald-400 font-medium">คำนวณเติมโควตา:</span>
            <span className="text-slate-200 font-mono ml-1.5">
              ซื้อ <span className="font-bold text-white">{missingShares.toFixed(0)} หุ้น</span> @ ~${currentPrice.toFixed(1)} = <span className="text-emerald-300 font-bold">${buyCostNeeded.toFixed(0)}</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
            จะครบ 100%
          </span>
        </div>
      )}

      {activeAction === 'HOLD' && (
        <div className="p-2.5 bg-cyan-950/25 border border-cyan-500/30 rounded-xl mb-2 text-[12px] text-slate-200">
          <span className="text-cyan-400 font-medium">จุดตัดขาดทุน Stoploss:</span>
          <span className="font-mono text-amber-300 ml-1.5 font-bold">${stopPrice.toFixed(2)}</span>
          <span className="text-slate-300 ml-2 font-normal">ตราบใดที่ไม่หลุด EMA 200 และ Gross Margin ไม่ตก 3Q ติด ให้นั่งทับมือ</span>
        </div>
      )}

      {activeAction === 'FREERIDE' && (
        <div className="p-2.5 bg-amber-950/25 border border-amber-500/30 rounded-xl mb-2 text-[12px] text-slate-200">
          <span className="text-amber-400 font-medium">ดึงเงินต้นคืน:</span>
          <span className="text-slate-200 font-mono ml-1.5">
            ขาย <span className="font-bold text-white">{freeRideShares} หุ้น</span> ได้เงินสดคืน <span className="text-emerald-300 font-bold">${freeRideCashReturn.toFixed(0)}</span> เหลืออีก <span className="text-cyan-300 font-bold">{ownedShares - freeRideShares} หุ้น</span> ต้นทุนเป็น $0.00 ตลอดไป
          </span>
        </div>
      )}

      {/* Recent Transactions History (Compact strip) */}
      {holding.lots && holding.lots.length > 0 && (
        <div className="mt-2 pt-2 border-t border-blue-900/30">
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300 mb-1.5">
            <History className="w-3 h-3 text-cyan-400" />
            <span>ประวัติการทำรายการ ({holding.lots.length} รายการล่าสุด)</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {holding.lots.slice(0, 3).map((lot) => (
              <div key={lot.id} className="p-1.5 bg-[#060A16]/70 rounded-lg border border-blue-900/30 text-[11px] flex items-center justify-between">
                <div>
                  <span className={`font-bold ${lot.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {lot.type}
                  </span>
                  <span className="text-slate-200 font-mono ml-1">{lot.shares} หุ้น</span>
                </div>
                <div className="text-cyan-200 font-mono">
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
