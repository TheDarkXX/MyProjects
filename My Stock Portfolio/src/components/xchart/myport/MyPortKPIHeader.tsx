import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  PieChart as PieIcon, 
  Table as TableIcon, 
  LayoutGrid, 
  Wallet 
} from 'lucide-react';
import clsx from 'clsx';
import { Portfolio } from '../../../stores/portfolioStore';
import { formatCurrencyVal, formatSecondaryVal } from './types';

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
  currency: 'USD' | 'THB';
  onToggleCurrency: (c: 'USD' | 'THB') => void;
  exchangeRate: number;
}

export const MyPortKPIHeader: React.FC<MyPortKPIHeaderProps> = ({
  totalNetWorth,
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
  currency,
  onToggleCurrency,
  exchangeRate,
}) => {
  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId) || portfolios[0];
  const isTodayProfit = todaysProfit >= 0;
  const isTotalProfit = totalUnrealizedProfit >= 0;

  return (
    <div className="w-full bg-[#0D1017] border-b border-slate-800/80 px-4 py-2 shrink-0 select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 min-h-[42px]">
        {/* Left: Portfolio Identity & Dropdown Selector */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 shadow-sm">
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-center gap-2">
            {portfolios.length > 1 ? (
              <select
                value={activePortfolioId || activePortfolio?.id || ''}
                onChange={(e) => onSelectPortfolio(e.target.value)}
                className="bg-[#141926] border border-slate-700/80 rounded-lg px-2.5 py-1 text-sm font-bold text-slate-100 focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                {portfolios.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#121622] text-white">
                    {p.icon ? `${p.icon} ` : ''}{p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-extrabold text-white tracking-tight font-heading">
                {activePortfolio ? `${activePortfolio.icon ? `${activePortfolio.icon} ` : ''}${activePortfolio.name}` : 'My Portfolio'}
              </span>
            )}
          </div>
        </div>

        {/* Center: Institutional Single-Row KPI Metric Flow (Reactive to Currency) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[13px]">
          {/* Net Worth */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] text-slate-300 font-medium">Net Worth:</span>
            <span className="text-base font-black text-white font-mono">
              {formatCurrencyVal(totalNetWorth, currency, exchangeRate)}
            </span>
            <span className="text-[13px] text-slate-400 font-medium">
              ({formatSecondaryVal(totalNetWorth, currency, exchangeRate)})
            </span>
          </div>

          <span className="hidden md:inline text-slate-700">|</span>

          {/* Today's P&L */}
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-slate-300 font-medium">Today:</span>
            <span
              className={clsx(
                'text-[13px] font-bold font-mono flex items-center',
                isTodayProfit ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {formatCurrencyVal(todaysProfit, currency, exchangeRate, true)}
              <span className="ml-1 opacity-90">
                ({isTodayProfit ? '+' : ''}{todaysProfitPercent.toFixed(2)}%)
              </span>
            </span>
          </div>

          <span className="hidden md:inline text-slate-700">|</span>

          {/* Total Return */}
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-slate-300 font-medium">Total Return:</span>
            <span
              className={clsx(
                'text-[13px] font-bold font-mono flex items-center',
                isTotalProfit ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {formatCurrencyVal(totalUnrealizedProfit, currency, exchangeRate, true)}
              <span className="ml-1 opacity-90">
                ({isTotalProfit ? '+' : ''}{totalUnrealizedProfitPercent.toFixed(2)}%)
              </span>
            </span>
          </div>

          <span className="hidden lg:inline text-slate-700">|</span>

          {/* Cash Cushion */}
          <div className="hidden lg:flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[13px] text-slate-300 font-medium">Cash:</span>
            <span className="text-[13px] font-bold text-slate-200 font-mono">
              {formatCurrencyVal(cashBalance, currency, exchangeRate)}
            </span>
            <span className="text-[13px] text-emerald-400 font-medium">
              ({cashWeight.toFixed(1)}%)
            </span>
          </div>

          {/* Mini Win/Loss Counter */}
          <div className="hidden 2xl:flex items-center gap-1 text-[13px] font-semibold px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800">
            <span className="text-emerald-400">{winnersCount}W</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-400">{losersCount}L</span>
          </div>
        </div>

        {/* Right: Global Currency Switcher + Triple View Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Currency Toggle (USD / THB) */}
          <div className="flex items-center bg-[#141926] border border-slate-800 p-0.5 rounded-lg gap-0.5 font-mono">
            <button
              type="button"
              onClick={() => onToggleCurrency('USD')}
              className={clsx(
                'px-2 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer',
                currency === 'USD'
                  ? 'bg-purple-600/30 text-white border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              )}
              title="Switch to US Dollar ($ USD)"
            >
              $ USD
            </button>
            <button
              type="button"
              onClick={() => onToggleCurrency('THB')}
              className={clsx(
                'px-2 py-1 rounded-md text-[13px] font-bold transition-all cursor-pointer',
                currency === 'THB'
                  ? 'bg-purple-600/30 text-white border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              )}
              title="Switch to Thai Baht (฿ THB)"
            >
              ฿ THB
            </button>
          </div>

          {/* Triple View Mode Switcher */}
          <div className="flex items-center bg-[#141926] border border-slate-800 p-0.5 rounded-lg gap-0.5">
            <button
              onClick={() => onChangeViewMode('split')}
              title="M1 Finance Split View (Interactive Donut & Slices Table)"
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-semibold transition-all cursor-pointer',
                viewMode === 'split'
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              )}
            >
              <PieIcon className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              onClick={() => onChangeViewMode('table')}
              title="Full Pro Slices Holdings Table"
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-semibold transition-all cursor-pointer',
                viewMode === 'table'
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
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
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-semibold transition-all cursor-pointer',
                viewMode === 'bento'
                  ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Bento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
