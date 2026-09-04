import React, { useMemo } from 'react';
import { useHoldings } from '../../hooks/useHoldings';
import { useUiStore } from '../../stores/uiStore';
import { Calendar, DollarSign, Clock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import clsx from 'clsx';

interface ScheduledDividendItem {
  symbol: string;
  exDate: string;
  payDate: string;
  estimatedRate: number;
  expectedAmountUsd: number;
  daysRemaining: number;
  stage: string;
}

// Known dividend payers with their typical quarterly / monthly schedules
const DIVIDEND_METADATA: Record<string, { interval: 'monthly' | 'quarterly'; months: number[]; avgRate: number }> = {
  'O': { interval: 'monthly', months: [1,2,3,4,5,6,7,8,9,10,11,12], avgRate: 0.263 },
  'VICI': { interval: 'quarterly', months: [1,4,7,10], avgRate: 0.432 },
  'SCHD': { interval: 'quarterly', months: [3,6,9,12], avgRate: 0.75 },
  'NVDA': { interval: 'quarterly', months: [3,6,9,12], avgRate: 0.01 },
  'META': { interval: 'quarterly', months: [3,6,9,12], avgRate: 0.50 },
  'COST': { interval: 'quarterly', months: [2,5,8,11], avgRate: 1.16 },
  'MSFT': { interval: 'quarterly', months: [3,6,9,12], avgRate: 0.83 },
  'AAPL': { interval: 'quarterly', months: [2,5,8,11], avgRate: 0.25 },
  'AVGO': { interval: 'quarterly', months: [3,6,9,12], avgRate: 5.25 },
};

export const UpcomingDividendStrip: React.FC = () => {
  const { holdings } = useHoldings();
  const { currency, exchangeRate } = useUiStore();

  const currSymbol = currency === 'THB' ? '฿' : '$';
  const formatMoney = (usd: number) => {
    const val = currency === 'THB' ? usd * exchangeRate : usd;
    return `${currSymbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const upcomingDividends = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1 to 12
    const currentDay = now.getDate();

    const items: ScheduledDividendItem[] = [];

    holdings.forEach(h => {
      const meta = DIVIDEND_METADATA[h.symbol.toUpperCase()];
      if (!meta || h.quantity <= 0) return;

      // Find next upcoming payout month (skip if current month's ex-date ~15th has already passed)
      const futureMonths = meta.months.filter(m => m > currentMonth || (m === currentMonth && currentDay <= 15));
      const nextMonth = futureMonths.length > 0 ? futureMonths[0] : meta.months[0];
      const targetYear = futureMonths.length > 0 ? currentYear : currentYear + 1;

      // Approximate ex-date around 15th, pay-date around 28th
      const exDateObj = new Date(targetYear, nextMonth - 1, 15);
      const payDateObj = new Date(targetYear, nextMonth - 1, 28);

      const diffTime = exDateObj.getTime() - now.getTime();
      const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // If within 90 days
      if (daysRemaining <= 90) {
        items.push({
          symbol: h.symbol,
          exDate: exDateObj.toISOString().split('T')[0],
          payDate: payDateObj.toISOString().split('T')[0],
          estimatedRate: meta.avgRate,
          expectedAmountUsd: h.quantity * meta.avgRate,
          daysRemaining,
          stage: h.stockType || 'Core Compounder',
        });
      }
    });

    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [holdings]);

  const totalUpcomingExpected = useMemo(() => {
    return upcomingDividends.reduce((sum, item) => sum + item.expectedAmountUsd, 0);
  }, [upcomingDividends]);

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Upcoming Dividend Strip
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1A1D2D] border border-[#2A2E45] text-emerald-400 font-bold">
                Next 60-90 Days
              </span>
            </h4>
            <p className="text-xs text-[#9898C8]">
              ลิสต์กำหนดวันขึ้นเครื่องหมาย XD และเงินปันผลที่คาดว่าจะเข้าพอร์ตในระยะใกล้
            </p>
          </div>
        </div>

        {upcomingDividends.length > 0 && (
          <div className="bg-[#161926] px-3.5 py-1.5 rounded-xl border border-[#2A2E45] flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-[#9898C8] font-medium">Est. Incoming Cash:</span>
            <span className="text-sm font-black text-emerald-400 tabular-nums font-prompt">
              +{formatMoney(totalUpcomingExpected)}
            </span>
          </div>
        )}
      </div>

      {/* Cards Strip */}
      {upcomingDividends.length === 0 ? (
        <div className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45]/80 flex items-center justify-center text-xs text-[#9898C8]">
          ไม่มีหุ้นที่มีรอบจ่ายปันผลในอีก 60 วันข้างหน้า (พอร์ตโฟกัสการเติบโตแบบ Hyper-Growth)
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
          {upcomingDividends.map((item) => (
            <div 
              key={item.symbol}
              className="bg-[#161926] p-4 rounded-2xl border border-[#2A2E45] hover:border-[#10B981]/50 transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1E2235] to-[#121420] border border-[#2A2E45] flex items-center justify-center font-black text-white text-xs">
                    {item.symbol.slice(0, 3)}
                  </div>
                  <span className="font-extrabold text-white text-sm">{item.symbol}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 tabular-nums font-prompt">
                  in {item.daysRemaining} days
                </span>
              </div>

              <div className="flex justify-between items-baseline mt-2">
                <div>
                  <span className="text-xs font-semibold text-[#9898C8] block">Est. Payout</span>
                  <span className="text-lg font-black text-emerald-400 tabular-nums font-prompt">
                    +{formatMoney(item.expectedAmountUsd)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#9898C8] block">Rate / Share</span>
                  <span className="text-xs font-semibold text-[#CBD5E1] tabular-nums font-prompt">
                    ${item.estimatedRate.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#9898C8] mt-3 pt-2.5 border-t border-[#2A2E45]/60">
                <span>Ex-Date: <strong className="text-white">{new Date(item.exDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong></span>
                <span>Pay: <strong className="text-white">{new Date(item.payDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
