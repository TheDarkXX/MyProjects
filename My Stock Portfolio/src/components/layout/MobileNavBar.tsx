import React, { useState } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { LayoutDashboard, Rocket, CandlestickChart, Scale, Menu } from 'lucide-react';
import { MobileMoreSheet } from './MobileMoreSheet';
import clsx from 'clsx';

export const MobileNavBar: React.FC = () => {
  const { activeTab, setActiveTab } = useUiStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const TABS = [
    { id: 'dashboard', label: 'Portfolio', icon: LayoutDashboard },
    { id: 'xchart', label: 'Charts', icon: CandlestickChart },
    { id: 'more', label: 'More', icon: Menu, isMore: true },
  ];

  const handleTabClick = (tab: typeof TABS[0]) => {
    if (tab.isMore) {
      setIsMoreOpen(true);
    } else {
      setActiveTab(tab.id);
    }
  };

  // Check if current active tab is one of the secondary tabs handled by More
  const isMoreActive = !['dashboard', 'xchart'].includes(activeTab);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#07090E]/92 backdrop-blur-2xl border-t border-white/[0.08] pb-safe transform-gpu select-none">
        <div className="max-w-2xl md:max-w-3xl mx-auto h-14 sm:h-16 flex items-center justify-around px-2 sm:px-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.isMore ? isMoreActive : activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={clsx(
                  "relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-90 cursor-pointer",
                  isActive ? "text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {/* Active Neon Glow Pill behind icon */}
                {isActive && (
                  <span className="absolute -top-0.5 w-8 h-1 bg-gradient-to-r from-[#823AFD] to-[#FC2D79] rounded-full shadow-[0_0_12px_rgba(252,45,121,0.8)]" />
                )}

                <div className={clsx(
                  "p-1 rounded-xl transition-all",
                  isActive && "text-[#FC2D79] filter drop-shadow-[0_0_8px_rgba(252,45,121,0.5)]"
                )}>
                  <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                </div>

                <span className={clsx(
                  "text-[10px] sm:text-[11px] tracking-tight font-medium font-heading transition-all",
                  isActive ? "font-bold text-white" : "text-slate-400"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Navigation Drawer */}
      <MobileMoreSheet 
        isOpen={isMoreOpen} 
        onClose={() => setIsMoreOpen(false)} 
      />
    </>
  );
};
