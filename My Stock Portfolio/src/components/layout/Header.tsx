import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { usePriceStore } from '../../stores/priceStore';
import { Bell, Search } from 'lucide-react';
import clsx from 'clsx';

export const Header = () => {
  const { activeTab, currency, setCurrency } = useUiStore();
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const { exchangeRate } = usePriceStore();

  return (
    <header className="h-20 bg-[#0F111A]/80 backdrop-blur-xl border-b border-[#1F2233] px-8 flex items-center justify-between sticky top-0 z-50 gap-4">
      {/* 1. Left: Page Title & Greeting */}
      <div className="shrink-0 min-w-[180px]">
        <h1 className="text-2xl font-bold text-white capitalize tracking-tight">
          {activeTab}
        </h1>
        <p className="text-xs text-[#CBD5E1] mt-0.5">
          Welcome back to your portfolio dashboard
        </p>
      </div>

      {/* 2. Center: Global Portfolio Switcher Buttons / Pills (Easy 1-Click Switching) */}
      {portfolios.length > 0 && (
        <div className="flex items-center justify-center flex-1 max-w-2xl px-4">
          <div className="flex items-center bg-[#1A1D2D] border border-[#2A2E45] p-1.5 rounded-2xl gap-1.5 shadow-inner overflow-x-auto custom-scrollbar">
            {portfolios.map((p) => {
              const isActive = p.id === activePortfolioId;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePortfolio(p.id)}
                  className={clsx(
                    "px-4 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 select-none whitespace-nowrap",
                    isActive
                      ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_0_14px_rgba(130,58,253,0.5)] font-black"
                      : "text-[#CBD5E1] hover:text-white hover:bg-[#2A2E45]/60 font-semibold"
                  )}
                  title={`Switch to ${p.name}`}
                >
                  <span className="text-sm">{p.icon || '💼'}</span>
                  <span className="tracking-tight">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Right: Search, Currency Switcher, Live FX Rate & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Search */}
        <div className="relative group hidden lg:block">
          <Search className="w-4 h-4 text-[#9898C8] absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-[#823AFD] transition-colors" />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="bg-[#1A1D2D] border border-[#2A2E45] rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-[#9898C8] focus:outline-none focus:border-[#823AFD] focus:ring-1 focus:ring-[#823AFD] transition-all w-44"
          />
        </div>

        {/* Global Currency Toggle (USD / THB) */}
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
          <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#1A1D2D]/80 border border-[#2A2E45] text-xs font-semibold tabular-nums text-[#CBD5E1] shadow-inner" title="Real-time Exchange Rate from Yahoo Finance (THB=X)">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white font-bold">$1</span>
            <span>=</span>
            <span className="text-emerald-400 font-extrabold">฿{exchangeRate.toFixed(2)}</span>
            <span className="text-[10px] text-[#94A3B8] font-normal uppercase tracking-wider">Yahoo</span>
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-2 text-[#9898C8] hover:text-white transition-colors bg-[#1A1D2D] rounded-full border border-[#2A2E45] hover:border-[#823AFD]">
          <Bell className="w-4 h-4" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#FC2D79] rounded-full border-2 border-[#0F111A]"></span>
        </button>

        {/* Profile */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#823AFD] to-[#FC2D79] p-0.5 shadow-[0_2px_10px_rgba(130,58,253,0.25)]">
          <div className="w-full h-full bg-[#0F111A] rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-xs">AD</span>
          </div>
        </div>
      </div>
    </header>
  );
};
