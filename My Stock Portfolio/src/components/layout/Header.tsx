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
  const [isMarketOpen, setIsMarketOpen] = React.useState(false);

  React.useEffect(() => {
    const checkMarketStatus = () => {
      const nyTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
      const nyDate = new Date(nyTime);
      const day = nyDate.getDay();
      const hours = nyDate.getHours();
      const minutes = nyDate.getMinutes();
      const isWeekday = day >= 1 && day <= 5;
      const timeInMinutes = hours * 60 + minutes;
      const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
      const marketCloseMinutes = 16 * 60; // 4:00 PM
      setIsMarketOpen(isWeekday && timeInMinutes >= marketOpenMinutes && timeInMinutes < marketCloseMinutes);
    };
    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);

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

        {/* Global Currency Toggle (USD / THB) - Premium Global Design */}
        <div className="flex items-center bg-[#141724] border border-[#2A2E45] p-1 rounded-2xl gap-1 shadow-inner font-heading">
          <button
            onClick={() => setCurrency('USD')}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 select-none font-heading tracking-wide",
              currency === 'USD'
                ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_2px_12px_rgba(130,58,253,0.45)]"
                : "text-[#CBD5E1] hover:text-white hover:bg-[#2A2E45]/50"
            )}
            title="Switch portfolio base currency to US Dollar ($ USD)"
          >
            <span className={clsx(
              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors font-heading",
              currency === 'USD' ? "bg-white/20 text-white" : "bg-[#252A3D] text-amber-300"
            )}>$</span>
            <span className="font-heading">USD</span>
          </button>
          <button
            onClick={() => setCurrency('THB')}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer flex items-center gap-2 select-none font-heading tracking-wide",
              currency === 'THB'
                ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-[0_2px_12px_rgba(130,58,253,0.45)]"
                : "text-[#CBD5E1] hover:text-white hover:bg-[#2A2E45]/50"
            )}
            title="Switch portfolio base currency to Thai Baht (฿ THB)"
          >
            <span className={clsx(
              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors font-heading",
              currency === 'THB' ? "bg-white/20 text-white" : "bg-[#252A3D] text-emerald-300"
            )}>฿</span>
            <span className="font-heading">THB</span>
          </button>
        </div>

        {/* Live Yahoo FX Rate Badge */}
        {exchangeRate > 0 && (
          <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#1A1D2D]/80 border border-[#2A2E45] text-xs font-semibold tabular-nums text-[#CBD5E1] shadow-inner font-heading" title="Real-time Exchange Rate from Yahoo Finance (THB=X)">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white font-bold font-heading">$1</span>
            <span>=</span>
            <span className="text-emerald-400 font-extrabold font-heading">฿{exchangeRate.toFixed(2)}</span>
            <span className="text-[10px] text-[#94A3B8] font-normal uppercase tracking-wider font-heading">Yahoo</span>
          </div>
        )}

        {/* Premium Market Status & API Indicator - Full Prompt Font */}
        <button 
          onClick={() => fetchExchangeRate('USD', 'THB')}
          className="flex items-center gap-3.5 px-3.5 py-2 rounded-2xl bg-[#151822]/80 border border-[#2A2E45]/80 hover:border-[#823AFD]/50 shadow-[0_4px_16px_rgba(0,0,0,0.2)] cursor-pointer transition-all hover:bg-[#1A1D2D] hover:-translate-y-0.5 group backdrop-blur-md font-heading"
          title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleString('th-TH')}. Click to refresh!` : 'Click to refresh data'}
        >
          {/* Status Indicator Dot */}
          <div className="relative flex items-center justify-center shrink-0">
            <span className={clsx(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              loading 
                ? "bg-[#823AFD] animate-spin" 
                : isMarketOpen 
                  ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                  : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"
            )} />
            {!loading && isMarketOpen && (
              <span className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping opacity-60" />
            )}
          </div>

          <div className="flex flex-col text-left leading-tight gap-1 font-heading">
            <div className="flex items-center gap-2 font-heading">
              <span className="text-white font-extrabold text-[13px] tracking-wide group-hover:text-[#823AFD] transition-colors font-heading">
                US Market
              </span>
              <span className={clsx(
                "text-[11px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border font-heading",
                isMarketOpen
                  ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
                  : "text-rose-400 bg-rose-500/10 border-rose-500/30"
              )}>
                {isMarketOpen ? 'LIVE' : 'CLOSED'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-heading">
              <span className="text-xs text-[#CBD5E1] font-semibold tracking-wide font-heading">
                Yahoo API
              </span>
              <span className="w-1 h-1 rounded-full bg-[#475569]"></span>
              <span className="text-xs text-[#CBD5E1] tabular-nums tracking-tight font-bold font-heading">
                {lastUpdated 
                  ? lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Syncing...'}
              </span>
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};
