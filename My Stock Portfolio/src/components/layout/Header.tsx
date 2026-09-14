import React from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { usePriceStore } from '../../stores/priceStore';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { CloudSyncBadge } from '../common/CloudSyncBadge';
import { useRelativeTime } from '../../hooks/useRelativeTime';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  analysis: 'Analysis',
  performance: 'Performance',
  health: 'Health & Risk',
  scorecard: 'Scorecard',
  risk: 'Risk & Alpha',
  rebalance: 'Smart Rebalance',
  transactions: 'Transactions',
  portfolios: 'Portfolios',
  settings: 'Settings',
};

export const Header = () => {
  const { activeTab, currency, setCurrency } = useUiStore();
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const { exchangeRate, lastUpdated, loading, fetchExchangeRate } = usePriceStore();
  const [isMarketOpen, setIsMarketOpen] = React.useState(false);
  const priceRelTime = useRelativeTime(lastUpdated);

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
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {PAGE_TITLES[activeTab] || activeTab}
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

        {/* Live FX Rate Badge */}
        {exchangeRate > 0 && (
          <div className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1D2D]/80 border border-[#2A2E45] text-xs font-semibold tabular-nums text-[#CBD5E1] shadow-inner font-heading" title="Real-time Exchange Rate (THB=X)">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-white font-bold font-heading">$1</span>
            <span>=</span>
            <span className="text-emerald-400 font-extrabold font-heading">฿{exchangeRate.toFixed(2)}</span>
            <span className="text-[11px] text-[#94A3B8] font-bold uppercase tracking-wider font-heading">FX</span>
          </div>
        )}

        {/* Universal Cloud Settings Sync Status Badge (Twin Capsule 1) */}
        <CloudSyncBadge variant="header" />

        {/* US Market & Live Price Feed Status Capsule (Twin Capsule 2) */}
        <button 
          onClick={() => fetchExchangeRate('USD', 'THB')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#151822]/80 border border-[#2A2E45]/80 hover:border-[#823AFD]/50 shadow-sm cursor-pointer transition-all hover:bg-[#1A1D2D] hover:-translate-y-0.5 group backdrop-blur-md font-heading select-none"
          title={lastUpdated ? `Last price update: ${priceRelTime} (${lastUpdated.toLocaleTimeString('th-TH')}). Click to refresh!` : 'Click to refresh prices'}
        >
          {/* Status Indicator Dot */}
          <div className="relative flex items-center justify-center shrink-0">
            <span className={clsx(
              "w-2 h-2 rounded-full transition-all duration-300",
              loading 
                ? "bg-[#823AFD] animate-spin" 
                : isMarketOpen 
                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                  : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]"
            )} />
            {!loading && isMarketOpen && (
              <span className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40 pointer-events-none" />
            )}
          </div>

          {/* Single-Line Modern Elegance Content (No Yahoo) */}
          <div className="flex items-center gap-1.5 text-[13px] font-heading">
            <span className={clsx(
              "font-bold transition-colors",
              isMarketOpen
                ? "text-emerald-400 group-hover:text-emerald-300"
                : "text-rose-400 group-hover:text-rose-300"
            )}>
              {isMarketOpen ? 'US Live' : 'US Closed'}
            </span>
            <span className="text-slate-600 text-[11px]">•</span>
            <span className="font-semibold text-slate-300 tabular-nums">
              {isMarketOpen ? 'Realtime' : `Price ${priceRelTime}`}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
