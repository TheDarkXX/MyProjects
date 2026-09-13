import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  PieChart as PieIcon, 
  Table as TableIcon, 
  LayoutGrid, 
  Wallet, 
  Trophy, 
  AlertTriangle 
} from 'lucide-react';
import clsx from 'clsx';
import { Portfolio } from '../../../stores/portfolioStore';

export type MyPortViewMode = 'split' | 'table' | 'bento';

interface MyPortKPIHeaderProps {
  totalNetWorth: number;
  totalValueTHB: number;
  todaysProfit: number;
  todaysProfitPercent: number;
  totalUnrealizedProfit: number;
  totalUnrealizedProfitPercent: number;
  cashBalance: number;
  cashWeight: number;
  winnersCount: number;
  losersCount: number;
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  onSelectPortfolio: (id: string) => void;
  viewMode: MyPortViewMode;
  onChangeViewMode: (mode: MyPortViewMode) => void;
}

export const MyPortKPIHeader: React.FC<MyPortKPIHeaderProps> = ({
  totalNetWorth,
  totalValueTHB,
  todaysProfit,
  todaysProfitPercent,
  totalUnrealizedProfit,
  totalUnrealizedProfitPercent,
  cashBalance,
  cashWeight,
  winnersCount,
  losersCount,
  portfolios,
  activePortfolioId,
  onSelectPortfolio,
  viewMode,
  onChangeViewMode,
}) => {
  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);
  const isTodayProfit = todaysProfit >= 0;
  const isTotalProfit = totalUnrealizedProfit >= 0;

  return (
    <div className="w-full bg-[#0D1017] border-b border-slate-800/80 px-4 py-3 shrink-0 select-none">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Portfolio Identity & Selector */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-purple-300 shadow-sm">
            <Briefcase className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {portfolios.length > 1 ? (
                <select
                  value={activePortfolioId || ''}
                  onChange={(e) => onSelectPortfolio(e.target.value)}
                  className="bg-[#181D2D] border border-slate-700/80 rounded-lg px-2 py-1 text-sm font-bold text-slate-100 focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  {portfolios.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#121622] text-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-base font-extrabold text-white tracking-tight font-heading">
                  {activePortfolio?.name || 'My Portfolio'}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[13px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                M1 Canvas
              </span>
            </div>
            <div className="text-[13px] text-slate-300 font-medium flex items-center gap-2 mt-0.5">
              <span>ภาพรวมพอร์ตโฟลิโอ & สัดส่วนชิ้นพาย (Slices)</span>
            </div>
          </div>
        </div>

        {/* Center: Executive KPI Strip */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Total Net Worth */}
          <div className="bg-[#141824] border border-slate-800 rounded-xl px-3 py-1.5 flex flex-col justify-center">
            <div className="text-[13px] font-medium text-slate-300 uppercase tracking-wider">
              Total Net Worth
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-black text-white font-mono">
                ${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[13px] font-medium text-slate-300">
                ≈ ฿{totalValueTHB.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {/* Today's P&L */}
          <div className="bg-[#141824] border border-slate-800 rounded-xl px-3 py-1.5 flex flex-col justify-center">
            <div className="text-[13px] font-medium text-slate-300 uppercase tracking-wider">
              Today's P&L
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  'text-sm font-bold flex items-center font-mono',
                  isTodayProfit ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                {isTodayProfit ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                {isTodayProfit ? '+' : ''}
                ${todaysProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={clsx(
                  'text-[13px] font-semibold px-1.5 py-0.2 rounded',
                  isTodayProfit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                )}
              >
                {isTodayProfit ? '+' : ''}
                {todaysProfitPercent.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Total Unrealized Return */}
          <div className="bg-[#141824] border border-slate-800 rounded-xl px-3 py-1.5 flex flex-col justify-center">
            <div className="text-[13px] font-medium text-slate-300 uppercase tracking-wider">
              Unrealized Return
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={clsx(
                  'text-sm font-bold flex items-center font-mono',
                  isTotalProfit ? 'text-emerald-400' : 'text-rose-400'
                )}
              >
                {isTotalProfit ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                {isTotalProfit ? '+' : ''}
                ${totalUnrealizedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={clsx(
                  'text-[13px] font-semibold px-1.5 py-0.2 rounded',
                  isTotalProfit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                )}
              >
                {isTotalProfit ? '+' : ''}
                {totalUnrealizedProfitPercent.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Cash Cushion */}
          <div className="bg-[#141824] border border-slate-800 rounded-xl px-3 py-1.5 flex flex-col justify-center">
            <div className="text-[13px] font-medium text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <Wallet className="w-3 h-3 text-emerald-400" /> Cash Cushion
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-slate-100 font-mono">
                ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[13px] font-medium text-emerald-400">
                ({cashWeight.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Winners & Drawdowns Tally */}
          <div className="hidden xl:flex items-center gap-2 bg-[#141824] border border-slate-800 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1 text-[13px] font-semibold text-emerald-300">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" />
              <span>{winnersCount} กำไร</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1 text-[13px] font-semibold text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{losersCount} ขาดทุน</span>
            </div>
          </div>
        </div>

        {/* Right: Triple View Mode Switcher */}
        <div className="flex items-center bg-[#141824] border border-slate-800 p-1 rounded-xl gap-1">
          <button
            onClick={() => onChangeViewMode('split')}
            title="M1 Finance Split View (Interactive Donut & Slices Table)"
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all',
              viewMode === 'split'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
            )}
          >
            <PieIcon className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">M1 Split</span>
          </button>
          <button
            onClick={() => onChangeViewMode('table')}
            title="Full Pro Slices Holdings Table"
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all',
              viewMode === 'table'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
            )}
          >
            <TableIcon className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            onClick={() => onChangeViewMode('bento')}
            title="Bento Glassmorphic Cards Grid"
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all',
              viewMode === 'bento'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Bento</span>
          </button>
        </div>
      </div>
    </div>
  );
};
