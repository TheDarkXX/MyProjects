import React from 'react';
import clsx from 'clsx';
import { Layers, Activity, Sparkles, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface PortfolioPulseBannerProps {
  holdingsCount: number;
  recentTxCount: number;
  whatIfSeedLabel: string;    // e.g. "฿100,000" or "$10,000"
  whatIfCurrentLabel: string; // e.g. "฿181,220" or "$18,122"
  totalReturnPercent: number;
  inceptionDateLabel: string; // e.g. "Oct 22, 2023"
}

export const PortfolioPulseBanner: React.FC<PortfolioPulseBannerProps> = ({
  holdingsCount,
  recentTxCount,
  whatIfSeedLabel,
  whatIfCurrentLabel,
  totalReturnPercent,
  inceptionDateLabel,
}) => {
  const isPositive = totalReturnPercent >= 0;

  return (
    <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#823AFD]/10 via-[#FC2D79]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* Left Column: Portfolio Summary */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1A1D2D] border border-[#2A2E45] flex items-center justify-center text-[#823AFD]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-white font-bold text-base tracking-wide">Portfolio Summary</h4>
              <p className="text-[13px] text-[#CBD5E1]">Asset composition & weekly activity</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Holdings Stat Card */}
            <div className="bg-[#141824] border border-[#2A2E45] rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#823AFD]/10 border border-[#823AFD]/20 flex items-center justify-center text-[#823AFD] shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
                  {holdingsCount}
                </div>
                <div className="text-[13px] font-semibold text-[#CBD5E1]">Active Holdings</div>
              </div>
            </div>

            {/* Weekly Activity Stat Card */}
            <div className="bg-[#141824] border border-[#2A2E45] rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FC2D79]/10 border border-[#FC2D79]/20 flex items-center justify-center text-[#FC2D79] shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
                  {recentTxCount}
                </div>
                <div className="text-[13px] font-semibold text-[#CBD5E1]">Transactions (7D)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Historical What-If Growth Anchor */}
        <div className="bg-[#141824] border border-[#2A2E45] rounded-2xl p-4 md:p-5 relative overflow-hidden flex flex-col justify-between">
          {/* Left accent border gradient */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#FC2D79] via-[#823AFD] to-[#4F46E5]" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-2 pl-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FC2D79]" />
                <span className="text-white font-bold text-base tracking-wide">Historical Growth Anchor</span>
              </div>
              <span
                className={clsx(
                  "text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1",
                  isPositive
                    ? "text-emerald-400 bg-emerald-400/10 border-emerald-500/20"
                    : "text-rose-400 bg-rose-400/10 border-rose-500/20"
                )}
              >
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{isPositive ? '+' : ''}{totalReturnPercent.toFixed(2)}%</span>
              </span>
            </div>

            <p className="text-[13px] text-[#CBD5E1] pl-2 leading-relaxed">
              สมมติลงทุน <span className="text-white font-bold">{whatIfSeedLabel}</span> ตั้งแต่วันเริ่มพอร์ต ({inceptionDateLabel})
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#2A2E45]/70 flex flex-wrap items-baseline justify-between gap-2 pl-2">
            <div>
              <span className="text-[13px] text-[#CBD5E1] block">มูลค่าพอร์ตปัจจุบัน:</span>
              <span className="text-2xl font-extrabold text-white tabular-nums tracking-tight">
                {whatIfCurrentLabel}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[13px] text-[#CBD5E1] block">การเติบโต:</span>
              <span
                className={clsx(
                  "text-base font-bold tabular-nums",
                  isPositive ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {isPositive ? '+' : ''}{totalReturnPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
