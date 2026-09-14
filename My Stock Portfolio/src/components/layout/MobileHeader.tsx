import React, { useState, useEffect, useRef } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { usePriceStore } from '../../stores/priceStore';
import { ChevronDown, Check, RefreshCw, Maximize, Minimize } from 'lucide-react';
import clsx from 'clsx';

export const MobileHeader: React.FC = () => {
  const { currency, setCurrency } = useUiStore();
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolioStore();
  const { exchangeRate, lastUpdated, loading, fetchExchangeRate } = usePriceStore();
  const [showPortDropdown, setShowPortDropdown] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const docEl = document.documentElement as any;
    const doc = document as any;
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  };

  // Market status checker
  useEffect(() => {
    const checkMarketStatus = () => {
      const nyTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
      const nyDate = new Date(nyTime);
      const day = nyDate.getDay();
      const hours = nyDate.getHours();
      const minutes = nyDate.getMinutes();
      const isWeekday = day >= 1 && day <= 5;
      const timeInMinutes = hours * 60 + minutes;
      const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
      const marketCloseMinutes = 16 * 60;    // 4:00 PM
      setIsMarketOpen(isWeekday && timeInMinutes >= marketOpenMinutes && timeInMinutes < marketCloseMinutes);
    };
    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPortDropdown(false);
      }
    };
    if (showPortDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPortDropdown]);

  const activePort = portfolios.find(p => p.id === activePortfolioId) || portfolios[0];

  return (
    <header className="h-14 bg-[#07090E]/90 backdrop-blur-2xl border-b border-white/[0.08] px-4 flex items-center justify-between sticky top-0 z-40 shrink-0 select-none transform-gpu">
      {/* 1. Left: Brand Icon + Title / Portfolio Selector */}
      <div className="flex items-center gap-2.5 relative" ref={dropdownRef}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#823AFD] via-[#FC2D79] to-[#FD5514] flex items-center justify-center shadow-[0_2px_12px_rgba(130,58,253,0.35)] shrink-0">
          <span className="text-white font-black text-xs tracking-wider font-heading">SP</span>
        </div>

        <button
          onClick={() => setShowPortDropdown(!showPortDropdown)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#11141E]/80 border border-white/[0.08] hover:border-[#823AFD]/50 transition-all active:scale-[0.98] cursor-pointer"
        >
          <span className="text-white font-bold text-xs max-w-[130px] sm:max-w-[200px] truncate font-heading">
            {activePort?.name || 'Main Portfolio'}
          </span>
          <ChevronDown className={clsx("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", showPortDropdown && "rotate-180")} />
        </button>

        {/* Portfolio Dropdown Menu */}
        {showPortDropdown && (
          <div className="absolute top-11 left-10 w-56 bg-[#11141E] border border-[#2A2E45] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1.5 z-50 animate-fade-in-up">
            <div className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
              Select Portfolio
            </div>
            <div className="space-y-0.5 max-h-56 overflow-y-auto custom-scrollbar">
              {portfolios.map(port => {
                const isSelected = port.id === activePortfolioId;
                return (
                  <button
                    key={port.id}
                    onClick={() => {
                      setActivePortfolio(port.id);
                      setShowPortDropdown(false);
                    }}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer",
                      isSelected 
                        ? "bg-[#823AFD]/20 text-white font-bold" 
                        : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <span className="truncate">{port.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#FC2D79]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Right: Market Status Dot & Currency Switcher */}
      <div className="flex items-center gap-2">
        {/* Market Status Indicator */}
        <div 
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#11141E]/60 border border-white/[0.06] text-[11px]"
          title={isMarketOpen ? "US Market is OPEN" : "US Market is CLOSED"}
        >
          <span className={clsx("w-2 h-2 rounded-full", isMarketOpen ? "bg-emerald-400 animate-pulse" : "bg-slate-500")} />
          <span className="text-slate-300 font-medium hidden sm:inline">{isMarketOpen ? "OPEN" : "CLOSED"}</span>
        </div>

        {/* Currency Switcher Pill */}
        <div className="flex items-center bg-[#11141E] border border-white/[0.08] p-0.5 rounded-xl">
          <button
            onClick={() => setCurrency('THB')}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer font-heading",
              currency === 'THB' 
                ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-sm" 
                : "text-slate-400 hover:text-white"
            )}
          >
            ฿ THB
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer font-heading",
              currency === 'USD' 
                ? "bg-gradient-to-r from-[#823AFD] to-[#FC2D79] text-white shadow-sm" 
                : "text-slate-400 hover:text-white"
            )}
          >
            $ USD
          </button>
        </div>

        {/* Native Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 px-2 rounded-xl bg-[#11141E] border border-[#2A2E45] hover:border-[#823AFD]/50 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer active:scale-95"
          title={isFullscreen ? "ออกจากโหมดเต็มจอ" : "โหมดเต็มจอ (Native Fullscreen)"}
        >
          {isFullscreen ? <Minimize className="w-4 h-4 text-[#823AFD]" /> : <Maximize className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Desktop PC Switcher */}
        <button
          onClick={() => {
            localStorage.setItem('stock_layout_mode', 'desktop');
            window.location.href = window.location.pathname + '?mode=desktop';
          }}
          className="p-1.5 px-2 rounded-xl bg-[#11141E] border border-white/[0.08] hover:border-[#823AFD]/50 text-slate-400 hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer"
          title="สลับไปโหมด Desktop (PC Version)"
        >
          <span className="text-sm">🖥️</span>
        </button>
      </div>
    </header>
  );
};
