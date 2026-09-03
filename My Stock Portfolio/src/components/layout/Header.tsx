import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { usePriceStore } from '../../stores/priceStore';
import { Search } from 'lucide-react';
import clsx from 'clsx';

export const Header = () => {
  const { activeTab, currency, setCurrency } = useUiStore();
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const { exchangeRate, lastUpdated, loading, fetchExchangeRate } = usePriceStore();

  React.useEffect(() => {
    if (!lastUpdated) {
      fetchExchangeRate('USD', 'THB');
    }
  }, [fetchExchangeRate, lastUpdated]);

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

        {/* Live Yahoo API Status & Last Update Time */}
        <button 
          onClick={() => fetchExchangeRate('USD', 'THB')}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-[#1A1D2D] border border-[#2A2E45] hover:border-[#823AFD] shadow-inner text-xs cursor-pointer select-none transition-all hover:bg-[#1A1D2D]/80 group"
          title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleString('th-TH')}. Click to refresh Yahoo data!` : 'Click to refresh Yahoo Finance data'}
        >
          {/* LED Status Light */}
          <div className="relative flex items-center justify-center">
            <span className={clsx(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              loading 
                ? "bg-amber-400 animate-spin" 
                : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
            )} />
            {!loading && (
              <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
            )}
          </div>

          {/* Status & Time */}
          <div className="flex flex-col text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-[11px] tracking-wide group-hover:text-[#823AFD] transition-colors">
                {loading ? 'Syncing...' : 'Yahoo API'}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                LIVE
              </span>
            </div>
            <span className="text-[10px] text-[#94A3B8] font-mono tabular-nums">
              {lastUpdated 
                ? `${lastUpdated.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ${lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'Auto-syncing'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
