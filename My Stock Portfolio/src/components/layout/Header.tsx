import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { usePriceStore } from '../../stores/priceStore';
import { Bell, Search, Briefcase } from 'lucide-react';
import clsx from 'clsx';

export const Header = () => {
  const { activeTab, currency, setCurrency } = useUiStore();
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const { exchangeRate } = usePriceStore();

  return (
    <header className="h-20 bg-[#0F111A]/80 backdrop-blur-xl border-b border-[#1F2233] px-8 flex items-center justify-between sticky top-0 z-50">
      <div>
        <h1 className="text-2xl font-bold text-white capitalize tracking-tight">
          {activeTab}
        </h1>
        <p className="text-sm text-[#CBD5E1] mt-0.5">
          Welcome back to your portfolio dashboard
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Portfolio Selector */}
        {portfolios.length > 0 && (
          <div className="flex items-center gap-2 bg-[#1A1D2D] border border-[#2A2E45] rounded-xl px-3 py-2 text-white">
            <Briefcase className="w-4 h-4 text-[#823AFD]" />
            <select
              value={activePortfolioId || ''}
              onChange={(e) => setActivePortfolio(e.target.value)}
              className="bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#111418] text-white">
                  {p.icon || '💼'} {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div className="relative group">
          <Search className="w-5 h-5 text-[#9898C8] absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-[#823AFD] transition-colors" />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="bg-[#1A1D2D] border border-[#2A2E45] rounded-full pl-10 pr-4 py-2 text-white placeholder-[#9898C8] focus:outline-none focus:border-[#823AFD] focus:ring-1 focus:ring-[#823AFD] transition-all w-52"
          />
        </div>

        {/* Global Currency Toggle (USD / THB) - Sticky in Header */}
        <div className="flex items-center bg-[#1A1D2D] border border-[#2A2E45] p-1 rounded-2xl text-xs gap-1 shadow-inner">
          <button
            onClick={() => setCurrency('USD')}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
              currency === 'USD'
                ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_0_12px_rgba(130,58,253,0.45)]"
                : "text-[#CBD5E1] hover:text-white hover:bg-[#2A2E45]/50"
            )}
            title="Display all portfolio numbers in US Dollars"
          >
            <span>🇺🇸</span>
            <span>USD</span>
          </button>
          <button
            onClick={() => setCurrency('THB')}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none",
              currency === 'THB'
                ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_0_12px_rgba(130,58,253,0.45)]"
                : "text-[#CBD5E1] hover:text-white hover:bg-[#2A2E45]/50"
            )}
            title="Display all portfolio numbers in Thai Baht (Yahoo Rate)"
          >
            <span>🇹🇭</span>
            <span>THB</span>
          </button>
        </div>

        {/* Live Yahoo FX Rate Badge */}
        {exchangeRate > 0 && (
          <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#1A1D2D]/80 border border-[#2A2E45] text-xs font-semibold tabular-nums text-[#CBD5E1] shadow-inner" title="Real-time Exchange Rate from Yahoo Finance (THB=X)">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white font-bold">$1</span>
            <span>=</span>
            <span className="text-emerald-400 font-extrabold">฿{exchangeRate.toFixed(2)}</span>
            <span className="text-[10px] text-[#94A3B8] font-normal uppercase tracking-wider">Yahoo</span>
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-2 text-[#9898C8] hover:text-white transition-colors bg-[#1A1D2D] rounded-full border border-[#2A2E45] hover:border-[#823AFD]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#FC2D79] rounded-full border-2 border-[#0F111A]"></span>
        </button>

        {/* Profile */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#823AFD] to-[#FC2D79] p-0.5 shadow-[0_2px_10px_rgba(130,58,253,0.25)]">
          <div className="w-full h-full bg-[#0F111A] rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">AD</span>
          </div>
        </div>
      </div>
    </header>
  );
};
