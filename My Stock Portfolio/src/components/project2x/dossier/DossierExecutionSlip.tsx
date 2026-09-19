import React, { useState } from 'react';
import { ShoppingCart, PauseCircle, ShieldAlert, History, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { DossierPayload } from '../../../stores/dossierStore';

interface DossierExecutionSlipProps {
  data: DossierPayload;
  className?: string;
}

export const DossierExecutionSlip: React.FC<DossierExecutionSlipProps> = ({ data, className = '' }) => {
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
    <div className={`bg-[#0E1326]/95 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(130,58,253,0.8)] flex-shrink-0" />
          <h4 className="text-[15px] font-bold text-slate-100 tracking-wide uppercase">
            Execution Slip & Actions
          </h4>
        </div>

        {/* Quota Progress Pill */}
        <div className="flex items-center gap-2 text-[13px] text-slate-300 font-mono">
          <span className="text-slate-400">โควตาเป้าหมาย:</span>
          <span className="text-white font-bold">{ownedShares.toFixed(2)}</span>
          <span className="text-slate-400">/ {targetShares.toFixed(0)} หุ้น</span>
          <span className="px-2 py-0.5 rounded-md bg-violet-600/20 text-violet-200 font-bold text-[12px] border border-violet-500/40">
            {holding.quotaProgressPct}%
          </span>
        </div>
      </div>

      {/* Institutional Position Snapshot Cards */}
      {ownedShares === 0 ? (
        <div className="p-3.5 bg-violet-950/20 rounded-xl border border-violet-800/30 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🎯</span>
            <div>
              <div className="text-[14px] font-bold text-slate-200">ยังไม่มีสถานะถือครองในพอร์ตนี้</div>
              <div className="text-[13px] text-slate-400">
                โควตาเป้าหมาย {targetShares} หุ้น (~${buyCostNeeded.toLocaleString('en-US', { maximumFractionDigits: 0 })})
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-600/50 text-slate-200 text-[12px] font-semibold">
            รอจังหวะสะสมโควตา
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
          <div className="p-2.5 bg-[#0A0E1A] rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[12px] text-slate-400 font-medium">หุ้นที่ถือ</span>
            <div className="text-lg font-bold text-white font-mono mt-1">
              {ownedShares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
          </div>

          <div className="p-2.5 bg-[#0A0E1A] rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[12px] text-slate-400 font-medium">ต้นทุนเฉลี่ย</span>
            <div className="text-lg font-bold text-slate-200 font-mono mt-1">
              {avgCost > 0 ? `$${avgCost.toFixed(2)}` : 'N/A'}
            </div>
          </div>

          <div className="p-2.5 bg-[#0A0E1A] rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[12px] text-slate-400 font-medium">มูลค่าตลาด</span>
            <div className="text-lg font-bold text-slate-100 font-mono mt-1">
              ${marketVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>

          <div className="p-2.5 bg-[#0A0E1A] rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[12px] text-slate-400 font-medium">กำไร / ขาดทุน (PnL)</span>
            <div className={`text-lg font-bold font-mono mt-1 flex items-center gap-1 ${isPnlPositive ? 'text-emerald-400' : 'text-[#FC2D79]'}`}>
              {isPnlPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{isPnlPositive ? '+' : ''}${pnl.toFixed(0)}</span>
              <span className="text-[12px] font-semibold opacity-90">({isPnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* 3 Intelligent Action Steps (Interactive Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-2.5">
        {/* Action 1: Sniper Buy */}
        <button
          type="button"
          onClick={() => setActiveAction(activeAction === 'BUY' ? null : 'BUY')}
          disabled={missingShares <= 0}
          className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            missingShares <= 0
              ? 'bg-[#060A16]/40 border-slate-800 opacity-40 cursor-not-allowed'
              : activeAction === 'BUY'
                ? 'bg-violet-600/20 border-violet-400 shadow-[0_0_12px_rgba(130,58,253,0.25)]'
                : 'bg-[#0A0E1A] hover:bg-[#12162B] border-white/10 hover:border-violet-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[14px] font-bold text-violet-200 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-violet-400" />
              1. เติมโควตา
            </span>
            <span className="text-[12px] font-mono font-semibold px-2 py-0.5 rounded bg-violet-600/20 text-violet-200 border border-violet-500/30">
              {holding.quotaProgressPct}%
            </span>
          </div>
          <div className="text-[13px] text-slate-300 font-mono">
            {missingShares > 0 ? `ขาดอีก ${missingShares.toFixed(0)} หุ้น ($${buyCostNeeded.toFixed(0)})` : 'สะสมครบ 100%'}
          </div>
        </button>

        {/* Action 2: Hold & Ride */}
        <button
          type="button"
          onClick={() => setActiveAction(activeAction === 'HOLD' ? null : 'HOLD')}
          className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeAction === 'HOLD'
              ? 'bg-orange-500/20 border-orange-400 shadow-[0_0_12px_rgba(253,85,20,0.25)]'
              : 'bg-[#0A0E1A] hover:bg-[#12162B] border-white/10 hover:border-orange-500/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[14px] font-bold text-orange-200 flex items-center gap-1.5">
              <PauseCircle className="w-4 h-4 text-orange-400" />
              2. ถือตามแผน
            </span>
            <span className="text-[12px] font-mono font-semibold px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
              Safe
            </span>
          </div>
          <div className="text-[13px] text-slate-300 font-mono">
            Cushion: <span className="text-orange-300 font-semibold">+{stopCushionPct.toFixed(1)}%</span> เหนือ Stop
          </div>
        </button>

        {/* Action 3: Free-Ride 50% */}
        <button
          type="button"
          onClick={() => setActiveAction(activeAction === 'FREERIDE' ? null : 'FREERIDE')}
          className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
            activeAction === 'FREERIDE'
              ? 'bg-[#FC2D79]/20 border-[#FC2D79]/60 shadow-[0_0_12px_rgba(252,45,121,0.25)]'
              : isFreeRideEligible
                ? 'bg-[#1A0A14] border-[#FC2D79]/60 shadow-[0_0_12px_rgba(252,45,121,0.3)] animate-pulse'
                : 'bg-[#0A0E1A] hover:bg-[#12162B] border-white/10 hover:border-[#FC2D79]/40'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[14px] font-bold text-[#FF5388] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#FC2D79]" />
              3. Free-Ride
            </span>
            <span className={`text-[12px] font-mono font-semibold px-2 py-0.5 rounded border ${
              isFreeRideEligible
                ? 'bg-[#FC2D79]/30 text-rose-200 border-[#FC2D79]/50'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {isFreeRideEligible ? 'พร้อม 🚀' : 'รอ +100%'}
            </span>
          </div>
          <div className="text-[13px] text-slate-300 font-mono">
            {isFreeRideEligible ? `ดึงทุนคืน $${freeRideCashReturn.toFixed(0)}` : 'ขาย 50% ดึงทุนออก'}
          </div>
        </button>
      </div>

      {/* Interactive Expanded Detail Drawer */}
      {activeAction === 'BUY' && missingShares > 0 && (
        <div className="p-3 bg-violet-950/30 border border-violet-500/40 rounded-xl mb-2.5 flex items-center justify-between text-[13px]">
          <div>
            <span className="text-violet-300 font-semibold">คำนวณเติมโควตา:</span>
            <span className="text-slate-200 font-mono ml-2">
              ซื้อเพิ่ม <span className="font-bold text-white">{missingShares.toFixed(0)} หุ้น</span> @ ~${currentPrice.toFixed(1)} = <span className="text-violet-200 font-bold">${buyCostNeeded.toFixed(0)}</span>
            </span>
          </div>
          <span className="text-[12px] text-slate-300 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
            พอร์ตจะครบ 100%
          </span>
        </div>
      )}

      {activeAction === 'HOLD' && (
        <div className="p-3 bg-orange-950/25 border border-orange-500/40 rounded-xl mb-2.5 text-[13px] text-slate-200">
          <span className="text-orange-400 font-semibold">จุดตัดขาดทุน Trailing Stop:</span>
          <span className="font-mono text-white ml-2 font-bold">${stopPrice.toFixed(2)}</span>
          <span className="text-slate-300 ml-2 font-normal">ตราบใดที่ราคาไม่หลุดเส้น EMA 200 ให้นั่งทับมือตามวินัย</span>
        </div>
      )}

      {activeAction === 'FREERIDE' && (
        <div className="p-3 bg-[#FC2D79]/15 border border-[#FC2D79]/40 rounded-xl mb-2.5 text-[13px] text-slate-200">
          <span className="text-[#FF5388] font-semibold">ดึงเงินต้นคืน (Zero-Risk):</span>
          <span className="text-slate-200 font-mono ml-2">
            ขาย <span className="font-bold text-white">{freeRideShares} หุ้น</span> ได้เงินสดคืน <span className="text-rose-200 font-bold">${freeRideCashReturn.toFixed(0)}</span> เหลืออีก <span className="text-violet-300 font-bold">{ownedShares - freeRideShares} หุ้น</span> ต้นทุนเป็น $0.00 ปล่อยรันกำไรไร้ความเสี่ยง
          </span>
        </div>
      )}

      {/* Recent Orders Ticker Stream */}
      {holding.lots && holding.lots.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-300 mb-2">
            <History className="w-3.5 h-3.5 text-violet-400" />
            <span>ประวัติการทำรายการ ({holding.lots.length} รายการล่าสุด)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {holding.lots.slice(0, 4).map((lot) => (
              <div key={lot.id} className="p-2 bg-[#0A0E1A] rounded-lg border border-white/10 text-[12px] flex items-center justify-between font-mono">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${lot.type === 'BUY' ? 'bg-violet-600/30 text-violet-200' : 'bg-pink-600/30 text-pink-200'}`}>
                    {lot.type}
                  </span>
                  <span className="text-slate-200 font-semibold">{lot.shares} หุ้น</span>
                </div>
                <div className="text-slate-300 font-bold">
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
