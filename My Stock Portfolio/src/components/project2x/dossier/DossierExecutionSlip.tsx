import React, { useState } from 'react';
import { ShoppingCart, PauseCircle, ShieldAlert, Sparkles, ArrowRight, History } from 'lucide-react';
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
    <div className="bg-[#0B0F1A] border border-slate-800/80 rounded-2xl p-4 shadow-xl mb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Execution Slip & Decision Actions (จัดการคำสั่ง)
          </h4>
        </div>
        <div className="text-[13px] text-slate-300 font-mono">
          โควตา: <span className="text-cyan-400 font-bold">{ownedShares}</span> / {targetShares} หุ้น ({holding.quotaProgressPct}%)
        </div>
      </div>

      {/* Position Snapshot Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 mb-4">
        <div>
          <span className="text-[13px] text-slate-400">หุ้นที่ถือ:</span>
          <div className="text-lg font-black text-slate-100 font-mono">
            {ownedShares.toLocaleString()} หุ้น
          </div>
        </div>
        <div>
          <span className="text-[13px] text-slate-400">ต้นทุนเฉลี่ย:</span>
          <div className="text-lg font-black text-amber-300 font-mono">
            ${avgCost.toFixed(2)}
          </div>
        </div>
        <div>
          <span className="text-[13px] text-slate-400">มูลค่าตลาด:</span>
          <div className="text-lg font-black text-slate-100 font-mono">
            ${marketVal.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </div>
        </div>
        <div>
          <span className="text-[13px] text-slate-400">กำไร/ขาดทุน (PnL):</span>
          <div className={`text-lg font-black font-mono ${isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPnlPositive ? '+' : ''}${pnl.toFixed(1)} ({isPnlPositive ? '+' : ''}{pnlPct.toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* 3 Intelligent Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Action 1: Sniper Buy (ซื้อเติมโควตา) */}
        <button
          onClick={() => setActiveAction(activeAction === 'BUY' ? null : 'BUY')}
          disabled={missingShares <= 0}
          className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
            missingShares <= 0
              ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
              : activeAction === 'BUY'
                ? 'bg-emerald-500/20 border-emerald-500 text-slate-100 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-emerald-500/50 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4" />
              1. ซื้อเติมโควตา
            </span>
            <span className="text-[13px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Sniper Add
            </span>
          </div>
          <p className="text-[13px] text-slate-300 leading-snug">
            {missingShares > 0
              ? `ขาดอีก ${missingShares.toFixed(0)} หุ้น ($${buyCostNeeded.toFixed(0)}) เพื่อครบโควตา 100%`
              : 'โควตาครบ 100% แล้ว ไม่จำเป็นต้องซื้อเพิ่ม'}
          </p>
        </button>

        {/* Action 2: Hold & Relax (ถือรอ) */}
        <button
          onClick={() => setActiveAction(activeAction === 'HOLD' ? null : 'HOLD')}
          className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
            activeAction === 'HOLD'
              ? 'bg-cyan-500/20 border-cyan-500 text-slate-100 shadow-lg shadow-cyan-500/10'
              : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-cyan-500/50 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-black text-cyan-400 flex items-center gap-1.5">
              <PauseCircle className="w-4 h-4" />
              2. นั่งทับมือถือรอ
            </span>
            <span className="text-[13px] font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Hold & Ride
            </span>
          </div>
          <p className="text-[13px] text-slate-300 leading-snug">
            ระยะห่างแนวรับ Stop (EMA200): <span className="font-bold text-slate-100 font-mono">+{stopCushionPct.toFixed(1)}%</span> ถือรอกินคำใหญ่
          </p>
        </button>

        {/* Action 3: Free-Ride 50% (ขายดึงทุนออก) */}
        <button
          onClick={() => setActiveAction(activeAction === 'FREERIDE' ? null : 'FREERIDE')}
          className={`p-3.5 rounded-xl border transition-all text-left flex flex-col justify-between ${
            isFreeRideEligible
              ? 'bg-amber-500/20 border-amber-500 text-slate-100 animate-pulse shadow-lg shadow-amber-500/20'
              : activeAction === 'FREERIDE'
                ? 'bg-slate-800 border-slate-600 text-slate-100'
                : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-amber-500/40 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-black text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              3. Free-Ride 50%
            </span>
            <span className={`text-[13px] font-bold px-2 py-0.5 rounded ${
              isFreeRideEligible
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {isFreeRideEligible ? 'พร้อมใช้สิทธิ์ 🎉' : `${pnlPct.toFixed(0)}% / 100%`}
            </span>
          </div>
          <p className="text-[13px] text-slate-300 leading-snug">
            {isFreeRideEligible
              ? `กำไรครบ 100%! ขาย ${freeRideShares} หุ้น ดึงทุน $${freeRideCashReturn.toFixed(0)} คืนทันที`
              : `เมื่อกำไรถึง +100% ขาย 50% ดึงเงินต้นออก ถือหุ้นฟรีตลอดกาล`}
          </p>
        </button>
      </div>

      {/* Expanded Slip Panel based on active selection */}
      {activeAction === 'BUY' && missingShares > 0 && (
        <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h5 className="text-[13px] font-bold text-emerald-400 uppercase tracking-wide">
              ใบคำนวณคำสั่งซื้อ (Sniper Buy Slip)
            </h5>
            <p className="text-[13px] text-slate-200 mt-0.5">
              ซื้อเพิ่ม: <span className="font-bold text-slate-100 font-mono">{missingShares.toFixed(0)} หุ้น</span> ที่ราคาประมาณ <span className="font-bold text-slate-100 font-mono">${currentPrice.toFixed(2)}</span> = ใช้เงินรวม <span className="font-bold text-emerald-300 font-mono">${buyCostNeeded.toFixed(2)}</span>
            </p>
          </div>
          <div className="text-[13px] text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700 font-mono">
            โควตาจะเต็ม 100% พอดี
          </div>
        </div>
      )}

      {activeAction === 'HOLD' && (
        <div className="p-3 bg-cyan-950/30 border border-cyan-500/40 rounded-xl mb-3">
          <h5 className="text-[13px] font-bold text-cyan-400 uppercase tracking-wide">
            คู่มือการถือทับมือ (Hold Protocol)
          </h5>
          <p className="text-[13px] text-slate-200 mt-0.5 leading-relaxed">
            จุดตัดขาดทุนเฝ้าระวัง (Stoploss Level): <span className="font-bold text-amber-300 font-mono">${stopPrice.toFixed(2)}</span> | ตราบใดที่ราคาไม่ปิดหลุดเส้น EMA 200 และ Gross Margin ยังไม่ลดลง 3 ไตรมาสติด ให้นั่งทับมือและปล่อยให้พลัง Compound เติบโต
          </p>
        </div>
      )}

      {activeAction === 'FREERIDE' && (
        <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl mb-3">
          <h5 className="text-[13px] font-bold text-amber-400 uppercase tracking-wide">
            แผนการดึงทุนคืน (Free-Ride 50% Strategy)
          </h5>
          <p className="text-[13px] text-slate-200 mt-0.5 leading-relaxed">
            จำนวนหุ้นที่จะขาย: <span className="font-bold text-slate-100 font-mono">{freeRideShares} หุ้น</span> | เงินสดที่จะได้รับคืนเข้า Dime FCD: <span className="font-bold text-emerald-300 font-mono">${freeRideCashReturn.toFixed(2)}</span> | หุ้นที่เหลือ <span className="font-bold text-cyan-300 font-mono">{ownedShares - freeRideShares} หุ้น</span> จะมีต้นทุน = $0.00 ถือครองสบายใจไร้ความเครียด 100%
          </p>
        </div>
      )}

      {/* Recent Transactions History (Last 3 lots) */}
      {holding.lots && holding.lots.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-slate-400 mb-2">
            <History className="w-3.5 h-3.5" />
            <span>ประวัติการซื้อ-ขายในพอร์ต ({holding.lots.length} รายการล่าสุด)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {holding.lots.slice(0, 3).map((lot) => (
              <div key={lot.id} className="p-2 bg-slate-900/40 rounded-lg border border-slate-800/60 text-[13px] flex items-center justify-between">
                <div>
                  <span className={`font-bold ${lot.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {lot.type}
                  </span>
                  <span className="text-slate-300 font-mono ml-1.5">{lot.shares} หุ้น</span>
                </div>
                <div className="text-slate-400 font-mono">
                  @${lot.price.toFixed(2)} ({lot.date})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
